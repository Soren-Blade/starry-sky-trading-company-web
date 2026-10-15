/**
 * 补签展示逻辑测试（1.5.0 / M4 端点 + M8 前端入口）
 *
 * 守三件事：
 *   1. **「可补签」的判定与后端口径一致**：只能补本月已过去、未签到的日子；
 *      今天、未来、已签到、次数用完、积分不足都要给出**理由**而不是静默置灰；
 *   2. **失败文案要说人话**：`POINTS_NOT_ENOUGH` 要带出还差多少（服务端在
 *      `details.shortage` 里给了），四个失败码各有各的说法；
 *   3. 脏输入不抛异常（格子数据来自服务端，缺字段时页面不该崩）。
 */
import test from 'node:test'
import assert from 'node:assert/strict'

import {
  REPLENISH_ERROR_TEXT,
  canReplenishDay,
  checkinCellTitle,
  replenishErrorMessage,
  replenishRuleText,
} from '../src/utils/checkinDisplay.js'

const OPTIONS = { replenishLeft: 3, points: 100, cost: 20 }

test('可补签：本月已过去且未签到的日子', () => {
  const day = { date: '2026-10-13', checked: false, future: false, is_today: false }
  assert.deepEqual(canReplenishDay(day, OPTIONS), { ok: true, reason: '' })
})

test('不可补签的五种情况都给出理由', () => {
  const base = { date: '2026-10-13', checked: false, future: false, is_today: false }

  assert.match(canReplenishDay({ ...base, checked: true }, OPTIONS).reason, /已签到/)
  assert.match(canReplenishDay({ ...base, future: true }, OPTIONS).reason, /还没到/)
  assert.match(canReplenishDay({ ...base, is_today: true }, OPTIONS).reason, /今天直接签到/)
  assert.match(canReplenishDay(base, { ...OPTIONS, replenishLeft: 0 }).reason, /次数已用完/)
  assert.match(canReplenishDay(base, { ...OPTIONS, points: 19 }).reason, /积分不足/)
})

test('次数用尽优先于积分不足：两条都成立时说的是「次数」', () => {
  const day = { date: '2026-10-13' }
  const { reason } = canReplenishDay(day, { replenishLeft: 0, points: 0, cost: 20 })
  assert.match(reason, /次数已用完/)
})

test('脏输入不抛异常', () => {
  assert.equal(canReplenishDay(null).ok, false)
  assert.equal(canReplenishDay({}).ok, false)
  // 缺 checked/future/is_today 视为「都不是」，没有次数时照样给理由
  assert.equal(typeof canReplenishDay({ date: '2026-10-13' }, {}).reason, 'string')
})

test('单元格 title：可补签的说清代价，不可补签的说清原因', () => {
  const day = { date: '2026-10-13' }
  assert.match(checkinCellTitle(day, OPTIONS), /点击补签（20 积分）/)
  assert.match(checkinCellTitle({ ...day, checked: true }, OPTIONS), /已签到/)
  assert.match(checkinCellTitle({ ...day, is_today: true }, OPTIONS), /直接签到/)
  assert.match(checkinCellTitle({ ...day, future: true }, OPTIONS), /还没到/)
  assert.match(checkinCellTitle(day, { ...OPTIONS, replenishLeft: 0 }), /次数已用完/)
})

test('失败文案：积分不足时把「还差多少」说出来', () => {
  const error = {
    response: { data: { code: 'POINTS_NOT_ENOUGH', details: { shortage: 15 } } },
  }
  assert.equal(replenishErrorMessage(error), '积分不足，还差 15 积分')
})

test('失败文案：服务端 message 优先，其次本地码表，最后兜底', () => {
  assert.equal(
    replenishErrorMessage({ response: { data: { code: 'REPLENISH_LIMIT', message: '本月的补签次数已用完' } } }),
    '本月的补签次数已用完',
  )
  assert.equal(
    replenishErrorMessage({ response: { data: { code: 'ALREADY_CHECKED' } } }),
    REPLENISH_ERROR_TEXT.ALREADY_CHECKED,
  )
  assert.equal(replenishErrorMessage({ message: '网络错误' }), '网络错误')
  assert.equal(replenishErrorMessage(undefined, '兜底文案'), '兜底文案')
})

test('规则文案带出代价与次数', () => {
  const text = replenishRuleText(20, 3)
  assert.match(text, /20 积分\/次/)
  assert.match(text, /每月最多 3 次/)
  assert.match(text, /重算连续天数/)
})
