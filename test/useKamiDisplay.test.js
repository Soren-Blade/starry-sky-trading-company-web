import test from 'node:test'
import assert from 'node:assert/strict'

import { loadAppModule } from './setup.js'

// 用 loadAppModule（而非静态 import）加载被测模块：
//   1. 静态 import 会被提升到模块顶部，早于 setup.js 注册解析钩子；
//   2. 被测模块内部 import 了 `@/hooks/useSimpleTimeFormatter`，需要别名钩子。
// 这样测试与组件源码走的是同一套解析规则。
const {
  STATUS_TEXT,
  STATUS_FILTER_OPTIONS,
  KAMI_TABLE_COLUMNS,
  getStatusText,
  getStatusColor,
  formatCardDate,
  resolveToolName,
  toToolOptions,
} = await loadAppModule('/hooks/useKamiDisplay/index.js')

/** Object.prototype 上的属性名：查表若沿原型链会取到函数 */
const PROTO_KEYS = ['toString', 'constructor', 'valueOf', 'hasOwnProperty', '__proto__']

const SAMPLE_TOOLS = [
  { id: 3, tool_name: '视频解析' },
  { id: '7', display_name: '图片压缩' }, // id 可能是字符串（后端 bigint）
  { id: 9 }, // 既无 tool_name 也无 display_name
]

// ── 状态文案 ───────────────────────────────────────────────────

test('getStatusText：已知状态返回中文文案', () => {
  assert.equal(getStatusText('unused'), '未使用')
  assert.equal(getStatusText('used'), '已使用')
  assert.equal(getStatusText('expired'), '已过期')
  assert.equal(getStatusText('disabled'), '已禁用')
})

test('getStatusText：原型链属性名返回字符串而不是函数', () => {
  for (const key of PROTO_KEYS) {
    const text = getStatusText(key)
    assert.equal(typeof text, 'string', `getStatusText(${JSON.stringify(key)}) 必须是字符串`)
    assert.equal(text, key, '未识别时应原样返回 status')
  }
})

test('getStatusText：未识别状态原样返回；空值返回「未知」', () => {
  assert.equal(getStatusText('weird'), 'weird')
  assert.equal(getStatusText(''), '未知')
  assert.equal(getStatusText(null), '未知')
  assert.equal(getStatusText(undefined), '未知')
})

test('getStatusText：结果可安全 JSON 序列化（字段不会消失）', () => {
  for (const key of PROTO_KEYS) {
    const json = JSON.parse(JSON.stringify({ status_text: getStatusText(key) }))
    assert.ok(Object.prototype.hasOwnProperty.call(json, 'status_text'))
    assert.equal(typeof json.status_text, 'string')
  }
})

// ── 状态配色 ───────────────────────────────────────────────────

test('getStatusColor：已知状态返回对应颜色', () => {
  assert.equal(getStatusColor('unused'), 'blue')
  assert.equal(getStatusColor('used'), 'green')
  assert.equal(getStatusColor('expired'), 'red')
  assert.equal(getStatusColor('disabled'), 'default')
})

test('getStatusColor：原型链属性名与未知值都回退到 default', () => {
  for (const key of [...PROTO_KEYS, 'weird', '', null, undefined]) {
    assert.equal(getStatusColor(key), 'default', `getStatusColor(${JSON.stringify(key)})`)
  }
})

// ── 状态筛选选项（与文案同源） ─────────────────────────────────

test('STATUS_FILTER_OPTIONS：含「全部」且与 STATUS_TEXT 文案一致', () => {
  const all = STATUS_FILTER_OPTIONS.find((o) => o.value === 'all')
  assert.ok(all, '应含 all 选项')
  assert.equal(all.label, '全部状态')

  for (const [value, label] of Object.entries(STATUS_TEXT)) {
    const opt = STATUS_FILTER_OPTIONS.find((o) => o.value === value)
    assert.ok(opt, `筛选选项应包含 ${value}`)
    assert.equal(opt.label, label, `${value} 的文案应与 STATUS_TEXT 一致`)
  }
})

test('STATUS_FILTER_OPTIONS：无重复值', () => {
  const values = STATUS_FILTER_OPTIONS.map((o) => o.value)
  assert.equal(new Set(values).size, values.length)
})

// ── 日期格式化 ─────────────────────────────────────────────────

test('formatCardDate：非法输入返回破折号而不是 Invalid Date', () => {
  for (const bad of ['not-a-date', '', null, undefined, 'Invalid Date', 0]) {
    const out = formatCardDate(bad)
    assert.equal(out, '—', `formatCardDate(${JSON.stringify(bad)}) 应返回破折号，实际 ${out}`)
  }
})

