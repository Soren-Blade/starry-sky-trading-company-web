<template>
  <ToolPageShell :title="PAGE.title" :eyebrow="PAGE.eyebrow" :description="pageDescription" :icon="PAGE.icon" :requires-card="PAGE.requiresCard">
    <section class="ui-card tool-panel">
      <h2 class="tool-panel-title"><AppIcon name="fingerprint" aria-hidden="true" /><span>{{ PAGE.inputTitle }}</span></h2>
      <div class="u-field">
        <label class="u-field-label">模式</label>
        <div class="tool-actions">
          <button v-for="item in MODES" :key="item.value" type="button" class="u-btn-secondary" :class="{ 'u-btn-primary': mode === item.value }" @click="switchMode(item.value)">{{ item.label }}</button>
        </div>
      </div>
      <div v-if="mode !== 'hmac'" class="u-field">
        <label class="u-field-label">算法</label>
        <div class="tool-actions">
          <button v-for="item in ALGORITHMS" :key="item" type="button" class="u-btn-secondary" :class="{ 'u-btn-primary': algo === item }" @click="algo = item">{{ item }}</button>
        </div>
      </div>
      <div v-if="mode !== 'file'" class="u-field">
        <label class="u-field-label">{{ mode === 'hmac' ? '消息' : PAGE.sourceLabel }}</label>
        <textarea v-model="source" class="u-input tool-textarea" :placeholder="PAGE.sourcePlaceholder" spellcheck="false" />
      </div>
      <div v-if="mode === 'hmac'" class="u-field">
        <label class="u-field-label" for="hash-secret">HMAC 密钥</label>
        <input id="hash-secret" v-model="secret" type="password" class="u-input" placeholder="输入密钥（只参与本地计算，不会上报）" autocomplete="off" />
      </div>
      <div v-if="mode === 'file'" class="u-field">
        <label class="u-field-label" for="hash-file">文件</label>
        <input id="hash-file" ref="fileInput" type="file" class="u-input" @change="onFileChange" />
        <p v-if="fileInfo" class="u-field-hint">{{ fileInfo }}</p>
      </div>
      <p v-if="mode === 'hmac'" class="u-field-hint">HMAC 固定使用 SHA-256；密钥只在浏览器内存中使用，不会发送到服务器。</p>
      <p v-if="fileWarning" class="u-field-hint">{{ fileWarning }}</p>
      <p v-if="error" class="u-field-error" role="alert">{{ error }}</p>
      <div class="tool-actions">
        <button type="button" class="u-btn-primary" :disabled="busy" @click="compute">{{ busy ? '计算中…' : '计算' }}</button>
        <button type="button" class="u-btn-secondary" @click="clear">{{ PAGE.reset }}</button>
      </div>
      <p class="u-field-hint">Web Crypto 不支持 MD5，因此本页只提供 SHA-1/256/384/512 与 HMAC-SHA256；MD5 已从算法列表移除。</p>
    </section>

    <section class="ui-card tool-panel">
      <h2 class="tool-panel-title"><AppIcon name="check-circle" aria-hidden="true" /><span>{{ PAGE.resultTitle }}</span></h2>
      <ToolResultPane :state="result ? 'success' : 'empty'" :title="PAGE.emptyTitle" :description="PAGE.emptyDesc" icon="fingerprint">
        <template v-if="result">
          <code class="tool-preview" style="word-break:break-all;">{{ result }}</code>
          <div class="tool-result-meta"><span class="tool-result-meta-item">算法: <span class="tool-result-value">{{ resultLabel }}</span></span></div>
        </template>
        <template #actions><button type="button" class="u-btn-primary" :disabled="!result" @click="copy">{{ copyLabel }}</button></template>
      </ToolResultPane>
    </section>

    <template #aside>
      <section class="ui-card tool-aside-card">
        <h3 class="tool-aside-title"><AppIcon name="info" /> {{ TOOL_PAGE.usageTitle }}</h3>
        <ul class="tool-aside-list"><li v-for="item in asideItems" :key="item">{{ item }}</li></ul>
      </section>
      <section class="ui-card tool-aside-card">
        <h3 class="tool-aside-title"><AppIcon name="alert-triangle" /> {{ TOOL_PAGE.noticeTitle }}</h3>
        <p class="tool-aside-note"><AppIcon name="alert-triangle" /> 文件哈希会一次性读入整个文件；超过 50MB 时浏览器内存占用较高，建议先分片或换用命令行工具。</p>
      </section>
    </template>
  </ToolPageShell>
</template>

<script setup>
import { computed, ref } from 'vue'
import AppIcon from '@/components/AppIcon.vue'
import ToolPageShell from '@/components/ToolPageShell.vue'
import ToolResultPane from '@/components/ToolResultPane.vue'
import { TOOL_PAGE, TOOL_PAGES, TOOL_RESULT } from '@/constants/index.js'
import { useToolUsage } from '@/hooks/useToolUsage/index.js'

