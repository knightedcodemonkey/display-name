import { readFile } from 'node:fs/promises'

import { parseSync, type Node } from 'oxc-parser'
import MagicString from 'magic-string'
import { asyncAncestorWalk, ancestorWalk, walk } from '@knighted/walk'

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

const transform = async (source: string) => {
  const ast = parseSync('file.tsx', source)
  const code = new MagicString(source)
  const foundDisplayNames = await collectDisplayNames(ast.program)

  await asyncAncestorWalk(ast.program, {
    async enter(node, ancestors) {
      switch (node.type) {
        case 'FunctionExpression':
        case 'ArrowFunctionExpression':
          {
            const { body, id } = node

            if (body) {
              await walk(body, {
                enter(bodyNode) {
                  switch (bodyNode.type) {
                    case 'JSXElement':
                    case 'JSXFragment':
                      {
                        if (!id) {
                          /**
                           * If the function expression is not named,
                           * use the varible nameto set the displayName.
                           */
                          const declarator = ancestors.findLast(
                            ancestor => ancestor.type === 'VariableDeclarator',
                          )

                          if (
                            declarator &&
                            declarator.id.type === 'Identifier' &&
                            !foundDisplayNames.includes(declarator.id.name)
                          ) {
                            const name = declarator.id.name

                            code.appendRight(
                              declarator.end,
                              `\n${name}.displayName = '${name}';`,
                            )
                          }
                        }
                      }
                      break
                  }
                },
              })
            }
          }
          break
      }
    },
  })

  return code.toString()
}
const transformFile = async (filename: string) => {
  return transform((await readFile(filename, 'utf-8')).toString())
}

export { transform, transformFile }
