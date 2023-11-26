//#region @backend
import { chokidar } from "tnp-core";
import { IncrementalWatcherInstance } from "./incremental-watcher-instance";
import { Stats } from "fs-extra";
import * as watcher from '@parcel/watcher';

export class ParcelWatcherAdapter implements Partial<IncrementalWatcherInstance> {
  constructor(
    public path: string | string[],
    public options: chokidar.WatchOptions) {

  }

  add(paths: string | readonly string[]): void {
    throw new Error('Method not implemented.');
    // let subscription = await watcher.subscribe(process.cwd(), (err, events) => {
    //   console.log(events);
    // });
  }
  unwatch(paths: string | readonly string[]): void {
    throw new Error('Method not implemented.');
  }

  // @ts-ignore
  on(event: 'add' | 'addDir' | 'change' | 'unlink' | 'unlinkDir' | 'error', listener: unknown): this {
    watcher.subscribe(process.cwd(), (err, events) => {
      console.log(events);
    });
  }
}
//#endregion
