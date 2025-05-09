import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { resolve } from 'node:path'
import { rm, writeFile } from 'node:fs/promises'
import { spawnSync } from 'node:child_process'

import { modifyFile } from '../src/displayName.js'

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
