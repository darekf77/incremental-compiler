//#region imports
import * as path from 'path';
import * as _ from 'lodash';
import * as glob from 'glob';
import * as fse from 'fs-extra';
import { CLASS } from 'typescript-class-helpers';
import { clientsBy } from './helpers.backend';
import { BaseClientCompiler } from './base-client-compiler.backend';
import { Models } from './models.backend';
import { CompilerManager } from './compiler-manager.backend';
//#endregion

export class ChangeOfFile {
  public executedFor: BaseClientCompiler[] = [];
  private readonly _clientsForChange: BaseClientCompiler[] = [];
  public readonly datetime: Date;

  constructor(
    clientsForChange: BaseClientCompiler[] = [],
    public readonly fileAbsolutePath: string = void 0,
    public readonly eventName: 'add' | 'change' | 'unlink' = void 0,
  ) {
    this._clientsForChange = clientsForChange;
    this.datetime = new Date();
  }

  public get clientsForChange() {
    return this._clientsForChange.filter(f => !this.executedFor.includes(f));
  }

  public get clientsForChangeFilterExt() {
    return this.clientsForChange.filter(f => {
      if (!_.isArray(f.subscribeOnlyFor) || f.subscribeOnlyFor.length === 0) {
        return true;
      }
      return f.subscribeOnlyFor.includes(this.fileExt);
    });
  }
  public get fileExt(): Models.FileExtension {
    return path.extname(this.fileAbsolutePath).replace('.', '') as Models.FileExtension;
  }

  clientsBy<T = BaseClientCompiler>(clientNameOrClass: string | Function,
    condition?: (c: T) => boolean): T[] {
    return clientsBy(clientNameOrClass, condition, this.clientsForChange);
  }

}
