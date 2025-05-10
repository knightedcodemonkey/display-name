import React, { memo, forwardRef, type FC } from 'react'

const Foo = () => {
  return <div>foo</div>
}

const Bar: FC = function Bar(props) {
  return <span>stuff</span>
}

const Baz = function (props: object) {
  return <p>baz</p>
}

const Memo = memo(() => {
  return (
    <div>
      {'qux'}
      <span>qux</span>
    </div>
  )
})

const MemoWrappedForward = memo(
  forwardRef<HTMLDivElement, object>((props, ref) => {
    return <div ref={ref}>quxx</div>
  }),
)

const ForwardRef = forwardRef<HTMLDivElement, object>((props, ref) => {
  return <div ref={ref}>ref</div>
})

const NestedMemo = () => {
  const NestedChild = memo(() => {
    return <div>nested</div>
  })

  return <NestedChild />
}
const NestedForwardRef = () => {
  const NestedChildDuex = forwardRef<HTMLDivElement, object>((props, ref) => {
    return <div ref={ref}>nested</div>
  })

  return <NestedChildDuex />
}
const FuncExpr = memo(function () {
  return <div>func expr</div>
})
const NamedFuncExpr = memo(function NamedFuncExpr() {
  return <div>named func expr</div>
})
const NoJsx = memo(() => {
  return 'no jsx'
})
const ReactMemo = React.memo(() => {
  return <div>react memo</div>
})
const ReactForwardRef = React.forwardRef<HTMLDivElement, object>((props, ref) => {
  return <div ref={ref}>react forward ref</div>
})
const ReactForwardRefNested = React.memo(
  React.forwardRef<HTMLDivElement, object>((props, ref) => {
    return <div ref={ref}>react forward ref nested</div>
  }),
)
const DisplayName = memo(() => {
  return <div>display name</div>
})
DisplayName.displayName = 'DisplayName'

const NestedDisplayName = {
  Nested: memo(() => {
    return <div>nested display name</div>
  }),
}
NestedDisplayName.Nested.displayName = 'NestedDisplayName.Nested'

const MissingNestedDisplayName = {
  Nested: memo(() => {
    return <div>missing nested display name</div>
  }),
}

const NestedMissingDisplayName = {
  Outer: {
    NestedDuex: memo(() => null),
  },
}

type ForwardRefObject = {
  forwardRef: (cb: (props: object, ref: object) => React.ReactNode) => React.ReactNode
}
/**
 * There is a bug in eslint-plugin-react that causes false positives
 * when React is shadowed by a variable in the same scope.
 *
 * @see https://github.com/jsx-eslint/eslint-plugin-react/issues/3924
 */
const MixedShadowed = function () {
  const memo = (cb: () => React.ReactNode) => cb()
  const { forwardRef } = { forwardRef: () => null } as ForwardRefObject
  const [React] = [{ memo, forwardRef }] as const

  const ShadowedMemo = memo(() => {
    return <div>shadowed</div>
  })
  // eslint-disable-next-line react/display-name
  const ShadowedReactMemo = React.memo(() => null)
  // eslint-disable-next-line react/display-name
  const ShadowedReactForward = React.forwardRef((props, ref) => {
    return `${props} ${ref}`
  })
  const ShadowedForward = forwardRef((props, ref) => `${props} ${ref}`)

  return [ShadowedMemo, ShadowedReactMemo, ShadowedReactForward, ShadowedForward]
}

const Shadowed = function () {
  const memo = (cb: () => void) => cb()

  const Comp = memo(() => {
    return <div>shadowed</div>
  })
}

const Mixed = memo(
  React.forwardRef<HTMLDivElement, object>((props, ref) => {
    return <div ref={ref}>mixed</div>
  }),
)

const A = memo(() => 'A'),
  B = forwardRef((props, ref) => `${props} ${ref}`)

export {
  Foo,
  Bar,
  Baz,
  Memo,
  MemoWrappedForward,
  ForwardRef,
  NestedMemo,
  NestedForwardRef,
  FuncExpr,
  NamedFuncExpr,
  NoJsx,
  ReactMemo,
  ReactForwardRef,
  ReactForwardRefNested,
  MissingNestedDisplayName,
  NestedMissingDisplayName,
  Mixed,
  Shadowed,
  A,
  B,
}
