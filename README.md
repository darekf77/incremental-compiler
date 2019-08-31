# INCREMENTAL COMPILER

- lib for any kind incremental compilers, files watchers.. 
- based on excellent https://github.com/paulmillr/chokidar

## Example use case

- You want to call some function for each file in you folder "src" in you project.
- After you call this function for each file... you are watching this files and 
for each file change in "src", you are calling again function for this particular file


### If you have many "files watchers" with "increamntal-compiler" you can create scenario ( IncCompiler.init(...)  ) and prevent any kind of "race coditions"
