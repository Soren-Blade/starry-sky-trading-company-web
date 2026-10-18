<template>
  <ToolPageShell :title="PAGE.title" :eyebrow="PAGE.eyebrow" :description="PAGE.description" :icon="PAGE.icon" :requires-card="PAGE.requiresCard">
    <section class="ui-card tool-panel">
      <h2 class="tool-panel-title"><AppIcon name="key" aria-hidden="true" /><span>解析与验签</span></h2>
      <div class="u-field">
        <label class="u-field-label" for="jwt-token">JWT 字符串</label>
        <textarea id="jwt-token" v-model="jwt" class="u-input tool-textarea" placeholder="eyJhbGciOiJIUzI1NiIs..." spellcheck="false" />
      </div>
      <div class="tool-form">
        <div class="u-field">
          <label class="u-field-label" for="jwt-secret">HMAC 密钥（仅 HS256/384/512 验签用）</label>
          <input id="jwt-secret" v-model="secret" class="u-input" type="password" placeholder="不填则只解码，不验签" />
        </div>
        <div class="u-field">
          <label class="u-field-label" for="jwt-alg">生成算法</label>
          <SelectField id="jwt-alg" v-model="genAlg" :options="algOptions" />
        </div>
      </div>
      <div class="tool-actions">
        <button type="button" class="u-btn-primary" :disabled="!jwt.trim() || busy" @click="decode">{{ busy ? '处理中…' : '解析并验签' }}</button>
        <button type="button" class="u-btn-secondary" :disabled="!decoded" @click="clear">清空</button>
      </div>
      <p class="u-field-hint">验签只支持 HMAC（HS256/HS384/HS512）；RS256/ES256 等非对称算法需要公钥或 JWKS，本页不实现，只解码并明确标注。</p>
    </section>

    <section class="ui-card tool-panel">
      <h2 class="tool-panel-title"><AppIcon name="file-text" aria-hidden="true" /><span>生成 JWT</span></h2>
      <div class="u-field">
        <label class="u-field-label" for="jwt-payload">Payload（JSON）</label>
        <textarea id="jwt-payload" v-model="payloadInput" class="u-input tool-textarea" placeholder='{"sub":"123","name":"张三","exp":1893456000}' spellcheck="false" />
      </div>
      <div class="tool-actions">
        <button type="button" class="u-btn-primary" :disabled="genBusy" @click="generate">{{ genBusy ? '生成中…' : 'HMAC 签名生成' }}</button>
      </div>
      <div v-if="tokenOut" class="u-field">
        <span class="u-field-label">生成的 Token</span>
        <ToolCodeBlock :code="tokenOut" lang="text" />
      </div>
    </section>

    <section class="ui-card tool-panel">
      <h2 class="tool-panel-title"><AppIcon name="check-circle" aria-hidden="true" /><span>解析结果</span></h2>
      <ToolResultPane :state="decoded ? 'success' : errorMessage ? 'error' : 'empty'" title="尚未解析" description="粘贴 JWT 后点击「解析并验签」，查看 Header、Payload 和签名状态。" :error="errorMessage" icon="key">
        <template v-if="decoded">
          <div class="jwt-badges">
            <span :class="['jwt-badge', verifyState.ok ? 'jwt-ok' : verifyState.skip ? 'jwt-skip' : 'jwt-bad']">{{ verifyState.text }}</span>
            <span :class="['jwt-badge', timeState.ok ? 'jwt-ok' : 'jwt-bad']">{{ timeState.text }}</span>
          </div>
          <div class="jwt-section"><h4 class="jwt-label">Header</h4><ToolCodeBlock :code="pretty(decoded.header)" lang="json" /></div>
          <div class="jwt-section"><h4 class="jwt-label">Payload</h4><ToolCodeBlock :code="pretty(decoded.payload)" lang="json" /></div>
          <div class="jwt-section"><h4 class="jwt-label">Signature</h4><ToolCodeBlock :code="decoded.signature" lang="text" /></div>
        </template>
      </ToolResultPane>
    </section>

    <template #aside>
      <section class="ui-card tool-aside-card">
        <h3 class="tool-aside-title"><AppIcon name="info" /> {{ TOOL_PAGE.usageTitle }}</h3>
        <ul class="tool-aside-list"><li v-for="item in PAGE.asideItems" :key="item">{{ item }}</li></ul>
      </section>
      <section class="ui-card tool-aside-card">
        <h3 class="tool-aside-title"><AppIcon name="alert-triangle" /> {{ TOOL_PAGE.noticeTitle }}</h3>
        <p class="tool-aside-note"><AppIcon name="alert-triangle" /> 签名只证明「持有密钥的人生成过它」，不代表内容可信；生产环境请始终在服务端校验 exp、nbf、iss、aud。</p>
      </section>
    </template>
  </ToolPageShell>
