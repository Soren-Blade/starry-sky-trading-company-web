<template>
  <ToolPageShell
    :title="PAGE.title"
    :eyebrow="PAGE.eyebrow"
    :description="PAGE.description"
    :icon="PAGE.icon"
    :requires-card="PAGE.requiresCard"
  >
    <section class="ui-card tool-panel">
      <h2 class="tool-panel-title">
        <AppIcon name="cpu" aria-hidden="true" />
        <span>{{ PAGE.inputTitle }}</span>
      </h2>
      <div class="u-field">
        <label class="u-field-label" for="enc-source">{{ PAGE.sourceLabel }}</label>
        <textarea
          id="enc-source"
          v-model="source"
          class="u-input tool-textarea"
          :placeholder="PAGE.sourcePlaceholder"
          spellcheck="false"
        ></textarea>
      </div>
      <div class="tool-form">
        <div class="u-field">
          <label class="u-field-label" for="enc-from">{{ PAGE.fromLabel }}</label>
          <SelectField id="enc-from" v-model="fromEncoding" :options="PAGE.encodingOptions" />
        </div>
        <div class="u-field">
          <label class="u-field-label" for="enc-to">{{ PAGE.toLabel }}</label>
          <SelectField id="enc-to" v-model="toEncoding" :options="PAGE.encodingOptions" />
        </div>
        <button type="button" class="u-btn-secondary" @click="swapEncoding">
          <AppIcon name="arrow-left-right" />
          {{ PAGE.swap }}
        </button>
      </div>
      <div class="tool-actions">
        <button type="button" class="u-btn-primary" :disabled="!canSubmit" @click="start">
          {{ PAGE.submit }}
        </button>
        <button type="button" class="u-btn-secondary" :disabled="!source" @click="clear">
          {{ PAGE.reset }}
        </button>
      </div>
    </section>

    <section class="ui-card tool-panel">
      <h2 class="tool-panel-title">
        <AppIcon name="check-circle" aria-hidden="true" />
        <span>{{ PAGE.resultTitle }}</span>
      </h2>
      <ToolResultPane :state="jobState" :title="PAGE.emptyTitle" :description="PAGE.emptyDesc" :error="jobError" icon="cpu">
        <template v-if="result">
          <pre class="tool-preview">{{ result.text }}</pre>
          <div class="tool-result-meta">
            <span class="tool-result-meta-item">原文: <span class="tool-result-value">{{ result.originalBytes }} 字节</span></span>
            <span class="tool-result-meta-item">结果: <span class="tool-result-value">{{ result.resultBytes }} 字节</span></span>
          </div>
        </template>
        <template #actions>
          <button type="button" class="u-btn-primary" :disabled="!result" @click="copyResult">{{ copyLabel }}</button>
        </template>
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
import SelectField from '@/components/SelectField.vue'
import ToolPageShell from '@/components/ToolPageShell.vue'
import ToolResultPane from '@/components/ToolResultPane.vue'
import { TOOL_PAGE, TOOL_PAGES, TOOL_RESULT } from '@/constants/index.js'
import { useToolJob } from '@/hooks/useToolJob/index.js'
import { useToolUsage } from '@/hooks/useToolUsage/index.js'

const PAGE = TOOL_PAGES['/text/encoding-kit']
const usage = useToolUsage('/text/encoding-kit')
const source = ref('')
const fromEncoding = ref('UTF-8')
const toEncoding = ref('Base64')
const copyState = ref('idle')

const { state: jobState, result, error: jobError, run, reset: resetJob } = useToolJob({ run: convertEncoding })
const busy = computed(() => jobState.value === 'loading')
const canSubmit = computed(() => Boolean(source.value.trim()) && !busy.value)
const copyLabel = computed(() => copyState.value === 'ok' ? TOOL_RESULT.copied : copyState.value === 'fail' ? TOOL_RESULT.copyFailed : TOOL_RESULT.copy)

function swapEncoding() {
  const temp = fromEncoding.value
  fromEncoding.value = toEncoding.value
  toEncoding.value = temp
}

async function convertEncoding() {
  const startedAt = performance.now()
  const text = source.value
  if (!text.trim()) throw new Error(PAGE.invalidEmpty)
  await new Promise((resolve) => { setTimeout(resolve, 0) })

  let output = text
  // UTF-8 ↔ Base64
  if (fromEncoding.value === 'UTF-8' && toEncoding.value === 'Base64') {
    output = btoa(unescape(encodeURIComponent(text)))
  } else if (fromEncoding.value === 'Base64' && toEncoding.value === 'UTF-8') {
    output = decodeURIComponent(escape(atob(text)))
  } else if (fromEncoding.value === 'UTF-8' && toEncoding.value === 'URL') {
    output = encodeURIComponent(text)
  } else if (fromEncoding.value === 'URL' && toEncoding.value === 'UTF-8') {
    output = decodeURIComponent(text)
  } else if (fromEncoding.value === 'UTF-8' && toEncoding.value === 'Hex') {
    output = Array.from(new TextEncoder().encode(text)).map(b => b.toString(16).padStart(2, '0')).join(' ')
  } else if (fromEncoding.value === 'Hex' && toEncoding.value === 'UTF-8') {
    const bytes = text.replace(/\s/g, '').match(/.{2}/g) || []
    output = new TextDecoder().decode(new Uint8Array(bytes.map(b => parseInt(b, 16))))
  } else {
    output = `[${fromEncoding.value} → ${toEncoding.value}] 转换示意:\n${text}`
  }

  usage.record({ durationMs: performance.now() - startedAt, meta: { from: fromEncoding.value, to: toEncoding.value } })

  return {
    text: output,
    originalBytes: new Blob([text]).size,
    resultBytes: new Blob([output]).size
  }
}

function start() { copyState.value = 'idle'; run() }
function clear() { source.value = ''; copyState.value = 'idle'; resetJob() }
async function copyResult() {
  const text = result.value?.text
  if (!text) return
  try { await navigator.clipboard.writeText(text); copyState.value = 'ok' } catch (e) { copyState.value = 'fail' }
}
</script>
