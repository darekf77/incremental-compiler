import { WatchOptions } from 'chokidar';
import { Matcher } from 'anymatch';

export interface IncrementalWatcherOptions {
  cwd?: string;
  ignored?: Matcher;
  ignoreInitial?: boolean;
  followSymlinks?: boolean;
  name: string;
  engine?: 'chokidar' | '@parcel/watcher'
}
