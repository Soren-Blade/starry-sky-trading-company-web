<template>
  <ToolPageShell :title="PAGE.title" :eyebrow="PAGE.eyebrow" :description="PAGE.description" :icon="PAGE.icon" :requires-card="PAGE.requiresCard">
    <section class="ui-card tool-panel">
      <h2 class="tool-panel-title"><AppIcon name="film" aria-hidden="true" /><span>{{ PAGE.inputTitle }}</span></h2>
      <label class="tool-file-drop" :class="{ 'tool-file-drop--active': dragging }" @dragover.prevent="dragging = true" @dragleave="dragging = false" @drop.prevent="handleDrop">
        <span class="tool-file-icon"><AppIcon name="film" /></span>
        <span class="tool-file-title">点击选择或拖入音视频文件（mp4 / webm / mov / mp3 / wav 等）</span>
        <input ref="fileInput" class="tool-file-input" type="file" accept="video/*,audio/*" @change="handleChange" />
      </label>
      <p v-if="fileError" class="u-field-error" role="alert">{{ fileError }}</p>
      <p v-if="fileName" class="tool-file-name"><AppIcon name="check-circle" aria-hidden="true" /><span>{{ fileName }}（{{ formatBytes(fileBytes) }}）</span></p>
      <p class="tool-result-note">元数据由浏览器的解码器读出，不上传文件；上限 {{ formatBytes(MAX_FILE_BYTES) }}，再大浏览器解码会很慢。</p>
    </section>

    <section class="ui-card tool-panel">
      <h2 class="tool-panel-title"><AppIcon name="image" aria-hidden="true" /><span>视频抽帧</span></h2>
      <p v-if="!isVideo" class="tool-result-note">选择视频后可以抽帧；音频文件没有画面。</p>
      <div v-else class="tool-form">
        <div class="u-field">
          <label class="u-field-label" for="frame-time">抽帧时间（秒）</label>
          <input id="frame-time" v-model="frameTime" class="u-input" type="number" min="0" step="0.1" />
        </div>
      </div>
      <p v-if="frameError" class="u-field-error" role="alert">{{ frameError }}</p>
      <div v-if="frameUrl" class="tool-preview-media"><img :src="frameUrl" alt="从视频抽取的画面" /></div>
      <div class="tool-actions">
        <button v-if="frameUrl" type="button" class="u-btn-secondary" @click="downloadFrame">下载这一帧 PNG</button>
        <button type="button" class="u-btn-primary" :disabled="!isVideo || frameLoading || state !== 'success'" @click="grabFrame">{{ frameLoading ? '截取中…' : '抽取这一帧' }}</button>
        <button type="button" class="u-btn-secondary" :disabled="state === 'loading'" @click="reset">清空</button>
      </div>
      <p class="tool-result-note">转码、剪辑、提取音轨需要编码器，浏览器没有通用的编码能力，本页不提供。</p>
    </section>

    <section class="ui-card tool-panel">
      <h2 class="tool-panel-title"><AppIcon name="clipboard" aria-hidden="true" /><span>{{ PAGE.resultTitle }}</span></h2>
      <ToolResultPane :state="state" :title="PAGE.resultTitle" :error="errorMessage" loading-text="正在读取媒体信息…">
        <div v-if="meta" class="tool-result-meta">
          <span class="tool-result-meta-item"><span>类型</span><strong>{{ meta.kind === 'video' ? '视频' : '音频' }}</strong></span>
          <span class="tool-result-meta-item"><span>时长</span><strong>{{ formatDuration(meta.duration) }}</strong></span>
          <span v-if="meta.kind === 'video'" class="tool-result-meta-item"><span>分辨率</span><strong>{{ meta.width }} × {{ meta.height }}</strong></span>
          <span class="tool-result-meta-item"><span>文件大小</span><strong>{{ formatBytes(meta.size) }}</strong></span>
          <span class="tool-result-meta-item"><span>估算码率</span><strong>{{ meta.bitrate }} kbps</strong></span>
          <span class="tool-result-meta-item"><span>容器</span><strong>{{ meta.container }}</strong></span>
          <span class="tool-result-meta-item"><span>MIME</span><strong>{{ meta.type }}</strong></span>
        </div>
        <p v-if="meta" class="tool-result-note">码率 = 文件大小 × 8 ÷ 时长，是平均值，不是编码器参数。</p>
      </ToolResultPane>
    </section>

    <template #aside>
      <section class="ui-card tool-aside-card">
        <h3 class="tool-aside-title"><AppIcon name="info" aria-hidden="true" /> {{ TOOL_PAGE.usageTitle }}</h3>
        <ul class="tool-aside-list">
          <li>用浏览器解码器读出时长、分辨率、估算码率与容器类型。</li>
          <li>视频可定位到任意秒数，把画面画到 canvas 后导出 PNG。</li>
          <li>文件不上传服务器，全部在本地完成。</li>
        </ul>
      </section>
      <section class="ui-card tool-aside-card">
        <h3 class="tool-aside-title"><AppIcon name="alert-triangle" aria-hidden="true" /> {{ TOOL_PAGE.noticeTitle }}</h3>
        <p class="tool-aside-note">某些 MKV / AVI 的内部编码浏览器解不了，会直接读不到元数据，这不是文件损坏；转码请用桌面软件（如 ffmpeg）。</p>
      </section>
    </template>
  </ToolPageShell>
