# [`@knighted/display-name`](https://www.npmjs.com/package/@knighted/display-name)

![CI](https://github.com/knightedcodemonkey/display-name/actions/workflows/ci.yml/badge.svg)
[![codecov](https://codecov.io/gh/knightedcodemonkey/display-name/graph/badge.svg?token=R2GF8WJmXE)](https://codecov.io/gh/knightedcodemonkey/display-name)
[![NPM version](https://img.shields.io/npm/v/@knighted/walk.svg)](https://www.npmjs.com/package/@knighted/display-name)

A codemod to add `displayName` to React function components.

- Works with TypeScript or JavaScript source code.
- Quickly fix [`react/display-name`](https://github.com/jsx-eslint/eslint-plugin-react/blob/master/docs/rules/display-name.md) lint errors.
- Pass file names or strings.

## Example

**file.tsx**

```tsx
import React, { memo } from 'react'

const Foo = () => {
  return <div>foo</div>
}

const Bar = function Bar(props) {
  return <span>stuff</span>
}

const Baz = memo(() => {
  return <p>baz</p>
})
```

**codemod.ts**

```ts
import { transformFile } from '@knighted/display-name'

const codemod = await transformFile('./file.tsx')

console.log(codemod)

/*
import React, { memo } from 'react'

const Foo = () => {
  return <div>foo</div>
}
Foo.displayName = 'Foo';

const Bar = function Bar(props) {
  return <span>stuff</span>
}

const Baz = memo(() => {
  return <p>baz</p>
})
Baz.displayName = 'Baz';
*/
```

Now optionally run it through your formatter, like [prettier](https://prettier.io/).
