//#region imports
import { path, _, chokidar, glob, fse, crossPlatformPath } from 'tnp-core';
import { CLASS } from 'typescript-class-helpers';
import { clientsBy } from './helpers.backend';
import { Helpers } from 'tnp-core';
import { ChangeOfFile } from './change-of-file.backend';
import { BaseClientCompiler } from './base-client-compiler.backend';
import { ConfigModels } from 'tnp-config';
//#endregion

export class CompilerManager {
  //#region singleton
  private static _instance: CompilerManager;
  public static get Instance() {
    if (!this._instance) {
      this._instance = new CompilerManager();
    }
    return this._instance;
  }
  private constructor() { }
  //#endregion

  private watcher: chokidar.FSWatcher;
  private lastAsyncFiles = [];
  private currentObservedFolder = [];
  private clients: BaseClientCompiler[] = [];
  private asyncEventScenario: (event: ChangeOfFile) => Promise<ChangeOfFile>;
  private inited = false;

  public async syncInit(client: BaseClientCompiler) {
    // log(`syncInit of ${CLASS.getNameFromObject(client)}`);
    let files = [];
    if (_.isArray(client.folderPath) && client.folderPath.length > 0) {
      files = client.folderPath
        .reduce((folderOrFileA, folderOrFileB) => {
          let filesFromB: string[] = [folderOrFileB];
          if (fse.lstatSync(folderOrFileB).isDirectory()) {
            filesFromB = glob.sync(`${folderOrFileB}/**/*.*`, {
              symlinks: client.followSymlinks
            })
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
    await client.syncAction(files);
  }

  public async asyncInit(client: BaseClientCompiler) {
    // Helpers.log(`this.clients: ${this.clients.map(c => CLASS.getNameFromObject(c)).join(',')} `)
    // Helpers.log(`this.allFoldersToWatch: ${this.allFoldersToWatch}`);
    if (!this.watcher) {
      this.currentObservedFolder = _.cloneDeep(this.firstFoldersToWatch);
      // console.info('FILEESS ADDED TO WATCHER INITT', this.allFoldersToWatch)
      this.watcher = chokidar.watch(this.currentObservedFolder, {
        ignoreInitial: true,
        followSymlinks: client.followSymlinks,
        ignorePermissionErrors: true,
      }).on('all', async (event, f) => {
        f = crossPlatformPath(f);
        if (event !== 'addDir' && event !== 'unlinkDir') {
          if (this.lastAsyncFiles.includes(f)) {
            return;
          } else {
            this.lastAsyncFiles.push(f);
          }
          Helpers.log(`[ic] event ${event}, path: ${f}`);
          // console.log('this.clients', this.clients.map(c => CLASS.getNameFromObject(c)))
          let toNotify = this.clients
            .filter(c => {
              return c.folderPath.find(p => {
                if (f.startsWith(p)) {
                  if (c.watchDepth === Number.POSITIVE_INFINITY) {
                    return true;
                  }
                  const r = f.replace(p, '').replace(/^\//, '').split('/').length - 1;
                  return r <= c.watchDepth;
                }
                return false;
              });
            });
          if (event === 'unlink') {
            toNotify = toNotify.filter(f => f.notifyOnFileUnlink);
          }
          // console.log('toNotify', toNotify.map(c => CLASS.getNameFromObject(c)))
          const change = new ChangeOfFile(toNotify, f, event);
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
          this.lastAsyncFiles = this.lastAsyncFiles.filter(ef => ef !== f);
        }
      });
    } else {
      if (_.isString(client.folderPath)) {
        client.folderPath = [client.folderPath];
      }
      const newFoldersOrFiles = [];
      (client.folderPath as string[])
        .map(mapForWatching)
        .filter(f => {
          if (!this.currentObservedFolder.includes(f)) {
            // console.info('FILEESS ADDED TO WATCHER', f)
            this.watcher.add(f);
            newFoldersOrFiles.push(f);
          }
        });
      this.currentObservedFolder = this.currentObservedFolder.concat(newFoldersOrFiles);

    }
  }

  public get allClients() {
    const that = this;
    return {
      get<T = BaseClientCompiler>(clientNameOrClass: string | Function,
        condition: (c: T) => boolean) {
        if (_.isUndefined(clientNameOrClass) && _.isUndefined(condition)) {
          return that.clients;
        }
        return clientsBy(clientNameOrClass, condition, that.clients)
      }
    }
  }

  public addClient(client: BaseClientCompiler) {
    // console.log(`Cilent added "${CLASS.getNameFromObject(client)}" folders`, client.folderPath)
    const existed = this.clients.find(c => c === client);
    if (existed) {
      Helpers.warn(`Client "${CLASS.getNameFromObject(client)}" alread added`);
    }
    this.clients.push(client);
  }

  public async initScenario(
    onAsyncFileChange?: (event: ChangeOfFile) => Promise<any>) {
    this.preventAlreadyInited()
    this.asyncEventScenario = onAsyncFileChange;
    this.inited = true;
  }

  private preventAlreadyInited() {
    if (this.inited) {
      Helpers.error(`Please init Compiler Manager only once:
      CompilerManager.Instance.initScenario( ... async scenario ...  );
      `, false, true)
    }
  }

  private get firstFoldersToWatch() {
    const folders: string[] = [];
    this.clients.forEach(c => {
      // console.log("c.folderPath", c.folderPath)
      c.folderPath.forEach(fp => {
        // console.log(`fp`, fp)
        if (_.isString(fp) && !folders.includes(fp)) {
          folders.push(fp);
        }
      });
    });
    return folders.map(mapForWatching);
  }


}

function mapForWatching(c: string) {
  if (fse.lstatSync(c).isDirectory()) {
    return `${c}/**/*.*`;
  }
  return c;
}
