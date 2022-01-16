/* @flow */

/**
 * Runtime helper for rendering static trees.
 * 
 * 运行时负责生成静态树的 VNode 的帮助程序：
 *   1、执行 staticRenderFns 数组中指定下标的渲染函数，
 *      生成静态树的 VNode 并缓存，下次在渲染时从缓存中直接读取（isInFor 必须为 true）
 *   2、为静态树的 VNode 打静态标记
 * 
 * @param { number} index 表示当前静态节点的渲染函数在 staticRenderFns 数组中的下标索引
 * @param { boolean} isInFor 表示当前静态节点是否被包裹在含有 v-for 指令的节点内部
 */
export function renderStatic (
  index: number,
  isInFor: boolean
): VNode | Array<VNode> {
  // 缓存，静态节点第二次被渲染时就从缓存中直接获取已缓存的 VNode
  const cached = this._staticTrees || (this._staticTrees = [])

  let tree = cached[index]

  /*
   如果已渲染静态树且不在 v-for 内，就可以重复使用同一棵树。
  */
  if (tree && !isInFor) {
    return tree
  }

  /*
   如果已渲染静态树且在 v-for 内，那么就需要重新渲染这个树
    通过 staticRenderFns 数组，获取并执行对应的 静态渲染函数，
    得到新的 VNode 节点，并缓存最新的结果
  */
  tree = cached[index] = this.$options.staticRenderFns[index].call(
    this._renderProxy,
    null,
    this // for render fns generated for functional component templates
  )

  /*
  通过 markStatic 方法，标记静态节点，接收三个参数：
    tree: VNode | Array<VNode>
    key: string
    isOnce: boolean
  */ 
  markStatic(tree, `__static__${index}`, false)

  return tree
}

/**
 * Runtime helper for v-once.
 * Effectively it means marking the node as static with a unique key.
 * 使用唯一的 key 将节点标记为静态节点
 */
export function markOnce (
  tree: VNode | Array<VNode>,
  index: number,
  key: string
) {
  /*
   <div v-once key="mydiv"><div>
   保证 key 的唯一，即 key = `__once__${index}_mydiv`
  */
  markStatic(tree, `__once__${index}${key ? `_${key}` : ``}`, true)
  return tree
}

// 将节点标记为静态节点
function markStatic (
  tree: VNode | Array<VNode>,
  key: string,
  isOnce: boolean
) {
  // tree 为数组
  if (Array.isArray(tree)) {
    // 遍历 tree 为每个 tree[i] 通过 markStaticNode() 进行静态标记
    for (let i = 0; i < tree.length; i++) {
      if (tree[i] && typeof tree[i] !== 'string') {
        markStaticNode(tree[i], `${key}_${i}`, isOnce)
      }
    }
  } else {
    // tree 不是数组直接调用 markStaticNode() 进行静态标记
    markStaticNode(tree, key, isOnce)
  }
}

/*
  为 VNode 打静态标记，在 VNode 上添加三个属性：
 { isStatick: true, key: xx, isOnce: true or false } 
*/
function markStaticNode (node, key, isOnce) {
  node.isStatic = true
  node.key = key
  node.isOnce = isOnce
}
