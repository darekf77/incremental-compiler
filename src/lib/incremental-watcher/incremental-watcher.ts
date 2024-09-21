import { _, path, frameworkName, Helpers } from 'tnp-core/src';
import { IncrementalWatcherInstance } from './incremental-watcher-instance';
import { IncrementalWatcherOptions } from './incremental-watcher-options';
//#region @backend
import { chokidar } from 'tnp-core/src';
import { ParcelWatcherAdapter } from './parcel-watcher-adapter.backend';
import { format } from 'path';
//#endregion

export async function incrementalWatcher(
  filePath: string | string[],
  watchOptions: IncrementalWatcherOptions,
): Promise<IncrementalWatcherInstance> {
  //#region @backendFunc
  if (!watchOptions) {
    watchOptions = {} as any;
  }

  if (
    !watchOptions?.engine ||
    (_.isString(watchOptions?.engine) && watchOptions?.engine.trim() === '')
  ) {
    // engine = 'chokidar';
    // @ts-ignore
    watchOptions.engine = '@parcel/watcher';
  }

  // if (frameworkName === 'taon') {
  //   // @ts-ignore
  //   watchOptions.engine = 'chokidar';
  // } else {
  //   // @ts-ignore
  //   watchOptions.engine = '@parcel/watcher';
  // }

  // @LAST @parcel/watcher sometime does not work :/
  watchOptions.engine = 'chokidar';

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
