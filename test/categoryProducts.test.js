import test from 'node:test'
import assert from 'node:assert/strict'

import { resolveCategoryProducts } from '../src/utils/categoryProducts.js'

/**
 * 分类详情页的商品选择规则
 *
 * 关键边界只有一条，但写错的代价不小：**本分类有自己的商品时，
 * 绝不把子分类的混进来**。混起来会让「这个分类下有什么」变得没法回答，
 * 用户也会以为商品挂错了分类。
 */

const p = (id) => ({ id, main_title: `商品${id}` })

test('本分类有商品：原样返回，且不混入子分类的', () => {
  const result = resolveCategoryProducts([p(1), p(2)], [[p(9)], [p(8)]])

  assert.deepEqual(
    result.products.map((item) => item.id),
    [1, 2]
  )
  assert.equal(result.fromChildren, false, '不该标记为「来自子分类」')
})

test('本分类为空且有子分类商品：并起子分类的，并标记来源', () => {
  const result = resolveCategoryProducts([], [[p(3)], [p(4), p(5)]])

  assert.deepEqual(
    result.products.map((item) => item.id),
    [3, 4, 5]
  )
  assert.equal(result.fromChildren, true, '页面要据此说明一句')
})

test('本分类与子分类都为空：空数组且不标记来源（应走空态）', () => {
  const result = resolveCategoryProducts([], [[], []])

  assert.deepEqual(result.products, [])
  assert.equal(result.fromChildren, false, '没有商品时不该说「以下是子分类的商品」')
})

test('没有子分类：本分类为空就是空', () => {
  assert.deepEqual(resolveCategoryProducts([], []), { products: [], fromChildren: false })
  assert.deepEqual(resolveCategoryProducts([], undefined), { products: [], fromChildren: false })
})

test('子分类里只有部分返回商品（个别请求失败）：用成功的那部分', () => {
  // 组件侧用 allSettled，失败的分组不会进入这个数组
  const result = resolveCategoryProducts([], [[p(7)]])

  assert.deepEqual(
    result.products.map((item) => item.id),
    [7]
  )
  assert.equal(result.fromChildren, true)
})

test('入参不是数组时按空处理，不抛错', () => {
  assert.doesNotThrow(() => resolveCategoryProducts(null, null))
  assert.deepEqual(resolveCategoryProducts(null, null), { products: [], fromChildren: false })
  assert.deepEqual(resolveCategoryProducts(undefined, [null, [p(1)]]).products, [p(1)])
})

test('合并顺序与子分类顺序一致（页面按分类树顺序排）', () => {
  const result = resolveCategoryProducts([], [[p(1)], [p(2)], [p(3)]])
  assert.deepEqual(
    result.products.map((item) => item.id),
    [1, 2, 3]
  )
})
