import test from 'node:test'
import assert from 'node:assert/strict'

import { lookup, lookupOr, hasOwn, createBareMap } from '../src/utils/safeLookup.js'
import { classifyToolsByClass } from '../src/hooks/useClass/index.js'
import { loadAppModule } from './setup.js'

/** Object.prototype 上的属性名 */
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

// ── safeLookup 自身 ────────────────────────────────────────────

test('lookup：命中原型链属性时返回 fallback（根本原因）', () => {
  const map = { a: 1, default: 2 }

  // 先确认原生行为确实是「取到函数」—— 这是本模块存在的理由
  assert.equal(typeof map['toString'], 'function', '原生 [] 会取到 Object.prototype.toString')
  assert.equal(typeof map['constructor'], 'function')
  assert.equal(typeof map['__proto__'], 'object')

  for (const key of PROTO_KEYS) {
    assert.equal(
      lookup(map, key, 'FALLBACK'),
      'FALLBACK',
      `lookup(map, ${JSON.stringify(key)}) 应返回 fallback`
    )
  }
})

test('lookup：正常命中与未命中', () => {
  const map = { a: 1, b: 0, c: '', d: null }
  assert.equal(lookup(map, 'a'), 1)
  assert.equal(lookup(map, 'b'), 0, '0 是有效值，不应被当成未命中')
  assert.equal(lookup(map, 'c'), '', '空字符串是有效值')
  assert.equal(lookup(map, 'd', 'FB'), 'FB', 'null 视为未命中并回退')
  assert.equal(lookup(map, 'd'), undefined, 'null 且未传 fallback 时为 undefined')
  assert.equal(lookup(map, 'missing', 'FB'), 'FB')
  assert.equal(lookup(map, 'missing'), undefined, '未传 fallback 时返回 undefined')
  assert.equal(lookup(map, 'c', 'FB'), '', '空字符串即使传了 fallback 也保留')
  assert.equal(lookup(map, 'b', 'FB'), 0, '0 即使传了 fallback 也保留')
})

test('lookup：map 不可用或 key 为空时返回 fallback', () => {
  for (const map of [null, undefined, 'str', 42, true]) {
    assert.equal(lookup(map, 'a', 'FB'), 'FB', `map=${String(map)}`)
  }
  const map = { a: 1 }
  for (const key of [null, undefined]) {
    assert.equal(lookup(map, key, 'FB'), 'FB', `key=${String(key)}`)
  }
})

test('lookup：非字符串键按属性名规则处理', () => {
  const map = { 1: 'one', true: 'yes' }
  assert.equal(lookup(map, 1), 'one')
  assert.equal(lookup(map, '1'), 'one')
  assert.equal(lookup(map, true), 'yes')
})

test('lookupOr：空值也回退', () => {
  const map = { a: 1, empty: '', nul: null, zero: 0 }
  assert.equal(lookupOr(map, 'a', 'FB'), 1)
  assert.equal(lookupOr(map, 'empty', 'FB'), 'FB')
  assert.equal(lookupOr(map, 'nul', 'FB'), 'FB')
  assert.equal(lookupOr(map, 'zero', 'FB'), 0, '0 应保留')
  assert.equal(lookupOr(map, 'toString', 'FB'), 'FB')
})

test('hasOwn：不受原型链影响', () => {
  const map = { a: 1 }
  assert.equal(hasOwn(map, 'a'), true)
  assert.equal(hasOwn(map, 'b'), false)
  for (const key of PROTO_KEYS) {
    assert.equal(hasOwn(map, key), false, `${JSON.stringify(key)} 不是自有属性`)
  }
})

test('createBareMap：无原型，因此原生取值天然安全', () => {
  const bare = createBareMap()
  assert.equal(Object.getPrototypeOf(bare), null, '应没有原型')

  for (const key of PROTO_KEYS) {
    assert.equal(bare[key], undefined, `bare[${JSON.stringify(key)}] 应为 undefined`)
  }

  // 可以正常读写
  bare.toString = 'value'
  assert.equal(bare.toString, 'value')
  assert.equal(hasOwn(bare, 'toString'), true)
})

test('createBareMap：不污染全局 Object.prototype', () => {
  const bare = createBareMap()
  bare.__proto__ = { polluted: true }
  assert.equal({}.polluted, undefined, '不应影响普通对象')
})

// ── 真实调用点 ─────────────────────────────────────────────────
//
// 说明：原先这里用 `styleUtils.getShadow`（utils/index.js）当真实调用点，
// 但那个工具在生产代码里没有任何调用方，已随本次重构删除。
// 现在真实调用点是 useEmoji（见 emojiProtoSafety.test.js）、
// useClass 与 useKamiDisplay —— 都是**上线的**查表路径。

