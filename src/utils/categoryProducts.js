/**
 * 分类详情页的商品选择规则。
 *
 * 抽成纯函数是为了能单测那条**容易写错**的边界：
 * 只有当本分类一件商品都没有时，才退回到子分类的商品；
 * 本分类有自己的商品时**绝不**把子分类的混进来 ——
 * 混起来会让「这个分类下有什么」变得没法回答，
 * 用户也会觉得商品挂错了地方。
 *
 * @param {Array} own 本分类自己的商品
 * @param {Array<Array>} childGroups 各个子分类的商品分组（顺序即合并顺序）
 * @returns {{ products: Array, fromChildren: boolean }}
 *   `fromChildren` 为 true 表示当前展示的是子分类的商品，页面据此说明一句
 */
export function resolveCategoryProducts(own, childGroups) {
    const direct = Array.isArray(own) ? own : []
    if (direct.length > 0) {
        return { products: direct, fromChildren: false }
    }

    const groups = Array.isArray(childGroups) ? childGroups : []
    const merged = groups.filter(Array.isArray).flat()

    return { products: merged, fromChildren: merged.length > 0 }
}
