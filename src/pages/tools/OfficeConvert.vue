<template>
  <ToolPageShell :title="PAGE.title" :eyebrow="PAGE.eyebrow" :description="PAGE.description" :icon="PAGE.icon" :requires-card="PAGE.requiresCard">
    <section class="ui-card tool-panel">
      <h2 class="tool-panel-title"><AppIcon name="files" aria-hidden="true" /><span>{{ PAGE.inputTitle }}</span></h2>
      <label class="tool-file-drop" :class="{ 'tool-file-drop--active': dragging }" @dragover.prevent="dragging = true" @dragleave="dragging = false" @drop.prevent="handleDrop">
        <span class="tool-file-icon"><AppIcon name="files" /></span>
        <span class="tool-file-title">点击选择或拖入 .docx / .xlsx / .md 文件</span>
        <input ref="fileInput" class="tool-file-input" type="file" accept=".docx,.xlsx,.md,.markdown" @change="handleChange" />
      </label>
      <p v-if="fileError" class="u-field-error" role="alert">{{ fileError }}</p>
      <p v-if="fileName" class="tool-file-name"><AppIcon name="check-circle" aria-hidden="true" /><span>{{ fileName }}（{{ formatBytes(fileBytes) }}）· {{ KIND_LABELS[kind] }}</span></p>
      <p v-if="sheetsLoading" class="tool-result-note">正在读取工作表列表…</p>
      <ToolModeTabs v-if="formatOptions.length > 1" v-model="target" :options="formatOptions" label="输出格式" hint="输出是纯文本或 Markdown，样式、图片、页眉页脚都会丢失；PDF 保真转换需要服务端，本页不提供。" />
      <div v-if="sheetNames.length > 1" class="tool-form">
        <div class="u-field">
          <label class="u-field-label" for="office-sheet">要导出的工作表</label>
          <SelectField id="office-sheet" v-model="sheetName" :options="sheetOptions" aria-label="要导出的工作表" />
        </div>
      </div>
      <div class="tool-actions">
        <button type="button" class="u-btn-primary" :disabled="!sourceFile || state === 'loading'" @click="run">{{ state === 'loading' ? '转换中…' : '开始转换' }}</button>
        <button type="button" class="u-btn-secondary" :disabled="state === 'loading'" @click="reset">清空</button>
      </div>
      <p class="tool-result-note">本页只做浏览器能可靠完成的三种转换：.docx → 文本/Markdown、.xlsx → CSV、.md → Markdown。</p>
    </section>
    <section class="ui-card tool-panel">
      <h2 class="tool-panel-title"><AppIcon name="clipboard" aria-hidden="true" /><span>{{ PAGE.resultTitle }}</span></h2>
      <ToolResultPane :state="state" :title="PAGE.resultTitle" :error="errorMessage" loading-text="正在解析文档…">
        <p v-if="result" class="tool-result-note">{{ result.note }}</p>
        <pre v-if="result" class="tool-preview">{{ result.preview }}</pre>
        <template #actions>
          <button v-if="result" type="button" class="u-btn-primary" @click="download">下载 {{ result.name }}</button>
          <button v-if="result" type="button" class="u-btn-secondary" @click="copyText">{{ copied ? '已复制' : '复制文本' }}</button>
        </template>
      </ToolResultPane>
    </section>
    <template #aside>
      <section class="ui-card tool-aside-card">
        <h3 class="tool-aside-title"><AppIcon name="info" aria-hidden="true" /> {{ TOOL_PAGE.usageTitle }}</h3>
        <ul class="tool-aside-list">
          <li>.docx 解析 word/document.xml，段落按原顺序输出，表格转 Markdown 表格。</li>
          <li>.xlsx 逐表读取，可指定工作表导出 CSV。</li>
          <li>.md 只做换行与 BOM 规整后原样导出。</li>
        </ul>
      </section>
      <section class="ui-card tool-aside-card">
        <h3 class="tool-aside-title"><AppIcon name="alert-triangle" aria-hidden="true" /> {{ TOOL_PAGE.noticeTitle }}</h3>
        <p class="tool-aside-note">PDF 保真转换、docx → PDF、pptx 转换需要服务端 LibreOffice，本页不做。.doc/.xls/.ppt 旧二进制格式请先在 Office 里另存为新格式。</p>
      </section>
    </template>
  </ToolPageShell>
</template>

<script setup>
import { computed, ref } from 'vue'
import AppIcon from '@/components/AppIcon.vue'
import SelectField from '@/components/SelectField.vue'
import ToolModeTabs from '@/components/ToolModeTabs.vue'
import ToolPageShell from '@/components/ToolPageShell.vue'
import ToolResultPane from '@/components/ToolResultPane.vue'
import { TOOL_PAGE, TOOL_PAGES } from '@/constants/index.js'
import { useToolUsage } from '@/hooks/useToolUsage/index.js'

