import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

// 必须先加载 render.mjs：它注册的 .vue 编译钩子让我们能直接 import 组件，
// 从而拿到普通 <script> 块导出的纯函数，并且不需要 jsdom。
import { renderComponent, createRenderEnv, WEB_ROOT } from './render.mjs'

import { loadAppModule } from './setup.js'

/**
 * DatePickerField 用例
 *
 * 分三层：
 *   1. **纯函数**（导出在组件的普通 `<script>` 块）：42 格栅格、月份 / 年份加减、
 *      `YYYY-MM-DD` 往返、闰年、首次打开落点 —— 这些是日期组件最容易错且最难靠
 *      肉眼发现的部分。
 *   2. **渲染**：面板与触发器的契约（`aria-haspopup="dialog"` 等）以及
 *      「无 props 也能渲染、且不产生 Vue 警告」—— 后者是
 *      `renderComponents.test.js` 会遍历所有 .vue 的前提。
 *   3. **源码契约**：面板是 `v-if` 出来的**内部状态**，SSR 只能渲染关闭态，
 *      于是「头部有几个导航按钮」恰好测不到。这类分支用源码级断言兜底
 *      （与 test/selectField.test.js 同一套做法），行为则由纯函数用例与
 *      `.tmp-verify/dp-viewdate.html` 的真机探针覆盖。
 */

