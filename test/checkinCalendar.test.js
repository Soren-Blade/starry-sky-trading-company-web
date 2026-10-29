/**
 * 签到日历的纯计算层（`src/utils/checkinCalendar.js`）与页面接线。
 *
 * 覆盖：
 *   1. 排格子：1 号落在正确的星期列（周一开头），前导占位数量算对；
 *   2. 第二行副数据的优先级：节假日名 → 传统节日 → 节气 → 农历；
 *   3. 休 / 班角标；
 *   4. 选中日状态：已签 / 今天未签 / 漏签可补 / 漏签但补不了 / 未来；
 *   5. 月份加减（跨年）；
 *   6. 页面接线：格子用 `cells`、点格子只选中不直接写库、月切换走 `fetchCalendar({ month })`。
 */
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

import {
  buildCalendarCells,
  formatDayTitle,
  resolveDayBadge,
  resolveDayStatus,
  resolveDaySubLabel,
  shiftMonth,
  weekdayIndex,
} from '../src/utils/checkinCalendar.js'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const PAGE = readFileSync(join(ROOT, 'src/pages/UserCheckin.vue'), 'utf8')

/** 造一个整月快照，字段与 `GET /pointsApi/getCheckinCalendar` 一致 */
function makeMonth(month, overrides = {}) {
  const [year, mon] = month.split('-').map(Number)
  const total = new Date(Date.UTC(year, mon, 0)).getUTCDate()
  const days = []
  for (let day = 1; day <= total; day += 1) {
    const iso = `${month}-${String(day).padStart(2, '0')}`
    days.push({
      date: iso,
      checked: false,
      is_today: false,
      future: false,
      replenishable: true,
      lunar: '初一',
      lunarMonth: '九月',
      lunarDay: 1,
      leap: false,
      dayType: null,
      holidayName: null,
      festival: null,
      solarTerm: null,
      ...(overrides[iso] || {}),
    })
  }
  return days
}

test('排格子：2026-10-01 是周四，前面空 3 格', () => {
  const days = makeMonth('2026-10')
  const cells = buildCalendarCells(days)

  assert.equal(weekdayIndex('2026-10-01'), 3, '周四 → 索引 3（周一为 0）')
  assert.equal(cells.filter((cell) => cell.type === 'blank').length, 3)
  assert.equal(cells[3].type, 'day')
  assert.equal(cells[3].day.date, '2026-10-01')
  // 31 天的月份 + 3 格占位 = 34
  assert.equal(cells.length, 34)
})

test('排格子：1 号是周一则不补占位，非法输入返回空数组', () => {
  // 2026-06-01 是周一
  const cells = buildCalendarCells(makeMonth('2026-06'))
  assert.equal(cells[0].type, 'day')

  assert.deepEqual(buildCalendarCells([]), [])
  assert.deepEqual(buildCalendarCells(null), [])
  assert.deepEqual(buildCalendarCells([{ date: 'x' }]), [])
})

test('副数据优先级：节假日名 > 传统节日 > 节气 > 农历', () => {
  const holiday = { holidayName: '国庆节', festival: '中秋', solarTerm: '寒露', lunar: '廿八' }
  assert.equal(resolveDaySubLabel(holiday), '国庆节')

  const festival = { holidayName: null, festival: '重阳节', solarTerm: '寒露', lunar: '廿八' }
  assert.equal(resolveDaySubLabel(festival), '重阳节')

  const term = { holidayName: null, festival: null, solarTerm: '寒露', lunar: '廿八' }
  assert.equal(resolveDaySubLabel(term), '寒露')

  const plain = { holidayName: null, festival: null, solarTerm: null, lunar: '廿八' }
  assert.equal(resolveDaySubLabel(plain), '廿八')

  assert.equal(resolveDaySubLabel({}), '')
  assert.equal(resolveDaySubLabel(null), '')
})

test('休 / 班角标只认 dayType', () => {
  assert.equal(resolveDayBadge({ dayType: 'holiday' }), '休')
  assert.equal(resolveDayBadge({ dayType: 'workday' }), '班')
  assert.equal(resolveDayBadge({ dayType: null }), null)
  assert.equal(resolveDayBadge(null), null)
})

