/* @flow */

import { ASSET_TYPES } from 'shared/constants'
import { defineComputed, proxy } from '../instance/state'
import { extend, mergeOptions, validateComponentName } from '../util/index'

export function initExtend (Vue: GlobalAPI) {
  /**
   * Each instance constructor, including Vue, has a unique
   * cid. This enables us to create wrapped "child
   * constructors" for prototypal inheritance and cache them.
   */
  Vue.cid = 0
  let cid = 1

  /**
   * Class inheritance
   * 使用 Vue.extend，创建一个子类，参数是一个包含组件选项的对象
   */
  Vue.extend = function (extendOptions: Object): Function {
    extendOptions = extendOptions || {}
    const Super = this
    const SuperId = Super.cid
    const cachedCtors = extendOptions._Ctor || (extendOptions._Ctor = {})
    // 缓存：如果使用同一个混入配置项，如果缓存中存在已存在，就直接使用缓存的值
    if (cachedCtors[SuperId]) {
      return cachedCtors[SuperId]
    }

    // 校验组件名称
    const name = extendOptions.name || Super.options.name
    if (process.env.NODE_ENV !== 'production' && name) {
      validateComponentName(name)
    }

    /*
     核心：定义一个 Vue 子类，本质上和 Vue 构造函数一样
      function Vue (options) {
        this._init(options)
      }
    */
    const Sub = function VueComponent (options) {
      this._init(options)
    }
    // 设置子类原型为基类的原型
    Sub.prototype = Object.create(Super.prototype)
    // 指定子类构造函数为自己
    Sub.prototype.constructor = Sub
    Sub.cid = cid++
    // 合并基类选项和传入进来的配置项到子类配置项中，相当于进行预设
    Sub.options = mergeOptions(
      Super.options,
      extendOptions
    )
    Sub['super'] = Super

    // For props and computed properties, we define the proxy getters on
    // the Vue instances at extension time, on the extended prototype. This
    // avoids Object.defineProperty calls for each instance created.
    // 将 props 代理到子类上，在子类中可以直接通过 this.props 形式访问
    if (Sub.options.props) {
      initProps(Sub)
    }
    // 将 computed 代理到子类上，在子类中可以直接通过 this.computed 形式访问
    if (Sub.options.computed) {
      initComputed(Sub)
    }

    // allow further extension/mixin/plugin usage
    // 将基类的扩展方法赋值给子类，使子类拥有自己的扩展能力
    Sub.extend = Super.extend
    Sub.mixin = Super.mixin
    Sub.use = Super.use

    // create asset registers, so extended classes
    // can have their private assets too.
    ASSET_TYPES.forEach(function (type) {
      Sub[type] = Super[type]
    })
    // enable recursive self-lookup
    // 组件递归自调用的原理
    // { name:'comp', components: { Comp } }
    if (name) {
      Sub.options.components[name] = Sub
    }

    // keep a reference to the super options at extension time.
    // later at instantiation we can check if Super's options have
    // been updated.
    Sub.superOptions = Super.options
    Sub.extendOptions = extendOptions
    Sub.sealedOptions = extend({}, Sub.options)

    // cache constructor
    // 缓存子类
    cachedCtors[SuperId] = Sub
    return Sub
  }
}

function initProps (Comp) {
  const props = Comp.options.props
  for (const key in props) {
    proxy(Comp.prototype, `_props`, key)
  }
}

function initComputed (Comp) {
  const computed = Comp.options.computed
  for (const key in computed) {
    defineComputed(Comp.prototype, key, computed[key])
  }
}
