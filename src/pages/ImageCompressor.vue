<template>
  <ToolPageShell :title="PAGE.title" :eyebrow="PAGE.eyebrow" :description="PAGE.description" :icon="PAGE.icon" :requires-card="PAGE.requiresCard">
    <section class="ui-card tool-panel">
      <h2 class="tool-panel-title"><AppIcon name="image" aria-hidden="true" /><span>{{ PAGE.inputTitle }}</span></h2>
      <label
        class="tool-file-drop"
        :class="{ 'tool-file-drop--active': dragging }"
        @dragover.prevent="dragging = true"
        @dragleave="dragging = false"
        @drop.prevent="handleDrop"
      >
        <span class="tool-file-icon"><AppIcon name="image" /></span>
        <span class="tool-file-title">{{ PAGE.dropTitle }}</span>
        <span class="tool-result-note">{{ PAGE.dropHint }}</span>
        <input ref="fileInput" class="tool-file-input" type="file" accept="image/jpeg,image/png,image/webp" @change="handleChange" />
      </label>
      <p v-if="fileError" class="u-field-error" role="alert">{{ fileError }}</p>
      <p v-if="fileName" class="tool-file-name"><AppIcon name="check-circle" aria-hidden="true" /><span>{{ fileName }}（{{ formatBytes(fileSize) }}）</span></p>
      <div v-if="previewUrl" class="tool-preview-media">
        <img :src="previewUrl" alt="待压缩的图片" />
      </div>
    </section>

    <section class="ui-card tool-panel">
      <h2 class="tool-panel-title"><AppIcon name="wrench" aria-hidden="true" /><span>压缩参数</span></h2>
      <div class="tool-form">
        <div class="u-field">
          <label class="u-field-label" for="cmp-target">目标体积（KB）</label>
          <input id="cmp-target" v-model="targetKb" class="u-input" type="number" min="10" max="5120" step="10" />
          <p class="u-field-hint">允许 ±10% 误差，最多编码 {{ MAX_ROUNDS }} 次逼近这个体积。</p>
        </div>
        <div class="u-field">
          <label class="u-field-label" for="cmp-format">{{ PAGE.formatLabel }}</label>
          <SelectField id="cmp-format" v-model="format" :options="FORMAT_OPTIONS" aria-label="输出格式" />
          <p class="u-field-hint">PNG 是无损格式，质量参数无效，所以这里只提供 JPEG 与 WebP。</p>
        </div>
      </div>
      <div class="tool-actions">
        <button type="button" class="u-btn-primary" :disabled="!file || state === 'loading'" @click="compress">
          {{ state === 'loading' ? '压缩中…' : PAGE.submit }}
        </button>
        <button type="button" class="u-btn-secondary" :disabled="state === 'loading'" @click="reset">{{ PAGE.reset }}</button>
      </div>
    </section>

    <section class="ui-card tool-panel">
      <h2 class="tool-panel-title"><AppIcon name="clipboard" aria-hidden="true" /><span>{{ PAGE.resultTitle }}</span></h2>
      <ToolResultPane :state="state" :title="PAGE.emptyTitle" :description="PAGE.emptyDesc" :error="errorMessage" loading-text="正在重新编码并搜索质量参数…">
        <div v-if="result" class="tool-result-meta">
          <span class="tool-result-meta-item"><span>{{ META.originalSize }}</span><strong>{{ formatBytes(fileSize) }}</strong></span>
          <span class="tool-result-meta-item"><span>{{ META.outputSize }}</span><strong>{{ formatBytes(result.outputBytes) }}</strong></span>
          <span class="tool-result-meta-item"><span>{{ SAVED_LABEL }}</span><strong>{{ relativePercent }}</strong></span>
          <span class="tool-result-meta-item"><span>{{ META.quality }}</span><strong>{{ Math.round(result.quality * 100) }}%</strong></span>
        </div>
        <p v-if="result" class="tool-result-note">
          {{ result.met ? '已命中目标体积（±10%）。' : `在质量范围内最接近目标：${formatBytes(result.outputBytes)}，未落入 ±10% 容差。` }}
        </p>
        <p v-if="result" class="tool-result-note">{{ RESULT_NOTE }}</p>
        <div v-if="result" class="tool-preview-media">
          <img :src="result.url" alt="压缩后的图片" />
        </div>
        <template #actions>
          <button v-if="result" type="button" class="u-btn-primary" @click="download">{{ PAGE.download }}</button>
        </template>
      </ToolResultPane>
    </section>

    <template #aside>
      <div class="ui-card tool-aside-card">
        <h3 class="tool-aside-title"><span class="tool-aside-title-icon"><AppIcon name="info" aria-hidden="true" /></span><span>{{ TOOL_PAGE.usageTitle }}</span></h3>
        <ul class="tool-aside-list"><li v-for="(item, index) in ASIDE_ITEMS" :key="index">{{ item }}</li></ul>
      </div>
      <div class="ui-card tool-aside-card">
        <h3 class="tool-aside-title"><span class="tool-aside-title-icon"><AppIcon name="alert-triangle" aria-hidden="true" /></span><span>{{ TOOL_PAGE.noticeTitle }}</span></h3>
        <p class="tool-aside-note">体积下限受图片分辨率限制：质量降到 {{ Math.round(QUALITY_MIN * 100) }}% 仍超出目标时，需要先缩小尺寸（可用图片工具箱的缩放/裁剪）。</p>
      </div>
    </template>
  </ToolPageShell>
