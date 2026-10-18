<template>
  <ToolPageShell :title="PAGE.title" :eyebrow="PAGE.eyebrow" :description="PAGE.description" :icon="PAGE.icon" :requires-card="PAGE.requiresCard">
    <section class="ui-card tool-panel">
      <h2 class="tool-panel-title"><AppIcon name="database" aria-hidden="true" /><span>SQL 格式化</span></h2>
      <div class="u-field">
        <label class="u-field-label" for="sql-source">SQL 语句</label>
        <textarea id="sql-source" v-model="source" class="u-input tool-textarea" placeholder="输入 SQL..." spellcheck="false" rows="8"></textarea>
      </div>
      <div class="tool-form">
        <div class="u-field">
          <label class="u-field-label" for="sql-dialect">方言</label>
          <SelectField id="sql-dialect" v-model="dialect" :options="dialectOptions" />
        </div>
        <div class="u-field">
          <label class="u-field-label" for="sql-case">关键字大小写</label>
          <SelectField id="sql-case" v-model="keywordCase" :options="caseOptions" />
        </div>
      </div>
      <div class="tool-actions">
        <button type="button" class="u-btn-primary" :disabled="!source.trim() || busy" @click="formatSql">{{ busy ? '格式化中…' : '格式化' }}</button>
        <button type="button" class="u-btn-secondary" :disabled="!source.trim() || busy" @click="minify">压缩</button>
        <button type="button" class="u-btn-secondary" @click="clear">{{ PAGE.reset }}</button>
      </div>
      <p v-if="error" class="u-field-error" role="alert">{{ error }}</p>
    </section>

    <section v-if="result" class="ui-card tool-panel">
      <h2 class="tool-panel-title"><AppIcon name="check-circle" aria-hidden="true" /><span>{{ PAGE.resultTitle }}</span></h2>
      <ToolCodeBlock :code="result" lang="sql" />
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
import { ref } from 'vue'
import AppIcon from '@/components/AppIcon.vue'
import SelectField from '@/components/SelectField.vue'
import ToolCodeBlock from '@/components/ToolCodeBlock.vue'
import ToolPageShell from '@/components/ToolPageShell.vue'
import { TOOL_PAGE, TOOL_PAGES } from '@/constants/index.js'
import { useToolUsage } from '@/hooks/useToolUsage/index.js'

const PAGE = TOOL_PAGES['/data/sql']
const usage = useToolUsage('/data/sql')
const source = ref('')
const result = ref('')
const error = ref('')
const busy = ref(false)
const dialect = ref('sql')
const keywordCase = ref('upper')
const dialectOptions = [
  { label: '标准 SQL', value: 'sql' },
  { label: 'MySQL', value: 'mysql' },
  { label: 'PostgreSQL', value: 'postgresql' },
  { label: 'SQLite', value: 'sqlite' },
]
const caseOptions = [
  { label: '关键字大写', value: 'upper' },
  { label: '关键字小写', value: 'lower' },
  { label: '保留原大小写', value: 'preserve' },
]

function fail(message, code) {
  const e = new Error(message)
  e.code = code
  return e
}

async function formatSql() {
  if (!source.value.trim() || busy.value) return
  const startedAt = performance.now()
  busy.value = true
  error.value = ''
  try {
    const mod = await import('sql-formatter')
    const format = mod.format || mod.default?.format
    if (typeof format !== 'function') throw fail('sql-formatter 加载后没有暴露 format 函数，无法格式化。', 'SQL_FORMATTER_UNAVAILABLE')
    result.value = format(source.value, { language: dialect.value, keywordCase: keywordCase.value, tabWidth: 2 })
    usage.record({ durationMs: Math.round(performance.now() - startedAt), meta: { dialect: dialect.value, action: 'format' } })
  } catch (e) {
    error.value = `格式化失败：${e.message}。请检查方言是否选对，以及括号、引号是否闭合。`
    usage.record({ ok: false, errorCode: e.code || 'SQL_FORMAT_FAILED', durationMs: Math.round(performance.now() - startedAt) })
  } finally {
    busy.value = false
  }
}

function minify() {
  if (!source.value.trim()) return
  const startedAt = performance.now()
  try {
    // 先摘出字符串/标识符，避免压缩空白时误伤 'a  b' 里的空格。
    const literals = []
    const zero = String.fromCharCode(0)
    let text = source.value.replace(/'(?:''|[^'])*'|"(?:[^"]|"")*"|`(?:[^`]|``)*`/g, (match) => {
      literals.push(match)
      return `${zero}${literals.length - 1}${zero}`
    })
    text = text
      .replace(/\/\*[\s\S]*?\*\//g, ' ')
      .replace(/--[^\n]*/g, ' ')
      .replace(/\s+/g, ' ')
      .replace(/\s*([(),;=<>+\-*/])\s*/g, '$1')
      .trim()
    // 用 NUL 包住占位符，拆分时奇数位置就是字面量下标，避免正则误伤字符串内容。
    result.value = text.split(zero).map((part, index) => (index % 2 ? literals[Number(part)] : part)).join('')
    error.value = ''
    usage.record({ durationMs: Math.round(performance.now() - startedAt), meta: { dialect: dialect.value, action: 'minify' } })
  } catch (e) {
    error.value = `压缩失败：${e.message}`
    usage.record({ ok: false, errorCode: 'SQL_MINIFY_FAILED', durationMs: Math.round(performance.now() - startedAt) })
  }
}

function clear() { source.value = ''; result.value = ''; error.value = '' }
</script>
