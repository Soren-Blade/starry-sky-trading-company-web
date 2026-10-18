<template>
  <ToolPageShell :title="PAGE.title" :eyebrow="PAGE.eyebrow" :description="PAGE.description" :icon="PAGE.icon" :requires-card="PAGE.requiresCard">
    <section class="ui-card tool-panel">
      <h2 class="tool-panel-title"><AppIcon name="highlighter" aria-hidden="true" /><span>{{ PAGE.inputTitle }}</span></h2>
      <div class="u-field">
        <label class="u-field-label">{{ PAGE.sourceLabel }}</label>
        <textarea v-model="source" class="u-input tool-textarea" :placeholder="PAGE.sourcePlaceholder" spellcheck="false"></textarea>
      </div>
      <div class="u-field">
        <label class="u-field-label">语言</label>
        <SelectField v-model="language" :options="languageOptions" aria-label="选择编程语言" />
      </div>
      <div class="tool-actions">
        <button type="button" class="u-btn-primary" :disabled="!source" @click="process">{{ PAGE.submit }}</button>
        <button type="button" class="u-btn-secondary" @click="clear">{{ PAGE.reset }}</button>
      </div>
    </section>

    <section class="ui-card tool-panel">
      <h2 class="tool-panel-title"><AppIcon name="check-circle" aria-hidden="true" /><span>{{ PAGE.resultTitle }}</span></h2>
      <ToolResultPane :state="result ? 'success' : 'empty'" :title="PAGE.emptyTitle" :description="PAGE.emptyDesc" icon="highlighter">
        <template v-if="result">
          <div class="hl-preview"><pre><code v-html="result"></code></pre></div>
        </template>
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
import SelectField from '@/components/SelectField.vue'
import ToolPageShell from '@/components/ToolPageShell.vue'
import ToolResultPane from '@/components/ToolResultPane.vue'
import { TOOL_PAGE, TOOL_PAGES, TOOL_RESULT } from '@/constants/index.js'

const PAGE = TOOL_PAGES['/code/highlight']
const source = ref('')
const result = ref('')
const copyState = ref('idle')
const language = ref('javascript')
const copyLabel = computed(() => copyState.value === 'ok' ? TOOL_RESULT.copied : copyState.value === 'fail' ? TOOL_RESULT.copyFailed : TOOL_RESULT.copy)

const languageOptions = [
  { label: 'JavaScript', value: 'javascript' },
  { label: 'HTML', value: 'html' },
  { label: 'CSS', value: 'css' },
  { label: 'SQL', value: 'sql' },
  { label: 'Python', value: 'python' },
  { label: 'Java', value: 'java' },
  { label: 'JSON', value: 'json' },
  { label: 'XML', value: 'xml' },
  { label: 'Markdown', value: 'markdown' },
]

