<template>
  <ToolPageShell :title="PAGE.title" :eyebrow="PAGE.eyebrow" :description="PAGE.description" :icon="PAGE.icon" :requires-card="PAGE.requiresCard">
    <section class="ui-card tool-panel">
      <h2 class="tool-panel-title"><AppIcon name="shuffle" aria-hidden="true" /><span>{{ PAGE.inputTitle }}</span></h2>
      <div class="u-field">
        <label class="u-field-label" for="data-source">{{ PAGE.sourceLabel }}</label>
        <textarea id="data-source" v-model="source" class="u-input tool-textarea" :placeholder="PAGE.sourcePlaceholder" spellcheck="false"></textarea>
      </div>
      <div class="tool-form">
        <div class="u-field">
          <label class="u-field-label">{{ PAGE.modeLabel }}</label>
          <SelectField v-model="mode" :options="PAGE.modeOptions" />
        </div>
      </div>
      <div class="tool-actions">
        <button type="button" class="u-btn-primary" :disabled="!source" @click="convert">{{ PAGE.submit }}</button>
        <button type="button" class="u-btn-secondary" :disabled="!source" @click="clear">{{ PAGE.reset }}</button>
      </div>
    </section>

    <section class="ui-card tool-panel">
      <h2 class="tool-panel-title"><AppIcon name="check-circle" aria-hidden="true" /><span>{{ PAGE.resultTitle }}</span></h2>
      <ToolResultPane :state="result ? 'success' : 'empty'" :title="PAGE.emptyTitle" :description="PAGE.emptyDesc" icon="shuffle">
        <template v-if="result">
          <pre class="tool-preview">{{ result.text }}</pre>
        </template>
        <template #actions>
          <button type="button" class="u-btn-primary" :disabled="!result" @click="copy">{{ copyLabel }}</button>
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
import { computed, ref } from 'vue'
import AppIcon from '@/components/AppIcon.vue'
import SelectField from '@/components/SelectField.vue'
import ToolPageShell from '@/components/ToolPageShell.vue'
import ToolResultPane from '@/components/ToolResultPane.vue'
import { TOOL_PAGE, TOOL_PAGES, TOOL_RESULT } from '@/constants/index.js'

const PAGE = TOOL_PAGES['/data/format']
const source = ref('')
const mode = ref('json-pretty')
const result = ref(null)
const copyState = ref('idle')

const copyLabel = computed(() => copyState.value === 'ok' ? TOOL_RESULT.copied : copyState.value === 'fail' ? TOOL_RESULT.copyFailed : TOOL_RESULT.copy)

function convert() {
  if (!source.value) return
  let output = source.value
  try {
    switch (mode.value) {
      case 'json-pretty':
        output = JSON.stringify(JSON.parse(source.value), null, 2)
        break
      case 'json-minify':
        output = JSON.stringify(JSON.parse(source.value))
        break
      case 'json-to-csv':
        { const arr = JSON.parse(source.value); if (!Array.isArray(arr) || !arr.length) throw new Error('需要 JSON 数组'); const keys = Object.keys(arr[0]); output = [keys.join(','), ...arr.map(r => keys.map(k => JSON.stringify(r[k])).join(','))].join('\n') }
        break
      case 'csv-to-json':
        { const lines = source.value.trim().split('\n'); const headers = lines[0].split(','); output = JSON.stringify(lines.slice(1).map(l => { const vals = l.split(','); return Object.fromEntries(headers.map((h, i) => [h.trim(), vals[i]?.trim()])); }), null, 2) }
        break
    }
  } catch (e) { output = `错误: ${e.message}` }
  result.value = { text: output }
  copyState.value = 'idle'
}

function clear() { source.value = ''; result.value = null; copyState.value = 'idle' }
async function copy() {
  if (!result.value) return
  try { await navigator.clipboard.writeText(result.value.text); copyState.value = 'ok' } catch (e) { copyState.value = 'fail' }
}
</script>
