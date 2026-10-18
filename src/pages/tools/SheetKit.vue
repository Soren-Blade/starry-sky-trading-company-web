<template>
  <ToolPageShell :title="PAGE.title" :eyebrow="PAGE.eyebrow" :description="PAGE.description" :icon="PAGE.icon" :requires-card="PAGE.requiresCard">
    <section class="ui-card tool-panel">
      <h2 class="tool-panel-title"><AppIcon name="table" aria-hidden="true" /><span>{{ PAGE.inputTitle }}</span></h2>
      <label class="tool-file-drop" :class="{ 'tool-file-drop--active': dragging }" @dragover.prevent="dragging = true" @dragleave="dragging = false" @drop.prevent="handleDrop">
        <span class="tool-file-icon"><AppIcon name="table" /></span>
        <span class="tool-file-title">点击选择或拖入表格文件（.xlsx / .xls / .csv）</span>
        <input ref="fileInput" class="tool-file-input" type="file" accept=".xlsx,.xls,.csv" @change="handleChange" />
      </label>
      <p v-if="fileError" class="u-field-error" role="alert">{{ fileError }}</p>
      <p v-if="fileName" class="tool-file-name"><AppIcon name="check-circle" aria-hidden="true" /><span>{{ fileName }}（{{ formatBytes(fileBytes) }}）</span></p>
      <p class="tool-result-note">解析在浏览器内完成，文件不会上传；上限 {{ formatBytes(MAX_FILE_BYTES) }}，表格只渲染前 {{ PREVIEW_ROWS }} 行。</p>
      <p v-if="!sheets.length" class="tool-result-note">选好文件后，这里会列出文件里的每个工作表，可单选或多选对比。</p>
      <div v-else class="sheet-picker">
        <label v-for="sheet in sheets" :key="sheet.name" class="sheet-pick" :class="{ 'sheet-pick--on': selected.includes(sheet.name) }">
          <input type="checkbox" :checked="selected.includes(sheet.name)" @change="toggleSheet(sheet.name)" />
          <span class="sheet-pick-name">{{ sheet.name }}</span>
          <span class="sheet-pick-meta">{{ sheet.totalRows }} 行 × {{ sheet.totalCols }} 列</span>
        </label>
      </div>
      <div class="tool-actions">
        <button type="button" class="u-btn-secondary" :disabled="state === 'loading' || !selected.length" @click="exportCsv(selected[0])">导出「{{ selected[0] || '未选' }}」为 CSV</button>
        <button type="button" class="u-btn-secondary" :disabled="state === 'loading' || !sheets.length" @click="reset">清空</button>
      </div>
    </section>

    <section class="ui-card tool-panel">
      <h2 class="tool-panel-title"><AppIcon name="clipboard" aria-hidden="true" /><span>{{ PAGE.resultTitle }}</span></h2>
      <ToolResultPane :state="state" :title="PAGE.resultTitle" :error="errorMessage" loading-text="正在解析工作簿…">
        <div v-for="sheet in visibleSheets" :key="sheet.name" class="sheet-block">
          <div class="sheet-block-head">
            <h3 class="sheet-block-title">{{ sheet.name }}</h3>
            <span class="tool-result-note">共 {{ sheet.totalRows }} 行 × {{ sheet.totalCols }} 列，显示前 {{ sheet.body.length }} 行</span>
            <button type="button" class="u-btn-secondary" @click="exportCsv(sheet.name)">导出 CSV</button>
          </div>
          <div class="sheet-scroll">
            <table class="sheet-table">
              <thead><tr><th v-for="(cell, index) in sheet.header" :key="index">{{ cell || `第 ${index + 1} 列` }}<span class="sheet-type">{{ sheet.types[index] }}</span></th></tr></thead>
              <tbody><tr v-for="(row, rowIndex) in sheet.body" :key="rowIndex"><td v-for="(cell, cellIndex) in sheet.header" :key="cellIndex">{{ row[cellIndex] ?? '' }}</td></tr></tbody>
            </table>
          </div>
        </div>
        <p v-if="visibleSheets.length" class="tool-result-note">列类型按前 {{ PREVIEW_ROWS }} 行采样推断，仅作参考。</p>
      </ToolResultPane>
    </section>

    <template #aside>
      <section class="ui-card tool-aside-card">
        <h3 class="tool-aside-title"><AppIcon name="info" aria-hidden="true" /> {{ TOOL_PAGE.usageTitle }}</h3>
        <ul class="tool-aside-list"><li v-for="(item, index) in ASIDE_ITEMS" :key="index">{{ item }}</li></ul>
      </section>
      <section class="ui-card tool-aside-card">
        <h3 class="tool-aside-title"><AppIcon name="alert-triangle" aria-hidden="true" /> {{ TOOL_PAGE.noticeTitle }}</h3>
        <p class="tool-aside-note">带密码的加密工作簿无法解析，需要先在 Excel 里解除密码；宏（.xlsm）里的 VBA 代码本页不执行。</p>
      </section>
    </template>
  </ToolPageShell>
