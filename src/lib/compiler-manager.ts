//#region imports
import { fg, fse } from 'tnp-core/src'; //  @backend
import { path, _, crossPlatformPath } from 'tnp-core/src';
import { Helpers } from 'tnp-core/src';
import { CoreModels } from 'tnp-core/src';

import { BaseClientCompiler } from './base-client-compiler';
import { IGNORE_BY_DEFAULT } from './constants';
import { getFilesByPattern } from './helpers';
import { incrementalWatcher } from './incremental-watcher';
import { ChangeOfFile } from './models';
import { IncrementalWatcherEvents, IncrementalWatcherInstance } from './models';
//#endregion

export class CompilerManager {
  //#region static
  //#region singleton
  private static _instance: CompilerManager;

  public static get Instance(): CompilerManager {
    if (!this._instance) {
      this._instance = new CompilerManager();
    }
    return this._instance;
  }
  //#endregion
  //#endregion

  //#region fields

  private clients: BaseClientCompiler<any>[] = [];

  private asyncEventScenario: (event: ChangeOfFile) => Promise<ChangeOfFile>;

  private filesContentCache = {};

  //#endregion

  //#region constructor
  private constructor() {}
  //#endregion

  //#region methods / sync init
  public async syncInit(
    client: BaseClientCompiler<any>,
    initialParams: any,
  ): Promise<void> {
    //#region @backendFunc
    let files = [];
    if (_.isArray(client.folderPath) && client.folderPath.length > 0) {
      files = client.folderPath
        .reduce((folderOrFileA, folderOrFileB) => {
          folderOrFileB = crossPlatformPath(folderOrFileB);
          let filesFromB: string[] = [folderOrFileB];
          if (
            fse.existsSync(folderOrFileB) &&
            fse.lstatSync(folderOrFileB).isDirectory()
          ) {
            // search all files
            filesFromB = getFilesByPattern({
              followSymlinks: client.followSymlinks,
              globPath: folderOrFileB,
              ignorePatterns: [
                ...IGNORE_BY_DEFAULT,
                ...(client.ignoreFolderPatter || []),
              ],
              searchStrategy: 'folders-and-files',
              taskName: client.taskName
            });
          }
          return folderOrFileA.concat(filesFromB);
        }, [])
        .filter(f => {
          if (client.subscribeOnlyFor.length > 0) {
            return client.subscribeOnlyFor.includes(
              path.extname(f).replace('.', '') as CoreModels.FileExtension,
            );
          }
          return true;
        });
    }
    // console.log(`Files for client.folderPath: ${client.folderPath}  client.followSymlinks: ${client.followSymlinks}`)

    for (let index = 0; index < files.length; index++) {
      const absFilePath = files[index] as string;
      const fileShouldBeCached = this.fileShouldBeChecked(absFilePath, client);
      if (fileShouldBeCached) {
        this.filesContentCache[absFilePath] = (
          Helpers.readFile(absFilePath) || ''
        ).trim();
      }
    }

    await client.syncAction(files, initialParams);
    //#endregion
  }
  //#endregion

  //#region methods / async init
  public async asyncInit(
    client: BaseClientCompiler<any>,
    initialParams: any,
  ): Promise<void> {
    //#region @backendFunc
    // Helpers.log(`this.clients: ${this.clients.map(c => c.key).join(',')} `)
    // Helpers.log(`this.firstFoldersToWatch: ${this.firstFoldersToWatch}`);

    const watchers = [] as IncrementalWatcherInstance[];

    const watcher = incrementalWatcher(client.getFilesFolderPatternsToWatch(), {
      name: `[incremental-compiler watcher for ${client.taskName}]`,
      ignoreInitial: true,
      followSymlinks: client.followSymlinks,
      ignored: client.ignoreFolderPatter,
      engine: client.engine,
    }).on('all', async (event, absoluteFilePath) => {
      // console.log(`[ic] event ${event}, path: ${absoluteFilePath}`);

      await this.actionForAsyncEvent(
        event,
        absoluteFilePath,
        client,
        initialParams,
      );
    });

    watchers.push(watcher);
    //#endregion
  }

  private async actionForAsyncEvent(
    event: IncrementalWatcherEvents,
    absoluteFilePath: string,
    client: BaseClientCompiler<any>,
    initialParams: any,
  ): Promise<void> {
    //#region @backendFunc
    absoluteFilePath = crossPlatformPath(absoluteFilePath);

    if (event === 'addDir') {
      return;
    }
    if (client.lastAsyncFiles.includes(absoluteFilePath)) {
      return;
    } else {
      client.lastAsyncFiles.push(absoluteFilePath);
    }
    // console.log(`[ic] final event ${event}, path: ${absoluteFilePath}`, 1);
    // console.log('this.clients', this.clients.map(c => c.key))

    if (event === 'unlink' && !client.notifyOnFileUnlink) {
      return;
    }
    // console.log('toNotify', toNotify.map(c => c.key))

    let proceedWithAsyncChange = true;

    const fileShouldBeCached = this.fileShouldBeChecked(
      absoluteFilePath,
      client,
    );
    // console.log(`fileShouldBeCached ${fileShouldBeCached}: ${absoluteFilePath}`)
    if (fileShouldBeCached && event === 'change') {
      var currentContent = (
        (await Helpers.tryReadFile(absoluteFilePath)) || ''
      ).trim();
      if (currentContent === this.filesContentCache[absoluteFilePath]) {
        // console.log('FILE THE SAME ' + absoluteFilePath)
        proceedWithAsyncChange = false;
      } else {
        this.filesContentCache[absoluteFilePath] = currentContent;
      }
    }

    if (proceedWithAsyncChange) {
      const change = {
        datetime: new Date(),
        fileAbsolutePath: absoluteFilePath,
        eventName: event,
      } as ChangeOfFile;

      if (this.asyncEventScenario) {
        await this.asyncEventScenario(change);
      }
      await client.asyncAction(change, initialParams);
    }
    client.lastAsyncFiles = client.lastAsyncFiles.filter(
      ef => ef !== absoluteFilePath,
    );

    //#endregion
  }
  //#endregion

  //#region methods / add client
  public addClient(client: BaseClientCompiler<any>): void {
    //#region @backendFunc
    // console.log(`Cilent added "${client.key}" folders`, client.folderPath)
    const existed = this.clients.find(c => c === client);
    if (existed) {
      Helpers.log(`Task "${client.taskName}" alread added`); // TODO @LAST
    }
    this.clients.push(client);
    //#endregion
  }
  //#endregion

  //#region private methods / file should be checked
  private fileShouldBeChecked(
    absFilePath: string,
    client: BaseClientCompiler<any>,
  ): boolean {
    //#region @backendFunc
    const fileShouldBeCached = !_.isUndefined(
      client.folderPathContentCheck.find(patterFolder => {
        return crossPlatformPath(absFilePath).startsWith(
          crossPlatformPath(patterFolder),
        );
      }),
    );

    return fileShouldBeCached;
    //#endregion
  }
  //#endregion
}
