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
async function exec (inp) {
    inp = inp.trim()
    if (inp === '') return

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
        const [err, out] = compile(session)
        if (err) {
            session.pop()
            console.error(err)
        } else {
            const factory = ContractFactory.fromSolidity(out, signer)
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

let wantOut = false
let buffer = ''

stdin.on('data', async (key) => {
    if (key === EOT) process.exit()

    if (key === ETX) {
        if (wantOut) process.exit()
        if (buffer === '') {
            console.log('\n(To exit, press Ctrl+C again or Ctrl+D or type .exit)')
            wantOut = true
            return prompt()
        }

        buffer = ''
        stdout.write('\n')
        return prompt()
    }
    wantOut = false

    if (key === NAK) {
        buffer = ''
        return setLine(buffer)
    }

    if (key === DEL) {
        buffer = buffer.slice(0, buffer.length - 1)
        return setLine(buffer)
    }

    if (key === RET) {
        stdout.write('\n')
        await exec(buffer)
        buffer = ''
        return prompt()
    }

    buffer += key
    stdout.write(key)
})

console.log(`Welcome to Solidity v${version}!`)
console.log('Type ".help" for more information.')
prompt()