</template>

<script setup>
import { computed, onUnmounted, ref } from 'vue'
import AppIcon from '@/components/AppIcon.vue'
import SelectField from '@/components/SelectField.vue'
import ToolPageShell from '@/components/ToolPageShell.vue'
import ToolResultPane from '@/components/ToolResultPane.vue'
import { TOOL_PAGE, TOOL_PAGES, TOOL_RESULT } from '@/constants/index.js'
import { useToolUsage } from '@/hooks/useToolUsage/index.js'

const PAGE = TOOL_PAGES['/image/compressor']
const usage = useToolUsage('/image/compressor')

const META = TOOL_RESULT.meta
// 常量表里的 resultNote / asideItems 还写着「按档位系数估算」，页面内覆盖为真实口径，不改 constants。
const RESULT_NOTE = '在浏览器内重新编码，画质由质量参数决定；体积是按真实编码结果逐步逼近出来的。'
const SAVED_LABEL = '体积变化'
const ASIDE_ITEMS = ['按目标体积二分搜索质量参数（0.30 – 0.95），最多 8 次真实编码。', '显示的是编码后的实际字节数，不是估算。', '图片不上传服务器，压缩结果可直接下载。']
const ACCEPT_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const FORMAT_OPTIONS = [
  { value: 'jpeg', label: 'JPEG' },
  { value: 'webp', label: 'WebP' },
]
const MIME = { jpeg: 'image/jpeg', webp: 'image/webp' }
const EXT = { jpeg: 'jpg', webp: 'webp' }
const MAX_BYTES = 5 * 1024 * 1024
const MAX_ROUNDS = 8
const TOLERANCE = 0.1
const QUALITY_MIN = 0.3
const QUALITY_MAX = 0.95

const fileInput = ref(null)
const file = ref(null)
const fileName = ref('')
const fileSize = ref(0)
const previewUrl = ref('')
const targetKb = ref('200')
const format = ref('jpeg')
const dragging = ref(false)
const fileError = ref('')
const state = ref('empty')
const result = ref(null)
const errorMessage = ref('')

