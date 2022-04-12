function prompt () {
    process.stdout.write('> ')
}

function printHelp () {
    const help = {
        '.exit': 'Exit the REPL',
        '.help': 'Print this message',
        '.session': 'Print all evaluated statements of current session'
    }

    const kws = Object.keys(help)
    for (let i = 0; i < kws.length; i++) {
        const kw = kws[i]
        process.stdout.write(kw.padEnd(12) + help[kw] + '\n')
    }
}

function toPrintable (x) {
    if (x._isBigNumber) return x.toString()
    if (typeof x === 'string') {
        if (x.indexOf('0x' === 0)) return x
        return JSON.stringify(x)
    }
    if (Array.isArray(x)) {
        x = x.map(toPrintable)
        return '[' + x.join(', ') + ']'
    }
    return x
}

module.exports = {
    prompt,
    printHelp,
    toPrintable,
}
