<template>
  <ToolPageShell :title="PAGE.title" :eyebrow="PAGE.eyebrow" :description="PAGE.description" :icon="PAGE.icon" :requires-card="PAGE.requiresCard">
    <section class="ui-card tool-panel">
      <h2 class="tool-panel-title"><AppIcon name="qrcode" aria-hidden="true" /><span>{{ PAGE.inputTitle }}</span></h2>
      <ToolModeTabs v-model="mode" :options="MODE_OPTIONS" label="二维码操作模式" hint="编码与解码都在本机完成，图片和正文都不上传。" />

      <template v-if="mode === 'generate'">
        <div class="u-field">
          <label class="u-field-label" for="qr-content">内容</label>
          <textarea id="qr-content" v-model="qrContent" class="u-input tool-textarea" placeholder="输入文本或 URL..." spellcheck="false" />
        </div>
        <div class="tool-form">
          <div class="u-field">
            <label class="u-field-label" for="qr-size">尺寸：{{ qrSize }}px</label>
            <input id="qr-size" v-model.number="qrSize" type="range" min="128" max="512" step="8" class="u-input" />
          </div>
          <div class="u-field">
            <label class="u-field-label">容错级别</label>
            <SelectField v-model="ecc" :options="ECC_OPTIONS" aria-label="二维码容错级别" />
            <p class="u-field-hint">L 约 7%、M 约 15%、Q 约 25%、H 约 30%；遮挡越多，越该选高容错。</p>
          </div>
        </div>
        <div class="tool-actions">
          <button type="button" class="u-btn-primary" :disabled="!qrContent || busy" @click="generateQR">{{ busy ? '生成中…' : '生成' }}</button>
          <button type="button" class="u-btn-secondary" @click="clear">清空</button>
        </div>
      </template>

      <template v-else>
        <div class="u-field">
          <label class="u-field-label" for="qr-image">二维码图片</label>
          <input id="qr-image" ref="imageInput" type="file" accept="image/*" class="u-input" @change="decodeImage" />
          <p class="u-field-hint">在本机解码，不上传图片。建议使用清晰、无遮挡、二维码占比较大的截图。</p>
        </div>
        <div class="tool-actions">
          <button type="button" class="u-btn-secondary" @click="clear">清空</button>
        </div>
      </template>

      <p v-if="error" class="u-field-error" role="alert">{{ error }}</p>
    </section>

    <section class="ui-card tool-panel">
      <h2 class="tool-panel-title"><AppIcon name="check-circle" aria-hidden="true" /><span>{{ PAGE.resultTitle }}</span></h2>
      <ToolResultPane :state="output ? 'success' : 'empty'" :title="PAGE.emptyTitle" :description="PAGE.emptyDesc" icon="qr-code">
        <template v-if="output">
          <div v-if="mode === 'generate'" class="tool-preview-media">
            <img :src="qrDataUrl" :alt="PAGE.qrAlt" :width="qrSize" :height="qrSize" />
          </div>
          <template v-else>
            <p class="tool-result-note">识别结果：</p>
            <pre class="tool-preview">{{ decodedText }}</pre>
          </template>
        </template>
        <template #actions>
          <a v-if="mode === 'generate' && qrDataUrl" :href="qrDataUrl" :download="downloadName" class="u-btn-primary">下载 PNG</a>
          <button v-if="mode === 'decode' && decodedText" type="button" class="u-btn-primary" @click="copy">{{ copyLabel }}</button>
        </template>
      </ToolResultPane>
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
import { computed, ref, watch } from 'vue'
import AppIcon from '@/components/AppIcon.vue'
import SelectField from '@/components/SelectField.vue'
import ToolModeTabs from '@/components/ToolModeTabs.vue'
import ToolPageShell from '@/components/ToolPageShell.vue'
import ToolResultPane from '@/components/ToolResultPane.vue'
import { TOOL_PAGE, TOOL_PAGES, TOOL_RESULT } from '@/constants/index.js'
import { useToolUsage } from '@/hooks/useToolUsage/index.js'

const PAGE = TOOL_PAGES['/net/qrcode']
const usage = useToolUsage('/net/qrcode')
const MODE_OPTIONS = [
  { value: 'generate', label: '生成二维码', icon: 'qrcode' },
  { value: 'decode', label: '识别二维码', icon: 'search' },
]
const ECC_OPTIONS = [
  { label: 'L（低，约 7%）', value: 'L' },
  { label: 'M（中，约 15%）', value: 'M' },
  { label: 'Q（较高，约 25%）', value: 'Q' },
  { label: 'H（高，约 30%）', value: 'H' },
]
const mode = ref('generate')
const qrContent = ref('')
const qrSize = ref(256)
const ecc = ref('M')
const qrDataUrl = ref('')
const decodedText = ref('')
const error = ref('')
const busy = ref(false)
const copyState = ref('idle')
const imageInput = ref(null)

