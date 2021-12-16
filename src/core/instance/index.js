import { initMixin } from './init'
import { stateMixin } from './state'
import { renderMixin } from './render'
import { eventsMixin } from './events'
import { lifecycleMixin } from './lifecycle'
import { warn } from '../util/index'

function Vue (options) {
  // 提示信息，可以忽略
  if (process.env.NODE_ENV !== 'production' &&
    !(this instanceof Vue)
  ) {
    warn('Vue is a constructor and should be called with the `new` keyword')
  }

  // 初始化方法：Vue.prototype._init
  this._init(options)
}

initMixin(Vue)

stateMixin(Vue)

eventsMixin(Vue)

lifecycleMixin(Vue)

renderMixin(Vue)

export default Vue