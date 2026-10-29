/**
 * 签到日历的「少发请求」（3.2.0）与翻月节流（3.2.0）的守卫
 *
 * 这一组守三件事：
 *   1. **同一个月的日历在 15 秒内只请求一次** —— 服务端那条 SQL 已经压到
 *      一次 Neon 往返的地板（热 0.2–0.5 s），能减的只有「重复请求同一份数据」；
 *   2. **预取只写缓存、不动当前画面** —— 否则预取相邻月会把用户正在看的那一屏换掉；
 *   3. **翻月按钮有同步节流闸门** —— 一次点击一次请求，连点五次会把五次往返全打出去。
 *
 * 打桩方式与 `stores.points.test.js` 一致：替换 axios 实例的 `get`。
 * 页面那部分只能做源码契约断言（没有 @vue/test-utils，也不该为三个断言引进来）。
 */
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { installStorageStub, installDomStub, loadAppModule } from './setup.js'

installStorageStub()
installDomStub()

const ROOT = join(fileURLToPath(import.meta.url), '..', '..')
const PAGE = readFileSync(join(ROOT, 'src/pages/UserCheckin.vue'), 'utf8')
const STORE = readFileSync(join(ROOT, 'src/stores/points.js'), 'utf8')

const { createPinia, setActivePinia } = await import('pinia')
const { usePointsStore } = await loadAppModule('/stores/points.js')
const request = (await loadAppModule('/api/request.js')).default

/** 一条最小可用的日历快照：`days` 是判「加载成功」的关键字段 */
function calendarPayload(month = '2026-10', overrides = {}) {
  return {
    month,
    today: '2026-10-29',
    today_checked: false,
    streak: 0,
    month_checked: 0,
    longest_streak: 0,
    replenish_left: 3,
    days: [{ date: `${month}-01`, checked: false, future: false, replenishable: false }],
    ...overrides,
  }
}

function stubCalendar(handler) {
  const originalGet = request.get
  const calls = []
  request.get = async (url, config) => {
    calls.push({ url, config })
    return { data: handler(url, config) }
  }
  return {
    calls,
    restore: () => {
      request.get = originalGet
    },
  }
}

function freshStore() {
  setActivePinia(createPinia())
  return usePointsStore()
}

test('同一个月的日历：15 秒内只发一次请求', async () => {
  const store = freshStore()
  const stub = stubCalendar(() => calendarPayload('2026-10'))
  try {
    const first = await store.fetchCalendar()
    const second = await store.fetchCalendar()

    assert.equal(stub.calls.length, 1, '第二次必须命中前端缓存')
    assert.equal(first.month, '2026-10')
    assert.equal(second.month, '2026-10')
    assert.equal(store.calendar.month, '2026-10')
  } finally {
    stub.restore()
  }
})

test('force: true 绕过前端缓存', async () => {
  const store = freshStore()
  const stub = stubCalendar(() => calendarPayload('2026-10'))
  try {
    await store.fetchCalendar()
    await store.fetchCalendar({ force: true })
    assert.equal(stub.calls.length, 2)
  } finally {
    stub.restore()
  }
})

test('缓存按月份分开：翻到另一月会各发一次', async () => {
  const store = freshStore()
  const stub = stubCalendar((url, config) => calendarPayload(config?.params?.month || '2026-10'))
  try {
    await store.fetchCalendar()
    await store.fetchCalendar({ month: '2026-09' })
    await store.fetchCalendar({ month: '2026-09' })
    assert.equal(stub.calls.length, 2, '9 月只该请求一次')
    assert.equal(store.calendar.month, '2026-09')
  } finally {
    stub.restore()
  }
})

test('缓存超过 TTL 后失效（把 Date.now 推到 16 秒后）', async () => {
  const store = freshStore()
  const stub = stubCalendar(() => calendarPayload('2026-10'))
  const realNow = Date.now
  try {
    await store.fetchCalendar()
    // 只在这个用例里拨表，避免影响其它用例
    Date.now = () => realNow() + 16000
    await store.fetchCalendar()
    assert.equal(stub.calls.length, 2, '超过 15 秒必须重新请求')
  } finally {
    Date.now = realNow
    stub.restore()
  }
})

