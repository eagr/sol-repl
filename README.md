# sol-repl

a REPL to provide instant feedback for Solidity snippets

## Features

* language
  * [x] function
  * [ ] contract
  * [ ] struct
  * [ ] mapping
  * [ ] import
* REPL
  * [x] Node-like REPL interactions
  * [x] cursor/delete shortcuts
  * [x] `.session` print formatted Solidity source
  * [x] history traversing
  * [x] history filtering

## Usage

**install**

```sh
npm i -g sol-repl
```

**run**

```sh
$ sol
Welcome to Solidity v0.8.13!
Type ".help" for more information.
> uint a = 1
1
> contract C {}
> .session
// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

contract C {}

contract Main {
  function exec() public {
    uint a = 1;
  }
}
> msg.sender
0x4B6F0b9546487B1a184ADc43e0b17299cCdf8648
```

## REPL commands

```
.exit       Exit the REPL
.help       Print this message
.session    Print current session
```

## Shortcuts

**cursor**

<pre>
<kbd>Alt+Left</kbd>   Cursor to previous word start
<kbd>Alt+Right</kbd>  Cursor to next word end
<kbd>Fn+Left</kbd>    Cursor to line start
<kbd>Fn+Right</kbd>   Cursor to line end
</pre>

**delete**

<pre>
<kbd>Alt+Del</kbd>    Delete to previous word bound from cursor
<kbd>Ctrl+W</kbd>     Alias of Alt+Del
<kbd>Ctrl+U</kbd>     Delete to line start from cursor
</pre>

**interrupt**

<pre>
<kbd>Ctrl+C</kbd>     Clear line; signal an exit
<kbd>Ctrl+D</kbd>     Immediately terminate REPL
</pre>

## License

[MIT](./LICENSE)
