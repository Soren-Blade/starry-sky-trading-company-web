<template>
  <ToolPageShell :title="PAGE.title" :eyebrow="PAGE.eyebrow" :description="PAGE.description" :icon="PAGE.icon" :requires-card="PAGE.requiresCard">
    <section class="ui-card tool-panel">
      <h2 class="tool-panel-title"><AppIcon name="shuffle" aria-hidden="true" /><span>{{ PAGE.inputTitle }}</span></h2>
      <div class="u-field">
        <label class="u-field-label" for="data-source">{{ PAGE.sourceLabel }}</label>
        <textarea id="data-source" v-model="source" class="u-input tool-textarea" :placeholder="PAGE.sourcePlaceholder" spellcheck="false" />
      </div>
      <div class="tool-form">
        <div class="u-field">
          <label class="u-field-label" for="data-mode">{{ PAGE.modeLabel }}</label>
          <SelectField id="data-mode" v-model="mode" :options="modeOptions" />
        </div>
      </div>
      <p class="u-field-hint">YAML 由 js-yaml 解析/生成；CSV 使用 RFC 4180 风格解析器（支持双引号包裹、逗号、换行和 "" 转义）；键值对每行一条，格式为 key=value 或 key: value。</p>
      <div class="tool-actions">
        <button type="button" class="u-btn-primary" :disabled="!source.trim() || busy" @click="convert">{{ busy ? '转换中…' : PAGE.submit }}</button>
        <button type="button" class="u-btn-secondary" :disabled="!source" @click="clear">{{ PAGE.reset }}</button>
      </div>
    </section>

    <section class="ui-card tool-panel">
      <h2 class="tool-panel-title"><AppIcon name="check-circle" aria-hidden="true" /><span>{{ PAGE.resultTitle }}</span></h2>
      <ToolResultPane :state="result ? 'success' : error ? 'error' : 'empty'" :title="PAGE.emptyTitle" :description="PAGE.emptyDesc" :error="error" icon="shuffle">
        <template v-if="result">
          <ToolCodeBlock :code="result.text" :lang="result.lang" />
          <p class="tool-result-note">输出 {{ result.length }} 个字符</p>
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
import { ref } from 'vue'
import AppIcon from '@/components/AppIcon.vue'
import SelectField from '@/components/SelectField.vue'
import ToolCodeBlock from '@/components/ToolCodeBlock.vue'
import ToolPageShell from '@/components/ToolPageShell.vue'
import ToolResultPane from '@/components/ToolResultPane.vue'
import { TOOL_PAGE, TOOL_PAGES } from '@/constants/index.js'
import { useToolUsage } from '@/hooks/useToolUsage/index.js'

const PAGE = TOOL_PAGES['/data/format']
const usage = useToolUsage('/data/format')
const source = ref('')
const mode = ref('json-pretty')
const result = ref(null)
const error = ref('')
const busy = ref(false)
const modeOptions = [
  { label: 'JSON 美化', value: 'json-pretty' },
  { label: 'JSON 压缩', value: 'json-minify' },
  { label: 'JSON 字符串转义', value: 'json-escape' },
  { label: 'JSON → YAML', value: 'json-to-yaml' },
  { label: 'YAML → JSON', value: 'yaml-to-json' },
  { label: 'JSON → CSV', value: 'json-to-csv' },
  { label: 'CSV → JSON', value: 'csv-to-json' },
  { label: 'JSON → 键值对', value: 'json-to-kv' },
  { label: '键值对 → JSON', value: 'kv-to-json' },
]
// 结果块左上角的语言：yaml / csv 模式只有两种，其余（美化、压缩、转义、键值对）按输出形态归类
const LANG_BY_MODE = { 'json-to-yaml': 'yaml', 'json-to-csv': 'csv' }
const langOf = (m) => LANG_BY_MODE[m] || (m.includes('escape') || m.includes('to-kv') ? 'text' : 'json')

function fail(message, code) {
  const e = new Error(message)
  e.code = code
  return e
}

function lineOf(text, position) {
  return text.slice(0, position).split('\n').length
}

function jsonParse(text) {
  try { return JSON.parse(text) } catch (e) {
    const match = /position\s+(\d+)/i.exec(e.message)
    const where = match ? `第 ${lineOf(text, Number(match[1]))} 行附近` : '输入中'
    throw fail(`${where}的 JSON 不合法：${e.message}。请检查引号、逗号、括号是否配对。`, 'DATA_FORMAT_INVALID_JSON')
  }
}

function yamlError(e) {
  const line = typeof e.mark?.line === 'number' ? e.mark.line + 1 : null
  return fail(`${line ? `第 ${line} 行：` : ''}${e.reason || e.message}。YAML 对缩进敏感，请检查冒号后的空格和层级缩进。`, 'DATA_FORMAT_INVALID_YAML')
}

