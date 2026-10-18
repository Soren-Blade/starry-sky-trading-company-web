<template>
  <ToolPageShell :title="PAGE.title" :eyebrow="PAGE.eyebrow" :description="PAGE.description" :icon="PAGE.icon" :requires-card="PAGE.requiresCard">
    <section class="ui-card tool-panel">
      <h2 class="tool-panel-title"><AppIcon name="image" aria-hidden="true" /><span>{{ PAGE.inputTitle }}</span></h2>
      <label class="tool-file-drop" :class="{ 'tool-file-drop--active': dragging }" @dragover.prevent="dragging = true" @dragleave="dragging = false" @drop.prevent="handleDrop">
        <span class="tool-file-icon"><AppIcon name="image" /></span>
        <span class="tool-file-title">点击选择或拖入图片（PNG / JPEG / WebP / GIF / BMP）</span>
        <input ref="fileInput" class="tool-file-input" type="file" accept="image/*" @change="handleChange" />
      </label>
      <p v-if="fileError" class="u-field-error" role="alert">{{ fileError }}</p>
      <div v-if="source" class="tool-preview-media"><img :src="source.url" alt="原始图片" /></div>
      <p v-if="source" class="tool-result-note">原始 {{ source.width }} × {{ source.height }}，{{ formatBytes(source.size) }}。</p>
      <div class="tool-form">
        <div class="u-field">
          <label class="u-field-label" for="kit-size-mode">缩放方式</label>
          <SelectField id="kit-size-mode" v-model="sizeMode" :options="SIZE_OPTIONS" aria-label="缩放方式" />
        </div>
        <div class="u-field">
          <span class="u-field-label">目标尺寸</span>
          <div class="tool-calc-grid">
            <input v-if="sizeMode === 'width' || sizeMode === 'fit'" v-model="widthValue" class="u-input" type="number" min="1" placeholder="宽 px（留空不缩放）" aria-label="目标宽度" />
            <input v-if="sizeMode === 'height' || sizeMode === 'fit'" v-model="heightValue" class="u-input" type="number" min="1" placeholder="高 px（留空不缩放）" aria-label="目标高度" />
            <input v-if="sizeMode === 'percent'" v-model="percentValue" class="u-input" type="number" min="1" max="400" placeholder="百分比 %" aria-label="缩放百分比" />
          </div>
        </div>
        <div class="u-field">
          <label class="u-field-label" for="kit-rotate">旋转</label>
          <SelectField id="kit-rotate" v-model="rotation" :options="ROTATE_OPTIONS" aria-label="旋转角度" />
        </div>
        <div class="u-field">
          <label class="u-field-label" for="kit-flip">翻转</label>
          <SelectField id="kit-flip" v-model="flip" :options="FLIP_OPTIONS" aria-label="翻转方向" />
        </div>
        <div class="u-field">
          <span class="u-field-label">裁剪区域（px，四项都填才生效）</span>
          <div class="tool-calc-grid">
            <input v-model="cropX" class="u-input" type="number" min="0" placeholder="X" aria-label="裁剪起点 X" />
            <input v-model="cropY" class="u-input" type="number" min="0" placeholder="Y" aria-label="裁剪起点 Y" />
            <input v-model="cropW" class="u-input" type="number" min="1" placeholder="宽" aria-label="裁剪宽度" />
            <input v-model="cropH" class="u-input" type="number" min="1" placeholder="高" aria-label="裁剪高度" />
          </div>
        </div>
        <div class="u-field">
          <label class="u-field-label" for="kit-format">输出格式</label>
          <SelectField id="kit-format" v-model="format" :options="FORMAT_OPTIONS" aria-label="输出格式" />
        </div>
        <div v-if="format !== 'png'" class="u-field">
          <label class="u-field-label" for="kit-quality">质量（{{ quality }}%）</label>
          <input id="kit-quality" v-model="quality" class="u-input" type="range" min="10" max="100" step="1" />
        </div>
      </div>
      <div class="tool-actions">
        <button type="button" class="u-btn-primary" :disabled="!source || state === 'loading'" @click="encode">{{ state === 'loading' ? '处理中…' : '处理图片' }}</button>
        <button type="button" class="u-btn-secondary" :disabled="state === 'loading'" @click="reset">清空</button>
      </div>
      <p class="tool-result-note">缩放、裁剪、旋转、翻转都在 canvas 上完成，单张上限 {{ formatBytes(MAX_FILE_BYTES) }}；质量只对 JPEG / WebP 生效，PNG 无损、调质量没有作用。</p>
    </section>

    <section class="ui-card tool-panel">
      <h2 class="tool-panel-title"><AppIcon name="clipboard" aria-hidden="true" /><span>{{ PAGE.resultTitle }}</span></h2>
      <ToolResultPane :state="state" :title="PAGE.resultTitle" :error="errorMessage" loading-text="正在用 canvas 重新编码…">
        <div v-if="result" class="tool-result-meta">
          <span class="tool-result-meta-item"><span>原始尺寸</span><strong>{{ source.width }} × {{ source.height }}</strong></span>
          <span class="tool-result-meta-item"><span>结果尺寸</span><strong>{{ result.width }} × {{ result.height }}</strong></span>
          <span class="tool-result-meta-item"><span>原始体积</span><strong>{{ formatBytes(source.size) }}</strong></span>
          <span class="tool-result-meta-item"><span>结果体积</span><strong>{{ formatBytes(result.size) }}</strong></span>
        </div>
        <div v-if="result" class="tool-preview-media"><img :src="result.url" alt="处理后的图片" /></div>
        <template #actions>
          <button v-if="result" type="button" class="u-btn-primary" @click="download">下载 {{ result.name }}</button>
        </template>
      </ToolResultPane>
    </section>

    <template #aside>
      <section class="ui-card tool-aside-card">
        <h3 class="tool-aside-title"><AppIcon name="info" aria-hidden="true" /> {{ TOOL_PAGE.usageTitle }}</h3>
        <ul class="tool-aside-list">
          <li>先旋转/翻转，再裁剪，最后缩放，顺序固定，结果可预测。</li>
          <li>输出体积是编码后的真实字节数，不是估算。</li>
          <li>图片不会上传，全部在本地 canvas 上完成。</li>
        </ul>
      </section>
      <section class="ui-card tool-aside-card">
        <h3 class="tool-aside-title"><AppIcon name="alert-triangle" aria-hidden="true" /> {{ TOOL_PAGE.noticeTitle }}</h3>
        <p class="tool-aside-note">GIF 只处理第一帧，动图会变成静态图；带透明通道的图导出 JPEG 后底色会变白。</p>
      </section>
    </template>
  </ToolPageShell>