</template>

<script setup>
import { computed, ref } from 'vue'
import AppIcon from '@/components/AppIcon.vue'
import ToolPageShell from '@/components/ToolPageShell.vue'
import ToolResultPane from '@/components/ToolResultPane.vue'
import { TOOL_PAGE, TOOL_PAGES } from '@/constants/index.js'
import { useToolUsage } from '@/hooks/useToolUsage/index.js'

const PAGE = TOOL_PAGES['/office/sheet']
const usage = useToolUsage('/office/sheet')
const ASIDE_ITEMS = ['解析 .xlsx / .xls / .csv，列出每个工作表。', '可多选工作表并排对比前 200 行。', '所选工作表可导出为 CSV。']
const MAX_FILE_BYTES = 10 * 1024 * 1024
const PREVIEW_ROWS = 200
const fileInput = ref(null); const dragging = ref(false); const fileError = ref('')
const fileName = ref(''); const fileBytes = ref(0)
const sheets = ref([]); const selected = ref([])
const state = ref('empty'); const errorMessage = ref('')
// 工作簿对象放在普通变量里，避免 Vue 深度代理几十万单元格的数组。
let workbookCache = null

const visibleSheets = computed(() => sheets.value.filter((sheet) => selected.value.includes(sheet.name)))

function formatBytes(bytes) {
  if (!bytes) return '0 B'
  if (bytes < 1024) return `${bytes} B`
  return bytes < 1024 * 1024 ? `${(bytes / 1024).toFixed(1)} KB` : `${(bytes / 1024 / 1024).toFixed(2)} MB`
}

function toggleSheet(name) {
  selected.value = selected.value.includes(name) ? selected.value.filter((item) => item !== name) : selected.value.concat(name)
}

function reset() {
  workbookCache = null
  sheets.value = []; selected.value = []
  fileName.value = ''; fileBytes.value = 0; fileError.value = ''
  state.value = 'empty'; errorMessage.value = ''
}

// 只推断「数值 / 文本 / 空」三类：日期在表格里同样是文本展示，没必要假装能还原格式。
function inferTypes(rows, columnCount) {
  const types = []
  for (let column = 0; column < columnCount; column += 1) {
    let samples = 0
    let numeric = 0
    for (const row of rows) {
      const value = row[column]
      if (value === '' || value === null || value === undefined) continue
      samples += 1
      if (typeof value === 'number' || /^-?\d+(\.\d+)?$/.test(String(value).trim())) numeric += 1
    }
    types.push(!samples ? '空' : numeric / samples >= 0.8 ? '数值' : '文本')
  }
  return types
}

async function parseFile(file) {
  const startedAt = performance.now()
  state.value = 'loading'
  errorMessage.value = ''
  try {
    // 动态引入：xlsx 打包后上百 KB，只在真正解析时才加载。
    const XLSX = await import('xlsx')
    const workbook = XLSX.read(new Uint8Array(await file.arrayBuffer()), { type: 'array' })
    workbookCache = workbook
    const parsed = workbook.SheetNames.map((name) => {
      const rows = XLSX.utils.sheet_to_json(workbook.Sheets[name], { header: 1, defval: '', blankrows: false })
      const columnCount = rows.reduce((max, row) => Math.max(max, row.length), 0)
      // 首行当表头（表格文件默认如此），并补齐到列宽，避免短行导致整列不渲染。
      const header = Array.from({ length: columnCount }, (_, index) => (rows[0] && rows[0][index] !== undefined ? rows[0][index] : ''))
      return {
        name, header, body: rows.slice(1, PREVIEW_ROWS + 1), totalRows: Math.max(rows.length - 1, 0), totalCols: columnCount,
        // 跳过表头再采样：表头是文字，混进来会把「金额」这类列误判成文本
        types: inferTypes(rows.slice(1, PREVIEW_ROWS + 1), columnCount),
      }
    })
    sheets.value = parsed
    selected.value = parsed.length ? [parsed[0].name] : []
    state.value = 'success'
    usage.record({ durationMs: performance.now() - startedAt, meta: { sheets: parsed.length, rows: parsed.reduce((sum, sheet) => sum + sheet.totalRows, 0) } })
  } catch (error) {
    state.value = 'error'
    sheets.value = []
    selected.value = []
    workbookCache = null
    errorMessage.value = describeError(error)
    usage.record({ durationMs: performance.now() - startedAt, ok: false, errorCode: 'SHEET_PARSE_FAILED' })
  }
}

