const solc = require('solc')

const P_BYTES = 'bytes(?:3[0-2]|2\\d|1\\d|[1-9])?'
const P_UINT = 'uint(?:256|248|240|232|224|216|208|200|192|184|176|168|160|152|144|136|128|120|112|104|96|88|80|72|64|56|48|40|32|24|16|8)?'
const P_INT = 'int(?:256|248|240|232|224|216|208|200|192|184|176|168|160|152|144|136|128|120|112|104|96|88|80|72|64|56|48|40|32|24|16|8)?'
const P_TYPE_ELEM = `address payable|address|bool|string|${P_BYTES}|${P_UINT}|${P_INT}|ufixed|fixed`

const P_ARR = '\\[.*\\]'
const P_LOC = `calldata|memory|storage`
const P_TYPE_ARR = `(?:${P_TYPE_ELEM})(?:${P_ARR})?`
const P_TYPE_ARR_LOC = `(?:${P_TYPE_ELEM})(?:${P_ARR})?(?: (?:${P_LOC}))?`

const P_IDENT = '[a-zA-Z$_][a-zA-Z0-9$_]*'
const P_ASSIGN = `^(?:(?:${P_TYPE_ARR_LOC}|${P_IDENT})\\s+)?(?<ident>${P_IDENT})\\s*=\\s*(?<val>.+);?$`
const P_DECL = `^(?:${P_TYPE_ARR_LOC}|${P_IDENT})\\s+(?<ident>${P_IDENT});?$`

const SRC = 'main.sol'
const CON = 'Main'

// auto semicolon insertion
function asi (ln) {
    if (/[;{}]$/.test(ln)) return ln
    return ln + ';'
}

function sol (session, retType) {
    retType = retType || 'int'
    const isContract = retType.indexOf('contract ') === 0
    retType = isContract ? retType.substring('contract '.length) : retType

    const cns = []
    const fns = []
    const exps = []
    let mayMutate = false

    for (let i = 0; i < session.length; i++) {
        let s = session[i]
        if (/^contract/.test(s)) {
            cns.push(s)
        } else if (/^function/.test(s)) {
            fns.push(s)
        } else {
            if (/=\s*new/.test(s)) mayMutate = true
            session[i] = s = asi(s)
            exps.push(s)
        }
    }

    const last = session[session.length - 1] || ''
    const endsWithExp = exps.indexOf(last) >= 0
    let ret = endsWithExp ? last : ''
    let retSign = ''

    if (ret) {
        let assign = null
        let decl = null
        if (assign = last.match(new RegExp(P_ASSIGN))) {
            ret = `${assign.groups['ident']}`
        } else if (decl = last.match(new RegExp(P_DECL))) {
            ret = `${decl.groups['ident']}`
        }
        ret = 'return ' + asi(ret)
        const mut = mayMutate ? '' : 'view'
        retSign = mut + ' returns (' + retType + ')'
    }

    return `
    // SPDX-License-Identifier: UNLICENSED
    pragma solidity ^0.8.0;

    ${cns.join('\n')}

    contract ${CON} {
        ${fns.join('\n')}

        function exec() public ${retSign} {
            ${exps.join('\n')}

            ${ret}
        }
    }`
}

function getRetType (msg) {
    const matches = msg.match(new RegExp(`^Return argument type (contract \\w+|[\\w\\d\\[\\]]+ (?:${P_LOC})?)`))
    if (matches) {
        let rt = ''
        const cap = matches[1]
        if (cap.indexOf('contract ') === 0) rt = cap
        rt = rt || cap.match(new RegExp(P_TYPE_ARR))[0]

        const rl = cap.match(/calldata|memory/)
        if (rl) rt += ' ' + rl[0]
        if (/\]$/.test(rt) || rt === 'string') rt += ' memory'
        return rt
    }
    return ''
}

function compile (session) {
    function trial (src) {
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
    let src = sol(session)
    let res = trial(src)
    if (res.errors && res.errors[0].severity === 'error') {
        const err = res.errors[0]
        const rt = getRetType(err.message)
        if (rt) {
            src = sol(session, rt)
            res = trial(src)
        }
    }

    return res.errors && res.errors[0].severity === 'error'
        ? { src, res: [res.errors[0], null] }
        : { src, res: [null, res.contracts[SRC][CON]] }
}

module.exports = {
    compile,
}