</template>

<script setup>
import { onUnmounted, ref } from 'vue'
import AppIcon from '@/components/AppIcon.vue'
import SelectField from '@/components/SelectField.vue'
import ToolPageShell from '@/components/ToolPageShell.vue'
import ToolResultPane from '@/components/ToolResultPane.vue'
import { TOOL_PAGE, TOOL_PAGES } from '@/constants/index.js'
import { useToolUsage } from '@/hooks/useToolUsage/index.js'

const PAGE = TOOL_PAGES['/media/image']
const usage = useToolUsage('/media/image')
const MAX_FILE_BYTES = 20 * 1024 * 1024
const ACCEPT_PATTERN = /^image\/(png|jpeg|webp|gif|bmp)$/
const MIME = { png: 'image/png', jpeg: 'image/jpeg', webp: 'image/webp' }
const EXT = { png: 'png', jpeg: 'jpg', webp: 'webp' }
const SIZE_OPTIONS = [{ value: 'none', label: '保持原尺寸' }, { value: 'width', label: '按宽度等比缩放' }, { value: 'height', label: '按高度等比缩放' }, { value: 'percent', label: '按百分比缩放' }, { value: 'fit', label: '放进宽 × 高框内' }]
const ROTATE_OPTIONS = [{ value: 0, label: '不旋转' }, { value: 90, label: '顺时针 90°' }, { value: 180, label: '180°' }, { value: 270, label: '顺时针 270°' }]
const FLIP_OPTIONS = [{ value: 'none', label: '不翻转' }, { value: 'horizontal', label: '水平翻转' }, { value: 'vertical', label: '垂直翻转' }]
const FORMAT_OPTIONS = [{ value: 'png', label: 'PNG（无损）' }, { value: 'jpeg', label: 'JPEG' }, { value: 'webp', label: 'WebP' }]
const fileInput = ref(null); const dragging = ref(false); const fileError = ref('')
const source = ref(null); const result = ref(null); const errorMessage = ref('')
const sizeMode = ref('none'); const widthValue = ref(''); const heightValue = ref(''); const percentValue = ref('')
const rotation = ref(0); const flip = ref('none'); const format = ref('jpeg'); const quality = ref(85)
const cropX = ref(''); const cropY = ref(''); const cropW = ref(''); const cropH = ref('')
const state = ref('empty')

