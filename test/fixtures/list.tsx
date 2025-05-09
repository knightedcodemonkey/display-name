import React, { forwardRef } from 'react'

const List = forwardRef<HTMLUListElement, object>((props, ref) => {
  const items = ['a', 'b', 'c']

  return (
    <ul ref={ref}>
      {items.map((item, index) => (
        <li key={index}>{item}</li>
      ))}
    </ul>
  )
})

export { List }
