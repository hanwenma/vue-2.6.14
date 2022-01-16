/* @flow */

import { toNumber, toString, looseEqual, looseIndexOf } from 'shared/util'
import { createTextVNode, createEmptyVNode } from 'core/vdom/vnode'
import { renderList } from './render-list'
import { renderSlot } from './render-slot'
import { resolveFilter } from './resolve-filter'
import { checkKeyCodes } from './check-keycodes'
import { bindObjectProps } from './bind-object-props'
import { renderStatic, markOnce } from './render-static'
import { bindObjectListeners } from './bind-object-listeners'
import { resolveScopedSlots } from './resolve-scoped-slots'
import { bindDynamicKeys, prependModifier } from './bind-dynamic-keys'


/**
 * 在实例上挂载简写的渲染工具函数，这些都是运行时代码
 * 这些工具函数在编译器生成的渲染函数中被使用到了
 * @param target Vue 实例
 */
export function installRenderHelpers (target: any) {
  /**
   v-once 指令的运行时帮助程序，为 VNode 加上打上静态标记
    注意：包含 v-once 指令的节点都被当作静态节点处理: 
      node.isStatic = true
      node.key = key
      node.isOnce = true
  */
  target._o = markOnce

  // 使用 parseFloat() 将值转换为数字
  target._n = toNumber

  /*
    如果传入值为 null，直接返回 ''
    如果是数组或者是普通对象，调用 JSON.Stringify() 序列化引用类型
    否则使用 String 转换为字符串
  */ 
  target._s = toString

  /*
   运行时渲染 v-for 列表的帮助函数，循环遍历 val 值，
   依次为每一项执行 render 方法生成 VNode，最终返回一个 VNode 数组
  */
  target._l = renderList
  target._t = renderSlot

  /*
    判断两个值是否相等：数组、普通对象、Date 对象、基本类型（全部转成字符串比较）
  */
  target._q = looseEqual

  /**
    相当于数组的 indexOf() 方法，本质就是调用 looseEqual()
  */
  target._i = looseIndexOf

  /*
    运行时负责生成静态树的 VNode 的帮助程序：
     1、执行 staticRenderFns 数组中指定下标的渲染函数，生成静态树的 VNode 并缓存，
        下次在渲染时从缓存中直接读取（isInFor 必须为 true）
     2、为静态树的 VNode 打静态标记
   */
  target._m = renderStatic
  target._f = resolveFilter
  target._k = checkKeyCodes
  target._b = bindObjectProps

  /*
    为文本节点创建 VNode，其中:
     VNode.text = 'xxx'
     VNode.isComment = false
  */ 
  target._v = createTextVNode

  /*
    为空节点创建 VNode，其中： 
     VNode.text = 'xxx' 
     VNode.isComment = true
  */ 
  target._e = createEmptyVNode

  // 作用域插槽
  target._u = resolveScopedSlots
  
  target._g = bindObjectListeners
  target._d = bindDynamicKeys
  target._p = prependModifier
}