function describeError(error) {
  const message = error && error.message ? String(error.message) : ''
  if (/password|encrypt/i.test(message)) return '这个工作簿有密码保护，需要先在 Excel 里解除密码。'
  if (/Unsupported|zip|corrupt/i.test(message)) return '文件结构无法识别，请确认是未损坏的 .xlsx / .xls / .csv。'
  return message || '解析失败，请换一个文件再试。'
}

function acceptFile(file) {
  fileError.value = ''
  if (!file) return
  if (!/\.(xlsx|xls|csv)$/i.test(file.name)) {
    fileError.value = '只支持 .xlsx / .xls / .csv，其他格式请先转换。'
    usage.record({ ok: false, errorCode: 'SHEET_PARSE_FAILED', meta: { reason: 'type' } })
    return
  }
  if (file.size > MAX_FILE_BYTES) {
    fileError.value = `文件 ${formatBytes(file.size)} 超过 ${formatBytes(MAX_FILE_BYTES)}，请先拆分或压缩。`
    usage.record({ ok: false, errorCode: 'SHEET_PARSE_FAILED', meta: { reason: 'size' } })
    return
  }
  fileName.value = file.name
  fileBytes.value = file.size
  parseFile(file)
}

function handleChange(event) { acceptFile((event.target.files || [])[0]); event.target.value = '' }
function handleDrop(event) { dragging.value = false; acceptFile((event.dataTransfer.files || [])[0]) }

async function exportCsv(name) {
  const sheet = workbookCache && workbookCache.Sheets[name]
  if (!sheet) return
  try {
    const XLSX = await import('xlsx')
    const url = URL.createObjectURL(new Blob([`\uFEFF${XLSX.utils.sheet_to_csv(sheet)}`], { type: 'text/csv;charset=utf-8' }))
    const link = document.createElement('a')
    link.href = url
    link.download = `${name}.csv`
    link.click()
    URL.revokeObjectURL(url)
  } catch (error) {
    errorMessage.value = `导出失败：${error && error.message ? error.message : '请重试'}`
  }
}
</script>

<style scoped>
.sheet-picker { display: flex; flex-wrap: wrap; gap: calc(var(--space-unit)); }
.sheet-pick { display: inline-flex; align-items: center; gap: calc(var(--space-unit) * 0.5); padding: calc(var(--space-unit) * 0.5) calc(var(--space-unit)); border: var(--stroke-width) solid var(--border); border-radius: var(--radius-pill); font-size: var(--fs-sm); color: var(--text-secondary); cursor: pointer; }
.sheet-pick--on { border-color: var(--accent); color: var(--accent-strong); background: var(--accent-soft); }
.sheet-pick-name { font-weight: var(--fw-label); }
.sheet-pick-meta { font-size: var(--fs-label); color: var(--text-muted); }
.sheet-block { display: flex; flex-direction: column; gap: calc(var(--space-unit)); margin-bottom: calc(var(--space-unit) * 2); }
.sheet-block-head { display: flex; align-items: center; gap: calc(var(--space-unit)); flex-wrap: wrap; }
.sheet-block-title { margin: 0; font-size: var(--fs-body); color: var(--text-primary); }
.sheet-scroll { overflow: auto; max-height: calc(var(--space-unit) * 45); border: var(--stroke-width) solid var(--border); border-radius: var(--radius-input); }
.sheet-table { width: 100%; border-collapse: collapse; font-size: var(--fs-sm); }
.sheet-table th,
.sheet-table td { padding: calc(var(--space-unit) * 0.5) calc(var(--space-unit)); border-bottom: var(--stroke-width) solid var(--divider); text-align: left; white-space: nowrap; color: var(--text-secondary); }
.sheet-table th { position: sticky; top: 0; background: var(--bg-surface-2); color: var(--text-primary); }
.sheet-type { margin-left: calc(var(--space-unit) * 0.5); font-size: var(--fs-label); color: var(--accent); }
</style>
