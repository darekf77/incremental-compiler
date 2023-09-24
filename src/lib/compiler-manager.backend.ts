//#region imports
import { path, _, chokidar, glob, fse, crossPlatformPath } from 'tnp-core';
import { CLASS } from 'typescript-class-helpers';
import { clientsBy, mapForWatching } from './helpers.backend';
import { Helpers } from 'tnp-core';
import { ChangeOfFile } from './change-of-file.backend';
import { BaseClientCompiler } from './base-client-compiler.backend';
import { ConfigModels } from 'tnp-config';
//#region for debugging purpose...
// require('colors');
// const Diff = require('diff');
//#endregion
//#endregion

export class CompilerManager {
  //#region static
  //#region singleton
  private static _instance: CompilerManager;
  public static get Instance() {
    if (!this._instance) {
      this._instance = new CompilerManager();
    }
    return this._instance;
  }
  //#endregion
  //#endregion

  //#region fields & getters
  private watchers = {} as { [watcherName: string]: chokidar.FSWatcher; };

  private currentObservedFolder = {} as { [watcherName: string]: string[] };
  private clients: BaseClientCompiler[] = [];
  private asyncEventScenario: (event: ChangeOfFile) => Promise<ChangeOfFile>;
  private inited = false;
  private filesContentCache = {};

  public get allClients() {
    const that = this;
    return {
      get<T = BaseClientCompiler>(clientNameOrClass: string | Function, condition: (c: T) => boolean) {

        if (_.isUndefined(clientNameOrClass) && _.isUndefined(condition)) {
          return that.clients;
        }
        return clientsBy(clientNameOrClass, condition, that.clients)
      }
    }
  }
  //#endregion

  //#region constructor
  private constructor() { }
  //#endregion

  //#region methods

  //#region methods / sync init
  public async syncInit(client: BaseClientCompiler) {
    // log(`syncInit of ${CLASS.getNameFromObject(client)}`);
    let files = [];
    if (_.isArray(client.folderPath) && client.folderPath.length > 0) {
      files = client.folderPath
        .reduce((folderOrFileA, folderOrFileB) => {
          folderOrFileB = crossPlatformPath(folderOrFileB);
          let filesFromB: string[] = [folderOrFileB];
          if (fse.existsSync(folderOrFileB) && fse.lstatSync(folderOrFileB).isDirectory()) {
            const globPath = `${folderOrFileB}/**/!(node_modules)*.*`;
            const globIgnore = `${folderOrFileB}/node_modules/**/*.*`;
            filesFromB = glob.sync(globPath, {
              symlinks: client.followSymlinks,
              ignore: [globIgnore]
            })
            // console.log({
            //   globPath,
            //   globIgnore,
            //   GENERATEDFILES: filesFromB.length
            // })
          }
          return folderOrFileA.concat(filesFromB);
        }, [])
        .filter(f => {
          if (client.subscribeOnlyFor.length > 0) {
            return client.subscribeOnlyFor
              .includes(path.extname(f).replace('.', '') as ConfigModels.FileExtension);
          }
          return true;
        })
    }
    // console.log(`Files for client.folderPath: ${client.folderPath}  client.followSymlinks: ${client.followSymlinks}`)

    for (let index = 0; index < files.length; index++) {
      const absFilePath = files[index] as string;
      const fileShouldBeCached = this.fileShouldBeChecked(absFilePath, client);
      if (fileShouldBeCached) {
        this.filesContentCache[absFilePath] = (Helpers.readFile(absFilePath) || '').trim();
      }
    }

    await client.syncAction(files);
  }
  //#endregion

  //#region methods / async init
  public async asyncInit(client: BaseClientCompiler) {
    // Helpers.log(`this.clients: ${this.clients.map(c => CLASS.getNameFromObject(c)).join(',')} `)
    // Helpers.log(`this.firstFoldersToWatch: ${this.firstFoldersToWatch}`);
    if (!this.watchers[client.key]) {
      this.currentObservedFolder[client.key] = client.filesToWatch();
      // console.info('FILEESS ADDED TO WATCHER INITT', this.currentObservedFolder)
      this.watchers[client.key] = chokidar.watch(this.currentObservedFolder[client.key], {
        ignoreInitial: true,
        followSymlinks: client.followSymlinks,
        ignorePermissionErrors: true,
      }).on('all', async (event, absoluteFilePath) => {
        // console.log(`[ic] event ${event}, path: ${absoluteFilePath}`);
        await this.actionForAsyncEvent(event, absoluteFilePath, client);
      });
    } else {
      if (_.isString(client.folderPath)) {
        client.folderPath = [client.folderPath];
      }
      const newFoldersOrFiles = [];
      (client.folderPath as string[])
        .map(mapForWatching)
        .reduce((a, b) => {
          return a.concat(b);
        }, [])
        .filter(f => {
          if (!this.currentObservedFolder[client.key].includes(f)) {
            // console.info('FILEESS ADDED TO WATCHER', f)
            this.watchers[client.key].add(f);
            newFoldersOrFiles.push(f);
          }
        });
      this.currentObservedFolder[client.key] = this.currentObservedFolder[client.key].concat(newFoldersOrFiles);

    }
  }

