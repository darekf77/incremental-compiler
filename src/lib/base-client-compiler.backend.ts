import { path, fse, _, crossPlatformPath } from 'tnp-core';
import { CLASS } from 'typescript-class-helpers';

import { ChangeOfFile } from './change-of-file.backend';
import { CompilerManager } from './compiler-manager.backend';
import { Models } from './models';
import { Helpers } from 'tnp-core';
import { CLI } from 'tnp-cli';
import { ConfigModels } from 'tnp-config';

export class BaseClientCompiler<RES_ASYNC = any, RES_SYNC = any, ADDITIONAL_DATA = any>
  implements Models.BaseClientCompilerOptions {

  public readonly followSymlinks: boolean;
  public readonly subscribeOnlyFor: ConfigModels.FileExtension[] = []
  public readonly executeOutsideScenario: boolean;
  public readonly watchDepth: Number;
  public readonly notifyOnFileUnlink: boolean;
  public compilationWrapper = Helpers.compilationWrapper;
  private pathResolve = false;
  private __folderPath: string[] = [];

  constructor(options?: Models.BaseClientCompilerOptions) {
    if (_.isUndefined(options)) {
      options = {} as any;
    }
    if (_.isUndefined(options.executeOutsideScenario)) {
      options.executeOutsideScenario = true;
    }
    if (!_.isArray(options.subscribeOnlyFor)) {
      options.subscribeOnlyFor = []
    }
    if (_.isUndefined(options.folderPath)) {
      options.folderPath = [];
    }
    if (_.isString(options.folderPath)) {
      options.folderPath = [options.folderPath];
    }
    if (!_.isString(options.folderPath) && !_.isArray(options.folderPath)) {
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
    Object.assign(this, options);
  }

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

  private fixTaskName(taskName: string) {
    if (!_.isString(taskName)) {
      taskName = `task of client "${CLASS.getNameFromObject(this)}"`;
    }
    return taskName;
  }


  //#region start
  /**
   * Do not override this
   */
  public async start(taskName?: string, afterInitCallBack?: () => void)
    : Promise<BaseClientCompiler<RES_ASYNC, RES_SYNC, ADDITIONAL_DATA>> {
    CompilerManager.Instance.addClient(this);
    taskName = this.fixTaskName(taskName)
    if (this.folderPath.length > 0) {
      await this.compilationWrapper(async () => {
        await CompilerManager.Instance.syncInit(this);
      }, `${CLI.chalk.green('sync action')} for ${taskName}`, 'Event:');
    } else {
      Helpers.log(`No action for task: ${taskName}`)
    }
    if (_.isFunction(afterInitCallBack)) {
      await Helpers.runSyncOrAsync(afterInitCallBack);
    }
    return this;
  }
  //#endregion

  //#region start and watch
  /**
   * Do not override this
   */
  public async startAndWatch(taskName?: string, options?: Models.StartAndWatchOptions)
    : Promise<BaseClientCompiler<RES_ASYNC, RES_SYNC, ADDITIONAL_DATA>> {
    const { watchOnly, afterInitCallBack } = options || {};

    taskName = this.fixTaskName(taskName)
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
      Helpers.log(`No action for task: ${taskName}`)
    }
    return this;
  }
  //#endregion

  //#region actions
  public syncAction(absolteFilesPathes?: string[]): Promise<RES_SYNC> {
    return void 0;
  }
  public async preAsyncAction() { }


  public asyncAction(asyncEvents: ChangeOfFile, additionalData?: ADDITIONAL_DATA): Promise<RES_ASYNC> {
    return void 0;
  }
  //#endregion

}
