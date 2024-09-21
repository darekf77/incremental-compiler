//#region imports
import { path, _ } from 'tnp-core/src';
import { CoreModels } from 'tnp-core/src';
//#endregion

export class ChangeOfFile {
  public readonly datetime: Date;

  constructor(
    public fileAbsolutePath: string = void 0,
    public readonly eventName:
      | 'add'
      | 'change'
      | 'unlink'
      | 'unlinkDir' = void 0,
  ) {
    this.datetime = new Date();
  }

  public get fileExt(): CoreModels.FileExtension {
    return path
      .extname(this.fileAbsolutePath)
      .replace('.', '') as CoreModels.FileExtension;
  }
}
