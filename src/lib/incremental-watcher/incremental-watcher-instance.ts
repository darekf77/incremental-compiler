import {
  IncrementalWatcherAllEvents,
  ListenerForAll, ListenerForSingleEvent
} from "./incremental-watcher-events";


export interface IncrementalWatcherInstance {
  add(paths: string | ReadonlyArray<string>): void;
  on(event: 'all', listener: ListenerForAll): this;

  on(event: IncrementalWatcherAllEvents, listener: ListenerForSingleEvent): this;
}
