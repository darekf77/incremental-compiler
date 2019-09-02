import * as path from 'path';
import * as _ from 'lodash';
import * as glob from 'glob';
import * as fse from 'fs-extra';
import { CLASS } from 'typescript-class-helpers';
import { clientsBy } from './helpers.backend';
import { BaseClientCompiler } from './base-client-compiler.backend';
import { Models } from './models.backend';
import { CompilerManager } from './incremental-compiler.backend';

export interface ChangeOfFileCloneOptios {
  onlyForClient?: BaseClientCompiler[];
}


export class ChangeOfFile {
  public executedFor: BaseClientCompiler[] = [];
  private readonly _clientsForChange: BaseClientCompiler[] = [];

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

  constructor(
    clientsForChange: BaseClientCompiler[] = [],
    public readonly fileAbsolutePath: string = void 0,
  ) {
    this._clientsForChange = clientsForChange;
    this.datetime = new Date();
  }

  public readonly datetime: Date;

  clientsBy<T = BaseClientCompiler>(clientNameOrClass: string | Function,
    condition?: (c: T) => boolean): T[] {
    return clientsBy(clientNameOrClass, condition, this.clientsForChange);
  }

}


