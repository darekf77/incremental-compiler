//#region imports
import { _, path, frameworkName, Helpers } from 'tnp-core/src';
import { chokidar } from 'tnp-core/src';

import { IncrementalWatcherInstance } from './models';
import { IncrementalWatcherOptions } from './models';
import { ParcelWatcherAdapter } from './parcel-watcher-adapter';
//#endregion

export function incrementalWatcher(
  filesFolderPathOrPatternsToWatch: string[],
  watchOptions: IncrementalWatcherOptions,
): IncrementalWatcherInstance {
  //#region @backendFunc
  if (!watchOptions) {
    watchOptions = {} as any;
  }

  // default to parcel watcher
  watchOptions.engine = watchOptions.engine || '@parcel/watcher';

  Helpers.logInfo(`Using watcher: ${watchOptions.engine}`);

  if (watchOptions?.engine === '@parcel/watcher') {
    const opt = _.cloneDeep(watchOptions);
    // console.log({ filesFolderPathOrPattern/sToWatch, opt });
    const instance = new ParcelWatcherAdapter(
      filesFolderPathOrPatternsToWatch,
      opt,
    );
    return instance as any;
  } else {
    const opt: IncrementalWatcherOptions & {
      ignorePermissionErrors?: boolean;
    } = _.cloneDeep(watchOptions);

    opt.ignorePermissionErrors = true;
    return chokidar.watch(filesFolderPathOrPatternsToWatch, watchOptions);
  }
  //#endregion
}
