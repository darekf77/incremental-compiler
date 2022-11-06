//#region imports
import { path, fse, _, crossPlatformPath } from 'tnp-core';
import { CLASS } from 'typescript-class-helpers';
import { ChangeOfFile } from './change-of-file.backend';
import { CompilerManager } from './compiler-manager.backend';
import { Models } from './models';
import { Helpers } from 'tnp-core';
import { CLI } from 'tnp-cli';
import { ConfigModels } from 'tnp-config';
//#endregion

export class BaseClientCompiler<RES_ASYNC = any, RES_SYNC = any, ADDITIONAL_DATA = any>
  implements Models.BaseClientCompilerOptions {

  //#region fields
  public readonly followSymlinks: boolean;
  public readonly subscribeOnlyFor: ConfigModels.FileExtension[] = []
  public readonly executeOutsideScenario: boolean;
  public readonly watchDepth: Number;
  public readonly taskName: string;
  public ignoreFolderPatter?: string[];
  public allowedOnlyFileExt?: string[];
  public additionallyAllowedFilesWithNames?: string[];
  public readonly notifyOnFileUnlink: boolean;
  public compilationWrapper = Helpers.compilationWrapper;
  private pathResolve = false;
  private initedWithOptions = false;
  private __folderPath: string[] = [];
  private _folderPathContentCheck: string[] = [];

  //#endregion

  //#region getters & setteres

  //#region getters & setteres / key
  get key() {
    return `${CLASS.getNameFromObject(this)}__${_.kebabCase(this.taskName)}`;
  }
  //#endregion

  //#region getters & setteres / is inited
  get isInited() {
    return this.initedWithOptions;
  }
  //#endregion

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
    this.__folderPath = v;
  }
  public get folderPath(): string[] {
    if (!this.pathResolve) {
      this.pathResolve = true;
      this.__folderPath.map(p => {
        if (fse.existsSync(p)) {
          return crossPlatformPath(path.resolve(p));
        } else {
          Helpers.warn(`[BaseClientCompiler] client "${CLASS.getNameFromObject(this)}" folderPath doesn't not exist ${this.folderPath}`)
          return void 0;
        }
      }).filter(f => !!f);
    }
    return this.__folderPath;
  }
  //#endregion

  //#endregion

  //#region constructor
  constructor(options?: Models.BaseClientCompilerOptions) {
    if (_.isUndefined(options)) {
      this.initedWithOptions = false;
      Helpers.log('[incremental-compiler] Compiler class instace without init options')
    } else {
      this.initedWithOptions = true;
      this._init(options);
    }
  }
  //#endregion

  //#region api methods

  //#region api methods / init options
  /**
   * manually init options (when no passing object to constructor super() )
   */
  protected initOptions(options?: Models.BaseClientCompilerOptions) {
    if (this.initedWithOptions === true) {
      Helpers.warn(`[incremental-compiler] You can't reinit instance class again...`
        + ` (after reiniting in constructor super(....))`, true);
    }
    if (!options) {
      Helpers.error(`[incremental-compiler] Please init instance with options config`, false, true);
    }
    this.initedWithOptions = true;
    this._init(options);
  }
  //#endregion

  //#region api methods / start
  /**
   * Do not override this
   */
  public async start(taskName?: string, afterInitCallBack?: () => void)
    : Promise<BaseClientCompiler<RES_ASYNC, RES_SYNC, ADDITIONAL_DATA>> {
    CompilerManager.Instance.addClient(this);
    if (!this.initedWithOptions) {
      Helpers.error(`[BaseClientCompiler] Please init client class intance with options`, false, true)
    }

    taskName = this.fixTaskName(taskName);
    // @ts-ignore
    this.taskName = taskName;
    await this.compilationWrapper(async () => {
      await CompilerManager.Instance.syncInit(this);
    }, `${CLI.chalk.green('sync action')} for ${taskName}`, 'Event:');

    if (_.isFunction(afterInitCallBack)) {
      await Helpers.runSyncOrAsync(afterInitCallBack);
    }
    return this;
  }
  //#endregion

  //#region api methods / start and watch
  /**
   * Do not override this
   */
  public async startAndWatch(taskName?: string, options?: Models.StartAndWatchOptions)
    : Promise<BaseClientCompiler<RES_ASYNC, RES_SYNC, ADDITIONAL_DATA>> {

    if (!this.initedWithOptions) {
      Helpers.error(`[BaseClientCompiler] Please init client class intance with options`, false, true)
    }

    const { watchOnly, afterInitCallBack } = options || {};

    taskName = this.fixTaskName(taskName);
    // @ts-ignore
    this.taskName = taskName;
    if (this.folderPath.length > 0) {
      if (watchOnly) {
        console.log(CLI.chalk.gray(`[incremental-compiler] Watch mode only for "${taskName}"`));
      } else {
        await this.start(taskName, afterInitCallBack);
      }
      if (_.isFunction(this.preAsyncAction)) {
        await this.compilationWrapper(async () => {
          await this.preAsyncAction()
        },
          `${CLI.chalk.green('pre-async action')} for ${taskName}`, 'Event:');
      }
      await CompilerManager.Instance.asyncInit(this);
    } else {
      Helpers.log(`No action for task: ${taskName}.. starting task`);
      await this.start(taskName, afterInitCallBack);
    }
    return this;
  }
  //#endregion

  //#region api methods / sync action
  /**
   *
   * @param absolteFilesPathes for each watched file
   * @returns
   */
  public syncAction(absolteFilesPathes?: string[]): Promise<RES_SYNC> {
    return void 0;
  }
  //#endregion

  //#region api methods / pre async action
  public async preAsyncAction() { }
  //#endregion

  //#region api methods / async action
  public asyncAction(asyncEvents: ChangeOfFile, additionalData?: ADDITIONAL_DATA): Promise<RES_ASYNC> {
    return void 0;
  }
  //#endregion

  //#endregion

  //#region private methods

  //#region private methods / _init
  private _init(options?: Models.BaseClientCompilerOptions) {
    if (_.isUndefined(options.executeOutsideScenario)) {
      options.executeOutsideScenario = true;
    }
    if (!_.isArray(options.subscribeOnlyFor)) {
      options.subscribeOnlyFor = []
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
    if (!_.isString(options.folderPathContentCheck) && !_.isArray(options.folderPathContentCheck)) {
      Helpers.error(`Folder path shoudl be string or array`, false, true);
    }
    if (_.isUndefined(options.watchDepth)) {
      options.watchDepth = Number.POSITIVE_INFINITY;
    }
    if (_.isNumber(options.watchDepth)) {
      options.watchDepth = Math.abs(options.watchDepth);
    }
    if (_.isUndefined(options.followSymlinks)) {
      options.followSymlinks = true;
    }
    if (_.isUndefined(options.notifyOnFileUnlink)) {
      options.notifyOnFileUnlink = false;
    }
    // console.log('ASSIGNE', options)
    Object.assign(this, options);
  }
  //#endregion

  //#region private methods / fix task name
  private fixTaskName(taskName: string) {
    if (!_.isString(taskName)) {
      taskName = `task of client "${CLASS.getNameFromObject(this)}"`;
    }
    return taskName;
  }
  //#endregion

  //#endregion

}
