//#region imports
import { CoreModels } from 'tnp-core/src';
//#endregion

//#region start and watch options
export interface StartAndWatchOptions<INIT_PARAMS = any> {
  afterInitCallBack?: (initialParams?: INIT_PARAMS) => void;
  watchOnly?: boolean;
  /**
   * override task name
   */
  taskName?: string;
  initialParams?: INIT_PARAMS;
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
  engine?: IncrementalWatcherOptions['engine']
}
//#endregion

export interface ParcelEvent {
  path: string;
  type: ParcelEventType;
}

export type IncrementalWatcherAllEvents = 'all' | IncrementalWatcherEvents;
export type ListenerForAll = (
  eventName: IncrementalWatcherEvents,
  path: string,
) => void;
export type ListenerForSingleEvent = (path: string) => void;
export type Listener = ListenerForAll | ListenerForSingleEvent;

export interface IncrementalWatcherInstance {
  add(paths: string | ReadonlyArray<string>): void;
  on(event: 'all', listener: ListenerForAll): this;

  on(
    event: IncrementalWatcherAllEvents,
    listener: ListenerForSingleEvent,
  ): this;
}

export interface IncrementalWatcherOptions {
  ignored?: string[];
  ignoreInitial?: boolean;
  followSymlinks?: boolean;
  name: string;
  /**
   * Default is @parcel/watcher
   */
  engine?: 'chokidar' | '@parcel/watcher';
}

export type IncrementalWatcherEvents =
  | 'add'
  | 'addDir'
  | 'change'
  | 'unlink'
  | 'unlinkDir';

export type ParcelEventType = 'create' | 'update' | 'delete';

export interface ChangeOfFile {
  datetime: Date;
  fileAbsolutePath: string;
  eventName: 'add' | 'change' | 'unlink' | 'unlinkDir';
}
