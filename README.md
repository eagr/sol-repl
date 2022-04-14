# sol-repl

Solidity REPL (WIP)

## Features

* language
  * [x] contract
  * [x] function
  * [ ] struct
  * [ ] mapping
  * [ ] import
* REPL
  * [x] Node-like REPL interactions: Ctrl-C, Ctrl-D, Ctrl-U, ...
  * [x] `.session` print formatted Solidity source
  * [x] history traversing
  * [ ] history filtering

## Usage

**Install**

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

## License

[MIT](./LICENSE)