function formatBytes(bytes) {
  if (!bytes) return '0 B'
  if (bytes < 1024) return `${bytes} B`
  return bytes < 1024 * 1024 ? `${(bytes / 1024).toFixed(1)} KB` : `${(bytes / 1024 / 1024).toFixed(2)} MB`
}

function positive(value) { const parsed = Number(value); return Number.isFinite(parsed) && parsed > 0 ? parsed : 0 }
function releaseSource() { if (source.value) URL.revokeObjectURL(source.value.url); source.value = null }
function releaseResult() { if (result.value) URL.revokeObjectURL(result.value.url); result.value = null }

function loadImage(url) {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error('图片解码失败，请确认文件没有损坏。'))
    image.src = url
  })
}

async function selectFile(file) {
  releaseResult(); releaseSource()
  fileError.value = ''
  state.value = 'empty'
  if (!file) return
  if (!ACCEPT_PATTERN.test(file.type)) { fileError.value = '只支持 PNG / JPEG / WebP / GIF / BMP 图片。'; usage.record({ ok: false, errorCode: 'IMAGE_ENCODE_FAILED', meta: { reason: 'type' } }); return }
  if (file.size > MAX_FILE_BYTES) { fileError.value = `图片 ${formatBytes(file.size)} 超过 ${formatBytes(MAX_FILE_BYTES)}，请先缩小尺寸。`; usage.record({ ok: false, errorCode: 'IMAGE_ENCODE_FAILED', meta: { reason: 'size' } }); return }
  const url = URL.createObjectURL(file)
  try { const image = await loadImage(url); source.value = { url, width: image.naturalWidth, height: image.naturalHeight, size: file.size, name: file.name } } catch (error) { URL.revokeObjectURL(url); fileError.value = error.message }
}

function handleChange(event) { selectFile((event.target.files || [])[0]); event.target.value = '' }
function handleDrop(event) { dragging.value = false; selectFile((event.dataTransfer.files || [])[0]) }

// 裁剪框贴着画布边界裁，避免用户填了越界坐标时得到整片透明。
function cropBox(width, height) {
  const boxWidth = Math.min(positive(cropW.value), width)
  const boxHeight = Math.min(positive(cropH.value), height)
  if (!boxWidth || !boxHeight) return null
  const x = Math.min(Math.max(Number(cropX.value) || 0, 0), width - boxWidth)
  const y = Math.min(Math.max(Number(cropY.value) || 0, 0), height - boxHeight)
  return { x: Math.round(x), y: Math.round(y), width: Math.round(boxWidth), height: Math.round(boxHeight) }
}

