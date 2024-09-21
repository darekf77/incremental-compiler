import * as models from './models';
export * from './change-of-file';
export * from './constants';
export * from './incremental-watcher';
import * as change from './change-of-file';
export * from './base-client-compiler';
import * as incBase from './base-client-compiler';
//#region @backend
export * from './compiler-manager';
//#endregion

import { _ } from 'tnp-core/src';
/**
 * Template for watcher client:
 *
 * import { IncCompiler } from 'incremental-compiler';
 *
 * export class TestWatcher extends IncCompiler.Base {
 *
 * syncAction(files = []) { }
 * preAsyncAction() { }
 * asyncAction(change: IncCompiler.Change, additionalData:any ) { }
 * }
 */
export namespace IncCompiler {
  export import Models = models.Models;
  export import Base = incBase.BaseClientCompiler;
  export import Change = change.ChangeOfFile;
}
