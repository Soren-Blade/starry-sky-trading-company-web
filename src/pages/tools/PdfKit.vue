<template>
  <ToolPageShell :title="PAGE.title" :eyebrow="PAGE.eyebrow" :description="PAGE.description" :icon="PAGE.icon" :requires-card="PAGE.requiresCard">
    <section class="ui-card tool-panel">
      <h2 class="tool-panel-title"><AppIcon name="file-text" aria-hidden="true" /><span>PDF 工具</span></h2>
      <label class="tool-file-drop" :class="{ 'tool-file-drop--active': dragging }" @dragover.prevent="dragging = true" @dragleave="dragging = false" @drop.prevent="handleDrop">
        <span class="tool-file-icon"><AppIcon name="file-text" /></span>
        <span class="tool-file-title">点击或拖拽 PDF 文件到此处</span>
        <input ref="fileInput" class="tool-file-input" type="file" accept=".pdf" @change="handleChange" />
      </label>

      <div v-if="pdfInfo" class="pdf-info">
        <p><strong>文件名:</strong> {{ pdfInfo.name }}</p>
        <p><strong>大小:</strong> {{ pdfInfo.size }}</p>
        <p><strong>页数:</strong> {{ pdfInfo.pages }}</p>
      </div>

      <div v-if="pdfText" class="ui-card tool-panel" style="margin-top:calc(var(--space-unit)*2);">
        <h2 class="tool-panel-title"><AppIcon name="check-circle" aria-hidden="true" /><span>提取文本（前 3 页预览）</span></h2>
        <pre class="tool-preview" style="max-height:300px;overflow:auto;">{{ pdfText }}</pre>
        <div class="tool-actions">
          <button type="button" class="u-btn-primary" @click="copyText">复制文本</button>
        </div>
      </div>

      <div class="tool-actions">
        <button type="button" class="u-btn-secondary" @click="clear">清空</button>
      </div>
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
import ToolPageShell from '@/components/ToolPageShell.vue'
import { TOOL_PAGE, TOOL_PAGES } from '@/constants/index.js'

const PAGE = TOOL_PAGES['/media/pdf']
const dragging = ref(false)
const pdfInfo = ref(null)
const pdfText = ref('')

function handleDrop(e) {
  dragging.value = false
  const file = e.dataTransfer.files[0]
  if (file && file.name.toLowerCase().endsWith('.pdf')) loadPdf(file)
}
function handleChange(e) {
  const file = e.target.files[0]
  if (file) loadPdf(file)
}
function formatBytes(b) {
  if (b < 1024) return b + ' B'
  if (b < 1024 * 1024) return (b / 1024).toFixed(1) + ' KB'
  return (b / (1024 * 1024)).toFixed(2) + ' MB'
}

async function loadPdf(file) {
  pdfInfo.value = { name: file.name, size: formatBytes(file.size), pages: '读取中...' }
  pdfText.value = ''
  try {
    const arrayBuffer = await file.arrayBuffer()
    const text = extractTextFromPdf(arrayBuffer)
    pdfText.value = text.slice(0, 3000) || '未能提取到文本内容'
    const pages = countPdfPages(arrayBuffer)
    pdfInfo.value.pages = pages
  } catch (e) {
    pdfInfo.value.pages = '无法解析'
    pdfText.value = 'PDF 解析失败: ' + e.message
  }
}

function extractTextFromPdf(buffer) {
  const uint8 = new Uint8Array(buffer)
  let text = ''
  // Simple text extraction: find text objects between BT and ET
  const decoder = new TextDecoder('utf-8')
  const str = decoder.decode(uint8)
  const regex = /\(([^)]{2,200})\)/g
  let match
  while ((match = regex.exec(str)) !== null) {
    const candidate = match[1]
    if (/[\u4e00-\u9fa5a-zA-Z0-9]{2,}/.test(candidate)) {
      text += candidate + ' '
    }
  }
  return text.trim()
}

function countPdfPages(buffer) {
  const uint8 = new Uint8Array(buffer)
  const decoder = new TextDecoder('ascii')
  const str = decoder.decode(uint8)
  const matches = str.match(/\/Type\s*\/Page\b/g)
  return matches ? matches.length : '未知'
}

function clear() {
  pdfInfo.value = null
  pdfText.value = ''
  dragging.value = false
}
async function copyText() {
  if (!pdfText.value) return
  try { await navigator.clipboard.writeText(pdfText.value) } catch (e) { /* 剪贴板被拒绝时静默 */ }
}
</script>

<style scoped>
.pdf-info { padding: calc(var(--space-unit) * 2); background: var(--bg-surface-2); border-radius: var(--radius-card); }
.pdf-info p { margin: calc(var(--space-unit)) 0; color: var(--text-primary); }
</style>
