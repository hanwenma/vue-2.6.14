/* @flow */

import type Watcher from './watcher'
import config from '../config'
import { callHook, activateChildComponent } from '../instance/lifecycle'

import {
  warn,
  nextTick,
  devtools,
  inBrowser,
  isIE
} from '../util/index'

export const MAX_UPDATE_COUNT = 100

const queue: Array<Watcher> = []
const activatedChildren: Array<Component> = []
let has: { [key: number]: ?true } = {}
let circular: { [key: number]: number } = {}
let waiting = false
let flushing = false
let index = 0

/**
 * Reset the scheduler's state.
 */
function resetSchedulerState () {
  index = queue.length = activatedChildren.length = 0
  has = {}
  if (process.env.NODE_ENV !== 'production') {
    circular = {}
  }
  waiting = flushing = false
}

// Async edge case #6566 requires saving the timestamp when event listeners are
// attached. However, calling performance.now() has a perf overhead especially
// if the page has thousands of event listeners. Instead, we take a timestamp
// every time the scheduler flushes and use that for all event listeners
// attached during that flush.
export let currentFlushTimestamp = 0

// Async edge case fix requires storing an event listener's attach timestamp.
let getNow: () => number = Date.now

// Determine what event timestamp the browser is using. Annoyingly, the
// timestamp can either be hi-res (relative to page load) or low-res
// (relative to UNIX epoch), so in order to compare time we have to use the
// same timestamp type when saving the flush timestamp.
// All IE versions use low-res event timestamps, and have problematic clock
// implementations (#9632)
if (inBrowser && !isIE) {
  const performance = window.performance
  if (
    performance &&
    typeof performance.now === 'function' &&
    getNow() > document.createEvent('Event').timeStamp
  ) {
    // if the event timestamp, although evaluated AFTER the Date.now(), is
    // smaller than it, it means the event is using a hi-res timestamp,
    // and we need to use the hi-res version for event listener timestamps as
    // well.
    getNow = () => performance.now()
  }
}

/**
 * Flush both queues and run the watchers.
 */
function flushSchedulerQueue () {
  currentFlushTimestamp = getNow()
  // flushing = true 表示当前 watcher 队列正在进行刷新
  flushing = true
  let watcher, id

  // 再刷新 watcher 队列之前，需要对所以 watcher 进行排序.
  // 需要确保的内容:
  // 1. 组件更新是从 父组件 -> 子组件，因为父组件总是在子组件之前被创建
  // 2. 一个组件的用户 watchers 总是运行在它的 render watcher 之前，因为用户 watchers 总是在 render watcher 之前被创建
  // 3. 如果组件在父组件 watcher 运行时被销毁了，那么这个 watchers 是可以被跳过的
  queue.sort((a, b) => a.id - b.id)

  // 通过循环执行每个 watcher 的 run 方法
  // 注意：queue.length 没有被缓存，而是每一次执行循环时都会重新读取，主要目的就是为了实时获取当前 watcher 队列的长度，因为 flushing = true 在 queueWatcher 函数中需要对当前 watcher 进行对应位置的插入，即队列长度是会变化的
  for (index = 0; index < queue.length; index++) {
    watcher = queue[index]
    // 如果配置了 watcher.before 就在 watcher.run 方法之前进行执行
    if (watcher.before) {
      watcher.before()
    }
    id = watcher.id

    // 清空对应 watcher 的缓存，在 queueWatcher 函数中，如果 has[id] 存在就不会进入到队列中，而在这  has[id] = null 表示这个 watcher 已经被执行，如果后续这个 watcher 在queueWatcher 函数中需要被添加到队列时，就可以正常添加
    has[id] = null

    // 执行 watcher.run 方法
    watcher.run()
    
    // in dev build, check and stop circular updates.
    if (process.env.NODE_ENV !== 'production' && has[id] != null) {
      circular[id] = (circular[id] || 0) + 1
      if (circular[id] > MAX_UPDATE_COUNT) {
        warn(
          'You may have an infinite update loop ' + (
            watcher.user
              ? `in watcher with expression "${watcher.expression}"`
              : `in a component render function.`
          ),
          watcher.vm
        )
        break
      }
    }
  }

  // keep copies of post queues before resetting state
  const activatedQueue = activatedChildren.slice()
  const updatedQueue = queue.slice()

  resetSchedulerState()

  // call component updated and activated hooks
  callActivatedHooks(activatedQueue)
  callUpdatedHooks(updatedQueue)

  // devtool hook
  /* istanbul ignore if */
  if (devtools && config.devtools) {
    devtools.emit('flush')
  }
}

function callUpdatedHooks (queue) {
  let i = queue.length
  while (i--) {
    const watcher = queue[i]
    const vm = watcher.vm
    if (vm._watcher === watcher && vm._isMounted && !vm._isDestroyed) {
      callHook(vm, 'updated')
    }
  }
}

/**
 * Queue a kept-alive component that was activated during patch.
 * The queue will be processed after the entire tree has been patched.
 */
export function queueActivatedComponent (vm: Component) {
  // setting _inactive to false here so that a render function can
  // rely on checking whether it's in an inactive tree (e.g. router-view)
  vm._inactive = false
  activatedChildren.push(vm)
}

function callActivatedHooks (queue) {
  for (let i = 0; i < queue.length; i++) {
    queue[i]._inactive = true
    activateChildComponent(queue[i], true /* true */)
  }
}

/**
 * Push a watcher into the watcher queue.
 * Jobs with duplicate IDs will be skipped unless it's
 * pushed when the queue is being flushed.
 */
export function queueWatcher (watcher: Watcher) {
  const id = watcher.id

  // 判重处理，获取 watcher.id 是为了判断同一个 watcher 只会进入队列一次
  // 目的是当某个响应式数据被多个地方进行修改时，只会记录最后一次修改
  if (has[id] == null) {
    has[id] = true

    if (!flushing) {
      // flushing = false 时，表示 watcher 队列还未被刷新
      queue.push(watcher)
    } else {
      // flushing = true ，表示 watcher 队列正在被刷新，此时需要依据 watcher.id 将当前 watcher 加入到队列的合适位置
      // 如果正在刷新时，已经超过了当前 watcher.id ，就会立即执行这个 watcher
      let i = queue.length - 1
      while (i > index && queue[i].id > watcher.id) {
        // 从后往前，通过循环找到当前 watcher 需要在队列中插入的位置（索引）
        i--
      }
      // 经过前面的操作这里就能保证有序性，把当前 watcher 正式插入到队列中
      queue.splice(i + 1, 0, watcher)
    }
    // queue the flush
    // waiting = false 时，表示当前浏览器的异步任务队列中没有 flushSchedulerQueue 函数
    if (!waiting) {
      waiting = true

      if (process.env.NODE_ENV !== 'production' && !config.async) {
        // config.async = false 表示同步执行，直接通过 flushSchedulerQueue 去刷新 watcher 队列
        flushSchedulerQueue()
        return
      }
      // config.async = true 表示异步执行，执行 nextTick 方法，并且将 flushSchedulerQueue 函数当做参数传入
      // 这就是常用的 this.$nextTick()，或者是 Vue.nextTick()
      nextTick(flushSchedulerQueue)
    }
  }
}
