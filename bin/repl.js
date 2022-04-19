const PROMPT = '> '
function prompt () {
    process.stdout.write(PROMPT)
}

function setLine (ln) {
    const stdout = process.stdout
    stdout.cursorTo(PROMPT.length)
    stdout.clearLine(1)
    stdout.write(ln)
}

function help () {
    const info = {
        '.exit': 'Exit the REPL',
        '.help': 'Print this message',
        '.session': 'Print current session',
    }

    const commands = Object.keys(info)
    for (let i = 0; i < commands.length; i++) {
        const cmd = commands[i]
        console.log(cmd.padEnd(12) + info[cmd])
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

function lastWordBound (str, pos) {
    const inWord = /\w/.test(str[pos - 1])
    const pat = inWord ? /\W/ : /\w/
    for (let i = pos - 1; i >= 0; i--) {
        if (pat.test(str[i])) return i + 1
    }
    return 0
}

module.exports = {
    prompt,
    setLine,
    help,
    toPrintable,
    lastWordBound,
}
