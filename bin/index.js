#!/usr/bin/env node

const yargs = require('yargs')
const { ethers } = require('ethers')
const ganache = require('ganache')
const prettier = require('prettier')
const { compile } = require('./compiler')
const { prompt, setLine, help, toPrintable, lastWordBound } = require('./repl')
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
let invalidSrc = ''

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
                console.log(prettier.format(src, {
                    filepath: '*.sol',
                    tabWidth: 2,
                    useTabs: false,
                    explicitTypes: 'preserve',
                }))
                break
            case '.invalid':
                console.log(invalidSrc)
                break
            default:
                console.log('Invalid REPL command')
                break
        }
    } else {
        session.push(inp)
        const comp = compile(session.slice())
        const [err, out] = comp.res
        if (err) {
            invalidSrc = comp.src
            session.pop()
            console.error(err)
        } else {
            src = comp.src
            const factory = ContractFactory.fromSolidity(out, signer)
            const snippets = await factory.deploy()
            await snippets.deployTransaction.wait()
            const rawRes = await snippets.exec()

            if (typeof rawRes.wait === 'function') return
            console.log(toPrintable(rawRes))
        }
    }
}

const { stdin, stdout } = process
stdin.setRawMode(true)
stdin.setEncoding('utf8')
stdin.resume()

const CTRL_C = '\u0003'
const CTRL_D = '\u0004'
const CTRL_U = '\u0015'
const ALT_DEL = '\u0017'    // also Ctrl-W

const RET = '\u000D'
const DEL = '\u007F'
const UP = '\u001B\u005B\u0041'
const DOWN = '\u001B\u005B\u0042'
const RIGHT = '\u001B\u005B\u0043'
const LEFT = '\u001B\u005B\u0044'

let buffer = ''
let cursor = 0
let wantOut = false
let historyPtr = history.length

stdin.on('data', async (key) => {
    if (key === CTRL_D) process.exit()

    if (key === CTRL_C) {
        if (wantOut) process.exit()
        if (buffer === '') {
            console.log('\n(To exit, press Ctrl+C again or Ctrl+D or type .exit)')
            wantOut = true
            return prompt()
        }

        buffer = ''
        cursor = 0
        stdout.write('\n')
        return prompt()
    }
    wantOut = false

    if (key === CTRL_U) {
        buffer = buffer.slice(cursor)
        cursor = 0
        setLine(buffer)
        return stdout.cursorTo(cursor + 2)
    }

    if (key === ALT_DEL) {
        const bound = lastWordBound(buffer, cursor)
        buffer = buffer.slice(0, bound) + buffer.slice(cursor)
        cursor = bound
        setLine(buffer)
        return stdout.cursorTo(cursor + 2)
    }

    if (key === DEL) {
        buffer = buffer.slice(0, Math.max(0, cursor - 1)) + buffer.slice(cursor)
        cursor = Math.max(0, cursor - 1)
        if (cursor === buffer.length) {
            stdout.cursorTo(cursor + 2)
            stdout.clearLine(1)
        } else {
            setLine(buffer)
            stdout.cursorTo(cursor + 2)
        }
        return
    }

    if (key === LEFT) {
        cursor = Math.max(0, cursor - 1)
        return stdout.cursorTo(cursor + 2)
    }

    if (key === RIGHT) {
        cursor = Math.min(cursor + 1, buffer.length)
        return stdout.cursorTo(cursor + 2)
    }

    if (key === UP) {
        if (historyPtr === 0) return

        historyPtr = Math.max(0, historyPtr - 1)
        buffer = history[historyPtr] || ''
        cursor = buffer.length
        return setLine(buffer)
    }

    if (key === DOWN) {
        if (historyPtr === history.length) return

        historyPtr = Math.min(historyPtr + 1, history.length)
        buffer = history[historyPtr] || ''
        cursor = buffer.length
        return setLine(buffer)
    }

    if (key === RET) {
        stdout.write('\n')
        await exec(buffer)

        buffer = ''
        cursor = 0
        historyPtr = history.length
        return prompt()
    }

    buffer = buffer.slice(0, cursor) + key + buffer.slice(cursor)
    cursor = cursor + 1
    if (cursor === buffer.length) {
        stdout.write(key)
    } else {
        setLine(buffer)
        stdout.cursorTo(cursor + 2)
    }
})

console.log(`Welcome to Solidity v${version}!`)
console.log('Type ".help" for more information.')
prompt()