test('formatCardDate：合法 ISO 时间按 YYYY-MM-DD HH:mm 输出', () => {
  const out = formatCardDate('2026-10-04T12:34:56.000Z')
  assert.match(out, /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/, `实际 ${out}`)
})

test('formatCardDate：绝不出现 NaN 或 undefined 字样', () => {
  for (const value of ['2026-10-04T00:00:00Z', 'bad', null]) {
    const out = formatCardDate(value)
    assert.equal(out.includes('NaN'), false, `${value} -> ${out}`)
    assert.equal(out.includes('undefined'), false, `${value} -> ${out}`)
  }
})

// ── 工具名解析 ─────────────────────────────────────────────────

test('resolveToolName：按数字 id 命中', () => {
  assert.equal(resolveToolName(SAMPLE_TOOLS, 3), '视频解析')
})

test('resolveToolName：字符串 id 与数字 id 都命中（后端 bigint 返回字符串）', () => {
  assert.equal(resolveToolName(SAMPLE_TOOLS, '7'), '图片压缩')
  assert.equal(resolveToolName(SAMPLE_TOOLS, 7), '图片压缩')
})

test('resolveToolName：回退到 display_name', () => {
  assert.equal(resolveToolName([{ id: 1, display_name: '别名工具' }], 1), '别名工具')
})

test('resolveToolName：两者都无时返回 null', () => {
  assert.equal(resolveToolName(SAMPLE_TOOLS, 9), null)
})

test('resolveToolName：空值与未知 id 返回 null', () => {
  for (const bad of [null, undefined, '', 0, 'abc', NaN, -1, 999]) {
    assert.equal(resolveToolName(SAMPLE_TOOLS, bad), null, `toolId=${JSON.stringify(bad)}`)
  }
})

test('resolveToolName：tools 不是数组时返回 null 而不抛错', () => {
  for (const bad of [null, undefined, 'str', 42, {}]) {
    assert.equal(resolveToolName(bad, 3), null)
  }
})

test('resolveToolName：数组内含 null 元素时不抛错', () => {
  assert.equal(resolveToolName([null, { id: 5, tool_name: 'X' }], 5), 'X')
  assert.equal(resolveToolName([null], 1), null)
})

test('resolveToolName：原型链属性名不会命中工具', () => {
  for (const key of PROTO_KEYS) {
    assert.equal(resolveToolName(SAMPLE_TOOLS, key), null, `toolId=${key}`)
  }
})

// ── 下拉选项 ───────────────────────────────────────────────────

test('toToolOptions：value 统一为字符串（select 的 value 永远是字符串）', () => {
  const options = toToolOptions(SAMPLE_TOOLS)
  assert.equal(options.length, 3)
  for (const opt of options) {
    assert.equal(typeof opt.value, 'string')
    assert.equal(typeof opt.label, 'string')
  }
  assert.deepEqual(options[0], { value: '3', label: '视频解析' })
  assert.deepEqual(options[1], { value: '7', label: '图片压缩' })
})

test('toToolOptions：无名称时兜底为「工具 <id>」', () => {
  assert.equal(toToolOptions([{ id: 9 }])[0].label, '工具 9')
})

test('toToolOptions：非数组入参返回空数组', () => {
  for (const bad of [null, undefined, 'str', 42, {}]) {
    assert.deepEqual(toToolOptions(bad), [])
  }
})

// ── 表格列定义 ─────────────────────────────────────────────────

test('KAMI_TABLE_COLUMNS：覆盖组件模板里用到的所有 column.key', () => {
  const keys = KAMI_TABLE_COLUMNS.map((c) => c.key)
  // 这些 key 在 KamiSection 的 #bodyCell 插槽里被逐一判断
  for (const expected of [
    'card_value',
    'card_no_display',
    'status',
    'valid_until',
    'used_at',
    'tool_id',
    'action',
  ]) {
    assert.ok(keys.includes(expected), `列定义应包含 ${expected}`)
  }
  assert.ok(keys.includes('card_name'), '应含默认渲染的卡密名称列')
})

test('KAMI_TABLE_COLUMNS：key 唯一', () => {
  const keys = KAMI_TABLE_COLUMNS.map((c) => c.key)
  assert.equal(new Set(keys).size, keys.length)
})

// ── 生产路径加载 ───────────────────────────────────────────────

test('通过 loadAppModule 可加载（确认 @/ 别名的导入在 Vite 下同样可解析）', async () => {
  const mod = await loadAppModule('/hooks/useKamiDisplay/index.js')
  assert.equal(typeof mod.getStatusText, 'function')
  assert.equal(typeof mod.resolveToolName, 'function')
  assert.equal(typeof mod.formatCardDate, 'function')
  assert.ok(Array.isArray(mod.KAMI_TABLE_COLUMNS))
})
