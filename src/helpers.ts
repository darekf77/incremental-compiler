//#region @backend
import chalk from 'chalk';
import * as dateformat from "dateformat";
//#endregion
import * as _ from 'lodash';
import { Helpers as Base } from 'ng2-logger';

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
    //#region @backend
    if (!noExit) {
      process.exit(0)
    }
    //#endregion
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

  //#region @backend
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
  //#endregion


  //#region @backend
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
      Helpers.log(`${currentDate()} ${executionType} "${chalk.bold(taskName)}" Started..`)
      await Helpers.runSyncOrAsync(fn)
      Helpers.log(`${currentDate()} ${executionType} "${chalk.bold(taskName)}" Done\u2713`)
    } catch (error) {
      Helpers.log(chalk.red(error));
      Helpers.log(`${currentDate()} ${executionType} ${taskName} ERROR`);
      process.exit(1);
    }
  }
  //#endregion


}

export const Helpers = HelpersIncCompiler.Instance;
