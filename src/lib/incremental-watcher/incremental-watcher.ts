
import { chokidar, crossPlatformPath, _, path } from 'tnp-core';

import { IncrementalWatcherInstance } from './incremental-watcher-instance';
import { IncrementalWatcherOptions } from './incremental-watcher-options';
import { Stats } from 'fs';
import { ParcelWatcherAdapter } from './parcel-watcher-adapter';


export async function incrementalWatcher(path: string | string[], watchOptions?: IncrementalWatcherOptions,
  engine: 'chokidar' | '@parcel/watcher' = 'chokidar'): Promise<IncrementalWatcherInstance> {

  if (engine === '@parcel/watcher') {

    const instance = new ParcelWatcherAdapter(path, watchOptions);
    return instance as any;
  } else {
    return chokidar.watch(path, watchOptions)
  }


}
