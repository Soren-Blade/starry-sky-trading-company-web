import test from 'node:test'
import assert from 'node:assert/strict'

import {
  MEMBER_BENEFITS,
  MEMBER_BENEFIT_MAP,
  SUPPORT_TIER_LABELS,
  IDENTITY_TIER_LABELS,
  formatBenefitValue,
  formatBenefitNext,
} from '../src/constants/member.js'

/**
 * 后端 `benefits[].value` 的翻译守卫（v1.4.0 新增）
 *
 * ## 为什么需要
 *
 * `value` 是后端下发的**结构化数值**（`{ type, current, next, next_level }`），
 * 一个中文字符都没有 —— 所有单位、折扣说法、"不限"、客服等级名都由
 * `formatBenefitValue` 翻译。它一旦漏掉某个 `type`，页面**不会报错**，
 * 只是权益卡上少一个数字（`''`），肉眼很难发现。所以这里逐类型钉住。
 *
 * ## 三条口径（与 constants 里的文档注释同源）
 *
 * 1. **只翻译不计算**：数值全部来自后端，前端不推算
 * 2. `money` / `percent` / `multiplier` / `rate` 的 0 或非法值 → **空串**，
 *    不是 `¥0` / `0%`：`birthday_value = 0` 的语义是「这一档还没有这项礼遇」
 * 3. 认不出的 `type` → 空串（后端将来加类型时页面显示空，而不是 `undefined`）
 */

test('rate：折扣率翻译成中文折扣，不打折与脏数据给空串', () => {
  assert.equal(formatBenefitValue({ type: 'rate', current: 0.95 }), '95 折')
  assert.equal(formatBenefitValue({ type: 'rate', current: 0.9 }), '9 折')
  assert.equal(formatBenefitValue({ type: 'rate', current: 0.82 }), '82 折')
  assert.equal(formatBenefitValue({ type: 'rate', current: 0.945 }), '94.5 折')

  // 1 = 不打折。显示「无折扣」不如不显示 —— 权益卡上单独一句「无折扣」会像坏数据
  assert.equal(formatBenefitValue({ type: 'rate', current: 1 }), '')
  for (const bad of [0, -0.1, null, undefined, NaN, 'abc']) {
    assert.equal(formatBenefitValue({ type: 'rate', current: bad }), '')
  }
})

test('multiplier：整数倍率也带一位小数（×2.0 而不是 ×2）', () => {
  // 「×2」与「×2.0」在阶梯表里并排出现会显得不整齐，统一一位小数
  assert.equal(formatBenefitValue({ type: 'multiplier', current: 2 }), '×2.0')
  assert.equal(formatBenefitValue({ type: 'multiplier', current: 3.5 }), '×3.5')
  assert.equal(formatBenefitValue({ type: 'multiplier', current: 5 }), '×5.0')

  for (const bad of [0, -1, null, undefined, NaN, 'abc']) {
    assert.equal(formatBenefitValue({ type: 'multiplier', current: bad }), '')
  }
})

test('money：整数不带小数点、非整数两位小数，0 给空串（不是 ¥0）', () => {
  assert.equal(formatBenefitValue({ type: 'money', current: 10 }), '¥10')
  assert.equal(formatBenefitValue({ type: 'money', current: 200 }), '¥200')
  assert.equal(formatBenefitValue({ type: 'money', current: 12.5 }), '¥12.50')

  // V1–V3 的 birthday_value = 0：这一档还没有生日礼遇，必须显示「V4 解锁」而不是「¥0」
  assert.equal(formatBenefitValue({ type: 'money', current: 0 }), '')
  for (const bad of [null, undefined, NaN, 'abc']) {
    assert.equal(formatBenefitValue({ type: 'money', current: bad }), '')
  }
})

test('percent：0.3 → 30%，且 0.31 不会因浮点变成 31.000000000000004%', () => {
  assert.equal(formatBenefitValue({ type: 'percent', current: 0.3 }), '30%')
  assert.equal(formatBenefitValue({ type: 'percent', current: 0.31 }), '31%')
  assert.equal(formatBenefitValue({ type: 'percent', current: 0.35 }), '35%')
  assert.equal(formatBenefitValue({ type: 'percent', current: 0.4 }), '40%')

  assert.equal(formatBenefitValue({ type: 'percent', current: 0 }), '')
  for (const bad of [null, undefined, NaN]) {
    assert.equal(formatBenefitValue({ type: 'percent', current: bad }), '')
  }
})

test('quota：-1（不限）与 0 的区别 —— 免卡密额度放开后必须说「不限」', () => {
  assert.equal(formatBenefitValue({ type: 'quota', current: 1 }), '1 个')
  assert.equal(formatBenefitValue({ type: 'quota', current: 8 }), '8 个')
  // 后端用 -1 表达不限（V7/V8）。显示「-1 个」是这类界面最常见的低级错误
  assert.equal(formatBenefitValue({ type: 'quota', current: -1 }), '不限')
  assert.equal(formatBenefitValue({ type: 'quota', current: -10 }), '不限')
  // 0 是「一个都没有」，与「不限」相反，照实显示
  assert.equal(formatBenefitValue({ type: 'quota', current: 0 }), '0 个')

  for (const bad of [null, undefined, NaN, 'abc']) {
    assert.equal(formatBenefitValue({ type: 'quota', current: bad }), '')
  }
})

