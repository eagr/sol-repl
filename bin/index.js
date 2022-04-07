#!/usr/bin/env node

const yargs = require('yargs')
const pkg = require('../package.json')

const version = pkg.dependencies.solc
const prompt = () => process.stdout.write('> ')

yargs
    .version(version)
    .wrap(yargs.terminalWidth())
    .parse()
console.log(`Welcome to Solidity v${version}!`)
console.log('Type ".help" for more information.')
prompt()

process.stdin.setEncoding('utf8')
process.stdin.resume()
process.stdin.on('data', (inp) => {
    inp = inp.trim().toLowerCase()

    function printHelp () {
        const help = {
            '.exit': 'Exit the REPL',
            '.help': 'Print this message',
        }

        const kws = Object.keys(help)
        for (let i = 0; i < kws.length; i++) {
            const kw = kws[i]
            console.log(kw.padEnd(12) + help[kw])
        }
    }

    if (inp.indexOf('.') === 0) {
        switch (inp) {
            case '.exit':
                process.exit()
                break
            case '.help':
                printHelp()
                prompt()
                break
            default:
                console.log('Invalid REPL keyword')
                prompt()
                break
        }
    } else {

    }
})
