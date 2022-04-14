#!/usr/bin/env node

const yargs = require('yargs')
const { ethers } = require('ethers')
const ganache = require('ganache')
const { compile } = require('./compiler')
const { prompt, setLine, help, toPrintable } = require('./repl')
const pkg = require('../package.json')

const version = pkg.dependencies.solc
yargs
    .version(version)
    .wrap(yargs.terminalWidth())
    .parse()

ethers.utils.Logger.setLogLevel('OFF')
const { providers, ContractFactory } = ethers
const provider = new providers.Web3Provider(ganache.provider({
    logging: { quiet: true },
}))
const signer = provider.getSigner()

const session = []
const history = []
let src = ''
async function exec (inp) {
    if (/^\s*$/.test(inp)) return
    history.push(inp)

    inp = inp.trim()
    if (/^\.[A-Za-z]+$/.test(inp)) {
        inp = inp.toLowerCase()
        switch (inp) {
            case '.exit':
                process.exit()
            case '.help':
                help()
                break
            case '.session':
                console.log(session.join('\n'))
                break
            default:
                console.log('Invalid REPL command')
                break
        }
    } else {
        session.push(inp)
        const [err, res] = compile(session.slice())
        if (err) {
            session.pop()
            console.error(err)
        } else {
            src = res.src
            const factory = ContractFactory.fromSolidity(res.out, signer)
            const snippets = await factory.deploy()
            await snippets.deployTransaction.wait()
            const rawRes = await snippets.exec()
            console.log(toPrintable(rawRes))
        }
    }
}

const { stdin, stdout } = process
stdin.setRawMode(true)
stdin.setEncoding('utf8')
stdin.resume()

const ETX = '\u0003'
const EOT = '\u0004'
const RET = '\u000D'
const NAK = '\u0015'
const DEL = '\u007F'
const UP = '\u001B\u005B\u0041'
const DOWN = '\u001B\u005B\u0042'
const RIGHT = '\u001B\u005B\u0043'
const LEFT = '\u001B\u005B\u0044'

let wantOut = false
let buffer = ''
let cursorPos = 2
let historyPtr = history.length

stdin.on('data', async (key) => {
    function setBuffer (buf) {
        buffer = buf
        cursorPos = buffer.length + 2
    }

    if (key === EOT) process.exit()

    if (key === ETX) {
        if (wantOut) process.exit()
        if (buffer === '') {
            console.log('\n(To exit, press Ctrl+C again or Ctrl+D or type .exit)')
            wantOut = true
            return prompt()
        }

        setBuffer('')
        stdout.write('\n')
        return prompt()
    }
    wantOut = false

    if (key === NAK) {
        setBuffer('')
        return setLine(buffer)
    }

    if (key === DEL) {
        setBuffer(buffer.slice(0, buffer.length - 1))
        return setLine(buffer)
    }

    if (key === LEFT) {
        cursorPos = Math.max(2, cursorPos - 1)
        return stdout.cursorTo(cursorPos)
    }
    if (key === RIGHT) {
        cursorPos = Math.min(cursorPos + 1, buffer.length + 2)
        return stdout.cursorTo(cursorPos)
    }
    if (key === UP) {
        historyPtr = Math.max(0, historyPtr - 1)
        setBuffer(history[historyPtr] || '')
        return setLine(buffer)
    }
    if (key === DOWN) {
        historyPtr = Math.min(historyPtr + 1, history.length)
        setBuffer(history[historyPtr] || '')
        return setLine(buffer)
    }

    if (key === RET) {
        stdout.write('\n')
        await exec(buffer)
        historyPtr = history.length
        setBuffer('')
        return prompt()
    }

    setBuffer(buffer + key)
    stdout.write(key)
})

console.log(`Welcome to Solidity v${version}!`)
console.log('Type ".help" for more information.')
prompt()