</template>

<script setup>
import { computed, onUnmounted, ref } from 'vue'
import AppIcon from '@/components/AppIcon.vue'
import ToolPageShell from '@/components/ToolPageShell.vue'
import ToolResultPane from '@/components/ToolResultPane.vue'
import { TOOL_PAGE, TOOL_PAGES } from '@/constants/index.js'
import { useToolUsage } from '@/hooks/useToolUsage/index.js'

const PAGE = TOOL_PAGES['/media/av']
const usage = useToolUsage('/media/av')
const MAX_FILE_BYTES = 500 * 1024 * 1024
const MEDIA_PATTERN = /\.(mp4|m4v|mov|webm|mkv|avi|ogv|m4a|mp3|wav|ogg|flac|aac)$/i
const VIDEO_PATTERN = /\.(mp4|m4v|mov|webm|mkv|avi|ogv)$/i
const CONTAINERS = {
  mp4: 'MP4（ISO BMFF）', m4v: 'MP4（ISO BMFF）', mov: 'QuickTime（MOV）', webm: 'WebM', mkv: 'Matroska（MKV）',
  avi: 'AVI', ogv: 'Ogg', m4a: 'MP4 音频（M4A）', mp3: 'MP3', wav: 'WAV（RIFF）', ogg: 'Ogg', flac: 'FLAC', aac: 'AAC（ADTS）',
}
const fileInput = ref(null); const dragging = ref(false); const fileError = ref('')
const fileName = ref(''); const fileBytes = ref(0)
const state = ref('empty'); const errorMessage = ref(''); const meta = ref(null)
const frameTime = ref('1'); const frameUrl = ref(''); const frameError = ref(''); const frameLoading = ref(false)
let mediaUrl = ''

const isVideo = computed(() => Boolean(meta.value) && meta.value.kind === 'video')

function formatBytes(bytes) {
  if (!bytes) return '0 B'
  if (bytes < 1024) return `${bytes} B`
  return bytes < 1024 * 1024 ? `${(bytes / 1024).toFixed(1)} KB` : `${(bytes / 1024 / 1024).toFixed(2)} MB`
}

function formatDuration(seconds) {
  const total = Math.max(0, Math.round(Number(seconds) || 0))
  const pad = (value) => String(value).padStart(2, '0')
  const hours = Math.floor(total / 3600)
  return hours ? `${hours}:${pad(Math.floor((total % 3600) / 60))}:${pad(total % 60)}` : `${Math.floor(total / 60)}:${pad(total % 60)}`
}

function guessContainer(file) {
  const extension = /\.([a-z0-9]+)$/i.exec(file.name)
  return CONTAINERS[extension ? extension[1].toLowerCase() : ''] || file.type || '无法从扩展名判断'
}

// 元数据来自浏览器的解码器：能读出说明容器 + 编码可解，读不出就直接报错，不猜。
function readMetadata(url, video) {
  return new Promise((resolve, reject) => {
    const element = document.createElement(video ? 'video' : 'audio')
    element.preload = 'metadata'
    let timer = 0
    const done = (error) => {
      window.clearTimeout(timer)
      element.removeEventListener('loadedmetadata', onLoaded)
      element.removeEventListener('error', onFail)
      if (error) reject(error)
      else resolve({ duration: Number.isFinite(element.duration) ? element.duration : 0, width: element.videoWidth || 0, height: element.videoHeight || 0 })
    }
    const onLoaded = () => done()
    const onFail = () => done(new Error('浏览器无法解码这个文件，可能是容器或内部编码不受支持（例如部分 MKV / AVI）。'))
    timer = window.setTimeout(onFail, 15000)
    element.addEventListener('loadedmetadata', onLoaded)
    element.addEventListener('error', onFail)
    element.src = url
  })
}

