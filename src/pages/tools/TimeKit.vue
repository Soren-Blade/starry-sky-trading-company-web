<template>
  <ToolPageShell :title="PAGE.title" :eyebrow="PAGE.eyebrow" :description="PAGE.description" :icon="PAGE.icon" :requires-card="PAGE.requiresCard">
    <section class="ui-card tool-panel">
      <h2 class="tool-panel-title"><AppIcon name="clock" aria-hidden="true" /><span>{{ PAGE.inputTitle }}</span></h2>
      <div class="u-field">
        <label class="u-field-label">模式</label>
        <SelectField v-model="mode" :options="PAGE.modeOptions" />
      </div>

      <template v-if="mode === 'timestamp'">
        <div class="u-field">
          <label class="u-field-label">时间戳</label>
          <input v-model="timestampInput" class="u-input" placeholder="Unix 时间戳（秒或毫秒）" />
        </div>
        <div class="tool-result-meta">
          <span class="tool-result-meta-item">ISO: <span class="tool-result-value">{{ tsResult.iso }}</span></span>
          <span class="tool-result-meta-item">本地: <span class="tool-result-value">{{ tsResult.local }}</span></span>
          <span class="tool-result-meta-item">相对: <span class="tool-result-value">{{ tsResult.relative }}</span></span>
        </div>
      </template>

      <template v-if="mode === 'now'">
        <div class="now-display">
          <span class="now-time">{{ nowTime }}</span>
          <span class="now-date">{{ nowDate }}</span>
        </div>
      </template>

      <template v-if="mode === 'diff'">
        <div class="u-field"><label class="u-field-label">开始日期</label><input v-model="date1" type="datetime-local" class="u-input" /></div>
        <div class="u-field"><label class="u-field-label">结束日期</label><input v-model="date2" type="datetime-local" class="u-input" /></div>
        <div v-if="diffResult" class="tool-result-meta">
          <span class="tool-result-meta-item">相差: <span class="tool-result-value">{{ diffResult.days }} 天 {{ diffResult.hours }} 小时 {{ diffResult.minutes }} 分钟</span></span>
        </div>
      </template>

      <template v-if="mode === 'countdown'">
        <div class="u-field"><label class="u-field-label">目标时间</label><input v-model="targetTime" type="datetime-local" class="u-input" /></div>
        <div v-if="countdownResult" class="countdown-display">
          <div class="countdown-item"><span class="countdown-value">{{ countdownResult.days }}</span><span class="countdown-label">天</span></div>
          <div class="countdown-item"><span class="countdown-value">{{ countdownResult.hours }}</span><span class="countdown-label">时</span></div>
          <div class="countdown-item"><span class="countdown-value">{{ countdownResult.minutes }}</span><span class="countdown-label">分</span></div>
          <div class="countdown-item"><span class="countdown-value">{{ countdownResult.seconds }}</span><span class="countdown-label">秒</span></div>
        </div>
      </template>
    </section>

    <template #aside>
      <section class="ui-card tool-aside-card">
        <h3 class="tool-aside-title"><AppIcon name="info" /> {{ TOOL_PAGE.usageTitle }}</h3>
        <ul class="tool-aside-list"><li v-for="item in PAGE.asideItems" :key="item">{{ item }}</li></ul>
      </section>
    </template>
  </ToolPageShell>
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import AppIcon from '@/components/AppIcon.vue'
import SelectField from '@/components/SelectField.vue'
import ToolPageShell from '@/components/ToolPageShell.vue'
import { TOOL_PAGE, TOOL_PAGES } from '@/constants/index.js'
import { useToolUsage } from '@/hooks/useToolUsage/index.js'

const PAGE = TOOL_PAGES['/convert/time']
const usage = useToolUsage('/convert/time')
let lastUsageAt = 0
// 输入即时出结果：节流上报，避免每次按键都留痕
function reportUsage(kind, startedAt) {
  const at = performance.now()
  if (at - lastUsageAt < 800) return
  lastUsageAt = at
  usage.record({ durationMs: Math.round(at - startedAt), meta: { kind } })
}
const mode = ref('timestamp')
const timestampInput = ref('')
const date1 = ref('')
const date2 = ref('')
const targetTime = ref('')
const now = ref(Date.now())

// 同 DailyKit：定时器必须在 onMounted 内启动，否则 SSR 渲染会留下悬空 timer，
// 测试进程跑完断言不退出。
let timer = null
onMounted(() => {
  timer = setInterval(() => { now.value = Date.now() }, 1000)
})
onUnmounted(() => {
  if (timer) clearInterval(timer)
  timer = null
})

const nowTime = computed(() => new Date(now.value).toLocaleTimeString('zh-CN'))
const nowDate = computed(() => new Date(now.value).toLocaleDateString('zh-CN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }))

const tsResult = computed(() => {
  const ts = timestampInput.value.trim()
  if (!ts || isNaN(ts)) return { iso: '-', local: '-', relative: '-' }
  let ms = Number(ts)
  if (ts.length <= 10) ms *= 1000
  const d = new Date(ms)
  const diff = Date.now() - ms
  const rel = diff > 0 ? `${Math.floor(diff / 86400000)} 天前` : `${Math.floor(-diff / 86400000)} 天后`
  return { iso: d.toISOString(), local: d.toLocaleString('zh-CN'), relative: rel }
})

const diffResult = computed(() => {
  if (!date1.value || !date2.value) return null
  const d1 = new Date(date1.value).getTime()
  const d2 = new Date(date2.value).getTime()
  const diff = Math.abs(d2 - d1)
  return {
    days: Math.floor(diff / 86400000),
    hours: Math.floor((diff % 86400000) / 3600000),
    minutes: Math.floor((diff % 3600000) / 60000),
  }
})

const countdownResult = computed(() => {
  if (!targetTime.value) return null
  const target = new Date(targetTime.value).getTime()
  const diff = target - now.value
  if (diff <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0, expired: true }
  return {
    days: Math.floor(diff / 86400000),
    hours: Math.floor((diff % 86400000) / 3600000),
    minutes: Math.floor((diff % 3600000) / 60000),
    seconds: Math.floor((diff % 60000) / 1000),
  }
})

watch(mode, () => {
  timestampInput.value = String(Math.floor(Date.now() / 1000))
})

watch([timestampInput, date1, date2], ([ts, d1, d2], [prevTs, prevD1, prevD2]) => {
  const startedAt = performance.now()
  if (ts !== prevTs && tsResult.value.iso !== '-') reportUsage('timestamp', startedAt)
  else if ((d1 !== prevD1 || d2 !== prevD2) && diffResult.value) reportUsage('diff', startedAt)
})
</script>

<style scoped>
.now-display { display: flex; flex-direction: column; align-items: center; gap: calc(var(--space-unit)); padding: calc(var(--space-unit) * 4); background: var(--bg-surface-2); border-radius: var(--radius-card); }
.now-time { font-family: var(--font-mono); font-size: var(--fs-h1); font-weight: var(--fw-heading); color: var(--accent); }
.now-date { font-size: var(--fs-sm); color: var(--text-secondary); }
.countdown-display { display: flex; justify-content: center; gap: calc(var(--space-unit) * 2); padding: calc(var(--space-unit) * 3); }
.countdown-item { display: flex; flex-direction: column; align-items: center; padding: calc(var(--space-unit) * 2); background: var(--bg-surface-2); border-radius: var(--radius-card); min-width: 64px; }
.countdown-value { font-family: var(--font-mono); font-size: var(--fs-h2); font-weight: var(--fw-heading); color: var(--accent); }
.countdown-label { font-size: var(--fs-label); color: var(--text-secondary); }
</style>