const output = computed(() => mode.value === 'generate' ? qrDataUrl.value : decodedText.value)
const copyLabel = computed(() => copyState.value === 'ok' ? TOOL_RESULT.copied : copyState.value === 'fail' ? TOOL_RESULT.copyFailed : TOOL_RESULT.copy)
const downloadName = computed(() => `qrcode-${ecc.value}-${qrSize.value}.png`)

// 换模式时清掉上一轮的错误与复制状态（原来写在 switchMode 里，现在改由模式变化驱动）。
watch(mode, () => {
  error.value = ''
  copyState.value = 'idle'
})

function resetResult() {
  error.value = ''
  qrDataUrl.value = ''
  decodedText.value = ''
  copyState.value = 'idle'
}

async function generateQR() {
  if (!qrContent.value) return
  const startedAt = performance.now()
  error.value = ''
  decodedText.value = ''
  busy.value = true
  try {
    // 动态引入：qrcode 只在真正生成时加载，不进入首屏 chunk。
    const mod = await import('qrcode')
    const QRCode = mod.default || mod
    const dataUrl = await QRCode.toDataURL(qrContent.value, {
      errorCorrectionLevel: ecc.value,
      width: qrSize.value,
      margin: 2,
      color: { dark: '#000000', light: '#ffffff' },
    })
    qrDataUrl.value = dataUrl
    copyState.value = 'idle'
    // meta 只放尺寸、容错级别和内容长度，绝不放二维码承载的正文。
    usage.record({ durationMs: Math.round(performance.now() - startedAt), meta: { mode: 'generate', size: qrSize.value, ecc: ecc.value, length: qrContent.value.length } })
  } catch (e) {
    error.value = `生成失败：${e.message}。请检查内容是否过长，或降低容错级别后重试。`
    usage.record({ ok: false, errorCode: 'QR_GENERATE_FAILED', durationMs: Math.round(performance.now() - startedAt) })
  } finally {
    busy.value = false
  }
}

function readImage(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const image = new Image()
    image.onload = () => {
      URL.revokeObjectURL(url)
      resolve(image)
    }
    image.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('图片无法解码'))
    }
    image.src = url
  })
}

async function decodeImage(event) {
  const file = event.target.files?.[0]
  if (!file) return
  const startedAt = performance.now()
  resetResult()
  try {
    const image = await readImage(file)
    // 缩小超大图片，避免 canvas 内存暴涨；二维码本身仍保留足够像素。
    const scale = Math.min(1, 2000 / Math.max(image.naturalWidth, image.naturalHeight))
    const canvas = document.createElement('canvas')
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale))
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale))
    const ctx = canvas.getContext('2d', { willReadFrequently: true })
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height)
    const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height)
    const mod = await import('jsqr')
    const jsQR = mod.default || mod
    const code = jsQR(pixels.data, pixels.width, pixels.height)
    if (!code?.data) {
      error.value = '没有识别到二维码。图片可能模糊、反光、二维码太小，或画面中根本没有二维码；请换一张清晰的正面截图。'
      usage.record({ ok: false, errorCode: 'QR_DECODE_FAILED', durationMs: Math.round(performance.now() - startedAt) })
      return
    }
    decodedText.value = code.data
    usage.record({ durationMs: Math.round(performance.now() - startedAt), meta: { mode: 'decode', width: pixels.width, height: pixels.height, length: code.data.length } })
  } catch (e) {
    error.value = `读取图片失败：${e.message}。请确认文件是浏览器能打开的图片格式（PNG/JPEG/WebP 等）。`
    usage.record({ ok: false, errorCode: 'QR_IMAGE_READ_FAILED', durationMs: Math.round(performance.now() - startedAt) })
  }
}

function clear() {
  qrContent.value = ''
  qrDataUrl.value = ''
  decodedText.value = ''
  error.value = ''
  copyState.value = 'idle'
  if (imageInput.value) imageInput.value.value = ''
}

async function copy() {
  if (!decodedText.value) return
  try {
    await navigator.clipboard.writeText(decodedText.value)
    copyState.value = 'ok'
  } catch (e) {
    copyState.value = 'fail'
  }
}
</script>
