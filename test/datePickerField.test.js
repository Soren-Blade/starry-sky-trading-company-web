import test from 'node:test'
import assert from 'node:assert/strict'

// 必须先加载 render.mjs：它注册的 .vue 编译钩子让我们能直接 import 组件，
// 从而拿到普通 <script> 块导出的纯函数，并且不需要 jsdom。
import { renderComponent, createRenderEnv } from './render.mjs'

import { loadAppModule } from './setup.js'

/**
 * DatePickerField 用例
 *
 * 分两层：
 *   1. **纯函数**（导出在组件的普通 `<script>` 块）：42 格栅格、月份加减、
 *      `YYYY-MM-DD` 往返、闰年 —— 这些是日期组件最容易错且最难靠肉眼发现的部分。
 *   2. **渲染**：面板与触发器的契约（`aria-haspopup="dialog"` 等）以及
 *      「无 props 也能渲染、且不产生 Vue 警告」—— 后者是
 *      `renderComponents.test.js` 会遍历所有 .vue 的前提。
 */

const {
  WEEK_START,
  WEEKDAY_LABELS,
  parseIsoDate,
  formatIsoDate,
  toIsoDate,
  addMonths,
  daysInMonth,
  getCalendarGrid,
  isWithinRange,
  formatChineseDate,
} = await loadAppModule('/components/DatePickerField.vue')

/** 按本地时间解析（与组件同一套口径），用于断言栅格首格是星期几 */
const weekdayOf = (iso) => parseIsoDate(iso).getDay()

async function render(props = {}) {
  const env = await createRenderEnv()
  return renderComponent('/components/DatePickerField.vue', {
    props,
    plugins: [env.router],
    globalComponents: env.globalComponents,
  })
}

// ── 周起始日 ───────────────────────────────────────────────────

test('周起始日是周一，且星期表头与它对应', () => {
  assert.equal(WEEK_START, 1, '本组件约定周一打头')
  assert.deepEqual(WEEKDAY_LABELS, ['一', '二', '三', '四', '五', '六', '日'])
})

// ── 42 格栅格 ──────────────────────────────────────────────────

test('任何月份都生成 6 行 42 格', () => {
  for (let month = 0; month < 12; month += 1) {
    assert.equal(getCalendarGrid(2026, month).length, 42, `2026 年 ${month + 1} 月应为 42 格`)
  }
  // 2 月、闰年 2 月、跨年月份都覆盖一遍
  for (const [year, month] of [
    [2024, 1],
    [2025, 1],
    [2023, 1],
    [2026, 11],
    [2027, 0],
  ]) {
    assert.equal(getCalendarGrid(year, month).length, 42, `${year}-${month + 1} 应为 42 格`)
  }
})

test('首格是周一、末格是周日（周一打头的直接后果）', () => {
  for (const [year, month] of [
    [2026, 9],
    [2026, 2],
    [2026, 0],
    [2024, 1],
    [2026, 7],
  ]) {
    const grid = getCalendarGrid(year, month)
    assert.equal(weekdayOf(grid[0].iso), 1, `${year}-${month + 1} 首格应是周一`)
    assert.equal(weekdayOf(grid[41].iso), 0, `${year}-${month + 1} 末格应是周日`)
  }
})

test('栅格连续覆盖 42 天，且包含当月每一天', () => {
  const grid = getCalendarGrid(2026, 9) // 2026-10
  for (let index = 1; index < grid.length; index += 1) {
    const prev = parseIsoDate(grid[index - 1].iso)
    const curr = parseIsoDate(grid[index].iso)
    const diff = (curr - prev) / 86400000
    assert.equal(diff, 1, `第 ${index} 格与前一格应正好差一天`)
  }

  const inside = grid.filter((cell) => !cell.isOutside).map((cell) => cell.day)
  assert.deepEqual(
    inside,
    Array.from({ length: 31 }, (_, i) => i + 1),
    '10 月的 31 天都应在本月格子里'
  )
})

test('补位格标成 --outside，且首尾补位来自相邻月份', () => {
  // 2026-10-01 是周四：周一打头时前面要补 3 格（9 月 28/29/30）
  const grid = getCalendarGrid(2026, 9)
  assert.deepEqual(
    grid.slice(0, 3).map((cell) => cell.iso),
    ['2026-09-28', '2026-09-29', '2026-09-30'],
    '首格应从上一月补起'
  )
  assert.equal(grid[0].isOutside, true)
  assert.equal(grid[3].isOutside, false, '10 月 1 日应是本月格')
  assert.equal(grid[grid.length - 1].isOutside, true, '末格应来自下一月')
})

