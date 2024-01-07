//#region imports
//#region @backend
import { BaseClientCompiler } from './base-client-compiler.backend';
//#endregion
import { ConfigModels } from 'tnp-config';
//#endregion
export namespace Models {

  //#region helpers to override
  // /**
  //  * @deprecated
  //  */
  // export interface HelpersToOverride {
  //   info: Function;
  //   warn: Function;
  //   error: Function;
  //   log: Function;
  //   runSyncOrAsync: Function;
  //   compilationWrapper: Function;
  // }
  //#endregion

  //#region start and watch options
  export interface StartAndWatchOptions<INIT_PARAMS = any> {
    afterInitCallBack?: (initalParams?: INIT_PARAMS) => void;
    watchOnly?: boolean;
    taskName?: string
    initalParams?: INIT_PARAMS;
  }
  export type StartOptions<T = any> = Omit<StartAndWatchOptions<T>, 'watchOnly'>;
  //#endregion

  //#region  base client compiler options
  export interface BaseClientCompilerOptions {
    folderPath?: string | string[];
    /**
     * It will cache in memory previouse files
     * to limit async actions calls
     * and prevent not changed files emiting change event
     */
    folderPathContentCheck?: string | string[];

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
    ignoreFolderPatter?: string[];
    allowedOnlyFileExt?: string[];
    /**
     * useful when using **allowedOnlyFileExt**
     */
    additionallyAllowedFilesWithNames?: string[];
    executeOutsideScenario?: boolean;
    subscribeOnlyFor?: ConfigModels.FileExtension[];
  }
  //#endregion

}
