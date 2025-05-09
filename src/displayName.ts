import { readFile } from 'node:fs/promises'

import MagicString from 'magic-string'
import { asyncAncestorWalk, ancestorWalk, walk } from '@knighted/walk'
import {
  parseSync,
  type Node,
  type FunctionBody,
  type Expression,
  type VariableDeclarator,
  type CallExpression,
  type IdentifierName,
} from 'oxc-parser'

type Options = {
  requirePascal?: boolean
  insertSemicolon?: boolean
  modifyNestedForwardRef?: boolean
}
type Scope = {
  name: string
  type: string
  pragmas: Set<string>
}

const pascal = /^[A-Z][a-zA-Z0-9]*$/
const isIdentifierName = (node: Node): node is IdentifierName => {
  return node.type === 'Identifier' && typeof node.name === 'string'
}
const collectDisplayNames = async (node: Node) => {
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

          // Consider namespaced components
          if (
            parent.object.type === 'MemberExpression' &&
            parent.object.property.type === 'Identifier'
          ) {
            foundDisplayNames.push(parent.object.property.name)
          }
        }
      }
    },
  })

  return foundDisplayNames
}
/**
 * Useful for preventing mapped JSX lists inside functions from creating
 * a displayName when inside a named function.
 *
 * A simpler fix would be to add the found named function to `foundDisplayNames`
 * but that would prevent reusing a displayName for named functions
 * (which seems like a bad practice overall).
 */
const createsNamedReactFunction = (declarator: VariableDeclarator) => {
  if (declarator.init) {
    if (declarator.init.type === 'FunctionExpression' && declarator.init.id) {
      return true
    }

    if (
      declarator.init.type === 'CallExpression' &&
      declarator.init.arguments.some(arg => arg.type === 'FunctionExpression' && arg.id)
    ) {
      return true
    }
  }

  return false
}
const collectReactPragmas = async (node: Node) => {
  let isReact = false
  let isReactMemo = false
  let isReactForwardRef = false

  await walk(node, {
    enter(node) {
      if (node.type === 'ImportDeclaration' && node.source.value === 'react') {
        for (const specifier of node.specifiers) {
          if (
            specifier.type === 'ImportDefaultSpecifier' &&
            specifier.local.name === 'React'
          ) {
            isReact = true
          }

          if (
            specifier.type === 'ImportSpecifier' &&
            specifier.imported.type === 'Identifier'
          ) {
            if (specifier.imported.name === 'memo' && specifier.local.name === 'memo') {
              isReactMemo = true
            }

            if (
              specifier.imported.name === 'forwardRef' &&
              specifier.local.name === 'forwardRef'
            ) {
              isReactForwardRef = true
            }
          }
        }
      }
    },
  })

  return { isReact, isReactMemo, isReactForwardRef }
}
const isPragmaShadowed = (pragma: 'React' | 'memo' | 'forwardRef', scopes: Scope[]) => {
  for (const scope of scopes) {
    if (scope.pragmas.has(pragma)) {
      console.log('shadowed', scopes)
      return true
    }
  }

  return false
}
const isReactMember = (
  pragma: 'memo' | 'forwardRef',
  node: CallExpression,
  scopes: Scope[],
) => {
  const { callee } = node

  return (
    callee.type === 'MemberExpression' &&
    callee.object.type === 'Identifier' &&
    callee.object.name === 'React' &&
    !isPragmaShadowed('React', scopes) &&
    callee.property.type === 'Identifier' &&
    callee.property.name === pragma
  )
}
const isMemo = (node: CallExpression, scopes: Scope[]) => {
  const { callee } = node

  return (
    (callee.type === 'Identifier' &&
      callee.name === 'memo' &&
      !isPragmaShadowed('memo', scopes)) ||
    isReactMember('memo', node, scopes)
  )
}
const isForwardRef = (node: CallExpression, scopes: Scope[]) => {
  const { callee } = node

  return (
    (callee.type === 'Identifier' &&
      callee.name === 'forwardRef' &&
      !isPragmaShadowed('forwardRef', scopes)) ||
    isReactMember('forwardRef', node, scopes)
  )
}
const hasNestedForwardRef = (node: CallExpression, scopes: Scope[]) => {
  const arg = node.arguments[0]

  return arg.type === 'CallExpression' && isForwardRef(arg, scopes)
}
const isMemoWrapped = (parent: Node, scopes: Scope[]) => {
  return parent.type === 'CallExpression' && isMemo(parent, scopes)
}
const pragmas = ['React', 'memo', 'forwardRef']
const scopeNodes = [
  'FunctionDeclaration',
  'FunctionExpression',
  'ArrowFunctionExpression',
]
const defaultOptions = {
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
  const { isReact, isReactMemo, isReactForwardRef } = await collectReactPragmas(
    ast.program,
  )

  if (isReact || isReactMemo || isReactForwardRef) {
    const foundDisplayNames = await collectDisplayNames(ast.program)
    const opts = {
      ...defaultOptions,
      ...options,
    }
    const addDisplayName = (ancestors: Node[]) => {
      const declaratorIndex = ancestors.findLastIndex(
        ancestor => ancestor.type === 'VariableDeclarator',
      )

      if (declaratorIndex !== -1) {
        const declarator = ancestors[declaratorIndex]

        if (
          declarator.type === 'VariableDeclarator' &&
          declarator.id.type === 'Identifier' &&
          !foundDisplayNames.includes(declarator.id.name)
          //!createsNamedReactFunction(declarator)
        ) {
          const { name } = declarator.id
          const declaration = ancestors[declaratorIndex - 1]

          if (
            declaration.type === 'VariableDeclaration' &&
            (!opts.requirePascal || pascal.test(name))
          ) {
            code.appendRight(
              declaration.end,
              `\n${name}.displayName = '${name}'${opts.insertSemicolon ? ';' : ''}`,
            )
            foundDisplayNames.push(name)
          }
        }
      }
    }
    const scopes: Scope[] = []

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
              if (pragmas.includes(param.name)) {
                scope.pragmas.add(param.name)
              }
            })

          if (
            node.type === 'FunctionExpression' &&
            node.id &&
            pragmas.includes(node.id.name)
          ) {
            scope.pragmas.add(node.id.name)
          }

          // First add the function to any previous scopes
          if (scopes.length > 0 && pragmas.includes(name)) {
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
              if (decl.id.type === 'Identifier' && pragmas.includes(decl.id.name)) {
                scope.pragmas.add(decl.id.name)
              }

              if (decl.id.type === 'ObjectPattern') {
                decl.id.properties.forEach(prop => {
                  if (
                    prop.type === 'Property' &&
                    prop.key.type === 'Identifier' &&
                    pragmas.includes(prop.key.name)
                  ) {
                    scope.pragmas.add(prop.key.name)
                  }
                })
              }

              if (decl.id.type === 'ArrayPattern') {
                decl.id.elements.forEach(element => {
                  if (element?.type === 'Identifier' && pragmas.includes(element.name)) {
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
          if (isMemo(node, scopes)) {
            const nestedForwardRef = hasNestedForwardRef(node, scopes)

            if (!nestedForwardRef || (nestedForwardRef && opts.modifyNestedForwardRef)) {
              addDisplayName(ancestors)
            }
          }

          if (isForwardRef(node, scopes)) {
            if (node.start === 2389) {
              console.log('SCOPES', scopes)
            }
            const parent = ancestors[ancestors.length - 2]
            const memoWrapped = isMemoWrapped(parent, scopes)

            if (!memoWrapped || (memoWrapped && opts.modifyNestedForwardRef)) {
              addDisplayName(ancestors)
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
