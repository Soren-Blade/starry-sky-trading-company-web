<template>
  <ToolPageShell :title="PAGE.title" :eyebrow="PAGE.eyebrow" :description="PAGE.description" :icon="PAGE.icon" :requires-card="PAGE.requiresCard">
    <section class="ui-card tool-panel">
      <h2 class="tool-panel-title"><AppIcon name="highlighter" aria-hidden="true" /><span>{{ PAGE.inputTitle }}</span></h2>
      <div class="u-field">
        <label class="u-field-label" for="hl-source">{{ PAGE.sourceLabel }}</label>
        <textarea id="hl-source" v-model="source" class="u-input tool-textarea" :placeholder="PAGE.sourcePlaceholder" spellcheck="false"></textarea>
      </div>
      <div class="u-field">
        <label class="u-field-label" for="hl-language">语言</label>
        <SelectField id="hl-language" v-model="language" :options="languageOptions" aria-label="选择编程语言" />
      </div>
      <div class="tool-actions">
        <button type="button" class="u-btn-primary" :disabled="!source.trim() || busy" @click="process">{{ busy ? '高亮中…' : PAGE.submit }}</button>
        <button type="button" class="u-btn-secondary" @click="clear">{{ PAGE.reset }}</button>
      </div>
      <p v-if="error" class="u-field-error" role="alert">{{ error }}</p>
    </section>

    <section class="ui-card tool-panel">
      <h2 class="tool-panel-title"><AppIcon name="check-circle" aria-hidden="true" /><span>{{ PAGE.resultTitle }}</span></h2>
      <ToolResultPane :state="result ? 'success' : 'empty'" :title="PAGE.emptyTitle" :description="PAGE.emptyDesc" icon="highlighter">
        <template v-if="result"><ToolCodeBlock :code="result" lang="html" /></template>
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
import { ref } from 'vue'
import AppIcon from '@/components/AppIcon.vue'
import SelectField from '@/components/SelectField.vue'
import ToolCodeBlock from '@/components/ToolCodeBlock.vue'
import ToolPageShell from '@/components/ToolPageShell.vue'
import ToolResultPane from '@/components/ToolResultPane.vue'
import { TOOL_PAGE, TOOL_PAGES } from '@/constants/index.js'
import { useToolUsage } from '@/hooks/useToolUsage/index.js'

const PAGE = TOOL_PAGES['/code/highlight']
const usage = useToolUsage('/code/highlight')
const source = ref('')
const result = ref('')
const error = ref('')
const busy = ref(false)
const language = ref('javascript')
const registered = new Set()

const languageOptions = [
  { label: 'JavaScript', value: 'javascript' },
  { label: 'TypeScript', value: 'typescript' },
  { label: 'HTML', value: 'html' },
  { label: 'CSS', value: 'css' },
  { label: 'SQL', value: 'sql' },
  { label: 'Python', value: 'python' },
  { label: 'Java', value: 'java' },
  { label: 'Go', value: 'go' },
  { label: 'PHP', value: 'php' },
  { label: 'Ruby', value: 'ruby' },
  { label: 'Rust', value: 'rust' },
  { label: 'JSON', value: 'json' },
  { label: 'XML', value: 'xml' },
  { label: 'Markdown', value: 'markdown' },
  { label: 'Bash', value: 'bash' },
]

// 只登记任务要求支持的语言；HTML 复用 highlight.js 的 XML 语法（HTML 是 XML 的超集）。
const LOADERS = {
  javascript: () => import('highlight.js/lib/languages/javascript'),
  typescript: () => import('highlight.js/lib/languages/typescript'),
  python: () => import('highlight.js/lib/languages/python'),
  json: () => import('highlight.js/lib/languages/json'),
  bash: () => import('highlight.js/lib/languages/bash'),
  xml: () => import('highlight.js/lib/languages/xml'),
  css: () => import('highlight.js/lib/languages/css'),
  sql: () => import('highlight.js/lib/languages/sql'),
  markdown: () => import('highlight.js/lib/languages/markdown'),
  go: () => import('highlight.js/lib/languages/go'),
  java: () => import('highlight.js/lib/languages/java'),
  php: () => import('highlight.js/lib/languages/php'),
  ruby: () => import('highlight.js/lib/languages/ruby'),
  rust: () => import('highlight.js/lib/languages/rust'),
}

async function loadCore() {
  const mod = await import('highlight.js/lib/core')
  return mod.default || mod
}

async function process() {
  if (!source.value.trim() || busy.value) return
  const startedAt = performance.now()
  busy.value = true
  error.value = ''
  try {
    const hljs = await loadCore()
    const key = language.value === 'html' ? 'xml' : language.value
    if (!LOADERS[key]) throw new Error(`没有为 ${language.value} 注册 highlight.js 语言包。`)
    if (!registered.has(key)) {
      const mod = await LOADERS[key]()
      hljs.registerLanguage(key, mod.default || mod)
      registered.add(key)
    }
    result.value = hljs.highlight(source.value, { language: key, ignoreIllegals: true }).value
    usage.record({ durationMs: Math.round(performance.now() - startedAt), meta: { language: language.value } })
  } catch (e) {
    error.value = `高亮失败：${e.message}。请确认所选语言正确，或换用其他语言再试。`
    usage.record({ ok: false, errorCode: 'HIGHLIGHT_RENDER_FAILED', durationMs: Math.round(performance.now() - startedAt) })
  } finally {
    busy.value = false
  }
}

function clear() { source.value = ''; result.value = ''; error.value = '' }
</script>
