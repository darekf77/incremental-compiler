
export namespace Models {

  export type CutableFileExt = 'scss' | 'css' | 'sass' | 'html' | 'ts';

  export type FileExtension = 'ts' | 'js' | 'json' | 'html' | 'jpg' | 'png' | 'txt' | CutableFileExt;

  export interface BaseClientCompilerOptions {
    folderPath?: string | string[];
    watchDepth?: Number;
    executeOutsideScenario?: boolean;
    subscribeOnlyFor?: FileExtension[];
  }


}


