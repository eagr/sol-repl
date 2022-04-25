const solc = require('solc')

const P_BYTES = 'bytes(?:3[0-2]|2\\d|1\\d|[1-9])?'
const P_UINT = 'uint(?:256|248|240|232|224|216|208|200|192|184|176|168|160|152|144|136|128|120|112|104|96|88|80|72|64|56|48|40|32|24|16|8)?'
const P_INT = 'int(?:256|248|240|232|224|216|208|200|192|184|176|168|160|152|144|136|128|120|112|104|96|88|80|72|64|56|48|40|32|24|16|8)?'
const P_TYPE_ELEM = `address payable|address|bool|string|${P_BYTES}|${P_UINT}|${P_INT}|ufixed|fixed`

const P_VIS = `private|internal|public|external`
const P_LOC = `calldata|memory|storage`
const P_MUT = `pure|view|payable`
const P_UNIT = 'ether|gwei|wei|seconds|minutes|hours|days|weeks|years'

const P_IDENT = '[a-zA-Z$_][a-zA-Z0-9$_]*'
const P_IDENT_PATH = `${P_IDENT}(?:\\.${P_IDENT})*`

const P_TYPE_PARAMS = '[\\s\\S]*'
const P_TYPE_RET_PARAMS = '[\\s\\S]+'
const P_TYPE_FUNC = `function\\s*\\(${P_TYPE_PARAMS}\\)(?:\\s*(?:${P_VIS}))?(?:\\s*(?:${P_MUT}))?(?:\\s*return\\s*\\(?:${P_TYPE_RET_PARAMS}\\))?`

const P_TYPE_MAP_KEY = `${P_TYPE_ELEM}|${P_IDENT_PATH}`
const P_TYPE_MAP_VAL = '[\\s\\S]+'
const P_TYPE_MAP = `mapping\\s*\\(\\s*(?:${P_TYPE_MAP_KEY})\\s*=>${P_TYPE_MAP_VAL}\\)`

const P_TYPE = `(?:${P_TYPE_FUNC}|${P_TYPE_MAP}|${P_TYPE_ELEM}|${P_IDENT_PATH})(?:\\[.*\\])?`

const P_OP_ASSIGN = '(?:>>>|>>|<<|[|^&+*/%-])?='

const P_EXP = '[\\s\\S]+'
const P_ASSIGN = `(?<ident>${P_IDENT})\\s*${P_OP_ASSIGN}\\s*(?<val>${P_EXP})`
const P_DECL = `(?<type>${P_TYPE})\\s+(?<ident>${P_IDENT})`

const SRC = 'main.sol'
const CON = 'Main'

// auto semicolon insertion
function asi (ln) {
    if (/[;{}]$/.test(ln)) return ln
    return ln + ';'
}

const reAssign = new RegExp(`${P_ASSIGN};$`)
const reDecl = new RegExp(`${P_DECL};$`)
const reIdent = new RegExp(`(?<ident>${P_IDENT_PATH});$`)
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
        let match = null
        let ident = ''

        // order matters
        if (match = last.match(reAssign)) {
            ident = `${match.groups['ident']}`
        } else if (match = last.match(reDecl)) {
            ident = `${match.groups['ident']}`
        } else if (match = last.match(reIdent)) {
            ident = `${match.groups['ident']}`
        }

        ret = ident ? `return ${asi(ident)}` : ''
        const mut = mayMutate ? '' : 'view'
        retSign = ret ? mut + ' returns (' + retType + ')' : ''
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

const reMsg = new RegExp(`^Return argument type (contract ${P_IDENT}|[\\w\\[\\]]+\\s+(?:${P_LOC})?)`)
const reRetType = new RegExp(`(?:${P_TYPE_ELEM})(?:\\[.*\\])?`)
function getRetType (msg) {
    const matches = msg.match(reMsg)
    if (matches) {
        let rt = ''

        const cap = matches[1]
        if (cap.indexOf('contract ') === 0) rt = cap
        rt = rt || cap.match(reRetType)[0]

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
