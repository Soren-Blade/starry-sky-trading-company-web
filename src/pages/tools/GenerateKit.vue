<template>
  <ToolPageShell :title="PAGE.title" :eyebrow="PAGE.eyebrow" :description="PAGE.description" :icon="PAGE.icon" :requires-card="PAGE.requiresCard">
    <section class="ui-card tool-panel">
      <h2 class="tool-panel-title"><AppIcon name="shuffle" aria-hidden="true" /><span>生成器</span></h2>
      <div class="u-field"><label class="u-field-label">类型</label>
        <SelectField v-model="genType" :options="TYPE_OPTIONS" aria-label="生成器类型" />
      </div>
      <template v-if="genType === 'password'">
        <div class="u-field"><label class="u-field-label">长度</label><input v-model.number="pwdLength" type="number" min="6" max="64" class="u-input" /></div>
        <div class="tool-form">
          <label class="u-switch"><input v-model="pwdSets" type="checkbox" value="upper" /><span class="u-switch-track"><span class="u-switch-thumb"></span></span><span class="u-switch-label">大写字母</span></label>
          <label class="u-switch"><input v-model="pwdSets" type="checkbox" value="lower" /><span class="u-switch-track"><span class="u-switch-thumb"></span></span><span class="u-switch-label">小写字母</span></label>
          <label class="u-switch"><input v-model="pwdSets" type="checkbox" value="digit" /><span class="u-switch-track"><span class="u-switch-thumb"></span></span><span class="u-switch-label">数字</span></label>
          <label class="u-switch"><input v-model="pwdSets" type="checkbox" value="symbol" /><span class="u-switch-track"><span class="u-switch-thumb"></span></span><span class="u-switch-label">符号</span></label>
        </div>
        <div v-if="passwordEntropy" class="gen-strength">
          <div class="gen-strength-track"><span class="gen-strength-bar" :style="{ width: strengthPercent + '%' }"></span></div>
          <p class="tool-result-note">约 {{ passwordEntropy }} bit 熵（{{ pwdLength }} 位 × log2(字符集 {{ poolSize }})）→ {{ strengthLabel }}</p>
        </div>
      </template>
      <template v-else-if="genType === 'number'">
        <div class="gen-row">
          <div class="u-field"><label class="u-field-label" for="gen-min">最小值</label><input id="gen-min" v-model.number="randMin" type="number" class="u-input" /></div>
          <div class="u-field"><label class="u-field-label" for="gen-max">最大值</label><input id="gen-max" v-model.number="randMax" type="number" class="u-input" /></div>
          <div class="u-field"><label class="u-field-label" for="gen-count">数量</label><input id="gen-count" v-model.number="batchCount" type="number" min="1" max="200" class="u-input" /></div>
        </div>
      </template>
      <template v-else-if="genType === 'date'">
        <div class="gen-row">
          <div class="u-field"><label class="u-field-label" for="gen-from">起始日</label><input id="gen-from" v-model="dateFrom" type="date" class="u-input" /></div>
          <div class="u-field"><label class="u-field-label" for="gen-to">结束日</label><input id="gen-to" v-model="dateTo" type="date" class="u-input" /></div>
          <div class="u-field"><label class="u-field-label" for="gen-date-count">数量</label><input id="gen-date-count" v-model.number="batchCount" type="number" min="1" max="200" class="u-input" /></div>
        </div>
      </template>
      <template v-else>
        <div class="gen-row">
          <div class="u-field"><label class="u-field-label" for="gen-batch">条数</label><input id="gen-batch" v-model.number="batchCount" type="number" min="1" max="200" class="u-input" /></div>
          <label class="gen-check"><input v-model="uniqueOnly" type="checkbox" />结果去重</label>
        </div>
      </template>
      <div class="tool-actions">
        <button type="button" class="u-btn-primary" @click="generate">生成</button>
        <button type="button" class="u-btn-secondary" :disabled="!results.length" @click="copyValue(results.join('\n'), 'copy-all')">复制全部</button>
      </div>
      <p v-if="notice" class="tool-calc-note" role="status">{{ notice }}</p>
    </section>
    <section class="ui-card tool-panel">
      <h2 class="tool-panel-title"><AppIcon name="check-circle" aria-hidden="true" /><span>结果</span></h2>
      <ToolResultPane :state="results.length ? 'success' : 'empty'" :title="PAGE.emptyTitle" :description="PAGE.emptyDesc" icon="shuffle">
        <template v-if="results.length">
          <div class="gen-results">
            <div v-for="(row, index) in results" :key="`${index}-${row}`" class="gen-result-row">
              <code class="gen-result-text">{{ row }}</code>
              <button type="button" class="u-btn-secondary gen-copy" @click="copyValue(row, 'copy-one')">复制</button>
            </div>
          </div>
          <p class="tool-result-note">共 {{ results.length }} 条；重复项由「去重」开关控制。</p>
        </template>
      </ToolResultPane>
    </section>
    <template #aside>
      <section class="ui-card tool-aside-card">
        <h3 class="tool-aside-title"><AppIcon name="info" /> {{ TOOL_PAGE.usageTitle }}</h3>
        <ul class="tool-aside-list"><li v-for="item in PAGE.asideItems" :key="item">{{ item }}</li></ul>
      </section>
      <section class="ui-card tool-aside-card">
        <h3 class="tool-aside-title"><AppIcon name="alert-triangle" /> 随机性来源</h3>
        <p class="tool-aside-note"><span>全部取自 <code>crypto.getRandomValues</code>（拒绝采样消除取模偏差）；UUID 走 <code>crypto.randomUUID()</code>，不可用时按 RFC 4122 手工拼 v4。没有「示例数据」兜底。</span></p>
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
import { TOOL_PAGE, TOOL_PAGES } from '@/constants/index.js'
import { useToolUsage } from '@/hooks/useToolUsage/index.js'
const PAGE = TOOL_PAGES['/utility/generate']
const usage = useToolUsage('/utility/generate')
const TYPE_OPTIONS = [['uuid', 'UUID v4'], ['password', '随机密码'], ['lorem', 'Lorem 英文假文'], ['cn', '中文假文'], ['number', '随机数字'], ['date', '随机日期'], ['color', '随机颜色']].map(([value, label]) => ({ value, label }))
const CHAR_SETS = {
  lower: 'abcdefghijkmnpqrstuvwxyz',
  upper: 'ABCDEFGHJKLMNPQRSTUVWXYZ',
  digit: '23456789',
  symbol: '!@#$%^&*-_=+?',
}
const LOREM_WORDS = ('lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod tempor incididunt ut labore et dolore magna aliqua enim ad minim veniam quis nostrud exercitation ullamco laboris nisi aliquip ex ea commodo consequat').split(' ')
const CN_WORDS = ['星辰', '商行', '海港', '灯火', '长街', '雨季', '旧信', '晚风', '陶罐', '远山', '青瓦', '巷口', '渡船', '米缸', '星图', '罗盘', '布匹', '茶汤']
const genType = ref('uuid')
const batchCount = ref(5)
const uniqueOnly = ref(true)
const pwdLength = ref(16)
const pwdSets = ref(['upper', 'lower', 'digit', 'symbol'])
const randMin = ref(1)
const randMax = ref(100)
const dateFrom = ref('2020-01-01')
const dateTo = ref('2030-12-31')
const results = ref([])
const notice = ref('')
function randomUint(max) {
  // 拒绝采样：丢掉落在 2^32 尾部余数区间的样本，保证 [0, max) 均匀
  const span = Math.min(4294967296, Math.max(1, Math.floor(max)))
  const limit = Math.floor(4294967296 / span) * span
  const buffer = new Uint32Array(1)
  for (;;) {
    crypto.getRandomValues(buffer)
    if (buffer[0] < limit) return buffer[0] % span
  }
}
function uuidV4() {
  if (typeof crypto.randomUUID === 'function') return crypto.randomUUID()
  // 回退实现：版本位固定 4、变体位固定 10xx（RFC 4122）
  const bytes = crypto.getRandomValues(new Uint8Array(16))
  bytes[6] = (bytes[6] & 0x0f) | 0x40
  bytes[8] = (bytes[8] & 0x3f) | 0x80
  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('')
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
}
const activeSets = computed(() => pwdSets.value.filter((key) => CHAR_SETS[key]).map((key) => CHAR_SETS[key]))
const poolSize = computed(() => activeSets.value.reduce((sum, chars) => sum + chars.length, 0))
const passwordEntropy = computed(() => (poolSize.value ? Math.round(pwdLength.value * Math.log2(poolSize.value)) : 0))
const strengthPercent = computed(() => Math.min(100, Math.round((passwordEntropy.value / 128) * 100)))
const strengthLabel = computed(() => (passwordEntropy.value < 50 ? '弱' : passwordEntropy.value < 80 ? '中' : '强'))
function makePassword() {
  const sets = activeSets.value
  if (sets.length === 0) return ''
  const pool = sets.join('')
  const chars = sets.map((charset) => charset[randomUint(charset.length)])
  while (chars.length < pwdLength.value) chars.push(pool[randomUint(pool.length)])
  for (let index = chars.length - 1; index > 0; index -= 1) {
    const swap = randomUint(index + 1)
    ;[chars[index], chars[swap]] = [chars[swap], chars[index]]
  }
  return chars.slice(0, pwdLength.value).join('')
}
function makeLorem() {
  const sentences = []
  const sentenceCount = 2 + randomUint(3)
  for (let s = 0; s < sentenceCount; s += 1) {
    const words = []
    const wordCount = 8 + randomUint(8)
    for (let w = 0; w < wordCount; w += 1) words.push(LOREM_WORDS[randomUint(LOREM_WORDS.length)])
    const text = words.join(' ')
    sentences.push(text.charAt(0).toUpperCase() + text.slice(1) + '.')
  }
  return sentences.join(' ')
}
function makeChinese() {
  const sentences = []
  const sentenceCount = 2 + randomUint(3)
  for (let s = 0; s < sentenceCount; s += 1) {
    let text = ''
    const wordCount = 6 + randomUint(8)
    for (let w = 0; w < wordCount; w += 1) text += CN_WORDS[randomUint(CN_WORDS.length)]
    sentences.push(`${text}。`)
  }
  return sentences.join('')
}
function makeDate() {
  const from = new Date(`${dateFrom.value}T00:00:00`).getTime()
  const to = new Date(`${dateTo.value}T00:00:00`).getTime()
  if (Number.isNaN(from) || Number.isNaN(to) || from > to) return null
  const decided = new Date(from + randomUint(Math.floor((to - from) / 86400000) + 1) * 86400000)
  return decided.toISOString().slice(0, 10)
}
function factoryFor(type) {
  if (type === 'uuid') return uuidV4
  if (type === 'password') return makePassword
  if (type === 'lorem') return makeLorem
  if (type === 'cn') return makeChinese
  if (type === 'number') return () => String(randMin.value + randomUint(randMax.value - randMin.value + 1))
  if (type === 'date') return makeDate
  return () => `#${Array.from(crypto.getRandomValues(new Uint8Array(3)), (byte) => byte.toString(16).padStart(2, '0')).join('')}`
}
function fail(message, errorCode, startedAt) {
  notice.value = message
  usage.record({ ok: false, errorCode, durationMs: Math.round(performance.now() - startedAt) })
  return false
}
// 前置校验：不通过时已经把失败上报出去了，generate 直接返回
function validate(startedAt) {
  if (!globalThis.crypto || !crypto.getRandomValues) return fail('当前浏览器不支持 crypto.getRandomValues（需要 https 或 localhost）', 'CRYPTO_UNAVAILABLE', startedAt)
  if (genType.value === 'password' && activeSets.value.length === 0) return fail('至少勾选一种字符集', 'GENERATE_CHARSET_EMPTY', startedAt)
  if (genType.value === 'number' && Number(randMax.value) < Number(randMin.value)) return fail('最小值不能大于最大值', 'GENERATE_RANGE_INVALID', startedAt)
  if (genType.value === 'date' && makeDate() === null) return fail('日期区间不合法（起始日不能晚于结束日）', 'GENERATE_DATE_RANGE_INVALID', startedAt)
  return true
}
function generate() {
  const startedAt = performance.now()
  notice.value = ''
  const count = Math.min(200, Math.max(1, Math.round(batchCount.value) || 1))
  if (!validate(startedAt)) return
  const factory = factoryFor(genType.value)
  const wanted = genType.value === 'password' ? 1 : count
  const output = []
  const seen = new Set()
  // 去重靠「有限次重试」：日期/N 选 1 这类小样本空间里，无限重试会卡住
  for (let attempt = 0; attempt < wanted * 40 && output.length < wanted; attempt += 1) {
    const value = factory()
    if (value === null) break
    if (uniqueOnly.value && seen.has(value)) continue
    seen.add(value)
    output.push(value)
  }
  results.value = output
  notice.value = output.length < wanted ? `样本空间不足，去重后只生成 ${output.length} / ${wanted} 条` : ''
  usage.record({ durationMs: Math.round(performance.now() - startedAt), meta: { kind: genType.value, count: output.length } })
}
async function copyValue(text, action) {
  const startedAt = performance.now()
  try {
    await navigator.clipboard.writeText(text)
    usage.record({ durationMs: Math.round(performance.now() - startedAt), meta: { action } })
  } catch {
    usage.record({ ok: false, errorCode: 'CLIPBOARD_DENIED', durationMs: Math.round(performance.now() - startedAt) })
  }
}
</script>
<style scoped>
.gen-row { display: grid; grid-template-columns: repeat(3, 1fr); gap: calc(var(--space-unit) * 2); align-items: end; }
.gen-check { display: inline-flex; align-items: center; gap: 6px; font-size: var(--fs-sm); padding-bottom: 10px; cursor: pointer; }
.gen-results { display: flex; flex-direction: column; gap: var(--space-unit); max-height: 420px; overflow-y: auto; }
.gen-result-row { display: flex; align-items: center; gap: var(--space-unit); padding: var(--space-unit); background: var(--bg-surface-2); border-radius: var(--radius-input); }
.gen-result-text { flex: 1; font-family: var(--font-mono); font-size: var(--fs-sm); color: var(--text-primary); word-break: break-all; }
.gen-copy { padding: 4px 8px; font-size: var(--fs-label); }
.gen-strength { margin-top: var(--space-unit); }
.gen-strength-track { height: 8px; background: var(--bg-surface-2); border-radius: 4px; overflow: hidden; }
.gen-strength-bar { display: block; height: 100%; background: var(--accent); border-radius: 4px; transition: width 0.3s; }
@media (max-width: 767px) {
  .gen-row { grid-template-columns: 1fr; }
}
</style>
