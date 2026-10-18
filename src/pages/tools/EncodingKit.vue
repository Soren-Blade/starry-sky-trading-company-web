<template>
  <ToolPageShell :title="PAGE.title" :eyebrow="PAGE.eyebrow" :description="PAGE.description" :icon="PAGE.icon" :requires-card="PAGE.requiresCard">
    <section class="ui-card tool-panel">
      <h2 class="tool-panel-title"><AppIcon name="cpu" aria-hidden="true" /><span>{{ PAGE.inputTitle }}</span></h2>
      <div class="u-field">
        <label class="u-field-label" for="enc-source">{{ PAGE.sourceLabel }}</label>
        <textarea id="enc-source" v-model="source" class="u-input tool-textarea" :placeholder="PAGE.sourcePlaceholder" spellcheck="false"></textarea>
        <p class="u-field-hint">源编码为 GBK/Big5 等时：输入若是十六进制字节（如 D6 D0 CE C4）会按字节解释；否则按 Latin-1 逐字符取字节，适合修复乱码文本。</p>
      </div>
      <div class="tool-form">
        <div class="u-field">
          <label class="u-field-label" for="enc-from">{{ PAGE.fromLabel }}</label>
          <SelectField id="enc-from" v-model="fromEncoding" :options="ENCODINGS" />
        </div>
        <div class="u-field">
          <label class="u-field-label" for="enc-to">{{ PAGE.toLabel }}</label>
          <SelectField id="enc-to" v-model="toEncoding" :options="ENCODINGS" />
          <p v-if="targetUnsupported" class="u-field-hint">浏览器只能解码 {{ toEncoding }}，不能把文本编码成这种编码；该方向会报错并说明原因。</p>
        </div>
        <button type="button" class="u-btn-secondary" @click="swapEncoding"><AppIcon name="arrow-left-right" /> {{ PAGE.swap }}</button>
      </div>
      <p class="u-field-hint">TextDecoder 只能把字节解码为文本；TextEncoder 只能输出 UTF-8，因此编码方向仅支持 UTF-8/UTF-16LE、Base64、Hex、URL。</p>
      <div class="tool-actions">
        <button type="button" class="u-btn-primary" :disabled="!canSubmit" @click="start">{{ PAGE.submit }}</button>
        <button type="button" class="u-btn-secondary" :disabled="!source" @click="clear">{{ PAGE.reset }}</button>
      </div>
    </section>
    <section class="ui-card tool-panel">
      <h2 class="tool-panel-title"><AppIcon name="check-circle" aria-hidden="true" /><span>{{ PAGE.resultTitle }}</span></h2>
      <ToolResultPane :state="jobState" :title="PAGE.emptyTitle" :description="PAGE.emptyDesc" :error="jobError" icon="cpu">
        <template v-if="result">
          <pre class="tool-preview">{{ result.text }}</pre>
          <div class="tool-result-meta">
            <span class="tool-result-meta-item">输入字节: <span class="tool-result-value">{{ result.originalBytes }}</span></span>
            <span class="tool-result-meta-item">输出字节: <span class="tool-result-value">{{ result.resultBytes }}</span></span>
          </div>
        </template>
        <template #actions><button type="button" class="u-btn-primary" :disabled="!result" @click="copyResult">{{ copyLabel }}</button></template>
      </ToolResultPane>
    </section>

    <template #aside>
      <section class="ui-card tool-aside-card">
        <h3 class="tool-aside-title"><AppIcon name="info" /> {{ TOOL_PAGE.usageTitle }}</h3>
        <ul class="tool-aside-list"><li v-for="item in PAGE.asideItems" :key="item">{{ item }}</li></ul>
      </section>
      <section class="ui-card tool-aside-card">
        <h3 class="tool-aside-title"><AppIcon name="alert-triangle" /> {{ TOOL_PAGE.noticeTitle }}</h3>
        <p class="tool-aside-note"><AppIcon name="alert-triangle" /> 浏览器没有内置 GBK/Big5 编码器，只有解码器；需要「文本 → GBK 字节」时请改用后端或 iconv-lite 等 Node 工具。</p>
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
import { useToolJob } from '@/hooks/useToolJob/index.js'
import { useToolUsage } from '@/hooks/useToolUsage/index.js'

