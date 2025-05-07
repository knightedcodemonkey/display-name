import React, { memo } from 'react'

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
  return <div>qux</div>
})

export { Foo, Bar, Baz, Qux }