</template>

<script setup>
import { computed, ref } from 'vue'
import AppIcon from '@/components/AppIcon.vue'
import SelectField from '@/components/SelectField.vue'
import ToolCodeBlock from '@/components/ToolCodeBlock.vue'
import ToolPageShell from '@/components/ToolPageShell.vue'
import ToolResultPane from '@/components/ToolResultPane.vue'
import { TOOL_PAGE, TOOL_PAGES } from '@/constants/index.js'
import { useToolUsage } from '@/hooks/useToolUsage/index.js'

const PAGE = TOOL_PAGES['/dev/jwt']
const usage = useToolUsage('/dev/jwt')
const jwt = ref('')
const secret = ref('')
const genAlg = ref('HS256')
const payloadInput = ref('{\n  "sub": "1234567890",\n  "name": "张三",\n  "iat": 1516239022\n}')
const decoded = ref(null)
const tokenOut = ref('')
const busy = ref(false)
const genBusy = ref(false)
const errorMessage = ref('')
const verifyState = ref({ ok: false, skip: true, text: '未验签' })

const algOptions = [
  { label: 'HS256（HMAC-SHA256）', value: 'HS256' },
  { label: 'HS384（HMAC-SHA384）', value: 'HS384' },
  { label: 'HS512（HMAC-SHA512）', value: 'HS512' },
]
const HASH = { HS256: 'SHA-256', HS384: 'SHA-384', HS512: 'SHA-512' }

function fail(message, code) {
  const error = new Error(message)
  error.code = code
  return error
}

function bytesToB64url(bytes) {
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function textToB64url(text) {
  return bytesToB64url(new TextEncoder().encode(text))
}

function b64urlToText(part) {
  const base64 = part.replace(/-/g, '+').replace(/_/g, '/')
  // base64url 去掉了 = 填充，atob 要求长度是 4 的倍数，必须补齐，否则中文 payload 会解码失败。
  const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, '=')
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(Uint8Array.from(atob(padded), (char) => char.charCodeAt(0)))
  } catch {
    throw fail('JWT 段不是合法的 base64url 或不是 UTF-8 文本，无法还原 Header/Payload。', 'JWT_DECODE_FAILED')
  }
}

async function hmacSign(algorithm, keyText, data) {
  if (!globalThis.crypto?.subtle) throw fail('当前环境没有 Web Crypto，无法验签。请使用 HTTPS 或 localhost 打开页面。', 'JWT_WEBCRYPTO_UNAVAILABLE')
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(keyText), { name: 'HMAC', hash: HASH[algorithm] }, false, ['sign'])
  return new Uint8Array(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(data)))
}

const timeState = computed(() => {
  if (!decoded.value) return { ok: false, text: '时间未知' }
  const payload = decoded.value.payload
  const now = Math.floor(Date.now() / 1000)
  if (payload.exp && payload.exp < now) return { ok: false, text: `已过期（exp ${new Date(payload.exp * 1000).toLocaleString('zh-CN')}）` }
  if (payload.nbf && payload.nbf > now) return { ok: false, text: `尚未生效（nbf ${new Date(payload.nbf * 1000).toLocaleString('zh-CN')}）` }
  return { ok: true, text: payload.exp || payload.nbf ? '时间校验通过' : '未设置 exp/nbf，无法判断时效' }
})

function pretty(value) { return JSON.stringify(value, null, 2) }

