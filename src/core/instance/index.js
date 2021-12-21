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

// 定义 this._init 初始化方法
initMixin(Vue)

// 定义 $data $props $et $dlete $watch 实例方法
stateMixin(Vue)

// 定义 $on $once $off $emit 实例方法
eventsMixin(Vue)

// 定义 _update $forceUpdate $destroy 实例方法
lifecycleMixin(Vue)

// 定义 $nextTick _render 实例方法
renderMixin(Vue)

export default Vue
