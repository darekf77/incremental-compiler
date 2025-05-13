//#region imports
import { fse } from 'tnp-core/src'; // @backend
import { path, _, crossPlatformPath } from 'tnp-core/src';
import { Helpers } from 'tnp-core/src';
import { CLI } from 'tnp-core/src';
import { CoreModels } from 'tnp-core/src';

import { ChangeOfFile } from './change-of-file';
import { CompilerManager } from './compiler-manager';
import { Models } from './models';
//#endregion

export class BaseClientCompiler<INITIAL_PARAMS = any>
  implements Models.BaseClientCompilerOptions
{
  //#region fields
  public readonly followSymlinks: boolean;
  public readonly subscribeOnlyFor: CoreModels.FileExtension[] = [];
  public readonly executeOutsideScenario: boolean;
  public readonly taskName: string;
  public readonly notifyOnFileUnlink: boolean;

  protected onlySingleRun = true;
  public ignoreFolderPatter?: string[];
  //#region @backend
  public compilationWrapper = Helpers.compilationWrapper;
  //#endregion
  private pathResolve: boolean = false;
  private isInitedWithOptions: boolean = false;
  private __folderPath: string[] = [];
  public lastAsyncFiles: string[] = [];
  private _folderPathContentCheck: string[] = [];
  isWatchCompilation: boolean = false;

  //#endregion

  //#region getters & setteres

  //#region getters & setteres / folder path content check
  get folderPathContentCheck() {
    return this._folderPathContentCheck;
  }
  private set folderPathContentCheck(v) {
    this._folderPathContentCheck = v;
  }
  //#endregion

  //#region getters & setteres / folder path
  public set folderPath(v) {
    if (_.isString(v)) {
      v = [v];
    }
    this.__folderPath = v;
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

  //#endregion

  //#region constructor
  //#region @backend
  constructor(options?: Models.BaseClientCompilerOptions) {
    if (_.isUndefined(options)) {
      this.isInitedWithOptions = false;
      Helpers.log(
        '[incremental-compiler] Compiler class instace without init options',
      );
    } else {
      this.isInitedWithOptions = true;
      this._init(options);
    }
  }
  //#endregion
  //#endregion

  //#region / init options
  /**
   * manually init options (when no passing object to constructor super() )
   */
  protected initOptions(options?: Models.BaseClientCompilerOptions) {
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
    this._init(options);
    //#endregion
  }
  //#endregion

  //#region api methods / start
  /**
   * do not override this
   */
  async runTask(
    options?: { watch?: boolean } & Models.StartAndWatchOptions<INITIAL_PARAMS>,
  ): Promise<BaseClientCompiler<INITIAL_PARAMS>> {
    //#region @backendFunc
    this.isWatchCompilation = options?.watch;
    if (options?.watch) {
      await this.startAndWatch(options);
    } else {
      await this.start(options);
    }
    return this;
    //#endregion
  }

  //#region api methods / start
  /**
   * @deprecated use runTask instead
   * Do not override this
   */
  public async start(
    options?: Models.StartOptions<INITIAL_PARAMS>,
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
    await this.compilationWrapper(
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

  //#region api methods / start and watch
  /**
   * @deprecated use runTask instead
   * Do not override this
   */
  public async startAndWatch(
    options?: Models.StartAndWatchOptions<INITIAL_PARAMS>,
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
        await this.compilationWrapper(
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

  //#region api methods / sync action
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

  //#region api methods / pre async action
  public async preAsyncAction(initialParams?: INITIAL_PARAMS): Promise<void> {}
  //#endregion

  //#region api methods / async action
  public asyncAction(
    asyncEvents: ChangeOfFile,
    initialParams?: INITIAL_PARAMS,
  ): Promise<void> {
    return void 0;
  }
  //#endregion

  //#endregion

  //#region private methods

  //#region private methods / _init
  private _init(options?: Models.BaseClientCompilerOptions) {
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
  private fixTaskName(taskName: string) {
    if (!_.isString(taskName)) {
      taskName = `task "${this.taskName}"`;
    }
    return taskName;
  }
  //#endregion

  filesToWatch() {
    //#region @backendFunc
    const folders: string[] = [];
    // this.clients.forEach(c => {
    [this].forEach(c => {
      // console.log("c.folderPath", c.folderPath)
      c.folderPath.forEach(folderPath => {
        // console.log(`fp`, fp)
        if (_.isString(folderPath) && !folders.includes(folderPath)) {
          const mapped = this.mapForWatching(folderPath);
          folders.push(...mapped);
        }
      });
    });
    return _.cloneDeep(folders);
    //#endregion
  }

  private mapForWatching(c: string): string[] {
    //#region @backendFunc
    if (fse.existsSync(c) && fse.lstatSync(c).isDirectory()) {
      return [c, `${c}/**/*.*`];
    }
    return [c];
    //#endregion
  }

  //#endregion
}
