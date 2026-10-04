import test from 'node:test'
import assert from 'node:assert/strict'

import {
  animationUtils,
  styleUtils,
  responsiveUtils,
  domUtils,
  formatUtils,
  debounce,
  throttle,
  generateId,
} from '../src/utils/index.js'

// 说明：这些工具函数不依赖 Vue，可以在纯 Node 下运行。
// 需要 DOM 的部分（window/document）自行用最小桩替代。

test('formatPrice：两位小数并带货币符号', () => {
  assert.equal(formatUtils.formatPrice(89), '¥89.00')
  assert.equal(formatUtils.formatPrice(0), '¥0.00')
  assert.equal(formatUtils.formatPrice(12.345), '¥12.35')
})

test('formatRating：保留一位小数', () => {
  assert.equal(formatUtils.formatRating(4.256), '4.3')
  assert.equal(formatUtils.formatRating(5), '5.0')
})

test('formatReviewCount：按量级使用 k / 万 后缀', () => {
  assert.equal(formatUtils.formatReviewCount(999), '999')
  assert.equal(formatUtils.formatReviewCount(1000), '1.0k')
  assert.equal(formatUtils.formatReviewCount(1500), '1.5k')
  assert.equal(formatUtils.formatReviewCount(10000), '1.0万')
  assert.equal(formatUtils.formatReviewCount(123456), '12.3万')
})

test('staggerDelay：按索引线性递增', () => {
  assert.equal(animationUtils.staggerDelay(0), '0s')
  assert.equal(animationUtils.staggerDelay(2, 0.15), '0.3s')
})

test('getAnimationClass：组合类名，可关闭 stagger', () => {
  assert.equal(animationUtils.getAnimationClass('fadeInUp', 2), 'animate-in animate-fadeInUp stagger-2')
  assert.equal(animationUtils.getAnimationClass('fadeInUp', 2, false), 'animate-in animate-fadeInUp')
})

test('getGradient：生成线性渐变字符串', () => {
  assert.equal(styleUtils.getGradient('#000', '#fff', 90), 'linear-gradient(90deg, #000 0%, #fff 100%)')
})

test('getShadow：未知级别回退到 md', () => {
  assert.equal(styleUtils.getShadow('not-a-level'), styleUtils.getShadow('md'))
})

test('getTransition：数组形式拼接多个属性', () => {
  assert.equal(
    styleUtils.getTransition(['color', 'opacity'], 0.2, 'linear'),
    'color 0.2s linear, opacity 0.2s linear'
  )
})

test('getColumns：按宽度给出栅格列数', () => {
  assert.equal(responsiveUtils.getColumns(1280), 4)
  assert.equal(responsiveUtils.getColumns(1024), 3)
  assert.equal(responsiveUtils.getColumns(800), 2)
  assert.equal(responsiveUtils.getColumns(400), 1)
})

test('generateId：每次调用都不相同', () => {
  const a = generateId()
  const b = generateId()
  assert.equal(typeof a, 'string')
  assert.notEqual(a, b)
})

test('debounce：只在停止调用后执行一次', async () => {
  let calls = 0
  const fn = debounce(() => { calls += 1 }, 20)
  fn(); fn(); fn()
  assert.equal(calls, 0, '防抖窗口内不应执行')
  await new Promise((r) => { setTimeout(r, 50) })
  assert.equal(calls, 1)
})

test('throttle：窗口内只执行一次', () => {
  let calls = 0
  const fn = throttle(() => { calls += 1 }, 50)
  fn(); fn(); fn()
  assert.equal(calls, 1)
})

test('getScrollPercent：无法计算时返回 0 而不是 NaN', () => {
  // 纯 Node 下没有 document，这里注入一个「高度为 0」的最小桩
  globalThis.window = { scrollY: 0, innerHeight: 0, addEventListener() {}, removeEventListener() {} }
  globalThis.document = { documentElement: { scrollHeight: 0 } }
  assert.equal(domUtils.getScrollPercent(), 0)
  delete globalThis.window
  delete globalThis.document
})
