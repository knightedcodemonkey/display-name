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

  it('requires memo, forwardRef or React.memo/React.forwardRef to be in scope', async () => {
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

  it.skip('works with params shadowing', async t => {
    // @TODO collect coverage for params scopes
    const read = resolve(import.meta.dirname, './fixtures/params.tsx')
    const write = resolve(import.meta.dirname, './fixtures/params-modified.tsx')
    const code = await modifyFile(read)

    t.after(async () => {
      await rm(write, { force: true })
    })

    await writeFile(write, code)
  })
})
