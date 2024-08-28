import * as models from './models';
//#region @backend
export * from './incremental-watcher';
export * from './compiler-manager.backend';
export * from './base-client-compiler.backend';
export * from './change-of-file.backend';
export * from './constants';

import * as incCompiler from './compiler-manager.backend';
import * as incBase from './base-client-compiler.backend';
import * as change from './change-of-file.backend';
import * as deco from './decorators.backend';
import { Helpers } from 'tnp-core/src';
import { _ } from 'tnp-core/src';
import { CLASS } from 'typescript-class-helpers/src';

/**
 * Template for watcher client:
 *
 * import { IncCompiler } from 'taon'
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
  export import Models = models.Models;

  /**
   * 1. Only one task at the time
   * 2. Only files changes not directories
   * @deprecated
   */
  // export const init = (onAsyncChangeOfFile?:
  //   (event: change.ChangeOfFile) => Promise<any>, helperOverride?: Models.HelpersToOverride) => {
  //   incCompiler.CompilerManager.Instance.initScenario(onAsyncChangeOfFile);
  //   if (_.isObject(helperOverride) && !_.isArray(helperOverride)) {
  //     Object.keys(helperOverride).forEach(fnName => {
  //       // console.log('override name',fnName)
  //       if (_.isFunction(helperOverride[fnName])) {
  //         Helpers[fnName] = helperOverride[fnName];
  //       }
  //     })
  //   }
  // };
  export function allClients<T>(clientNameOrClass?: string | Function, condition?: (c: T) => boolean) {
    return incCompiler.CompilerManager.Instance.allClients.get(clientNameOrClass, condition)
  }
  export import Base = incBase.BaseClientCompiler;
  export import Class = deco.IncCompilerClass;
  export namespace methods {
    export import AsyncAction = deco.AsyncAction;
  }
  export import Change = change.ChangeOfFile;
  export function getInstance<CLASS_TYPE>(compilerClassName: string): CLASS_TYPE {
    if (_.isString(compilerClassName)) {
      var cl = CLASS.getBy(compilerClassName);
    }
    if (!cl) {
      Helpers.error(`Compiler instance not found... incorrect class name "${compilerClassName}"  `)
    }
    return cl as any;
  }


}
//#endregion