function formatBytes(bytes) {
  if (!bytes) return '0 B'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`
}

// 体积变化按真实编码结果算：正数表示变小，负数表示反而变大（此时页面会提示换格式或先缩尺寸）。
const relativePercent = computed(() => {
  if (!result.value || !fileSize.value) return '—'
  const delta = (1 - result.value.outputBytes / fileSize.value) * 100
  return delta >= 0 ? `-${delta.toFixed(1)}%` : `+${Math.abs(delta).toFixed(1)}%`
})

function releasePreview() {
  if (previewUrl.value) URL.revokeObjectURL(previewUrl.value)
  previewUrl.value = ''
}

function releaseResult() {
  if (result.value) URL.revokeObjectURL(result.value.url)
  result.value = null
}

function acceptFile(next) {
  releaseResult()
  releasePreview()
  fileError.value = ''
  state.value = 'empty'
  if (!next) return
  if (!ACCEPT_TYPES.includes(next.type)) {
    fileError.value = PAGE.invalidType
    usage.record({ ok: false, errorCode: 'IMAGE_COMPRESS_INVALID_TYPE' })
    return
  }
  if (next.size > MAX_BYTES) {
    fileError.value = PAGE.invalidSize
    usage.record({ ok: false, errorCode: 'IMAGE_COMPRESS_TOO_LARGE', meta: { size: next.size } })
    return
  }
  file.value = next
  fileName.value = next.name
  fileSize.value = next.size
  previewUrl.value = URL.createObjectURL(next)
}

function handleChange(event) {
  acceptFile((event.target.files || [])[0])
  event.target.value = ''
}

function handleDrop(event) {
  dragging.value = false
  acceptFile((event.dataTransfer.files || [])[0])
}

function loadImage(url) {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error('图片解码失败，请确认文件没有损坏。'))
    image.src = url
  })
}

function encode(canvas, mime, quality) {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob)
      else reject(new Error('浏览器拒绝了本次编码，请换一种输出格式。'))
    }, mime, quality)
  })
}

// 质量越高体积越大，是单调关系，所以能二分；每一轮都是真实 toBlob，不是比例估算。
async function searchQuality(canvas, mime, target) {
  let low = QUALITY_MIN
  let high = QUALITY_MAX
  let best = null
  for (let round = 0; round < MAX_ROUNDS; round += 1) {
    const quality = Number(((low + high) / 2).toFixed(3))
    const blob = await encode(canvas, mime, quality)
    const current = { blob, quality }
    if (!best || Math.abs(blob.size - target) < Math.abs(best.blob.size - target)) best = current
    if (Math.abs(blob.size - target) <= target * TOLERANCE) return current
    if (blob.size > target) high = quality
    else low = quality
    if (high - low <= 0.02) break
  }
  return best
}

async function compress() {
  if (!file.value || !previewUrl.value) return
  const target = Math.max(10, Number(targetKb.value) || 200) * 1024
  const startedAt = performance.now()
  releaseResult()
  state.value = 'loading'
  errorMessage.value = ''
  try {
    const image = await loadImage(previewUrl.value)
    const canvas = document.createElement('canvas')
    canvas.width = image.naturalWidth
    canvas.height = image.naturalHeight
    const context = canvas.getContext('2d')
    if (!context) throw new Error('当前浏览器不支持 canvas 2D，无法压缩。')
    context.drawImage(image, 0, 0)
    const mime = MIME[format.value]
    const best = await searchQuality(canvas, mime, target)
    if (!best) throw new Error('编码没有产出有效结果，请换一张图片再试。')
    result.value = {
      url: URL.createObjectURL(best.blob),
      outputBytes: best.blob.size,
      quality: best.quality,
      met: Math.abs(best.blob.size - target) <= target * TOLERANCE,
      name: `${file.value.name.replace(/\.[^.]+$/, '')}-compressed.${EXT[format.value]}`,
    }
    state.value = 'success'
    usage.record({ durationMs: performance.now() - startedAt, meta: { originalSize: fileSize.value, outputSize: best.blob.size, quality: best.quality } })
  } catch (error) {
    state.value = 'error'
    errorMessage.value = error && error.message ? error.message : '压缩失败，请换一张图片再试。'
    usage.record({ durationMs: performance.now() - startedAt, ok: false, errorCode: 'IMAGE_COMPRESS_FAILED' })
  }
}

function download() {
  if (!result.value) return
  const link = document.createElement('a')
  link.href = result.value.url
  link.download = result.value.name
  link.click()
}

function reset() {
  releaseResult()
  releasePreview()
  file.value = null
  fileName.value = ''
  fileSize.value = 0
  fileError.value = ''
  state.value = 'empty'
  errorMessage.value = ''
}

onUnmounted(() => {
  releasePreview()
  releaseResult()
})
</script>
