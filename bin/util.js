const fs = require('fs')
const path = require('path')

const supportsBigInt = typeof BigInt === 'function' && typeof BigInt(0) === 'bigint'

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

function toDisplay (x) {
    function isStruct (x) {
        if (Array.isArray(x)) {
            const keys = Object.keys(x)
            return keys.length === x.length * 2
        }
        return false
    }

    if (x._isBigNumber) {
        const s = x.toString()
        const n = Number(s)
        return n >= Number.MIN_SAFE_INTEGER && n <= Number.MAX_SAFE_INTEGER
            ? n
            : supportsBigInt ? BigInt(s) : s
    }

    if (typeof x === 'string') {
        if (x.indexOf('0x') === 0) return x
        return JSON.stringify(x)
    }

    if (Array.isArray(x)) {
        if (isStruct(x)) {
            const struct = {}
            const keys = Object.keys(x).slice(x.length)
            for (let i = 0; i < keys.length; i++) {
                const key = keys[i]
                struct[key] = toDisplay(x[key])
            }
            return struct
        }

        x = x.map(toDisplay)
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

function prevWordStart (str, pos) {
    let prev = ''
    for (let i = pos - 1; i >= 0; i--) {
        if (/\s/.test(str[i]) && /\S/.test(prev)) return i + 1
        prev = str[i]
    }
    return 0
}

function nextWordEnd (str, pos) {
    let prev = ''
    for (let i = pos; i <= str.length; i++) {
        if (/\s/.test(str[i]) && /\S/.test(prev)) return i
        prev = str[i]
    }
    return str.length
}

function importCallback (srcPath) {
    const paths = [
        // order matters
        path.join(process.env.PWD, srcPath),
        path.join(process.env.PWD, 'node_modules', srcPath),
    ]

    for (let i = 0; i < paths.length; i++) {
        const p = paths[i]
        try {
            if (fs.existsSync(p)) {
                const src = fs.readFileSync(p, 'utf8')
                return { contents: src }
            }
        } catch (err) {
            console.error(err)
        }
    }
    return { error: `File not found in:\n${paths.join('\n')}` }
}

module.exports = {
    prompt,
    setLine,
    help,
    toDisplay,
    lastWordBound,
    prevWordStart,
    nextWordEnd,
    importCallback,
}
