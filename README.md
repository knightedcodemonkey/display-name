# [`@knighted/display-name`](https://www.npmjs.com/package/@knighted/display-name)

![CI](https://github.com/knightedcodemonkey/display-name/actions/workflows/ci.yml/badge.svg)
[![codecov](https://codecov.io/gh/knightedcodemonkey/display-name/graph/badge.svg?token=R2GF8WJmXE)](https://codecov.io/gh/knightedcodemonkey/display-name)
[![NPM version](https://img.shields.io/npm/v/@knighted/display-name.svg)](https://www.npmjs.com/package/@knighted/display-name)

A codemod to add `displayName` to React function components.

- Works with TypeScript or JavaScript source code.
- Quickly fix [`react/display-name`](https://github.com/jsx-eslint/eslint-plugin-react/blob/master/docs/rules/display-name.md) lint errors.
- Pass a path to a file, or a string.

## Example

```ts
import { modify } from '@knighted/display-name'

const codemod = await modify(`
  import { memo } from 'react'

  const Foo = () => {
    return <div>foo</div>
  }

  const Bar = memo(function Bar(props) {
    return <span>stuff</span>
  })

  const Baz = memo(() => {
    return <p>baz</p>
  })
`)

console.log(codemod)

/*
import { memo } from 'react'

const Foo = () => {
  return <div>foo</div>
}

const Bar = memo(function Bar(props) {
  return <span>bar</span>
})

const Baz = memo(() => {
  return <p>baz</p>
})
Baz.displayName = 'Baz';
*/
```

You can also pass a filepath instead of a string:

```ts
import { modifyFile } from '@knighted/display-name'

await modifyFile('/path/to/file.tsx')
```
