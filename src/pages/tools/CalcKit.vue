<template>
  <ToolPageShell :title="PAGE.title" :eyebrow="PAGE.eyebrow" :description="PAGE.description" :icon="PAGE.icon" :requires-card="PAGE.requiresCard">
    <section class="ui-card tool-panel">
      <h2 class="tool-panel-title"><AppIcon name="calculator" aria-hidden="true" /><span>{{ PAGE.inputTitle }}</span></h2>
      <div class="u-field">
        <label class="u-field-label">模式</label>
        <SelectField v-model="mode" :options="PAGE.modeOptions" />
      </div>

      <template v-if="mode === 'expression'">
        <div class="u-field">
          <label class="u-field-label">表达式</label>
          <input v-model="expression" class="u-input" placeholder="例如: (1+2)*3" />
        </div>
        <div v-if="exprEval" class="expr-result">
          <span class="expr-value" :class="{ 'expr-value-error': !exprEval.ok }">= {{ exprEval.text }}</span>
        </div>
      </template>

      <template v-if="mode === 'bmi'">
        <div class="u-field"><label class="u-field-label">身高 (cm)</label><input v-model.number="bmiHeight" type="number" class="u-input" /></div>
        <div class="u-field"><label class="u-field-label">体重 (kg)</label><input v-model.number="bmiWeight" type="number" class="u-input" /></div>
        <div v-if="bmiResult" class="bmi-bar">
          <div class="bmi-track"><div class="bmi-marker" :style="{ left: bmiPosition + '%' }"></div></div>
          <p class="tool-result-note">BMI: <strong>{{ bmiResult.value }}</strong> — {{ bmiResult.label }}</p>
        </div>
      </template>

      <template v-if="mode === 'stats'">
        <div class="u-field"><label class="u-field-label">数据（逗号/空格/换行分隔）</label><textarea v-model="statsData" class="u-input tool-textarea" /></div>
        <div v-if="statsResult" class="tool-result-stats">
          <div v-for="(v, k) in statsResult" :key="k" class="tool-stat-card"><span class="tool-stat-value">{{ v }}</span><span class="tool-stat-label">{{ k }}</span></div>
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
import { computed, ref, watch } from 'vue'
import AppIcon from '@/components/AppIcon.vue'
import SelectField from '@/components/SelectField.vue'
import ToolPageShell from '@/components/ToolPageShell.vue'
import { TOOL_PAGE, TOOL_PAGES } from '@/constants/index.js'
import { useToolUsage } from '@/hooks/useToolUsage/index.js'

const PAGE = TOOL_PAGES['/convert/calc']
const usage = useToolUsage('/convert/calc')
let lastUsageAt = 0
// 输入即时出结果：节流上报，避免每次按键都留痕
function reportUsage(kind, startedAt) {
  const at = performance.now()
  if (at - lastUsageAt < 800) return
  lastUsageAt = at
  usage.record({ durationMs: Math.round(at - startedAt), meta: { kind } })
}
const mode = ref('expression')
const expression = ref('')
const bmiHeight = ref(170)
const bmiWeight = ref(65)
const statsData = ref('')

// 只放行数字、四则运算、括号、百分号与空白，其余字符一律剔除后再交给 Function，
// 这样输入里不可能混进标识符或属性访问（eval 类实现最常见的逃逸口）。
const exprEval = computed(() => {
  const text = expression.value.trim()
  if (!text) return null
  const sanitized = text.replace(/[^0-9+\-*/().%\s]/g, '')
  if (!sanitized.trim()) return { ok: false, text: '表达式只支持数字与 + - * / ( ) %' }
  try {
    const value = Function(`"use strict"; return (${sanitized})`)()
    if (typeof value !== 'number' || !Number.isFinite(value)) return { ok: false, text: '结果不是有限数值（检查是否除以 0）' }
    // toPrecision(12) 去掉 0.1+0.2=0.30000000000000004 这类浮点尾巴
    return { ok: true, text: String(Number(value.toPrecision(12))) }
  } catch {
    return { ok: false, text: '表达式语法有误，无法计算' }
  }
})

const bmiResult = computed(() => {
  if (!bmiHeight.value || !bmiWeight.value) return null
  const h = bmiHeight.value / 100
  const v = Number((bmiWeight.value / (h * h)).toFixed(1))
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

const statsResult = computed(() => {
  if (!statsData.value.trim()) return null
  const nums = statsData.value.split(/[,\s\n]+/).map(Number).filter(n => !isNaN(n))
  if (!nums.length) return null
  nums.sort((a, b) => a - b)
  const sum = nums.reduce((a, b) => a + b, 0)
  const mean = sum / nums.length
  const mid = Math.floor(nums.length / 2)
  const median = nums.length % 2 ? nums[mid] : (nums[mid - 1] + nums[mid]) / 2
  const variance = nums.reduce((a, b) => a + (b - mean) ** 2, 0) / nums.length
  return {
    个数: nums.length,
    最小值: nums[0],
    最大值: nums[nums.length - 1],
    平均值: mean.toFixed(2),
    中位数: median,
    标准差: Math.sqrt(variance).toFixed(2),
  }
})
watch([expression, bmiHeight, bmiWeight, statsData], ([expr, h, w, data], [prevExpr, prevH, prevW, prevData]) => {
  const startedAt = performance.now()
  if (expr !== prevExpr && exprEval.value) {
    if (exprEval.value.ok) reportUsage('expression', startedAt)
    else usage.record({ ok: false, errorCode: 'CALC_EXPRESSION_INVALID', durationMs: Math.round(performance.now() - startedAt) })
  } else if ((h !== prevH || w !== prevW) && bmiResult.value) reportUsage('bmi', startedAt)
  else if (data !== prevData && statsResult.value) reportUsage('stats', startedAt)
})
</script>

<style scoped>
.expr-result { display: flex; justify-content: center; padding: calc(var(--space-unit) * 3); background: var(--bg-surface-2); border-radius: var(--radius-card); }
.expr-value { font-family: var(--font-mono); font-size: var(--fs-h2); font-weight: var(--fw-heading); color: var(--accent); }
.expr-value-error { font-size: var(--fs-body); color: var(--danger); }
.bmi-bar { padding: calc(var(--space-unit) * 2); }
.bmi-track { position: relative; height: 8px; background: linear-gradient(to right, #3b82f6, #22c55e, #f59e0b, #ef4444); border-radius: 4px; }
.bmi-marker { position: absolute; top: -4px; width: 16px; height: 16px; background: var(--text-primary); border-radius: 50%; border: 2px solid var(--accent); transform: translateX(-50%); }
.tool-result-stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(100px, 1fr)); gap: calc(var(--space-unit) * 1.5); }
.tool-stat-card { display: flex; flex-direction: column; align-items: center; gap: calc(var(--space-unit) * 0.5); padding: calc(var(--space-unit) * 2); background: var(--bg-surface-2); border-radius: var(--radius-card); }
.tool-stat-value { font-family: var(--font-mono); font-size: var(--fs-h3); font-weight: var(--fw-heading); color: var(--accent); }
.tool-stat-label { font-size: var(--fs-sm); color: var(--text-secondary); }
</style>
