const solc = require('solc')
const fs = require('fs')
const path = require('path')

const P_BYTES = 'bytes(?:3[0-2]|2\\d|1\\d|[1-9])?'
const P_UINT = 'uint(?:256|248|240|232|224|216|208|200|192|184|176|168|160|152|144|136|128|120|112|104|96|88|80|72|64|56|48|40|32|24|16|8)?'
const P_INT = 'int(?:256|248|240|232|224|216|208|200|192|184|176|168|160|152|144|136|128|120|112|104|96|88|80|72|64|56|48|40|32|24|16|8)?'
const P_TYPE_ELEM = `address payable|address|bool|string|${P_BYTES}|${P_UINT}|${P_INT}|ufixed|fixed`

const P_VIS = `private|internal|public|external`
const P_LOC = `calldata|memory|storage`
const P_MUT = `pure|view|payable`
const P_UNIT = 'ether|gwei|wei|seconds|minutes|hours|days|weeks|years'
const P_ARR = `\\[[\\s\\S]*\\]`

const P_IDENT = '[a-zA-Z$_][a-zA-Z0-9$_]*'
const P_IDENT_PATH = `${P_IDENT}(?:\\.${P_IDENT})*`

const P_TYPE_PARAMS = '[\\s\\S]*'
const P_TYPE_RET_PARAMS = '[\\s\\S]+'
const P_TYPE_FUNC = `function\\s*\\(${P_TYPE_PARAMS}\\)(?:\\s*(?:${P_VIS}))?(?:\\s*(?:${P_MUT}))?(?:\\s*returns\\s*\\(${P_TYPE_RET_PARAMS}\\))?`

const P_TYPE_MAP_KEY = `${P_TYPE_ELEM}|${P_IDENT_PATH}`
const P_TYPE_MAP_VAL = '[\\s\\S]+'
const P_TYPE_MAP = `mapping\\s*\\(\\s*(?:${P_TYPE_MAP_KEY})\\s*=>${P_TYPE_MAP_VAL}\\)`

const P_TYPE = `(?:${P_TYPE_FUNC}|${P_TYPE_MAP}|${P_TYPE_ELEM}|${P_IDENT_PATH})(?:${P_ARR})?`

const P_OP_ASSIGN = '(?:>>>|>>|<<|[|^&+*/%-])?='

const P_EXP = '[\\s\\S]+'
const P_ASSIGN = `(?<ident>${P_IDENT})\\s*${P_OP_ASSIGN}\\s*(?<val>${P_EXP})`
const P_DECL = `(?<type>${P_TYPE})\\s+(?<ident>${P_IDENT})`
const P_CONST = `(?<type>(?:${P_TYPE_ELEM})(?:${P_ARR})?)\\s+constant\\s+(?<ident>${P_IDENT})\\s*=\\s*(?<val>${P_EXP})`

const P_ENUM = `enum\\s+(?<ident>${P_IDENT})\\s*{\\s*${P_IDENT}(?:\\s*,\\s*${P_IDENT})*\\s*}`

const P_ARGS = `[\\s\\S]*`
const P_CONTRACT_BODY = `.*`
const P_INHERIT_SPEC = `${P_IDENT_PATH}(?:\\(${P_ARGS}\\))?`
const P_INHERIT = `is\\s+(?:${P_INHERIT_SPEC}(?:\\s*,\\s*${P_INHERIT_SPEC})*)`

const P_INTERFACE = `interface\\s+(?<ident>${P_IDENT})\\s+(?:${P_INHERIT})?\\s*{${P_CONTRACT_BODY}}`
const P_LIBRARY = `library\\s+(?<ident>${P_IDENT})\\s*{${P_CONTRACT_BODY}}`

const SRC = 'main.sol'
const CON = 'Main'

// auto semicolon insertion
function asi (ln) {
    if (/[;{}]$/.test(ln)) return ln
    return ln + ';'
}

