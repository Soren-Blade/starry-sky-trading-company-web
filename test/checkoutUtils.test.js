/**
 * 结算试算的展示与校验口径（1.5.0 / M7）
 *
 * 这一组守三件事：
 *   1. **积分必须是 100 的整数倍**（服务端 `INVALID_PARAMS` 的口径）——
 *      在这里挡住，用户就不必点一次下单才知道填错了；
 *   2. **上限只认服务端给的 `limits.max_points_discount`**，不按等级自己算
 *      （等级表会变，而「生效上限」已经取过「等级上限」与「50% 剩余额度」的较小者）；
 *   3. **明细行不做减法**：`payable_amount` 用的就是服务端返回的数，
 *      前端自己算一遍迟早与库内函数分歧。
 */
import test from 'node:test'
import assert from 'node:assert/strict'

import {
  POINTS_STEP,
  couponOptionLabel,
  maxUsablePoints,
  normalizePointsInput,
  settlementRows,
} from '../src/utils/checkout.js'

test('积分步长常量是 100（100 积分 = ¥1）', () => {
  assert.equal(POINTS_STEP, 100)
})

test('normalizePointsInput：空值/零表示不使用积分', () => {
  for (const value of ['', null, undefined, 0, '0']) {
    const result = normalizePointsInput(value)
    assert.equal(result.ok, true, `${String(value)} 应当是合法输入`)
    assert.equal(result.points, 0)
    assert.equal(result.error, '')
  }
})

test('normalizePointsInput：非 100 的整数倍要被挡下（与 INVALID_PARAMS 同口径）', () => {
  const result = normalizePointsInput(150)
  assert.equal(result.ok, false)
  assert.equal(result.points, 0)
  assert.match(result.error, /100 的整数倍/)
})

test('normalizePointsInput：负数 / 小数 / 非数字都要挡下', () => {
  assert.equal(normalizePointsInput(-100).ok, false)
  assert.match(normalizePointsInput(1.5).error, /整数/)
  assert.equal(normalizePointsInput('abc').ok, false)
})

test('normalizePointsInput：超过本单上限时收口到上限并按步长取整', () => {
  // 上限的**单位是积分**（239900 积分 = ¥2399 的抵扣额度）
  const result = normalizePointsInput(500000, { max: 239900 })
  assert.equal(result.ok, true)
  assert.equal(result.points, 239900)
  assert.equal(result.clamped, true)
  assert.match(result.message, /最多抵扣 239900 积分/)
})

test('normalizePointsInput：上限不是整百时向下取到步长', () => {
  const result = normalizePointsInput(500000, { max: 239970 })
  assert.equal(result.points, 239900, '239970 积分不可能提交（必须是 100 的整数倍）')
  assert.equal(result.clamped, true)
})

test('normalizePointsInput：正好等于上限不算被下调', () => {
  const result = normalizePointsInput(2300, { max: 2300 })
  assert.equal(result.clamped, false)
  assert.equal(result.points, 2300)
})

test('maxUsablePoints：取「抵扣金额上限」与「账户余额」的较小者', () => {
  // `max_points_discount` 是**金额**（¥2399.7 = 239970 积分），余额是积分
  const quote = { limits: { max_points_discount: 2399.7, points_step: 100 } }
  assert.equal(maxUsablePoints(quote, 999999), 239900, '金额上限更小，且按 100 取整')
  assert.equal(maxUsablePoints(quote, 1000), 1000, '余额更小')
  assert.equal(maxUsablePoints(quote, 1050), 1000, '余额按步长向下取整')
})

test('maxUsablePoints：没有试算结果或上限为 0 时给 0（不能凭空放开）', () => {
  assert.equal(maxUsablePoints(null, 5000), 0)
  assert.equal(maxUsablePoints({ limits: { max_points_discount: 0 } }, 5000), 0)
  assert.equal(maxUsablePoints({}, 5000), 0)
})

test('settlementRows：金额为 0 的优惠行不展示，应付永远展示', () => {
  const rows = settlementRows({
    original_amount: 15999,
    member_discount: 0,
    coupon_discount: 5,
    points_used: 100,
    points_discount: 1,
    payable_amount: 15993,
  })
  assert.deepEqual(
    rows.map((row) => row.key),
    ['original_amount', 'coupon_discount', 'points_discount', 'payable_amount'],
    '会员优惠为 0 时不给非会员看一行「-¥0」'
  )
  assert.equal(rows.at(-1).amount, 15993, '应付用服务端返回的数，不做减法')
  assert.match(rows.find((row) => row.key === 'points_discount').label, /100 积分/)
})

test('settlementRows：没有试算结果时是空数组', () => {
  assert.deepEqual(settlementRows(null), [])
})

test('settlementRows：订单详情复用同一个函数，末行文案可换成「实付」', () => {
  // 订单对象与试算结果的字段同名，所以能直接喂进去（M2 落库的六列）
  const order = {
    original_amount: 89,
    member_discount: 0,
    coupon_discount: 5,
    points_used: 2600,
    points_discount: 26,
    payable_amount: 58,
  }
  const rows = settlementRows(order, { totalLabel: '实付' })
  assert.deepEqual(rows.map((row) => row.key), [
    'original_amount',
    'coupon_discount',
    'points_discount',
    'payable_amount',
  ])
  assert.equal(rows.at(-1).label, '实付')
  assert.equal(rows.find((row) => row.key === 'points_discount').label, '积分抵扣（2600 积分）')
  assert.equal(rows.at(-1).amount, 58)
  // 默认文案不变，购物车结算面板不受影响
  assert.equal(settlementRows(order).at(-1).label, '应付')
})

test('couponOptionLabel：可用券给面额与门槛，不可用券必须带原因', () => {
  assert.equal(
    couponOptionLabel({ amount: '5.00', threshold: '50.00', selectable: true, reason: null }),
    '¥5 券 · 满 ¥50 可用'
  )
  assert.equal(
    couponOptionLabel({ amount: '10.00', threshold: '100.00', selectable: false, reason: '不适用于本单商品' }),
    '¥10 券 · 满 ¥100 可用 · 不适用于本单商品'
  )
  assert.equal(couponOptionLabel(null), '')
})
