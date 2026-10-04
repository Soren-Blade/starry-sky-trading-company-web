import test from 'node:test'
import assert from 'node:assert/strict'

import {
  computeSecondsRemaining,
  isNewPeriod,
  DEFAULT_STEP,
} from '../src/utils/totpCountdown.js'
import { loadAppModule } from './setup.js'

const at = (seconds) => seconds * 1000

test('DEFAULT_STEP 为 30（与 RFC 6238 推荐值一致）', () => {
  assert.equal(DEFAULT_STEP, 30)
})

// ── 取值范围 ───────────────────────────────────────────────────

test('computeSecondsRemaining：结果恒在 1..step 之间', () => {
  for (let s = 0; s < 300; s++) {
    const n = computeSecondsRemaining(at(s))
    assert.ok(n >= 1 && n <= 30, `t=${s}s 得到 ${n}，超出 1..30`)
  }
})

test('computeSecondsRemaining：周期边界返回 step（而不是 0）', () => {
  // 0s / 30s / 60s 都是整周期边界，倒计时应显示 30 而不是 0
  for (const s of [0, 30, 60, 90, 300]) {
    assert.equal(computeSecondsRemaining(at(s)), 30, `t=${s}s 应显示 30`)
  }
})

test('computeSecondsRemaining：周期内递减', () => {
  assert.equal(computeSecondsRemaining(at(0)), 30)
  assert.equal(computeSecondsRemaining(at(1)), 29)
  assert.equal(computeSecondsRemaining(at(15)), 15)
  assert.equal(computeSecondsRemaining(at(29)), 1)
  assert.equal(computeSecondsRemaining(at(30)), 30, '进入下一周期')
  assert.equal(computeSecondsRemaining(at(31)), 29)
})

test('computeSecondsRemaining：与 TOTP 计数器一致（同一周期内 counter 不变）', () => {
  // 倒计时只应在周期边界处回到 30
  const boundaries = []
  for (let s = 0; s <= 120; s++) {
    if (computeSecondsRemaining(at(s)) === 30) boundaries.push(s)
  }
  assert.deepEqual(boundaries, [0, 30, 60, 90, 120])
})

// ── 毫秒精度 ───────────────────────────────────────────────────

test('computeSecondsRemaining：毫秒部分不影响结果（按秒取整）', () => {
  assert.equal(computeSecondsRemaining(1_000), 29)
  assert.equal(computeSecondsRemaining(1_999), 29)
  assert.equal(computeSecondsRemaining(29_999), 1)
  assert.equal(computeSecondsRemaining(30_000), 30)
})

// ── 自定义周期 ─────────────────────────────────────────────────

test('computeSecondsRemaining：支持自定义 step', () => {
  assert.equal(computeSecondsRemaining(at(0), 60), 60)
  assert.equal(computeSecondsRemaining(at(59), 60), 1)
  assert.equal(computeSecondsRemaining(at(60), 60), 60)
  assert.equal(computeSecondsRemaining(at(5), 15), 10)
})

test('computeSecondsRemaining：非法 step 回退到默认值', () => {
  for (const bad of [0, -1, NaN, Infinity, undefined, null, 'abc']) {
    const n = computeSecondsRemaining(at(0), bad)
    assert.ok(Number.isFinite(n) && n >= 1, `step=${JSON.stringify(bad)} 得到 ${n}`)
  }
})

// ── 负数与异常时间 ─────────────────────────────────────────────

test('computeSecondsRemaining：负时间戳不产生负倒计时', () => {
  // 取模在负数上会得到负值，实现里必须做规范化
  for (const s of [-1, -30, -31, -59, -300]) {
    const n = computeSecondsRemaining(at(s))
    assert.ok(n >= 1 && n <= 30, `t=${s}s 得到 ${n}`)
  }
})

test('computeSecondsRemaining：非数字时间戳回退到默认（不产生 NaN）', () => {
  const savedNow = Date.now
  try {
    Date.now = () => NaN
    const n = computeSecondsRemaining()
    assert.ok(Number.isFinite(n), `应得到有限值，实际 ${n}`)
  } finally {
    Date.now = savedNow
  }
})

// ── isNewPeriod ────────────────────────────────────────────────

test('isNewPeriod：仅在周期边界为真', () => {
  assert.equal(isNewPeriod(at(0)), true)
  assert.equal(isNewPeriod(at(30)), true)
  assert.equal(isNewPeriod(at(60)), true)
  assert.equal(isNewPeriod(at(1)), false)
  assert.equal(isNewPeriod(at(29)), false)
  assert.equal(isNewPeriod(at(31)), false)
})

test('isNewPeriod：与 computeSecondsRemaining 保持一致', () => {
  for (let s = 0; s < 120; s++) {
    assert.equal(
      isNewPeriod(at(s)),
      computeSecondsRemaining(at(s)) === DEFAULT_STEP,
      `t=${s}s 两者不一致`
    )
  }
})

test('isNewPeriod：支持自定义 step', () => {
  assert.equal(isNewPeriod(at(0), 60), true)
  assert.equal(isNewPeriod(at(30), 60), false)
  assert.equal(isNewPeriod(at(60), 60), true)
})

// ── 模块加载（生产路径） ───────────────────────────────────────

test('通过 loadAppModule 可正常加载', async () => {
  const mod = await loadAppModule('/utils/totpCountdown.js')
  assert.equal(typeof mod.computeSecondsRemaining, 'function')
  assert.equal(typeof mod.isNewPeriod, 'function')
  assert.equal(mod.DEFAULT_STEP, 30)
})
