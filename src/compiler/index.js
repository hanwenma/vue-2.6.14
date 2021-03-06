/* @flow */

import { parse } from './parser/index'
import { optimize } from './optimizer'
import { generate } from './codegen/index'
import { createCompilerCreator } from './create-compiler'

/*
  在这之前做的所有的事情，只是为了构建平台特有的编译选项（options），比如 web 平台
  1、将 html 模版解析成 ast
  2、对 ast 树进行静态标记
  3、将 ast 生成渲染函数
     - 静态渲染函数放到 code.staticRenderFns 数组中
     - 动态渲染函数 code.render
     - 在将来渲染时执行渲染函数能够得到 vnode
 */
export const createCompiler = createCompilerCreator(function baseCompile(
  template: string,
  options: CompilerOptions
): CompiledResult {
  /* 
   将模版字符串解析为 AST 语法树
   每个节点的 ast 对象上都设置了元素的所有信息，如，标签信息、属性信息、插槽信息、父节点、子节点等
  */
  const ast = parse(template.trim(), options)

  /*
   优化，遍历 AST，为每个节点做静态标记
     - 标记每个节点是否为静态节点，保证在后续更新中跳过这些静态节点
     - 标记出静态根节点，用于生成渲染函数阶段，生成静态根节点的渲染函数
       优化，遍历 AST，为每个节点做静态标记
 */
  if (options.optimize !== false) {
    optimize(ast, options)
  }

  /*
    从 AST 语法树生成渲染函数
    如：code.render = "_c('div',{attrs:{"id":"app"}},_l((arr),function(item){return _c('div',{key:item},[_v(_s(item))])}),0)"
  */
  const code = generate(ast, options)

  return {
    ast,
    render: code.render,
    staticRenderFns: code.staticRenderFns
  }
})
