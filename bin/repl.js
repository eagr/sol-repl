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

function formatSession (session) {
    const out = session.map((stmt) => {
        const end = stmt[stmt.length - 1]
        if (end !== '}' && end !== ';') stmt += ';'
        return stmt
    })
    return out.join('\n')
}

module.exports = {
    prompt,
    printHelp,
    formatSession,
}
