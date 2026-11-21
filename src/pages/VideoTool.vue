<template>
  <ToolPageShell :title="PAGE.title" :eyebrow="PAGE.eyebrow" :description="PAGE.description" :icon="PAGE.icon" :requires-card="PAGE.requiresCard">
    <section class="ui-card tool-panel">
      <h2 class="tool-panel-title"><AppIcon name="video" aria-hidden="true" /><span>{{ t('videoProbe.selectTitle') }}</span></h2>
      <label
        class="tool-file-drop"
        :class="{ 'tool-file-drop--active': dragging }"
        @dragover.prevent="dragging = true"
        @dragleave="dragging = false"
        @drop.prevent="handleDrop"
      >
        <span class="tool-file-icon"><AppIcon name="film" /></span>
        <span class="tool-file-title">{{ t('videoProbe.dropTitle') }}</span>
        <span class="tool-result-note">{{ t('videoProbe.dropHint', { size: formatBytes(MAX_FILE_BYTES) }) }}</span>
        <input ref="fileInput" class="tool-file-input" type="file" accept="video/*" @change="handleChange" />
      </label>
      <p v-if="fileError" class="u-field-error" role="alert">{{ fileError }}</p>
      <p v-if="fileName" class="tool-file-name"><AppIcon name="check-circle" aria-hidden="true" /><span>{{ fileName }}（{{ formatBytes(fileSize) }}）</span></p>
      <div class="tool-form">
        <div class="u-field">
          <label class="u-field-label" for="vt-frame-time">{{ t('videoProbe.frameLabel') }}</label>
          <input id="vt-frame-time" v-model="frameTime" class="u-input" type="number" min="0" step="0.5" />
          <p class="u-field-hint">{{ t('videoProbe.frameHint') }}</p>
        </div>
      </div>
      <div class="tool-actions">
        <button type="button" class="u-btn-primary" :disabled="!file || state === 'loading'" @click="run">
          {{ state === 'loading' ? t('videoProbe.reading') : t('videoProbe.readMeta') }}
        </button>
        <button type="button" class="u-btn-secondary" :disabled="state === 'loading'" @click="reset">{{ PAGE.reset }}</button>
      </div>
    </section>

    <section class="ui-card tool-panel">
      <h2 class="tool-panel-title"><AppIcon name="clipboard" aria-hidden="true" /><span>{{ t('videoProbe.resultTitle') }}</span></h2>
      <ToolResultPane :state="state" :title="PAGE.emptyTitle" :description="PAGE.emptyDesc" :error="errorMessage" :loading-text="t('videoProbe.analyzing')">
        <div v-if="meta" class="tool-result-meta">
          <span class="tool-result-meta-item"><span>{{ t('videoProbe.duration') }}</span><strong>{{ meta.durationText }}</strong></span>
          <span class="tool-result-meta-item"><span>{{ t('videoProbe.resolution') }}</span><strong>{{ meta.resolutionText }}</strong></span>
          <span class="tool-result-meta-item"><span>{{ t('videoProbe.fileSize') }}</span><strong>{{ formatBytes(meta.size) }}</strong></span>
          <span class="tool-result-meta-item"><span>{{ t('videoProbe.bitrate') }}</span><strong>{{ meta.bitrateText }}</strong></span>
          <span class="tool-result-meta-item"><span>{{ t('videoProbe.container') }}</span><strong>{{ meta.container }}</strong></span>
          <span class="tool-result-meta-item"><span>MIME</span><strong>{{ meta.mime }}</strong></span>
        </div>
        <p v-if="meta" class="tool-result-note">{{ t('videoProbe.bitrateNote') }}</p>
        <div v-if="thumbUrl" class="tool-preview-media">
          <img :src="thumbUrl" :alt="t('videoProbe.thumbAlt')" />
        </div>
        <template #actions>
          <button v-if="thumbUrl" type="button" class="u-btn-primary" @click="downloadFrame">{{ t('videoProbe.downloadFrame') }}</button>
        </template>
      </ToolResultPane>
    </section>

    <template #aside>
      <div class="ui-card tool-aside-card">
        <h3 class="tool-aside-title"><span class="tool-aside-title-icon"><AppIcon name="info" aria-hidden="true" /></span><span>{{ TOOL_PAGE.usageTitle }}</span></h3>
        <ul class="tool-aside-list">
          <li v-for="(item, index) in ASIDE_ITEMS" :key="index">{{ item }}</li>
        </ul>
      </div>
      <div class="ui-card tool-aside-card">
        <h3 class="tool-aside-title"><span class="tool-aside-title-icon"><AppIcon name="alert-triangle" aria-hidden="true" /></span><span>{{ TOOL_PAGE.noticeTitle }}</span></h3>
        <p class="tool-aside-note">{{ t('videoProbe.asideProxy') }}</p>
        <p class="tool-aside-note">{{ t('videoProbe.asideTranscode') }}</p>
      </div>
    </template>
  </ToolPageShell>
