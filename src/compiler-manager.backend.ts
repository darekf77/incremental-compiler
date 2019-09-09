//#region imports
import * as chokidar from 'chokidar';
import * as path from 'path';
import * as _ from 'lodash';
import * as glob from 'glob';
import * as fse from 'fs-extra';
import { CLASS } from 'typescript-class-helpers';
import { Helpers, clientsBy } from './helpers.backend';
import { ChangeOfFile } from './change-of-file.backend';
import { BaseClientCompiler } from './base-client-compiler.backend';
import { Models } from './models.backend';
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
        .reduce((a, b) => {
          return a.concat(glob.sync(`${b}/**/*.*`, {
            symlinks: client.followSymlinks
          }));
        }, [])
        .filter(f => {
          if (client.subscribeOnlyFor.length > 0) {
            return client.subscribeOnlyFor
              .includes(path.extname(f).replace('.', '') as Models.FileExtension);
          }
          return true;
        })
    }
    await client.syncAction(files);
  }

  public async asyncInit(client: BaseClientCompiler) {
    // Helpers.log(`this.clients: ${this.clients.map(c => CLASS.getNameFromObject(c)).join(',')} `)
    // Helpers.log(`this.allFoldersToWatch: ${this.allFoldersToWatch}`);
    if (!this.watcher) {
      this.watcher = chokidar.watch(this.allFoldersToWatch, {
        ignoreInitial: true,
        followSymlinks: false,
        ignorePermissionErrors: true,
      }).on('all', async (event, f) => {
        if (event !== 'addDir' && event !== 'unlinkDir') {
          if (this.lastAsyncFiles.includes(f)) {
            return;
          } else {
            this.lastAsyncFiles.push(f);
          }
          // Helpers.log(`event ${event}, path: ${f}`);
          // console.log('this.clients', this.clients.map(c => CLASS.getNameFromObject(c)))
          const toNotify = this.clients
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
          // console.log('toNotify', toNotify.map(c => CLASS.getNameFromObject(c)))
          const change = new ChangeOfFile(toNotify, f);
          if (this.asyncEventScenario) {
            await this.asyncEventScenario(change);
          }
          for (let index = 0; index < change.clientsForChangeFilterExt.length; index++) {
            const clientOfAsyncAutomaticAction = change.clientsForChangeFilterExt[index];
            if (clientOfAsyncAutomaticAction.executeOutsideScenario) {
              await clientOfAsyncAutomaticAction.asyncAction(change);
            }
          }
          this.lastAsyncFiles = this.lastAsyncFiles.filter(ef => ef !== f);
        }
      });
    } else if (_.isString(client.folderPath) && !this.currentObservedFolder.includes(client.folderPath)) {
      this.watcher.add(client.folderPath);
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
    // console.log(`Cilent added ${CLASS.getNameFromObject(client)}`)
    const existed = this.clients.find(c => c === client);
    if (existed) {
      Helpers.error(`Client "${CLASS.getNameFromObject(client)}" alread added`, false, true);
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

  private get allFoldersToWatch() {
    const folders: string[] = [];
    this.clients.forEach(c => {
      // console.log(`c: ${c}`)
      c.folderPath.forEach(fp => {
        if (_.isString(fp) && !folders.includes(fp)) {
          folders.push(fp);
        }
      });
    });
    return folders.map(c => `${c}/**/*.*`);
  }


}