test('选中日状态：五种情况各有文案与动作', () => {
  const today = '2026-10-29'

  assert.deepEqual(resolveDayStatus({ checked: true }, today), {
    key: 'checked',
    label: '已签到',
    action: null,
  })

  assert.deepEqual(resolveDayStatus({ is_today: true, future: false }, today), {
    key: 'today-pending',
    label: '今天还没签到',
    action: 'checkin',
  })

  // 漏签且次数/积分够 → 给补签按钮
  assert.deepEqual(
    resolveDayStatus({ date: '2026-10-20', replenishable: true }, today, { canReplenish: true }),
    { key: 'missed', label: '漏签，可补签', action: 'replenish' },
  )

  // 漏签但次数或积分不够 → 文案说明原因，不给按钮（与格子的实线口径一致）
  assert.deepEqual(
    resolveDayStatus({ date: '2026-10-20', replenishable: true }, today, { canReplenish: false }),
    { key: 'missed', label: '漏签，但补签次数或积分不足', action: null },
  )

  assert.deepEqual(resolveDayStatus({ future: true }, today), {
    key: 'future',
    label: '还没到这一天',
    action: null,
  })

  assert.equal(resolveDayStatus(null, today).key, 'none')
})

test('选中日状态：没有 is_today 字段时用日期兜底', () => {
  const today = '2026-10-29'
  assert.equal(resolveDayStatus({ date: '2026-10-29' }, today).action, 'checkin')
  assert.equal(resolveDayStatus({ date: '2026-10-28', replenishable: true }, today).action, 'replenish')
})

test('月份加减跨年，非法月份返回空串', () => {
  assert.equal(shiftMonth('2026-10', -1), '2026-09')
  assert.equal(shiftMonth('2026-01', -1), '2025-12')
  assert.equal(shiftMonth('2026-12', 1), '2027-01')
  assert.equal(shiftMonth('2026-10', -13), '2025-09')
  assert.equal(shiftMonth('', 1), '')
  assert.equal(shiftMonth('2026-1', 1), '')
})

test('日期标题：10 月 28 日 周三', () => {
  assert.equal(formatDayTitle('2026-10-28'), '10 月 28 日 周三')
  assert.equal(formatDayTitle(''), '')
})

/* ── 页面接线 ─────────────────────────────────────────────── */

test('页面用 cells 渲染、点格子只选中不写库', () => {
  assert.match(PAGE, /const cells = computed\(\(\) => buildCalendarCells\(calendar\.value\?\.days \|\| \[\]\)\)/)
  assert.match(PAGE, /v-for="cell in cells"/)
  assert.match(PAGE, /@click="selectDay\(cell\.day\)"/)

  // 选中不再直接触发补签：格子里的按钮只做选择，写操作在右栏
  assert.match(PAGE, /function selectDay\(day\)/)

  // 前导占位与日期格共用网格列：占位必须去掉边框底色
  assert.match(PAGE, /\.checkin-blank \{[^}]*border-color: transparent/)
})

test('月切换走 fetchCalendar({ month })，签完回到当月', () => {
  assert.match(PAGE, /await pointsStore\.fetchCalendar\(\{ month: target \}\)/)
  assert.match(PAGE, /const viewingMonth = computed/)
  assert.match(PAGE, /const canGoNext = computed/)
  // 签到成功后清掉翻月状态，否则停在旧月份看不到刚签的那天
  assert.match(PAGE, /currentMonth\.value = ''\n\s*selectedDate\.value = ''\n\s*await pointsStore\.fetchCalendar\(\)/)
})

test('次级行只在 ≥768px 显示，窄屏只留日期与角标', () => {
  assert.match(PAGE, /\.checkin-cell-sub \{\n\s*display: none;/)
})

test('顶栏入口改名「签到日历」并换日历图标', () => {
  const navbar = readFileSync(join(ROOT, 'src/components/Navbar.vue'), 'utf8')
  assert.match(navbar, /签到日历/)
  assert.doesNotMatch(navbar, />\s*每日签到\s*</)
  assert.match(navbar, /AppIcon name="calendar"/)
})
