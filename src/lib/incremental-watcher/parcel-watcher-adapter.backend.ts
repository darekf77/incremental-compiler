//#region imports
import type { AsyncSubscription, Event } from '@parcel/watcher';
import anymatch, { Matcher, Tester } from 'anymatch';
import type { IOptions } from 'glob';
import { chokidar } from 'tnp-core/src';
import { crossPlatformPath, fse, glob, _ } from 'tnp-core/src';
import { Helpers, Utils } from 'tnp-core/src';
import { path } from 'tnp-core/src';

import { IGNORE_BY_DEFAULT } from '../constants';

import { incrementalWatcher } from './incremental-watcher';
import {
  IncrementalWatcherAllEvents,
  Listener,
  ListenerForSingleEvent,
  ParcelEventType,
  ParcelEvent,
} from './incremental-watcher-events';
import { IncrementalWatcherOptions } from './incremental-watcher-options';
//#endregion

const toDebugTaksName = [
  // 'incremental-compiler watcher for task "task "MigrationHelper""',
];

export class ParcelWatcherAdapter {
  // implements Partial<IncrementalWatcherInstance>
  //#region fields
  // static alreadAddedNames: string[] = [];
  public static instances: ParcelWatcherAdapter[] = [];
  public pathes: string[] = [];
  private listenerData: {
    listenerFromOnFn: Listener;
    allowedEvent: IncrementalWatcherAllEvents;
  }[] = [];
  private subs: AsyncSubscription[] = [];
  private alreadyStarted: boolean = false;
  private allFilesInitial: string[] = [];
  private foldersPathes: { [folderAbsPath: string]: boolean } = {};
  //#endregion

  //#region getters

  private get allOtherInstances() {
    return ParcelWatcherAdapter.instances.filter(f => f !== this);
  }
  //#endregion

  //#region constructor
  constructor(
    path: string | string[],
    public readonly options: IncrementalWatcherOptions,
  ) {
    //#region TODO not neede ?
    // console.log({ options })
    // if (ParcelWatcherAdapter.alreadAddedNames.includes(options.name)) {
    //   console.error(`ALREADY ADDED ${options.name}`)
    // } else {
    //   ParcelWatcherAdapter.alreadAddedNames.push(options.name)
    // }
    //#endregion
    ParcelWatcherAdapter.instances.push(this);
    this.add(path);
  }
  //#endregion

  //#region is debugging
  get isDebugging(): boolean {
    return toDebugTaksName.includes(this.options.name);
  }
  //#endregion

  //#region stop watching
  private async stopWatching() {
    // Helpers.logInfo('[incremental compiler] Stop all watcher + ' + this.options.name)
    for (const sub of this.subs) {
      await sub.unsubscribe();
    }
  }
  //#endregion

