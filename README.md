# sol-repl

Solidity REPL (WIP)

## Features

* language
  * [x] function declarations
  * [ ] contract declarations
* REPL
  * [x] Node-like REPL interactions
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
> a
1
> a + 2 ** 3
9
> msg.sender
0x4B6F0b9546487B1a184ADc43e0b17299cCdf8648
```

## License

[MIT](./LICENSE)
