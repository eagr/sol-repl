#!/usr/bin/env node

const yargs = require('yargs')
const { ethers } = require('ethers')
const ganache = require('ganache')
const prettier = require('prettier')
const { compile } = require('./compiler')
const { prompt, setLine, help, toPrintable, lastWordBound, prevWordStart, nextWordEnd } = require('./repl')

const pkg = require('../package.json')
const ver = pkg.version
const solVer = pkg.dependencies.solc
yargs
    .version(ver)
    .wrap(yargs.terminalWidth())
    .parse()

ethers.utils.Logger.setLogLevel('OFF')
const { providers, ContractFactory } = ethers
const provider = new providers.Web3Provider(ganache.provider({
    logging: { quiet: true },
}))
const signer = provider.getSigner()

const session = []
const book = []
let src = ''
let invalidSrc = ''

async function exec (inp) {
    if (/^\s*$/.test(inp)) return
    book.push(inp)

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
            console.error(err.formattedMessage)
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

let signaledExit = false
let input = ''
let cursor = 0
let history = []
let historyPtr = 0

stdin.on('data', async (key) => {

    // interrupt

    if (key === CTRL_D) process.exit()

    if (key === CTRL_C) {
        if (signaledExit) process.exit()
        if (input === '') {
            console.log('\n(To exit, press Ctrl+C again or Ctrl+D or type .exit)')
            signaledExit = true
            return prompt()
        }

        input = ''
        cursor = 0
        stdout.write('\n')
        return prompt()
    }
    signaledExit = false

    // cursor

    function cursorTo (buf, cur, inp) {
        switch (inp) {
            case LEFT: return Math.max(0, cur - 1)
            case RIGHT: return Math.min(cur + 1, buf.length)
            case ALT_LEFT: return prevWordStart(buf, cur)
            case ALT_RIGHT: return nextWordEnd(buf, cur)
            case FN_LEFT: return 0
            case FN_RIGHT: return buf.length
        }
    }

    if (
        key === LEFT || key === RIGHT ||
        key === ALT_LEFT || key === ALT_RIGHT ||
        key === FN_LEFT || key === FN_RIGHT
    ) {
        cursor = cursorTo(input, cursor, key)
        return stdout.cursorTo(cursor + 2)
    }

    // delete

    if (key === DEL) {
        input = input.slice(0, Math.max(0, cursor - 1)) + input.slice(cursor)
        cursor = Math.max(0, cursor - 1)
        if (cursor === input.length) {
            stdout.cursorTo(cursor + 2)
            stdout.clearLine(1)
        } else {
            setLine(input)
            stdout.cursorTo(cursor + 2)
        }

        history = input ? [] : book.slice(0)
        historyPtr = history.length
        return
    }

    if (key === ALT_DEL) {
        const bound = lastWordBound(input, cursor)
        input = input.slice(0, bound) + input.slice(cursor)
        cursor = bound
        setLine(input)
        stdout.cursorTo(cursor + 2)

        history = input ? [] : book.slice(0)
        historyPtr = history.length
        return
    }

    if (key === CTRL_U) {
        input = input.slice(cursor)
        cursor = 0
        setLine(input)
        stdout.cursorTo(cursor + 2)

        history = input ? [] : book.slice(0)
        historyPtr = history.length
        return
    }

    // history

    if (key === UP) {
        if (historyPtr === 0) return

        historyPtr = Math.max(0, historyPtr - 1)
        input = history[historyPtr] || ''
        cursor = input.length
        return setLine(input)
    }

    if (key === DOWN) {
        if (historyPtr === history.length) return

        historyPtr = Math.min(historyPtr + 1, history.length)
        input = history[historyPtr] || ''
        cursor = input.length
        return setLine(input)
    }

    // input

    if (key === RET) {
        stdout.write('\n')
        await exec(input)

        input = ''
        cursor = 0
        history = book.slice(0)
        historyPtr = book.length
        return prompt()
    }

    input = input.slice(0, cursor) + key + input.slice(cursor)
    cursor = cursor + 1
    if (cursor === input.length) {
        stdout.write(key)
    } else {
        setLine(input)
        stdout.cursorTo(cursor + 2)
    }

    history.length = 0
    for (let i = 0; i < book.length; i++) {
        if (book[i].indexOf(input) === 0) {
            history.push(book[i])
        }
    }
    historyPtr = history.length
})

console.log(`Welcome to Solidity v${solVer}!`)
console.log('Type ".help" for more information.')
prompt()
