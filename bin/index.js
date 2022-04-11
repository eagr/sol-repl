#!/usr/bin/env node

const { ethers } = require('ethers')
const ganache = require('ganache')
const yargs = require('yargs')
const { compile } = require('./compiler')
const { prompt, printHelp, formatSession, toPrintable } = require('./repl')
const pkg = require('../package.json')

ethers.utils.Logger.setLogLevel('OFF')
const { providers, ContractFactory } = ethers
const provider = new providers.Web3Provider(ganache.provider({
    logging: { quiet: true },
}))
const signer = provider.getSigner()

const version = pkg.dependencies.solc
yargs
    .version(version)
    .wrap(yargs.terminalWidth())
    .parse()

const { stdin, stdout } = process
console.log(`Welcome to Solidity v${version}!`)
console.log('Type ".help" for more information.')
prompt()

const session = []
stdin.setEncoding('utf8')
stdin.resume()
stdin.on('data', async (inp) => {
    inp = inp.trim()
    if (inp === '') return prompt()

    if (/^\.[A-Za-z]+$/.test(inp)) {
        inp = inp.toLowerCase()
        switch (inp) {
            case '.exit':
                process.exit()
            case '.help':
                printHelp()
                break
            case '.session':
                console.log(formatSession(session))
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
    prompt()
})
