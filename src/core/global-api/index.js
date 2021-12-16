/* @flow */

import config from '../config'
import { initUse } from './use'
import { initMixin } from './mixin'
import { initExtend } from './extend'
import { initAssetRegisters } from './assets'
import { set, del } from '../observer/index'
import { ASSET_TYPES } from 'shared/constants'
import builtInComponents from '../components/index'
import { observe } from 'core/observer/index'

import {
  warn,
  extend,
  nextTick,
  mergeOptions,
  defineReactive
} from '../util/index'

// 初始化全局 api 的入口
export function initGlobalAPI (Vue: GlobalAPI) {
  // Vue 全局默认配置 config
  const configDef = {}
  configDef.get = () => config

  // 不允许通过 Vue.config = {} 的方式进行覆盖
  if (process.env.NODE_ENV !== 'production') {
    configDef.set = () => {
      warn(
        'Do not replace the Vue.config object, set individual fields instead.'
      )
    }
  }
  // 将配置项 config 代理到 Vue 上，支持通过 Vue.config 的方式去访问
  Object.defineProperty(Vue, 'config', configDef)

  // exposed util methods.
  // NOTE: these are not considered part of the public API - avoid relying on
  // them unless you are aware of the risk.
  // 向外暴露了一些工具方法
  Vue.util = {
    // 警告日志
    warn,
    // extend (to: Object, _from: ?Object), 将 _from 对象上的属性复制到 to 对象
    extend,
    // 合并配置项
    mergeOptions,
    // 设置 getter 和 setter，分别进行 依赖收集 和 依赖更新通知
    defineReactive
  }

  // 全局 set 方法，处理数组元素或对象属性的新增或修改
  Vue.set = set
  // 全局 delete 方法，删除数组元素或对象属性 
  Vue.delete = del
  // 全局 nextTick 方法，主要依赖于浏览的异步任务队列
  Vue.nextTick = nextTick

  // 2.6 explicit observable API
  // 全局 observable 方法，本质就是 observe 方法，将接收对象转换为响应式对象
  Vue.observable = <>(obj: T): T => {
    observe(obj)
    return obj
  }

 {/* 为全局 options 设置指定的配置项 Vue.options = { components:{}, directive: {}, filters:{} }  */}
  Vue.options = Object.create(null)
  ASSET_TYPES.forEach(type => {
    Vue.options[type + 's'] = Object.create(null)
  })

  // this is used to identify the "base" constructor to extend all plain-object
  // components with in Weex's multi-instance scenarios.
  {/* 将 Vue 赋值给 Vue.options._base，向外进行暴露  */}
  Vue.options._base = Vue

  {/* 
   builtInComponents 实际上就是 KeepAlive 组件
   将 KeepAlive 注册到 components 全局组件配置当中，即可以直接在全局使用 <keep-alive></keep-alive>
  */}
  extend(Vue.options.components, builtInComponents)

 {/* 初始化 Vue.use 方法 */}
  initUse(Vue)
  {/* 初始化 Vue.mixin 方法 */}
  initMixin(Vue)
  {/* 初始化 Vue.extend 方法 */}
  initExtend(Vue)
  {/* 初始化 Vue.component、Vue.directive、Vue.filter 方法 */}
  initAssetRegisters(Vue)
}
