//#region imports
import { CLI } from 'tnp-core/src';
import * as dateformat from 'dateformat';
import { BaseClientCompiler } from './base-client-compiler.backend';
import { fse, _ } from 'tnp-core/src';
import { CoreHelpers as Base } from 'tnp-core/src';
import { CLASS } from 'typescript-class-helpers/src';
//#endregion

export function mapForWatching(c: string): string[] {
  if (fse.existsSync(c) && fse.lstatSync(c).isDirectory()) {
    return [c, `${c}/**/*.*`];
  }
  return [c];
}

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
