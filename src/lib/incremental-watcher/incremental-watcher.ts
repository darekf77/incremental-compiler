
import { chokidar, _, path } from 'tnp-core';

import { IncrementalWatcherInstance } from './incremental-watcher-instance';
import { IncrementalWatcherOptions } from './incremental-watcher-options';
import { ParcelWatcherAdapter } from './parcel-watcher-adapter.backend';


export async function incrementalWatcher(filePath: string | string[], watchOptions?: IncrementalWatcherOptions): Promise<IncrementalWatcherInstance> {
  let { engine } = watchOptions || {};
  if (!engine || (_.isString(engine) && engine.trim() === '')) {
    // engine = 'chokidar';
    engine = '@parcel/watcher';
  }
  // if (engine === '@parcel/watcher') {
  // const instance = new ParcelWatcherAdapter(filePath, watchOptions);
  // return instance as any;
  // } else {
  const opt = _.cloneDeep(watchOptions);
  opt['ignorePermissionErrors'] = true;
  return chokidar.watch(filePath, watchOptions)
  // }
}
