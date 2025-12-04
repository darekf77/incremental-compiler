//#region imports
import { fse } from 'tnp-core/src'; // @backend
import { path, _, crossPlatformPath, UtilsMessages } from 'tnp-core/src';
import { Helpers } from 'tnp-core/src';
import { CLI } from 'tnp-core/src';
import { CoreModels } from 'tnp-core/src';

import { CompilerManager } from './compiler-manager';
import { mapForWatching } from './helpers';
import { ChangeOfFile, IncrementalWatcherOptions } from './models';
import {
  BaseClientCompilerOptions,
  StartAndWatchOptions,
  StartOptions,
} from './models';
//#endregion

export class BaseClientCompiler<INITIAL_PARAMS = any>
  implements BaseClientCompilerOptions
{
  //#region fields & getters
  public readonly followSymlinks: boolean;

  public readonly subscribeOnlyFor: CoreModels.FileExtension[] = [];

  public readonly executeOutsideScenario: boolean;

  public readonly taskName: string;

  public readonly engine: IncrementalWatcherOptions['engine'];

  public readonly notifyOnFileUnlink: boolean;

  protected onlySingleRun = true;

  public ignoreFolderPatter?: string[];

  private pathResolve: boolean = false;

  private isInitedWithOptions: boolean = false;

  private __folderPath: string[] = [];

  public lastAsyncFiles: string[] = [];

  public readonly isWatchCompilation: boolean = false;

  public readonly folderPathContentCheck: string[] = [];

  public set folderPath(v) {
    //#region @backend
    if (_.isString(v)) {
      v = [v];
    }
    this.__folderPath = v;
    //#endregion
  }

  public get folderPath(): string[] {
    //#region @backendFunc
    if (!this.pathResolve) {
      this.pathResolve = true;
      this.__folderPath
        .map(p => {
          if (fse.existsSync(p)) {
            return crossPlatformPath(path.resolve(p));
          } else {
            Helpers.warn(
              `[BaseClientCompiler] Task "${this.taskName}" folderPath doesn't not exist ${this.folderPath}`,
            );
            return void 0;
          }
        })
        .filter(f => !!f);
    }
    return this.__folderPath;
    //#endregion
  }
  //#endregion

  //#region constructor
  //#region @backend
  constructor(options?: BaseClientCompilerOptions) {
    if (_.isUndefined(options)) {
      this.isInitedWithOptions = false;
      // setTimeout(() => {
      //   if (!this.isInitedWithOptions) {
      //     Helpers.logInfo(
      //       `[incremental-compiler] Compiler class instace without init option, task name: "${this.taskName}"
      //     `,
      //     );
      //   }
      // }, 1000);
    } else {
      this.isInitedWithOptions = true;
      this.fixAndAssignOptions(options);
    }
  }
  //#endregion
  //#endregion

  //#region init options
  /**
   * manually init options (when no passing object to constructor super() )
   */
  protected initOptions(options?: BaseClientCompilerOptions): void {
    //#region @backendFunc
    if (this.isInitedWithOptions === true) {
      Helpers.logWarn(
        `[incremental-compiler] You are reinit instance class again [task name: "${options?.taskName}"]`,
      );
    }
    if (!options) {
      Helpers.error(
        `[incremental-compiler] Please init instance with options config`,
        false,
        true,
      );
    }
    this.isInitedWithOptions = true;
    this.fixAndAssignOptions(options);
    //#endregion
  }
  //#endregion

  //#region run task
  /**
   * do not override this
   */
  async runTask(
    options?: { watch?: boolean } & StartAndWatchOptions<INITIAL_PARAMS>,
  ): Promise<BaseClientCompiler<INITIAL_PARAMS>> {
    //#region @backendFunc
    // @ts-ignore
    this.isWatchCompilation = options?.watch;
    if (options?.watch) {
      await this.startAndWatch(options);
    } else {
      await this.start(options);
    }
    return this;
    //#endregion
  }
  //#endregion

  //#region start
  /**
   * @deprecated use runTask instead
   * Do not override this
   */
  public async start(
    options?: StartOptions<INITIAL_PARAMS>,
  ): Promise<BaseClientCompiler<INITIAL_PARAMS>> {
    //#region @backendFunc
    let { taskName, afterInitCallBack, initialParams } = options || {};

    CompilerManager.Instance.addClient(this);
    if (!this.isInitedWithOptions) {
      Helpers.error(
        `[BaseClientCompiler] Please init client class intance with options`,
        false,
        true,
      );
    }

    taskName = this.fixTaskName(taskName);
    // @ts-ignore
    this.taskName = taskName;
    await UtilsMessages.compilationWrapper(
      async () => {
        await CompilerManager.Instance.syncInit(this, initialParams);
      },
      `${CLI.chalk.green('sync action')} for ${taskName}`,
      'Event:',
    );

    if (_.isFunction(afterInitCallBack)) {
      await Helpers.runSyncOrAsync({
        functionFn: afterInitCallBack,
        arrayOfParams: [initialParams],
      });
    }
    return this;
    //#endregion
  }
  //#endregion

  //#region start and watch
  /**
   * @deprecated use runTask instead
   * Do not override this
   */
  public async startAndWatch(
    options?: StartAndWatchOptions<INITIAL_PARAMS>,
  ): Promise<BaseClientCompiler<INITIAL_PARAMS>> {
    //#region @backendFunc
    let { taskName, watchOnly, initialParams } = options || {};
    this.onlySingleRun = false;
    if (!this.isInitedWithOptions) {
      Helpers.error(
        `[BaseClientCompiler] Please init client class intance with options`,
        false,
        true,
      );
    }

    taskName = this.fixTaskName(taskName);
    // @ts-ignore
    this.taskName = taskName;
    if (this.folderPath.length > 0) {
      if (watchOnly) {
        console.log(
          CLI.chalk.gray(
            `[incremental-compiler] Watch mode only for "${taskName}"`,
          ),
        );
      } else {
        await this.start(options);
      }
      if (_.isFunction(this.preAsyncAction)) {
        await UtilsMessages.compilationWrapper(
          async () => {
            await this.preAsyncAction((initialParams || {}) as any);
          },
          `${CLI.chalk.green('pre-async action')} for ${taskName}`,
          'Event:',
        );
      }
      await CompilerManager.Instance.asyncInit(this, initialParams || {});
    } else {
      Helpers.log(`No action for task: ${taskName}.. starting task`);
      await this.start(options);
    }
    return this;
    //#endregion
  }
  //#endregion

  //#region sync action
  /**
   *
   * @param absolteFilesPathes for each watched file
   * @returns
   */
  public syncAction(
    absolteFilesPathes?: string[],
    initialParams?: INITIAL_PARAMS,
  ): Promise<void> {
    return void 0;
  }
  //#endregion

  //#region pre async action
  public async preAsyncAction(initialParams?: INITIAL_PARAMS): Promise<void> {}
  //#endregion

  //#region async action
  public asyncAction(
    asyncEvents: ChangeOfFile,
    initialParams?: INITIAL_PARAMS,
  ): Promise<void> {
    return void 0;
  }
  //#endregion

  //#region get files to watch
  public getFilesFolderPatternsToWatch(): string[] {
    //#region @backendFunc
    const folders: string[] = [];
    // this.clients.forEach(c => {
    [this].forEach(c => {
      // console.log("c.folderPath", c.folderPath)
      c.folderPath.forEach(folderPath => {
        // console.log(`fp`, fp)
        if (_.isString(folderPath) && !folders.includes(folderPath)) {
          const mapped = mapForWatching(folderPath);
          folders.push(...mapped);
        }
      });
    });

    return _.cloneDeep(folders);
    //#endregion
  }
  //#endregion

  //#region private methods

  //#region private methods / fix and assign options
  private fixAndAssignOptions(options?: BaseClientCompilerOptions): void {
    //#region @backendFunc
    if (!_.isArray(options.subscribeOnlyFor)) {
      options.subscribeOnlyFor = [];
    }
    if (_.isUndefined(options.folderPath)) {
      options.folderPath = [];
    }
    if (_.isUndefined(options.folderPathContentCheck)) {
      options.folderPathContentCheck = [];
    }
    if (_.isUndefined(options.ignoreFolderPatter)) {
      options.ignoreFolderPatter = [];
    }
    if (_.isString(options.folderPath)) {
      options.folderPath = [options.folderPath];
    }
    if (_.isString(options.folderPathContentCheck)) {
      options.folderPathContentCheck = [options.folderPathContentCheck];
    }
    if (!_.isString(options.folderPath) && !_.isArray(options.folderPath)) {
      Helpers.error(`Folder path shoudl be string or array`, false, true);
    }
    if (
      !_.isString(options.folderPathContentCheck) &&
      !_.isArray(options.folderPathContentCheck)
    ) {
      Helpers.error(`Folder path shoudl be string or array`, false, true);
    }
    if (_.isUndefined(options.followSymlinks)) {
      options.followSymlinks = false;
    }
    if (_.isUndefined(options.notifyOnFileUnlink)) {
      options.notifyOnFileUnlink = false;
    }
    // console.log('ASSIGNE', options)
    Object.assign(this, options);
    //#endregion
  }
  //#endregion

  //#region private methods / fix task name
  private fixTaskName(taskName: string): string {
    if (!_.isString(taskName)) {
      taskName = `task "${this.taskName}"`;
    }
    return taskName;
  }
  //#endregion

  //#endregion
}
