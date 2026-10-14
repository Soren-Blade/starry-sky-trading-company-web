/**
 * 商城 / 任务展示口径测试（1.5.0 M7）
 *
 * 这组用例的重点是**一个真实踩过的坑**：服务端的 `claimable` 口径是
 * 「现在就能领」（有奖励 && 没领过 && 进度达标），未完成的任务它同样是 `false`。
 * 早期版本据此把「每日下单 0/1」显示成「自动发放」，等于告诉用户这条任务不需要操作。
 * 所以这里把四态真值表钉死：「自动发放」只属于 `reward_points <= 0` 的签到任务。
 */
import test from 'node:test'
import assert from 'node:assert/strict'

import {
  TASK_PERIOD_TEXT,
  canClaimTask,
  mallRedeemState,
  mallStockText,
  periodText,
  progressPercent,
  taskButtonHint,
  taskButtonLabel,
} from '../src/utils/taskDisplay.js'

/** 契约 §4.16 的一条任务（默认是「未完成的每日下单」） */
function task(overrides = {}) {
  return {
    task_id: 'daily_order',
    name: '每日下单',
    desc: '今天完成一笔订单',
    icon: 'package',
    period: 'daily',
    progress: 0,
    target: 1,
    reward_points: 20,
    claimed: false,
    // 服务端口径：未完成 → claimable 也是 false
    claimable: false,
    reset_at: '2026-10-16T16:00:00.000Z',
    ...overrides,
  }
}

// ── 周期与进度 ────────────────────────────────────────────────

test('periodText：三种周期有中文，未知周期给空串（不显示 undefined）', () => {
  assert.equal(periodText('daily'), '每日')
  assert.equal(periodText('monthly'), '每月')
  assert.equal(periodText('once'), '一次性')
  assert.equal(periodText('weekly'), '')
  assert.equal(periodText(undefined), '')
  assert.equal(Object.keys(TASK_PERIOD_TEXT).length, 3)
})

test('progressPercent：target 缺失/为 0 给 0，超额截到 100，四舍五入', () => {
  assert.equal(progressPercent(task({ progress: 0, target: 1 })), 0)
  assert.equal(progressPercent(task({ progress: 1, target: 1 })), 100)
  assert.equal(progressPercent(task({ progress: 20, target: 20 })), 100)
  assert.equal(progressPercent(task({ progress: 7, target: 20 })), 35)
  assert.equal(progressPercent(task({ progress: 99, target: 20 })), 100)
  assert.equal(progressPercent(task({ progress: 3, target: 0 })), 0)
  assert.equal(progressPercent(task({ progress: undefined, target: undefined })), 0)
  assert.equal(progressPercent(undefined), 0)
})

// ── 任务按钮四态 ──────────────────────────────────────────────

test('四态：签到任务（reward 0）是「自动发放」', () => {
  const checkin = task({ task_id: 'daily_checkin', reward_points: 0, claimable: false })
  assert.equal(taskButtonLabel(checkin), '自动发放')
  assert.match(taskButtonHint(checkin), /签到接口当场发放/)
})

test('四态：未完成的任务是「未完成」，不能显示成「自动发放」（回归用例）', () => {
  // 服务端对未完成任务的 claimable 恒为 false —— 早期版本据此误判成「自动发放」
  const doing = task({ progress: 0, target: 1, claimable: false })
  assert.equal(doing.claimable, false)
  assert.equal(taskButtonLabel(doing), '未完成')
  assert.equal(taskButtonHint(doing), '当前进度 0/1')

  const monthly = task({ task_id: 'monthly_checkin_20', period: 'monthly', progress: 3, target: 20, reward_points: 300 })
  assert.equal(taskButtonLabel(monthly), '未完成')
  assert.equal(taskButtonHint(monthly), '当前进度 3/20')
})

test('四态：进度达标且可领才是「领取」', () => {
  const done = task({ progress: 1, target: 1, claimable: true })
  assert.equal(taskButtonLabel(done), '领取')
  assert.equal(taskButtonHint(done), '', '能领的时候不给提示噪音')
})

test('四态：领过是「已领取」，即使进度回落到 0 也保持已领取（月度周期）', () => {
  const claimed = task({ progress: 20, target: 20, claimable: false, claimed: true, reward_points: 300 })
  assert.equal(taskButtonLabel(claimed), '已领取')
  assert.match(taskButtonHint(claimed), /下个周期/)
})

test('canClaimTask：要服务端说可领、没领过、进度达标，三者缺一不可', () => {
  assert.equal(canClaimTask(task({ progress: 1, target: 1, claimable: true })), true)
  assert.equal(canClaimTask(task({ progress: 1, target: 1, claimable: false })), false)
  assert.equal(canClaimTask(task({ progress: 1, target: 1, claimable: true, claimed: true })), false)
  assert.equal(canClaimTask(task({ progress: 0, target: 1, claimable: true })), false)
  assert.equal(canClaimTask(undefined), false)
})

// ── 商城库存与兑换 ────────────────────────────────────────────

test('mallStockText：null/undefined 是「不限量」，0 与负数是「已兑完」，其余给剩余数', () => {
  assert.equal(mallStockText({ stock: null }), '不限量')
  assert.equal(mallStockText({ stock: undefined }), '不限量')
  assert.equal(mallStockText({}), '不限量')
  assert.equal(mallStockText({ stock: 0 }), '已兑完')
  assert.equal(mallStockText({ stock: -3 }), '已兑完')
  assert.equal(mallStockText({ stock: 992 }), '剩余 992')
  assert.equal(mallStockText({ stock: '8' }), '剩余 8')
})

test('mallRedeemState：会员专属优先于积分不足（先说条目本身的条件）', () => {
  const item = { item_id: 'coupon_member_monthly', cost: 800, stock: null, member_only: true }
  assert.deepEqual(mallRedeemState(item, { isMember: false, points: 0 }), {
    ok: false,
    reason: '会员专属，开通会员后可兑换',
  })
  assert.deepEqual(mallRedeemState(item, { isMember: true, points: 800 }), { ok: true, reason: '' })
})

test('mallRedeemState：库存为 0 时给「已兑完」，不限量（null）不拦', () => {
  const soldOut = { cost: 30000, stock: 0, member_only: false }
  assert.deepEqual(mallRedeemState(soldOut, { points: 999999, isMember: true }), {
    ok: false,
    reason: '已兑完，等运营补货',
  })
  const unlimited = { cost: 400, stock: null, member_only: false }
  assert.equal(mallRedeemState(unlimited, { points: 400 }).ok, true)
})

test('mallRedeemState：积分不足给差额，正好够可以兑换', () => {
  const item = { cost: 6000, stock: 199, member_only: false }
  assert.deepEqual(mallRedeemState(item, { points: 500 }), { ok: false, reason: '还差 5500 积分' })
  assert.equal(mallRedeemState(item, { points: 6000 }).ok, true)
  assert.equal(mallRedeemState(item, { points: 99999 }).ok, true)
  // 缺省参数不崩：store 还没拉到账户时也算「积分不够」而不是可点
  assert.equal(mallRedeemState(item).ok, false)
})
