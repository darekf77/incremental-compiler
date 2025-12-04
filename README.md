# INCREMENTAL COMPILER

A library for any kind of incremental compilers and file watchers, based on @parcel/watcher and chokidar.

## API

 1. Incremental Compiler class **"IncCompiler"**


```ts
import { BaseClientCompiler,  BaseClientCompilerOptions } from 'incremental-compiler/src';

export abstract class BaseCompilerForProject<
  ADDITIONAL_DATA = any,
  PROJECT extends BaseProject = BaseProject,
> extends BaseClientCompiler<ADDITIONAL_DATA> {
  
  constructor(
    public project: PROJECT,
    options: BaseClientCompilerOptions,
  ) {
    super();    
    this.initOptions(options);    
  }
}
```
2.  Incremental watcher object **"incrementalWatcher"**

```ts
import { incrementalWatcher } from 'incremental-compiler/src';
const watcher = await incrementalWatcher(
  [
    this.project.pathFor(`environments/**/*.ts`),
    this.project.pathFor(`env.ts`),
  ],
  {
    name: 'Environment Config Watcher',
    ignoreInitial: true,
    followSymlinks: false,
  },
);
watcher.on('all', async (event, filePath) => {
  onChange();
});
```

## Folders ALWAYS ignored

- node_modules/
- .git/
