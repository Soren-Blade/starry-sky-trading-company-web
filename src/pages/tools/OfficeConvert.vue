<template>
  <ToolPageShell :title="PAGE.title" :eyebrow="PAGE.eyebrow" :description="PAGE.description" :icon="PAGE.icon" :requires-card="PAGE.requiresCard">
    <section class="ui-card tool-panel">
      <h2 class="tool-panel-title"><AppIcon name="files" aria-hidden="true" /><span>{{ PAGE.inputTitle }}</span></h2>
      <div class="u-field">
        <label class="u-field-label">选择文档</label>
        <div class="office-dropzone" @click="triggerFile" @dragover.prevent @drop.prevent="handleDrop">
          <input ref="fileInput" type="file" style="display:none" @change="handleFile" />
          <AppIcon name="upload" aria-hidden="true" />
          <p>点击选择文件，或将文件拖放到此处</p>
          <p class="office-hint">支持格式：DOC、DOCX、XLS、XLSX、PPT、PPTX、PDF</p>
        </div>
        <p v-if="fileName" class="office-file">已选择：{{ fileName }}</p>
      </div>
      <div class="u-field">
        <label class="u-field-label">目标格式</label>
        <SelectField v-model="targetFormat" :options="formatOptions" />
      </div>
      <div class="tool-actions">
        <button type="button" class="u-btn-primary" :disabled="!fileName" @click="process">{{ PAGE.submit }}</button>
        <button type="button" class="u-btn-secondary" @click="clear">{{ PAGE.reset }}</button>
      </div>
    </section>

    <section class="ui-card tool-panel">
      <h2 class="tool-panel-title"><AppIcon name="check-circle" aria-hidden="true" /><span>{{ PAGE.resultTitle }}</span></h2>
      <ToolResultPane :state="result ? 'success' : 'empty'" :title="PAGE.emptyTitle" :description="PAGE.emptyDesc" icon="files">
        <template v-if="result"><pre class="tool-preview">{{ result }}</pre></template>
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
import { useToolUsage } from '@/hooks/useToolUsage/index.js'

const PAGE = TOOL_PAGES['/office/convert']
const usage = useToolUsage('/office/convert')
const fileName = ref('')
const targetFormat = ref('pdf')
const result = ref('')
const copyState = ref('idle')
const fileInput = ref(null)

const formatOptions = [
  { label: 'PDF', value: 'pdf' },
  { label: 'DOCX', value: 'docx' },
  { label: 'XLSX', value: 'xlsx' },
  { label: 'PPTX', value: 'pptx' },
  { label: 'TXT', value: 'txt' },
]

const copyLabel = computed(() => copyState.value === 'ok' ? TOOL_RESULT.copied : copyState.value === 'fail' ? TOOL_RESULT.copyFailed : TOOL_RESULT.copy)

function triggerFile() { fileInput.value?.click() }

function handleFile(e) {
  const file = e.target.files?.[0]
  if (file) { fileName.value = file.name }
}

function handleDrop(e) {
  const file = e.dataTransfer.files?.[0]
  if (file) { fileName.value = file.name }
}

function process() {
  if (!fileName.value) return
  const startedAt = performance.now()
  result.value = `文档转换功能开发中\n\n源文件：${fileName.value}\n目标格式：${targetFormat.value.toUpperCase()}\n\n由于纯前端环境无法直接处理 Office 文档格式转换，此功能需要服务端支持。\n\n支持的转换方向（计划）：\n- Word (DOC/DOCX) 与 PDF 互转\n- Excel (XLS/XLSX) 与 CSV/JSON 互转\n- PowerPoint (PPT/PPTX) 与 PDF 互转\n- PDF 转 Word/Excel（部分支持）\n\n敬请期待后续版本更新。`
  copyState.value = 'idle'
  usage.record({ ok: false, errorCode: 'OFFICE_CONVERT_UNSUPPORTED', durationMs: performance.now() - startedAt, meta: { target: targetFormat.value.toUpperCase() } })
}

function clear() { fileName.value = ''; result.value = ''; copyState.value = 'idle'; if (fileInput.value) fileInput.value.value = '' }
async function copy() { if (!result.value) return; try { await navigator.clipboard.writeText(result.value); copyState.value = 'ok' } catch (e) { copyState.value = 'fail' } }
</script>

<style scoped>
.office-dropzone { display: flex; flex-direction: column; align-items: center; gap: calc(var(--space-unit)); padding: calc(var(--space-unit) * 4); border: 2px dashed var(--border); border-radius: var(--radius-card); cursor: pointer; transition: border-color 0.2s, background 0.2s; }
.office-dropzone:hover { border-color: var(--accent); background: var(--bg-surface-2); }
.office-dropzone svg { width: 40px; height: 40px; color: var(--text-secondary); }
.office-dropzone p { margin: 0; color: var(--text-primary); font-size: var(--fs-sm); }
.office-hint { color: var(--text-secondary); font-size: var(--fs-label); }
.office-file { margin-top: calc(var(--space-unit)); font-size: var(--fs-sm); color: var(--text-secondary); }
</style>
