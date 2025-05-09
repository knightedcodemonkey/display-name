import React, { memo, forwardRef } from 'react'

type Cb = () => React.ReactNode
type FwCb = (props: object, ref: object) => React.ReactNode
const Shadow = function () {
  const inner = (memo: (cb: Cb) => void, forwardRef: (cb: FwCb) => void) => {
    const ShadowedMemo = memo(() => {
      return <div>shadowed</div>
    })
    const ShadowedForward = forwardRef((props, ref) => {
      return `${props} ${ref}`
    })
  }

  return inner(
    () => {},
    () => {},
  )
}
