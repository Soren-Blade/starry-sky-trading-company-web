<template>
  <ToolPageShell :title="PAGE.title" :eyebrow="PAGE.eyebrow" :description="PAGE.description" :icon="PAGE.icon" :requires-card="PAGE.requiresCard">
    <section class="ui-card tool-panel">
      <h2 class="tool-panel-title"><AppIcon name="code" aria-hidden="true" /><span>{{ PAGE.inputTitle }}</span></h2>
      <div class="u-field">
        <label class="u-field-label" for="code-source">{{ PAGE.sourceLabel }}</label>
        <textarea id="code-source" v-model="source" class="u-input tool-textarea" :placeholder="PAGE.sourcePlaceholder" spellcheck="false"></textarea>
      </div>
      <div class="code-kit-row">
        <div class="u-field">
          <label class="u-field-label">语言</label>
          <SelectField v-model="language" :options="LANG_OPTIONS" aria-label="代码语言" />
        </div>
        <div class="u-field">
          <span class="u-field-label">操作</span>
          <ToolModeTabs v-model="operation" :options="operations" label="代码处理操作" />
        </div>
      </div>
      <div class="tool-actions">
        <button type="button" class="u-btn-primary" :disabled="!source.trim()" @click="process">{{ PAGE.submit }}</button>
        <button type="button" class="u-btn-secondary" :disabled="!source" @click="clear">{{ PAGE.reset }}</button>
      </div>
    </section>

    <section class="ui-card tool-panel">
      <h2 class="tool-panel-title"><AppIcon name="check-circle" aria-hidden="true" /><span>{{ PAGE.resultTitle }}</span></h2>
      <ToolResultPane :state="result ? 'success' : 'empty'" :title="PAGE.emptyTitle" :description="PAGE.emptyDesc" icon="code">
        <template v-if="result">
          <ToolCodeBlock :code="result.text" :lang="result.lang" />
          <div v-if="result.meta" class="tool-result-meta">
            <span v-for="(v, k) in result.meta" :key="k" class="tool-result-meta-item">{{ k }}: <span class="tool-result-value">{{ v }}</span></span>
          </div>
        </template>
      </ToolResultPane>
    </section>

    <template #aside>
      <section class="ui-card tool-aside-card">
        <h3 class="tool-aside-title"><AppIcon name="info" /> {{ TOOL_PAGE.usageTitle }}</h3>
        <ul class="tool-aside-list"><li v-for="item in PAGE.asideItems" :key="item">{{ item }}</li></ul>
      </section>
      <section class="ui-card tool-aside-card">
        <h3 class="tool-aside-title"><AppIcon name="alert-triangle" /> 能力边界</h3>
        <p class="tool-aside-note"><span>JSON 走 JSON.parse/stringify，能真正校验语法；HTML 按标签切分做缩进，<code>&lt;script&gt;/&lt;style&gt;/&lt;pre&gt;</code> 内部原样保留；CSS 逐字符扫描，字符串与注释内的括号不会被误当结构。都不做变量重命名、不合并规则。</span></p>
      </section>
    </template>
  </ToolPageShell>
</template>

<script setup>
import { ref } from 'vue'
import AppIcon from '@/components/AppIcon.vue'
import SelectField from '@/components/SelectField.vue'
import ToolCodeBlock from '@/components/ToolCodeBlock.vue'
import ToolModeTabs from '@/components/ToolModeTabs.vue'
import ToolPageShell from '@/components/ToolPageShell.vue'
import ToolResultPane from '@/components/ToolResultPane.vue'
import { TOOL_PAGE, TOOL_PAGES } from '@/constants/index.js'
import { useToolUsage } from '@/hooks/useToolUsage/index.js'

const PAGE = TOOL_PAGES['/code/kit']
const usage = useToolUsage('/code/kit')
const source = ref('')
const language = ref('auto')
const operation = ref('format')
const result = ref(null)

const LANG_OPTIONS = [
  { label: '自动识别', value: 'auto' },
  { label: 'JSON', value: 'json' },
  { label: 'HTML', value: 'html' },
  { label: 'CSS', value: 'css' },
]
const operations = [
  { label: '格式化', value: 'format' },
  { label: '压缩', value: 'minify' },
  { label: '转义', value: 'escape' },
  { label: '反转义', value: 'unescape' },
]

const INDENT = '  '
const ESCAPES = { n: '\n', r: '\r', t: '\t', b: '\b', f: '\f', '"': '"', "'": "'", '\\': '\\', '/': '/' }

function detectLanguage(text) {
  const trimmed = text.trim()
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    try { JSON.parse(trimmed); return 'json' } catch { /* 不是合法 JSON，继续按标签判断 */ }
  }
  return trimmed.startsWith('<') ? 'html' : 'css'
}

function formatJson(text) { return JSON.stringify(JSON.parse(text), null, 2) }
function minifyJson(text) { return JSON.stringify(JSON.parse(text)) }
function escapeText(text) { return JSON.stringify(text).slice(1, -1) }
function unescapeText(text) {
  return text.replace(/\\(u[0-9a-fA-F]{4}|x[0-9a-fA-F]{2}|.)/g, (match, code) => {
    if (code[0] === 'u' || code[0] === 'x') return String.fromCharCode(Number.parseInt(code.slice(1), 16))
    return ESCAPES[code] ?? match
  })
}

