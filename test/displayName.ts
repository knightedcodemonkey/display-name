import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { resolve } from 'node:path'
import { rm, writeFile } from 'node:fs/promises'
import { spawnSync } from 'node:child_process'

import { modify, modifyFile } from '../src/displayName.js'

describe('@knighted/displayName', () => {
  it('transforms files', async t => {
    const read = resolve(import.meta.dirname, './fixtures/react.tsx')
    const write = resolve(import.meta.dirname, './fixtures/react-modified.tsx')
    const code = await modifyFile(read)

    t.after(async () => {
      await rm(write, { force: true })
    })

    await writeFile(write, code)

    // Does not needlessly add displayName
    assert.ok(code.indexOf("Foo.displayName = 'Foo'") === -1)
    assert.ok(code.indexOf("NamedFuncExpr.displayName = 'NamedFuncExpr'") === -1)

    // Ignored forwardRef wrapped in memo
    assert.ok(
      code.indexOf("MemoWrappedForward.displayName = 'MemoWrappedForward'") === -1,
    )

    // Ignores shadowed React/memo/forwardRef
    assert.ok(code.indexOf("ShadowedMemo.displayName = 'ShadowedMemo'") === -1)
    assert.ok(code.indexOf("ShadowedReactMemo.displayName = 'ShadowedReactMemo'") === -1)
    assert.ok(
      code.indexOf("ShadowedReactForward.displayName = 'ShadowedReactForward'") === -1,
    )
    assert.ok(code.indexOf("ShadowedForward.displayName = 'ShadowedForward'") === -1)

    // Adds displayName to memo/forwardRef
    assert.ok(code.indexOf("Memo.displayName = 'Memo'") !== -1)
    assert.ok(code.indexOf("ForwardRef.displayName = 'ForwardRef'") !== -1)

    // Adds displayName to React.memo/React.forwardRef
    assert.ok(code.indexOf("ReactMemo.displayName = 'ReactMemo'") !== -1)
    assert.ok(code.indexOf("ReactForwardRef.displayName = 'ReactForwardRef'") !== -1)

    // Correctly identifies namespaced displayNames already present
    assert.equal(
      [
        ...code.matchAll(
          /NestedDisplayName.Nested.displayName = 'NestedDisplayName.Nested'/g,
        ),
      ].length,
      1,
    )

    const { status: lint } = spawnSync('eslint', [write], { stdio: 'inherit' })
    assert.equal(lint, 0)
    const { status: types } = spawnSync(
      'tsc',
      ['--noEmit', '--project', 'test/tsconfig.json'],
      { stdio: 'inherit' },
    )
    assert.equal(types, 0)
  })

  it('works with retyped memo, generics and named function expressions', async t => {
    const read = resolve(import.meta.dirname, './fixtures/typed.tsx')
    const write = resolve(import.meta.dirname, './fixtures/typed-modified.tsx')
    const code = await modifyFile(read)

    t.after(async () => {
      await rm(write, { force: true })
    })

    await writeFile(write, code)

    assert.ok(code.indexOf("Items.displayName = 'Items'") === -1)
    const { status: lint } = spawnSync('eslint', [write], { stdio: 'inherit' })
    assert.equal(lint, 0)
    const { status: types } = spawnSync(
      'tsc',
      ['--noEmit', '--project', 'test/tsconfig.json'],
      { stdio: 'inherit' },
    )
    assert.equal(types, 0)
  })

  it('works with lists', async t => {
    const read = resolve(import.meta.dirname, './fixtures/list.tsx')
    const write = resolve(import.meta.dirname, './fixtures/list-modified.tsx')
    const code = await modifyFile(read)

    t.after(async () => {
      await rm(write, { force: true })
    })

    await writeFile(write, code)

    assert.equal([...code.matchAll(/List.displayName = 'List'/g)].length, 1)
    const { status: lint } = spawnSync('eslint', [write], { stdio: 'inherit' })
    assert.equal(lint, 0)
    const { status: types } = spawnSync(
      'tsc',
      ['--noEmit', '--project', 'test/tsconfig.json'],
      { stdio: 'inherit' },
    )
    assert.equal(types, 0)
  })

  it('requires memo, forwardRef or React to be in scope', async () => {
    const components = `
      const Foo = memo(() => {
        return <div>foo</div>
      })
      const Bar = forwardRef(() => {
        return <span>bar</span>
      })
      const Baz = React.memo(() => {
        return <p>baz</p>
      })
      const Qux = React.forwardRef(() => {
        return <p>qux</p>
      })
    `
    let code = await modify(components)

    assert.ok(code.indexOf('Foo.displayName = "Foo"') === -1)
    assert.ok(code.indexOf('Bar.displayName = "Bar"') === -1)
    assert.ok(code.indexOf('Baz.displayName = "Baz"') === -1)
    assert.ok(code.indexOf('Qux.displayName = "Qux"') === -1)

    let src = `
      import React, { memo, forwardRef } from 'react'
      ${components}
    `
    code = await modify(src)

    assert.ok(code.indexOf("Foo.displayName = 'Foo'") !== -1)
    assert.ok(code.indexOf("Bar.displayName = 'Bar'") !== -1)
    assert.ok(code.indexOf("Baz.displayName = 'Baz'") !== -1)
    assert.ok(code.indexOf("Qux.displayName = 'Qux'") !== -1)

    // It ignores shadowed React/memo/forwardRef
    src = `
      import React, { memo, forwardRef } from 'react'
      
      function Shadow() {
        const memo = (cb) => cb()
        const forwardRef = (cb) => cb()
        const React = { memo, forwardRef }

        ${components}
      }
    `

    code = await modify(src)
    assert.ok(code.indexOf("Foo.displayName = 'Foo'") === -1)
    assert.ok(code.indexOf("Bar.displayName = 'Bar'") === -1)
    assert.ok(code.indexOf("Baz.displayName = 'Baz'") === -1)
    assert.ok(code.indexOf("Qux.displayName = 'Qux'") === -1)

    src = `
      import { memo } from 'react'
      ${components}
    `
    code = await modify(src)
    assert.ok(code.indexOf("Foo.displayName = 'Foo'") !== -1)
    assert.ok(code.indexOf("Bar.displayName = 'Bar'") === -1)
    assert.ok(code.indexOf("Baz.displayName = 'Baz'") === -1)
    assert.ok(code.indexOf("Qux.displayName = 'Qux'") === -1)

    src = `
      import { forwardRef } from 'react'
      ${components}
    `
    code = await modify(src)
    assert.ok(code.indexOf("Foo.displayName = 'Foo'") === -1)
    assert.ok(code.indexOf("Bar.displayName = 'Bar'") !== -1)
    assert.ok(code.indexOf("Baz.displayName = 'Baz'") === -1)
    assert.ok(code.indexOf("Qux.displayName = 'Qux'") === -1)

    src = `
      import React from 'react'
      ${components}
    `
    code = await modify(src)
    assert.ok(code.indexOf("Foo.displayName = 'Foo'") === -1)
    assert.ok(code.indexOf("Bar.displayName = 'Bar'") === -1)
    assert.ok(code.indexOf("Baz.displayName = 'Baz'") !== -1)
    assert.ok(code.indexOf("Qux.displayName = 'Qux'") !== -1)
  })

  it('has option to add displayName for wrapped forwardRef', async () => {
    const src = `
      import { forwardRef, memo } from 'react'

      const WrappedForwardRef = memo(forwardRef(() => {
        return <div>foo</div>
      }))
    `
    let code = await modify(src, { modifyNestedForwardRef: true })

    assert.ok(code.indexOf("WrappedForwardRef.displayName = 'WrappedForwardRef'") !== -1)
    code = await modify(src, { modifyNestedForwardRef: false })
    assert.ok(code.indexOf("WrappedForwardRef.displayName = 'WrappedForwardRef'") === -1)
  })

  it('works with aliased React/memo/forwardRef', async () => {
    let src = `
      import { memo as me, forwardRef as fr } from 'react'

      const Foo = me(() => {
        return <div>foo</div>
      })
      const Bar = fr(() => {
        return <span>bar</span>
      })
      const Baz = memo(() => {
        return <p>baz</p>
      })
    `
    let code = await modify(src)

    assert.ok(code.indexOf("Foo.displayName = 'Foo'") !== -1)
    assert.ok(code.indexOf("Bar.displayName = 'Bar'") !== -1)
    assert.ok(code.indexOf("Baz.displayName = 'Baz'") === -1)

    src = `
      import ReactAlias from 'react'

      const Foo = ReactAlias.memo(() => {
        return <div>foo</div>
      })
      const Bar = ReactAlias.forwardRef(() => {
        return <span>bar</span>
      })
      const Baz = React.memo(() => {
        return <p>baz</p>
      })
    `
    code = await modify(src)
    assert.ok(code.indexOf("Foo.displayName = 'Foo'") !== -1)
    assert.ok(code.indexOf("Bar.displayName = 'Bar'") !== -1)
    assert.ok(code.indexOf("Baz.displayName = 'Baz'") === -1)

    src = `
      import ReactAlias, { memo as me, forwardRef as fr } from 'react'

      const Foo = ReactAlias.me(() => {
        return <div>foo</div>
      })
      const Bar = ReactAlias.fr(() => {
        return <span>bar</span>
      })
      const Baz = ReactAlias.memo(() => {
        return <p>baz</p>
      })
      const Qux = ReactAlias.forwardRef(() => {
        return <p>qux</p>
      })
      const Qux2 = me(() => {
        return <p>qux2</p>
      })
      const Qux3 = fr(() => {
        return <p>qux3</p>
      })
    `
    code = await modify(src)
    assert.ok(code.indexOf("Foo.displayName = 'Foo'") === -1)
    assert.ok(code.indexOf("Bar.displayName = 'Bar'") === -1)
    assert.ok(code.indexOf("Baz.displayName = 'Baz'") !== -1)
    assert.ok(code.indexOf("Qux.displayName = 'Qux'") !== -1)
    assert.ok(code.indexOf("Qux2.displayName = 'Qux2'") !== -1)
    assert.ok(code.indexOf("Qux3.displayName = 'Qux3'") !== -1)
  })

  it('works with params shadowing', async () => {
    const src = `
      import { memo, forwardRef, type ReactNode } from 'react'

      function wrapper(cb) {
        return cb()
      }

      function ShadowedMemoParam(memo, forwardRef = memo) {
        const Foo = memo(() => {
          return <div>foo</div>
        })
      }

      function shadowedForwardRefParam(forwardRef = wrapper) {
        const Bar = forwardRef((props, ref) => {
          return <div>foo</div>
        })
      }
      
      function shadowedMemoRestParam(...rest) {
        const memo = rest[0]
        const Baz = memo(() => {
          return <div>foo</div>
        })
      }

      function shadowingFuncs() {
        function memo(cb) {
          return cb()
        }
        const Qux = memo(() => {
          return <div>foo</div>
        })
        const Expr = function forwardRef(cb) {
          const Quxx = forwardRef(() => {
            return <div>foo</div>
          })
          return cb(Quxx)
        }
      }
      
      function shadowTSParamProperty(public memo: () => ReactNode) {
        const Quxxx = memo(() => {
          return <div>foo</div>
        })
      }
      
      const Memo = memo(() => {
        return <div>foo</div>
      })
    `
    const code = await modify(src)

    assert.ok(code.indexOf("Foo.displayName = 'Foo'") === -1)
    assert.ok(code.indexOf("Bar.displayName = 'Bar'") === -1)
    assert.ok(code.indexOf("Baz.displayName = 'Baz'") === -1)
    assert.ok(code.indexOf("Qux.displayName = 'Qux'") === -1)
    assert.ok(code.indexOf("Quxx.displayName = 'Quxx'") === -1)
    assert.ok(code.indexOf("Quxxx.displayName = 'Quxxx'") === -1)
    assert.ok(code.indexOf("Memo.displayName = 'Memo'") !== -1)
  })
})
