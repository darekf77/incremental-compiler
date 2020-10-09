import { Morphi } from 'morphi'

declare const ENV: any;


async function start() {

}

export default start;


//#region @notForNpm
if (Morphi.IsBrowser) {
  start()
}
//#endregion
