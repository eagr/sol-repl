const solc = require('solc')

const SRC = 'main.sol'
const CON = 'Main'

const P_BYTES = 'bytes(?:3[0-2]|2\\d|1\\d|[1-9])?'
const P_UINT = 'uint(?:256|128|64|32|16|8)?'
const P_INT = 'int(?:256|128|64|32|16|8)?'
const P_TYPE = `${P_BYTES}|${P_UINT}|${P_INT}|bool|address payable|address|string|ufixed|fixed`

const P_ARR = '\\[\\d*\\]'
const P_LOC = `calldata|memory|storage`
const P_TYPE_ARR = `(?:${P_TYPE})(?:${P_ARR})?`
const P_TYPE_ARR_LOC = `(?:${P_TYPE})(?:${P_ARR})?(?: (?:${P_LOC}))?`

const P_ASSIGN = `^${P_TYPE_ARR_LOC}\\s+(?<ident>\\w+)\\s*=\\s*(?<val>.+);?$`
const P_DECL = `^${P_TYPE_ARR_LOC}\\s+(?<ident>\\w+);?$`

function sol (session, retType) {
    const fns = []
    const exps = []
    for (let i = 0; i < session.length; i++) {
        const s = session[i]
        if (/^function/.test(s)) {
            fns.push(s)
        } else {
            exps.push(s)
        }
    }

    const last = exps[exps.length - 1] || ''
    let ret = last

    const assign = last.match(new RegExp(P_ASSIGN))
    if (assign) ret = `${assign.groups['ident']}`
    const decl = last.match(new RegExp(P_DECL))
    if (decl) ret = `${decl.groups['ident']}`
    ret = ret && ('return ' + ret + ';')

    return `
// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;
contract ${CON} {
${fns.join('\n')}
    function exec() public view returns (${retType}) {
${exps.map((e) => {
    if (/}$/.test(e)) return e
    return e + ';'
}).join('\n')}
${ret}
    }
}`
}

function getRetType (msg) {
    const matches = msg.match(new RegExp(`^Return argument type ([\\w\\d\\[\\]]+ (?:${P_LOC})?)`))
    if (matches) {
        let rt = matches[1].match(new RegExp(P_TYPE_ARR))[0]
        const rl = matches[1].match(/calldata|memory/)
        if (rl) rt += ' ' + rl[0]
        if (/\]$/.test(rt) || rt === 'string') rt += ' memory'
        return rt
    }
    return ''
}

function compile (session) {
    function trial (sess, retType) {
        retType = retType || 'int'
        const src = sol(sess, retType)
        const inp = JSON.stringify({
            language: 'Solidity',
            sources: { [SRC]: { content: src } },
            settings: {
                outputSelection: {
                    '*': { '*': ['*'] },
                },
            },
        })
        const out = JSON.parse(solc.compile(inp))
        return out
    }

    // first trial is for determining return type
    let res = trial(session)
    if (res.errors && res.errors[0].severity === 'error') {
        const err = res.errors[0]
        const rt = getRetType(err.message)
        if (rt) {
            retType = rt
            res = trial(session, rt)
        }
    }
    if (res.errors && res.errors[0].severity === 'error') {
        return [res.errors[0], null]
    } else {
        return [null, res.contracts[SRC][CON]]
    }
}

module.exports = {
    compile,
}