const reType = new RegExp(`^type\\s+${P_IDENT}\\s+is\\s+(?:${P_TYPE_ELEM})`)
const reConst = new RegExp(`^${P_CONST}`)
const reAssign = new RegExp(`${P_ASSIGN};$`)
const reDecl = new RegExp(`^${P_DECL}`)
function sol (session, retType, mayMutate) {
    mayMutate = mayMutate || false

    const imports = []
    const types = []
    const enums = []
    const constants = []
    const structs = []
    const interfaces = []
    const libraries = []
    const contracts = []
    const usings = []
    const declarations = []
    const fns = []
    const exps = []

    for (let i = 0; i < session.length; i++) {
        let s = session[i]
        if (/^import/.test(s)) {
            session[i] = s = asi(s)
            imports.push(s)
        } else if (reType.test(s)) {
            session[i] = s = asi(s)
            types.push(s)
        } else if (/^enum/.test(s)) {
            enums.push(s)
        } else if (reConst.test(s)) {
            session[i] = s = asi(s)
            constants.push(s)
        } else if (/^struct/.test(s)) {
            structs.push(s)
        } else if (/^interface/.test(s)) {
            interfaces.push(s)
        } else if (/^library/.test(s)) {
            libraries.push(s)
        } else if (/^(abstract\s+)?contract/.test(s)) {
            contracts.push(s)
        } else if (/^using/.test(s)) {
            session[i] = s = asi(s)
            usings.push(s)
        } else if (reDecl.test(s)) {
            session[i] = s = asi(s)
            declarations.push(s)
        } else if (/^function/.test(s)) {
            fns.push(s)
        } else {
            session[i] = s = asi(s)
            exps.push(s)
        }
    }

    const last = session[session.length - 1] || ''
    const returnable = exps.indexOf(last) >= 0 || declarations.indexOf(last) >= 0 || constants.indexOf(last) >= 0
    let ret = returnable ? last : ''
    let retSign = ''

    if (ret) {
        let match = null
        let ident = ''

        // order matters
        if (
            (match = ret.match(reConst)) ||
            (match = ret.match(reAssign)) ||
            (match = ret.match(reDecl))
        ) {
            ident = `${match.groups['ident']}`
        }

        ret = 'return ' + asi(ident ? ident : ret)
        const mut = mayMutate ? '' : 'view '
        retSign = mut + 'returns (' + retType + ')'
    }

    return `
    // SPDX-License-Identifier: UNLICENSED
    pragma solidity ^0.8.0;

    ${imports.join('\n')}

    ${types.join('\n')}
    ${enums.join('\n')}
    ${constants.join('\n')}
    ${structs.join('\n')}
    ${interfaces.join('\n')}
    ${libraries.join('\n')}
    ${contracts.join('\n')}

    contract ${CON} {
        ${usings.join('\n')}
        ${declarations.join('\n')}
        ${fns.join('\n')}

        function __wingman__() public {
            ${exps.join('\n')}
        }

        function __exec__() public ${retSign} {
            ${ret}
        }
    }`
}

const reMsg = new RegExp(`^Return argument type ([\\s\\S]+) is not implicitly convertible to`)
const reEnum = new RegExp(`enum (${P_IDENT_PATH})`)
const reStruct = new RegExp(`struct (${P_IDENT_PATH})`)
const reLibrary = new RegExp(`library (${P_IDENT})`)
const reContract = new RegExp(`contract (${P_IDENT})`)
const reRetType = new RegExp(`(?:${P_TYPE_ELEM})(?:${P_ARR})?`)
function getRetType (msg) {
    const matches = msg.match(reMsg)
    if (matches) {
        let rt = ''

        const cap = matches[1]
        if (cap.indexOf('enum') >= 0) {
            rt = cap.match(reEnum)[1]
        } else if (cap.indexOf('struct') >= 0) {
            rt = cap.match(reStruct)[1]
        } else if (cap.indexOf('library') >= 0) {
            rt = cap.match(reLibrary)[1]
        } else if (cap.indexOf('contract') >= 0) {
            rt = cap.match(reContract)[1]
        }
        rt = rt || cap.match(reRetType)[0]

        const rl = cap.match(/calldata|memory/)
        if (rl) rt += ' ' + rl[0]

        if (/\]$/.test(rt) || rt === 'string') rt += ' memory'
        return rt
    }
    return ''
}

function compile (session) {
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
                    const srcStr = fs.readFileSync(p, 'utf8')
                    return { contents: srcStr }
                }
            } catch (err) {
                console.error(err)
            }
        }
        return { error: `File not found in:\n${paths.join('\n')}` }
    }

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
        const out = JSON.parse(solc.compile(inp, { import: importCallback }))
        return out
    }

    function firstError (errors) {
        for (let i = 0; i < errors.length; i++) {
            const err = errors[i]
            if (err.severity === 'error') return err
        }
        return null
    }

    let error = null
    let retType = 'int'
    let src = sol(session, retType)
    let res = trial(src)

    // trial for return type
    if (res.errors && (error = firstError(res.errors))) {
        retType = getRetType(error.message)
        if (retType) {
            src = sol(session, retType)
            res = trial(src)
        }
    }

    // trial for mutability modifier
    if (res.errors && (error = firstError(res.errors))) {
        if (error.message.indexOf('Function cannot be declared as view') >= 0) {
            const MAY_MUTATE = true
            src = sol(session, retType, MAY_MUTATE)
            res = trial(src)
        }
    }

    return res.errors && (error = firstError(res.errors))
        ? { src, res: [error, null] }
        : { src, res: [null, res.contracts[SRC][CON]] }
}

module.exports = {
    compile,
}
