//#region imports
import { _, path, frameworkName, Helpers } from 'tnp-core/src';
import { chokidar } from 'tnp-core/src';

import { IncrementalWatcherInstance } from './incremental-watcher-instance';
import { IncrementalWatcherOptions } from './incremental-watcher-options';
import { ParcelWatcherAdapter } from './parcel-watcher-adapter.backend'; // @backend
//#endregion

export async function incrementalWatcher(
  filePath: string | string[],
  watchOptions: IncrementalWatcherOptions,
): Promise<IncrementalWatcherInstance> {
  //#region @backendFunc
  if (!watchOptions) {
    watchOptions = {} as any;
  }

  if (frameworkName === 'taon') {
    // @ts-ignore
    watchOptions.engine = 'chokidar';
  } else {
    // @ts-ignore
    watchOptions.engine = '@parcel/watcher';
  }

  // // @LAST @parcel/watcher sometime does not work :
  // watchOptions.engine = 'chokidar';
  // watchOptions.engine = '@parcel/watcher';

  Helpers.logInfo(`Using watcher: ${watchOptions.engine}`);

  // Helpers.logInfo(`Using watcher: ${watchOptions.engine}`)

  // @ts-ignore
  if (watchOptions?.engine === '@parcel/watcher') {
    const instance = new ParcelWatcherAdapter(filePath, watchOptions);
    return instance as any;
  } else {
    const opt = _.cloneDeep(watchOptions);
    // @ts-ignore
    opt['ignorePermissionErrors'] = true;
    return chokidar.watch(filePath, watchOptions);
  }
  //#endregion
}
