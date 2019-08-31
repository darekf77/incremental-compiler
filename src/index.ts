//#region @backend
export * from './incremental-compiler.backend';
export * from './base-client-compiler.backend';
export * from './change-of-file.backend';

import * as incCompiler from './incremental-compiler.backend';
import * as incBase from './base-client-compiler.backend';
import * as change from './change-of-file.backend';
import * as deco from './inc-compiler-decorators.backend';
import { Helpers } from './helpers';
import * as _ from 'lodash';

export interface HelpersToOverride {
  info: Function;
  warn: Function;
  error: Function;
  log: Function;
  runSyncOrAsync: Function;
  compilationWrapper: Function;
}


/**
 * Template for watcher client:
 *
 * import { IncCompiler } from 'firedev'
 *
 * IncCompiler.init( asyncChangeOfFile => {
 *
 * })
 *
 * @IncCompiler.Class({ className: 'TestWatcher' })
 * export class TestWatcher extends IncCompiler.Base {
 *
 * syncAction(files = []) { }
 * preAsyncAction() { }
 * asyncAction(change: IncCompiler.Change, additionalData:any ) { }
 * }
 */
export namespace IncCompiler {
  /**
   * 1. Only one task at the time
   * 2. Only files changes not directories
   */
  export const init = (onAsyncChangeOfFile?:
    (event: change.ChangeOfFile) => Promise<any>, helperOverride?: HelpersToOverride) => {
    incCompiler.CompilerManager.Instance.initScenario(onAsyncChangeOfFile);
    if (_.isObject(helperOverride) && !_.isArray(helperOverride)) {
      Object.keys(helperOverride).forEach(fnName => {
        if (_.isFunction(helperOverride[fnName])) {
          Helpers[fnName] = helperOverride[fnName];
        }
      })
    }
  };
  export import Base = incBase.BaseClientCompiler;
  export import Class = deco.IncCompilerClass;
  export namespace methods {
    export import AsyncAction = deco.AsyncAction;
  }
  export import Change = change.ChangeOfFile;
}
//#endregion
