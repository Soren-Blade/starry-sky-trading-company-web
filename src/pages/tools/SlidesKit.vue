<template>
  <ToolPageShell :title="PAGE.title" :eyebrow="PAGE.eyebrow" :description="PAGE.description" :icon="PAGE.icon" :requires-card="PAGE.requiresCard">
    <section class="ui-card tool-panel">
      <h2 class="tool-panel-title"><AppIcon name="presentation" aria-hidden="true" /><span>Markdown 大纲</span></h2>
      <div class="u-field">
        <label class="u-field-label" for="slides-source">大纲内容</label>
        <textarea id="slides-source" v-model="source" class="tool-textarea" rows="12" placeholder="# 封面标题&#10;## 第一节&#10;- 要点一&#10;- 要点二&#10;&#10;---&#10;&#10;# 下一页&#10;- 要点三" />
        <p class="u-field-hint">规则：# 起新页并作标题，## 起新页，### 与 - 是要点，普通段落是二级文案，--- 强制分页。</p>
      </div>
      <p v-if="state === 'error'" class="u-field-error" role="alert">{{ errorMessage }}</p>
      <div class="tool-actions">
        <button type="button" class="u-btn-primary" :disabled="!source.trim()" @click="generate">解析为幻灯片</button>
        <button type="button" class="u-btn-secondary" :disabled="!slides.length" @click="reset">清空</button>
      </div>
      <p class="tool-result-note">纯前端解析与导出 .md 大纲 / .html 幻灯片；PPTX 导出需要服务端，本页不提供。</p>
    </section>

    <section class="ui-card tool-panel">
      <h2 class="tool-panel-title"><AppIcon name="clipboard" aria-hidden="true" /><span>{{ PAGE.resultTitle }}</span></h2>
      <ToolResultPane :state="state" :title="PAGE.resultTitle" :error="errorMessage">
        <ol class="slides-outline">
          <li v-for="(slide, index) in slides" :key="index" class="slide-card">
            <p class="slide-title">{{ index + 1 }}. {{ slide.title || '未命名幻灯片' }}</p>
            <ul class="slide-bullets">
              <li v-for="(item, itemIndex) in slide.items" :key="itemIndex" :class="{ 'slide-bullets-sub': item.level > 1, 'slide-bullets-text': item.kind === 'text' }">{{ item.text }}</li>
            </ul>
            <p v-if="!slide.items.length" class="slide-empty">这一页只有标题</p>
          </li>
        </ol>
        <template #actions>
          <button type="button" class="u-btn-secondary" @click="exportMarkdown">导出 .md 大纲</button>
          <button type="button" class="u-btn-primary" @click="exportHtml">导出 .html 幻灯片</button>
          <button type="button" class="u-btn-secondary" @click="copyOutline">{{ copied ? '已复制' : '复制大纲' }}</button>
        </template>
      </ToolResultPane>
    </section>

    <template #aside>
      <section class="ui-card tool-aside-card">
        <h3 class="tool-aside-title"><AppIcon name="info" aria-hidden="true" /> {{ TOOL_PAGE.usageTitle }}</h3>
        <ul class="tool-aside-list">
          <li>把 Markdown 大纲解析成幻灯片结构，逐页预览。</li>
          <li>.html 幻灯片自带样式，用浏览器「打印 → 另存为 PDF」即可得到讲稿 PDF。</li>
          <li>全流程在浏览器内完成，不上传任何内容。</li>
        </ul>
      </section>
      <section class="ui-card tool-aside-card">
        <h3 class="tool-aside-title"><AppIcon name="alert-triangle" aria-hidden="true" /> {{ TOOL_PAGE.noticeTitle }}</h3>
        <p class="tool-aside-note">本页不提供 .pptx 导入/导出，也不读 .ppt/.pptx 文件；PPTX 导出需要服务端，本页不提供。</p>
      </section>
    </template>
  </ToolPageShell>
</template>

<script setup>
import { ref } from 'vue'
import AppIcon from '@/components/AppIcon.vue'
import ToolPageShell from '@/components/ToolPageShell.vue'
import ToolResultPane from '@/components/ToolResultPane.vue'
import { TOOL_PAGE, TOOL_PAGES } from '@/constants/index.js'
import { useToolUsage } from '@/hooks/useToolUsage/index.js'

const PAGE = TOOL_PAGES['/office/slides']
const usage = useToolUsage('/office/slides')
const MAX_CHARS = 200000
const source = ref(''); const slides = ref([])
const state = ref('empty'); const errorMessage = ref(''); const copied = ref(false)

// 解析是纯字符串处理，耗时可忽略，因此不设 loading 态；仍保留四态是为了复用同一套结果面板。
// 一行一个语义：# 新页标题、## 新页、### 与列表行是要点、普通段落是二级文案、--- 强制分页。
function parseSlides(text) {
  const result = []
  let current = null
  const openSlide = () => {
    if (!current) { current = { title: '', items: [] }; result.push(current) }
    return current
  }
  for (const rawLine of text.split(/\r?\n/)) {
    const raw = rawLine.replace(/\s+$/, '')
    const line = raw.trim()
    if (!line) continue
    if (/^-{3,}$/.test(line)) { current = { title: '', items: [] }; result.push(current); continue }
    const heading = /^(#{1,3})\s+(.+)$/.exec(line)
    if (heading) {
      const level = heading[1].length
      const title = heading[2].trim()
      if (level === 3) openSlide().items.push({ kind: 'bullet', level: 1, text: title })
      else if (current && !current.title && !current.items.length) current.title = title
      else { current = { title, items: [] }; result.push(current) }
      continue
    }
    const bullet = /^(\s*)(?:[-*+]|\d+[.)])\s+(.+)$/.exec(raw)
    if (bullet) { openSlide().items.push({ kind: 'bullet', level: bullet[1].length >= 2 ? 2 : 1, text: bullet[2].trim() }); continue }
    openSlide().items.push({ kind: 'text', level: 0, text: line })
  }
  return result.filter((slide) => slide.title || slide.items.length)
}

