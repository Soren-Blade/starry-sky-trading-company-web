<template>
  <ToolPageShell :title="PAGE.title" :eyebrow="PAGE.eyebrow" :description="PAGE.description" :icon="PAGE.icon" :requires-card="PAGE.requiresCard">
    <section class="ui-card tool-panel">
      <h2 class="tool-panel-title"><AppIcon name="film" aria-hidden="true" /><span>媒体信息查看</span></h2>
      <label class="tool-file-drop" :class="{ 'tool-file-drop--active': dragging }" @dragover.prevent="dragging = true" @dragleave="dragging = false" @drop.prevent="handleDrop">
        <span class="tool-file-icon"><AppIcon name="film" /></span>
        <span class="tool-file-title">点击或拖拽音视频文件到此处</span>
        <input ref="fileInput" class="tool-file-input" type="file" accept="audio/*,video/*" @change="handleChange" />
      </label>

      <div v-if="mediaUrl" class="media-preview">
        <video v-if="mediaType.startsWith('video')" :src="mediaUrl" controls style="max-width:100%;border-radius:var(--radius-card);"></video>
        <audio v-else :src="mediaUrl" controls style="width:100%;"></audio>
      </div>

      <div v-if="mediaInfo" class="media-info">
        <p><strong>文件名:</strong> {{ mediaInfo.name }}</p>
        <p><strong>类型:</strong> {{ mediaInfo.type }}</p>
        <p><strong>大小:</strong> {{ mediaInfo.size }}</p>
        <p v-if="mediaInfo.duration"><strong>时长:</strong> {{ mediaInfo.duration }}</p>
        <p v-if="mediaInfo.dimensions"><strong>分辨率:</strong> {{ mediaInfo.dimensions }}</p>
      </div>

      <div class="tool-actions">
        <button type="button" class="u-btn-secondary" @click="clear">清空</button>
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
import ToolPageShell from '@/components/ToolPageShell.vue'
import { TOOL_PAGE, TOOL_PAGES } from '@/constants/index.js'
import { useToolUsage } from '@/hooks/useToolUsage/index.js'

const PAGE = TOOL_PAGES['/media/av']
const usage = useToolUsage('/media/av')
const dragging = ref(false)
const mediaUrl = ref('')
const mediaType = ref('')
const mediaInfo = ref(null)

function handleDrop(e) {
  dragging.value = false
  const file = e.dataTransfer.files[0]
  if (file) loadMedia(file)
}
function handleChange(e) {
  const file = e.target.files[0]
  if (file) loadMedia(file)
}
function formatBytes(b) {
  if (b < 1024) return b + ' B'
  if (b < 1024 * 1024) return (b / 1024).toFixed(1) + ' KB'
  return (b / (1024 * 1024)).toFixed(2) + ' MB'
}
function loadMedia(file) {
  const startedAt = performance.now()
  mediaType.value = file.type
  mediaInfo.value = { name: file.name, type: file.type || '未知', size: formatBytes(file.size) }
  const url = URL.createObjectURL(file)
  mediaUrl.value = url
  usage.record({ durationMs: performance.now() - startedAt, meta: { kind: (file.type || '').split('/')[0] || 'unknown' } })

  if (file.type.startsWith('video')) {
    const video = document.createElement('video')
    video.preload = 'metadata'
    video.onloadedmetadata = () => {
      mediaInfo.value.duration = formatDuration(video.duration)
      mediaInfo.value.dimensions = `${video.videoWidth}x${video.videoHeight}`
    }
    video.src = url
  } else if (file.type.startsWith('audio')) {
    const audio = document.createElement('audio')
    audio.preload = 'metadata'
    audio.onloadedmetadata = () => {
      mediaInfo.value.duration = formatDuration(audio.duration)
    }
    audio.src = url
  }
}
function formatDuration(s) {
  if (!isFinite(s)) return ''
  const m = Math.floor(s / 60)
  const sec = Math.floor(s % 60)
  return `${m}:${String(sec).padStart(2, '0')}`
}
function clear() {
  if (mediaUrl.value) URL.revokeObjectURL(mediaUrl.value)
  mediaUrl.value = ''
  mediaType.value = ''
  mediaInfo.value = null
  dragging.value = false
}
</script>

<style scoped>
.media-preview { margin: calc(var(--space-unit) * 2) 0; }
.media-info { padding: calc(var(--space-unit) * 2); background: var(--bg-surface-2); border-radius: var(--radius-card); }
.media-info p { margin: calc(var(--space-unit)) 0; color: var(--text-primary); }
</style>
