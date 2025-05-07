import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { resolve } from 'node:path'

import { modify, modifyFile } from '../src/displayName.js'

describe('@knighted/displayName', () => {
  it('transforms source by adding a react displayName', async () => {
    const source = `
      import React from 'react'
      import { useState } from 'react'

      const Foo = () => {
        const [state, setState] = useState(0)
        return <div>{state}</div>
      }
      Foo.displayName = 'Foo'

      const Bar = function Bar(props) {
        const Inner = () => <span>stuff</span>
        return <><Inner /></>
      }

      const Baz = function (props) {
        return <p>baz</p>
      }

      const Qux = memo(() => {
        return <div>qux</div>
      })

      const Ref = forwardRef((props, ref) => {
        return (
          <div ref={ref}>refs</div>
        )
      })

      export default Foo
      export { Bar, Baz }
    `
    const code = await modify(source)

    assert.equal(
      code.replace(/\s/g, ''),
      `
      import React from 'react'
      import { useState } from 'react'

      const Foo = () => {
        const [state, setState] = useState(0)
        return <div>{state}</div>
      }
      Foo.displayName = 'Foo'

      const Bar = function Bar(props) {
        const Inner = () => <span>stuff</span>
        Inner.displayName = 'Inner';
        return <><Inner /></>
      }

      const Baz = function (props) {
        return <p>baz</p>
      }
      Baz.displayName = 'Baz';

      const Qux = memo(() => {
        return <div>qux</div>
      })
      Qux.displayName = 'Qux';

      const Ref = forwardRef((props, ref) => {
        return (
          <div ref={ref}>refs</div>
        )
      })
      Ref.displayName = 'Ref';

      export default Foo
      export { Bar, Baz }
    `.replace(/\s/g, ''),
    )
  })

  it('ignores namespaced components with a displayName', async () => {
    const source = `
      const Foo = () => {
        const [state, setState] = useState(0)
        return <div>{state}</div>
      }

      const Bar = function Bar(props) {
        const Inner = () => <span>stuff</span>
        return <><Inner /></>
      }
      Bar.Inner.displayName = 'Inner'

      export default Foo
      export { Bar }
    `
    const code = await modify(source)

    assert.equal(
      code.replace(/\s/g, ''),
      `
      const Foo = () => {
        const [state, setState] = useState(0)
        return <div>{state}</div>
      }
      Foo.displayName = 'Foo';

      const Bar = function Bar(props) {
        const Inner = () => <span>stuff</span>
        return <><Inner /></>
      }
      Bar.Inner.displayName = 'Inner'

      export default Foo
      export { Bar }
    `.replace(/\s/g, ''),
    )
  })

  it('transforms files', async () => {
    const filename = resolve(import.meta.dirname, './fixtures/react.tsx')
    const code = await modifyFile(filename)

    assert.equal(
      code.replace(/\s/g, ''),
      `
        import React, { memo } from 'react'

        const Foo = () => {
          return <div>foo</div>
        }
        Foo.displayName = 'Foo';

        const Bar = function Bar(props) {
          return <span>stuff</span>
        }

        const Baz = function (props) {
          return <p>baz</p>
        }
        Baz.displayName = 'Baz';

        const Qux = memo(() => {
          return <div>qux</div>
        })
        Qux.displayName = 'Qux';

        export { Foo, Bar, Baz, Qux }
    `.replace(/\s/g, ''),
    )
  })

  it('does not repeat displayName', async () => {
    const src = `
      const Foo = (props) => {
        return (
          <div>
            {props.foo} bar
            <p>baz</p>
          </div>
        )
      }
    `
    const code = await modify(src)
    assert.equal(
      code.replace(/\s/g, ''),
      `
      const Foo = (props) => {
        return (
          <div>
            {props.foo} bar
            <p>baz</p>
          </div>
        )
      }
      Foo.displayName = 'Foo';
    `.replace(/\s/g, ''),
    )
  })

  it('preserves ending semicolon', async () => {
    const src = `
      const Foo = (props) => {
        return <div>foo</div>
      };
    `
    const code = await modify(src)
    assert.equal(
      code.replace(/\s/g, ''),
      `
      const Foo = (props) => {
        return <div>foo</div>
      };
      Foo.displayName = 'Foo';
    `.replace(/\s/g, ''),
    )
  })

  it('requires pascal names by default', async () => {
    const src = `
      export const createColumns = (
        teams: Team[],
        control: Control<SSOConfigFormData>,
        handleFieldChange: HandleFieldChangeFn,
      ) => [
        columnHelper.accessor(SSOConfigMappingKeys.teamId, {
          id: SSOConfigMappingKeys.teamId,
          header: 'GrowthLoop Team',
          cell: ({ row }) => (
            <Select.FormField
              control={control}
              name={\`mappings.\${row.index}.teamId\` as const}
              clearable={false}
              defaultValue={row.original.teamId}
              onValueChange={() => {
                handleFieldChange()
              }}
            >
              {teams.map(option => (
                <Select.Item key={option.value} value={option.value}>
                  {option.label}
                </Select.Item>
              ))}
            </Select.FormField>
          ),
        }),
      ]
    `
    const code = await modify(src)

    // No modification should be made
    assert.equal(code.replace(/\s/g, ''), src.replace(/\s/g, ''))
  })

  it('has some options', async () => {
    const src = `
      const foo = (props) => {
        return <div>foo</div>
      }
    `
    const code = await modify(src, {
      requirePascal: false,
      insertSemicolon: false,
    })

    assert.equal(
      code.replace(/\s/g, ''),
      `
      const foo = (props) => {
        return <div>foo</div>
      }
      foo.displayName = 'foo'
    `.replace(/\s/g, ''),
    )
  })

  it('works with multiple declarations', async () => {
    const src = `
      const A = () => <>a</>,
      B = () => <>b</>;

      const C = function() {
        return <>c</>
      }
    `
    const code = await modify(src)

    assert.equal(
      code.replace(/\s/g, ''),
      `
        const A = () => <>a</>,
        B = () => <>b</>;
        A.displayName = 'A';
        B.displayName = 'B';

        const C = function() {
          return <>c</>
        }
        C.displayName = 'C';
    `.replace(/\s/g, ''),
    )
  })

  it('works with memo and forwardRef', async () => {
    const src = `
      const Wrapped = memo(forwardRef((props,ref) => {
        return <p>wrapped</p>
      }))
    `
    const code = await modify(src)
    assert.equal(
      code.replace(/\s/g, ''),
      `
      const Wrapped = memo(forwardRef((props,ref) => {
        return <p>wrapped</p>
      }))
      Wrapped.displayName = 'Wrapped';
    `.replace(/\s/g, ''),
    )
  })
})
