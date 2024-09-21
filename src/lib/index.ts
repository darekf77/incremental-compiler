import * as models from './models';
export * from './change-of-file';
//#region @backend
export * from './incremental-watcher';
export * from './compiler-manager.backend';
export * from './base-client-compiler.backend';
export * from './constants';

import * as incBase from './base-client-compiler.backend';
import * as change from './change-of-file';
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
//#endregion
