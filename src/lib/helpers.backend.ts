//#region imports
import { CLI } from 'tnp-cli';
import * as dateformat from 'dateformat';
import { BaseClientCompiler } from './base-client-compiler.backend';
import { _ } from 'tnp-core';
import { CoreHelpers as Base } from 'tnp-core';
import { CLASS } from 'typescript-class-helpers';
//#endregion


export function clientsBy<T = BaseClientCompiler>(clientNameOrClass: string | Function,
  condition: (c: T) => boolean, clients: BaseClientCompiler[]): T[] {
  if (_.isFunction(clientNameOrClass)) {
    clientNameOrClass = CLASS.getName(clientNameOrClass)
  }

  return clients.filter(cinstance => {
    const classesOk = (CLASS.getNameFromObject(cinstance) === clientNameOrClass);
    if (classesOk) {
      if (_.isFunction(condition)) {
        return !!condition(cinstance as any);
      } else {
        return true;
      }
    }
    return false;
  }) as any;
}
