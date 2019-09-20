import { BaseClientCompiler } from './base-client-compiler.backend';

export namespace Models {

  export type CutableFileExt = 'scss' | 'css' | 'sass' | 'html' | 'ts';

  export type FileExtension = 'ts' | 'js' | 'json' | 'html' | 'jpg' | 'png' | 'txt' | CutableFileExt;

  export interface BaseClientCompilerOptions {
    folderPath?: string | string[];
    watchDepth?: Number;
    followSymlinks?: boolean;
    /**
     * Notify compiler if file is unlinked
     * default: false
     */
    notifyOnFileUnlink?: boolean;
    executeOutsideScenario?: boolean;
    subscribeOnlyFor?: FileExtension[];
  }

  export interface ChangeOfFileCloneOptios {
    onlyForClient?: BaseClientCompiler[];
  }



}