const PAGE = TOOL_PAGES['/text/encoding-kit']
const usage = useToolUsage('/text/encoding-kit')
const ENCODINGS = [
  { label: 'UTF-8 文本', value: 'UTF-8' },
  { label: 'UTF-16LE 文本', value: 'UTF-16LE' },
  { label: 'GBK（仅解码）', value: 'GBK' },
  { label: 'GB18030（仅解码）', value: 'GB18030' },
  { label: 'Big5（仅解码）', value: 'Big5' },
  { label: 'Shift_JIS（仅解码）', value: 'Shift_JIS' },
  { label: 'EUC-KR（仅解码）', value: 'EUC-KR' },
  { label: 'Windows-1252（仅解码）', value: 'Windows-1252' },
  { label: 'ISO-8859-1（仅解码）', value: 'ISO-8859-1' },
  { label: 'Base64', value: 'Base64' },
  { label: 'URL 编码', value: 'URL' },
  { label: 'Hex 十六进制', value: 'Hex' },
]
const DECODER_LABELS = {
  'UTF-8': 'utf-8', 'UTF-16LE': 'utf-16le', GBK: 'gbk', GB18030: 'gb18030', Big5: 'big5',
  Shift_JIS: 'shift_jis', 'EUC-KR': 'euc-kr', 'Windows-1252': 'windows-1252', 'ISO-8859-1': 'iso-8859-1',
}
const TRANSPORTS = new Set(['Base64', 'URL', 'Hex'])
const LEGACY = new Set(['GBK', 'GB18030', 'Big5', 'Shift_JIS', 'EUC-KR', 'Windows-1252', 'ISO-8859-1'])
const source = ref('')
const fromEncoding = ref('UTF-8')
const toEncoding = ref('Base64')
const copyState = ref('idle')
const { state: jobState, result, error: jobError, run, reset: resetJob } = useToolJob({ run: convertEncoding })
const busy = computed(() => jobState.value === 'loading')
const canSubmit = computed(() => Boolean(source.value.trim()) && !busy.value)
const targetUnsupported = computed(() => LEGACY.has(toEncoding.value))
const copyLabel = computed(() => copyState.value === 'ok' ? TOOL_RESULT.copied : copyState.value === 'fail' ? TOOL_RESULT.copyFailed : TOOL_RESULT.copy)

function fail(message, code) {
  const error = new Error(message)
  error.code = code
  return error
}
function hexToBytes(text) {
  const clean = text.trim().replace(/0x/gi, '').replace(/[\s,;:-]/g, '')
  if (!clean || clean.length % 2 || /[^0-9a-f]/i.test(clean)) {
    throw fail('Hex 输入格式不对：只能包含 0-9、a-f，且每两个字符表示一个字节（可用空格分隔）。', 'ENCODING_INVALID_HEX')
  }
  return new Uint8Array(clean.match(/.{2}/g).map((pair) => parseInt(pair, 16)))
}

function bytesToHex(bytes) {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join(' ')
}

function bytesToBase64(bytes) {
  let binary = ''
  for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
  return btoa(binary)
}

function base64ToBytes(text) {
  let base64 = text.replace(/\s/g, '').replace(/-/g, '+').replace(/_/g, '/')
  while (base64.length % 4) base64 += '='
  try {
    return Uint8Array.from(atob(base64), (char) => char.charCodeAt(0))
  } catch {
    throw fail('Base64 输入格式不对：请检查是否包含非法字符，或补全末尾的 = 填充。', 'ENCODING_INVALID_BASE64')
  }
}

function utf16leBytes(text) {
  const bytes = new Uint8Array(text.length * 2)
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i)
    bytes[i * 2] = code & 0xff
    bytes[i * 2 + 1] = code >>> 8
  }
  return bytes
}

function bytesToUrl(bytes) {
  // URL 编码按字节输出 %XX，保留 RFC 3986 的 unreserved 字符。
  let out = ''
  for (const byte of bytes) {
    const char = String.fromCharCode(byte)
    out += /[A-Za-z0-9\-._~]/.test(char) ? char : `%${byte.toString(16).toUpperCase().padStart(2, '0')}`
  }
  return out
}

