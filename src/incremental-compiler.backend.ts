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


export class CompilerManager {
  //#region singleton
  private static _instance: CompilerManager;
  public static get Instance() {
    if (!this._instance) {
      this._instance = new CompilerManager();
    }
    return this._instance;
  }
  //#endregion


  private watcher: chokidar.FSWatcher;
  private lastAsyncFiles = [];
  private currentObservedFolder = [];
  private clients: BaseClientCompiler[] = [];

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
  private asyncEventScenario: (event: ChangeOfFile) => Promise<ChangeOfFile>;
  private inited = false;

  public addClient(client: BaseClientCompiler) {
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

  public changeExecuted(cange: ChangeOfFile, target: Function) {

  }


  public async syncInit(client: BaseClientCompiler) {
    // log(`syncInit of ${CLASS.getNameFromObject(client)}`);
    await client.syncAction(this.syncActionResolvedFiles(client));
  }

  public async asyncInit(client: BaseClientCompiler) {
    // log(`asyncInit of ${CLASS.getNameFromObject(client)}`);
    if (!this.watcher) {
      this.watcher = chokidar.watch(this.allFoldersToWatch, {
        ignoreInitial: true,
        followSymlinks: true,
        ignorePermissionErrors: true,
      }).on('all', async (event, f) => {
        if (event !== 'addDir') {
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

  private preventAlreadyInited() {
    if (this.inited) {
      Helpers.error(`Please init Compiler Manager only once:
      CompilerManager.Instance.initScenario( ... async scenario ...  );
      `, false, true)
    }
  }

  private constructor() {

  }

  private get allFoldersToWatch() {
    const folders: string[] = [];
    this.clients.forEach(c => {
      if (_.isString(c.folderPath) && !folders.includes(c.folderPath)) {
        folders.push(c.folderPath);
      }
    });
    return folders;
  }


  private syncActionResolvedFiles(client: BaseClientCompiler) {
    if (client.folderPath) {
      return glob.sync(`${client.folderPath}/**/*.*`, {
        symlinks: false,
      }).filter(f => {
        if (client.subscribeOnlyFor.length > 0) {
          return client.subscribeOnlyFor.includes(path.extname(f).replace('.', '') as Models.FileExtension);
        }
        return true;
      })
    }
    return [];
  }

}

