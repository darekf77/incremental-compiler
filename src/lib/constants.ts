

 let COMPILER_POOLING = {};

 //#region @backend
if(process.platform === 'win32') {
 COMPILER_POOLING = {
   // TODO when not in admin mode vscode on windows -> problem with moving/deleting files inside vscode
  // usePolling: true,
  // interval: 1000,
  // binaryInterval: 2000,
 }
}
//#endregion

export {COMPILER_POOLING};


export const IGNORE_BY_DEFAULT = [
  '**/node_modules/**/*.*',
  '**/node_modules',
  '**/.git/**/*.*',
  '**/.git',
];