  private async actionForAsyncEvent(
    event: 'add' | 'addDir' | 'change' | 'unlink' | 'unlinkDir',
    absoluteFilePath: string,
    client: BaseClientCompiler,
  ) {

    absoluteFilePath = crossPlatformPath(absoluteFilePath);

    if (
      (event !== 'addDir')
      && !["node_modules", ...client.ignoreFolderPatter].some(s => absoluteFilePath.includes(s))
      && (
        (!client.watchOptions.allowedExtEnable ? true : client.watchOptions.allowedExt.includes(path.extname(absoluteFilePath)))
        ||
        (client.watchOptions.addionalAllowedEnable && client.watchOptions.addionalAllowed.includes(path.basename(absoluteFilePath)))
      )
    ) {

      if (client.lastAsyncFiles.includes(absoluteFilePath)) {
        return;
      } else {
        client.lastAsyncFiles.push(absoluteFilePath);
      }
      Helpers.log(`[ic] event ${event}, path: ${absoluteFilePath}`, 1);
      // console.log('this.clients', this.clients.map(c => CLASS.getNameFromObject(c)))
      let toNotify = [client]
        .filter(c => {
          return c.folderPath
            .map(p => crossPlatformPath(p))
            .find(p => {
              // console.log('folderPath p:', p)
              if (absoluteFilePath.startsWith(p)) {
                if (c.watchDepth === Number.POSITIVE_INFINITY) {
                  return true;
                }
                const r = absoluteFilePath.replace(p, '').replace(/^\//, '').split('/').length - 1;
                // @ts-ignore
                return r <= c.watchDepth;
              }
              return false;
            });
        });
      if (event === 'unlink') {
        toNotify = toNotify.filter(f => f.notifyOnFileUnlink);
      }
      // console.log('toNotify', toNotify.map(c => CLASS.getNameFromObject(c)))

      let proceeedWithAsyncChange = true;

      const fileShouldBeCached = this.fileShouldBeChecked(absoluteFilePath, client);
      // console.log(`fileShouldBeCached ${fileShouldBeCached}: ${absoluteFilePath}`)
      if (fileShouldBeCached && event === 'change') {
        var currentContent = (Helpers.readFile(absoluteFilePath) || '').trim();
        if (currentContent === this.filesContentCache[absoluteFilePath]) {
          // console.log('FILE THE SAME ' + absoluteFilePath)
          proceeedWithAsyncChange = false;
        } else {
          //#region for debugging purpose
          // const diff = Diff.diffChars(currentContent, this.filesContentCache[absoluteFilePath]);
          // console.log('FILE NOT THE SAME' + absoluteFilePath);
          // console.log('FILE DIFF', diff.map((part) => {
          //   // green for additions, red for deletions
          //   // grey for common parts
          //   const color = part.added ? 'green' :
          //     part.removed ? 'red' : 'grey';
          //   return part.value[color];
          // }).join(''))
          //#endregion
          this.filesContentCache[absoluteFilePath] = currentContent;
        }
      }
      // console.log({
      //   proceeedWithAsyncChange
      // })

      if (proceeedWithAsyncChange) {

        const change = new ChangeOfFile(toNotify, absoluteFilePath, event);
        if (this.asyncEventScenario) {
          await this.asyncEventScenario(change);
        }
        const clients = change.clientsForChangeFilterExt;
        for (let index = 0; index < clients.length; index++) {
          const clientAsyncAction = clients[index];
          // console.log(`execute for "${CLASS.getNameFromObject(clientAsyncAction)}", outside ? ${clientAsyncAction.executeOutsideScenario}`)
          if (clientAsyncAction.executeOutsideScenario) {
            await clientAsyncAction.asyncAction(change);
          }
        }
      }
      client.lastAsyncFiles = client.lastAsyncFiles.filter(ef => ef !== absoluteFilePath);

    }


    // console.log('this.clients', this.clients.map(c => CLASS.getNameFromObject(c)))

  }

  //#endregion

  //#region methods / add client
  public addClient(client: BaseClientCompiler) {
    // console.log(`Cilent added "${CLASS.getNameFromObject(client)}" folders`, client.folderPath)
    const existed = this.clients.find(c => c === client);
    if (existed) {
      Helpers.log(`Client "${CLASS.getNameFromObject(client)}" alread added`); // TODO @LAST
    }
    this.clients.push(client);
  }
  //#endregion

  //#region methods / init scenario
  /**
   * @deprecated
   */
  public async initScenario(
    onAsyncFileChange?: (event: ChangeOfFile) => Promise<any>) {
    this.preventAlreadyInited()
    this.asyncEventScenario = onAsyncFileChange;
    this.inited = true;
  }
  //#endregion

  //#endregion

  //#region private methods

  //#region private methods / prevent already inited
  private preventAlreadyInited() {
    if (this.inited) {
      Helpers.error(`Please init Compiler Manager only once:
      CompilerManager.Instance.initScenario( ... async scenario ...  );
      `, false, true)
    }
  }
  //#endregion

  //#region private methods / file should be checked
  private fileShouldBeChecked(absFilePath: string, client: BaseClientCompiler) {

    const fileShouldBeCached = !_.isUndefined(client.folderPathContentCheck.find((patterFolder) => {
      return crossPlatformPath(absFilePath).startsWith(crossPlatformPath(patterFolder));
    }));

    return fileShouldBeCached;
  }
  //#endregion

  //#endregion

}

//#region helpers

//#endregion
