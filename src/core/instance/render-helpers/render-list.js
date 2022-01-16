/* @flow */

import { isObject, isDef, hasSymbol } from 'core/util/index'

/**
 * Runtime helper for rendering v-for lists.
 * 
 * 用于呈现 v-for 列表的运行时帮助程序
 * v-for 原理：
 *  通过循环为类型为 数组、字符串、数字、对象 调用 render 方法，
 *  得到一个 VNode 数组
 */
export function renderList (
  val: any,
  render: (
    val: any,
    keyOrIndex: string | number,
    index?: number
  ) => VNode
): ?Array<VNode> {
  let ret: ?Array<VNode>, i, l, keys, key
  /*
   val 是数组 或者 是字符串，如：
    <div v-for="item in [xxx,xxx,...]"></div>
    <div v-for="item in 'hello'"></div>
  */
  if (Array.isArray(val) || typeof val === 'string') {
    ret = new Array(val.length)
    // 通过循环为每个元素或者字符调用 render 方法，得到 VNode 节点
    for (i = 0, l = val.length; i < l; i++) {
      ret[i] = render(val[i], i)
    }
  } else if (typeof val === 'number') {
    /*
    val 是数字，如：
      <div v-for="item in 10"></div>
    */
    ret = new Array(val)

    // 循环为每个数字调用 render 方法，得到 VNode 节点
    for (i = 0; i < val; i++) {
      ret[i] = render(i + 1, i)
    }
  } else if (isObject(val)) {
    // val 是对象

    // val 是个可迭代的对象
    if (hasSymbol && val[Symbol.iterator]) {
      ret = []
      /*
       获取可迭代对象实例，通过 while 循环为当前迭代对象，
       调用 render 方法，得到 VNode 节点
      */ 
      const iterator: Iterator<any> = val[Symbol.iterator]()
      let result = iterator.next()
      while (!result.done) {
        ret.push(render(result.value, ret.length))
        result = iterator.next()
      }
    } else {
      /*
       val 是非可迭代对象

       通过 Object.keys() 为对象上的每个 key 对应 value 通过循环调用 render 方法
       得到 VNode 节点
      */
      keys = Object.keys(val)
      ret = new Array(keys.length)
      for (i = 0, l = keys.length; i < l; i++) {
        key = keys[i]
        ret[i] = render(val[key], key, i)
      }
    }
  }

  /*
    isDef(ret) --> ret !== undefined && ret !== null
    ！isDef(ret) --> ret === undefined || ret === null
  */ 
  if (!isDef(ret)) {
    ret = []
  }

  // 返回 VNode 数组
  (ret: any)._isVList = true
  return ret
}
