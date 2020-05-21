//#region @backend
import { BaseClientCompiler } from './base-client-compiler.backend';
//#endregion

export namespace Models {

  export interface StartAndWatchOptions {
    afterInitCallBack?: () => void;
    watchOnly?: boolean;
  }

  export type CutableFileExt = 'scss' | 'css' | 'sass' | 'html' | 'ts';

  export type FileExtension = 'ts' | 'js' | 'json' | 'html' | 'jpg' | 'png' | 'txt' | CutableFileExt;

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
    subscribeOnlyFor?: FileExtension[];
  }

  //#region @backend
  export interface ChangeOfFileCloneOptios {
    onlyForClient?: BaseClientCompiler[];
  }
  //#endregion



}
