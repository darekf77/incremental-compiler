// @ts-nocheck
/* */
/* */
/* */
/* */
/* */
/* */
/* */

//#region  incremental-compiler component
//#region @browser
@Component({ template: 'hello world fromr incremental-compiler' })
export class IncrementalCompilerComponent {}
//#endregion
//#endregion

//#region  incremental-compiler module
//#region @browser
@NgModule({
  declarations: [IncrementalCompilerComponent],
  imports: [CommonModule],
  exports: [IncrementalCompilerComponent],
})
export class IncrementalCompilerModule {}
//#endregion
//#endregion
