/**
 * 工具页共用格式化的测试。`formatBytes` 原先在两页各写一份，很容易一边改了
 * 保留位数另一边忘了；这里把边界钉住。
 */
import test from 'node:test'
import assert from 'node:assert/strict'

import { formatBytes, formatDuration, sizeDeltaLabel } from '../src/utils/format.js'

test('formatBytes：B / KB / MB 三段与非法输入', () => {
  assert.equal(formatBytes(0), '0 B')
  assert.equal(formatBytes(-1), '0 B')
  assert.equal(formatBytes(Number.NaN), '0 B')
  assert.equal(formatBytes(undefined), '0 B')
  assert.equal(formatBytes(512), '512 B')
  assert.equal(formatBytes(1023), '1023 B')
  assert.equal(formatBytes(1024), '1.0 KB')
  assert.equal(formatBytes(1536), '1.5 KB')
  assert.equal(formatBytes(1024 * 1024), '1.00 MB')
  assert.equal(formatBytes(5.5 * 1024 * 1024), '5.50 MB')
})

test('formatDuration：分:秒补零，异常值给「未知」', () => {
  assert.equal(formatDuration(0), '未知')
  assert.equal(formatDuration(-3), '未知')
  assert.equal(formatDuration(Number.POSITIVE_INFINITY), '未知')
  assert.equal(formatDuration(9), '0:09')
  assert.equal(formatDuration(65), '1:05')
  assert.equal(formatDuration(3600), '60:00')
  // 四舍五入到秒
  assert.equal(formatDuration(59.6), '1:00')
})

test('sizeDeltaLabel：变小带负号、变大带正号、缺失给占位', () => {
  assert.equal(sizeDeltaLabel(1000, 800), '-20.0%')
  assert.equal(sizeDeltaLabel(1000, 1000), '-0.0%')
  assert.equal(sizeDeltaLabel(1000, 1250), '+25.0%')
  assert.equal(sizeDeltaLabel(0, 100), '—')
  assert.equal(sizeDeltaLabel(100, 0), '—')
})
