function prompt () {
    process.stdout.write('> ')
}

function printHelp () {
    const help = {
        '.exit': 'Exit the REPL',
        '.help': 'Print this message',
    }

    const kws = Object.keys(help)
    for (let i = 0; i < kws.length; i++) {
        const kw = kws[i]
        process.stdout.write(kw.padEnd(12) + help[kw] + '\n')
    }
}

module.exports = {
    prompt,
    printHelp,
}