function parseCsv(text) {
  const rows = []
  let row = []
  let field = ''
  let quoted = false
  for (let i = 0; i < text.length; i++) {
    const char = text[i]
    if (quoted) {
      if (char === '"' && text[i + 1] === '"') { field += '"'; i++ }
      else if (char === '"') quoted = false
      else field += char
    } else if (char === '"') quoted = true
    else if (char === ',') { row.push(field); field = '' }
    else if (char === '\n') { row.push(field); rows.push(row); row = []; field = '' }
    else if (char !== '\r') field += char
  }
  if (quoted) throw fail('CSV 引号没有闭合：某个双引号字段缺少结尾的 "。', 'DATA_FORMAT_INVALID_CSV')
  if (field || row.length) { row.push(field); rows.push(row) }
  return rows.filter((r) => r.some((cell) => cell !== ''))
}

function csvCell(value) {
  const text = value == null ? '' : typeof value === 'object' ? JSON.stringify(value) : String(value)
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}

function toCsv(value) {
  if (!Array.isArray(value) || !value.length) throw fail('JSON → CSV 需要非空数组：例如 [{"name":"张三","age":18}]。', 'DATA_FORMAT_CSV_SHAPE')
  if (Array.isArray(value[0])) return value.map((row) => row.map(csvCell).join(',')).join('\n')
  if (typeof value[0] !== 'object' || value[0] === null) throw fail('JSON 数组的元素必须是对象或数组，才能转成 CSV。', 'DATA_FORMAT_CSV_SHAPE')
  const headers = [...new Set(value.flatMap((item) => Object.keys(item)))]
  return [headers.map(csvCell).join(','), ...value.map((item) => headers.map((key) => csvCell(item[key])).join(','))].join('\n')
}

function fromCsv(text) {
  const rows = parseCsv(text)
  if (rows.length < 2) throw fail('CSV → JSON 至少需要表头行和一行数据，当前行数不足。', 'DATA_FORMAT_CSV_SHAPE')
  const headers = rows[0].map((header) => header.trim())
  if (headers.some((header) => !header)) throw fail('CSV 表头存在空列名，请先补全列名。', 'DATA_FORMAT_CSV_SHAPE')
  return rows.slice(1).map((row, index) => {
    if (row.length > headers.length) throw fail(`CSV 第 ${index + 2} 行有 ${row.length} 列，多于表头的 ${headers.length} 列，无法对应。`, 'DATA_FORMAT_CSV_SHAPE')
    return Object.fromEntries(headers.map((header, i) => [header, row[i] ?? '']))
  })
}

function toKv(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw fail('JSON → 键值对需要 JSON 对象，不支持数组或基本类型。', 'DATA_FORMAT_KV_SHAPE')
  return Object.entries(value).map(([key, val]) => `${key}=${typeof val === 'object' ? JSON.stringify(val) : String(val)}`).join('\n')
}

function fromKv(text) {
  // 名字与下面 convert() 里的 `output` 区分开：两个局部变量同名会让
  // 「const 被重新赋值」的静态检查误判（它按名字跨作用域匹配）。
  const kv = {}
  text.split('\n').forEach((line, index) => {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) return
    const match = /^([^=:]+?)\s*[=:]\s*(.*)$/.exec(trimmed)
    if (!match) throw fail(`第 ${index + 1} 行不是 key=value 或 key: value 格式：${trimmed}`, 'DATA_FORMAT_KV_INVALID')
    if (Object.hasOwn(kv, match[1])) throw fail(`第 ${index + 1} 行的键「${match[1]}」重复，请合并后再转换。`, 'DATA_FORMAT_KV_DUPLICATE')
    kv[match[1]] = match[2]
  })
  return kv
}

async function convert() {
  const startedAt = performance.now()
  busy.value = true
  error.value = ''
  result.value = null
  try {
    let output
    if (mode.value === 'json-escape') output = JSON.stringify(source.value)
    else if (mode.value === 'json-to-yaml' || mode.value === 'yaml-to-json') {
      const mod = await import('js-yaml')
      const yaml = mod.default || mod
      if (mode.value === 'json-to-yaml') output = yaml.dump(jsonParse(source.value), { lineWidth: -1, noRefs: true })
      else {
        let value
        try { value = yaml.load(source.value) } catch (e) { throw yamlError(e) }
        output = JSON.stringify(value ?? null, null, 2)
      }
    } else {
      const value = mode.value === 'csv-to-json' ? fromCsv(source.value) : mode.value === 'kv-to-json' ? fromKv(source.value) : jsonParse(source.value)
      if (mode.value === 'json-pretty') output = JSON.stringify(value, null, 2)
      else if (mode.value === 'json-minify') output = JSON.stringify(value)
      else if (mode.value === 'json-to-csv') output = toCsv(value)
      else if (mode.value === 'csv-to-json') output = JSON.stringify(value, null, 2)
      else if (mode.value === 'json-to-kv') output = toKv(value)
      else if (mode.value === 'kv-to-json') output = JSON.stringify(value, null, 2)
    }
    result.value = { text: output, length: output.length, lang: langOf(mode.value) }
    usage.record({ durationMs: Math.round(performance.now() - startedAt), meta: { mode: mode.value, length: source.value.length } })
  } catch (e) {
    error.value = `转换失败：${e.message}`
    usage.record({ ok: false, errorCode: e.code || 'DATA_FORMAT_FAILED', durationMs: Math.round(performance.now() - startedAt) })
  } finally {
    busy.value = false
  }
}

function clear() { source.value = ''; result.value = null; error.value = '' }
</script>
