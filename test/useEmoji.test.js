import test from 'node:test'
import assert from 'node:assert/strict'

import {
  getEmojiGradient,
  getEmojiInfo,
  getEmojisByCategory,
  getCategoryInfo,
  addCustomEmoji,
  getEmojiStyle,
  generateRandomGradient,
} from '../src/hooks/useEmoji/index.js'

test('getEmojiGradient：已知 emoji 返回对应渐变', () => {
  const gradient = getEmojiGradient('👤')
  assert.match(gradient, /^linear-gradient\(135deg, #8A6DFF 0%, #6C5CE7 100%\)$/)
})

test('getEmojiGradient：未知 emoji 回退到默认渐变而不是抛错', () => {
  const gradient = getEmojiGradient('🦄🦄🦄')
  assert.match(gradient, /^linear-gradient\(/)
})

test('getEmojiGradient：null/undefined 不抛错（曾因 emoji.trim() 无保护而崩溃）', () => {
  // CategorySection 直接传 category.icon_url，而该字段可为 NULL
  assert.doesNotThrow(() => getEmojiGradient(null))
  assert.doesNotThrow(() => getEmojiGradient(undefined))
  assert.match(getEmojiGradient(null), /^linear-gradient\(/)
})

test('getEmojiGradient：空字符串不抛错', () => {
  assert.doesNotThrow(() => getEmojiGradient(''))
})

test('getEmojiGradient：忽略首尾空白', () => {
  assert.equal(getEmojiGradient('  👤  '), getEmojiGradient('👤'))
})

test('getEmojiGradient：可覆盖角度与颜色', () => {
  const gradient = getEmojiGradient('👤', { angle: 90 })
  assert.match(gradient, /^linear-gradient\(90deg,/)
})

test('getEmojiGradient：opacity < 1 时输出 rgba', () => {
  const gradient = getEmojiGradient('👤', { opacity: 0.5 })
  assert.match(gradient, /rgba\(138, 109, 255, 0\.5\)/)
})

test('generateRandomGradient：返回合法渐变且默认 135 度', () => {
  const gradient = generateRandomGradient()
  assert.match(gradient, /^linear-gradient\(135deg, #[0-9A-F]{6} 0%, #[0-9A-F]{6} 100%\)$/)
})

test('getEmojiInfo：返回渐变、颜色、角度与分类名', () => {
  const info = getEmojiInfo('✅')
  assert.equal(info.emoji, '✅')
  assert.match(info.gradient, /^linear-gradient\(/)
  assert.equal(info.colors.length, 2)
  assert.equal(typeof info.category, 'string')
  assert.equal(typeof info.categoryName, 'string')
  assert.notEqual(info.categoryName, '')
})

test('getEmojiInfo：未知 emoji 回退到 default 分类', () => {
  const info = getEmojiInfo('🦄🦄🦄')
  assert.equal(info.category, 'default')
})

test('getEmojiInfo：null 不抛错', () => {
  assert.doesNotThrow(() => getEmojiInfo(null))
})

test('getEmojisByCategory：返回该分类下的 emoji，且不含 default', () => {
  const social = getEmojisByCategory('social')
  assert.ok(Array.isArray(social))
  assert.ok(social.length > 0)
  assert.equal(social.includes('default'), false)

  const notExist = getEmojisByCategory('不存在的分类')
  assert.deepEqual(notExist, [])
})

test('getCategoryInfo：每个分类都带名称、数量与前 10 个 emoji', () => {
  const info = getCategoryInfo()
  assert.ok(Object.keys(info).length > 0)

  for (const [, value] of Object.entries(info)) {
    assert.equal(typeof value.name, 'string')
    assert.ok(Number.isInteger(value.count))
    assert.ok(Array.isArray(value.emojis))
    assert.ok(value.emojis.length <= 10, 'emojis 应被截断到最多 10 个')
  }
})

test('addCustomEmoji：合法配置可写入并生效', () => {
  const ok = addCustomEmoji('🧪', { colors: ['#111111', '#222222'], category: 'custom' })
  assert.equal(ok, true)
  // 写入后应能取到对应渐变（注意污染问题：见下一条用例）
  assert.match(getEmojiGradient('🧪'), /#111111/)
})

test('addCustomEmoji：非法配置被拒绝', () => {
  assert.equal(addCustomEmoji('🧪', { colors: ['#111'] }), false)
  assert.equal(addCustomEmoji('🧪', { colors: 'not-array' }), false)
  assert.equal(addCustomEmoji('🧪', null), false)
})

test('getEmojiStyle：返回可直接绑定的样式对象', () => {
  const style = getEmojiStyle('👤')
  assert.equal(style.display, 'flex')
  assert.equal(style.color, '#FFFFFF')
  assert.match(style.background, /^linear-gradient\(/)
  assert.equal(style.userSelect, 'none')
})

test('getEmojiStyle：可覆盖尺寸与圆角', () => {
  const style = getEmojiStyle('👤', { width: '80px', height: '80px', borderRadius: '50%' })
  assert.equal(style.width, '80px')
  assert.equal(style.height, '80px')
  assert.equal(style.borderRadius, '50%')
})

test('getEmojiStyle：gradient 相关选项透传而不是落到样式里', () => {
  const style = getEmojiStyle('👤', { angle: 90, opacity: 0.5 })
  assert.equal('angle' in style, false)
  assert.equal('opacity' in style, false)
  assert.match(style.background, /^linear-gradient\(90deg,/)
})
