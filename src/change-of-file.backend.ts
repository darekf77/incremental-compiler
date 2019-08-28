import * as chokidar from 'chokidar';
import * as path from 'path';
import * as _ from 'lodash';
import * as glob from 'glob';
import * as fse from 'fs-extra';
import { CLASS } from 'typescript-class-helpers';

import { BaseClientCompiler } from './base-client-compiler.backend';
import { FileExtension } from '../../../models';
export interface ChangeOfFileCloneOptios {
  onlyForClient?: BaseClientCompiler[];
}


export class ChangeOfFile {
  public executedFor: BaseClientCompiler[] = [];
  private _clientsForChange: BaseClientCompiler[] = [];
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
  public get fileExt(): FileExtension {
    return path.extname(this.fileAbsolutePath).replace('.', '') as FileExtension;
  }

  constructor(
    clientsForChange: BaseClientCompiler[] = [],
    public readonly fileAbsolutePath: string = void 0,
  ) {
    this._clientsForChange = clientsForChange;
    this.datetime = new Date();
  }

  public readonly datetime: Date;

  private clientBy<T = BaseClientCompiler>(ins: BaseClientCompiler): T {

    return this.clientsForChange.find(cinstance => {
      return CLASS.getNameFromObject(cinstance) === CLASS.getNameFromObject(ins);
    }) as any;
  }

  public clients<C>(clients): { [name in keyof C]: BaseClientCompiler } {
    // console.log('clients', clients)
    Object.keys(clients).forEach(key => {
      clients[key] = this.clientBy<C>(clients[key]);
    });
    return clients;
  }

  clone(options?: ChangeOfFileCloneOptios): ChangeOfFile {
    return void 0;
  }
}
