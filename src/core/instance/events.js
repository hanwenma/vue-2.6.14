/* @flow */

import {
  tip,
  toArray,
  hyphenate,
  formatComponentName,
  invokeWithErrorHandling
} from '../util/index'
import { updateListeners } from '../vdom/helpers/index'

export function initEvents (vm: Component) {
  vm._events = Object.create(null)
  vm._hasHookEvent = false
  // init parent attached events
  // 从 $options 中获取父组件的 listeners 对象
  const listeners = vm.$options._parentListeners
  if (listeners) {
    updateComponentListeners(vm, listeners)
  }
}

let target: any

function add (event, fn) {
  target.$on(event, fn)
}

function remove (event, fn) {
  target.$off(event, fn)
}

function createOnceHandler (event, fn) {
  const _target = target
  return function onceHandler () {
    const res = fn.apply(null, arguments)
    if (res !== null) {
      _target.$off(event, onceHandler)
    }
  }
}

export function updateComponentListeners (
  vm: Component,
  listeners: Object,
  oldListeners: ?Object
) {
  target = vm
  updateListeners(listeners, oldListeners || {}, add, remove, createOnceHandler, vm)
  target = undefined
}

export function eventsMixin (Vue: Class<Component>) {
  const hookRE = /^hook:/
  // 监听单个或者多个事件，将所有事件对应的回调放到 vm._events 对象上
  // 格式为：vm._events = { eventType1:[cb1, ...] , eventType1:[cb1,...]}
  Vue.prototype.$on = function (event: string | Array<string>, fn: Function): Component {
    const vm: Component = this

    // 如果 event 是数组，遍历这个数组通过 vm.$on(event[i], fn) 依次进行监听
    // this.$on(['event1','event2',...], function(){})
    if (Array.isArray(event)) {
      for (let i = 0, l = event.length; i < l; i++) {
        vm.$on(event[i], fn)
      }
    } else {
      // 通过 vm._events 保存当前实例上监听的事件，每个事件类型以数组形式进行保存事件处理
      (vm._events[event] || (vm._events[event] = [])).push(fn)
      // optimize hook:event cost by using a boolean flag marked at registration
      // instead of a hash lookup
      // 当使用了如 <comp @hoook:mounted="handleHoookMounted" /> 时，将 vm._hasHookEvent 标记设置为 true
      if (hookRE.test(event)) {
        vm._hasHookEvent = true
      }
    }
    return vm
  }

  // 监听一个自定义事件，但只触发一次，一旦触发之后，监听器就会被移除
  Vue.prototype.$once = function (event: string, fn: Function): Component {
    const vm: Component = this
    // 将外部传入的事件回调包装在 on 方法中
    // 调用方法前先移出指定事件的回调，然后通过 apply 调用外部传入的 fn
    function on () {
      vm.$off(event, on)
      fn.apply(vm, arguments)
    }
    on.fn = fn
    // 将包装的 on 函数作为，vm.$on 中的事件回调
    vm.$on(event, on)
    return vm
  }

  /**
   * 
   * 移除 vm._events 上的自定义事件监听器：
   *  1. 如果没有提供参数，则移除所有的事件监听器，vm._events = Object.create(null)
   *  2. 如果只提供了事件，则移除该事件所有的监听器，vm._events[event] = null
   *  3. 如果同时提供了事件与回调，则只移除这个回调的监听器，vm._events[event].splice(i,1)
  */
  Vue.prototype.$off = function (event?: string | Array<string>, fn?: Function): Component {
    const vm: Component = this
    // 没有传递 event 参数：代表移除当前实例上所有的监听事件 
    if (!arguments.length) {
      // 直接给 vm._events 赋值为一个纯对象
      vm._events = Object.create(null)
      return vm
    }
    // event 参数为数组：遍历数组依次从实例上移除监听事件
    if (Array.isArray(event)) {
      for (let i = 0, l = event.length; i < l; i++) {
        vm.$off(event[i], fn)
      }
      return vm
    }
    //  event 参数为字符串：从  vm._events 获取到对应的事件回调数组
    const cbs = vm._events[event]
    // 回调数组不存在则直接返回
    if (!cbs) {
      return vm
    }

    // 没有传递 fn 参数：则把当前传入的 event 事件类型全部清空
    if (!fn) {
      vm._events[event] = null
      return vm
    }

    // 存在 fn 参数：则通过循环找到 event 事件类型回调数组中对应的回调，在通过 splice 方法进行删除
    let cb
    let i = cbs.length
    while (i--) {
      cb = cbs[i]
      if (cb === fn || cb.fn === fn) {
        cbs.splice(i, 1)
        break
      }
    }
    return vm
  }

  Vue.prototype.$emit = function (event: string): Component {
    const vm: Component = this
    /*
     这里是提示使用者，注意 HTML 属性不区分大小写，对于 HTML 上的属性尽量不要使用驼峰命名，因为编译之后全部都会变成小写形式，比如：
      html 模板中：<comp @customEvent="handler" /> 等价于 <comp @customevent="handler" />
      js 中：this.$emit('customEvent')
      
      这样就会导致在 js 中触发的事件名和在 HTML 模板上监听的事件名不一致的问题，更推荐用法是： 
       html 模板中：<comp @custom-event="handler" />
       js 中：this.$emit('custom-event')
    */ 
    if (process.env.NODE_ENV !== 'production') {
      const lowerCaseEvent = event.toLowerCase()
      if (lowerCaseEvent !== event && vm._events[lowerCaseEvent]) {
        tip(
          `Event "${lowerCaseEvent}" is emitted in component ` +
          `${formatComponentName(vm)} but the handler is registered for "${event}". ` +
          `Note that HTML attributes are case-insensitive and you cannot use ` +
          `v-on to listen to camelCase events when using in-DOM templates. ` +
          `You should probably use "${hyphenate(event)}" instead of "${event}".`
        )
      }
    }
    // 获取到对应事件类型的事件回调数组
    let cbs = vm._events[event]
    if (cbs) {
      // 将类数组转换为真正的数组
      cbs = cbs.length > 1 ? toArray(cbs) : cbs
      // 处理类数组实参列表，转换为数组
      const args = toArray(arguments, 1)
      const info = `event handler for "${event}"`

      for (let i = 0, l = cbs.length; i < l; i++) {
        // 调用回调函数，并将参数传递给回调函数，同时使用 try catch 进行异常捕获
        invokeWithErrorHandling(cbs[i], vm, args, vm, info)
      }
    }
    return vm
  }
}
