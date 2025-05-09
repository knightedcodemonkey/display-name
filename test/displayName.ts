import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { resolve } from 'node:path'
import { writeFile } from 'node:fs/promises'

import { modify, modifyFile } from '../src/displayName.js'

describe('@knighted/displayName', () => {
  it('transforms files', async () => {
    const filename = resolve(import.meta.dirname, './fixtures/react.tsx')
    const code = await modifyFile(filename)

    await writeFile(resolve(import.meta.dirname, './fixtures/react-modified.tsx'), code)
  })

  it.skip('ignores namespaced components with a displayName', async () => {
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

  it.skip('preserves ending semicolon', async () => {
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

  it.skip('works with retyped memo, generics and named function expressions', async () => {
    const file = resolve(import.meta.dirname, './fixtures/typed.tsx')
    const code = await modifyFile(file)

    assert.ok(code.indexOf("Items.displayName = 'Items'") === -1)
    assert.ok(code.indexOf('displayName') === -1)
  })
})