async function decode() {
  if (!jwt.value.trim() || busy.value) return
  const startedAt = performance.now()
  busy.value = true
  errorMessage.value = ''
  decoded.value = null
  try {
    const parts = jwt.value.trim().split('.')
    if (parts.length !== 3) throw fail('JWT 必须由 Header.Payload.Signature 三段组成，当前不是 3 段。', 'JWT_DECODE_FAILED')
    const header = JSON.parse(b64urlToText(parts[0]))
    const payload = JSON.parse(b64urlToText(parts[1]))
    decoded.value = { header, payload, signature: parts[2] }
    if (header.alg === 'none') {
      verifyState.value = { ok: false, skip: true, text: 'alg=none：没有签名，不可信' }
    } else if (String(header.alg).startsWith('HS')) {
      if (!HASH[header.alg]) throw fail(`不支持 ${header.alg}：本页只实现 HS256/HS384/HS512。`, 'JWT_UNSUPPORTED_ALG')
      if (!secret.value) {
        verifyState.value = { ok: false, skip: true, text: '未填密钥，仅解码' }
      } else {
        const actual = bytesToB64url(await hmacSign(header.alg, secret.value, `${parts[0]}.${parts[1]}`))
        verifyState.value = actual === parts[2] ? { ok: true, skip: false, text: `${header.alg} 验签通过` } : { ok: false, skip: false, text: `${header.alg} 验签失败：签名不匹配` }
      }
    } else {
      verifyState.value = { ok: false, skip: true, text: `${header.alg} 非对称验签未在本页实现` }
    }
    usage.record({ durationMs: Math.round(performance.now() - startedAt), meta: { alg: header.alg, verified: verifyState.value.ok } })
  } catch (e) {
    errorMessage.value = `解析失败：${e.message}`
    usage.record({ ok: false, errorCode: e.code || 'JWT_DECODE_FAILED', durationMs: Math.round(performance.now() - startedAt) })
  } finally {
    busy.value = false
  }
}

async function generate() {
  if (genBusy.value) return
  const startedAt = performance.now()
  genBusy.value = true
  errorMessage.value = ''
  try {
    if (!secret.value) throw fail('生成 JWT 必须填写 HMAC 密钥，否则签名无法验证。', 'JWT_SECRET_REQUIRED')
    let payload
    try { payload = JSON.parse(payloadInput.value) } catch (e) { throw fail(`Payload 不是合法 JSON：${e.message}。请检查逗号、引号和括号。`, 'JWT_PAYLOAD_INVALID') }
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) throw fail('Payload 必须是 JSON 对象，不能是数组或基本类型。', 'JWT_PAYLOAD_INVALID')
    const header = { alg: genAlg.value, typ: 'JWT' }
    const signingInput = `${textToB64url(JSON.stringify(header))}.${textToB64url(JSON.stringify(payload))}`
    tokenOut.value = `${signingInput}.${bytesToB64url(await hmacSign(genAlg.value, secret.value, signingInput))}`
    usage.record({ durationMs: Math.round(performance.now() - startedAt), meta: { action: 'generate', alg: genAlg.value } })
  } catch (e) {
    errorMessage.value = `生成失败：${e.message}`
    usage.record({ ok: false, errorCode: e.code || 'JWT_GENERATE_FAILED', durationMs: Math.round(performance.now() - startedAt) })
  } finally {
    genBusy.value = false
  }
}

function clear() { jwt.value = ''; decoded.value = null; errorMessage.value = '' }
</script>

<style scoped>
.jwt-badges { display: flex; flex-wrap: wrap; gap: calc(var(--space-unit)); margin-bottom: calc(var(--space-unit) * 2); }
.jwt-badge { padding: calc(var(--space-unit) * 0.5) calc(var(--space-unit)); border-radius: var(--radius-pill); font-size: var(--fs-label); font-weight: var(--fw-heading); }
.jwt-ok { background: var(--success-bg); color: var(--success); }
.jwt-bad { background: var(--danger-bg); color: var(--danger); }
.jwt-skip { background: var(--warning-bg); color: var(--warning); }
.jwt-section { margin-bottom: calc(var(--space-unit) * 2); }
.jwt-label { margin: 0 0 var(--space-unit); font-size: var(--fs-sm); font-weight: var(--fw-heading); color: var(--text-secondary); }
@media (max-width: 575px) { .jwt-badge { font-size: var(--fs-label); } }
</style>
