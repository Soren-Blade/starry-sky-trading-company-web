<template>
  <ToolPageShell :title="PAGE.title" :eyebrow="PAGE.eyebrow" :description="PAGE.description" :icon="PAGE.icon" :requires-card="PAGE.requiresCard">
    <section class="ui-card tool-panel">
      <h2 class="tool-panel-title"><AppIcon name="file-text" aria-hidden="true" /><span>{{ PAGE.inputTitle }}</span></h2>
      <label class="tool-file-drop" :class="{ 'tool-file-drop--active': dragging }" @dragover.prevent="dragging = true" @dragleave="dragging = false" @drop.prevent="handleDrop">
        <span class="tool-file-icon"><AppIcon name="upload" /></span>
        <span class="tool-file-title">点击选择或拖入 PDF（可多选，合并时按列表顺序拼接）</span>
        <input ref="fileInput" class="tool-file-input" type="file" accept="application/pdf,.pdf" multiple @change="handleChange" />
      </label>
      <p v-if="fileError" class="u-field-error" role="alert">{{ fileError }}</p>
      <div v-if="files.length" class="tool-file-list">
        <div v-for="(file, index) in files" :key="file.name + index" class="tool-file-card">
          <span class="tool-file-card-body"><span class="tool-file-card-name">{{ index + 1 }}. {{ file.name }}</span><span class="tool-file-card-meta">{{ formatBytes(file.size) }}</span></span>
          <button type="button" class="tool-file-card-remove" :aria-label="`移除 ${file.name}`" @click="removeFile(index)"><AppIcon name="ban" /></button>
        </div>
      </div>
      <ToolModeTabs v-model="mode" :options="MODE_OPTIONS" label="PDF 处理方式" :hint="MODES[mode].hint" />
      <div v-if="needsRange" class="u-field">
        <label class="u-field-label" for="pdf-range">页码范围</label>
        <input id="pdf-range" v-model="pageRange" class="u-input" type="text" placeholder="如 1-3,5,8-（留空表示全部页）" />
      </div>
      <div v-if="mode === 'rotate'" class="u-field">
        <label class="u-field-label" for="pdf-angle">旋转角度</label>
        <SelectField id="pdf-angle" v-model="angle" :options="ANGLE_OPTIONS" aria-label="旋转角度" />
      </div>
      <p class="tool-result-note">处理与生成都在浏览器内完成，文件不会上传；单个文件上限 {{ formatBytes(MAX_FILE_BYTES) }}。</p>
      <div class="tool-actions">
        <button type="button" class="u-btn-primary" :disabled="!files.length || state === 'loading'" @click="run">{{ state === 'loading' ? '处理中…' : (mode === 'info' ? '查看信息' : '开始处理') }}</button>
        <button type="button" class="u-btn-secondary" :disabled="!files.length || state === 'loading'" @click="reset">清空</button>
      </div>
    </section>

    <section class="ui-card tool-panel">
      <h2 class="tool-panel-title"><AppIcon name="clipboard" aria-hidden="true" /><span>{{ PAGE.resultTitle }}</span></h2>
      <ToolResultPane :state="state" :title="PAGE.resultTitle" :error="errorMessage" loading-text="正在解析 PDF…">
        <p v-if="fileItem" class="tool-result-note">{{ fileItem.summary }}</p>
        <div v-for="item in infoItems" :key="item.name" class="tool-result-meta">
          <span v-for="field in item.fields" :key="field[0]" class="tool-result-meta-item"><span>{{ field[0] }}</span><strong>{{ field[1] }}</strong></span>
        </div>
        <div v-if="fileItem" class="tool-result-meta">
          <span v-for="field in fileFields" :key="field[0]" class="tool-result-meta-item"><span>{{ field[0] }}</span><strong>{{ field[1] }}</strong></span>
        </div>
        <template #actions>
          <button v-if="fileItem" type="button" class="u-btn-primary" @click="download">下载 {{ fileItem.name }}</button>
        </template>
      </ToolResultPane>
    </section>

    <template #aside>
      <section class="ui-card tool-aside-card">
        <h3 class="tool-aside-title"><AppIcon name="info" aria-hidden="true" /> {{ TOOL_PAGE.usageTitle }}</h3>
        <ul class="tool-aside-list"><li v-for="(item, index) in ASIDE_ITEMS" :key="index">{{ item }}</li></ul>
        <p class="tool-aside-note">{{ TOOL_PAGE.noticeTitle }}：已加密（需要打开密码）的 PDF 必须先解密才能处理；本页不做解密与数字签名。</p>
      </section>
    </template>
  </ToolPageShell>
</template>

<script setup>
import { computed, onUnmounted, ref } from 'vue'
import AppIcon from '@/components/AppIcon.vue'
import SelectField from '@/components/SelectField.vue'
import ToolModeTabs from '@/components/ToolModeTabs.vue'
import ToolPageShell from '@/components/ToolPageShell.vue'
import ToolResultPane from '@/components/ToolResultPane.vue'
import { TOOL_PAGE, TOOL_PAGES } from '@/constants/index.js'
import { useToolUsage } from '@/hooks/useToolUsage/index.js'