// ── 月份加减（跨年 / 跨月） ─────────────────────────────────────

test('addMonths 跨年跨月正确进位', () => {
  assert.deepEqual(addMonths(2026, 0, -1), { year: 2025, month: 11 }, '1 月退一月 → 上年 12 月')
  assert.deepEqual(addMonths(2026, 11, 1), { year: 2027, month: 0 }, '12 月进一月 → 次年 1 月')
  assert.deepEqual(addMonths(2026, 10, 3), { year: 2027, month: 1 }, '跨年加三个月')
  assert.deepEqual(addMonths(2026, 5, -6), { year: 2025, month: 11 }, '跨年退六个月')
  assert.deepEqual(addMonths(2026, 5, 12), { year: 2027, month: 5 }, '整年平移')

  // 一年 12 次 +1 应回到原点（月份循环不漂移）
  let cursor = { year: 2026, month: 0 }
  for (let i = 0; i < 12; i += 1) cursor = addMonths(cursor.year, cursor.month, 1)
  assert.deepEqual(cursor, { year: 2027, month: 0 })
})

// ── 解析 / 格式化往返 ───────────────────────────────────────────

test('YYYY-MM-DD 解析与格式化往返一致', () => {
  const samples = ['2026-10-01', '2026-01-31', '2026-12-31', '2024-02-29', '2000-02-29']
  for (const iso of samples) {
    assert.equal(toIsoDate(parseIsoDate(iso)), iso, `${iso} 往返应不变`)
  }

  assert.equal(formatIsoDate(2026, 9, 1), '2026-10-01', '月份 0 基，输出要 +1 并补零')
  assert.equal(formatIsoDate(2026, 0, 5), '2026-01-05', '日与月都要补零')
  assert.equal(formatIsoDate(999, 0, 1), '0999-01-01', '四位年不足要补零')
})

test('parseIsoDate 对非法输入返回 null（不做静默归一化）', () => {
  for (const bad of ['', '2026-1-1', '2026/10/01', '2026-02-30', '2025-02-29', 'abc', null, undefined, 20261001]) {
    assert.equal(parseIsoDate(bad), null, `${String(bad)} 应判非法`)
  }
  // 合法但易错的边界
  assert.notEqual(parseIsoDate('2024-02-29'), null, '闰年 2 月 29 日应合法')
  assert.notEqual(parseIsoDate('2026-12-31'), null)
})

test('本地时间构造：不会因为 UTC 转换少一天', () => {
  // new Date('2026-10-01') 按 UTC 解析，UTC+8 下 getDate() 会得到 30 ——
  // 组件里一律用 new Date(y, m, d)，这条用例就是防它被改回去
  assert.equal(toIsoDate(new Date(2026, 9, 1)), '2026-10-01')
  assert.equal(toIsoDate(new Date(2026, 0, 1)), '2026-01-01')
  assert.equal(parseIsoDate('2026-10-01').getDate(), 1)
  assert.equal(parseIsoDate('2026-10-01').getMonth(), 9)
})

// ── 闰年 ───────────────────────────────────────────────────────

test('闰年 2 月 29 日在栅格与天数里都成立', () => {
  assert.equal(daysInMonth(2024, 1), 29, '2024 是闰年')
  assert.equal(daysInMonth(2025, 1), 28, '2025 不是闰年')
  assert.equal(daysInMonth(2000, 1), 29, '2000 是闰年（能被 400 整除）')
  assert.equal(daysInMonth(1900, 1), 28, '1900 不是闰年（能被 100 整除但不能被 400 整除）')
  assert.equal(daysInMonth(2026, 9), 31)

  const grid = getCalendarGrid(2024, 1)
  const leap = grid.find((cell) => cell.iso === '2024-02-29')
  assert.ok(leap, '闰年 2 月 29 日应出现在栅格里')
  assert.equal(leap.isOutside, false, '2 月 29 日属于本月')
  assert.equal(leap.day, 29)
})

test('每月最后一天不会溢出到下个月', () => {
  // 12 月 31 日加一天必须落到次年 1 月 1 日，而不是「12 月 32 日」
  assert.equal(toIsoDate(new Date(2026, 11, 31 + 1)), '2027-01-01')
  assert.equal(daysInMonth(2026, 11), 31)
  assert.equal(formatIsoDate(2026, 11, daysInMonth(2026, 11)), '2026-12-31')
})

