
import { CLASS } from 'typescript-class-helpers';
import * as _ from 'lodash';
import { ChangeOfFile } from './change-of-file.backend';
import { Helpers } from './helpers';

export function AsyncAction(options?: any[]) {
  return (
    target: object,
    propertyKey: string,
    propertyDescriptor: PropertyDescriptor
  ) => {
    // get original method
    // unsub(void 0, void 0);
    const originalMethod = propertyDescriptor.value;
    // redefine descriptor value within own function block
    propertyDescriptor.value = function (...args: any[]) {
      // log arguments before original function
      // console.log(`${propertyKey} method called with args:     ${JSON.stringify(args, null, 2)}`);
      const first = _.first(args);
      if (first instanceof ChangeOfFile) {
        const ex = first.clientsForChange.find(f => {
          // console.log(`${CLASS.getNameFromObject(f)} === ${CLASS.getNameFromObject(this)}`)
          return CLASS.getNameFromObject(f) === CLASS.getNameFromObject(this)
        });
        // console.log('ex', ex)
        if (ex) {
          first.executedFor.push(ex);
          // console.log(`HHHH!!!!! Async Method called fror ${CLASS.getNameFromObject(this)}`);
        }
      }
      // attach original method implementation
      const result = originalMethod.apply(this, args);
      // log result of method
      // console.log(`${propertyKey} method return value:  ${JSON.stringify(result)}`);
      return result;
    }
  }
}

export interface IncCompilerClassOptions {
  className: string;
}

const instancesNames = [];
export function IncCompilerClass(options: IncCompilerClassOptions) {
  return (target) => {
    const { className } = options;
    if (instancesNames.includes(className)) {
      Helpers.error(`Compiler class "${className}" already has instance.`, false, true);
    }
    instancesNames.push(className);
    CLASS.NAME(className, { singleton: 'autoinstance' })(target);
  };
}
