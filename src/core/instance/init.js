/* @flow */

import config from '../config'
import { initProxy } from './proxy'
import { initState } from './state'
import { initRender } from './render'
import { initEvents } from './events'
import { mark, measure } from '../util/perf'
import { initLifecycle, callHook } from './lifecycle'
import { initProvide, initInjections } from './inject'
import { extend, mergeOptions, formatComponentName } from '../util/index'

let uid = 0

export function initMixin (Vue: Class<Component>) {
  Vue.prototype._init = function (options?: Object) {
    const vm: Component = this
    // 每个 Vue 实例都定义了一个 _uid 并且值是自增的
    vm._uid = uid++

    // a flag to avoid this being observed
    vm._isVue = true

    // merge options
    // 合并组件配置
    if (options && options._isComponent) {
      // optimize internal component instantiation
      // since dynamic options merging is pretty slow, and none of the
      // internal component options needs special treatment.
      // 子组件：合并配置项，进行性能优化，减少原型链动态查找
      initInternalComponent(vm, options)
    } else {
      /*
        根组件：合并配置，将全局配置项合并到根组件局部配置项中
        组件选项合并，其实发生在三个地方：
        1、Vue.component(name, Comp) 时，将合并 Vue 内置全局组件和用户注册的全局组件，
           最终都会合并到跟组件上配置上的 components 选项中
        2、{ components:{xxx} } 局部注册，执行编译器生成 render 函数时，
           会合并全局配置对象到组件局部配置对象上
        3、就是这里跟组件的情况
      */ 
      
      vm.$options = mergeOptions(
        resolveConstructorOptions(vm.constructor),
        options || {},
        vm
      )
    }
    /* istanbul ignore else */
    if (process.env.NODE_ENV !== 'production') {
      initProxy(vm)
    } else {
      vm._renderProxy = vm
    }
    // expose real self
    vm._self = vm

    // 组件关系属性的初始化：$root、$parent、$children、$refs
    initLifecycle(vm)

    // 初始化自定义事件
    // 问题：子组件上的事件，是谁去监听的？
    // 回答：很多人会误以为是父组件进行监听，但其实是子组件自己监听事件的，也就是谁触发，就是谁去监听
    // <comp @myClick="clickHandle" />
    // this.$emit('myClick') this.$on('myClick', function clickHandle(){})
    initEvents(vm)

    // 初始化插槽，如：vm.$slots、vm.$scopedSlots
    // 定义 _c 方法，即 createElement 方法，也就是 h 函数
    initRender(vm)

    // 通过 callHook 执行 beforeCreate 生命周期函数
    callHook(vm, 'beforeCreate')

    // 初始化 inject 选项
    initInjections(vm) // resolve injections before data/props

    // 响应式原理的核心，主要处理 props、data、methods、watch、computed 等
    initState(vm)

    // 处理 provide 选项
    initProvide(vm) // resolve provide after data/props

    // 通过 callHook 执行 created 生命周期函数
    callHook(vm, 'created')

    // 如果指定了 el 选项，就自动调用 $mount 方法进行挂载
    if (vm.$options.el) {
      vm.$mount(vm.$options.el)
    }
  }
}

//总结：打平子组件配置项，并天剑并添加到 $options 上，避免原型链的动态查找，提高代码运行效率
export function initInternalComponent (vm: Component, options: InternalComponentOptions) {
  // 根据 vm 的构造函数上的 options 创建新的配置对象，赋值给 vm.$options
  const opts = vm.$options = Object.create(vm.constructor.options)

  // doing this because it's faster than dynamic enumeration.
  // 这里把子组件上的配置项打平后，添加到 vm.$options 上
  const parentVnode = options._parentVnode
  opts.parent = options.parent
  opts._parentVnode = parentVnode

  const vnodeComponentOptions = parentVnode.componentOptions
  opts.propsData = vnodeComponentOptions.propsData
  opts._parentListeners = vnodeComponentOptions.listeners
  opts._renderChildren = vnodeComponentOptions.children
  opts._componentTag = vnodeComponentOptions.tag

  // 配置存在 render 选项，将 render 赋值到 $options 上
  if (options.render) {
    opts.render = options.render
    opts.staticRenderFns = options.staticRenderFns
  }
}

// 从构造函数上解析配置对象
export function resolveConstructorOptions (Ctor: Class<Component>) {
  let options = Ctor.options
  // 如果构造函数的 super 属性存在，证明还有基类，此时需要递归进行处理
  if (Ctor.super) {
    const superOptions = resolveConstructorOptions(Ctor.super)
    // 缓存
    const cachedSuperOptions = Ctor.superOptions
    // 若缓存的配置和基类的配置不一致，说明配置已发生更改
    if (superOptions !== cachedSuperOptions) {
      // super option changed,
      // need to resolve new options.
      Ctor.superOptions = superOptions
      // check if there are any late-modified/attached options (#4976)
      // 获取发生变更的配置项
      const modifiedOptions = resolveModifiedOptions(Ctor)
      // update base extend options
      if (modifiedOptions) {
        // 将更改的配置项和 extent 选项进行合并
        extend(Ctor.extendOptions, modifiedOptions)
      }
      // 将合并后得到的新配置赋值给 $options
      options = Ctor.options = mergeOptions(superOptions, Ctor.extendOptions)
      if (options.name) {
        options.components[options.name] = Ctor
      }
    }
  }
  return options
}

function resolveModifiedOptions (Ctor: Class<Component>): ?Object {
  let modified
  const latest = Ctor.options
  const sealed = Ctor.sealedOptions
  for (const key in latest) {
    if (latest[key] !== sealed[key]) {
      if (!modified) modified = {}
      modified[key] = latest[key]
    }
  }
  return modified
}
