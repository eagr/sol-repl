#!/usr/bin/env node

const yargs = require('yargs')
const { ethers } = require('ethers')
const ganache = require('ganache')
const { compile } = require('./compiler')
const { prompt, help, toPrintable } = require('./repl')
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

let input = ''
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
                stdout.write('Invalid REPL keyword\n')
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

const ENTER = '\u000D'
const { stdin, stdout } = process

stdin.setRawMode(true)
stdin.setEncoding('utf8')
stdin.resume()
stdin.on('data', async (key) => {
    if (key === ENTER) {
        stdout.write('\n')
        await exec(input)
        input = ''
        return prompt()
    }

    stdout.write(key)
    input += key
})

console.log(`Welcome to Solidity v${version}!`)
console.log('Type ".help" for more information.')
prompt()