// script/style/pre 内部可能含 <、>、连续空白，先换成占位符，处理完再原样还原
// （占位符用不可能出现在 HTML 里的 @RAWn@ 形式，避免与源码内容撞车）
const RAW_BLOCK = /<(script|style|pre|textarea)\b[^>]*>[\s\S]*?<\/\1>/gi
function protectRaw(text) {
  const raw = []
  const source = text.replace(RAW_BLOCK, (block) => { raw.push(block); return `@RAW${raw.length - 1}@` })
  return { source, restore: (output) => output.replace(/@RAW(\d+)@/g, (_, index) => raw[Number(index)]) }
}

function formatHtml(text) {
  const { source, restore } = protectRaw(text)
  const tokens = source.replace(/>\s+</g, '><').split(/(<[^>]*>)/g).map((part) => part.trim()).filter(Boolean)
  const lines = []
  let depth = 0
  for (const token of tokens) {
    if (!token.startsWith('<')) { lines.push(INDENT.repeat(depth) + token); continue }
    const closing = token.startsWith('</')
    const standalone = /\/>$/.test(token) || token.startsWith('<!') || /^<(area|base|br|col|embed|hr|img|input|link|meta|param|source|track|wbr)\b/i.test(token)
    if (closing) depth = Math.max(0, depth - 1)
    lines.push(INDENT.repeat(depth) + token)
    if (!closing && !standalone) depth += 1
  }
  return restore(lines.join('\n'))
}

function minifyHtml(text) {
  const { source, restore } = protectRaw(text)
  return restore(source.replace(/<!--[\s\S]*?-->/g, '').replace(/>\s+</g, '><').replace(/\s{2,}/g, ' ').trim())
}

// 逐字符扫描 CSS：注释整段丢掉，引号内的空白与标点原样保留
function minifyCss(text) {
  let output = ''
  let quote = ''
  let inComment = false
  for (let i = 0; i < text.length; i += 1) {
    const char = text[i]
    const next = text[i + 1]
    if (inComment) { if (char === '*' && next === '/') { inComment = false; i += 1 } continue }
    if (quote) { output += char; if (char === quote) quote = ''; continue }
    if (char === '/' && next === '*') { inComment = true; i += 1; continue }
    if (char === '"' || char === "'") { quote = char; output += char; continue }
    if ('{};:,'.includes(char)) { output = output.replace(/\s+$/, '') + char; continue }
    if (/\s/.test(char)) { if (output && !/\s$/.test(output) && !'{};:,'.includes(output[output.length - 1])) output += ' '; continue }
    output += char
  }
  return output.trim()
}

function formatCss(text) {
  let output = ''
  let depth = 0
  let quote = ''
  for (const char of minifyCss(text)) {
    if (quote) { output += char; if (char === quote) quote = ''; continue }
    if (char === '"' || char === "'") { quote = char; output += char; continue }
    if (char === '{') { depth += 1; output += ` {\n${INDENT.repeat(depth)}`; continue }
    if (char === '}') { depth = Math.max(0, depth - 1); output = `${output.replace(/\s+$/, '')}\n${INDENT.repeat(depth)}}\n`; continue }
    if (char === ';') { output += `;\n${INDENT.repeat(depth)}`; continue }
    output += char
  }
  return output.replace(/\n{2,}/g, '\n').trim()
}

const FORMATTERS = {
  json: { format: formatJson, minify: minifyJson },
  html: { format: formatHtml, minify: minifyHtml },
  css: { format: formatCss, minify: minifyCss },
}

function applyOperation(lang, op, text) {
  if (op === 'escape') return escapeText(text)
  if (op === 'unescape') return unescapeText(text)
  return FORMATTERS[lang][op](text)
}

function process() {
  const startedAt = performance.now()
  const text = source.value
  const lang = language.value === 'auto' ? detectLanguage(text) : language.value
  try {
    const output = applyOperation(lang, operation.value, text)
    const saved = text.length - output.length
    result.value = {
      text: output,
      lang,
      meta: { 语言: lang.toUpperCase(), 字符数: `${text.length} → ${output.length}`, 变化: `${saved >= 0 ? '减少' : '增加'} ${Math.abs(saved)}` },
    }
    usage.record({ durationMs: Math.round(performance.now() - startedAt), meta: { operation: operation.value, language: lang } })
  } catch (error) {
    result.value = { text: `处理失败：${error.message}`, lang, meta: { 语言: lang.toUpperCase() } }
    usage.record({ ok: false, errorCode: lang === 'json' ? 'CODE_INVALID_JSON' : 'CODE_PROCESS_FAILED', durationMs: Math.round(performance.now() - startedAt) })
  }
}

function clear() { source.value = ''; result.value = null }
</script>

<style scoped>
.code-kit-row { display: grid; grid-template-columns: minmax(160px, 220px) 1fr; gap: calc(var(--space-unit) * 2); align-items: start; }
@media (max-width: 767px) {
  .code-kit-row { grid-template-columns: 1fr; }
}
</style>
