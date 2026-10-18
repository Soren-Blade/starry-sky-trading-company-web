<template>
  <ToolPageShell :title="PAGE.title" :eyebrow="PAGE.eyebrow" :description="PAGE.description" :icon="PAGE.icon" :requires-card="PAGE.requiresCard">
    <section class="ui-card tool-panel">
      <h2 class="tool-panel-title"><AppIcon name="lock" aria-hidden="true" /><span>AES-GCM 文本加解密</span></h2>
      <div class="u-field">
        <label class="u-field-label" for="crypto-pass">口令（不保存、不上传，仅用于派生密钥）</label>
        <input id="crypto-pass" v-model="passphrase" type="password" class="u-input" autocomplete="off" placeholder="至少 8 位，越长越好" />
      </div>
      <div class="u-field">
        <label class="u-field-label" for="crypto-input">{{ mode === 'encrypt' ? '明文' : '密文（SSGCM1 格式）' }}</label>
        <textarea id="crypto-input" v-model="input" class="tool-textarea" rows="4" spellcheck="false" :placeholder="mode === 'encrypt' ? '要加密的文本' : '粘贴加密时输出的整段密文'" />
      </div>
      <div class="tool-actions">
        <button type="button" class="u-btn-primary" :disabled="busy" @click="runCipher">{{ busy ? '计算中…' : mode === 'encrypt' ? '加密' : '解密' }}</button>
        <button type="button" class="u-btn-secondary" @click="toggleMode">切换到{{ mode === 'encrypt' ? '解密' : '加密' }}</button>
        <button v-if="cipherOut" type="button" class="u-btn-secondary" @click="copy('cipher')">{{ copyLabel('cipher') }}</button>
      </div>
      <pre v-if="cipherOut" class="tool-result-value">{{ cipherOut }}</pre>
      <p v-if="errorText" class="tool-error-text" role="alert">{{ errorText }}</p>
      <p class="tool-calc-note">密文格式：<code>{{ FORMAT_PREFIX }}</code> + <code>.盐</code> + <code>.IV</code> + <code>.密文</code>（均为 base64）。盐 16 字节、IV 12 字节每次随机，密钥由 PBKDF2-SHA256 派生 {{ PBKDF2_ITERATIONS }} 次；同一口令同一明文两次加密结果不同，属正常。</p>
    </section>
    <section class="ui-card tool-panel">
      <h2 class="tool-panel-title"><AppIcon name="hash" aria-hidden="true" /><span>SHA-256 摘要</span></h2>
      <div class="u-field">
        <label class="u-field-label" for="hash-input">文本</label>
        <textarea id="hash-input" v-model="hashInput" class="tool-textarea" rows="3" spellcheck="false" placeholder="要计算摘要的文本" />
      </div>
      <div class="tool-actions">
        <button type="button" class="u-btn-primary" @click="runHash">计算摘要</button>
        <button v-if="hashOut" type="button" class="u-btn-secondary" @click="copy('hash')">{{ copyLabel('hash') }}</button>
      </div>
      <pre v-if="hashOut" class="tool-result-value">{{ hashOut }}</pre>
      <p class="tool-calc-note">用 <code>crypto.subtle.digest('SHA-256')</code> 对 UTF-8 字节计算，不是本地拼出来的。</p>
    </section>
    <section class="ui-card tool-panel">
      <h2 class="tool-panel-title"><AppIcon name="key" aria-hidden="true" /><span>随机密码</span></h2>
      <div class="crypto-row">
        <div class="u-field">
          <label class="u-field-label" for="pwd-len">长度</label>
          <input id="pwd-len" v-model.number="pwdLength" type="number" min="6" max="64" class="u-input" />
        </div>
        <div class="u-field">
          <span class="u-field-label">字符集</span>
          <div class="crypto-checks">
            <label v-for="item in CHAR_SETS" :key="item.key" class="crypto-check">
              <input v-model="pwdSets" type="checkbox" :value="item.key" />{{ item.label }}
            </label>
          </div>
        </div>
      </div>
      <div class="tool-actions">
        <button type="button" class="u-btn-primary" @click="runPassword">生成</button>
        <button v-if="password" type="button" class="u-btn-secondary" @click="copy('pwd')">{{ copyLabel('pwd') }}</button>
      </div>
      <pre v-if="password" class="tool-result-value">{{ password }}</pre>
      <p class="tool-calc-note">用 <code>crypto.getRandomValues</code> 取随机下标并做拒绝采样（去除取模偏差），保证每个勾选字符集至少出现一次。</p>
    </section>
    <template #aside>
      <section class="ui-card tool-aside-card">
        <h3 class="tool-aside-title"><AppIcon name="info" /> {{ TOOL_PAGE.usageTitle }}</h3>
        <ul class="tool-aside-list"><li v-for="item in PAGE.asideItems" :key="item">{{ item }}</li></ul>
      </section>
      <section class="ui-card tool-aside-card">
        <h3 class="tool-aside-title"><AppIcon name="alert-triangle" /> 安全说明</h3>
        <p class="tool-aside-note">加解密全部在浏览器内的 WebCrypto 完成，口令不离开本机。但网页环境无法保证 XSS 安全，重要密钥仍应离线保管；本工具也不做「密钥库」或「云端同步」。</p>
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
const PAGE = TOOL_PAGES['/dev/crypto']
const usage = useToolUsage('/dev/crypto')
const FORMAT_PREFIX = 'SSGCM1'
const PBKDF2_ITERATIONS = 210000
const CHAR_SETS = [
  { key: 'lower', label: '小写', chars: 'abcdefghijkmnpqrstuvwxyz' },
  { key: 'upper', label: '大写', chars: 'ABCDEFGHJKLMNPQRSTUVWXYZ' },
  { key: 'digit', label: '数字', chars: '23456789' },
  { key: 'symbol', label: '符号', chars: '!@#$%^&*-_=+?' },
]
const mode = ref('encrypt')
const passphrase = ref('')
const input = ref('')
const cipherOut = ref('')
const errorText = ref('')
const hashInput = ref('')
const hashOut = ref('')
const pwdLength = ref(16)
const pwdSets = ref(['lower', 'upper', 'digit'])
const password = ref('')
const busy = ref(false)
const copyTarget = ref('')
function copyLabel(name) {
  return copyTarget.value === name ? '已复制' : '复制'
}
function toBase64(bytes) {
  return btoa(String.fromCharCode(...new Uint8Array(bytes)))
}
function fromBase64(text) {
  const binary = atob(text)
  const bytes = new Uint8Array(binary.length)
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index)
  return bytes
}
function fail(code, startedAt) {
  usage.record({ ok: false, errorCode: code, durationMs: Math.round(performance.now() - startedAt) })
}
async function deriveKey(salt) {
  const material = await crypto.subtle.importKey('raw', new TextEncoder().encode(passphrase.value), 'PBKDF2', false, ['deriveKey'])
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: PBKDF2_ITERATIONS, hash: 'SHA-256' },
    material,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  )
}
function toggleMode() {
  mode.value = mode.value === 'encrypt' ? 'decrypt' : 'encrypt'
  // 切换模式时清空输出，避免把密文当明文继续看。
  cipherOut.value = ''
  errorText.value = ''
}
async function runCipher() {
  const startedAt = performance.now()
  errorText.value = ''
  cipherOut.value = ''
  if (!passphrase.value) {
    errorText.value = '请先输入口令'
    fail('CRYPTO_PASSPHRASE_REQUIRED', startedAt)
    return
  }
  if (!input.value.trim()) {
    errorText.value = '内容为空'
    fail('CRYPTO_INPUT_EMPTY', startedAt)
    return
  }
  if (!globalThis.crypto || !crypto.subtle) {
    errorText.value = '当前环境不支持 WebCrypto（需要 https 或 localhost）'
    fail('WEB_CRYPTO_UNAVAILABLE', startedAt)
    return
  }
  busy.value = true
  try {
    if (mode.value === 'encrypt') {
      const salt = crypto.getRandomValues(new Uint8Array(16))
      const iv = crypto.getRandomValues(new Uint8Array(12))
      const key = await deriveKey(salt)
      const cipher = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, new TextEncoder().encode(input.value))
      cipherOut.value = [FORMAT_PREFIX, toBase64(salt), toBase64(iv), toBase64(cipher)].join('.')
      usage.record({ durationMs: Math.round(performance.now() - startedAt), meta: { action: 'encrypt', chars: input.value.length } })
    } else {
      const parts = input.value.trim().split('.')
      if (parts.length !== 4 || parts[0] !== FORMAT_PREFIX) throw new Error('bad format')
      const salt = fromBase64(parts[1])
      const iv = fromBase64(parts[2])
      const key = await deriveKey(salt)
      const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, fromBase64(parts[3]))
      cipherOut.value = new TextDecoder().decode(plain)
      usage.record({ durationMs: Math.round(performance.now() - startedAt), meta: { action: 'decrypt', chars: cipherOut.value.length } })
    }
  } catch (error) {
    // AES-GCM 自带认证，解密失败等价于「口令错」或「密文被改」，浏览器都抛同一个错，无法区分
    errorText.value = mode.value === 'encrypt' ? '加密失败：浏览器不支持该算法组合' : '口令错误或数据被篡改'
    fail(error && error.message === 'bad format' ? 'CRYPTO_FORMAT_INVALID' : 'CRYPTO_DECRYPT_FAILED', startedAt)
  } finally {
    busy.value = false
  }
}
async function runHash() {
  const startedAt = performance.now()
  if (!hashInput.value) {
    fail('HASH_INPUT_EMPTY', startedAt)
    return
  }
  try {
    const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(hashInput.value))
    hashOut.value = Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('')
    usage.record({ durationMs: Math.round(performance.now() - startedAt), meta: { chars: hashInput.value.length } })
  } catch {
    hashOut.value = ''
    fail('HASH_FAILED', startedAt)
  }
}
function randomIndex(max) {
  // 拒绝采样：丢弃落在 2^32 尾部余数区间的值，保证下标均匀
  const limit = Math.floor(4294967296 / max) * max
  const buffer = new Uint32Array(1)
  for (;;) {
    crypto.getRandomValues(buffer)
    if (buffer[0] < limit) return buffer[0] % max
  }
}
function runPassword() {
  const startedAt = performance.now()
  const length = Math.min(64, Math.max(6, Math.round(pwdLength.value) || 0))
  const sets = CHAR_SETS.filter((item) => pwdSets.value.includes(item.key))
  if (sets.length === 0) {
    password.value = ''
    fail('PASSWORD_CHARSET_EMPTY', startedAt)
    return
  }
  const pool = sets.map((item) => item.chars).join('')
  const chars = sets.map((item) => item.chars[randomIndex(item.chars.length)])
  while (chars.length < length) chars.push(pool[randomIndex(pool.length)])
  // 洗牌，避免勾选的字符集总排在开头
  for (let index = chars.length - 1; index > 0; index -= 1) {
    const swap = randomIndex(index + 1)
    ;[chars[index], chars[swap]] = [chars[swap], chars[index]]
  }
  password.value = chars.slice(0, length).join('')
  usage.record({ durationMs: Math.round(performance.now() - startedAt), meta: { length } })
}
async function copy(name) {
  const text = name === 'pwd' ? password.value : name === 'hash' ? hashOut.value : cipherOut.value
  try {
    await navigator.clipboard.writeText(text)
    copyTarget.value = name
  } catch {
    copyTarget.value = ''
    errorText.value = '剪贴板不可用，请手动选中复制'
  }
}
</script>
<style scoped>
.tool-error-text { margin: 0; color: var(--danger); font-size: var(--fs-sm); }
.crypto-row { display: grid; grid-template-columns: 120px 1fr; gap: calc(var(--space-unit) * 2); }
.crypto-checks { display: flex; flex-wrap: wrap; gap: calc(var(--space-unit) * 1.5); }
.crypto-check { display: inline-flex; align-items: center; gap: 6px; font-size: var(--fs-sm); cursor: pointer; }
@media (max-width: 767px) {
  .crypto-row { grid-template-columns: 1fr; }
}
</style>
