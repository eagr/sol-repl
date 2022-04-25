# sol-repl

a REPL to provide instant feedback for Solidity snippets

## Features

* language
  * [x] constant
  * [ ] contract
  * [x] enum
  * [x] function
  * [ ] import
  * [ ] interface
  * [ ] library
  * [ ] struct
  * [ ] type
* REPL
  * [x] Node-like REPL interactions
  * [x] cursor/delete shortcuts
  * [x] history traversing
  * [x] history filtering
  * [x] `.session` print formatted Solidity source
  * [ ] `.editor` editor mode

## Install

```sh
npm i -g sol-repl
```

## Usage

```sh
$ sol
Welcome to Solidity v0.8.13!
Type ".help" for more information.
> .help
.exit       Exit the REPL
.help       Print this message
.session    Print current session
> enum Abc { a, b, c }
> type(Abc).max
2
> Abc c = Abc.c
2
> contract C {}
> msg.sender
0x4B6F0b9546487B1a184ADc43e0b17299cCdf8648
```

## Shortcuts

**cursor**

* <kbd>Alt+Left</kbd>   Cursor to previous word start
* <kbd>Alt+Right</kbd>  Cursor to next word end
* <kbd>Fn+Left</kbd>    Cursor to line start
* <kbd>Fn+Right</kbd>   Cursor to line end

**delete**

* <kbd>Alt+Del</kbd>    Delete to previous word bound from cursor
* <kbd>Ctrl+W</kbd>     Alias of Alt+Del
* <kbd>Ctrl+U</kbd>     Delete to line start from cursor

**interrupt**

* <kbd>Ctrl+C</kbd>     Clear line; signal an exit
* <kbd>Ctrl+D</kbd>     Immediately terminate REPL

## License

[MIT](./LICENSE)
