<template>
  <ToolPageShell :title="PAGE.title" :eyebrow="PAGE.eyebrow" :description="PAGE.description" :icon="PAGE.icon" :requires-card="PAGE.requiresCard">
    <section class="ui-card tool-panel">
      <h2 class="tool-panel-title"><AppIcon name="refresh-cw" aria-hidden="true" /><span>公历 → 农历</span></h2>
      <div class="u-field">
        <label class="u-field-label" for="daily-solar">公历日期（下面的日历跟着它走）</label>
        <input id="daily-solar" v-model="solarDate" type="date" class="u-input" />
      </div>
      <p v-if="!libReady" class="tool-calc-note">正在加载 lunar-javascript…</p>
      <template v-else-if="lunarInfo">
        <dl class="lunar-facts">
          <div><dt>农历</dt><dd>{{ lunarInfo.text }}</dd></div>
          <div><dt>干支</dt><dd>{{ lunarInfo.yearGz }}年 {{ lunarInfo.monthGz }}月 {{ lunarInfo.dayGz }}日</dd></div>
          <div><dt>生肖</dt><dd>{{ lunarInfo.shengXiao }}</dd></div>
          <div><dt>节气</dt><dd>{{ lunarInfo.jieQi }}</dd></div>
          <div><dt>宜</dt><dd>{{ lunarInfo.yi }}</dd></div>
          <div><dt>忌</dt><dd>{{ lunarInfo.ji }}</dd></div>
        </dl>
        <button type="button" class="u-btn-secondary" @click="copyLunar">{{ copied ? '已复制' : '复制农历文本' }}</button>
      </template>
      <p v-else class="tool-calc-note">这个公历日期不合法，请检查输入。</p>
    </section>
    <section class="ui-card tool-panel">
      <h2 class="tool-panel-title"><AppIcon name="arrow-left-right" aria-hidden="true" /><span>农历 → 公历</span></h2>
      <div class="lunar-row">
        <div class="u-field"><label class="u-field-label" for="lunar-year">农历年</label><input id="lunar-year" v-model.number="lunarYear" type="number" min="1900" max="2100" class="u-input" /></div>
        <div class="u-field"><label class="u-field-label" for="lunar-month">农历月</label><input id="lunar-month" v-model.number="lunarMonth" type="number" min="1" max="12" class="u-input" /></div>
        <div class="u-field"><label class="u-field-label" for="lunar-day">农历日</label><input id="lunar-day" v-model.number="lunarDay" type="number" min="1" max="30" class="u-input" /></div>
      </div>
      <label class="lunar-leap"><input v-model="isLeap" type="checkbox" />这是闰月</label>
      <p v-if="solarFromLunar" class="tool-result-value">对应公历：{{ solarFromLunar }}</p>
      <p v-else class="tool-calc-note">该农历日期不存在（大小月或闰月不匹配）。</p>
    </section>
    <section class="ui-card tool-panel">
      <h2 class="tool-panel-title">
        <AppIcon name="layout-grid" aria-hidden="true" /><span>{{ calYear }} 年 {{ calMonth }} 月 · 农历日历</span>
        <span class="lunar-nav">
          <button type="button" class="u-btn-secondary" @click="shiftMonth(-1)">上一月</button>
          <button type="button" class="u-btn-secondary" @click="shiftMonth(1)">下一月</button>
        </span>
      </h2>
      <div class="lunar-grid">
        <span v-for="week in WEEK_LABELS" :key="week" class="lunar-week">{{ week }}</span>
        <span v-for="cell in calendarCells" :key="cell.key" class="lunar-cell" :class="{ 'is-empty': !cell.day, 'is-today': cell.isToday }">
          <template v-if="cell.day"><em class="lunar-day">{{ cell.day }}</em><span class="lunar-sub">{{ cell.sub }}</span></template>
        </span>
      </div>
      <p class="tool-calc-note">日历小字是该日农历；农历初一显示月份名，节气日显示节气。</p>
    </section>
    <section class="ui-card tool-panel">
      <h2 class="tool-panel-title"><AppIcon name="clock" aria-hidden="true" /><span>倒数日</span></h2>
      <div class="u-field"><label class="u-field-label" for="daily-target">目标时间</label><input id="daily-target" v-model="targetDate" type="datetime-local" class="u-input" /></div>
      <div v-if="countdownResult" class="countdown-display">
        <div class="countdown-item"><span class="countdown-value">{{ countdownResult.days }}</span><span class="countdown-label">天</span></div>
        <div class="countdown-item"><span class="countdown-value">{{ countdownResult.hours }}</span><span class="countdown-label">时</span></div>
        <div class="countdown-item"><span class="countdown-value">{{ countdownResult.minutes }}</span><span class="countdown-label">分</span></div>
        <div class="countdown-item"><span class="countdown-value">{{ countdownResult.seconds }}</span><span class="countdown-label">秒</span></div>
      </div>
      <p v-else class="tool-calc-note">选一个目标时间，秒级刷新由页面内的定时器驱动（组件卸载即清理）。</p>
    </section>
    <template #aside>
      <section class="ui-card tool-aside-card">
        <h3 class="tool-aside-title"><AppIcon name="info" /> {{ TOOL_PAGE.usageTitle }}</h3>
        <ul class="tool-aside-list"><li v-for="item in PAGE.asideItems" :key="item">{{ item }}</li></ul>
      </section>
      <section class="ui-card tool-aside-card">
        <h3 class="tool-aside-title"><AppIcon name="alert-triangle" /> 关于数据</h3>
        <p class="tool-aside-note">农历换算、干支生肖、节气与宜忌全部来自 lunar-javascript 的天文/黄历算法，在浏览器内现算，不请求后端。宜忌属传统民间说法，仅供趣味参考。</p>
      </section>
    </template>
  </ToolPageShell>
