import { readFile } from 'node:fs/promises'

import MagicString from 'magic-string'
import { asyncAncestorWalk, ancestorWalk, walk } from '@knighted/walk'
import {
  parseSync,
  type Node,
  type CallExpression,
  type IdentifierName,
} from 'oxc-parser'

type Options = {
  requirePascal?: boolean
  insertSemicolon?: boolean
  modifyNestedForwardRef?: boolean
  style?: 'displayName' | 'namedFuncExpr'
}
type Scope = {
  name: string
  type: string
  pragmas: Set<string>
}
type Pragmas = {
  react: string
  memo: string
  forwardRef: string
}

const pascal = /^[A-Z][a-zA-Z0-9]*$/
const isIdentifierName = (node: Node): node is IdentifierName => {
  return node.type === 'Identifier' && typeof node.name === 'string'
}
const collectDisplayNames = async (node: Node, code: MagicString) => {
  const foundDisplayNames: string[] = []

  await ancestorWalk(node, {
    enter(node, ancestors) {
      const parent = ancestors[ancestors.length - 2]
      const grandparent = ancestors[ancestors.length - 3]

      if (node.type === 'Identifier' && node.name === 'displayName') {
        if (
          parent.type === 'MemberExpression' &&
          grandparent.type === 'AssignmentExpression' &&
          grandparent.left === parent
        ) {
          if (parent.object.type === 'Identifier') {
            foundDisplayNames.push(parent.object.name)
          }

          if (parent.object.type === 'MemberExpression') {
            foundDisplayNames.push(code.slice(parent.object.start, parent.object.end))
          }
        }
      }
    },
  })

  return foundDisplayNames
}
const detectReactPragmas = async (node: Node) => {
  let react = ''
  let memo = ''
  let forwardRef = ''

  await walk(node, {
    enter(node) {
      if (node.type === 'ImportDeclaration' && node.source.value === 'react') {
        for (const specifier of node.specifiers) {
          if (specifier.type === 'ImportDefaultSpecifier') {
            react = specifier.local.name
          }

          if (
            specifier.type === 'ImportSpecifier' &&
            specifier.imported.type === 'Identifier'
          ) {
            if (specifier.imported.name === 'memo') {
              memo = specifier.local.name
            }

            if (specifier.imported.name === 'forwardRef') {
              forwardRef = specifier.local.name
            }
          }
        }
      }
    },
  })

  return { react, memo, forwardRef }
}
const isPragmaShadowed = (pragma: string, scopes: Scope[]) => {
  for (const scope of scopes) {
    if (scope.pragmas.has(pragma)) {
      return true
    }
  }

  return false
}
const isReactMember = (
  pragma: string,
  node: CallExpression,
  pragmas: Pragmas,
  scopes: Scope[],
) => {
  const { callee } = node

  return (
    callee.type === 'MemberExpression' &&
    callee.object.type === 'Identifier' &&
    callee.object.name === pragmas.react &&
    callee.property.type === 'Identifier' &&
    callee.property.name === pragma &&
    !isPragmaShadowed(pragmas.react, scopes)
  )
}
const isMemo = (node: CallExpression, pragmas: Pragmas, scopes: Scope[]) => {
  const { callee } = node

  return (
    (callee.type === 'Identifier' &&
      callee.name === pragmas.memo &&
      !isPragmaShadowed(pragmas.memo, scopes)) ||
    isReactMember('memo', node, pragmas, scopes)
  )
}
const isForwardRef = (node: CallExpression, pragmas: Pragmas, scopes: Scope[]) => {
  const { callee } = node

  return (
    (callee.type === 'Identifier' &&
      callee.name === pragmas.forwardRef &&
      !isPragmaShadowed(pragmas.forwardRef, scopes)) ||
    isReactMember('forwardRef', node, pragmas, scopes)
  )
}
const isMemoWrapped = (parent: Node, pragmas: Pragmas, scopes: Scope[]) => {
  return parent.type === 'CallExpression' && isMemo(parent, pragmas, scopes)
}
const scopeNodes = [
  'FunctionDeclaration',
  'FunctionExpression',
  'ArrowFunctionExpression',
]
const defaultOptions = {
  style: 'displayName',
  requirePascal: true,
  insertSemicolon: true,
  /**
   * Whether to add a displayName to nested forwardRef components,
   * .i.e. memo(forwardRef(() => {})).
   *
   * Nested React.forwardRef should be accepted (meaning not requiring a displayName)
   * in React versions in the following range: ^0.14.10 || ^15.7.0 || >= 16.12.0
   */
  modifyNestedForwardRef: false,
} satisfies Options
const modify = async (source: string, options: Options = defaultOptions) => {
  const ast = parseSync('file.tsx', source)
  const code = new MagicString(source)
  const { react, memo, forwardRef } = await detectReactPragmas(ast.program)
  const pragmas = { react, memo, forwardRef } satisfies Pragmas
  const isPragma = (name: string) => {
    return name === react || name === memo || name === forwardRef
  }

  if (react || memo || forwardRef) {
    const scopes: Scope[] = []
    const foundDisplayNames = await collectDisplayNames(ast.program, code)
    const opts = {
      ...defaultOptions,
      ...options,
    }
    const addDisplayName = (
      ancestors: Node[],
      call: CallExpression,
      memoWrapped = false,
    ) => {
      const declaratorIndex = ancestors.findLastIndex(
        ancestor => ancestor.type === 'VariableDeclarator',
      )

      if (declaratorIndex !== -1) {
        const declarator = ancestors[declaratorIndex]

        if (
          declarator.type === 'VariableDeclarator' &&
          declarator.id.type === 'Identifier' &&
          declarator.init
        ) {
          let { name } = declarator.id
          const declName = name
          const update = (displayName: string) => {
            const declaration = ancestors[declaratorIndex - 1]

            if (
              declaration.type === 'VariableDeclaration' &&
              (!opts.requirePascal || pascal.test(declName))
            ) {
              if (opts.style === 'namedFuncExpr') {
                const func = call.arguments[0]

                switch (func.type) {
                  case 'FunctionExpression':
                    {
                      const params = func.params.map(param =>
                        code.slice(param.start, param.end),
                      )
                      /**
                       * Inside a function expression, the body is always a block statement.
                       * I think the types for oxc-parser can be improved.
                       * @see https://github.com/oxc-project/oxc/pull/9128#issuecomment-2870220468
                       */
                      const body = func.body
                        ? code.slice(func.body.start, func.body.end)
                        : '{}'
                      const paramsWithBody = `${displayName}(${params.join(', ')}) ${body}`

                      code.update(
                        func.start,
                        func.end,
                        func.generator
                          ? `function* ${paramsWithBody}`
                          : `function ${paramsWithBody}`,
                      )
                    }
                    break
                  case 'ArrowFunctionExpression':
                    {
                      const params = func.params.map(param =>
                        code.slice(param.start, param.end),
                      )
                      const body = code.slice(func.body.start, func.body.end)
                      /**
                       * If the body is an expression, it is the implicit return value.
                       * @see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Functions/Arrow_functions#function_body
                       */
                      const bodyBlock =
                        func.body.type === 'BlockStatement'
                          ? body
                          : `{\nreturn ${body}\n}`

                      code.update(
                        func.start,
                        func.end,
                        `function ${displayName}(${params.join(', ')}) ${bodyBlock}`,
                      )
                    }
                    break
                }
              } else {
                code.appendRight(
                  declaration.end,
                  `\n${displayName}.displayName = '${displayName}'${opts.insertSemicolon ? ';' : ''}`,
                )
              }

              foundDisplayNames.push(displayName)
            }
          }

          // Pragma directly assigned to a variable or forwardRef wrapped with memo
          if (
            (declarator.init === call || memoWrapped) &&
            !foundDisplayNames.includes(name)
          ) {
            update(name)
          }

          // Pragma assigned to some object property
          if (declarator.init.type === 'ObjectExpression') {
            let parent = ancestors[ancestors.length - 2]
            const keys: string[] = []

            while (parent && parent !== declarator) {
              if (parent.type === 'Property' && parent.key.type === 'Identifier') {
                keys.push(parent.key.name)
              }

              parent = ancestors[ancestors.indexOf(parent) - 1]
            }

            name =
              opts.style === 'displayName'
                ? `${name}.${keys.reverse().join('.')}`
                : keys[0]

            if (!foundDisplayNames.includes(name)) {
              update(name)
            }
          }
        }
      }
    }

    await asyncAncestorWalk(ast.program, {
      async enter(node, ancestors) {
        if (
          node.type === 'FunctionDeclaration' ||
          node.type === 'FunctionExpression' ||
          node.type === 'ArrowFunctionExpression'
        ) {
          const name = node.id ? node.id.name : 'anonymous'
          const scope = { name, type: 'Function', pragmas: new Set<string>() }

          node.params
            .map(param => {
              if (param.type === 'TSParameterProperty') {
                return param.parameter
              }

              if (param.type === 'RestElement') {
                return param.argument
              }

              if (param.type === 'AssignmentPattern') {
                return param.left
              }

              return param
            })
            .filter(isIdentifierName)
            .forEach(param => {
              if (isPragma(param.name)) {
                scope.pragmas.add(param.name)
              }
            })

          if (node.type === 'FunctionExpression' && node.id && isPragma(node.id.name)) {
            scope.pragmas.add(node.id.name)
          }

          // First add the function to any previous scopes
          if (scopes.length > 0 && isPragma(name)) {
            scopes[scopes.length - 1].pragmas.add(name)
          }

          // Then add the function scope to the scopes stack
          scopes.push(scope)
        }

        // Add VariableDeclarations to the scopes stack
        if (node.type === 'VariableDeclaration') {
          if (scopes.length > 0) {
            const scope = scopes[scopes.length - 1]

            node.declarations.forEach(decl => {
              if (decl.id.type === 'Identifier' && isPragma(decl.id.name)) {
                scope.pragmas.add(decl.id.name)
              }

              if (decl.id.type === 'ObjectPattern') {
                decl.id.properties.forEach(prop => {
                  if (
                    prop.type === 'Property' &&
                    prop.key.type === 'Identifier' &&
                    isPragma(prop.key.name)
                  ) {
                    scope.pragmas.add(prop.key.name)
                  }
                })
              }

              if (decl.id.type === 'ArrayPattern') {
                decl.id.elements.forEach(element => {
                  if (element?.type === 'Identifier' && isPragma(element.name)) {
                    scope.pragmas.add(element.name)
                  }
                })
              }
            })
          }
        }

        if (
          node.type === 'CallExpression' &&
          node.arguments.length > 0 &&
          (node.arguments[0].type === 'FunctionExpression' ||
            node.arguments[0].type === 'ArrowFunctionExpression') &&
          !node.arguments[0].id
        ) {
          if (isMemo(node, pragmas, scopes)) {
            addDisplayName(ancestors, node)
          }

          if (isForwardRef(node, pragmas, scopes)) {
            const parent = ancestors[ancestors.length - 2]
            const memoWrapped = isMemoWrapped(parent, pragmas, scopes)

            if (!memoWrapped || opts.modifyNestedForwardRef) {
              addDisplayName(ancestors, node, memoWrapped)
            }
          }
        }
      },
      async leave(node) {
        if (scopeNodes.includes(node.type)) {
          scopes.pop()
        }
      },
    })
  }

  return code.toString()
}
const modifyFile = async (filename: string, options: Options = defaultOptions) => {
  return modify((await readFile(filename, 'utf-8')).toString(), options)
}

export { modify, modifyFile }
export type { Options }
