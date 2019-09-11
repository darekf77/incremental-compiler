import * as path from 'path';
import * as _ from 'lodash';
import * as fse from 'fs-extra';
import { CLASS } from 'typescript-class-helpers';

import { ChangeOfFile } from './change-of-file.backend';
import { CompilerManager } from './compiler-manager.backend';
import { Models } from './models.backend';
import { Helpers } from './helpers.backend';
import chalk from 'chalk';

export class BaseClientCompiler<RES_ASYNC = any, RES_SYNC = any, ADDITIONAL_DATA = any>
  implements Models.BaseClientCompilerOptions {

  public readonly followSymlinks: boolean;
  public readonly subscribeOnlyFor: Models.FileExtension[] = []
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
      options.followSymlinks = false;
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
          return path.resolve(p);
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
    await this.compilationWrapper(async () => {
      await CompilerManager.Instance.syncInit(this);
    }, `${chalk.green('sync action')} for ${taskName}`, 'Event:');
    return this;
  }
  //#endregion

  //#region start and watch
  /**
   * Do not override this
   */
  public async startAndWatch(taskName?: string, afterInitCallBack?: () => void)
    : Promise<BaseClientCompiler<RES_ASYNC, RES_SYNC, ADDITIONAL_DATA>> {
    taskName = this.fixTaskName(taskName)
    await this.start(taskName, afterInitCallBack);
    if (_.isFunction(this.preAsyncAction)) {
      await this.compilationWrapper(this.preAsyncAction,
        `${chalk.green('pre-async action')} for ${taskName}`, 'Event:');
    }
    await CompilerManager.Instance.asyncInit(this);
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
