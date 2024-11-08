# INCREMENTAL COMPILER

A library for any kind of incremental compilers and file watchers, based on the excellent Chokidar.

## Example Use Case

You want to call a specific function for each file in your "src" folder within your project.
After calling this function for each file, you set up watchers on those files. For each change in a file in "src," the function is called again for that particular file.

