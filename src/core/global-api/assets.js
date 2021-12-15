/* @flow */

import { ASSET_TYPES } from 'shared/constants'
import { isPlainObject, validateComponentName } from '../util/index'

export function initAssetRegisters (Vue: GlobalAPI) {
  /**
   * Create asset registration methods.
   * 统一初始化 Vue.component, Vue.directive, Vue.filter
   */
  ASSET_TYPES.forEach(type => {
    Vue[type] = function (
      id: string,
      definition: Function | Object
    ): Function | Object | void {
      if (!definition) {
        return this.options[type + 's'][id]
      } else {
        /* istanbul ignore if */
        if (process.env.NODE_ENV !== 'production' && type === 'component') {
          validateComponentName(id)
        }
        if (type === 'component' && isPlainObject(definition)) {
          // 设置组件的 name，如果是配置对象就先取 options.name，不存在就取传入的第一个值
          definition.name = definition.name || id
          // 通过 Vue.extend 方法，基于 definition 扩展一个新的组件子类，直接 new definition() 实例化一个组件
          definition = this.options._base.extend(definition)
        }
        if (type === 'directive' && typeof definition === 'function') {
          definition = { bind: definition, update: definition }
        }
        // 将每个配置项都放到根组件的对应配置项中
        // 如：{components:{ id: comonent }，directives:{id: directive} ... }
        this.options[type + 's'][id] = definition
        return definition
      }
    }
  })
}
