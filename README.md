# [`@knighted/display-name`](https://www.npmjs.com/package/@knighted/display-name)

![CI](https://github.com/knightedcodemonkey/display-name/actions/workflows/ci.yml/badge.svg)
[![codecov](https://codecov.io/gh/knightedcodemonkey/display-name/graph/badge.svg?token=R2GF8WJmXE)](https://codecov.io/gh/knightedcodemonkey/display-name)
[![NPM version](https://img.shields.io/npm/v/@knighted/display-name.svg)](https://www.npmjs.com/package/@knighted/display-name)

A codemod to add `displayName` to React function components.

- Works with TypeScript or JavaScript source code.
- Quickly fix [`react/display-name`](https://github.com/jsx-eslint/eslint-plugin-react/blob/master/docs/rules/display-name.md) lint errors.
- Use `displayName` or a named function expression.
- Pass a path to a file, or a string.

## Example

Given

```tsx
import React, { memo } from 'react'

const Foo = memo(({ a }) => {
  return <>{a}</>
})
const Bar = React.forwardRef((props, ref) => <p ref={ref}>bar</p>)
const Baz = memo(
  React.forwardRef((props, ref) => {
    return <p ref={ref}>baz</p>
  }),
)
```

Then running `modify` on the source code (or `modifyFile` on the file path) results in

```tsx
import React, { memo } from 'react'

const Foo = memo(({ a }) => {
  return <>{a}</>
})
Foo.displayName = 'Foo'
const Bar = React.forwardRef((props, ref) => <p ref={ref}>bar</p>)
Bar.displayName = 'Bar'
const Baz = memo(
  React.forwardRef((props, ref) => {
    return <p ref={ref}>baz</p>
  }),
)
```

If running the codemod against a codebase that has recently added `eslint-plugin-react` you can write a script.

```js
import { globSync } from 'node:fs'
import { writeFile } from 'node:fs/promises'
import { modifyFile } from '@knighted/display-name'

const doCodeMod = async () => {
  for (const file of globSync('**/*.tsx', {
    exclude: ['**/node_modules/**', '**/dist/**', '**/build/**'],
  })) {
    await writeFile(file, await modifyFile(file))
  }
}

await doCodeMod()
```

Then optionally run the results through a formatter like `prettier`.

## Options

There are some options, none are required. Most notably you can choose a `style` for adding the display name. The default is `displayName` which adds a displayName property to the function component, or you can choose `namedFuncExpr` to use a named function expression instead.

```ts
type Options = {
  requirePascal?: boolean
  insertSemicolon?: boolean
  modifyNestedForwardRef?: boolean
  style?: 'displayName' | 'namedFuncExpr'
}
```

For example, using `namedFuncExpr`

```tsx
const Foo = memo(() => <>foo</>)
```

becomes

```tsx
const Foo = memo(function Foo() {
  return <>foo</>
})
```
