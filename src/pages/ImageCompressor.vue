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
        <img :src="previewUrl" :alt="t('imageCompressor.previewAlt')" />
      </div>
    </section>

    <section class="ui-card tool-panel">
      <h2 class="tool-panel-title"><AppIcon name="wrench" aria-hidden="true" /><span>{{ t('imageCompressor.paramsTitle') }}</span></h2>
      <div class="tool-form">
        <div class="u-field">
          <label class="u-field-label" for="cmp-target">{{ t('imageCompressor.targetLabel') }}</label>
          <input id="cmp-target" v-model="targetKb" class="u-input" type="number" min="10" max="5120" step="10" />
          <p class="u-field-hint">{{ t('imageCompressor.toleranceHint', { rounds: MAX_ROUNDS }) }}</p>
        </div>
        <div class="u-field">
          <label class="u-field-label" for="cmp-format">{{ PAGE.formatLabel }}</label>
          <SelectField id="cmp-format" v-model="format" :options="FORMAT_OPTIONS" :aria-label="t('imageCompressor.formatAria')" />
          <p class="u-field-hint">{{ t('imageCompressor.pngHint') }}</p>
        </div>
      </div>
      <div class="tool-actions">
        <button type="button" class="u-btn-primary" :disabled="!file || state === 'loading'" @click="compress">
          {{ state === 'loading' ? t('imageCompressor.compressing') : PAGE.submit }}
        </button>
        <button type="button" class="u-btn-secondary" :disabled="state === 'loading'" @click="reset">{{ PAGE.reset }}</button>
      </div>
    </section>

    <section class="ui-card tool-panel">
      <h2 class="tool-panel-title"><AppIcon name="clipboard" aria-hidden="true" /><span>{{ PAGE.resultTitle }}</span></h2>
      <ToolResultPane :state="state" :title="PAGE.emptyTitle" :description="PAGE.emptyDesc" :error="errorMessage" :loading-text="t('imageCompressor.encoding')">
        <div v-if="result" class="tool-result-meta">
          <span class="tool-result-meta-item"><span>{{ META.originalSize }}</span><strong>{{ formatBytes(fileSize) }}</strong></span>
          <span class="tool-result-meta-item"><span>{{ META.outputSize }}</span><strong>{{ formatBytes(result.outputBytes) }}</strong></span>
          <span class="tool-result-meta-item"><span>{{ SAVED_LABEL }}</span><strong>{{ relativePercent }}</strong></span>
          <span class="tool-result-meta-item"><span>{{ META.quality }}</span><strong>{{ Math.round(result.quality * 100) }}%</strong></span>
        </div>
        <p v-if="result" class="tool-result-note">
          {{ result.met ? t('imageCompressor.metTarget') : t('imageCompressor.closestNotMet', { size: formatBytes(result.outputBytes) }) }}
        </p>
        <p v-if="result" class="tool-result-note">{{ RESULT_NOTE }}</p>
        <div v-if="result" class="tool-preview-media">
          <img :src="result.url" :alt="t('imageCompressor.outputAlt')" />
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
        <p class="tool-aside-note">{{ t('imageCompressor.asideNote', { quality: Math.round(QUALITY_MIN * 100) }) }}</p>
      </div>
    </template>
  </ToolPageShell>
</template>

<script setup>
import { formatBytes, sizeDeltaLabel } from '@/utils/format.js'
import { computed, onUnmounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import AppIcon from '@/components/AppIcon.vue'
import SelectField from '@/components/SelectField.vue'
import ToolPageShell from '@/components/ToolPageShell.vue'
import ToolResultPane from '@/components/ToolResultPane.vue'
import { TOOL_PAGE, TOOL_PAGES, TOOL_RESULT } from '@/constants/index.js'
import { useToolUsage } from '@/hooks/useToolUsage/index.js'

const PAGE = TOOL_PAGES['/image/compressor']
const usage = useToolUsage('/image/compressor')
const { t, tm } = useI18n()

const META = TOOL_RESULT.meta
// 常量表里的 resultNote / asideItems 还写着「按档位系数估算」，页面内覆盖为真实口径，不改 constants。
const RESULT_NOTE = computed(() => t('imageCompressor.resultNote'))
const SAVED_LABEL = computed(() => t('imageCompressor.savedLabel'))
const ASIDE_ITEMS = computed(() => tm('imageCompressor.asideItems'))
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

// 体积变化按真实编码结果算：正数表示变小，负数表示反而变大（此时页面会提示换格式或先缩尺寸）。
const relativePercent = computed(() => (result.value ? sizeDeltaLabel(fileSize.value, result.value.outputBytes) : '—'))

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
    image.onerror = () => reject(new Error(t('imageCompressor.errorDecode')))
    image.src = url
  })
}

function encode(canvas, mime, quality) {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob)
      else reject(new Error(t('imageCompressor.errorEncode')))
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
    if (!context) throw new Error(t('imageCompressor.errorCanvas'))
    context.drawImage(image, 0, 0)
    const mime = MIME[format.value]
    const best = await searchQuality(canvas, mime, target)
    if (!best) throw new Error(t('imageCompressor.errorNoResult'))
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
    errorMessage.value = error && error.message ? error.message : t('imageCompressor.errorFailed')
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