const PAGE = TOOL_PAGES['/dev/hash']
const usage = useToolUsage('/dev/hash')
// 常量说明仍提到已移除的 MD5，页面内覆盖为实际支持的算法，避免误导；常量文件不允许改。
const pageDescription = 'SHA-1、SHA-256、SHA-384、SHA-512 与 HMAC-SHA256 哈希计算。'
const asideItems = ['支持 SHA-1/256/384/512 与 HMAC-SHA256。', '文本与文件哈希都在浏览器本地完成。', '结果可复制。']
const ALGORITHMS = ['SHA-1', 'SHA-256', 'SHA-384', 'SHA-512']
const MODES = [
  { label: '文本哈希', value: 'text' },
  { label: 'HMAC-SHA256', value: 'hmac' },
  { label: '文件哈希', value: 'file' },
]
const mode = ref('text')
const algo = ref('SHA-256')
const source = ref('')
const secret = ref('')
const file = ref(null)
const fileInput = ref(null)
const fileInfo = ref('')
const fileWarning = ref('')
const result = ref('')
const error = ref('')
const busy = ref(false)
const copyState = ref('idle')

const copyLabel = computed(() => copyState.value === 'ok' ? TOOL_RESULT.copied : copyState.value === 'fail' ? TOOL_RESULT.copyFailed : TOOL_RESULT.copy)
const resultLabel = computed(() => mode.value === 'hmac' ? 'HMAC-SHA256' : algo.value)

function toHex(buffer) {
  return Array.from(new Uint8Array(buffer), (byte) => byte.toString(16).padStart(2, '0')).join('')
}

function formatBytes(size) {
  if (size < 1024) return `${size} B`
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`
  return `${(size / 1024 / 1024).toFixed(1)} MB`
}

function switchMode(next) {
  mode.value = next
  error.value = ''
  result.value = ''
}

function onFileChange(event) {
  const selected = event.target.files?.[0] || null
  file.value = selected
  error.value = ''
  result.value = ''
  fileWarning.value = ''
  if (!selected) {
    fileInfo.value = ''
    return
  }
  fileInfo.value = `${selected.name} · ${formatBytes(selected.size)}`
  if (selected.size > 50 * 1024 * 1024) {
    fileWarning.value = '文件超过 50MB：需要把整个文件读入内存再计算，可能造成页面卡顿，请耐心等待。'
  }
}

function fail(code, message, startedAt) {
  error.value = message
  result.value = ''
  copyState.value = 'idle'
  usage.record({ ok: false, errorCode: code, durationMs: Math.round(performance.now() - startedAt) })
}

async function compute() {
  const startedAt = performance.now()
  error.value = ''
  result.value = ''
  copyState.value = 'idle'
  if (!globalThis.crypto?.subtle) {
    fail('HASH_WEBCRYPTO_UNAVAILABLE', '当前页面不是安全上下文（需要 https 或 localhost），浏览器没有开放 Web Crypto，无法计算标准哈希。', startedAt)
    return
  }
  busy.value = true
  try {
    if (mode.value === 'file') {
      if (!file.value) {
        fail('HASH_FILE_REQUIRED', '请先选择一个文件，再计算文件哈希。', startedAt)
        return
      }
      // 浏览器没有可增量喂入 Web Crypto 的接口，只能整文件 arrayBuffer；大文件会占用较多内存。
      const bytes = await file.value.arrayBuffer()
      const digest = await crypto.subtle.digest(algo.value, bytes)
      result.value = toHex(digest)
      usage.record({ durationMs: Math.round(performance.now() - startedAt), meta: { mode: 'file', algorithm: algo.value, bytes: file.value.size } })
      return
    }
    const text = source.value
    if (!text) {
      fail('HASH_EMPTY_INPUT', '请输入要计算哈希的文本。', startedAt)
      return
    }
    const data = new TextEncoder().encode(text)
    if (mode.value === 'hmac') {
      if (!secret.value) {
        fail('HASH_HMAC_SECRET_REQUIRED', 'HMAC 需要密钥：请填写密钥后再计算。', startedAt)
        return
      }
      const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret.value), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
      const signature = await crypto.subtle.sign('HMAC', key, data)
      result.value = toHex(signature)
      usage.record({ durationMs: Math.round(performance.now() - startedAt), meta: { mode: 'hmac', algorithm: 'HMAC-SHA256', length: text.length } })
      return
    }
    const digest = await crypto.subtle.digest(algo.value, data)
    result.value = toHex(digest)
    usage.record({ durationMs: Math.round(performance.now() - startedAt), meta: { mode: 'text', algorithm: algo.value, length: text.length } })
  } catch (e) {
    fail('HASH_COMPUTE_FAILED', `哈希计算失败：${e.message}。请确认浏览器支持该算法，或换一个算法重试。`, startedAt)
  } finally {
    busy.value = false
  }
}

function clear() {
  source.value = ''
  secret.value = ''
  file.value = null
  fileInfo.value = ''
  fileWarning.value = ''
  if (fileInput.value) fileInput.value.value = ''
  result.value = ''
  error.value = ''
  copyState.value = 'idle'
}

async function copy() {
  if (!result.value) return
  try {
    await navigator.clipboard.writeText(result.value)
    copyState.value = 'ok'
  } catch (e) {
    copyState.value = 'fail'
  }
}
</script>
