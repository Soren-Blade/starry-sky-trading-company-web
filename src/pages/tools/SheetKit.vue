<template>
  <ToolPageShell :title="PAGE.title" :eyebrow="PAGE.eyebrow" :description="PAGE.description" :icon="PAGE.icon" :requires-card="PAGE.requiresCard">
    <section class="ui-card tool-panel">
      <h2 class="tool-panel-title"><AppIcon name="table" aria-hidden="true" /><span>{{ PAGE.inputTitle }}</span></h2>
      <div class="u-field">
        <label class="u-field-label">{{ PAGE.sourceLabel }}</label>
        <textarea v-model="source" class="u-input tool-textarea" :placeholder="PAGE.sourcePlaceholder" spellcheck="false"></textarea>
      </div>
      <div class="tool-actions">
        <button type="button" class="u-btn-primary" :disabled="!source" @click="process">{{ PAGE.submit }}</button>
        <button type="button" class="u-btn-secondary" @click="clear">{{ PAGE.reset }}</button>
      </div>
    </section>

    <section class="ui-card tool-panel">
      <h2 class="tool-panel-title"><AppIcon name="check-circle" aria-hidden="true" /><span>{{ PAGE.resultTitle }}</span></h2>
      <ToolResultPane :state="result ? 'success' : 'empty'" :title="PAGE.emptyTitle" :description="PAGE.emptyDesc" icon="table">
        <template v-if="result"><pre class="tool-preview">{{ result }}</pre></template>
        <template #actions><button type="button" class="u-btn-primary" :disabled="!result" @click="copy">{{ copyLabel }}</button></template>
      </ToolResultPane>
    </section>

    <template #aside>
      <section class="ui-card tool-aside-card">
        <h3 class="tool-aside-title"><AppIcon name="info" /> {{ TOOL_PAGE.usageTitle }}</h3>
        <ul class="tool-aside-list"><li v-for="item in PAGE.asideItems" :key="item">{{ item }}</li></ul>
      </section>
      <section class="ui-card tool-aside-card">
        <h3 class="tool-aside-title"><AppIcon name="alert-triangle" /> {{ TOOL_PAGE.noticeTitle }}</h3>
        <p class="tool-aside-note"><AppIcon name="alert-triangle" /> {{ PAGE.asideNotice }}</p>
      </section>
    </template>
  </ToolPageShell>
</template>

<script setup>
import { computed, ref } from 'vue'
import AppIcon from '@/components/AppIcon.vue'
import ToolPageShell from '@/components/ToolPageShell.vue'
import ToolResultPane from '@/components/ToolResultPane.vue'
import { TOOL_PAGE, TOOL_PAGES, TOOL_RESULT } from '@/constants/index.js'
import { useToolUsage } from '@/hooks/useToolUsage/index.js'

const PAGE = TOOL_PAGES['/office/sheet']
const usage = useToolUsage('/office/sheet')
const source = ref('')
const result = ref('')
const copyState = ref('idle')
const copyLabel = computed(() => copyState.value === 'ok' ? TOOL_RESULT.copied : copyState.value === 'fail' ? TOOL_RESULT.copyFailed : TOOL_RESULT.copy)

function parseCSV(text) {
  const lines = text.trim().split(/\r?\n/)
  if (!lines.length) return []
  const headers = parseCSVLine(lines[0])
  return lines.slice(1).map((line, _idx) => {
    const values = parseCSVLine(line)
    const obj = {}
    headers.forEach((h, i) => { obj[h] = values[i] !== undefined ? values[i] : '' })
    return obj
  })
}

function parseCSVLine(line) {
  const result = []
  let current = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') { current += '"'; i++ }
      else { inQuotes = !inQuotes }
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim())
      current = ''
    } else {
      current += char
    }
  }
  result.push(current.trim())
  return result
}

function toCSV(data) {
  if (!Array.isArray(data) || !data.length) return ''
  const keys = Object.keys(data[0])
  const escape = (val) => {
    const str = val === null || val === undefined ? '' : String(val)
    if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
      return '"' + str.replace(/"/g, '""') + '"'
    }
    return str
  }
  return [keys.join(','), ...data.map(row => keys.map(k => escape(row[k])).join(','))].join('\n')
}

function process() {
  if (!source.value) return
  const startedAt = performance.now()
  const s = source.value.trim()
  let output = ''
  try {
    if (s.startsWith('[') || s.startsWith('{')) {
      const data = JSON.parse(s)
      const arr = Array.isArray(data) ? data : [data]
      if (!arr.length) throw new Error('JSON 数组为空')
      output = toCSV(arr)
    } else {
      const arr = parseCSV(s)
      output = JSON.stringify(arr, null, 2)
    }
    usage.record({ durationMs: performance.now() - startedAt, meta: { dir: s.startsWith('[') || s.startsWith('{') ? 'json-to-csv' : 'csv-to-json' } })
  } catch (e) {
    output = `错误: ${e.message}`
    usage.record({ ok: false, errorCode: 'SHEET_PARSE_FAILED', durationMs: performance.now() - startedAt })
  }
  result.value = output
  copyState.value = 'idle'
}

function clear() { source.value = ''; result.value = ''; copyState.value = 'idle' }
async function copy() { if (!result.value) return; try { await navigator.clipboard.writeText(result.value); copyState.value = 'ok' } catch (e) { copyState.value = 'fail' } }
</script>