// ── min / max ─────────────────────────────────────────────────

test('isWithinRange 按闭区间判定，空值表示该侧不设限', () => {
  assert.equal(isWithinRange('2026-10-01', '2026-01-01', '2026-12-31'), true)
  assert.equal(isWithinRange('2026-01-01', '2026-01-01', '2026-12-31'), true, '下界含端点')
  assert.equal(isWithinRange('2026-12-31', '2026-01-01', '2026-12-31'), true, '上界含端点')
  assert.equal(isWithinRange('2025-12-31', '2026-01-01', ''), false)
  assert.equal(isWithinRange('2027-01-01', '', '2026-12-31'), false)
  assert.equal(isWithinRange('2026-06-15', '', ''), true, '两侧都不限时全部合法')
})

test('年份 / 月份 / 日期的中文格式（aria-label 用）', () => {
  assert.equal(formatChineseDate('2026-10-01'), '2026 年 10 月 01 日')
  assert.equal(formatChineseDate('1990-01-09'), '1990 年 01 月 09 日')
  assert.equal(formatChineseDate('不是日期'), '不是日期', '非法值原样返回，不抛错')
})

// ── 渲染契约 ───────────────────────────────────────────────────

test('无 props 也能渲染（renderComponents.test.js 会这样遍历所有组件）', async () => {
  const html = await render()
  assert.ok(html.length > 0)
  assert.match(html, /u-select-trigger/, '触发器应渲染出来')
  assert.match(html, /请选择日期/, '未传 ariaLabel 时有兜底文案')
})

test('触发器是 <button type="button">，带 aria-haspopup="dialog" 与 aria-expanded', async () => {
  const html = await render({ modelValue: '1990-01-09', ariaLabel: '生日' })
  assert.match(html, /aria-haspopup="dialog"/)
  assert.match(html, /aria-expanded="false"/, '关闭态 aria-expanded 应为 false')
  assert.match(html, /type="button"/)

  // 触发器与 .u-input 同形：复用 .u-select-trigger，而不是自己写一套几何
  assert.match(html, /class="u-select-trigger"/)
})

test('触发器展示选中日期，未选中时展示占位文案', async () => {
  const filled = await render({ modelValue: '1990-01-09', ariaLabel: '生日' })
  assert.match(filled, /1990 年 01 月 09 日/)
  assert.doesNotMatch(filled, /datepicker-value--empty/, '有值时不应带占位类')
  assert.doesNotMatch(filled, /请选择日期/, '有值时不应出现占位文案')

  const empty = await render({ ariaLabel: '生日', placeholder: '请选择日期' })
  assert.match(empty, /请选择日期/)
  assert.match(empty, /datepicker-value--empty/, '未选中时才应带占位类')
})

test('关闭态不渲染面板（42 个格子不能留在无障碍树里）', async () => {
  const html = await render({ modelValue: '1990-01-09', ariaLabel: '生日' })
  assert.doesNotMatch(html, /u-datepicker-grid/)
  assert.doesNotMatch(html, /role="dialog"/)
  assert.doesNotMatch(html, /<button[^>]*class="u-datepicker-cell/)
})

test('渲染期间不产生 Vue 警告', async () => {
  const warnings = []
  const savedWarn = console.warn
  const savedError = console.error
  console.warn = (...args) => warnings.push(args.map(String).join(' '))
  console.error = (...args) => warnings.push(args.map(String).join(' '))

  let html = ''
  try {
    html = await render({ modelValue: '1990-01-09', ariaLabel: '生日', min: '1900-01-01', max: '2026-01-01' })
  } finally {
    console.warn = savedWarn
    console.error = savedError
  }

  const relevant = warnings.filter((w) => /\[Vue warn\]/.test(w))
  assert.deepEqual(relevant, [], `不应有 Vue 警告，实际：\n${relevant.join('\n')}`)
  assert.ok(html.length > 0)
})

test('props 与 emits 的契约与页面接线一致', async () => {
  const mod = await loadAppModule('/components/DatePickerField.vue')
  const declared = Object.keys(mod.default.props || {})

  for (const prop of ['modelValue', 'placeholder', 'disabled', 'clearable', 'min', 'max', 'ariaLabel']) {
    assert.ok(declared.includes(prop), `应声明 prop ${prop}`)
  }
  assert.deepEqual(mod.default.emits, ['update:modelValue'])
})
