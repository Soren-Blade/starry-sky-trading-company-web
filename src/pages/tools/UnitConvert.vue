<template>
  <ToolPageShell :title="PAGE.title" :eyebrow="PAGE.eyebrow" :description="PAGE.description" :icon="PAGE.icon" :requires-card="PAGE.requiresCard">
    <section class="ui-card tool-panel">
      <h2 class="tool-panel-title"><AppIcon name="scale" aria-hidden="true" /><span>{{ PAGE.inputTitle }}</span></h2>
      <div class="u-field">
        <label class="u-field-label">{{ PAGE.categoryLabel }}</label>
        <SelectField v-model="category" :options="PAGE.categoryOptions" />
      </div>
      <div class="convert-grid">
        <div class="u-field">
          <label class="u-field-label">数值</label>
          <input v-model.number="inputValue" type="number" class="u-input" placeholder="输入数值" />
        </div>
        <div class="u-field">
          <label class="u-field-label">从</label>
          <SelectField v-model="fromUnit" :options="unitOptions" />
        </div>
        <button type="button" class="u-btn-secondary swap-btn" :aria-label="PAGE.swap" @click="swap"><AppIcon name="arrow-left-right" /></button>
        <div class="u-field">
          <label class="u-field-label">到</label>
          <SelectField v-model="toUnit" :options="unitOptions" />
        </div>
      </div>
    </section>

    <section class="ui-card tool-panel">
      <h2 class="tool-panel-title"><AppIcon name="check-circle" aria-hidden="true" /><span>{{ PAGE.resultTitle }}</span></h2>
      <ToolResultPane :state="result ? 'success' : 'empty'" :title="PAGE.emptyTitle" :description="PAGE.emptyDesc" icon="scale">
        <template v-if="result">
          <div class="convert-result">
            <span class="convert-result-value">{{ result.value }}</span>
            <span class="convert-result-unit">{{ result.unit }}</span>
          </div>
          <p v-if="result.formula" class="tool-result-note">{{ result.formula }}</p>
        </template>
      </ToolResultPane>
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
import ToolResultPane from '@/components/ToolResultPane.vue'
import { TOOL_PAGE, TOOL_PAGES } from '@/constants/index.js'
import { useToolUsage } from '@/hooks/useToolUsage/index.js'

const PAGE = TOOL_PAGES['/convert/unit']
const usage = useToolUsage('/convert/unit')
let lastUsageAt = 0
const category = ref('length')
const inputValue = ref(1)
const fromUnit = ref('m')
const toUnit = ref('cm')
const result = ref(null)

const unitData = {
  length: { m: 1, cm: 0.01, mm: 0.001, km: 1000, inch: 0.0254, ft: 0.3048, yd: 0.9144, mi: 1609.34 },
  weight: { kg: 1, g: 0.001, mg: 0.000001, t: 1000, lb: 0.453592, oz: 0.0283495 },
  area: { m2: 1, cm2: 0.0001, km2: 1000000, ha: 10000, acre: 4046.86, ft2: 0.092903 },
  volume: { l: 1, ml: 0.001, m3: 1000, gal: 3.78541, oz: 0.0295735 },
  temperature: { c: 'c', f: 'f', k: 'k' },
  data: { b: 1 / 8, B: 1, KB: 1024, MB: 1048576, GB: 1073741824, TB: 1099511627776 },
}

const unitLabels = {
  length: { m: '米', cm: '厘米', mm: '毫米', km: '千米', inch: '英寸', ft: '英尺', yd: '码', mi: '英里' },
  weight: { kg: '千克', g: '克', mg: '毫克', t: '吨', lb: '磅', oz: '盎司' },
  area: { m2: '平方米', cm2: '平方厘米', km2: '平方千米', ha: '公顷', acre: '英亩', ft2: '平方英尺' },
  volume: { l: '升', ml: '毫升', m3: '立方米', gal: '加仑', oz: '液盎司' },
  temperature: { c: '摄氏度', f: '华氏度', k: '开尔文' },
  data: { b: '比特', B: '字节', KB: 'KB', MB: 'MB', GB: 'GB', TB: 'TB' },
}

const unitOptions = computed(() => {
  const units = unitData[category.value] || {}
  return Object.keys(units).map(k => ({ label: unitLabels[category.value]?.[k] || k, value: k }))
})

function convertTemperature(v, from, to) {
  let c = v
  if (from === 'f') c = (v - 32) * 5 / 9
  else if (from === 'k') c = v - 273.15
  if (to === 'c') return c
  if (to === 'f') return c * 9 / 5 + 32
  if (to === 'k') return c + 273.15
  return c
}

function convert() {
  const startedAt = performance.now()
  const v = Number(inputValue.value)
  // 清空输入框时 v-model.number 会给出 ''，Number('') === 0，必须单独判断
  if (inputValue.value === '' || inputValue.value === null || !Number.isFinite(v)) { result.value = null; return }
  const from = fromUnit.value, to = toUnit.value
  const rates = unitData[category.value] || {}
  const out = category.value === 'temperature'
    ? convertTemperature(v, from, to)
    : v * (rates[from] || 1) / (rates[to] || 1)
  const label = unitLabels[category.value]?.[to] || to
  const fromLabel = unitLabels[category.value]?.[from] || from
  const rate = (rates[from] || 1) / (rates[to] || 1)
  result.value = {
    value: Number(out.toFixed(6)).toString(),
    unit: label,
    formula: category.value === 'temperature'
      ? `以摄氏度为中间量：${v} ${fromLabel} = ${Number(out.toFixed(4))} ${label}`
      : Math.abs(rate - 1) < 1e-12 ? '同单位，数值不变' : `1 ${fromLabel} = ${Number(rate.toPrecision(6))} ${label}`,
  }
  // 输入即时换算：按 800ms 节流上报，避免每次按键都留痕
  const at = performance.now()
  if (at - lastUsageAt < 800) return
  lastUsageAt = at
  usage.record({ durationMs: Math.round(at - startedAt), meta: { category: category.value, from, to } })
}

function swap() { const t = fromUnit.value; fromUnit.value = toUnit.value; toUnit.value = t; convert() }

watch([inputValue, fromUnit, toUnit, category], () => {
  const units = Object.keys(unitData[category.value] || {})
  if (!units.includes(fromUnit.value)) fromUnit.value = units[0]
  if (!units.includes(toUnit.value)) toUnit.value = units[1] || units[0]
  convert()
}, { immediate: true })
</script>

<style scoped>
.convert-grid { display: grid; grid-template-columns: 1fr 1fr auto 1fr; gap: var(--grid-gap); align-items: end; }
.swap-btn { margin-bottom: calc(var(--space-unit)); padding: calc(var(--space-unit)); }
.convert-result { display: flex; align-items: baseline; gap: calc(var(--space-unit)); padding: calc(var(--space-unit) * 3); background: var(--bg-surface-2); border-radius: var(--radius-card); }
.convert-result-value { font-family: var(--font-mono); font-size: var(--fs-h2); font-weight: var(--fw-heading); color: var(--accent); }
.convert-result-unit { font-size: var(--fs-body); color: var(--text-secondary); }
@media (max-width: 767px) { .convert-grid { grid-template-columns: 1fr 1fr; } .swap-btn { grid-column: 1 / -1; justify-self: center; } }
</style>
