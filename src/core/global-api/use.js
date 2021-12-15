/* @flow */

import { toArray } from '../util/index'

export function initUse (Vue: GlobalAPI) {
  // 一般用于注册插件，plugin 可以是 Function，也可以是对象 { install: (Vue)=>{} } 
  Vue.use = function (plugin: Function | Object) {
    const installedPlugins = (this._installedPlugins || (this._installedPlugins = []))
    // 避免重复注册插件
    if (installedPlugins.indexOf(plugin) > -1) {
      return this
    }

    // additional parameters
    const args = toArray(arguments, 1)
    // 将 Vue 作为插件参数中的第一个参数
    args.unshift(this)
    // plugin 对象上存在 install 属性，且值为函数，通过 apply 绑定 this 并进行调用
    if (typeof plugin.install === 'function') {
      plugin.install.apply(plugin, args)
    } else if (typeof plugin === 'function') {
      // plugin 本身是函数，通过 apply 进行调用
      plugin.apply(null, args)
    }
    // 保存插件到 Vue.installedPlugins 数组中
    installedPlugins.push(plugin)
    return this
  }
}