</template>

<script setup>
import { formatBytes, formatDuration } from '@/utils/format.js'
import { onUnmounted, ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import AppIcon from '@/components/AppIcon.vue'
import ToolPageShell from '@/components/ToolPageShell.vue'
import ToolResultPane from '@/components/ToolResultPane.vue'
import { TOOL_PAGE, TOOL_PAGES } from '@/constants/index.js'
import { useToolUsage } from '@/hooks/useToolUsage/index.js'

const PAGE = TOOL_PAGES['/video/downloader']
const usage = useToolUsage('/video/downloader')
const { t, tm } = useI18n()

// 常量表里的 asideItems / resultNote 还是「骨架阶段占位」口径，这里用页面内文案覆盖真实能力，不改 constants。
const ASIDE_ITEMS = computed(() => tm('videoProbe.asideItems'))
const MAX_FILE_BYTES = 500 * 1024 * 1024
const METADATA_TIMEOUT_MS = 15000
const CONTAINERS = {
  mp4: 'MP4', m4v: 'MP4', mov: 'QuickTime MOV', webm: 'WebM', mkv: 'Matroska MKV',
  avi: 'AVI', ogv: 'Ogg Video', m4a: 'MP4 音频', mp3: 'MP3', wav: 'WAV', ogg: 'Ogg', flac: 'FLAC', aac: 'AAC',
}

const fileInput = ref(null)
const file = ref(null)
const fileName = ref('')
const fileSize = ref(0)
const frameTime = ref('0')
const dragging = ref(false)
const fileError = ref('')
const state = ref('empty')
const meta = ref(null)
const thumbUrl = ref('')
const objectUrl = ref('')
const errorMessage = ref('')

function guessContainer(name) {
  const extension = (name.split('.').pop() || '').toLowerCase()
  return CONTAINERS[extension] || t('videoProbe.unknownContainer')
}

function releaseUrls() {
  if (objectUrl.value) URL.revokeObjectURL(objectUrl.value)
  if (thumbUrl.value) URL.revokeObjectURL(thumbUrl.value)
  objectUrl.value = ''
  thumbUrl.value = ''
}

function acceptFile(next) {
  releaseUrls()
  fileError.value = ''
  meta.value = null
  state.value = 'empty'
  if (!next) return
  if (!next.type.startsWith('video/')) {
    fileError.value = t('videoProbe.errorType')
    usage.record({ ok: false, errorCode: 'VIDEO_FILE_INVALID_TYPE' })
    return
  }
  if (next.size > MAX_FILE_BYTES) {
    fileError.value = t('videoProbe.errorTooLarge', { size: formatBytes(MAX_FILE_BYTES) })
    usage.record({ ok: false, errorCode: 'VIDEO_FILE_TOO_LARGE', meta: { size: next.size } })
    return
  }
  file.value = next
  fileName.value = next.name
  fileSize.value = next.size
  objectUrl.value = URL.createObjectURL(next)
  run()
}

function handleChange(event) {
  acceptFile((event.target.files || [])[0])
  event.target.value = ''
}

function handleDrop(event) {
  dragging.value = false
  acceptFile((event.dataTransfer.files || [])[0])
}

function waitForEvent(element, name) {
  return new Promise((resolve, reject) => {
    const cleanup = () => {
      element.removeEventListener(name, onDone)
      element.removeEventListener('error', onError)
    }
    const onDone = () => {
      cleanup()
      resolve()
    }
    const onError = () => {
      cleanup()
      reject(new Error(t('videoProbe.errorDecode')))
    }
    element.addEventListener(name, onDone, { once: true })
    element.addEventListener('error', onError, { once: true })
  })
}

// 用 <video> 让浏览器真正解码一次：metadata 给时长/分辨率，seek 到指定时间后 drawImage 拿那一帧。
async function analyse(source) {
  const video = document.createElement('video')
  video.preload = 'metadata'
  video.muted = true
  video.playsInline = true
  video.src = source
  const timeout = new Promise((_, reject) => {
    window.setTimeout(() => reject(new Error(t('videoProbe.errorTimeout'))), METADATA_TIMEOUT_MS)
  })
  await Promise.race([waitForEvent(video, 'loadedmetadata'), timeout])
  const duration = video.duration
  const width = video.videoWidth
  const height = video.videoHeight
  const target = Math.min(Math.max(Number(frameTime.value) || 0, 0), Math.max(duration - 0.1, 0))
  video.currentTime = target
  await Promise.race([waitForEvent(video, 'seeked'), timeout])
  const canvas = document.createElement('canvas')
  canvas.width = width || 640
  canvas.height = height || 360
  const context = canvas.getContext('2d')
  if (!context) throw new Error(t('videoProbe.errorCanvas'))
  context.drawImage(video, 0, 0, canvas.width, canvas.height)
  const blob = await new Promise((resolve) => {
    canvas.toBlob(resolve, 'image/png')
  })
  return {
    duration,
    durationText: formatDuration(duration),
    resolutionText: width && height ? `${width} × ${height}` : t('videoProbe.noVideoTrack'),
    size: fileSize.value,
    bitrateText: Number.isFinite(duration) && duration > 0 ? `${Math.round((fileSize.value * 8) / duration / 1000)} kbps` : t('videoProbe.cannotEstimate'),
    container: guessContainer(fileName.value),
    mime: file.value.type || t('videoProbe.unknownMime'),
    frameTime: target,
    frameBlob: blob,
  }
}

async function run() {
  if (!file.value || !objectUrl.value) return
  const startedAt = performance.now()
  releaseUrls()
  objectUrl.value = URL.createObjectURL(file.value)
  state.value = 'loading'
  errorMessage.value = ''
  try {
    const info = await analyse(objectUrl.value)
    meta.value = info
    if (info.frameBlob) thumbUrl.value = URL.createObjectURL(info.frameBlob)
    state.value = 'success'
    usage.record({ durationMs: performance.now() - startedAt, meta: { duration: Math.round(info.duration || 0), size: info.size } })
  } catch (error) {
    state.value = 'error'
    errorMessage.value = error && error.message ? error.message : t('videoProbe.errorFailed')
    usage.record({ durationMs: performance.now() - startedAt, ok: false, errorCode: 'VIDEO_PROBE_FAILED' })
  }
}

function downloadFrame() {
  if (!thumbUrl.value) return
  const link = document.createElement('a')
  link.href = thumbUrl.value
  link.download = `${fileName.value.replace(/\.[^.]+$/, '')}-frame.png`
  link.click()
}

function reset() {
  releaseUrls()
  file.value = null
  fileName.value = ''
  fileSize.value = 0
  frameTime.value = '0'
  meta.value = null
  fileError.value = ''
  state.value = 'empty'
  errorMessage.value = ''
}

onUnmounted(releaseUrls)
</script>
