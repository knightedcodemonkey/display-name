import type { ReactNode } from 'react'
import React, { useRef, useLayoutEffect, useState } from 'react'
import { typedMemo } from './fake.js'
import { useMultiComboBoxContext } from './fake'
import { List, Item } from './fake.js'

type ItemsProps<T> = {
  children?: (props: { item: T; index: number; isSelected: boolean }) => ReactNode
}

const Other = function Other(props) {
  return (
    <ul>
      {props.items.map(item => {
        ;<li>{item}</li>
      })}
    </ul>
  )
}
const Items = typedMemo(function Items<T>({ children }: ItemsProps<T>) {
  const {
    getMenuProps,
    getItemProps,
    filteredItems,
    customItemsList,
    selectedItems,
    itemToString,
    setItemsList,
    loadItems,
    inputValue,
    isOpen,
  } = useMultiComboBoxContext<T>()
  const customLength = customItemsList.length
  const ref = useRef<HTMLUListElement>(null)
  const [hasMore, setHasMore] = useState(true)

  useLayoutEffect(() => {
    if (ref.current && isOpen && loadItems) {
      const root = ref.current
      const target = root.querySelector(':last-child')
      const rootMargin = target ? `${target.clientHeight}px 0px 0px 0px` : '0px'
      const observer = new IntersectionObserver(
        async entries => {
          for (const entry of entries) {
            if (entry.isIntersecting && hasMore) {
              const { items, hasMore } = await loadItems(inputValue)

              setHasMore(hasMore)
              setItemsList(prevItems => Array.from(new Set([...prevItems, ...items])))
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
  }, [
    ref,
    isOpen,
    // Create a new observer after filtering items
    inputValue,
    filteredItems,
    hasMore,
    setItemsList,
    loadItems,
  ])

  return (
    <List {...getMenuProps({ ref })}>
      {isOpen &&
        customItemsList.map((item, index) => (
          <Item
            isLastCustom={index === customItemsList.length - 1}
            isSelected={selectedItems.some(
              selectedItem => itemToString(selectedItem) === item,
            )}
            key={`${item}-${index}`}
            {...getItemProps({
              item,
              index,
            })}
          >
            {itemToString(item)}
          </Item>
        ))}
      {isOpen &&
        filteredItems.map((item, index) => {
          const isSelected = selectedItems.some(
            selectedItem => itemToString(selectedItem) === itemToString(item),
          )

          return (
            <Item
              isSelected={isSelected}
              key={`${itemToString(item)}-${index}`}
              {...getItemProps({
                item,
                index: customLength + index,
              })}
            >
              {children ? children({ item, index, isSelected }) : itemToString(item)}
            </Item>
          )
        })}
    </List>
  )
})

export type { ItemsProps }
export { Items, Other }
