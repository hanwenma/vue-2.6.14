/* @flow */

import { extend } from 'shared/util'
import { detectErrors } from './error-detector'
import { createCompileToFunctionFn } from './to-function'

export function createCompilerCreator (baseCompile: Function): Function {
  return function createCompiler (baseOptions: CompilerOptions) {
    /* 
     编译函数：
      1、选项合并，将 options 配置项合并到 finalOptions(baseOptions) 中，
         得到最终的编译配置对象
      2、调用核心编译器 baseCompile 得到编译结果
      3、将编译期间产生的 error 和 tip 挂载到编译结果上
      4、返回编译结果
     */
    function compile (
      // 模板字符串
      template: string,
      // 编译选项
      options?: CompilerOptions
    ): CompiledResult {
      // 以平台特有的编译配置为原型，创建编译选项对象
      const finalOptions = Object.create(baseOptions)
      const errors = []
      const tips = []

      // 日志，负责记录 error 和 tip
      let warn = (msg, range, tip) => {
        (tip ? tips : errors).push(msg)
      }

     // 如果存在编译选项，合并 options 和 baseOptions
      if (options) {
        if (process.env.NODE_ENV !== 'production' && options.outputSourceRange) {
          // $flow-disable-line
          const leadingSpaceLength = template.match(/^\s*/)[0].length

         // 增强 日志 方法
          warn = (msg, range, tip) => {
            const data: WarningMessage = { msg }
            if (range) {
              if (range.start != null) {
                data.start = range.start + leadingSpaceLength
              }
              if (range.end != null) {
                data.end = range.end + leadingSpaceLength
              }
            }
            (tip ? tips : errors).push(data)
          }
        }

        // 合并自定义 modules 到 finalOptions 中
        if (options.modules) {
          finalOptions.modules =
            (baseOptions.modules || []).concat(options.modules)
        }

        // 合并自定义 directives 到 finalOptions 中
        if (options.directives) {
          finalOptions.directives = extend(
            Object.create(baseOptions.directives || null),
            options.directives
          )
        }
        // 除了 modules 和 directives，将其它配置项拷贝到 finalOptions 中
        for (const key in options) {
          if (key !== 'modules' && key !== 'directives') {
            finalOptions[key] = options[key]
          }
        }
      }

      finalOptions.warn = warn

     // 调用核心编译函数 baseCompile，传递模版字符串和最终的编译选项，得到编译结果
      const compiled = baseCompile(template.trim(), finalOptions)

      if (process.env.NODE_ENV !== 'production') {
        detectErrors(compiled.ast, warn)
      }

      // 将编译期间产生的错误和提示挂载到编译结果上
      compiled.errors = errors
      compiled.tips = tips

      // 返回编译结果
      return compiled
    }

    return {
      compile,
      compileToFunctions: createCompileToFunctionFn(compile)
    }
  }
}