test('tier：靠调用方给的翻译表，缺表或未知枚举给空串', () => {
  assert.equal(formatBenefitValue({ type: 'tier', current: 'standard' }, SUPPORT_TIER_LABELS), '标准客服')
  assert.equal(formatBenefitValue({ type: 'tier', current: 'priority' }, SUPPORT_TIER_LABELS), '优先客服')
  assert.equal(formatBenefitValue({ type: 'tier', current: 'dedicated' }, SUPPORT_TIER_LABELS), '专属客服经理')
  assert.equal(formatBenefitValue({ type: 'tier', current: 'badge' }, IDENTITY_TIER_LABELS), '会员徽章')
  assert.equal(formatBenefitValue({ type: 'tier', current: 'limited' }, IDENTITY_TIER_LABELS), '限定标识')

  // identity 的 none 有意是空串：V1/V2 没有身份标识，卡片该显示「V3 解锁」
  assert.equal(formatBenefitValue({ type: 'tier', current: 'none' }, IDENTITY_TIER_LABELS), '')
  // 忘了传表（调用方最容易犯的错）不能崩，也不能显示 undefined
  assert.equal(formatBenefitValue({ type: 'tier', current: 'badge' }), '')
  // 后端加了新枚举而前端翻译表没跟
  assert.equal(formatBenefitValue({ type: 'tier', current: 'platinum' }, IDENTITY_TIER_LABELS), '')
})

test('非法输入一律空串：undefined / null / 非对象 / 未知 type', () => {
  // 未解锁的权益**没有 value 键**，调用方会拿到 undefined —— 这是最常见的一次调用
  for (const bad of [undefined, null, 'rate', 0, [], { current: 0.95 }]) {
    assert.equal(formatBenefitValue(bad), '', `formatBenefitValue(${JSON.stringify(bad)}) 应为空串`)
  }
  // 后端将来加一种新类型：页面留空，而不是 undefined
  assert.equal(formatBenefitValue({ type: 'mystery', current: 1 }), '')
})

test('formatBenefitNext：只回答「下一档是多少」，没有下一档给空串', () => {
  assert.equal(formatBenefitNext({ type: 'rate', current: 0.95, next: 0.94, next_level: 'v2' }), '94 折')
  assert.equal(formatBenefitNext({ type: 'multiplier', current: 2, next: 2.2, next_level: 'v2' }), '×2.2')
  assert.equal(formatBenefitNext({ type: 'quota', current: 8, next: -1, next_level: 'v7' }), '不限')

  // 最高档 / 该权益已拉满：后端用 jsonb_strip_nulls 把 next 与 next_level 一起拿掉
  assert.equal(formatBenefitNext({ type: 'rate', current: 0.82, next_level: null }), '')
  assert.equal(formatBenefitNext({ type: 'rate', current: 0.82 }), '')
  assert.equal(formatBenefitNext({ type: 'money', current: 200, next: null }), '')
  // next 是 0 且类型是 money → 空串（与 current 同口径）
  assert.equal(formatBenefitNext({ type: 'money', current: 50, next: 0 }), '')

  for (const bad of [undefined, null, 'rate', 0]) {
    assert.equal(formatBenefitNext(bad), '', `formatBenefitNext(${JSON.stringify(bad)}) 应为空串`)
  }
})

test('每种 valueType 都有翻译实现（新增权益时忘了加 case，会静默显示空白）', () => {
  // 每个 type 给一个「必非空」的样例：能翻译出来才算实现了这个 case
  const SAMPLES = {
    rate: [0.95, null],
    multiplier: [2, null],
    money: [10, null],
    percent: [0.3, null],
    quota: [1, null],
    tier: ['standard', SUPPORT_TIER_LABELS],
  }

  const typesInUse = [...new Set(MEMBER_BENEFITS.map((b) => b.valueType))].sort()
  assert.deepEqual(
    typesInUse,
    Object.keys(SAMPLES).sort(),
    '出现了没有样例的 valueType —— 请同时给 formatBenefitValue 加实现与样例'
  )

  for (const [type, [current, labels]] of Object.entries(SAMPLES)) {
    assert.notEqual(
      formatBenefitValue({ type, current }, labels),
      '',
      `valueType=${type} 翻译不出来（页面会少一个数字且不报错）`
    )
  }
})

test('tier 类权益必须自带翻译表，其余类型不该带（表带错只会静默显示空白）', () => {
  for (const b of MEMBER_BENEFITS) {
    if (b.valueType === 'tier') {
      assert.ok(b.tierLabels, `${b.key} 是 tier 类型但没有 tierLabels`)
      // 翻译表不能是空对象：空表等于没翻译
      assert.ok(Object.keys(b.tierLabels).length > 0, `${b.key} 的 tierLabels 是空表`)
    } else {
      assert.equal(b.tierLabels, undefined, `${b.key} 不是 tier 类型，不该带 tierLabels`)
    }
  }
  // 两张表都必须能被 formatter 直接吃下
  assert.equal(MEMBER_BENEFIT_MAP.support.tierLabels, SUPPORT_TIER_LABELS)
  assert.equal(MEMBER_BENEFIT_MAP.identity.tierLabels, IDENTITY_TIER_LABELS)
})
