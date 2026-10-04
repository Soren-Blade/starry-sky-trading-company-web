import test from 'node:test'
import assert from 'node:assert/strict'

import { domUtils, formatUtils, throttle } from '../src/utils/index.js'

// 说明：这些工具函数不依赖 Vue，可以在纯 Node 下运行。
// 需要 DOM 的部分（window/document）自行用最小桩替代。
//
// 本文件原先还覆盖 animationUtils / styleUtils / responsiveUtils / generateId /
// debounce / domUtils.getScrollPercent —— 这些工具在生产代码里**没有任何调用方**
// （配色与动画早已改由设计令牌 + CSS 关键帧承担，用 JS 拼样式字符串只会制造
// 第二份事实来源），已随实现一起删除。

test('formatPrice：默认两位小数并带人民币符号', () => {
  assert.equal(formatUtils.formatPrice(89), '¥89.00')
  assert.equal(formatUtils.formatPrice(0), '¥0.00')
  assert.equal(formatUtils.formatPrice(12.345), '¥12.35')
})

test('formatPrice：货币描述来自主题（technical-monochrome 用 $）', () => {
  assert.equal(formatUtils.formatPrice(89, { prefix: '$' }), '$89.00')
  assert.equal(formatUtils.formatPrice(89, { prefix: '$', decimals: 0 }), '$89')
  // 非法入参必须兜底，不能把 undefined 拼进价格
  assert.equal(formatUtils.formatPrice(89, { prefix: null, decimals: 'x' }), '¥89.00')
  assert.equal(formatUtils.formatPrice(undefined), '¥0.00')
  assert.equal(formatUtils.formatPrice('abc'), '¥0.00')
  assert.equal(formatUtils.formatPrice('12.5'), '¥12.50')
})

test('splitPrice：拆成前缀/整数/小数，供模板对小数单独设字号', () => {
  assert.deepEqual(formatUtils.splitPrice(1234.5), {
    prefix: '¥',
    integer: '1,234',
    decimals: '50',
    text: '¥1,234.50',
  })
  // 无小数的风格：decimals 是空串，模板据此不渲染小数节点
  assert.deepEqual(formatUtils.splitPrice(89, { prefix: '$', decimals: 0 }), {
    prefix: '$',
    integer: '89',
    decimals: '',
    text: '$89',
  })
  // 负数与非法值都不能产出 NaN
  assert.equal(formatUtils.splitPrice(-5).text, '¥-5.00')
  assert.equal(formatUtils.splitPrice(null, { decimals: 0 }).text, '¥0')
  assert.equal(formatUtils.splitPrice(1.005, { decimals: 2 }).text, '¥1.00')
})

test('formatReviewCount：按量级使用 k / 万 后缀', () => {
  assert.equal(formatUtils.formatReviewCount(999), '999')
  assert.equal(formatUtils.formatReviewCount(1000), '1.0k')
  assert.equal(formatUtils.formatReviewCount(1500), '1.5k')
  assert.equal(formatUtils.formatReviewCount(10000), '1.0万')
  assert.equal(formatUtils.formatReviewCount(123456), '12.3万')
  assert.equal(formatUtils.formatReviewCount(null), '0', '缺失值兜底为 0 而不是 NaN')
  assert.equal(formatUtils.formatReviewCount('abc'), '0')
})

test('throttle：窗口内只执行一次', () => {
  let calls = 0
  const fn = throttle(() => {
    calls += 1
  }, 50)
  fn()
  fn()
  fn()
  assert.equal(calls, 1)
})

test('throttle：窗口结束后可再次执行，且透传参数与 this', async () => {
  const seen = []
  const fn = throttle((...args) => seen.push(args), 20)
  fn('a')
  await new Promise((r) => {
    setTimeout(r, 40)
  })
  fn('b')
  assert.deepEqual(seen, [['a'], ['b']])
})

test('domUtils.smoothScroll：选择器与元素两种入参都不抛错', () => {
  const scrolled = []
  globalThis.document = {
    querySelector: (selector) => ({
      scrollIntoView: (options) => scrolled.push({ selector, options }),
    }),
  }
  try {
    domUtils.smoothScroll('.target')
    domUtils.smoothScroll({ scrollIntoView: (options) => scrolled.push({ element: options }) })
    // 选择器没匹配到元素时不应抛错
    globalThis.document.querySelector = () => null
    assert.doesNotThrow(() => domUtils.smoothScroll('.missing'))
  } finally {
    delete globalThis.document
  }
  assert.equal(scrolled.length, 2)
  assert.equal(scrolled[0].selector, '.target')
})
