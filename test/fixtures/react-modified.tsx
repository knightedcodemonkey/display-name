import React, { memo, forwardRef } from 'react'

const Foo = () => {
  return <div>foo</div>
}

const Bar = function Bar(props) {
  return <span>stuff</span>
}

const Baz = function (props) {
  return <p>baz</p>
}

const Qux = memo(() => {
  return (
    <div>
      {'qux'}
      <span>qux</span>
    </div>
  )
})
Qux.displayName = 'Qux'

const Quxx = memo(
  forwardRef<HTMLDivElement, object>((props, ref) => {
    return <div ref={ref}>quxx</div>
  }),
)

const Ref = forwardRef<HTMLDivElement, object>((props, ref) => {
  return <div ref={ref}>ref</div>
})
Ref.displayName = 'Ref'

const NestedMemo = () => {
  const NestedChild = memo(() => {
    return <div>nested</div>
  })
  NestedChild.displayName = 'NestedChild'

  return <NestedChild />
}
const NestedForwardRef = () => {
  const NestedChild = forwardRef<HTMLDivElement, object>((props, ref) => {
    return <div ref={ref}>nested</div>
  })

  return <NestedChild />
}
const FuncExpr = memo(function () {
  return <div>func expr</div>
})
FuncExpr.displayName = 'FuncExpr'
const NamedFuncExpr = memo(function NamedFuncExpr() {
  return <div>named func expr</div>
})
const NoJsx = memo(() => {
  return 'no jsx'
})
NoJsx.displayName = 'NoJsx'
const ReactMemo = React.memo(() => {
  return <div>react memo</div>
})
ReactMemo.displayName = 'ReactMemo'
const ReactForwardRef = React.forwardRef<HTMLDivElement, object>((props, ref) => {
  return <div ref={ref}>react forward ref</div>
})
ReactForwardRef.displayName = 'ReactForwardRef'
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
NestedDisplayName.displayName = 'NestedDisplayName'
NestedDisplayName.Nested.displayName = 'NestedDisplayName.Nested'

const MissingNestedDisplayName = {
  Nested: memo(() => {
    return <div>missing nested display name</div>
  }),
}
MissingNestedDisplayName.displayName = 'MissingNestedDisplayName'

type ForwardRefObject = {
  forwardRef: (cb: (props: object, ref: object) => React.ReactNode) => React.ReactNode
}
const MixedShadowed = function () {
  const memo = (cb: () => React.ReactNode) => cb()
  const { forwardRef } = { forwardRef: () => null } as ForwardRefObject
  const [React] = [{ memo, forwardRef }] as const

  const Comp = memo(() => {
    return <div>shadowed</div>
  })
  const ReactMemo = React.memo(() => null)
  const ReactForward = React.forwardRef((props, ref) => {
    return `${props} ${ref}`
  })
  const OtherComp = forwardRef((props, ref) => `${props} ${ref}`)

  return [Comp, ReactMemo, ReactForward, OtherComp]
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
A.displayName = 'A'
B.displayName = 'B'

export {
  Foo,
  Bar,
  Baz,
  Qux,
  Quxx,
  Ref,
  NestedMemo,
  NestedForwardRef,
  FuncExpr,
  NamedFuncExpr,
  NoJsx,
  ReactMemo,
  ReactForwardRef,
  ReactForwardRefNested,
  MissingNestedDisplayName,
  Mixed,
  Shadowed,
  A,
  B,
}
