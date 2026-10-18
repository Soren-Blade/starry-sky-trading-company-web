<template>
  <ToolPageShell :title="PAGE.title" :eyebrow="PAGE.eyebrow" :description="PAGE.description" :icon="PAGE.icon" :requires-card="PAGE.requiresCard">
    <section class="ui-card tool-panel">
      <h2 class="tool-panel-title"><AppIcon name="code" aria-hidden="true" /><span>{{ PAGE.inputTitle }}</span></h2>
      <div class="u-field">
        <label class="u-field-label" for="code-source">{{ PAGE.sourceLabel }}</label>
        <textarea id="code-source" v-model="source" class="u-input tool-textarea" :placeholder="PAGE.sourcePlaceholder" spellcheck="false"></textarea>
      </div>
      <div class="tool-form">
        <div class="u-field">
          <label class="u-field-label">操作</label>
          <div class="tool-actions">
            <button v-for="op in operations" :key="op.value" type="button" class="u-btn-secondary" :class="{ 'u-btn-primary': operation === op.value }" @click="operation = op.value">{{ op.label }}</button>
          </div>
        </div>
      </div>
      <div class="tool-actions">
        <button type="button" class="u-btn-primary" :disabled="!source" @click="process">{{ PAGE.submit }}</button>
        <button type="button" class="u-btn-secondary" :disabled="!source" @click="clear">{{ PAGE.reset }}</button>
      </div>
    </section>

    <section class="ui-card tool-panel">
      <h2 class="tool-panel-title"><AppIcon name="check-circle" aria-hidden="true" /><span>{{ PAGE.resultTitle }}</span></h2>
      <ToolResultPane :state="result ? 'success' : 'empty'" :title="PAGE.emptyTitle" :description="PAGE.emptyDesc" icon="code">
        <template v-if="result">
          <pre class="tool-preview">{{ result.text }}</pre>
          <div v-if="result.meta" class="tool-result-meta">
            <span v-for="(v, k) in result.meta" :key="k" class="tool-result-meta-item">{{ k }}: <span class="tool-result-value">{{ v }}</span></span>
          </div>
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
import ToolPageShell from '@/components/ToolPageShell.vue'
import ToolResultPane from '@/components/ToolResultPane.vue'
import { TOOL_PAGE, TOOL_PAGES, TOOL_RESULT } from '@/constants/index.js'
import { useToolUsage } from '@/hooks/useToolUsage/index.js'

const PAGE = TOOL_PAGES['/code/kit']
const usage = useToolUsage('/code/kit')
const source = ref('')
const operation = ref('format')
const result = ref(null)
const copyState = ref('idle')

const operations = [
  { label: '格式化', value: 'format' },
  { label: '压缩', value: 'minify' },
  { label: '转义', value: 'escape' },
  { label: '反转义', value: 'unescape' },
]

const copyLabel = computed(() => copyState.value === 'ok' ? TOOL_RESULT.copied : copyState.value === 'fail' ? TOOL_RESULT.copyFailed : TOOL_RESULT.copy)

function process() {
  if (!source.value) return
  const startedAt = performance.now()
  const text = source.value
  let output = text
  let meta = {}

  switch (operation.value) {
    case 'format':
      try {
        const obj = JSON.parse(text)
        output = JSON.stringify(obj, null, 2)
        meta = { 类型: 'JSON 格式化' }
      } catch {
        output = text.split('\n').map(l => l.trim()).join('\n')
        meta = { 类型: '简单格式化' }
      }
      break
    case 'minify':
      output = text.replace(/\s+/g, ' ').trim()
      meta = { 压缩率: `${Math.round((1 - output.length / text.length) * 100)}%` }
      break
    case 'escape':
      output = JSON.stringify(text).slice(1, -1)
      meta = { 类型: '字符串转义' }
      break
    case 'unescape':
      output = text.replace(/\\n/g, '\n').replace(/\\t/g, '\t').replace(/\\"/g, '"').replace(/\\\\/g, '\\')
      meta = { 类型: '字符串反转义' }
      break
  }

  result.value = { text: output, meta }
  copyState.value = 'idle'
  usage.record({ durationMs: performance.now() - startedAt, meta: { operation: operation.value } })
}

function clear() { source.value = ''; result.value = null; copyState.value = 'idle' }
async function copy() {
  if (!result.value) return
  try { await navigator.clipboard.writeText(result.value.text); copyState.value = 'ok' } catch (e) { copyState.value = 'fail' }
}
</script>
