//#region imports
import { CoreModels } from 'tnp-core/src';
//#endregion
export namespace Models {
  //#region start and watch options
  export interface StartAndWatchOptions<INIT_PARAMS = any> {
    afterInitCallBack?: (initalParams?: INIT_PARAMS) => void;
    watchOnly?: boolean;
    /**
     * override task name
     */
    taskName?: string
    initalParams?: INIT_PARAMS;
  }
  export type StartOptions<T = any> = Omit<StartAndWatchOptions<T>, 'watchOnly'>;
  //#endregion

  //#region  base client compiler options
  export interface BaseClientCompilerOptions {
    taskName: string;
    folderPath?: string | string[];
    /**
     * It will cache in memory previouse files
     * to limit async actions calls
     * and prevent not changed files emiting change event
     */
    folderPathContentCheck?: string | string[];

    /**
     * default true
     */
    followSymlinks?: boolean;
    /**
     * Notify compiler if file is unlinked
     * default: false
     */
    notifyOnFileUnlink?: boolean;

    /**
     * ignore glob folder pattern
     * node_modules is always ignored
     */
    ignoreFolderPatter?: string[];
    subscribeOnlyFor?: CoreModels.FileExtension[];
  }
  //#endregion

}
