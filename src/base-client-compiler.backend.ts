import * as chokidar from 'chokidar';
import * as path from 'path';
import * as _ from 'lodash';
import * as glob from 'glob';
import * as fse from 'fs-extra';
import { CLASS } from 'typescript-class-helpers';

import { ChangeOfFile } from './change-of-file.backend';
import { CompilerManager } from './incremental-compiler.backend';
import { Models } from './models';
import { Helpers } from './helpers';
import chalk from 'chalk';

export class BaseClientCompiler<RES_ASYNC = any, RES_SYNC = any, ADDITIONAL_DATA = any> {

  private compilationWrapper = Helpers.compilationWrapper;
  private pathResolve = false;

  //#region folder path
  private __folderPath: string;
  public set folderPath(v) {
    this.__folderPath = v;
  }
  public get folderPath(): string {
    if (!this.pathResolve) {
      this.pathResolve = true;
      if (fse.existsSync(this.__folderPath)) {
        this.__folderPath = path.resolve(this.__folderPath);
      } else {
        Helpers.warn(`[BaseClientCompiler] client "${CLASS.getNameFromObject(this)}" folderPath doesn't not exist ${this.folderPath}`)
        return void 0;
      }
    }
    return this.__folderPath;
  }
  //#endregion

  public readonly subscribeOnlyFor: Models.FileExtension[] = []
  public readonly executeOutsideScenario: boolean;

  //#region constructor
  set(options?: Models.BaseClientCompilerOptions): BaseClientCompiler<RES_ASYNC, RES_SYNC, ADDITIONAL_DATA> {
    if (_.isUndefined(options)) {
      options = {} as any;
    }
    if (_.isUndefined(options.executeOutsideScenario)) {
      options.executeOutsideScenario = true;
    }
    if (!_.isArray(options.subscribeOnlyFor)) {
      options.subscribeOnlyFor = []
    }
    if (!_.isString(options.folderPath)) {
      options.folderPath = void 0;
    }
    const { executeOutsideScenario, folderPath, subscribeOnlyFor } = options;
    Object.assign(this, { executeOutsideScenario, subscribeOnlyFor, folderPath });
    return this;
  }
  //#endregion

  //#region init

  private fixTaskName(taskName: string) {
    if (!_.isString(taskName)) {
      taskName = `task of client "${CLASS.getNameFromObject(this)}"`;
    }
    return taskName;
  }

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