function releaseFrame() { if (frameUrl.value) URL.revokeObjectURL(frameUrl.value); frameUrl.value = '' }

function reset() {
  if (mediaUrl) URL.revokeObjectURL(mediaUrl)
  mediaUrl = ''
  releaseFrame()
  fileName.value = ''
  fileBytes.value = 0
  fileError.value = ''
  state.value = 'empty'
  errorMessage.value = ''
  meta.value = null
  frameError.value = ''
}

async function selectFile(file) {
  reset()
  if (!file) return
  if (!/^(video|audio)\//.test(file.type) && !MEDIA_PATTERN.test(file.name)) {
    fileError.value = '只支持音视频文件，其他类型请先确认格式。'
    usage.record({ ok: false, errorCode: 'MEDIA_READ_FAILED', meta: { reason: 'type' } })
    return
  }
  if (file.size > MAX_FILE_BYTES) {
    fileError.value = `文件 ${formatBytes(file.size)} 超过 ${formatBytes(MAX_FILE_BYTES)}，浏览器解码会很慢。`
    usage.record({ ok: false, errorCode: 'MEDIA_READ_FAILED', meta: { reason: 'size' } })
    return
  }
  const startedAt = performance.now()
  const video = /^video\//.test(file.type) || VIDEO_PATTERN.test(file.name)
  fileName.value = file.name
  fileBytes.value = file.size
  state.value = 'loading'
  mediaUrl = URL.createObjectURL(file)
  try {
    const detail = await readMetadata(mediaUrl, video)
    meta.value = {
      kind: video ? 'video' : 'audio',
      duration: detail.duration, width: detail.width, height: detail.height, size: file.size,
      bitrate: detail.duration > 0 ? Math.round((file.size * 8) / detail.duration / 1000) : 0,
      container: guessContainer(file),
      type: file.type || '浏览器未报告',
    }
    state.value = 'success'
    usage.record({ durationMs: performance.now() - startedAt, meta: { kind: meta.value.kind } })
  } catch (error) {
    state.value = 'error'
    errorMessage.value = error && error.message ? error.message : '读取媒体信息失败。'
    usage.record({ durationMs: performance.now() - startedAt, ok: false, errorCode: 'MEDIA_READ_FAILED' })
  }
}

function handleChange(event) { selectFile((event.target.files || [])[0]); event.target.value = '' }
function handleDrop(event) { dragging.value = false; selectFile((event.dataTransfer.files || [])[0]) }

function waitFor(element, name) {
  return new Promise((resolve, reject) => {
    const off = () => { element.removeEventListener(name, onDone); element.removeEventListener('error', onFail) }
    const onDone = () => { off(); resolve() }
    const onFail = () => { off(); reject(new Error('定位到该时间点失败，可能超出了视频实际时长。')) }
    element.addEventListener(name, onDone)
    element.addEventListener('error', onFail)
  })
}

async function grabFrame() {
  if (!mediaUrl || !isVideo.value) return
  frameError.value = ''
  frameLoading.value = true
  try {
    const video = document.createElement('video')
    video.preload = 'auto'
    video.muted = true
    video.src = mediaUrl
    await waitFor(video, 'loadedmetadata')
    const duration = Number.isFinite(video.duration) ? video.duration : 0
    video.currentTime = Math.min(Math.max(Number(frameTime.value) || 0, 0), Math.max(duration - 0.05, 0))
    await waitFor(video, 'seeked')
    const canvas = document.createElement('canvas')
    canvas.width = video.videoWidth || 640
    canvas.height = video.videoHeight || 360
    const context = canvas.getContext('2d')
    if (!context) throw new Error('当前浏览器不支持 canvas 2D，无法抽帧。')
    context.drawImage(video, 0, 0, canvas.width, canvas.height)
    const blob = await new Promise((resolve) => { canvas.toBlob(resolve, 'image/png') })
    if (!blob) throw new Error('生成 PNG 失败，请换一个时间点再试。')
    releaseFrame()
    frameUrl.value = URL.createObjectURL(blob)
  } catch (error) {
    frameError.value = error && error.message ? error.message : '抽帧失败。'
  } finally {
    frameLoading.value = false
  }
}

function downloadFrame() {
  if (!frameUrl.value) return
  const link = document.createElement('a')
  link.href = frameUrl.value
  link.download = `${fileName.value.replace(/\.[^.]+$/, '')}-frame-${frameTime.value}s.png`
  link.click()
}

onUnmounted(() => { if (mediaUrl) URL.revokeObjectURL(mediaUrl); releaseFrame() })
</script>
