<template>
  <ToolPageShell :title="PAGE.title" :eyebrow="PAGE.eyebrow" :description="PAGE.description" :icon="PAGE.icon" :requires-card="PAGE.requiresCard">
    <section class="ui-card tool-panel">
      <h2 class="tool-panel-title"><AppIcon name="hash" aria-hidden="true" /><span>{{ PAGE.inputTitle }}</span></h2>
      <div class="u-field">
        <label class="u-field-label" for="num-input">{{ PAGE.inputLabel }}</label>
        <input id="num-input" v-model="inputValue" class="u-input" :placeholder="PAGE.inputPlaceholder" />
        <p class="u-field-hint">按 BigInt 精确解析，超过 2^53 的整数也不会丢精度；输入长度上限 4096 个字符。仅支持整数，不接受小数点。</p>
        <p v-if="error" class="u-field-error" role="alert">{{ error }}</p>
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
        <button type="button" class="u-btn-primary" :disabled="!inputValue.trim()" @click="convert(true)">{{ PAGE.submit }}</button>
        <button type="button" class="u-btn-secondary" :disabled="!result" @click="copy">{{ copyLabel }}</button>
      </div>
    </section>

    <section class="ui-card tool-panel">
      <h2 class="tool-panel-title"><AppIcon name="check-circle" aria-hidden="true" /><span>{{ PAGE.resultTitle }}</span></h2>
      <ToolResultPane :state="result ? 'success' : 'empty'" :title="PAGE.emptyTitle" :description="PAGE.emptyDesc" icon="hash">
        <template v-if="result">
          <div class="base-results">
            <div v-for="(val, base) in result.allBases" :key="base" :class="['base-result-row', { 'base-result-active': Number(base) === toBase }]">
              <span class="base-label">{{ base }}进制</span>
              <code class="base-value">{{ val }}</code>
            </div>
          </div>
          <p class="tool-result-note">十进制值：{{ result.decimal }}（BigInt 精确值）</p>
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
import { computed, onUnmounted, ref, watch } from 'vue'
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
const error = ref('')
const copyState = ref('idle')
let timer = 0

const baseOptions = [
  { label: '二进制 (2)', value: 2 },
  { label: '八进制 (8)', value: 8 },
  { label: '十进制 (10)', value: 10 },
  { label: '十六进制 (16)', value: 16 },
  { label: '三十六进制 (36)', value: 36 },
]
const copyLabel = computed(() => copyState.value === 'ok' ? TOOL_RESULT.copied : copyState.value === 'fail' ? TOOL_RESULT.copyFailed : TOOL_RESULT.copy)

function fail(message, code) {
  const e = new Error(message)
  e.code = code
  return e
}

function parseBigInt(text, base) {
  let value = text.trim().replace(/[\s_]/g, '').toLowerCase()
  if (!value) throw fail('请输入要转换的整数。', 'NUMBER_BASE_EMPTY')
  if (value.length > 4096) throw fail('输入超过 4096 个字符，转换会非常慢且结果难以阅读，请先缩短。', 'NUMBER_BASE_INPUT_TOO_LONG')
  let sign = 1n
  if (value.startsWith('-')) { sign = -1n; value = value.slice(1) }
  else if (value.startsWith('+')) value = value.slice(1)
  const prefix = { '0x': 16, '0b': 2, '0o': 8 }
  if (prefix[value.slice(0, 2)] && prefix[value.slice(0, 2)] !== base) {
    throw fail(`输入带有 ${value.slice(0, 2)} 前缀，但选择的进制是 ${base}，请改成匹配的进制或去掉前缀。`, 'NUMBER_BASE_PREFIX_MISMATCH')
  }
  if (prefix[value.slice(0, 2)] === base) value = value.slice(2)
  if (!value) throw fail('去掉前缀后没有数字，请检查输入。', 'NUMBER_BASE_INVALID_INPUT')
  let parsed = 0n
  for (const char of value) {
    const digit = parseInt(char, 36)
    if (!Number.isInteger(digit) || digit >= base) {
      const range = base <= 10 ? `0-${base - 1}` : `0-9 及 a-${String.fromCharCode(87 + base - 1)}`
      throw fail(`字符「${char}」不是 ${base} 进制的合法数字（有效范围 ${range}）。`, 'NUMBER_BASE_INVALID_INPUT')
    }
    parsed = parsed * BigInt(base) + BigInt(digit)
  }
  return sign * parsed
}

function convert(reportFailure = false) {
  const startedAt = performance.now()
  error.value = ''
  result.value = null
  if (!inputValue.value.trim()) return
  try {
    const value = parseBigInt(inputValue.value, fromBase.value)
    const allBases = {}
    for (const base of [2, 8, 10, 16, 36]) allBases[base] = value.toString(base).toUpperCase()
    result.value = { allBases, decimal: value.toString(10), input: inputValue.value.trim() }
    copyState.value = 'idle'
    usage.record({ durationMs: Math.round(performance.now() - startedAt), meta: { from: fromBase.value, bases: 5 } })
  } catch (e) {
    error.value = `转换失败：${e.message}`
    if (reportFailure) usage.record({ ok: false, errorCode: e.code || 'NUMBER_BASE_CONVERT_FAILED', durationMs: Math.round(performance.now() - startedAt) })
  }
}

watch([inputValue, fromBase], () => {
  clearTimeout(timer)
  timer = setTimeout(() => convert(false), 150)
})

onUnmounted(() => clearTimeout(timer))

async function copy() {
  if (!result.value) return
  const text = Object.entries(result.value.allBases).map(([base, value]) => `${base}进制: ${value}`).join('\n')
  try { await navigator.clipboard.writeText(text); copyState.value = 'ok' } catch { copyState.value = 'fail' }
}
</script>

<style scoped>
.base-results { display: flex; flex-direction: column; gap: calc(var(--space-unit)); }
.base-result-row { display: flex; align-items: center; gap: calc(var(--space-unit) * 2); padding: calc(var(--space-unit)) calc(var(--space-unit) * 1.5); background: var(--bg-surface-2); border-radius: var(--radius-input); }
.base-result-active { outline: 1px solid var(--accent); }
.base-label { font-size: var(--fs-sm); color: var(--text-secondary); min-width: 80px; }
.base-value { font-family: var(--font-mono); font-size: var(--fs-sm); color: var(--text-primary); word-break: break-all; }
@media (max-width: 575px) { .base-result-row { flex-direction: column; align-items: flex-start; gap: calc(var(--space-unit) * 0.5); } }
</style>
