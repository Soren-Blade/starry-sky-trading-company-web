<template>
  <ToolPageShell :title="PAGE.title" :eyebrow="PAGE.eyebrow" :description="PAGE.description" :icon="PAGE.icon" :requires-card="PAGE.requiresCard">
    <section class="ui-card tool-panel">
      <h2 class="tool-panel-title"><AppIcon name="image" aria-hidden="true" /><span>图片工具</span></h2>
      <label class="tool-file-drop" :class="{ 'tool-file-drop--active': dragging }" @dragover.prevent="dragging = true" @dragleave="dragging = false" @drop.prevent="handleDrop">
        <span class="tool-file-icon"><AppIcon name="image" /></span>
        <span class="tool-file-title">点击或拖拽图片到此处</span>
        <input ref="fileInput" class="tool-file-input" type="file" accept="image/*" @change="handleChange" />
      </label>

      <div v-if="imageUrl" class="tool-preview-media"><img ref="previewImg" :src="imageUrl" alt="preview" /></div>

      <div v-if="imageUrl" class="tool-form">
        <div class="u-field">
          <label class="u-field-label">操作</label>
          <SelectField v-model="imageOp" :options="opOptions" />
        </div>
        <div v-if="imageOp === 'compress'" class="u-field">
          <label class="u-field-label">质量 ({{ quality }}%)</label>
          <input v-model.number="quality" type="range" min="1" max="100" class="u-input" />
        </div>
        <div v-if="imageOp === 'resize'" class="tool-form">
          <div class="u-field"><label class="u-field-label">宽度 (px)</label><input v-model.number="resizeW" type="number" min="1" class="u-input" /></div>
          <div class="u-field"><label class="u-field-label">高度 (px)</label><input v-model.number="resizeH" type="number" min="1" class="u-input" /></div>
        </div>
        <div v-if="imageOp === 'format'" class="u-field">
          <label class="u-field-label">目标格式</label>
          <SelectField v-model="targetFormat" :options="formatOptions" />
        </div>
      </div>

      <div class="tool-actions">
        <button type="button" class="u-btn-primary" :disabled="!imageUrl" @click="process">处理</button>
        <button type="button" class="u-btn-secondary" :disabled="!resultUrl" @click="download">下载</button>
        <button type="button" class="u-btn-secondary" @click="clear">清空</button>
      </div>

      <div v-if="resultUrl" class="tool-preview-media">
        <p class="tool-result-note">处理结果</p>
        <img :src="resultUrl" alt="result" />
        <p class="tool-result-meta">
          <span class="tool-result-meta-item">原大小: <span class="tool-result-value">{{ originalSize }}</span></span>
          <span class="tool-result-meta-item">结果大小: <span class="tool-result-value">{{ resultSize }}</span></span>
        </p>
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
import SelectField from '@/components/SelectField.vue'
import ToolPageShell from '@/components/ToolPageShell.vue'
import { TOOL_PAGE, TOOL_PAGES } from '@/constants/index.js'

const PAGE = TOOL_PAGES['/media/image']
const dragging = ref(false)
const imageUrl = ref('')
const resultUrl = ref('')
const originalSize = ref('')
const resultSize = ref('')
const fileName = ref('')
const quality = ref(80)
const imageOp = ref('compress')
const resizeW = ref(800)
const resizeH = ref(600)
const targetFormat = ref('image/jpeg')

const opOptions = [
  { label: '压缩质量', value: 'compress' },
  { label: '调整尺寸', value: 'resize' },
  { label: '转换格式', value: 'format' },
  { label: '灰度化', value: 'grayscale' },
]
const formatOptions = [
  { label: 'JPEG', value: 'image/jpeg' },
  { label: 'PNG', value: 'image/png' },
  { label: 'WebP', value: 'image/webp' },
]

function handleDrop(e) {
  dragging.value = false
  const file = e.dataTransfer.files[0]
  if (file && file.type.startsWith('image/')) loadImage(file)
}
function handleChange(e) {
  const file = e.target.files[0]
  if (file) loadImage(file)
}
function loadImage(file) {
  fileName.value = file.name
  originalSize.value = formatBytes(file.size)
  const reader = new FileReader()
  reader.onload = (e) => {
    imageUrl.value = e.target.result
    resultUrl.value = ''
    const img = new Image()
    img.onload = () => {
      resizeW.value = img.naturalWidth
      resizeH.value = img.naturalHeight
    }
    img.src = e.target.result
  }
  reader.readAsDataURL(file)
}

function formatBytes(b) {
  if (b < 1024) return b + ' B'
  if (b < 1024 * 1024) return (b / 1024).toFixed(1) + ' KB'
  return (b / (1024 * 1024)).toFixed(2) + ' MB'
}

function process() {
  if (!imageUrl.value) return
  const img = new Image()
  img.onload = () => {
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    let w = img.naturalWidth
    let h = img.naturalHeight

    if (imageOp.value === 'resize') {
      w = resizeW.value || w
      h = resizeH.value || h
    }

    canvas.width = w
    canvas.height = h

    if (imageOp.value === 'grayscale') {
      ctx.filter = 'grayscale(100%)'
    }

    ctx.drawImage(img, 0, 0, w, h)

    let mime = 'image/jpeg'
    let q = quality.value / 100
    if (imageOp.value === 'format') {
      mime = targetFormat.value
    } else if (imageUrl.value.includes('image/png')) {
      mime = 'image/png'
      q = undefined
    }

    const dataUrl = canvas.toDataURL(mime, q)
    resultUrl.value = dataUrl
    const head = 'data:' + mime + ';base64,'
    const size = Math.round((dataUrl.length - head.length) * 3 / 4)
    resultSize.value = formatBytes(size)
  }
  img.src = imageUrl.value
}

function download() {
  if (!resultUrl.value) return
  const a = document.createElement('a')
  a.href = resultUrl.value
  const ext = imageOp.value === 'format'
    ? (targetFormat.value === 'image/png' ? 'png' : targetFormat.value === 'image/webp' ? 'webp' : 'jpg')
    : 'jpg'
  a.download = 'processed_' + (fileName.value.replace(/\.[^.]+$/, '') || 'image') + '.' + ext
  a.click()
}

function clear() {
  imageUrl.value = ''
  resultUrl.value = ''
  dragging.value = false
  originalSize.value = ''
  resultSize.value = ''
  fileName.value = ''
}
</script>
