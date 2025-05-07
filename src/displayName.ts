import { readFile } from 'node:fs/promises'

import MagicString from 'magic-string'
import { asyncAncestorWalk, ancestorWalk, walk } from '@knighted/walk'
import { parseSync, type Node, type FunctionBody, type Expression } from 'oxc-parser'

type Options = {
  requirePascal?: boolean
  insertSemicolon?: boolean
}

const pascal = /^[A-Z][a-zA-Z0-9]*$/
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
const hasJsx = async (body: FunctionBody | Expression) => {
  let found = false

  await walk(body, {
    enter(node) {
      if (!found && (node.type === 'JSXElement' || node.type === 'JSXFragment')) {
        found = true
      }
    },
  })

  return found
}
const defaultOptions = {
  requirePascal: true,
  insertSemicolon: true,
} satisfies Options
const modify = async (source: string, options: Options = defaultOptions) => {
  const ast = parseSync('file.tsx', source)
  const code = new MagicString(source)
  const foundDisplayNames = await collectDisplayNames(ast.program)
  const opts = {
    ...defaultOptions,
    ...options,
  }

  await asyncAncestorWalk(ast.program, {
    async enter(node, ancestors) {
      switch (node.type) {
        case 'FunctionExpression':
        case 'ArrowFunctionExpression':
          {
            const { body, id } = node

            if (!id && body && (await hasJsx(body))) {
              /**
               * If the function expression is not named,
               * use the varible name to set the displayName.
               */
              const declaratorIndex = ancestors.findLastIndex(
                ancestor => ancestor.type === 'VariableDeclarator',
              )

              if (declaratorIndex !== -1) {
                const declarator = ancestors[declaratorIndex]

                if (
                  declarator.type === 'VariableDeclarator' &&
                  declarator.id.type === 'Identifier' &&
                  !foundDisplayNames.includes(declarator.id.name)
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
                  }
                }
              }
            }
          }
          break
      }
    },
  })

  return code.toString()
}
const modifyFile = async (filename: string, options: Options = defaultOptions) => {
  return modify((await readFile(filename, 'utf-8')).toString(), options)
}

export { modify, modifyFile }
export type { Options }
