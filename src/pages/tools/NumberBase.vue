<template>
  <ToolPageShell :title="PAGE.title" :eyebrow="PAGE.eyebrow" :description="PAGE.description" :icon="PAGE.icon" :requires-card="PAGE.requiresCard">
    <section class="ui-card tool-panel">
      <h2 class="tool-panel-title"><AppIcon name="hash" aria-hidden="true" /><span>{{ PAGE.inputTitle }}</span></h2>
      <div class="u-field">
        <label class="u-field-label" for="num-input">{{ PAGE.inputLabel }}</label>
        <input id="num-input" v-model="inputValue" class="u-input" :placeholder="PAGE.inputPlaceholder" />
      </div>
      <div class="tool-form">
        <div class="u-field">
          <label class="u-field-label" for="from-base">{{ PAGE.fromLabel }}</label>
          <SelectField id="from-base" v-model="fromBase" :options="baseOptions" />
        </div>
        <div class="u-field">
          <label class="u-field-label" for="to-base">{{ PAGE.toLabel }}</label>
          <SelectField id="to-base" v-model="toBase" :options="baseOptions" />
        </div>
      </div>
      <div class="tool-actions">
        <button type="button" class="u-btn-primary" :disabled="!inputValue" @click="convert">{{ PAGE.submit }}</button>
        <button type="button" class="u-btn-secondary" @click="swap">{{ PAGE.swap }}</button>
        <button type="button" class="u-btn-secondary" :disabled="!result" @click="copy">{{ copyLabel }}</button>
      </div>
    </section>

    <section class="ui-card tool-panel">
      <h2 class="tool-panel-title"><AppIcon name="check-circle" aria-hidden="true" /><span>{{ PAGE.resultTitle }}</span></h2>
      <ToolResultPane :state="result ? 'success' : 'empty'" :title="PAGE.emptyTitle" :description="PAGE.emptyDesc" icon="hash">
        <template v-if="result">
          <div class="base-results">
            <div v-for="(val, base) in result.allBases" :key="base" class="base-result-row">
              <span class="base-label">{{ base }}</span>
              <code class="base-value">{{ val }}</code>
            </div>
          </div>
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
import { TOOL_PAGE, TOOL_PAGES, TOOL_RESULT } from '@/constants/index.js'
import { useToolUsage } from '@/hooks/useToolUsage/index.js'

const PAGE = TOOL_PAGES['/text/number-base']
const usage = useToolUsage('/text/number-base')
const inputValue = ref('')
const fromBase = ref(10)
const toBase = ref(16)
const result = ref(null)
const copyState = ref('idle')

const baseOptions = [
  { label: '二进制 (2)', value: 2 },
  { label: '八进制 (8)', value: 8 },
  { label: '十进制 (10)', value: 10 },
  { label: '十六进制 (16)', value: 16 },
  { label: '三十六进制 (36)', value: 36 },
]

const copyLabel = computed(() => copyState.value === 'ok' ? TOOL_RESULT.copied : copyState.value === 'fail' ? TOOL_RESULT.copyFailed : TOOL_RESULT.copy)

function convertNumber(val, from, to) {
  try {
    const num = parseInt(String(val).trim(), from)
    if (isNaN(num)) return '无效输入'
    return num.toString(to).toUpperCase()
  } catch (e) { return '转换错误' }
}

function convert() {
  if (!inputValue.value.trim()) return
  const startedAt = performance.now()
  const val = inputValue.value.trim()
  const bases = [2, 8, 10, 16, 36]
  const allBases = {}
  bases.forEach(b => { allBases[`${b}进制`] = convertNumber(val, fromBase.value, b) })
  result.value = { allBases, input: val }
  copyState.value = 'idle'
  usage.record({ durationMs: performance.now() - startedAt, meta: { from: fromBase.value, bases: bases.length } })
}

function swap() {
  const t = fromBase.value; fromBase.value = toBase.value; toBase.value = t
  if (result.value) convert()
}

watch([inputValue, fromBase], () => { if (inputValue.value.trim()) convert() }, { debounce: 150 })

async function copy() {
  if (!result.value) return
  const text = Object.entries(result.value.allBases).map(([k, v]) => `${k}: ${v}`).join('\n')
  try { await navigator.clipboard.writeText(text); copyState.value = 'ok' } catch (e) { copyState.value = 'fail' }
}
</script>

<style scoped>
.base-results { display: flex; flex-direction: column; gap: calc(var(--space-unit)); }
.base-result-row { display: flex; align-items: center; gap: calc(var(--space-unit) * 2); padding: calc(var(--space-unit)) calc(var(--space-unit) * 1.5); background: var(--bg-surface-2); border-radius: var(--radius-input); }
.base-label { font-size: var(--fs-sm); color: var(--text-secondary); min-width: 80px; }
.base-value { font-family: var(--font-mono); font-size: var(--fs-sm); color: var(--text-primary); word-break: break-all; }
</style>
