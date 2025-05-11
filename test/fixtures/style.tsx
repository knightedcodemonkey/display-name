import React, { memo, forwardRef, FC } from 'react'

type Props = {
  foo: string
}

const arePropsEqual = () => true

const ArrowFuncExpr = memo((props: Props) => (
  <>
    <p>foo</p>
    <p>bar</p>
  </>
))
const ArrowFuncExprForwardRef = forwardRef<HTMLParagraphElement, Props>((props, ref) => {
  return <p ref={ref}>foo</p>
})
const FuncExpr = memo(function (props: Props) {
  return <p>{props.foo}</p>
})
const GeneratorFuncExpr: FC<Props> = memo(function* (props) {
  yield <p>foo</p>
}, arePropsEqual)
const GeneratorSpaceFuncExpr = forwardRef(function* (props: Props) {
  yield <p>foo space</p>
})

const ArrowFuncExprReact = React.memo((props: Props) => <p>foo</p>)
const ArrowFuncExprForwardRefReact = React.forwardRef<HTMLParagraphElement, Props>(
  (props, ref) => {
    return <p ref={ref}>foo</p>
  },
)
const FuncExprReact = React.memo(function (props: Props) {
  return <p>{props.foo}</p>
})
const FuncExprForwardRefReact = React.forwardRef<HTMLParagraphElement, Props>(
  function (props, ref) {
    return <p ref={ref}>{props.foo}</p>
  },
)

// These already have a display name.
const MemoDisplayName = memo((props: Props) => {
  return <p>foo</p>
})
MemoDisplayName.displayName = 'MemoDisplayName'
const NamedFuncExprForwardRef = forwardRef<HTMLParagraphElement, Props>(
  function NamedFuncExprForwardRef(props, ref) {
    return <p ref={ref}>foo</p>
  },
)
const ReactMemoDisplayName = React.memo((props: Props) => {
  return <p>foo</p>
})
ReactMemoDisplayName.displayName = 'ReactMemoDisplayName'
