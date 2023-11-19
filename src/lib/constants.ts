export const COMPILER_POOLING = (process.platform === 'win32') ? {
  // TODO when not in admin mode vscode on windows -> problem with moving/deleting files inside vscode
  // usePolling: true,
  // interval: 1000,
  // binaryInterval: 2000,
} : {};
// console.log({
//   COMPILER_POOLING
// })