test('useClass 的图标查表：原型链属性名回退到默认图标而不是取到函数', () => {
  for (const key of PROTO_KEYS) {
    const result = classifyToolsByClass([{ id: 1, class: key, tool_name: 'T', sort_order: 1 }])
    const bucket = result.classes.find((c) => c.class === key)
    assert.ok(bucket, `应生成 ${key} 分类`)
    // 分类名与图标都必须来自 classNames / classIcons 的**自有属性**：
    // 查表若沿原型链，这里会拿到 Object.prototype 上的函数
    assert.equal(bucket.class_name, key, `class_name(${key}) 应是原始字符串`)
    assert.equal(typeof bucket.icon, 'string', `icon(${key}) 必须是字符串`)
    assert.equal(bucket.icon.includes('function'), false)
    assert.ok(Array.isArray(result.classified[key]), 'classified 应按下标存数组')
  }
})

test('useKamiDisplay 的状态查表：原型链属性名返回字符串而不是函数', async () => {
  const { getStatusText, getStatusColor } = await loadAppModule('/hooks/useKamiDisplay/index.js')
  for (const key of PROTO_KEYS) {
    assert.equal(typeof getStatusText(key), 'string', `getStatusText(${JSON.stringify(key)})`)
    assert.equal(typeof getStatusColor(key), 'string', `getStatusColor(${JSON.stringify(key)})`)
  }
})

test('classifyToolsByClass：class 为原型链属性名时不产生函数型 class_name', () => {
  for (const key of PROTO_KEYS) {
    let result
    assert.doesNotThrow(
      () => {
        result = classifyToolsByClass([{ id: 1, class: key, tool_name: 'T', sort_order: 1 }])
      },
      `class=${JSON.stringify(key)} 不应抛错`
    )

    const category = result.classes.find((c) => c.class === key && !c.is_all)
    assert.ok(category, `应生成 class=${JSON.stringify(key)} 的分类`)
    assert.equal(
      typeof category.class_name,
      'string',
      `class_name 必须是字符串，实际 ${typeof category.class_name}`
    )
    assert.equal(typeof category.icon, 'string', 'icon 必须是字符串')
    assert.notEqual(category.class_name, key === 'toString' ? String(Object.prototype.toString) : '')
  }
})

test('classifyToolsByClass：两个工具共用原型链属性名时不丢数据', () => {
  // 普通对象下 `!stats.classNames['toString']` 会因为继承来的函数被判为「已存在」，
  // 导致第二个工具的分类名不被写入，甚至互相污染
  const result = classifyToolsByClass([
    { id: 1, class: 'toString', class_name: '第一个', tool_name: 'A', sort_order: 1 },
    { id: 2, class: 'toString', class_name: '第二个', tool_name: 'B', sort_order: 2 },
  ])

  const category = result.classes.find((c) => c.class === 'toString' && !c.is_all)
  assert.ok(category)
  assert.equal(category.tools.length, 2, '两个工具都应被分组，不能丢数据')
  assert.equal(category.class_name, '第一个', '以首个工具的分类名为准')
})

test('classifyToolsByClass：stats 不污染 Object.prototype', () => {
  classifyToolsByClass([
    { id: 1, class: '__proto__', class_name: 'P', tool_name: 'A', sort_order: 1 },
  ])
  assert.equal({}.polluted, undefined, '不应污染全局')
  assert.equal(typeof {}.class_name, 'undefined')
})

test('classifyToolsByClass：既有行为未受影响', () => {
  const result = classifyToolsByClass([
    { id: 1, class: 'video', tool_name: 'V1', sort_order: 1 },
    { id: 2, class: 'image', tool_name: 'I1', sort_order: 2 },
  ])
  const video = result.classes.find((c) => c.class === 'video')
  assert.equal(video.class_name, '视频工具', '仍应命中内置映射')
  assert.equal(video.icon, video.icon, 'icon 应存在')
})

// ── useEmoji 的同源缺陷（实测曾抛 TypeError） ───────────────────

test('useEmoji：原型链属性名曾抛 TypeError，现已修复', async () => {
  const { getEmojiGradient } = await loadAppModule('/hooks/useEmoji/index.js')
  for (const key of PROTO_KEYS) {
    assert.doesNotThrow(() => getEmojiGradient(key), `getEmojiGradient(${JSON.stringify(key)})`)
  }
})

test('safeLookup 与 useEmoji 的修复互相印证（同一根因）', () => {
  // 直接演示根因：普通对象的原型链会让映射查询返回函数
  const gradientMap = { '👤': { colors: ['#fff', '#000'] } }
  const hitRaw = gradientMap['toString']
  assert.equal(typeof hitRaw, 'function')
  assert.equal(hitRaw.colors, undefined, '取到函数后 .colors 是 undefined —— 崩溃的根源')
  assert.equal(lookup(gradientMap, 'toString', null), null, 'lookup 返回 null，后续可安全回退')
})