function readSourceBytes(text) {
  if (fromEncoding.value === 'Base64') return base64ToBytes(text)
  if (fromEncoding.value === 'Hex') return hexToBytes(text)
  if (fromEncoding.value === 'URL') {
    try { return new TextEncoder().encode(decodeURIComponent(text)) } catch { throw fail('URL 编码输入不合法：百分号后必须跟两位十六进制数。', 'ENCODING_INVALID_URL') }
  }
  if (fromEncoding.value === 'UTF-16LE') return utf16leBytes(text)
  if (fromEncoding.value === 'UTF-8') return new TextEncoder().encode(text)
  // 浏览器无法把任意文本编码成 GBK 等字节，只能把每个字符当作一个字节（Latin-1）读入，
  // 因此这里适合粘贴「按 Latin-1 显示」的乱码；带分隔符的十六进制字节会自动识别。
  const hexLike = text.trim()
  if (/^(?:0x)?[0-9a-f]{2}$/i.test(hexLike) || /^(?:0x)?[0-9a-f]{2}(?:[\s,;:-]+(?:0x)?[0-9a-f]{2})+$/i.test(hexLike)) return hexToBytes(text)
  const bytes = new Uint8Array(text.length)
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i)
    if (code > 0xff) throw fail('源编码是 GBK/Big5 等单字节读入模式，但输入含有超出 Latin-1 的字符。请改成粘贴十六进制字节，或先把文本转为 UTF-8。', 'ENCODING_INVALID_BYTES')
    bytes[i] = code
  }
  return bytes
}

function decodeBytes(bytes) {
  if (!DECODER_LABELS[fromEncoding.value]) return new TextDecoder('utf-8').decode(bytes)
  try {
    return new TextDecoder(DECODER_LABELS[fromEncoding.value]).decode(bytes)
  } catch (e) {
    throw fail(`当前浏览器不支持 ${fromEncoding.value} 解码：${e.message}。请换用 Chrome/Edge 等支持该编码的浏览器。`, 'ENCODING_DECODER_UNAVAILABLE')
  }
}

function encodeResult(decodedText) {
  if (toEncoding.value === 'Base64') return bytesToBase64(new TextEncoder().encode(decodedText))
  if (toEncoding.value === 'Hex') return bytesToHex(new TextEncoder().encode(decodedText))
  if (toEncoding.value === 'URL') return bytesToUrl(new TextEncoder().encode(decodedText))
  if (toEncoding.value === 'UTF-8' || toEncoding.value === 'UTF-16LE') return decodedText
  throw fail(`浏览器只能解码 ${toEncoding.value}，不能把文本编码成该编码。请把目标改为 UTF-8、UTF-16LE、Base64、Hex 或 URL。`, 'ENCODING_ENCODE_UNSUPPORTED')
}

async function convertEncoding() {
  const startedAt = performance.now()
  try {
    if (!source.value.trim()) throw fail(PAGE.invalidEmpty, 'ENCODING_EMPTY_INPUT')
    await new Promise((resolve) => { setTimeout(resolve, 0) })
    const bytes = readSourceBytes(source.value)
    // 两端都是字节表示时直接换表示，避免经过 UTF-8 文本导致二进制数据被替换字符破坏。
    if (TRANSPORTS.has(fromEncoding.value) && TRANSPORTS.has(toEncoding.value)) {
      const text = toEncoding.value === 'Base64' ? bytesToBase64(bytes) : toEncoding.value === 'Hex' ? bytesToHex(bytes) : bytesToUrl(bytes)
      usage.record({ durationMs: Math.round(performance.now() - startedAt), meta: { from: fromEncoding.value, to: toEncoding.value, bytes: bytes.length } })
      return { text, originalBytes: `${bytes.length} 字节`, resultBytes: `${bytes.length} 字节` }
    }
    const decodedText = decodeBytes(bytes)
    const text = encodeResult(decodedText)
    const resultBytes = toEncoding.value === 'Base64' ? base64ToBytes(text).length : toEncoding.value === 'Hex' ? hexToBytes(text).length : toEncoding.value === 'URL' ? new TextEncoder().encode(decodeURIComponent(text)).length : toEncoding.value === 'UTF-16LE' ? text.length * 2 : new TextEncoder().encode(text).length
    usage.record({ durationMs: Math.round(performance.now() - startedAt), meta: { from: fromEncoding.value, to: toEncoding.value, bytes: bytes.length } })
    return { text, originalBytes: `${bytes.length} 字节`, resultBytes: `${resultBytes} 字节` }
  } catch (e) {
    usage.record({ ok: false, errorCode: e.code || 'ENCODING_CONVERT_FAILED', durationMs: Math.round(performance.now() - startedAt) })
    throw e
  }
}

function swapEncoding() {
  const temp = fromEncoding.value
  fromEncoding.value = toEncoding.value
  toEncoding.value = temp
}

function start() { copyState.value = 'idle'; run() }
function clear() { source.value = ''; copyState.value = 'idle'; resetJob() }
async function copyResult() {
  const text = result.value?.text
  if (!text) return
  try { await navigator.clipboard.writeText(text); copyState.value = 'ok' } catch (e) { copyState.value = 'fail' }
}
</script>
