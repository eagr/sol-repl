const solc = require('solc')

const SRC = 'main.sol'
const CON = 'Main'

function sol (session, retType) {
    const last = session.length - 1
    return `
// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;
contract ${CON} {
    function f() external pure returns (${retType}) {
        ${session.slice(0, last).join(';\n')}return ${session[last]};
    }
}`
}

function getRetType (msg) {
    const matches = msg.match(/^Return argument type (\w+)_\w+/)
    if (matches) {
        let rt = matches[1]
        if (rt === 'string') rt += ' memory'
        return rt
    }
    return ''
}

function compile (session) {
    function trial (session, retType) {
        retType = retType || 'uint'
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
    if (res.errors) {
        const err = res.errors[0]
        const rt = getRetType(err.message)
        if (rt) {
            retType = rt
            res = trial(session, rt)
        }
    }
    if (res.errors) {
        return [res.errors[0], null]
    } else {
        return [null, res.contracts[SRC][CON]]
    }
}

module.exports = {
    compile,
}
