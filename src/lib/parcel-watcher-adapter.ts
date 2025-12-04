//#region imports
import type { AsyncSubscription, Event } from '@parcel/watcher';
import type parcelWatcher from '@parcel/watcher';
import type { IOptions } from 'glob';
import { chokidar, fg, UtilsStringRegex } from 'tnp-core/src';
import { crossPlatformPath, fse, glob, _ } from 'tnp-core/src';
import { Helpers, Utils } from 'tnp-core/src';
import { path } from 'tnp-core/src';

import { IGNORE_BY_DEFAULT } from './constants';
import { getFilesByPattern, stripGlobToDir } from './helpers';
import {
  IncrementalWatcherAllEvents,
  Listener,
  ListenerForSingleEvent,
  ParcelEventType,
  ParcelEvent,
  IncrementalWatcherInstance,
} from './models';
import { IncrementalWatcherOptions } from './models';
//#endregion

/**
 * Adapter for chokidar watcher that uses @parcel/watcher under the hood
 */
export class ParcelWatcherAdapter
  implements Partial<IncrementalWatcherInstance>
{
  //#region fields
  public static instances: ParcelWatcherAdapter[] = [];

  private pathsToWatch: string[] = [];

  private listenerData: {
    listenerFromOnFn: Listener;
    allowedEvent: IncrementalWatcherAllEvents;
  }[] = [];

  private subs: AsyncSubscription[] = [];

  private alreadyStarted: boolean = false;

  private allFilesAndFoldersInitial: string[] = [];

  private foldersPathes: { [folderAbsPath: string]: boolean } = {};

  private readonly ignore: IncrementalWatcherOptions['ignored'];

  private readonly ignoreInitial: IncrementalWatcherOptions['ignoreInitial'];

  private readonly followSymlinks: IncrementalWatcherOptions['followSymlinks'];

  private readonly engine: IncrementalWatcherOptions['engine'];

  private readonly name: IncrementalWatcherOptions['name'];
  //#endregion

  //#region constructor
  constructor(
    filesFolderPathOrPatternsToWatch: string[],
    initialOptions: IncrementalWatcherOptions,
  ) {
    //#region @backend
    this.ignore = [...IGNORE_BY_DEFAULT, ...(initialOptions.ignored || [])];

    this.ignoreInitial = initialOptions.ignoreInitial;
    this.followSymlinks = initialOptions.followSymlinks || false;
    this.engine = initialOptions.engine;
    this.name = initialOptions.name || 'parcel-watcher-adapter';

    ParcelWatcherAdapter.instances.push(this);
    this.add(filesFolderPathOrPatternsToWatch, {
      fistTimeAdding: true,
    });
    //#endregion
  }
  //#endregion

  //#region stop watching
  private async stopWatching(): Promise<void> {
    //#region @backendFunc
    // Helpers.logInfo('[incremental compiler] Stop all watcher + ' + this.options.name)
    for (const sub of this.subs) {
      await sub.unsubscribe();
    }
    //#endregion
  }
  //#endregion

  //#region start watching
  public async startWatching(options?: {
    // ignoreInitialPush?: boolean;
  }): Promise<void> {
    //#region @backendFunc
    options = options || {};

    // console.log('STARTING WATCHING - ' + this.options.name)

    this.pushInitial();

    const eventAction = (events: Event[]): void => {
      // this.isDebugging && console.log(`events before: ${events.length}`);

      // this.isDebugging && console.log(`events after: ${events.length}`);

      for (const listenerEvent of events) {
        listenerEvent.path = crossPlatformPath(listenerEvent.path);
        // this.isDebugging && console.log(
        //   `Event ${listenerEvent.type} ${listenerEvent.path}`,
        // );
        for (const listenerData of this.listenerData) {
          const { listenerFromOnFn, allowedEvent } = listenerData;

          this.notifyListener(listenerFromOnFn, allowedEvent, listenerEvent);
        }
      }
    };

    const watcher = require(this.engine) as typeof parcelWatcher;

    for (const pathToCatalog of this.pathsToWatch) {
      let isFile = false;
      if (Helpers.isSymlinkFileExitedOrUnexisted(pathToCatalog)) {
        const pathToCatalogFolder = crossPlatformPath(
          fse.realpathSync(pathToCatalog),
        );
        if (!Helpers.isFolder(pathToCatalogFolder)) {
          Helpers.logWarn(
            `[incremental-compiler] link not to folder ${pathToCatalogFolder}`,
          );
          isFile = true;
        }
      }
      if (!Helpers.isFolder(pathToCatalog)) {
        Helpers.logWarn(`[incremental-compiler] not a folder ${pathToCatalog}`);
        isFile = true;
      }
      if (isFile) {
        // FALLBACK TO CHOKIDAR IF WATCHING FILE WITH PARCEL
        chokidar
          .watch(pathToCatalog, {
            ignoreInitial: true,
          })
          .on('all', (eventName, absPath) => {
            for (const listenerData of this.listenerData) {
              const { listenerFromOnFn, allowedEvent } = listenerData;

              this.notifyListener(
                listenerFromOnFn,
                allowedEvent,
                this.chokidarToParcel(eventName, absPath),
              );
            }
          });
      } else {
        const firstLevelLinks = Helpers.linksToFoldersFrom(
          pathToCatalog,
          false,
        );
        const firstLevelFolders = Helpers.foldersFrom(pathToCatalog).filter(
          f => !firstLevelLinks.includes(f),
        );
        const secondLevelLinks = firstLevelFolders.reduce((a, b) => {
          return a.concat(Helpers.linksToFoldersFrom(b, false));
        }, []);
        const linksToWatch = [...firstLevelLinks, ...secondLevelLinks];

        for (const linkFolder of linksToWatch) {
          this.subs.push(
            await watcher.subscribe(
              linkFolder,
              (err, events) => {
                eventAction(events);
              },
              {
                ignore: this.ignore,
              },
            ),
          );
        }
        this.subs.push(
          await watcher.subscribe(
            pathToCatalog,
            (err, events) => {
              eventAction(events);
            },
            {
              ignore: this.ignore,
            },
          ),
        );
      }
    }
    //#endregion
  }
  //#endregion

  //#region add
  add(
    pathToAdd: string | string[],
    options?: {
      fistTimeAdding?: boolean;
    },
  ): void {
    //#region @backendFunc
    options = options || {};
    this.pathsToWatch = [
      ...this.pathsToWatch,
      ...(Array.isArray(pathToAdd) ? pathToAdd : [pathToAdd]),
    ];
    this.pathsToWatch = Utils.uniqArray(
      this.pathsToWatch
        .map(a => {
          a = stripGlobToDir(a);
          // this.isDebugging && console.log(`TO WATCH ${a}`);
          return a;
        })
        .filter(f => !!f),
    );

    // console.log(`[ParcelWatcherAdapter] Watching paths:`, this.pathsToWatch);

    this.pathsToWatch.forEach(possibleGlobPattern => {
      const maybeFolder = stripGlobToDir(possibleGlobPattern);
      if (Helpers.exists(maybeFolder) && Helpers.isFolder(maybeFolder)) {
        // add also the folder itself (chokidar does it automatically)
        this.allFilesAndFoldersInitial.push(maybeFolder);
      }

      let filesAndFolders = getFilesByPattern({
        followSymlinks: this.followSymlinks,
        globPath: possibleGlobPattern,
        ignorePatterns: this.ignore,
        searchStrategy: 'folders-and-files',
        taskName: `${this.name}`,
      });

      // mark folder paths
      for (let index = 0; index < filesAndFolders.length; index++) {
        const file = filesAndFolders[index];
        this.foldersPathes[file] = Helpers.isFolder(file);
      }

      this.allFilesAndFoldersInitial.push(...filesAndFolders);
    });

    if (options.fistTimeAdding) {
      // nothing to do
    } else {
      this.stopWatching().then(() => {
        this.startWatching().catch(this.handleErrors);
      });
    }
    //#endregion
  }
  //#endregion

  //#region on
  on(
    allowedEvent: IncrementalWatcherAllEvents,
    listenerFromOnFn: Listener,
  ): this {
    //#region @backendFunc
    this.listenerData.push({ listenerFromOnFn, allowedEvent });
    this.startWatching().catch(this.handleErrors);
    return this;
    //#endregion
  }
  //#endregion

  //#region private methods / handle errors
  private handleErrors(watchingStartErr): void {
    console.warn(watchingStartErr);
  }
  //#endregion

  //#region private methods / notify listeners
  private notifyListener(
    listener: Listener,
    eventAllowed: IncrementalWatcherAllEvents,
    eventFromWatcher: ParcelEvent,
  ): void {
    //#region @backendFunc
    if (eventFromWatcher.type === 'create') {
      if (
        fse.existsSync(eventFromWatcher.path) &&
        fse.lstatSync(eventFromWatcher.path).isDirectory()
      ) {
        this.foldersPathes[eventFromWatcher.path] = true;
        if (eventAllowed === 'all') {
          listener('addDir', eventFromWatcher.path);
        } else if (eventAllowed === 'addDir') {
          (listener as ListenerForSingleEvent)(eventFromWatcher.path);
        }
      } else {
        if (eventAllowed === 'all') {
          listener('add', eventFromWatcher.path);
        } else if (eventAllowed === 'add') {
          (listener as ListenerForSingleEvent)(eventFromWatcher.path);
        }
      }
    } else if (eventFromWatcher.type === 'delete') {
      if (this.foldersPathes[eventFromWatcher.path]) {
        this.foldersPathes[eventFromWatcher.path] = false;
        if (eventAllowed === 'all') {
          listener('unlinkDir', eventFromWatcher.path);
        } else if (eventAllowed === 'unlinkDir') {
          (listener as ListenerForSingleEvent)(eventFromWatcher.path);
        }
      } else {
        if (eventAllowed === 'all') {
          listener('unlink', eventFromWatcher.path);
        } else if (eventAllowed === 'unlink') {
          (listener as ListenerForSingleEvent)(eventFromWatcher.path);
        }
      }
    } else if (eventFromWatcher.type === 'update') {
      if (eventAllowed === 'all') {
        listener('change', eventFromWatcher.path);
      } else if (eventAllowed === 'change') {
        (listener as ListenerForSingleEvent)(eventFromWatcher.path);
      }
    }
    //#endregion
  }
  //#endregion

  //#region private methods / convert chokidar to parcel event
  private chokidarToParcel(
    event: string,
    filePath: string,
  ): ParcelEvent | null {
    switch (event) {
      case 'add':
      case 'addDir':
        return { path: filePath, type: 'create' };
      case 'change':
        return { path: filePath, type: 'update' };
      case 'unlink':
      case 'unlinkDir':
        return { path: filePath, type: 'delete' };
      default:
        return null;
    }
  }
  //#endregion

  //#region private methods / push initial
  private pushInitial(): void {
    //#region @backendFunc
    if (!this.alreadyStarted && !this.ignoreInitial) {
      for (const listenerData of this.listenerData) {
        const { listenerFromOnFn, allowedEvent } = listenerData;

        for (const absFilePath of this.allFilesAndFoldersInitial) {
          if (Helpers.isFolder(absFilePath)) {
            if (allowedEvent === 'addDir' || allowedEvent === 'all') {
              listenerFromOnFn('addDir', absFilePath);
            }
          } else {
            if (allowedEvent === 'add' || allowedEvent === 'all') {
              listenerFromOnFn('add', absFilePath);
            }
          }
        }
      }
    }

    if (!this.alreadyStarted) {
      this.alreadyStarted = true;
    }
    //#endregion
  }
  //#endregion
}
