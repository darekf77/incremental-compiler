//#region imports
import {
  // chokidar,
  crossPlatformPath, fse, glob, _
} from "tnp-core";
import { Helpers, Utils } from 'tnp-core/src';
import { Log, Level } from 'ng2-logger/src';
import { IncrementalWatcherInstance } from "./incremental-watcher-instance";
import { IncrementalWatcherAllEvents, Listener, ListenerForSingleEvent } from './incremental-watcher-events';
import { path } from 'tnp-core/src';
// import * as watcher from '@parcel/watcher';
// const watcherName = '@parcel/watcher';

// import type { AsyncSubscription, Event } from '@parcel/watcher';
import * as fs from "fs";
import anymatch, { Matcher, Tester } from 'anymatch';
import { IOptions } from "glob";
import { IncrementalWatcherOptions } from "./incremental-watcher-options";

const log = Log.create('ParcelWatcherAdapter',
  Level.__NOTHING
)
//#endregion

export class ParcelWatcherAdapter
// implements Partial<IncrementalWatcherInstance>
{
  //#region fields
  static alreadAddedNames: string[] = [];
  public static instances: (ParcelWatcherAdapter)[] = [];

  public pathes: string[] = [];
  private listenerData: { listenerFromOnFn: Listener, allowedEvent: IncrementalWatcherAllEvents }[] = [];
  private subs: any[] = []; /// AsyncSubscription[] = [];
  private alreadyStarted: boolean = false;
  private allFilesInitial: string[] = [];
  private foldersPathes: { [folderAbsPath: string]: boolean; } = {};
  //#endregion

  //#region getters

  private get allOtherInstances() {
    return ParcelWatcherAdapter.instances.filter(f => f !== this);
  }
  //#endregion

  //#region constructor
  constructor(
    path: string | string[],
    public readonly options: IncrementalWatcherOptions) {
    // console.log({ options })
    // if (ParcelWatcherAdapter.alreadAddedNames.includes(options.name)) {
    //   console.error(`ALREADY ADDED ${options.name}`)
    // } else {
    //   ParcelWatcherAdapter.alreadAddedNames.push(options.name)
    // }
    ParcelWatcherAdapter.instances.push(this);
    this.add(path);
  }
  //#endregion

  //#region stop watching
  private async stopWatching() {
    console.log('STOP WATCHING')
    for (const sub of this.subs) {
      await sub.unsubscribe();
    }
  }
  //#endregion

  //#region push initial
  private pushInitial() {

    this.allFilesInitial = this.pathes.map(c => {
      return this.getFiles(c);
    }).reduce((a, b) => a.concat(b), []);

    if (!this.alreadyStarted && !this.options.ignoreInitial) {
      for (const listenerData of this.listenerData) {
        const { listenerFromOnFn, allowedEvent } = listenerData;
        for (const absFilePath of this.allFilesInitial) {
          if (Helpers.isFolder(absFilePath)) {
            if (allowedEvent === 'addDir' || allowedEvent === 'all') {
              listenerFromOnFn('addDir', absFilePath)
            }
          } else {
            if (allowedEvent === 'add' || allowedEvent === 'all') {
              listenerFromOnFn('add', absFilePath)
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

  //#region start watching
  public async startWatching() {
    // console.log('STARTING WATCHING - ' + this.options.name)

    this.pushInitial();

    const eventAction = (events: any[]) => {

      for (const listenerEvent of events) {

        listenerEvent.path = crossPlatformPath(listenerEvent.path);
        // console.log(`Event ${this.options.name}: ${listenerEvent.type} ${listenerEvent.path}`)
        for (const listenerData of this.listenerData) {
          const { listenerFromOnFn, allowedEvent } = listenerData;
          this.notifyListener(listenerFromOnFn, allowedEvent, listenerEvent);
        }
      }
    }

    for (const pathToCatalog of this.pathes) {
      const firstLevelLinks = Helpers.linksToFoldersFrom(pathToCatalog, false);
      const firstLevelFolders = Helpers.foldersFrom(pathToCatalog).filter(f => !firstLevelLinks.includes(f));
      const secondLevelLinks = firstLevelFolders.reduce((a, b) => {
        return a.concat(Helpers.linksToFoldersFrom(b, false))
      }, [])
      const linksToWatch = [
        ...firstLevelLinks,
        ...secondLevelLinks,
      ];
      const watcher = require(this.options.engine);
      for (const linkFolder of linksToWatch) {
        this.subs.push(await watcher.subscribe(linkFolder, (err, events) => {
          eventAction(events);
        }));
      }
      this.subs.push(await watcher.subscribe(pathToCatalog, (err, events) => {
        eventAction(events);
      }));
    }
  }
  //#endregion

  //#region notify listeners
  notifyListener(listener: Listener, eventAllowed: IncrementalWatcherAllEvents, eventFromWatcher: any) {
    if (eventFromWatcher.type === 'create') {
      if (fs.existsSync(eventFromWatcher.path) && fs.lstatSync(eventFromWatcher.path).isDirectory()) {
        this.foldersPathes[eventFromWatcher.path] = true;
        if (eventAllowed === 'all') {
          listener('addDir', eventFromWatcher.path)
        } else if (eventAllowed === 'addDir') {
          (listener as ListenerForSingleEvent)(eventFromWatcher.path)
        }
      } else {
        if (eventAllowed === 'all') {
          listener('add', eventFromWatcher.path)
        } else if (eventAllowed === 'add') {
          (listener as ListenerForSingleEvent)(eventFromWatcher.path)
        }
      }
    } else if (eventFromWatcher.type === 'delete') {
      if (this.foldersPathes[eventFromWatcher.path]) {
        this.foldersPathes[eventFromWatcher.path] = false;
        if (eventAllowed === 'all') {
          listener('unlinkDir', eventFromWatcher.path)
        } else if (eventAllowed === 'unlinkDir') {
          (listener as ListenerForSingleEvent)(eventFromWatcher.path)
        }
      } else {
        if (eventAllowed === 'all') {
          listener('unlink', eventFromWatcher.path)
        } else if (eventAllowed === 'unlink') {
          (listener as ListenerForSingleEvent)(eventFromWatcher.path)
        }
      }
    } else if (eventFromWatcher.type === 'update') {
      if (eventAllowed === 'all') {
        listener('change', eventFromWatcher.path)
      } else if (eventAllowed === 'change') {
        (listener as ListenerForSingleEvent)(eventFromWatcher.path)
      }
    }
  }
  //#endregion

  //#region add
  add(pathToAdd: string | readonly string[]): void {
    this.pathes = [
      ...this.pathes,
      ...(Array.isArray(pathToAdd) ? pathToAdd : [pathToAdd])
    ];
    this.pathes = Utils.uniqArray(
      this.pathes
        .map(a => {
          const replaced = crossPlatformPath(a)
            .replace(/\*\*\//g, '')
            .replace(/\/\*\*/g, '')
            .replace(/\*\.\*.*$/g, '')
            .replace(/\/$/, '')
            ;
          // if (replaced !== a) {
          //   console.log(`repalced: "${replaced}"`)
          // }
          a = replaced;
          return (path.extname(a) !== '') ? path.dirname(a) : a
        })
        .filter(f => !!f)
    );

    this.pathes.forEach(c => {
      this.getFiles(c);
    });


    this.stopWatching().then(() => {
      this.startWatching().catch(this.handleErrors);
    });

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
    console.warn(watchingStartErr)
  }
  //#endregion

  //#region get files
  private getFiles(globPath): string[] {
    const cwdIsOK = _.isString(this.options.cwd) && this.options.cwd.length >= 1
    // log.info(`1. glob search "${globPath}"`);
    const options: IOptions = {
      absolute: true,
      ignore: ['**/node_modules/**',
        // '**/tmp -*/**'
      ],
      // symlinks: this.options.followSymlinks,
      nodir: false,
    };
    if (cwdIsOK) {
      options.cwd = this.options.cwd;
    }

    let files = glob.sync(`${globPath}/**`, options).map(c => crossPlatformPath(c));
    // log.info(`2. files found by glob: ${files.length}`)

    if (this.options.ignored) {
      let toIgnore = _.cloneDeep(this.options.ignored);
      if (_.isFunction(this.options.ignored) || _.isString(this.options.ignored)) {
        toIgnore = [this.options.ignored];
      }
      files = files.filter(f => {
        return anymatch(this.options.ignored, f) && f !== globPath;
      });
    }
    // log.info(`3. filtered : ${files.length}`)

    for (let index = 0; index < files.length; index++) {
      const file = files[index];
      if (cwdIsOK) {
        this.foldersPathes[file] = Helpers.isFolder(crossPlatformPath([this.options.cwd, file]))
      } else {
        this.foldersPathes[file] = Helpers.isFolder(file)
      }
    }
    // log.info(`4. Checking done`)
    // console.log('files.length', files.length)
    return files;
  }
  //#endregion

}