// 等比缩放：只给一边时另一边按比例算，最短边不小于 1px。
function fitWidth(width, height, target) { return { width: target, height: Math.max(1, Math.round((height * target) / width)) } }
function fitHeight(width, height, target) { return { width: Math.max(1, Math.round((width * target) / height)), height: target } }
function fitBox(width, height, ratio) { return { width: Math.max(1, Math.round(width * ratio)), height: Math.max(1, Math.round(height * ratio)) } }

function scaledSize(width, height) {
  const mode = sizeMode.value
  if (mode === 'width' && positive(widthValue.value)) return fitWidth(width, height, positive(widthValue.value))
  if (mode === 'height' && positive(heightValue.value)) return fitHeight(width, height, positive(heightValue.value))
  if (mode === 'percent' && positive(percentValue.value)) return fitBox(width, height, positive(percentValue.value) / 100)
  if (mode === 'fit' && positive(widthValue.value) && positive(heightValue.value)) return fitBox(width, height, Math.min(positive(widthValue.value) / width, positive(heightValue.value) / height))
  return { width, height }
}

function makeCanvas(width, height) { const canvas = document.createElement('canvas'); canvas.width = width; canvas.height = height; return canvas }
function contextOf(canvas) { const context = canvas.getContext('2d'); if (!context) throw new Error('当前浏览器不支持 canvas 2D，无法处理图片。'); return context }

async function encode() {
  if (!source.value) return
  const startedAt = performance.now()
  state.value = 'loading'
  errorMessage.value = ''
  try {
    const image = await loadImage(source.value.url)
    const angle = Number(rotation.value)
    const swap = angle === 90 || angle === 270
    const stage = makeCanvas(swap ? image.naturalHeight : image.naturalWidth, swap ? image.naturalWidth : image.naturalHeight)
    const stageContext = contextOf(stage)
    stageContext.translate(stage.width / 2, stage.height / 2)
    stageContext.rotate((angle * Math.PI) / 180)
    stageContext.scale(flip.value === 'horizontal' ? -1 : 1, flip.value === 'vertical' ? -1 : 1)
    stageContext.drawImage(image, -image.naturalWidth / 2, -image.naturalHeight / 2)
    const box = cropBox(stage.width, stage.height)
    let painted = stage
    if (box) { const cropped = makeCanvas(box.width, box.height); contextOf(cropped).drawImage(stage, box.x, box.y, box.width, box.height, 0, 0, box.width, box.height); painted = cropped }
    const target = scaledSize(painted.width, painted.height)
    if (target.width !== painted.width || target.height !== painted.height) {
      const resized = makeCanvas(target.width, target.height)
      const context = contextOf(resized)
      context.imageSmoothingQuality = 'high'
      context.drawImage(painted, 0, 0, target.width, target.height)
      painted = resized
    }
    const blob = await new Promise((resolve) => { painted.toBlob(resolve, MIME[format.value], Number(quality.value) / 100) })
    if (!blob) throw new Error('编码失败：当前浏览器可能不支持导出这个格式（如 WebP 编码）。')
    releaseResult()
    result.value = { url: URL.createObjectURL(blob), size: blob.size, width: painted.width, height: painted.height, name: `${source.value.name.replace(/\.[^.]+$/, '')}-${painted.width}x${painted.height}.${EXT[format.value]}` }
    state.value = 'success'
    usage.record({ durationMs: performance.now() - startedAt, meta: { op: 'edit', format: format.value, originalSize: source.value.size, outputSize: blob.size } })
  } catch (error) {
    state.value = 'error'
    errorMessage.value = error && error.message ? error.message : '处理失败，请换一张图片再试。'
    usage.record({ durationMs: performance.now() - startedAt, ok: false, errorCode: 'IMAGE_ENCODE_FAILED' })
  }
}

function download() {
  if (!result.value) return
  const link = document.createElement('a')
  link.href = result.value.url
  link.download = result.value.name
  link.click()
}

function reset() { releaseResult(); releaseSource(); fileError.value = ''; state.value = 'empty'; errorMessage.value = '' }

onUnmounted(() => { releaseSource(); releaseResult() })
</script>
