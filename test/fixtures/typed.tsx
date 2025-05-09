import React, { useRef, useLayoutEffect, useState, memo } from 'react'

type ItemsProps<T> = {
  hasMore?: boolean
}
const typedMemo: <T>(c: T) => T = memo
const Other = memo((props: { items: string[] }) => {
  return (
    <ul>
      {props.items.map(item => (
        <li>{item}</li>
      ))}
    </ul>
  )
})
const Items = typedMemo(function Items<T>(props: ItemsProps<T>) {
  const ref = useRef<HTMLUListElement>(null)
  const [hasMore, setHasMore] = useState(props.hasMore ?? true)
  const items = ['a', 'b', 'c']
  const items2 = ['d', 'e', 'f']

  useLayoutEffect(() => {
    if (ref.current) {
      const root = ref.current
      const target = root.querySelector(':last-child')
      const rootMargin = target ? `${target.clientHeight}px 0px 0px 0px` : '0px'
      const observer = new IntersectionObserver(
        async entries => {
          for (const entry of entries) {
            if (entry.isIntersecting && hasMore) {
              setHasMore(false)
            }
          }
        },
        {
          root,
          rootMargin,
          threshold: 0,
        },
      )

      if (target) {
        observer.observe(target)
      }

      return () => {
        observer.disconnect()
      }
    }
  }, [ref, hasMore])

  return (
    <ul ref={ref}>
      {items.map((item, index) => {
        const isSelected = items2.includes(item)
        return (
          <li key={index} className={isSelected ? 'selected' : ''}>
            {item}
          </li>
        )
      })}
      {items2.map((item, index) => {
        return <li key={index}>{item}</li>
      })}
    </ul>
  )
})

export type { ItemsProps }
export { Items, Other }
