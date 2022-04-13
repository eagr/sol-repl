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

const { stdin, stdout } = process
stdin.setEncoding('utf8')
stdin.resume()
stdin.on('data', async (inp) => {
    await exec(inp)
    prompt()
})

console.log(`Welcome to Solidity v${version}!`)
console.log('Type ".help" for more information.')
prompt()
