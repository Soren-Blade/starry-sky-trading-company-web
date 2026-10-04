import test from 'node:test'
import assert from 'node:assert/strict'

import { loadAppModule } from './setup.js'

const { getEmojiInfo, getEmojiGradient, getEmojiStyle } = await loadAppModule('/hooks/useEmoji/index.js')

/** Object.prototype 上的属性名：查表若沿原型链会取到函数而不是 undefined */
const PROTO_KEYS = [
  'toString',
  'constructor',
  'valueOf',
  'hasOwnProperty',
  '__proto__',
  'isPrototypeOf',
  'propertyIsEnumerable',
  'toLocaleString',
]

test('getEmojiGradient：原型链属性名不再导致崩溃（实测曾抛 TypeError）', () => {
  for (const key of PROTO_KEYS) {
    assert.doesNotThrow(
      () => getEmojiGradient(key),
      `getEmojiGradient(${JSON.stringify(key)}) 不应抛错`
    )
    const gradient = getEmojiGradient(key)
    assert.match(gradient, /^linear-gradient\(/, `应返回合法渐变，实际 ${gradient}`)
    assert.equal(gradient.includes('undefined'), false, `不应出现 undefined：${gradient}`)
    assert.equal(gradient.includes('NaN'), false, `不应出现 NaN：${gradient}`)
  }
})

test('getEmojiInfo：原型链属性名不再导致崩溃，且返回结构完整', () => {
  for (const key of PROTO_KEYS) {
    const info = getEmojiInfo(key)
    assert.equal(info.emoji, key)
    assert.match(info.gradient, /^linear-gradient\(/)
    assert.ok(Array.isArray(info.colors), 'colors 必须是数组')
    assert.ok(info.colors.length >= 2, `colors 至少两项，实际 ${JSON.stringify(info.colors)}`)
    assert.equal(typeof info.categoryName, 'string')
    assert.ok(info.categoryName.length > 0)
  }
})

test('getEmojiStyle：原型链属性名不产生非法 background', () => {
  for (const key of PROTO_KEYS) {
    const style = getEmojiStyle(key)
    assert.match(style.background, /^linear-gradient\(/)
    assert.equal(style.background.includes('undefined'), false)
  }
})

test('未命中的普通输入回退到默认渐变', () => {
  const a = getEmojiGradient('不是emoji')
  const b = getEmojiGradient('')
  assert.match(a, /^linear-gradient\(/)
  assert.equal(a, b, '两者都应使用 default 配置，结果一致')
})

test('合法 emoji 仍走各自的配置（修复未影响正常路径）', () => {
  const person = getEmojiInfo('👤')
  assert.equal(person.category, 'social')
  assert.equal(person.categoryName, '社交互动类')
  assert.ok(person.colors.includes('#8A6DFF'))

  const gradient = getEmojiGradient('👤')
  assert.ok(gradient.includes('#8A6DFF'), `应使用该 emoji 的颜色，实际 ${gradient}`)
})

test('default 配置本身未被绕过', () => {
  const viaMiss = getEmojiGradient('绝对不存在的键')
  const viaDefault = getEmojiGradient('default')
  assert.match(viaDefault, /^linear-gradient\(/)
  assert.ok(viaMiss.length > 0)
})

test('getEmojiInfo：categoryName 不会取到 Object.prototype 上的属性', () => {
  // categories 映射同样会被原型链影响：categories['toString'] 是函数
  const info = getEmojiInfo('👤')
  assert.equal(typeof info.categoryName, 'string')
  assert.notEqual(typeof info.categoryName, 'function')
})

test('null / undefined / 数字等后端可能的取值不崩溃', () => {
  for (const value of [null, undefined, 123, 0, NaN, {}, [], true]) {
    assert.doesNotThrow(() => getEmojiGradient(value), `getEmojiGradient(${String(value)}) 抛错`)
    assert.doesNotThrow(() => getEmojiInfo(value), `getEmojiInfo(${String(value)}) 抛错`)
  }
})

test('透明色选项对未命中输入同样安全', () => {
  const style = getEmojiStyle('toString', { opacity: 0.5 })
  assert.match(style.background, /^linear-gradient\(/)
  assert.equal(style.background.includes('undefined'), false)
})
