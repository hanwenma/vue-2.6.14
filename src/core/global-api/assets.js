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
      // 如果对应的 definition 没有传递，直接返回
      if (!definition) {
        return this.options[type + 's'][id]
      } else {
        /* istanbul ignore if */
        // 校验组件名字
        if (process.env.NODE_ENV !== 'production' && type === 'component') {
          validateComponentName(id)
        }
        // 如果是组件
        if (type === 'component' && isPlainObject(definition)) {
          // 设置组件的 name，如果是配置对象就先取 options.name，不存在就取传入的第一个值
          definition.name = definition.name || id
          // 通过 Vue.extend 方法，基于 definition 扩展一个新的组件子类，可直接 new definition() 实例化一个组件
          definition = this.options._base.extend(definition)
        }

         // 如果是指令
        if (type === 'directive' && typeof definition === 'function') {
          definition = { bind: definition, update: definition }
        }

        // 将每个配置项都放到根组件的对应配置项中
        // 如：{components:{ id: comonent }，directives:{id: directive} ，filters:{ id: filter }，... }
        this.options[type + 's'][id] = definition
        return definition
      }
    }
  })
}
