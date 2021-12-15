/* @flow */
/* globals MutationObserver */

import { noop } from 'shared/util'
import { handleError } from './error'
import { isIE, isIOS, isNative } from './env'

export let isUsingMicroTask = false

const callbacks = []
let pending = false

function flushCallbacks() {
  // 在执行 timerFunc 方法之前，pending = true，表示当前浏览器的异步任务队列中只能存在一个 flushCallbacks 函数
  // 当前 flushCallbacks 被执行时，又将 pending = false，表示后面的 flushCallbacks 函数就又可以通过 timerFunc 方法提供异步执行
  pending = false

  const copies = callbacks.slice(0)
  // 清空 callbacks 中的回调函数
  callbacks.length = 0
  // 通过循环执行 callbacks 中原有的所有回调函数，即 Vue 内部传递的 flushSchedulerQueue 函数，或是用户通过 this.$nextTick() 和 Vue.nextTick() 传递的回调
  for (let i = 0; i < copies.length; i++) {
    copies[i]()
  }
}

// Here we have async deferring wrappers using microtasks.
// In 2.5 we used (macro) tasks (in combination with microtasks).
// However, it has subtle problems when state is changed right before repaint
// (e.g. #6813, out-in transitions).
// Also, using (macro) tasks in event handler would cause some weird behaviors
// that cannot be circumvented (e.g. #7109, #7153, #7546, #7834, #8109).
// So we now use microtasks everywhere, again.
// A major drawback of this tradeoff is that there are some scenarios
// where microtasks have too high a priority and fire in between supposedly
// sequential events (e.g. #4521, #6690, which have workarounds)
// or even between bubbling of the same event (#6566).
let timerFunc


if (typeof Promise !== 'undefined' && isNative(Promise)) {
  const p = Promise.resolve()
  timerFunc = () => {
    p.then(flushCallbacks)
    if (isIOS) setTimeout(noop)
  }
  isUsingMicroTask = true
} else if (!isIE && typeof MutationObserver !== 'undefined' && (
  isNative(MutationObserver) ||
  // PhantomJS and iOS 7.x
  MutationObserver.toString() === '[object MutationObserverConstructor]'
)) {
  let counter = 1
  const observer = new MutationObserver(flushCallbacks)
  const textNode = document.createTextNode(String(counter))
  observer.observe(textNode, {
    characterData: true
  })
  timerFunc = () => {
    counter = (counter + 1) % 2
    textNode.data = String(counter)
  }
  isUsingMicroTask = true
} else if (typeof setImmediate !== 'undefined' && isNative(setImmediate)) {
  timerFunc = () => {
    setImmediate(flushCallbacks)
  }
} else {
  // Fallback to setTimeout.
  timerFunc = () => {
    setTimeout(flushCallbacks, 0)
  }
}

export function nextTick(cb?: Function, ctx?: Object) {
  let _resolve

  // 将 cb 通过匿名函数包裹一层，然后存入到 callbacks 中
  callbacks.push(() => {
    // cb 可能是 Vue 内部传递的 flushSchedulerQueue 函数，也可能是用户在外部传入的自定义函数，因此这里需要对 cb 进行 try catch，方便捕获异常
    if (cb) {
      try {
        cb.call(ctx)
      } catch (e) {
        handleError(e, ctx, 'nextTick')
      }
    } else if (_resolve) {
      // cb 不存在，默认执行在下面 _resolve = resolve 方法
      _resolve(ctx)
    }
  })

  // pending = false 时，需要执行 timerFunc()
  if (!pending) {
    pending = true
    // 利用浏览器的异步任务执行 flushCallbacks() 函数
    timerFunc()
  }

  // 当 cb 函数不存在且支持使用 Promise 时，需要提供一个默认函数，即 Promise 中的 resolve 方法 
  if (!cb && typeof Promise !== 'undefined') {
    return new Promise(resolve => {
      _resolve = resolve
    })
  }
}
