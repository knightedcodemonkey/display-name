import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { resolve } from 'node:path'

import { transform, transformFile } from '../src/displayName.js'

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
    const code = await transform(source)

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
    const code = await transform(source)

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
    const code = await transformFile(filename)

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
})
