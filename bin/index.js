#!/usr/bin/env node

const yargs = require('yargs')
const { ethers } = require('ethers')
const ganache = require('ganache')
const prettier = require('prettier')
const { compile } = require('./compiler')
const { prompt, setLine, help, toPrintable, lastWordBound, prevWordStart, nextWordEnd } = require('./repl')
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
const CTRL_W = '\u0017'
const ALT_DEL = CTRL_W
const ALT_LEFT = '\u001B\u0062'
const ALT_RIGHT = '\u001B\u0066'
const FN_LEFT = '\u001B\u005B\u0048'
const FN_RIGHT = '\u001B\u005B\u0046'

const RET = '\u000D'
const DEL = '\u007F'
const UP = '\u001B\u005B\u0041'
const DOWN = '\u001B\u005B\u0042'
const RIGHT = '\u001B\u005B\u0043'
const LEFT = '\u001B\u005B\u0044'

let buffer = ''
let cursor = 0
let wantOut = false
let filtered = []
let historyPtr = 0

stdin.on('data', async (key) => {

    // interrupt

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

    // cursor

    if (key === LEFT) {
        cursor = Math.max(0, cursor - 1)
        return stdout.cursorTo(cursor + 2)
    }

    if (key === RIGHT) {
        cursor = Math.min(cursor + 1, buffer.length)
        return stdout.cursorTo(cursor + 2)
    }

    if (key === ALT_LEFT) {
        cursor = prevWordStart(buffer, cursor)
        return stdout.cursorTo(cursor + 2)
    }

    if (key === ALT_RIGHT) {
        cursor = nextWordEnd(buffer, cursor)
        return stdout.cursorTo(cursor + 2)
    }

    if (key === FN_LEFT) {
        cursor = 0
        return stdout.cursorTo(cursor + 2)
    }

    if (key === FN_RIGHT) {
        cursor = buffer.length
        return stdout.cursorTo(cursor + 2)
    }

    // delete

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

        filtered = buffer ? [] : history.slice(0)
        historyPtr = filtered.length
        return
    }

    if (key === ALT_DEL) {
        const bound = lastWordBound(buffer, cursor)
        buffer = buffer.slice(0, bound) + buffer.slice(cursor)
        cursor = bound
        setLine(buffer)
        stdout.cursorTo(cursor + 2)

        filtered = buffer ? [] : history.slice(0)
        historyPtr = filtered.length
        return
    }

    if (key === CTRL_U) {
        buffer = buffer.slice(cursor)
        cursor = 0
        setLine(buffer)
        stdout.cursorTo(cursor + 2)

        filtered = buffer ? [] : history.slice(0)
        historyPtr = filtered.length
        return
    }

    // history

    if (key === UP) {
        if (historyPtr === 0) return

        historyPtr = Math.max(0, historyPtr - 1)
        buffer = filtered[historyPtr] || ''
        cursor = buffer.length
        return setLine(buffer)
    }

    if (key === DOWN) {
        if (historyPtr === filtered.length) return

        historyPtr = Math.min(historyPtr + 1, filtered.length)
        buffer = filtered[historyPtr] || ''
        cursor = buffer.length
        return setLine(buffer)
    }

    // input

    if (key === RET) {
        stdout.write('\n')
        await exec(buffer)

        buffer = ''
        cursor = 0
        filtered = history.slice(0)
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

    filtered.length = 0
    for (let i = 0; i < history.length; i++) {
        if (history[i].indexOf(buffer) === 0) {
            filtered.push(history[i])
        }
    }
    historyPtr = filtered.length
})

console.log(`Welcome to Solidity v${version}!`)
console.log('Type ".help" for more information.')
prompt()