test('半截响应不当成加载成功：不进缓存、calendar 保持 null', async () => {
  const store = freshStore()
  const stub = stubCalendar(() => ({}))
  try {
    const data = await store.fetchCalendar()
    assert.equal(data, null)
    assert.equal(store.calendar, null)
    assert.ok(store.error, '要给出错误文案')

    // 下一次仍然要真的请求（说明没被缓存污染）
    await store.fetchCalendar()
    assert.equal(stub.calls.length, 2)
  } finally {
    stub.restore()
  }
})

test('prefetchCalendar 只写缓存，不动当前画面', async () => {
  const store = freshStore()
  const stub = stubCalendar((url, config) => calendarPayload(config?.params?.month || '2026-10'))
  try {
    await store.fetchCalendar()
    assert.equal(store.calendar.month, '2026-10')

    await store.prefetchCalendar('2026-11')
    assert.equal(store.calendar.month, '2026-10', '预取不能替换当前月份')

    // 预取过的月份再翻过去，应该零请求
    const before = stub.calls.length
    await store.fetchCalendar({ month: '2026-11' })
    assert.equal(stub.calls.length, before, '预取过的月份不该再请求')
    assert.equal(store.calendar.month, '2026-11')
  } finally {
    stub.restore()
  }
})

test('prefetchCalendar 忽略半截响应', async () => {
  const store = freshStore()
  const stub = stubCalendar((url, config) => (config?.params?.month ? {} : calendarPayload('2026-10')))
  try {
    await store.fetchCalendar()
    await store.prefetchCalendar('2026-11')
    const before = stub.calls.length
    await store.fetchCalendar({ month: '2026-11' })
    assert.equal(stub.calls.length, before + 1, '半截响应没进缓存，翻过去仍要请求')
  } finally {
    stub.restore()
  }
})

test('invalidateCalendarCache 清空缓存', async () => {
  const store = freshStore()
  const stub = stubCalendar(() => calendarPayload('2026-10'))
  try {
    await store.fetchCalendar()
    store.invalidateCalendarCache()
    await store.fetchCalendar()
    assert.equal(stub.calls.length, 2)
  } finally {
    stub.restore()
  }
})

test('签到与补签后清缓存（源码契约）', () => {
  assert.match(STORE, /invalidateCalendarCache\(\)\s*\{[\s\S]*this\.calendarCache = \{\}/)
  // doCheckin 成功后必须清；doReplenish 只清不自己 fetch（由页面决定拉哪个月）
  assert.match(STORE, /this\.invalidateCalendarCache\(\)/)
  assert.doesNotMatch(
    STORE,
    /async doReplenish[\s\S]{0,1200}?await this\.fetchCalendar/,
    'doReplenish 不该自己 fetch —— 页面知道用户翻到了哪个月',
  )
})

test('翻月节流：常量与闸门都在页面里', () => {
  assert.match(PAGE, /const MONTH_NAV_THROTTLE = 260/)
  assert.match(PAGE, /let monthNavAt = 0/)
  assert.match(PAGE, /function monthNavAllowed\(\)/)
  // goMonth / goToday 都必须在改状态前过闸门
  assert.match(PAGE, /async function goMonth\(delta\)[\s\S]{0,400}?if \(!monthNavAllowed\(\)\) return/)
  assert.match(PAGE, /async function goToday\(\)[\s\S]{0,400}?if \(!monthNavAllowed\(\)\) return/)
})

test('首屏骨架屏：三处都按 `!calendar` 分支', () => {
  // hero
  assert.match(PAGE, /<template v-if="!calendar">[\s\S]{0,600}?checkin-skeleton-line/)
  // 月历：真表头 + 42 个格子占位
  assert.match(PAGE, /role="status"[\s\S]{0,200}?aria-label="正在加载签到日历"/)
  assert.match(PAGE, /v-for="n in 42"[\s\S]{0,200}?checkin-skeleton-cell/)
  // 右栏
  assert.match(PAGE, /3\.2\.0 骨架屏：右栏四个数字/)
})

test('首屏之后预取相邻两月', () => {
  assert.match(PAGE, /prefetchCalendar\(shiftMonth\(month, -1\)\)/)
  assert.match(PAGE, /prefetchCalendar\(shiftMonth\(month, 1\)\)/)
})

test('三列数字居中（1.1）', () => {
  assert.match(PAGE, /\.checkin-side-figure \{[\s\S]{0,160}?align-items: center/)
})

test('翻月时旧月历压暗，而不是整块消失', () => {
  assert.match(PAGE, /\.checkin-cal-main\.is-loading \{[\s\S]{0,120}?opacity: 0\.45/)
})
