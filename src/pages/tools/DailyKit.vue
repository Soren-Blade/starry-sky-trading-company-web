<template>
  <ToolPageShell :title="PAGE.title" :eyebrow="PAGE.eyebrow" :description="PAGE.description" :icon="PAGE.icon" :requires-card="PAGE.requiresCard">
    <section class="ui-card tool-panel">
      <h2 class="tool-panel-title"><AppIcon name="heart" aria-hidden="true" /><span>日常生活工具</span></h2>
      <div class="u-field"><label class="u-field-label">工具</label>
        <SelectField v-model="mode" :options="PAGE.modeOptions" />
      </div>

      <template v-if="mode === 'bmi'">
        <div class="u-field"><label class="u-field-label">身高 (cm)</label><input v-model.number="bmiHeight" type="number" class="u-input" /></div>
        <div class="u-field"><label class="u-field-label">体重 (kg)</label><input v-model.number="bmiWeight" type="number" class="u-input" /></div>
        <div v-if="bmiResult" class="bmi-bar">
          <div class="bmi-track"><div class="bmi-marker" :style="{ left: bmiPosition + '%' }"></div></div>
          <p class="tool-result-note">BMI: <strong>{{ bmiResult.value }}</strong> — {{ bmiResult.label }}</p>
        </div>
      </template>

      <template v-if="mode === 'countdown'">
        <div class="u-field"><label class="u-field-label">目标日期</label><input v-model="targetDate" type="datetime-local" class="u-input" /></div>
        <div v-if="countdownResult" class="countdown-display">
          <div class="countdown-item"><span class="countdown-value">{{ countdownResult.days }}</span><span class="countdown-label">天</span></div>
          <div class="countdown-item"><span class="countdown-value">{{ countdownResult.hours }}</span><span class="countdown-label">时</span></div>
          <div class="countdown-item"><span class="countdown-value">{{ countdownResult.minutes }}</span><span class="countdown-label">分</span></div>
          <div class="countdown-item"><span class="countdown-value">{{ countdownResult.seconds }}</span><span class="countdown-label">秒</span></div>
        </div>
      </template>

      <template v-if="mode === 'zodiac'">
        <div class="u-field"><label class="u-field-label">出生日期</label><input v-model="birthDate" type="date" class="u-input" /></div>
        <div v-if="zodiacResult" class="zodiac-result">
          <p><strong>星座:</strong> {{ zodiacResult.sign }}</p>
          <p><strong>生肖:</strong> {{ zodiacResult.animal }}</p>
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

const PAGE = TOOL_PAGES['/life/daily']
const usage = useToolUsage('/life/daily')
let lastUsageAt = 0
// 输入即时出结果：节流上报，避免每次按键都留痕
function reportUsage(kind, startedAt) {
  const at = performance.now()
  if (at - lastUsageAt < 800) return
  lastUsageAt = at
  usage.record({ durationMs: Math.round(at - startedAt), meta: { kind } })
}
const mode = ref('bmi')
const bmiHeight = ref(170)
const bmiWeight = ref(65)
const targetDate = ref('')
const birthDate = ref('')
const now = ref(Date.now())

// 秒级刷新必须放在 onMounted 里：SSR 不执行 onMounted，若在 setup 顶层
// 直接 setInterval，服务端渲染会留下永不清理的定时器，让 node --test 进程
// 跑完断言也不退出（本项目测试就是 SSR 渲染整棵组件树）。
let timer = null
onMounted(() => {
  timer = setInterval(() => { now.value = Date.now() }, 1000)
})
onUnmounted(() => {
  if (timer) clearInterval(timer)
  timer = null
})

const bmiResult = computed(() => {
  if (!bmiHeight.value || !bmiWeight.value) return null
  const h = bmiHeight.value / 100
  const v = (bmiWeight.value / (h * h)).toFixed(1)
  let label = ''
  if (v < 18.5) label = '偏瘦'
  else if (v < 24) label = '正常'
  else if (v < 28) label = '超重'
  else label = '肥胖'
  return { value: v, label }
})

const bmiPosition = computed(() => {
  const v = parseFloat(bmiResult.value?.value || 0)
  return Math.min(100, Math.max(0, (v / 40) * 100))
})

const countdownResult = computed(() => {
  if (!targetDate.value) return null
  const target = new Date(targetDate.value).getTime()
  const diff = target - now.value
  if (diff <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0 }
  return {
    days: Math.floor(diff / 86400000),
    hours: Math.floor((diff % 86400000) / 3600000),
    minutes: Math.floor((diff % 3600000) / 60000),
    seconds: Math.floor((diff % 60000) / 1000),
  }
})

const zodiacResult = computed(() => {
  if (!birthDate.value) return null
  const d = new Date(birthDate.value)
  const month = d.getMonth() + 1
  const day = d.getDate()
  const signs = ['摩羯','水瓶','双鱼','白羊','金牛','双子','巨蟹','狮子','处女','天秤','天蝎','射手','摩羯']
  const days = [20,19,21,20,21,22,23,23,23,24,23,22]
  const sign = signs[month - (day < days[month - 1] ? 1 : 0)]
  const animals = ['猴','鸡','狗','猪','鼠','牛','虎','兔','龙','蛇','马','羊']
  const animal = animals[d.getFullYear() % 12]
  return { sign: sign + '座', animal }
})
watch([bmiHeight, bmiWeight, birthDate, targetDate], ([h, w, birth, target], [prevH, prevW, prevBirth, prevTarget]) => {
  const startedAt = performance.now()
  if ((h !== prevH || w !== prevW) && bmiResult.value) reportUsage('bmi', startedAt)
  else if (birth !== prevBirth && zodiacResult.value) reportUsage('zodiac', startedAt)
  else if (target !== prevTarget && countdownResult.value) reportUsage('countdown', startedAt)
})
</script>

<style scoped>
.bmi-bar { padding: calc(var(--space-unit) * 2); }
.bmi-track { position: relative; height: 8px; background: linear-gradient(to right, #3b82f6, #22c55e, #f59e0b, #ef4444); border-radius: 4px; }
.bmi-marker { position: absolute; top: -4px; width: 16px; height: 16px; background: var(--text-primary); border-radius: 50%; border: 2px solid var(--accent); transform: translateX(-50%); }
.countdown-display { display: flex; justify-content: center; gap: calc(var(--space-unit) * 2); padding: calc(var(--space-unit) * 3); }
.countdown-item { display: flex; flex-direction: column; align-items: center; padding: calc(var(--space-unit) * 2); background: var(--bg-surface-2); border-radius: var(--radius-card); min-width: 64px; }
.countdown-value { font-family: var(--font-mono); font-size: var(--fs-h2); font-weight: var(--fw-heading); color: var(--accent); }
.countdown-label { font-size: var(--fs-label); color: var(--text-secondary); }
.zodiac-result { padding: calc(var(--space-unit) * 2); background: var(--bg-surface-2); border-radius: var(--radius-card); }
.zodiac-result p { margin: calc(var(--space-unit)) 0; color: var(--text-primary); }
</style>
