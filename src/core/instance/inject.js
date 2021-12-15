/* @flow */

import { hasOwn } from 'shared/util'
import { warn, hasSymbol } from '../util/index'
import { defineReactive, toggleObserving } from '../observer/index'

export function initProvide (vm: Component) {
  // 从 $options 配置对象上获取 provide 选项
  const provide = vm.$options.provide
  if (provide) {
    // 并判断 provide 是不是函数，是函数就调用获取返回配置项
    vm._provided = typeof provide === 'function'
      ? provide.call(vm)
      : provide
  }
}

export function initInjections (vm: Component) {
  // 从配置项上解析 inject 选项，得到 result[key] = val 形式的结果
  const result = resolveInject(vm.$options.inject, vm)
  if (result) {
    toggleObserving(false)
    Object.keys(result).forEach(key => {
      /* istanbul ignore else */
      if (process.env.NODE_ENV !== 'production') {
        // 将解析结果进行响应式处理，将每个 key 代理到 vm 实例上
        // 实现 this.key 的方式进行访问
        defineReactive(vm, key, result[key], () => {
          warn(
            `Avoid mutating an injected value directly since the changes will be ` +
            `overwritten whenever the provided component re-renders. ` +
            `injection being mutated: "${key}"`,
            vm
          )
        })
      } else {
        defineReactive(vm, key, result[key])
      }
    })
    toggleObserving(true)
  }
}

/*
 这里的 inject 选项已经是经过了标准化处理，因此它的形式一定是：
 inject = {
   key: {
      from: xxx,
      default: xxx
    }
 }
*/
export function resolveInject (inject: any, vm: Component): ?Object {
  if (inject) {
    // inject is :any because flow is not smart enough to figure out cached
    const result = Object.create(null)

    // keys 就是标准化的 inject 的所有 key
    const keys = hasSymbol
      ? Reflect.ownKeys(inject)
      : Object.keys(inject)

    // 遍历所有 key
    for (let i = 0; i < keys.length; i++) {
      const key = keys[i]
      // #6574 in case the inject object is observed...
      // 存在 __ob__ 属性就证明已经进行过响应式转化
      if (key === '__ob__') continue
      // 获取 form 属性
      const provideKey = inject[key].from
      let source = vm
      // 从祖代组件配置项中找到 provide 选项，从而获取对应 key 中的值
      while (source) {
        if (source._provided && hasOwn(source._provided, provideKey)) {
          // 在祖代组件中找到对应值以后，保存在 result 中，如 result[key] = val
          result[key] = source._provided[provideKey]
          break
        }
        // 没有找到对应值，就继续往上查找，一直到根组件
        source = source.$parent
      }

      // 如果到了根组件都没有找到
      if (!source) {
        // 会先判断当前的 inject 配置中有没有设置默认值，有就进行设置
        if ('default' in inject[key]) {
          const provideDefault = inject[key].default
          result[key] = typeof provideDefault === 'function'
            ? provideDefault.call(vm)
            : provideDefault
        } else if (process.env.NODE_ENV !== 'production') {
          warn(`Injection "${key}" not found`, vm)
        }
      }
    }
    return result
  }
}
