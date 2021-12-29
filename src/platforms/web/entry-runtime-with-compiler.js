/* @flow */

import config from 'core/config'
import { warn, cached } from 'core/util/index'
import { mark, measure } from 'core/util/perf'

import Vue from './runtime/index'
import { query } from './util/index'
import { compileToFunctions } from './compiler/index'
import { shouldDecodeNewlines, shouldDecodeNewlinesForHref } from './util/compat'

const idToTemplate = cached(id => {
  const el = query(id)
  return el && el.innerHTML
})

// 保存原来的 Vue.prototype.$mount 方法
const mount = Vue.prototype.$mount

/*
  重写 Vue.prototype.$mount
  问题：当一个配置项中存在 el、template、render 选项时，它们的优先级是怎样的？
  回答：源码中从上到下的处理顺序，决定了它们的优先级为：render > template > el
*/ 
Vue.prototype.$mount = function (
  el?: string | Element,
  hydrating?: boolean
): Component {

  /*
    el 有值，则通过 query 方法获取对应的 dom 元素
     1. el 是 string，则通过 document.querySelector(el) 获取 dom 元素
       - 获取到 dom 元素就直接返回 dom
       - 无法获取到 dom 元素就进行警告提示，并返回 document.createElement('div') 
     2. el 不是 string，则直接返回 el 本身
  */ 
  el = el && query(el)

  /* istanbul ignore if */
  // el 不能是 body 元素 和 html 元素
  if (el === document.body || el === document.documentElement) {
    process.env.NODE_ENV !== 'production' && warn(
      `Do not mount Vue to <html> or <body> - mount to normal elements instead.`
    )
    return this
  }

  //  获取配置选项
  const options = this.$options
  // resolve template/el and convert to render function
  // 当前配置选项中不存在 render 选项
  if (!options.render) {
    // 获取 template 模板
    let template = options.template

    // template 存在
    if (template) {
      // template 为 string
      if (typeof template === 'string') {
        // 字符串以 # 开头，代表是 id 选择器
        if (template.charAt(0) === '#') {
          // 获取 dom 元素对应的 innerHtml 字符内容
          template = idToTemplate(template)
          /* istanbul ignore if */
          // template 选项不能为空字符串
          if (process.env.NODE_ENV !== 'production' && !template) {
            warn(
              `Template element not found or is empty: ${options.template}`,
              this
            )
          }
        }
      } else if (template.nodeType) {
        // 代表是一个 dom 元素，取出 dom 元素的 innerHTML 内容
        template = template.innerHTML
      } else {
        // 其他类型则不属于有效的 template 选项
        if (process.env.NODE_ENV !== 'production') {
          warn('invalid template option:' + template, this)
        }
        return this
      }
    } else if (el) {
      // template 不存在，直接使用 el 对应的 dom 元素作为 template 模板 
      template = getOuterHTML(el)
    }

    if (template) {
      /* istanbul ignore if */
      if (process.env.NODE_ENV !== 'production' && config.performance && mark) {
        mark('compile')
      }
      // 获取对应的动态渲染函数 render 函数和静态渲染函数 staticRenderFns 
      const { render, staticRenderFns } = compileToFunctions(template, {
        // 在非生产环境下，编译时记录标签属性在模版字符串中开始和结束的位置索引
        outputSourceRange: process.env.NODE_ENV !== 'production',
        shouldDecodeNewlines,
        shouldDecodeNewlinesForHref,
        // 界定符，默认 {{}}
        delimiters: options.delimiters,
        // 是否保留注释
        comments: options.comments
      }, this)
      // 将 render 和 staticRenderFns 分别保存到配置选项上
      options.render = render
      options.staticRenderFns = staticRenderFns

      /* istanbul ignore if */
      if (process.env.NODE_ENV !== 'production' && config.performance && mark) {
        mark('compile end')
        measure(`vue ${this._name} compile`, 'compile', 'compile end')
      }
    }
  }

  // 通过调用前面保存 mount 方法
  return mount.call(this, el, hydrating)
}

/**
 * Get outerHTML of elements, taking care
 * of SVG elements in IE as well.
 */
function getOuterHTML (el: Element): string {
  // 当前运行环境支持 outerHTML 属性，就直接返回 outerHTML 内容
  if (el.outerHTML) {
    return el.outerHTML
  } else {
    /*
      当前运行环境不支持 outerHTML 属性
        1. 创建 div 元素 container
        2. 将 el 对应的 dom 进行深克隆后，添加到 container 中
        3. 通过 container.innerHTML 返回对应的 html 字符内容
    */ 
    const container = document.createElement('div')
    container.appendChild(el.cloneNode(true))
    return container.innerHTML
  }
}

Vue.compile = compileToFunctions

export default Vue
