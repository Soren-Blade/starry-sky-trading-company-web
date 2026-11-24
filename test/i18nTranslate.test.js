/**
 * `translate()` 的兜底插值
 *
 * 中文页曾漏出 `{points}` / `{date}`：vue-i18n 只对**已存在**的词条插值，
 * 缺词条时旧实现直接 `return fallback`，占位符原样落到页面上。
 * 这里锁住修复后的行为：兜底文案也必须插值，缺参时保留占位符（便于暴露漏传）。
 */
import test from 'node:test'
import assert from 'node:assert/strict'
import { setLocale, translate } from '../src/i18n/index.js'

const MISSING = 'test.missing.pointsExpiring'

test('缺词条：兜底文案按 params 插值，不再漏出花括号', () => {
  setLocale('zh-CN')
  const text = translate(MISSING, '{points} 积分将于 {date} 过期', {
    points: '1,200',
    date: '2026-12-01',
  })
  assert.equal(text, '1,200 积分将于 2026-12-01 过期')
  assert.doesNotMatch(text, /[{}]/)
})

test('缺词条：缺参时保留占位符，而不是渲染成 undefined', () => {
  setLocale('zh-CN')
  assert.equal(translate(MISSING, '{points} 积分将于 {date} 过期', { points: 100 }), '100 积分将于 {date} 过期')
  assert.equal(translate(MISSING, '{points} 积分将于 {date} 过期'), '{points} 积分将于 {date} 过期')
})

test('缺词条：null / undefined 参数保留占位符；0 与空串正常插值', () => {
  setLocale('zh-CN')
  assert.equal(translate(MISSING, '差 {points} 分', { points: 0 }), '差 0 分')
  assert.equal(translate(MISSING, '名字：{name}', { name: '' }), '名字：')
  assert.equal(translate(MISSING, '名字：{name}', { name: null }), '名字：{name}')
})

test('已存在词条仍由 vue-i18n 插值（英文 locale）', () => {
  setLocale('en-US')
  const text = translate('pages.profile.pointsExpiring', 'x', { points: 300, date: 'Dec 1, 2026' })
  assert.match(text, /300/)
  assert.match(text, /Dec 1, 2026/)
  setLocale('zh-CN')
})