const PAGE = TOOL_PAGES['/office/convert']
const usage = useToolUsage('/office/convert')
// WordprocessingML 命名空间：用 NS 查节点，避免 XML 前缀在不同生成器里变化。
const WORD_NAMESPACE = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'
const MAX_FILE_BYTES = 20 * 1024 * 1024
const PREVIEW_CHARS = 20000
const KIND_LABELS = { docx: 'Word 文档', xlsx: 'Excel 工作簿', md: 'Markdown 文本' }
const FORMATS = { docx: [{ value: 'txt', label: '纯文本（.txt）' }, { value: 'markdown', label: 'Markdown（.md）' }], xlsx: [{ value: 'csv', label: 'CSV（.csv）' }], md: [{ value: 'markdown', label: 'Markdown（.md）' }] }

const fileInput = ref(null); const sourceFile = ref(null)
const fileName = ref(''); const fileBytes = ref(0)
const kind = ref(''); const target = ref(''); const dragging = ref(false)
const fileError = ref(''); const sheetsLoading = ref(false)
const sheetNames = ref([]); const sheetName = ref('')
const state = ref('empty'); const result = ref(null); const errorMessage = ref('')
const copied = ref(false)
const formatOptions = computed(() => FORMATS[kind.value] || [])
const sheetOptions = computed(() => sheetNames.value.map((name) => ({ value: name, label: name })))

