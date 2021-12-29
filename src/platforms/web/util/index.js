/* @flow */

import { warn } from 'core/util/index'

export * from './attrs'
export * from './class'
export * from './element'

/**
 * Query an element selector if it's not an element already.
 */
export function query (el: string | Element): Element {
  // el 是 string 类型
  if (typeof el === 'string') {
    // 尝试获取对应的 dom 元素
    const selected = document.querySelector(el)

    // 获取不到对应的 dom 元素
    if (!selected) {
      // 进行无法获取 dom 元素的提示
      process.env.NODE_ENV !== 'production' && warn(
        'Cannot find element: ' + el
      )
      // 并返回一个新创建的 diV 元素
      return document.createElement('div')
    }

    // 有对应的 dom 元素，就直接向外返回
    return selected
  } else {
    // el 不是 string 类型，直接向外返回
    return el
  }
}