const PAGE = TOOL_PAGES['/media/pdf']
const usage = useToolUsage('/media/pdf')
// 侧栏文案与模式说明都改在本页（常量表里仍是旧口径，不改 constants）。
const ASIDE_ITEMS = ['支持合并、按页范围拆分、旋转、删除指定页。', '可读取页数、标题、作者与创建时间。', '文件不上传服务器，处理结果直接下载。']
const MAX_FILE_BYTES = 30 * 1024 * 1024
const MAX_FILES = 20
// 一个模式 = 选项文案 + 一句说明 + 失败错误码；三处不再各抄一份清单。
const MODES = {
  info: { label: '查看信息', hint: '只读取页数、标题、作者与创建时间，不写文件。', error: 'PDF_READ_FAILED' },
  merge: { label: '合并为一个 PDF', hint: '把所有已选文件按列表顺序拼接成一个新 PDF。', error: 'PDF_MERGE_FAILED' },
  split: { label: '按页范围拆分', hint: '只对第 1 个文件生效，按范围导出为一个新 PDF。', error: 'PDF_SPLIT_FAILED' },
  rotate: { label: '旋转页面', hint: '只对第 1 个文件生效，在原有旋转角上累加。', error: 'PDF_ROTATE_FAILED' },
  remove: { label: '删除指定页', hint: '只对第 1 个文件生效，删除范围内的页（不能删空）。', error: 'PDF_REMOVE_FAILED' },
}
const MODE_OPTIONS = Object.entries(MODES).map(([value, item]) => ({ value, label: item.label }))
const ANGLE_OPTIONS = [{ value: 90, label: '顺时针 90°' }, { value: 180, label: '180°' }, { value: 270, label: '顺时针 270°（逆时针 90°）' }]

const fileInput = ref(null); const files = ref([])
const fileError = ref(''); const dragging = ref(false)
const mode = ref('info'); const pageRange = ref(''); const angle = ref(90)
const state = ref('empty'); const result = ref(null); const errorMessage = ref('')

const needsRange = computed(() => mode.value !== 'info' && mode.value !== 'merge')
const infoItems = computed(() => (result.value && result.value.kind === 'info' ? result.value.items : []))
const fileItem = computed(() => (result.value && result.value.kind === 'file' ? result.value : null))
const fileFields = computed(() => (fileItem.value ? [['输出页数', fileItem.value.pages], ['输出体积', formatBytes(fileItem.value.size)], ['文件名', fileItem.value.name]] : []))

function formatBytes(bytes) {
  if (!bytes) return '0 B'
  if (bytes < 1024) return `${bytes} B`
  return bytes < 1024 * 1024 ? `${(bytes / 1024).toFixed(1)} KB` : `${(bytes / 1024 / 1024).toFixed(2)} MB`
}

function formatDate(date) { return date instanceof Date ? date.toISOString().slice(0, 10) : '未写入' }
// 读文件前先校验大小/类型，避免一次读入超大文件把页面拖死。
function addFiles(list) {
  const accepted = []
  let message = ''
  for (const file of list) {
    if (file.type !== 'application/pdf' && !/\.pdf$/i.test(file.name)) message = `「${file.name}」不是 PDF，已跳过。`
    else if (file.size > MAX_FILE_BYTES) message = `「${file.name}」超过 ${formatBytes(MAX_FILE_BYTES)}，请先用其他工具压缩后再处理。`
    else accepted.push(file)
  }
  fileError.value = message
  if (!accepted.length) return
  const merged = files.value.concat(accepted)
  if (merged.length > MAX_FILES) fileError.value = `一次最多处理 ${MAX_FILES} 个文件，多出的已忽略。`
  files.value = merged.slice(0, MAX_FILES)
  resetResult()
}

function handleChange(event) { addFiles(Array.from(event.target.files || [])); event.target.value = '' }
function handleDrop(event) { dragging.value = false; addFiles(Array.from(event.dataTransfer.files || [])) }
function removeFile(index) { files.value = files.value.filter((_, position) => position !== index); resetResult() }
function resetResult() {
  if (result.value && result.value.url) URL.revokeObjectURL(result.value.url)
  result.value = null; state.value = 'empty'; errorMessage.value = ''
}

function reset() { files.value = []; fileError.value = ''; pageRange.value = ''; resetResult() }

// 「1-3,5,8-」→ 0 基页码数组；解析失败直接抛错，由 run 统一转成中文提示。
function parseRanges(text, total) {
  const raw = text.trim()
  if (!raw) return Array.from({ length: total }, (_, index) => index)
  const picked = []
  for (const part of raw.split(',')) {
    const token = part.trim()
    if (!token) continue
    const matched = /^(\d*)\s*-\s*(\d*)$/.exec(token)
    if (!matched && !/^\d+$/.test(token)) throw new Error(`页码范围「${token}」无法识别，示例：1-3,5,8-。`)
    const start = matched ? (matched[1] ? Number(matched[1]) : 1) : Number(token)
    const end = matched ? (matched[2] ? Number(matched[2]) : total) : start
    if (start < 1 || end > total || start > end) throw new Error(`页码范围「${token}」超出范围，该文件共 ${total} 页。`)
    for (let page = start; page <= end; page += 1) if (!picked.includes(page - 1)) picked.push(page - 1)
  }
  if (!picked.length) throw new Error('页码范围为空，示例：1-3,5。')
  return picked.sort((a, b) => a - b)
}

