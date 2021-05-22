//#region imports
import { CLI } from 'tnp-cli';
import * as dateformat from 'dateformat';
import { BaseClientCompiler } from './base-client-compiler.backend';
import { _ } from 'tnp-core';
import { Helpers as Base } from 'ng2-logger';
import { CLASS } from 'typescript-class-helpers';
//#endregion

export class HelpersIncCompiler extends Base {

  //#region singleton
  private static _instance: HelpersIncCompiler;
  public static get Instance() {
    if (!HelpersIncCompiler._instance) {
      HelpersIncCompiler._instance = new HelpersIncCompiler();
    }
    return HelpersIncCompiler._instance;
  }
  //#endregion
  public error(details: any, noExit = false, noTrace = false) {
    console.error(details)
    if (!noExit) {
      process.exit(0)
    }
  }

  public info(details: string) {
    console.info(details);
  }

  public log(details: string) {
    console.log(details);
  }

  public warn(details: string, trace = false) {
    console.warn(details);
  }


  public async  runSyncOrAsync(fn: Function, args?: any[]) {
    if (_.isUndefined(fn)) {
      return;
    }
    // let wasPromise = false;
    let promisOrValue = fn(args);
    if (promisOrValue instanceof Promise) {
      // wasPromise = true;
      promisOrValue = Promise.resolve(promisOrValue)
    }
    // console.log('was promis ', wasPromise)
    return promisOrValue;
  }

  public async compilationWrapper(fn: () => void, taskName: string = 'Task',
    executionType: 'Compilation of' | 'Code execution of' | 'Event:' = 'Compilation of') {
    function currentDate() {
      return `[${dateformat(new Date(), 'HH:MM:ss')}]`;
    }
    if (!fn || !_.isFunction(fn)) {
      Helpers.error(`${executionType} wrapper: "${fn}" is not a function.`)
      process.exit(1)
    }

    try {
      Helpers.log(`${currentDate()} ${executionType} "${taskName}" Started..`)
      await Helpers.runSyncOrAsync(fn)
      Helpers.log(`${currentDate()} ${executionType} "${taskName}" Done\u2713`)
    } catch (error) {
      Helpers.log(CLI.chalk.red(error));
      Helpers.log(`${currentDate()} ${executionType} ${taskName} ERROR`);
      process.exit(1);
    }
  }

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

export const Helpers = HelpersIncCompiler.Instance;
