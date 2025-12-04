import anymatch from 'anymatch';
import {
  crossPlatformPath,
  fg,
  fse,
  Helpers,
  path,
  Utils,
  UtilsStringRegex,
} from 'tnp-core/src';

/**
 * @returns Absolute paths of files/folders matching the given pattern
 */
export const getFilesByPattern = ({
  globPath,
  ignorePatterns = [],
  followSymlinks = true,
  searchStrategy = 'folders-and-files',
  taskName,
}: {
  globPath: string;
  ignorePatterns: string[];
  followSymlinks: boolean;
  searchStrategy: 'files-only' | 'folders-and-files' | 'folders-only';
  taskName?: string;
}): string[] => {
  //#region @backendFunc

  globPath = stripGlobToDir(globPath);

  if (Helpers.exists(globPath) && !Helpers.isFolder(globPath)) {
    return [globPath];
  }

  ignorePatterns = ignorePatterns || [];

  //#region OLD_APPROACH commented out
  // for (let index = 0; index < ignorePatterns.length; index++) {
  //   ignorePatterns[index] = ignorePatterns[index]
  //     .replace(globPath + '/', '**/')
  //     .replace('**/**/', '**/');
  // }

  // const localIgnorePatterns = ignorePatterns.reduce((a, b) => {
  //   const f1 = b.replace(/^\*\*\//, '');
  //   const f2 = f1.replace(/\/\*\*$/, '');
  //   return Utils.uniqArray([...a, f1, f2]);
  // }, []);

  // const firstlevelFolders = fse
  //   .readdirSync(globPath)
  //   .map(f => `${globPath}/${f}`)
  //   .filter(f => fse.lstatSync(f).isDirectory())
  //   .filter(f => {
  //     const exclude = anymatch(localIgnorePatterns, path.basename(f));
  //     return !exclude;
  //   })
  //   .map(f => path.basename(f));

  // const fullPattern = `${globPath}/{${firstlevelFolders.join(',')}}/**/*`;
  // ignorePatterns = localIgnorePatterns;

  // console.log({
  //   firstlevelFolers: firstlevelFolders,
  //   localIgnorePatterns,
  //   fullPattern,
  //   globPath,
  //   followSymlinks,
  //   ignorePatterns,
  //   searchStrategy,
  //   taskName,
  // });
  //#endregion

  const fullPattern = `${globPath}/**/*`;

  const entries = fg.sync(fullPattern, {
    absolute: true,
    dot: true,
    followSymbolicLinks: followSymlinks,
    ignore: ignorePatterns,
    onlyFiles: false,
    stats: true,
  });

  Helpers.logInfo(
    `[incremental-compiler] Found ${entries.length} entries for pattern:\n${fullPattern}`,
  );
  Helpers.logInfo(`[incremental-compiler] Task name:\n${taskName}`);
  // Helpers.logInfo(
  //   `Ignored patterns:\n\n${ignorePatterns.map(c => `'${c}',`).join('\n')}`,
  // );

  return entries
    .filter(entry => {
      if (UtilsStringRegex.containsNonAscii(entry.path)) {
        Helpers.logWarn(
          `[incremental-compiler] Skipping path with non-ascii characters:\n${entry.path}`,
        );
        return false;
      }

      const stats = entry.stats!;
      const isDir = stats.isDirectory();

      if (searchStrategy === 'files-only') return !isDir;
      if (searchStrategy === 'folders-only') return isDir;
      return true; // folders-and-files
    })
    .map(entry => crossPlatformPath(entry.path));
  //#endregion
};

export const mapForWatching = (c: string): string[] => {
  //#region @backendFunc
  if (fse.existsSync(c) && fse.lstatSync(c).isDirectory()) {
    return [c, `${c}/**/*.*`];
  }
  return [c];
  //#endregion
};

export const stripGlobToDir = (globPath: string): string => {
  //#region @backendFunc
  // Find the first glob metacharacter
  const globChars = ['*', '?', '[', ']', '{', '}'];
  const firstGlobIndex = globChars
    .map(ch => globPath.indexOf(ch))
    .filter(i => i >= 0)
    .sort((a, b) => a - b)[0];

  if (firstGlobIndex === undefined) {
    // no glob characters at all, return dirname if it's a file
    return crossPlatformPath(globPath);
  }

  // Cut before the first glob character
  const base = globPath.slice(0, firstGlobIndex);

  // Ensure we end on a directory (strip partial segments)
  return crossPlatformPath(path.resolve(base).replace(/[/\\]*$/, ''));
  //#endregion
};
