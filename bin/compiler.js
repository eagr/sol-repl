const solc = require('solc')

const SRC = 'main.sol'
const CON = 'Main'

function sol (session, retType) {
    const last = session[session.length - 1]
    let ret = last + ';'
    const matches = last.match(/^uint\s+(\w+)\s*=.+/)
    if (matches) {
        ret = `${matches[1]};`
    }
    ret = 'return ' + ret

    return `
// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;
contract ${CON} {
    function exec() public view returns (${retType}) {
${session.join(';\n')};
${ret}
    }
}`
}

function getRetType (msg) {
    const matches = msg.match(/^Return argument type (\w+)/)
    if (matches) {
        let rt = matches[1].match(/bool|uint\d{1,3}|int|string|address|bytes\d{1,2}|bytes/)[0]
        if (rt === 'string' || rt === 'bytes') rt += ' memory'
        return rt
    }
    return ''
}

function compile (session) {
    function trial (session, retType) {
        retType = retType || 'int'
        const src = sol(session, retType)
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