  //#region push initial
  private pushInitial() {
    this.allFilesInitial = this.pathes
      .map(c => {
        return this.getFiles(c);
      })
      .reduce((a, b) => a.concat(b), []);

    if (!this.alreadyStarted && !this.options.ignoreInitial) {
      for (const listenerData of this.listenerData) {
        const { listenerFromOnFn, allowedEvent } = listenerData;
        for (const absFilePath of this.allFilesInitial) {
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
  }
  //#endregion

  //#region convert chokidar to parcel event
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

  //#region start watching
  public async startWatching() {
    // console.log('STARTING WATCHING - ' + this.options.name)

    this.pushInitial();

    const eventAction = (events: Event[]) => {
      // this.isDebugging && console.log(`events before: ${events.length}`);
      // events = events.filter(f => {
      //   return anymatch(this.options.ignored, f.path);
      // });
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

    for (const pathToCatalog of this.pathes) {
      let isFile = false;
      if (Helpers.isSymlinkFileExitedOrUnexisted(pathToCatalog)) {
        const pathToCatalogFolder = crossPlatformPath(
          fse.realpathSync(pathToCatalog),
        );
        if (!Helpers.isFolder(pathToCatalogFolder)) {
          Helpers.warn(
            `[incremental-compiler] link not to folder ${pathToCatalogFolder}`,
          );
          isFile = true;
        }
      }
      if (!Helpers.isFolder(pathToCatalog)) {
        Helpers.warn(`[incremental-compiler] not a folder ${pathToCatalog}`);
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

        const watcher = require(this.options.engine);
        for (const linkFolder of linksToWatch) {
          this.subs.push(
            await watcher.subscribe(linkFolder, (err, events) => {
              eventAction(events);
            }),
          );
        }
        this.subs.push(
          await watcher.subscribe(pathToCatalog, (err, events) => {
            eventAction(events);
          }),
        );
      }
    }
  }
  //#endregion

  //#region notify listeners
  notifyListener(
    listener: Listener,
    eventAllowed: IncrementalWatcherAllEvents,
    eventFromWatcher: ParcelEvent,
  ) {
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
  }
  //#endregion

  //#region add
  add(pathToAdd: string | readonly string[]): void {
    this.pathes = [
      ...this.pathes,
      ...(Array.isArray(pathToAdd) ? pathToAdd : [pathToAdd]),
    ];
    this.pathes = Utils.uniqArray(
      this.pathes
        .map(a => {
          a = this.stripGlobToDir(crossPlatformPath(a));
          // this.isDebugging && console.log(`TO WATCH ${a}`);
          return a;
        })
        .filter(f => !!f),
    );

    // console.log(`DEBUG ${isDebuggin} for [${this.options.name}]...`);

    this.pathes.forEach(c => {
      this.getFiles(c);
    });

    // if (this.isDebugging) {
    //   console.log(`Watching folders:`, this.pathes);
    //   console.log(`Ignoring:`, this.options.ignored);
    // }

    this.stopWatching().then(() => {
      this.startWatching().catch(this.handleErrors);
    });
  }
  //#endregion

  //#region strip glob to dir
  private stripGlobToDir(globPath: string): string {
    // Find the first glob metacharacter
    const globChars = ['*', '?', '[', ']', '{', '}'];
    const firstGlobIndex = globChars
      .map(ch => globPath.indexOf(ch))
      .filter(i => i >= 0)
      .sort((a, b) => a - b)[0];

    if (firstGlobIndex === undefined) {
      // no glob characters at all, return dirname if it's a file
      return globPath;
    }

    // Cut before the first glob character
    const base = globPath.slice(0, firstGlobIndex);

    // Ensure we end on a directory (strip partial segments)
    return path.resolve(base).replace(/[/\\]*$/, '');
  }
  //#endregion

  //#region on
  on(allowedEvent: IncrementalWatcherAllEvents, listenerFromOnFn: Listener) {
    this.listenerData.push({ listenerFromOnFn, allowedEvent });
    this.startWatching().catch(this.handleErrors);
  }
  //#endregion

  //#region handle errors
  handleErrors(watchingStartErr) {
    console.warn(watchingStartErr);
  }
  //#endregion

  //#region get files
  private getFiles(globPath): string[] {
    const cwdIsOK =
      _.isString(this.options.cwd) && this.options.cwd.length >= 1;
    // log.info(`1. glob search "${globPath}"`);
    const options: IOptions = {
      absolute: true,
      ignore: [
        ...IGNORE_BY_DEFAULT,
        // '**/tmp -*/**'
      ],
      // symlinks: this.options.followSymlinks,
      nodir: false,
    };
    if (cwdIsOK) {
      options.cwd = this.options.cwd;
    }

    let files = glob
      .sync(`${globPath}/**`, options)
      .map(c => crossPlatformPath(c));
    // log.info(`2. files found by glob: ${files.length}`)

    if (this.options.ignored) {
      files = files.filter(f => {
        return anymatch(this.options.ignored, f) && f !== globPath;
      });
    }
    // log.info(`3. filtered : ${files.length}`)

    for (let index = 0; index < files.length; index++) {
      const file = files[index];
      if (cwdIsOK) {
        this.foldersPathes[file] = Helpers.isFolder(
          crossPlatformPath([this.options.cwd, file]),
        );
      } else {
        this.foldersPathes[file] = Helpers.isFolder(file);
      }
    }
    // log.info(`4. Checking done`)
    // console.log('files.length', files.length)
    return files;
  }
  //#endregion
}