function escapeHtml(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

function highlightCode(code, lang) {
  const handlers = {
    javascript: highlightJsLike,
    java: highlightJsLike,
    python: highlightPython,
    css: highlightCss,
    html: highlightHtml,
    xml: highlightHtml,
    json: highlightJson,
    sql: highlightSql,
    markdown: highlightMarkdown,
  }
  const fn = handlers[lang] || highlightJsLike
  return fn(code)
}

// Placeholder-based highlighter: extract strings/comments first, then keywords
function tokenizeWithPlaceholders(code, stringRegex, commentRegexes) {
  const placeholders = []
  let text = code

  // Multi-line / single-line comments
  for (const r of commentRegexes) {
    text = text.replace(r, (match) => {
      placeholders.push({ match, cls: 'comment' })
      return `\0${placeholders.length - 1}\0`
    })
  }

  // Strings
  if (stringRegex) {
    text = text.replace(stringRegex, (match) => {
      placeholders.push({ match, cls: 'string' })
      return `\0${placeholders.length - 1}\0`
    })
  }

  return { text, placeholders }
}

function restorePlaceholders(text, placeholders) {
  return text.replace(/\0(\d+)\0/g, (_, i) => {
    const ph = placeholders[Number(i)]
    return `<span class="hl-${ph.cls}">${escapeHtml(ph.match)}</span>`
  })
}

function highlightJsLike(code) {
  const { text, placeholders } = tokenizeWithPlaceholders(code,
    /"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|`(?:\\.|[^`\\])*`/g,
    [/[/*][\s\S]*?\*\//g, /\/\/.*/g]
  )
  let html = escapeHtml(text)
    .replace(/\b(const|let|var|function|return|if|else|for|while|do|break|continue|switch|case|default|try|catch|finally|throw|new|this|typeof|instanceof|void|delete|in|of|with|class|extends|super|import|export|from|as|default|async|await|yield|debugger|static|get|set)\b/g, '<span class="hl-keyword">$&</span>')
    .replace(/\b(true|false|null|undefined|NaN|Infinity)\b/g, '<span class="hl-literal">$&</span>')
    .replace(/\b(\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)\b/g, '<span class="hl-number">$&</span>')
    .replace(/\b([A-Z][a-zA-Z0-9_]*)\b/g, '<span class="hl-type">$&</span>')
  return restorePlaceholders(html, placeholders)
}

function highlightPython(code) {
  const { text, placeholders } = tokenizeWithPlaceholders(code,
    /"""[\s\S]*?"""|'''[\s\S]*?'''|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'/g,
    [/#.*/g]
  )
  let html = escapeHtml(text)
    .replace(/\b(def|class|return|if|elif|else|for|while|break|continue|try|except|finally|raise|with|as|import|from|pass|lambda|yield|assert|del|global|nonlocal|and|or|not|in|is|True|False|None)\b/g, '<span class="hl-keyword">$&</span>')
    .replace(/\b(\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)\b/g, '<span class="hl-number">$&</span>')
    .replace(/\b(True|False|None)\b/g, '<span class="hl-literal">$&</span>')
  return restorePlaceholders(html, placeholders)
}

function highlightCss(code) {
  const { text, placeholders } = tokenizeWithPlaceholders(code,
    /"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'/g,
    [/[/*][\s\S]*?\*\//g]
  )
  let html = escapeHtml(text)
    .replace(/(@media|@import|@keyframes|@font-face|@supports|@[\w-]+)\b/g, '<span class="hl-keyword">$&</span>')
    .replace(/\b([a-z-]+)(?=\s*:)/g, '<span class="hl-property">$&</span>')
    .replace(/(:)\s*([^;{}]+)/g, '$1 <span class="hl-value">$2</span>')
    .replace(/\b(\d+(?:\.\d+)?(?:px|em|rem|%|vh|vw|pt|pc|in|cm|mm|ex|ch|vmin|vmax|deg|rad|turn|s|ms|hz|khz|dpi|dpcm|dppx)?)\b/gi, '<span class="hl-number">$&</span>')
    .replace(/(#(?:[0-9a-fA-F]{3}){1,2})\b/g, '<span class="hl-string">$&</span>')
    .replace(/\b(rgb|rgba|hsl|hsla|var|calc|min|max|clamp|url)\b/gi, '<span class="hl-function">$&</span>')
  return restorePlaceholders(html, placeholders)
}

function highlightHtml(code) {
  let html = escapeHtml(code)
    .replace(/(&lt;!--[\s\S]*?--&gt;)/g, '<span class="hl-comment">$1</span>')
    .replace(/(&lt;\/?)([\w-]+)/g, '$1<span class="hl-tag">$2</span>')
    .replace(/(\s)([\w-]+)(=)/g, '$1<span class="hl-attr">$2</span>$3')
    .replace(/(&quot;(?:\\.|[^&quot;\\])*&quot;)/g, '<span class="hl-string">$1</span>')
  return html
}

function highlightJson(code) {
  let html = escapeHtml(code)
    .replace(/("(?:\\.|[^"\\])*")(\s*)(:)/g, '<span class="hl-attr">$1</span>$2$3')
    .replace(/"(?:\\.|[^"\\])*"/g, '<span class="hl-string">$&</span>')
    .replace(/\b(true|false|null)\b/g, '<span class="hl-literal">$&</span>')
    .replace(/\b(\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)\b/g, '<span class="hl-number">$&</span>')
  return html
}

function highlightSql(code) {
  const keywords = [
    'SELECT','FROM','WHERE','INSERT','UPDATE','DELETE','CREATE','DROP','ALTER','TABLE','INDEX','VIEW','DATABASE',
    'JOIN','LEFT','RIGHT','INNER','OUTER','ON','AND','OR','NOT','NULL','IS','IN','EXISTS','BETWEEN','LIKE',
    'GROUP','BY','ORDER','HAVING','LIMIT','OFFSET','UNION','ALL','DISTINCT','AS','VALUES','SET','INTO',
    'PRIMARY','KEY','FOREIGN','REFERENCES','DEFAULT','UNIQUE','CHECK','CONSTRAINT','CASCADE','RESTRICT',
    'ASC','DESC','COUNT','SUM','AVG','MAX','MIN','CASE','WHEN','THEN','ELSE','END','IF','BEGIN','COMMIT','ROLLBACK'
  ]
  const kwRegex = new RegExp('\\b(' + keywords.join('|') + ')\\b', 'gi')
  const { text, placeholders } = tokenizeWithPlaceholders(code,
    /'(?:''|[^'])*'/g,
    [/--.*/g, /\/[*][\s\S]*?\*\//g]
  )
  let html = escapeHtml(text)
    .replace(kwRegex, '<span class="hl-keyword">$&</span>')
    .replace(/\b(\d+(?:\.\d+)?)\b/g, '<span class="hl-number">$&</span>')
  return restorePlaceholders(html, placeholders)
}

function highlightMarkdown(code) {
  let html = escapeHtml(code)
    .replace(/^(#{1,6}\s+.*)$/gm, '<span class="hl-keyword">$1</span>')
    .replace(/(\*\*|__)(.+?)\1/g, '<span class="hl-string">$1$2$1</span>')
    .replace(/(\*|_)(.+?)\1/g, '<span class="hl-string">$1$2$1</span>')
    .replace(/(`[^`]+`)/g, '<span class="hl-number">$1</span>')
    .replace(/(\[.+?\])(\(.+?\))/g, '<span class="hl-attr">$1</span><span class="hl-value">$2</span>')
    .replace(/^(&gt;\s+.*)$/gm, '<span class="hl-comment">$1</span>')
    .replace(/^(\s*[-*+]\s+.*)$/gm, '<span class="hl-literal">$1</span>')
    .replace(/^(\s*\d+\.\s+.*)$/gm, '<span class="hl-literal">$1</span>')
    .replace(/^(---|\*\*\*|___)$/gm, '<span class="hl-keyword">$1</span>')
  return html
}

function process() {
  if (!source.value) return
  result.value = highlightCode(source.value, language.value)
  copyState.value = 'idle'
}
function clear() { source.value = ''; result.value = ''; copyState.value = 'idle' }
async function copy() {
  if (!result.value) return
  try {
    await navigator.clipboard.writeText(result.value)
    copyState.value = 'ok'
  } catch (e) {
    copyState.value = 'fail'
  }
}
</script>

<style scoped>
.hl-preview {
  background: #1e1e2e;
  border-radius: var(--radius-card);
  padding: calc(var(--space-unit) * 2);
  overflow-x: auto;
}
.hl-preview pre {
  margin: 0;
  font-family: var(--font-mono);
  font-size: var(--fs-sm);
  line-height: 1.6;
  color: #cdd6f4;
}
.hl-preview :deep(.hl-keyword) { color: #cba6f7; }
.hl-preview :deep(.hl-string) { color: #a6e3a1; }
.hl-preview :deep(.hl-number) { color: #fab387; }
.hl-preview :deep(.hl-comment) { color: #6c7086; font-style: italic; }
.hl-preview :deep(.hl-literal) { color: #f38ba8; }
.hl-preview :deep(.hl-type) { color: #f9e2af; }
.hl-preview :deep(.hl-tag) { color: #f38ba8; }
.hl-preview :deep(.hl-attr) { color: #fab387; }
.hl-preview :deep(.hl-value) { color: #a6e3a1; }
.hl-preview :deep(.hl-property) { color: #89b4fa; }
.hl-preview :deep(.hl-function) { color: #89dceb; }
</style>
