
import { chokidar, _, path, frameworkName, Helpers } from 'tnp-core';

import { IncrementalWatcherInstance } from './incremental-watcher-instance';
import { IncrementalWatcherOptions } from './incremental-watcher-options';
import { ParcelWatcherAdapter } from './parcel-watcher-adapter.backend';


export async function incrementalWatcher(filePath: string | string[], watchOptions?: IncrementalWatcherOptions): Promise<IncrementalWatcherInstance> {
  if (!watchOptions) {
    watchOptions = ({} as any);
  }

  if (!watchOptions?.engine || (_.isString(watchOptions?.engine) && watchOptions?.engine.trim() === '')) {
    // engine = 'chokidar';
    // @ts-ignore
    watchOptions.engine = '@parcel/watcher';
  }
  if (frameworkName === 'firedev') {
    // @ts-ignore
    watchOptions.engine = 'chokidar';
  } else {
    // @ts-ignore
    watchOptions.engine = '@parcel/watcher';
  }

  // Helpers.info(`Using watcher: ${watchOptions.engine}`)

  if (watchOptions?.engine === '@parcel/watcher') {

    const instance = new ParcelWatcherAdapter(filePath, watchOptions);
    return instance as any;
  } else {
    const opt = _.cloneDeep(watchOptions);
    // @ts-ignore
    opt['ignorePermissionErrors'] = true;
    return chokidar.watch(filePath, watchOptions)
  }
}