function buildBlob(bytes, name, summary, pages) {
  const blob = new Blob([bytes], { type: 'application/pdf' })
  return { kind: 'file', name, summary, size: blob.size, pages, url: URL.createObjectURL(blob) }
}

async function readInfo(PDFDocument, list) {
  const items = []
  let pages = 0
  for (const file of list) {
    const doc = await PDFDocument.load(await file.arrayBuffer())
    const count = doc.getPageCount()
    pages += count
    const fields = [['文件', file.name], ['页数', count], ['标题', doc.getTitle() || '未写入'], ['作者', doc.getAuthor() || '未写入'], ['创建时间', formatDate(doc.getCreationDate())]]
    items.push({ name: file.name, pages: count, fields })
  }
  return { kind: 'info', items, pages }
}

async function mergeFiles(PDFDocument, list) {
  const output = await PDFDocument.create()
  for (const file of list) {
    const source = await PDFDocument.load(await file.arrayBuffer())
    const pages = await output.copyPages(source, source.getPageIndices())
    pages.forEach((page) => output.addPage(page))
  }
  return buildBlob(await output.save(), `merged-${list.length}.pdf`, `已把 ${list.length} 个文件按顺序合并`, output.getPageCount())
}

async function splitFile(PDFDocument, file) {
  const source = await PDFDocument.load(await file.arrayBuffer())
  const indices = parseRanges(pageRange.value, source.getPageCount())
  const output = await PDFDocument.create()
  const pages = await output.copyPages(source, indices)
  pages.forEach((page) => output.addPage(page))
  return buildBlob(await output.save(), `${file.name.replace(/\.pdf$/i, '')}-split-${indices.length}p.pdf`, `从「${file.name}」导出 ${indices.length} 页`, indices.length)
}

async function rotateFile(PDFDocument, degrees, file) {
  const doc = await PDFDocument.load(await file.arrayBuffer())
  const indices = parseRanges(pageRange.value, doc.getPageCount())
  for (const index of indices) {
    const page = doc.getPage(index)
    page.setRotation(degrees((page.getRotation().angle + Number(angle.value)) % 360))
  }
  return buildBlob(await doc.save(), `${file.name.replace(/\.pdf$/i, '')}-rotated.pdf`, `旋转 ${indices.length} 页，每页 +${angle.value}°`, doc.getPageCount())
}

async function removePages(PDFDocument, file) {
  const doc = await PDFDocument.load(await file.arrayBuffer())
  const total = doc.getPageCount()
  const indices = parseRanges(pageRange.value, total)
  if (indices.length >= total) throw new Error('不能删除全部页面，至少要保留一页。')
  indices.slice().sort((a, b) => b - a).forEach((index) => doc.removePage(index))
  return buildBlob(await doc.save(), `${file.name.replace(/\.pdf$/i, '')}-removed-${indices.length}p.pdf`, `删除 ${indices.length} 页后剩余 ${doc.getPageCount()} 页`, doc.getPageCount())
}

async function run() {
  if (!files.value.length) return
  const startedAt = performance.now()
  resetResult()
  state.value = 'loading'
  try {
    // 动态引入：pdf-lib 体积较大，只在真正处理时才进 chunk。
    const { PDFDocument, degrees } = await import('pdf-lib')
    const list = files.value.slice()
    let output
    if (mode.value === 'info') output = await readInfo(PDFDocument, list)
    else if (mode.value === 'merge') output = await mergeFiles(PDFDocument, list)
    else if (mode.value === 'split') output = await splitFile(PDFDocument, list[0])
    else if (mode.value === 'rotate') output = await rotateFile(PDFDocument, degrees, list[0])
    else output = await removePages(PDFDocument, list[0])
    result.value = output
    state.value = 'success'
    usage.record({ durationMs: performance.now() - startedAt, meta: { mode: mode.value, files: list.length, pages: output.pages } })
  } catch (error) {
    state.value = 'error'
    errorMessage.value = describeError(error)
    usage.record({ durationMs: performance.now() - startedAt, ok: false, errorCode: MODES[mode.value].error })
  }
}

function describeError(error) {
  const message = error && error.message ? String(error.message) : ''
  if (/encrypted|encrypt/i.test(message)) return '该 PDF 已加密，需要先解密后再处理。'
  if (/password/i.test(message)) return '该 PDF 带打开密码，请先解除保护。'
  return message || '处理失败，请确认文件是有效的 PDF。'
}

function download() {
  if (!fileItem.value || !fileItem.value.url) return
  const link = document.createElement('a')
  link.href = fileItem.value.url; link.download = fileItem.value.name
  link.click()
}

onUnmounted(resetResult)
</script>