function outlineText() {
  return slides.value.map((slide) => {
    const lines = [`# ${slide.title || '未命名幻灯片'}`]
    for (const item of slide.items) {
      if (item.kind === 'bullet') lines.push(`${item.level > 1 ? '  ' : ''}- ${item.text}`)
      else lines.push('', item.text)
    }
    return lines.join('\n')
  }).join('\n\n---\n\n')
}

function escapeHtml(value) {
  const table = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }
  return String(value).replace(/[&<>"']/g, (char) => table[char])
}

function itemsHtml(items) {
  const parts = []
  let listOpen = false
  for (const item of items) {
    if (item.kind !== 'bullet') {
      if (listOpen) { parts.push('</ul>'); listOpen = false }
      parts.push(`<p>${escapeHtml(item.text)}</p>`)
      continue
    }
    if (!listOpen) { parts.push('<ul>'); listOpen = true }
    parts.push(`<li data-level="${item.level}">${escapeHtml(item.text)}</li>`)
  }
  if (listOpen) parts.push('</ul>')
  return parts.map((part) => `      ${part}`).join('\n')
}

// 自包含单文件 HTML：不引外部资源，打印时每页一张，另存为 PDF 即得讲稿。
function htmlText() {
  const sections = slides.value
    .map((slide) => `    <section class="slide">\n      <h1>${escapeHtml(slide.title || '未命名幻灯片')}</h1>\n${itemsHtml(slide.items)}\n    </section>`)
    .join('\n')
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(outlineText().split('\n')[0].replace(/^#\s*/, ''))}</title>
  <style>
    body { margin: 0; background: #f4f5f7; color: #1c2430; font-family: "Microsoft YaHei", "PingFang SC", system-ui, sans-serif; }
    .slide { width: 960px; max-width: 92vw; margin: 24px auto; padding: 48px; background: #fff; border-radius: 12px; box-shadow: 0 8px 24px rgba(15, 23, 42, 0.08); }
    .slide h1 { margin: 0 0 24px; font-size: 36px; line-height: 1.3; }
    .slide ul { margin: 0; padding-left: 24px; }
    .slide li { margin: 8px 0; font-size: 22px; line-height: 1.6; }
    .slide li[data-level="2"] { margin-left: 24px; font-size: 18px; color: #48566b; }
    .slide p { margin: 8px 0; font-size: 18px; line-height: 1.7; color: #48566b; }
    @media print {
      body { background: #fff; }
      .slide { width: auto; margin: 0; padding: 32px; border-radius: 0; box-shadow: none; page-break-after: always; }
      @page { size: landscape; }
    }
  </style>
</head>
<body>
${sections}
</body>
</html>`
}

function downloadText(text, name, mime) {
  const url = URL.createObjectURL(new Blob([text], { type: `${mime};charset=utf-8` }))
  const link = document.createElement('a')
  link.href = url; link.download = name
  link.click()
  URL.revokeObjectURL(url)
}

function generate() {
  const startedAt = performance.now()
  errorMessage.value = ''
  if (source.value.length > MAX_CHARS) {
    state.value = 'error'
    errorMessage.value = `内容超过 ${MAX_CHARS} 字，请拆成多份后再解析。`
    usage.record({ ok: false, errorCode: 'SLIDES_PARSE_FAILED', durationMs: performance.now() - startedAt })
    return
  }
  const parsed = parseSlides(source.value)
  if (!parsed.length) {
    state.value = 'error'
    errorMessage.value = '没有解析出任何幻灯片：请用「# 标题」「- 要点」或「---」组织内容。'
    usage.record({ ok: false, errorCode: 'SLIDES_PARSE_FAILED', durationMs: performance.now() - startedAt })
    return
  }
  slides.value = parsed
  state.value = 'success'
  usage.record({ durationMs: performance.now() - startedAt, meta: { slides: parsed.length } })
}

function exportMarkdown() { downloadText(outlineText(), 'slides-outline.md', 'text/markdown') }
function exportHtml() { downloadText(htmlText(), 'slides.html', 'text/html') }

async function copyOutline() {
  try {
    await navigator.clipboard.writeText(outlineText())
    copied.value = true
  } catch {
    errorMessage.value = '浏览器拒绝了剪贴板权限，请用「导出 .md 大纲」代替。'
  }
}

function reset() { source.value = ''; slides.value = []; state.value = 'empty'; errorMessage.value = ''; copied.value = false }
</script>

<style scoped>
.slides-outline { display: flex; flex-direction: column; gap: calc(var(--space-unit) * 1.5); margin: 0; padding: 0; list-style: none; }
.slide-card { padding: calc(var(--space-unit) * 1.5); border-radius: var(--radius-card); background: var(--bg-surface-2); }
.slide-title { margin: 0 0 calc(var(--space-unit) * 0.5); font-size: var(--fs-body); font-weight: var(--fw-heading); color: var(--text-primary); }
.slide-bullets { margin: 0; padding-left: calc(var(--space-unit) * 2); font-size: var(--fs-sm); color: var(--text-secondary); }
.slide-bullets-sub { margin-left: calc(var(--space-unit) * 2); color: var(--text-muted); }
.slide-bullets-text { list-style: none; color: var(--text-muted); }
.slide-empty { margin: 0; font-size: var(--fs-label); color: var(--text-muted); }
@media (max-width: 767px) { .slide-card { padding: calc(var(--space-unit)); } }
</style>
