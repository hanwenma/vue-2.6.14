/* @flow */

import { mergeOptions } from '../util/index'

export function initMixin (Vue: GlobalAPI) {
  // 向组件配置中进行混入配置项
  Vue.mixin = function (mixin: Object) {
    // 本质就是合并配配置项
    this.options = mergeOptions(this.options, mixin)
    return this
  }
}
