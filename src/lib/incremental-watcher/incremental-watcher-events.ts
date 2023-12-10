export type IncrementalWatcherEvents = 'add' | 'addDir' | 'change' | 'unlink' | 'unlinkDir';
export type IncrementalWatcherAllEvents = 'all' | IncrementalWatcherEvents;
export type ListenerForAll =  (eventName: IncrementalWatcherEvents, path: string) => void;
export type ListenerForSingleEvent =  (path: string) => void;
export type Listener = ListenerForAll | ListenerForSingleEvent;
