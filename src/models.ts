//#region @backend
import { BaseClientCompiler } from './base-client-compiler.backend';
//#endregion
import { ConfigModels } from 'tnp-config';

export namespace Models {

  export interface StartAndWatchOptions {
    afterInitCallBack?: () => void;
    watchOnly?: boolean;
  }



  export interface BaseClientCompilerOptions {
    folderPath?: string | string[];
    watchDepth?: Number;
    /**
     * default true
     */
    followSymlinks?: boolean;
    /**
     * Notify compiler if file is unlinked
     * default: false
     */
    notifyOnFileUnlink?: boolean;
    executeOutsideScenario?: boolean;
    subscribeOnlyFor?: ConfigModels.FileExtension[];
  }

  //#region @backend
  export interface ChangeOfFileCloneOptios {
    onlyForClient?: BaseClientCompiler[];
  }
  //#endregion



}