</template>
<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue'
import AppIcon from '@/components/AppIcon.vue'
import ToolPageShell from '@/components/ToolPageShell.vue'
import { TOOL_PAGE, TOOL_PAGES } from '@/constants/index.js'
import { useToolUsage } from '@/hooks/useToolUsage/index.js'
const PAGE = TOOL_PAGES['/life/daily']
const usage = useToolUsage('/life/daily')
const WEEK_LABELS = ['日', '一', '二', '三', '四', '五', '六']
function pad(value) {
  return String(value).padStart(2, '0')
}
function isoOf(date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}
function parseIso(text) {
  const [year, month, day] = String(text || '').split('-').map(Number)
  return year && month && day ? { year, month, day } : { year: 0, month: 0, day: 0 }
}
// lunar-javascript 体积不小，只在挂载后动态 import。拿到后放普通变量，
// 再靠 libReady 触发 computed 重算（computed 追踪不到普通变量的赋值）。
let lunarApi = null
const libReady = ref(false)
const solarDate = ref(isoOf(new Date()))
const targetDate = ref('')
const lunarYear = ref(new Date().getFullYear())
const lunarMonth = ref(1)
const lunarDay = ref(1)
const isLeap = ref(false)
const copied = ref(false)
const now = ref(Date.now())
// 秒级刷新必须放在 onMounted 里：SSR 不执行 onMounted，若在 setup 顶层直接
// setInterval，服务端渲染会留下永不清理的定时器，让 node --test 进程挂死。
let timer = null
onMounted(async () => {
  timer = setInterval(() => { now.value = Date.now() }, 1000)
  const startedAt = performance.now()
  try {
    const module = await import('lunar-javascript')
    lunarApi = module.Solar ? module : module.default
    libReady.value = true
    const { year, month, day } = parseIso(solarDate.value)
    const lunar = lunarApi.Solar.fromYmd(year, month, day).getLunar()
    lunarYear.value = lunar.getYear()
    lunarMonth.value = Math.abs(lunar.getMonth())
    lunarDay.value = lunar.getDay()
    isLeap.value = lunar.getMonth() < 0
    usage.record({ durationMs: Math.round(performance.now() - startedAt), meta: { action: 'lunar-lib' } })
  } catch {
    usage.record({ ok: false, errorCode: 'LUNAR_LIB_LOAD_FAILED', durationMs: Math.round(performance.now() - startedAt) })
  }
})
onUnmounted(() => {
  if (timer) clearInterval(timer)
  timer = null
})
const calYear = computed(() => parseIso(solarDate.value).year || new Date().getFullYear())
const calMonth = computed(() => parseIso(solarDate.value).month || new Date().getMonth() + 1)
const lunarInfo = computed(() => {
  if (!libReady.value) return null
  const { year, month, day } = parseIso(solarDate.value)
  if (!year) return null
  try {
    const lunar = lunarApi.Solar.fromYmd(year, month, day).getLunar()
    let jieQi = lunar.getJieQi()
    if (!jieQi) {
      const next = lunar.getNextJieQi(true)
      jieQi = next ? `下个节气 ${next.getName()}（${next.getSolar().toYmd()}）` : '—'
    }
    return {
      text: `${lunar.getYearInGanZhi()}年 ${lunar.getMonthInChinese()}月${lunar.getDayInChinese()}`,
      yearGz: lunar.getYearInGanZhi(),
      monthGz: lunar.getMonthInGanZhi(),
      dayGz: lunar.getDayInGanZhi(),
      shengXiao: lunar.getYearShengXiao(),
      jieQi,
      yi: lunar.getDayYi().slice(0, 8).join('、') || '—',
      ji: lunar.getDayJi().slice(0, 8).join('、') || '—',
    }
  } catch {
    return null
  }
})
const solarFromLunar = computed(() => {
  if (!libReady.value) return ''
  const year = Number(lunarYear.value)
  const month = Number(lunarMonth.value)
  const day = Number(lunarDay.value)
  if (!year || month < 1 || month > 12 || day < 1 || day > 30) return ''
  try {
    // 该库用负数月份表示闰月
    return lunarApi.Lunar.fromYmd(year, isLeap.value ? -month : month, day).getSolar().toYmd()
  } catch {
    return ''
  }
})
const calendarCells = computed(() => {
  const { year, month } = parseIso(solarDate.value)
  if (!year) return []
  const firstWeekday = new Date(year, month - 1, 1).getDay()
  const totalDays = new Date(year, month, 0).getDate()
  const todayIso = isoOf(new Date())
  const cells = []
  for (let index = 0; index < firstWeekday; index += 1) cells.push({ key: `blank-${index}`, day: 0 })
  for (let day = 1; day <= totalDays; day += 1) {
    let sub = '—'
    if (libReady.value) {
      try {
        const lunar = lunarApi.Solar.fromYmd(year, month, day).getLunar()
        sub = lunar.getJieQi() || (lunar.getDay() === 1 ? `${lunar.getMonthInChinese()}月` : lunar.getDayInChinese())
      } catch {
        sub = '—'
      }
    }
    cells.push({ key: `${year}-${month}-${day}`, day, sub, isToday: isoOf(new Date(year, month - 1, day)) === todayIso })
  }
  return cells
})
const countdownResult = computed(() => {
  if (!targetDate.value) return null
  const diff = new Date(targetDate.value).getTime() - now.value
  if (Number.isNaN(diff) || diff <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0 }
  return {
    days: Math.floor(diff / 86400000),
    hours: Math.floor((diff % 86400000) / 3600000),
    minutes: Math.floor((diff % 3600000) / 60000),
    seconds: Math.floor((diff % 60000) / 1000),
  }
})
function shiftMonth(offset) {
  const { year, month } = parseIso(solarDate.value)
  solarDate.value = isoOf(new Date(year, month - 1 + offset, 1))
}
async function copyLunar() {
  const startedAt = performance.now()
  if (!lunarInfo.value) return
  try {
    await navigator.clipboard.writeText(lunarInfo.value.text)
    copied.value = true
    usage.record({ durationMs: Math.round(performance.now() - startedAt), meta: { action: 'copy' } })
  } catch {
    usage.record({ ok: false, errorCode: 'CLIPBOARD_DENIED', durationMs: Math.round(performance.now() - startedAt) })
  }
}
</script>
<style scoped>
.lunar-facts { display: grid; gap: calc(var(--space-unit) * 0.5); margin: 0 0 calc(var(--space-unit) * 2); }
.lunar-facts div { display: grid; grid-template-columns: 56px 1fr; gap: var(--space-unit); align-items: baseline; }
.lunar-facts dt { color: var(--text-secondary); font-size: var(--fs-label); }
.lunar-facts dd { margin: 0; color: var(--text-primary); font-size: var(--fs-sm); }
.lunar-row { display: grid; grid-template-columns: repeat(3, 1fr); gap: calc(var(--space-unit) * 2); }
.lunar-leap { display: inline-flex; align-items: center; gap: 6px; font-size: var(--fs-sm); cursor: pointer; }
.lunar-nav { margin-left: auto; display: inline-flex; gap: var(--space-unit); }
.lunar-grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: 4px; }
.lunar-week { text-align: center; font-size: var(--fs-label); color: var(--text-secondary); padding: 4px 0; }
.lunar-cell { display: flex; flex-direction: column; align-items: center; gap: 2px; padding: 6px 2px; background: var(--bg-surface-2); border-radius: 8px; min-height: 48px; }
.lunar-cell.is-empty { background: transparent; }
.lunar-cell.is-today { outline: 1px solid var(--accent); }
.lunar-day { font-family: var(--font-mono); font-size: var(--fs-sm); color: var(--text-primary); font-style: normal; }
.lunar-sub { font-size: var(--fs-label); color: var(--text-secondary); }
.countdown-display { display: flex; justify-content: center; gap: calc(var(--space-unit) * 2); padding: calc(var(--space-unit) * 3); }
.countdown-item { display: flex; flex-direction: column; align-items: center; padding: calc(var(--space-unit) * 2); background: var(--bg-surface-2); border-radius: var(--radius-card); min-width: 64px; }
.countdown-value { font-family: var(--font-mono); font-size: var(--fs-h2); font-weight: var(--fw-heading); color: var(--accent); }
.countdown-label { font-size: var(--fs-label); color: var(--text-secondary); }
@media (max-width: 767px) {
  .lunar-row { grid-template-columns: 1fr; }
  .countdown-display { gap: var(--space-unit); }
}
</style>