function formatBytes(bytes) {
  if (!bytes) return '0 B'
  if (bytes < 1024) return `${bytes} B`
  return bytes < 1024 * 1024 ? `${(bytes / 1024).toFixed(1)} KB` : `${(bytes / 1024 / 1024).toFixed(2)} MB`
}
function detectKind(name) {
  if (/\.docx$/i.test(name)) return 'docx'
  if (/\.xlsx$/i.test(name)) return 'xlsx'
  return /\.(md|markdown)$/i.test(name) ? 'md' : ''
}
function reset() {
  sourceFile.value = null; fileName.value = ''; fileBytes.value = 0; kind.value = ''; target.value = ''
  fileError.value = ''; sheetsLoading.value = false; sheetNames.value = []; sheetName.value = ''
  state.value = 'empty'; result.value = null; errorMessage.value = ''; copied.value = false
}
async function loadSheets(file) {
  sheetsLoading.value = true
  try {
    const XLSX = await import('xlsx')
    const workbook = XLSX.read(new Uint8Array(await file.arrayBuffer()), { type: 'array' })
    sheetNames.value = workbook.SheetNames
    sheetName.value = workbook.SheetNames[0] || ''
  } catch (error) {
    fileError.value = `读取工作表失败：${error && error.message ? error.message : '文件可能已损坏'}`
  } finally {
    sheetsLoading.value = false
  }
}
function selectFile(file) {
  reset()
  if (!file) return
  const detected = detectKind(file.name)
  if (!detected) {
    fileError.value = '只支持 .docx / .xlsx / .md；.doc / .xls / .ppt 旧格式请先另存为新格式，PDF 请用 PDF 工具箱。'
    usage.record({ ok: false, errorCode: 'OFFICE_FILE_INVALID_TYPE' })
    return
  }
  if (file.size > MAX_FILE_BYTES) {
    fileError.value = `文件 ${formatBytes(file.size)} 超过 ${formatBytes(MAX_FILE_BYTES)}，请先拆分。`
    usage.record({ ok: false, errorCode: 'OFFICE_FILE_INVALID_TYPE', meta: { reason: 'size' } })
    return
  }
  sourceFile.value = file; fileName.value = file.name; fileBytes.value = file.size
  kind.value = detected; target.value = FORMATS[detected][0].value
  if (detected === 'xlsx') loadSheets(file)
}
function handleChange(event) { selectFile((event.target.files || [])[0]); event.target.value = '' }
function handleDrop(event) { dragging.value = false; selectFile((event.dataTransfer.files || [])[0]) }
// 取段落文字：注意 getElementsByTagNameNS 只返回后代、不含节点自身，
// 所以对 <w:p> 自身必须用 textContent，否则每个段落都会解析成空串被丢掉。
function paragraphText(node) {
  return (node.textContent || '').replace(/\s+/g, ' ').trim()
}
function cellText(cell) {
  return Array.from(cell.getElementsByTagNameNS(WORD_NAMESPACE, 'p')).map(paragraphText).filter(Boolean).join(' ')
}
function tableRows(table) {
  return Array.from(table.getElementsByTagNameNS(WORD_NAMESPACE, 'tr')).map((row) =>
    Array.from(row.getElementsByTagNameNS(WORD_NAMESPACE, 'tc')).map(cellText),
  )
}
function readBlocks(body) {
  const blocks = []
  for (const node of Array.from(body.childNodes)) {
    if (node.nodeType !== 1) continue
    if (node.localName === 'p') { const text = paragraphText(node); if (text) blocks.push({ type: 'p', text }) }
    else if (node.localName === 'tbl') blocks.push({ type: 'table', rows: tableRows(node) })
  }
  return blocks
}
function tableToMarkdown(rows) {
  const filled = rows.filter((row) => row.length)
  if (!filled.length) return ''
  const width = Math.max(...filled.map((row) => row.length))
  const cell = (row, index) => (row[index] || '').replace(/\|/g, '\\|')
  const head = Array.from({ length: width }, (_, index) => cell(filled[0], index))
  const lines = [`| ${head.join(' | ')} |`, `| ${head.map(() => '---').join(' | ')} |`]
  filled.slice(1).forEach((row) => lines.push(`| ${Array.from({ length: width }, (_, index) => cell(row, index)).join(' | ')} |`))
  return lines.join('\n')
}
function blocksToText(blocks, markdown) {
  return blocks
    .map((block) => (block.type === 'p' ? block.text : markdown ? tableToMarkdown(block.rows) : block.rows.filter((row) => row.length).map((row) => row.join('\t')).join('\n')))
    .filter(Boolean)
    .join('\n\n')
}
function buildResult(text, name, mime, note) {
  return { text, name, mime, note, preview: text.slice(0, PREVIEW_CHARS) + (text.length > PREVIEW_CHARS ? '\n…（已截断，完整内容请下载）' : '') }
}
async function convertDocx(file) {
  const { default: JSZip } = await import('jszip')
  const zip = await JSZip.loadAsync(await file.arrayBuffer())
  const entry = zip.file('word/document.xml')
  if (!entry) throw new Error('这个文件里没有 word/document.xml，可能不是 .docx 或已损坏。')
  const document = new DOMParser().parseFromString(await entry.async('string'), 'application/xml')
  const body = document.getElementsByTagNameNS(WORD_NAMESPACE, 'body')[0]
  if (!body) throw new Error('文档结构不完整，找不到正文节点。')
  const blocks = readBlocks(body)
  const markdown = target.value === 'markdown'
  const text = blocksToText(blocks, markdown)
  const base = file.name.replace(/\.docx$/i, '')
  const note = markdown
    ? `已提取 ${blocks.length} 个段落/表格块，含格式会丢失（列表、图片、页眉页脚不在本页处理范围）。`
    : `已提取 ${blocks.length} 个段落/表格块，表格用制表符对齐。`
  return buildResult(text, `${base}.${markdown ? 'md' : 'txt'}`, markdown ? 'text/markdown' : 'text/plain', note)
}
async function convertXlsx(file) {
  const XLSX = await import('xlsx')
  const workbook = XLSX.read(new Uint8Array(await file.arrayBuffer()), { type: 'array' })
  const name = workbook.SheetNames.includes(sheetName.value) ? sheetName.value : workbook.SheetNames[0]
  const sheet = workbook.Sheets[name]
  if (!sheet) throw new Error('工作簿里找不到可导出的工作表。')
  return buildResult(XLSX.utils.sheet_to_csv(sheet), `${file.name.replace(/\.xlsx$/i, '')}-${name}.csv`, 'text/csv', `已导出工作表「${name}」为 CSV（${workbook.SheetNames.length} 个工作表中选 1 个）。`)
}
async function convertMarkdown(file) {
  const text = (await file.text()).replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n')
  return buildResult(text, `${file.name.replace(/\.(md|markdown)$/i, '')}.md`, 'text/markdown', 'Markdown 原文只做换行与 BOM 规整，未做渲染。')
}
async function run() {
  if (!sourceFile.value) return
  const startedAt = performance.now()
  state.value = 'loading'; errorMessage.value = ''; copied.value = false
  try {
    let output
    if (kind.value === 'docx') output = await convertDocx(sourceFile.value)
    else if (kind.value === 'xlsx') output = await convertXlsx(sourceFile.value)
    else output = await convertMarkdown(sourceFile.value)
    result.value = output
    state.value = 'success'
    usage.record({ durationMs: performance.now() - startedAt, meta: { from: kind.value, to: target.value, chars: output.text.length } })
  } catch (error) {
    state.value = 'error'
    errorMessage.value = error && error.message ? error.message : '转换失败，请换一个文件再试。'
    usage.record({ durationMs: performance.now() - startedAt, ok: false, errorCode: 'OFFICE_PARSE_FAILED' })
  }
}
function download() {
  if (!result.value) return
  const url = URL.createObjectURL(new Blob([result.value.text], { type: `${result.value.mime};charset=utf-8` }))
  const link = document.createElement('a')
  link.href = url; link.download = result.value.name
  link.click()
  URL.revokeObjectURL(url)
}
async function copyText() {
  if (!result.value) return
  try {
    await navigator.clipboard.writeText(result.value.text)
    copied.value = true
  } catch {
    errorMessage.value = '浏览器拒绝了剪贴板权限，请用「下载」代替。'
  }
}
</script>