const {
  WEEK_START,
  WEEKDAY_LABELS,
  parseIsoDate,
  formatIsoDate,
  toIsoDate,
  addMonths,
  addYears,
  daysInMonth,
  getCalendarGrid,
  isWithinRange,
  formatChineseDate,
  formatChineseMonth,
  resolveInitialView,
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

// ── 年份加减（« » 与 Shift+PageUp / PageDown 的底层） ───────────

test('addYears：跨闰年时「夹取」，2024-02-29 + 1 年 → 2025-02-28', () => {
  /*
   * 语义选择（刻意的）：**夹到目标月的最后一天**，而不是让 Date 进位到 3 月 1 日。
   * 「生日」这类字段挪一年本来就该还停在 2 月；溢出到 3 月会让用户在选择器里看到
   * 一个自己从没点过的月份，属于静默错值。与原生 `<input type="date">` 的年份
   * 步进行为一致（它同样把日期夹到月末）。
   */
  assert.deepEqual(addYears(2024, 1, 29, 1), { year: 2025, month: 1, day: 28 })
  assert.deepEqual(addYears(2024, 1, 29, -1), { year: 2023, month: 1, day: 28 })

  // 目标年同样是闰年时 29 日原样保留
  assert.deepEqual(addYears(2024, 1, 29, 4), { year: 2028, month: 1, day: 29 })
  // 世纪闰年规则交给 Date：2100 不是闰年（被 100 整除但不被 400 整除）
  assert.deepEqual(addYears(2000, 1, 29, 100), { year: 2100, month: 1, day: 28 })
  assert.deepEqual(addYears(1996, 1, 29, 4), { year: 2000, month: 1, day: 29 })
})

test('addYears：平年与非 2 月日期只动年，月份和日都不进位', () => {
  assert.deepEqual(addYears(2026, 5, 15, 1), { year: 2027, month: 5, day: 15 }, '月份必须保持不变')
  assert.deepEqual(addYears(2026, 0, 1, -1), { year: 2025, month: 0, day: 1 })
  assert.deepEqual(addYears(2026, 11, 31, 1), { year: 2027, month: 11, day: 31 }, '12-31 不许溢出到次年 1 月')
  // 夹取不是「只管 2 月」：目标月是 4 月（30 天）时 31 日同样要收到 30 日
  assert.deepEqual(addYears(2026, 1, 30, 0), { year: 2026, month: 1, day: 28 }, '2 月收到 28 日')
  assert.deepEqual(addYears(2026, 3, 31, 0), { year: 2026, month: 3, day: 30 }, '4 月收到 30 日')
})

test('addYears：夹取是不可逆的（刻意接受，写下来防止被当成 bug「修」掉）', () => {
  // 2024-02-29 → 2025-02-28 → 退回 2024 只会到 02-28：那个不存在的 2 月 29 日
  // 找不回来。夹取语义的必然结果，不是缺陷 —— 真机上的表现是「翻年后日期少一天」，
  // 比「翻年跳到 3 月」更符合直觉。
  const forward = addYears(2024, 1, 29, 1)
  assert.deepEqual(forward, { year: 2025, month: 1, day: 28 })
  assert.deepEqual(addYears(forward.year, forward.month, forward.day, -1), {
    year: 2024,
    month: 1,
    day: 28,
  })
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

// ── 首次打开落在哪个月（viewDate） ─────────────────────────────
//
// 「打开后落在哪个月」必须能被直接断言 —— 因此落点算法是导出的纯函数
// resolveInitialView，openPanel 只是调用它（接线由下方源码契约把关）。
// 这一条修的是实测缺陷：生日为空 + max=今天时，面板落在今天所在月，
// 42 格里只有个位数可点，要翻到 1998 年得按 336 次「上一月」。

/** 真机探针那天的 today：2026-10-04（max 也是它） */
const TODAY = '2026-10-04'

test('resolveInitialView：只给 viewDate 不给 modelValue 时，落在 viewDate 的月份', () => {
  assert.deepEqual(resolveInitialView('', '1990-01-01', TODAY), { year: 1990, month: 0 })
  assert.deepEqual(resolveInitialView('', '1998-06-15', TODAY), { year: 1998, month: 5 })
  // 只有年月生效：日取哪一天都不影响首屏落在哪个月
  assert.deepEqual(resolveInitialView('', '1990-12-31', TODAY), { year: 1990, month: 11 })
  assert.deepEqual(resolveInitialView('', '1990-01-31', TODAY), { year: 1990, month: 0 })

  // 落点换算成用户真正看到的那行面板标题（真机探针读的就是它，两边必须一致）
  const landed = resolveInitialView('', '1990-01-01', TODAY)
  assert.equal(formatChineseMonth(landed.year, landed.month), '1990 年 01 月')
})

test('resolveInitialView：modelValue 与 viewDate 同时给时，以 modelValue 为准', () => {
  // 「有选中值时仍然优先落在选中值的月份」——这是既有行为，不能被 viewDate 改掉，
  // 否则用户重开面板会找不到自己选过的那个月。
  assert.deepEqual(resolveInitialView('1998-06-15', '1990-01-01', TODAY), { year: 1998, month: 5 })
  assert.deepEqual(resolveInitialView('2026-10-04', '1990-01-01', TODAY), { year: 2026, month: 9 })
  // 选中值本身就是「今天」时也照样以它为准
  assert.deepEqual(resolveInitialView('1990-01-01', '1998-06-15', TODAY), { year: 1990, month: 0 })
})

test('resolveInitialView：viewDate 非法 / 空 时安静退回今天所在月，不抛错', () => {
  const bad = [
    'abc', // 完全不是日期
    '', // 默认值（= 没传）
    '1990-1-1', // 位数不对
    '1990/01/01', // 分隔符不对
    '1990-13-01', // 月份越界
    '1990-02-30', // 日期不存在
    null,
    undefined,
    19900101,
  ]

  for (const value of bad) {
    assert.deepEqual(
      resolveInitialView('', value, TODAY),
      { year: 2026, month: 9 },
      `viewDate=${String(value)} 应退回今天所在月`
    )
  }

  // modelValue 是垃圾值时同样按「没值」处理，继续走 viewDate
  assert.deepEqual(resolveInitialView('abc', '1990-01-01', TODAY), { year: 1990, month: 0 })
  // 两个都是垃圾值 → 今天
  assert.deepEqual(resolveInitialView('abc', 'def', TODAY), { year: 2026, month: 9 })
})

test('resolveInitialView：连 todayIso 都是坏的也不抛错（退回系统今天）', () => {
  // 跨午夜时「系统今天」可能变一天，因此前后各取一次做区间判定，避免午夜 flake
  const stamp = (date) => `${date.getFullYear()}-${date.getMonth()}`
  const before = stamp(new Date())
  const cases = [resolveInitialView('', 'abc', 'abc'), resolveInitialView('', '', '')]
  const after = stamp(new Date())

  for (const actual of cases) {
    assert.ok(
      [before, after].includes(`${actual.year}-${actual.month}`),
      `应退回系统今天所在月（${before}），实际 ${actual.year}-${actual.month}`
    )
  }
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

  for (const prop of [
    'modelValue',
    'placeholder',
    'disabled',
    'clearable',
    'min',
    'max',
    'ariaLabel',
    'viewDate',
  ]) {
    assert.ok(declared.includes(prop), `应声明 prop ${prop}`)
  }
  assert.deepEqual(mod.default.emits, ['update:modelValue'])
})

test('viewDate 是**可选** prop（不传时保持原行为，渲染测试会无 props 遍历所有组件）', async () => {
  const mod = await loadAppModule('/components/DatePickerField.vue')
  const prop = mod.default.props.viewDate

  assert.ok(prop, 'viewDate 必须声明')
  assert.equal(prop.type, String)
  // 必填会让 test/renderComponents.test.js 的无 props 遍历刷出「Missing required prop」警告
  assert.notEqual(prop.required, true, 'viewDate 不得为必填')
  assert.equal(prop.default, '', '默认空串 = 没传，等价于「落在今天所在月」')
})

// ── 四键布局与接线（SSR 覆盖不到，用源码契约兜底） ──────────────

/**
 * 为什么这一层非做不可：面板是 `v-if="open"` 出来的，SSR 只能渲染关闭态，
 * 于是「头部有几个导航按钮」「按钮叫什么名字」在 node --test 里恰好测不到。
 * 做法与 test/selectField.test.js 的源码级断言一致：只断言**契约**（按钮数量、
 * 可访问名、复用哪个类名），不断言排版与格式细节。
 *
 * 行为（翻年落在哪、闰年怎么夹、viewDate 生效与否）全部由上面的纯函数用例覆盖，
 * 端到端的点击链路由 `.tmp-verify/dp-viewdate.html` 在真机上验证。
 */
const readComponentSource = () =>
  fs.readFileSync(path.join(WEB_ROOT, 'src', 'components', 'DatePickerField.vue'), 'utf8')

/** 去掉 HTML 注释：说明文字里提到某个类名 / 属性不算实现（与 selectField.test.js 一致） */
const stripHtmlComments = (text) => text.replace(/<!--[\s\S]*?-->/g, '')

test('四键布局：« ‹ › » 四个真实 <button>，各有中文可访问名', () => {
  const source = stripHtmlComments(readComponentSource())
  const buttonTags = source.match(/<button\b[^>]*>/g) || []
  const navTags = buttonTags.filter((tag) => /class="u-datepicker-nav"/.test(tag))

  assert.equal(navTags.length, 4, '头部应有 4 个导航按钮：« ‹ 标题 › »')

  // 顺序即语义：左侧「上一年 / 上一月」，右侧「下一月 / 下一年」（跨度大的在外）
  assert.deepEqual(
    navTags.map((tag) => (tag.match(/aria-label="([^"]+)"/) || [])[1]),
    ['上一年', '上一月', '下一月', '下一年'],
    '四个按钮的可访问名与书写顺序都必须稳定'
  )

  for (const tag of navTags) {
    assert.match(tag, /type="button"/, `导航按钮必须是真实 button（Enter / Space 才有语义）：${tag}`)
  }
})

test('四键布局不新增类名、不新增样式（尺寸与外观全由 §11 的 .u-datepicker-nav 决定）', () => {
  const source = stripHtmlComments(readComponentSource())
  const styleBlock = source.slice(source.indexOf('<style scoped>'))

  assert.ok(styleBlock.length > 0, '应能定位到 scoped 样式块')
  assert.doesNotMatch(
    styleBlock,
    /u-datepicker-(nav|head|title)\b/,
    '禁止在组件里给四键或标题补样式：那是 ui-kit-data.css §11 的职责'
  )
  // 四个按钮的类名必须是套件里那个单类，不许多挂一个「年份按钮」之类的新类
  assert.equal(
    (source.match(/class="u-datepicker-nav"/g) || []).length,
    4,
    '四个导航按钮都必须且只能挂 .u-datepicker-nav'
  )
})

test('接线：openPanel 以「选中值 → viewDate → 今天」取落点，« » 复用 addYears', () => {
  const source = stripHtmlComments(readComponentSource())

  assert.match(
    source,
    /resolveInitialView\(\s*selectedIso\.value,\s*props\.viewDate,\s*todayIso\.value\s*\)/,
    'openPanel 必须调用 resolveInitialView（顺序写死：选中值 → viewDate → 今天）'
  )
  assert.match(
    source,
    /addYears\(viewYear\.value, viewMonth\.value/,
    '« » 必须复用 addYears，闰年夹取不能另写一份'
  )
  assert.match(source, /@click="shiftYear\(-1\)"/, '« 应绑 shiftYear(-1)')
  assert.match(source, /@click="shiftYear\(1\)"/, '» 应绑 shiftYear(1)')
  assert.match(source, /@click="shiftMonth\(-1\)"/, '‹ 应保留原来的 shiftMonth(-1)')
  assert.match(source, /@click="shiftMonth\(1\)"/, '› 应保留原来的 shiftMonth(1)')
  // Shift+PageUp / PageDown 也走同一条路径（可选增强，做了就要有）
  assert.match(source, /event\.shiftKey && \(event\.key === 'PageUp' \|\| event\.key === 'PageDown'\)/)
})

test('42 格的 key 用下标：用 iso 会让每次翻页重建 42 个节点，把面板自己关掉', () => {
  const source = stripHtmlComments(readComponentSource())

  /*
   * 真机复现的缺陷链（.tmp-verify/dp-focus.html 逐步日志）：
   *   `:key="cell.iso"` → 翻年时新旧 42 格的 iso 完全不重叠 → Vue 卸载全部 42 个
   *   <button> → 当前聚焦的那一格被移除 → 浏览器派发一次
   *   `focusout(relatedTarget = null)` → handleFocusOut 判定「焦点离开了组件」→ close()。
   *   表现是「点一次 » 面板就没了」，翻年的四个按钮等于不可用（翻月只有与相邻月
   *   重叠的那几格侥幸被复用，所以是偶发，更难发现）。
   *
   * 这条断言守的是「别再退回 iso」——它只能靠源码契约，因为 SSR 渲染的是关闭态。
   */
  assert.match(
    source,
    /v-for="\(cell, index\) in gridCells"[\s\S]{0,80}:key="index"/,
    '格子必须用下标做 key'
  )
  assert.doesNotMatch(source, /:key="cell\.iso"/, '不要退回 iso 做 key（会重建节点并关掉面板）')
})
