<template>
  <ToolPageShell :title="PAGE.title" :eyebrow="PAGE.eyebrow" :description="PAGE.description" :icon="PAGE.icon" :requires-card="PAGE.requiresCard">
    <section class="ui-card tool-panel">
      <h2 class="tool-panel-title"><AppIcon name="monitor" aria-hidden="true" /><span>本机网络与 UA</span></h2>
      <p class="tool-mode-hint">全部读自浏览器自身公开字段（navigator / Intl / screen），不发起任何请求。浏览器未暴露的字段如实显示「未提供」，不编造。</p>
      <dl class="net-facts">
        <div v-for="row in localRows" :key="row.label" class="net-fact"><dt>{{ row.label }}</dt><dd :class="{ 'net-fact-mono': row.mono }">{{ row.value }}</dd></div>
      </dl>
    </section>
    <section class="ui-card tool-panel">
      <h2 class="tool-panel-title"><AppIcon name="link" aria-hidden="true" /><span>URL 解析与查询参数</span></h2>
      <div class="u-field"><label class="u-field-label" for="net-url">URL</label><input id="net-url" v-model="urlInput" class="u-input" placeholder="https://example.com/path?a=1#top" spellcheck="false" @keyup.enter="parseUrl" /></div>
      <div class="tool-actions">
        <button type="button" class="u-btn-primary" @click="parseUrl">解析</button>
        <button type="button" class="u-btn-secondary" @click="resetUrl">清空</button>
      </div>
      <p v-if="urlError" class="tool-calc-note" role="alert">{{ urlError }}</p>
      <template v-if="urlParts.length">
        <dl class="net-facts">
          <div v-for="row in urlParts" :key="row.label" class="net-fact"><dt>{{ row.label }}</dt><dd class="net-fact-mono">{{ row.value }}</dd></div>
        </dl>
        <h3 class="net-sub">查询参数（改完点下面的按钮，下方即真实拼接结果）</h3>
        <div v-for="(param, index) in params" :key="index" class="net-param">
          <input v-model="param.key" class="u-input net-param-key" aria-label="参数名" placeholder="key" />
          <input v-model="param.value" class="u-input net-param-value" aria-label="参数值" placeholder="value" />
          <button type="button" class="u-btn-secondary" @click="params.splice(index, 1)">删除</button>
        </div>
        <div class="tool-actions">
          <button type="button" class="u-btn-secondary" @click="params.push({ key: '', value: '' })">添加参数</button>
          <button type="button" class="u-btn-primary" @click="copyRebuilt">{{ copied ? '已复制' : '复制拼接结果' }}</button>
        </div>
        <pre class="tool-preview net-code">{{ rebuiltUrl }}</pre>
      </template>
    </section>
    <section class="ui-card tool-panel">
      <h2 class="tool-panel-title"><AppIcon name="globe" aria-hidden="true" /><span>服务端查询</span></h2>
      <p class="tool-mode-hint">公网 IP、DNS、目标站响应头、OG 预览浏览器都拿不到（无法 ICMP、没有 DNS API、跨域读不到对方内容），必须由服务端代理完成。</p>
      <div class="tool-mode-tabs" role="tablist" aria-label="查询类型">
        <button v-for="tab in serverTabs" :key="tab.value" type="button" role="tab" class="tool-mode-tab" :class="{ 'is-active': serverMode === tab.value }" :aria-selected="serverMode === tab.value" @click="pickServerMode(tab.value)">{{ tab.label }}</button>
      </div>
      <div v-if="serverMode !== 'ip'" class="u-field"><label class="u-field-label" for="net-target">{{ serverMode === 'dns' ? '域名' : '目标 URL' }}</label><input id="net-target" v-model="target" class="u-input" :placeholder="targetPlaceholder" spellcheck="false" @keyup.enter="runServer" /></div>
      <div v-if="serverMode === 'dns'" class="u-field"><label class="u-field-label">记录类型</label><SelectField v-model="dnsType" :options="dnsTypeOptions" /></div>
      <div class="tool-actions">
        <button type="button" class="u-btn-primary" :disabled="busy || (serverMode !== 'ip' && !target.trim())" @click="runServer">{{ busy ? '查询中…' : '查询' }}</button>
      </div>
      <p v-if="serverNote" class="tool-calc-note" role="status">{{ serverNote }}</p>
      <pre v-if="serverOutput" class="tool-preview net-code">{{ serverOutput }}</pre>
    </section>
    <template #aside>
      <section class="ui-card tool-aside-card">
        <h3 class="tool-aside-title"><AppIcon name="info" /> {{ TOOL_PAGE.usageTitle }}</h3>
        <ul class="tool-aside-list"><li v-for="item in PAGE.asideItems" :key="item">{{ item }}</li></ul>
      </section>
      <section class="ui-card tool-aside-card">
        <h3 class="tool-aside-title"><AppIcon name="alert-triangle" /> 明确不做</h3>
        <p class="tool-aside-note">浏览器拿不到 ICMP/TCP 套接字，本页不提供 ping、traceroute、端口扫描——原先的「Ping 模拟」是随机数编的假回包，已删除。</p>
      </section>
    </template>
  </ToolPageShell>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import AppIcon from '@/components/AppIcon.vue'
import SelectField from '@/components/SelectField.vue'
import ToolPageShell from '@/components/ToolPageShell.vue'
import { TOOL_PAGE, TOOL_PAGES } from '@/constants/index.js'
import { useToolUsage } from '@/hooks/useToolUsage/index.js'

const PAGE = TOOL_PAGES['/net/kit']
const usage = useToolUsage('/net/kit')

// ── 本机信息（只在 onMounted 里碰浏览器全局：SSR 下没有 navigator/screen）──
const localRows = ref([])

/** 极简 UA 解析：能说准就写准，说不准如实说「未知」，不假装识别所有客户端 */
function parseUA(ua) {
  if (!ua) return { browser: '未提供', platform: '未提供', device: '未提供' }
  const known = [
    [/(?:Edg|Edge)\/(\d+)/, 'Edge'], [/(?:OPR|Opera)\/(\d+)/, 'Opera'], [/(?:Chrome|CriOS)\/(\d+)/, 'Chrome'],
    [/(?:Firefox|FxiOS)\/(\d+)/, 'Firefox'], [/Version\/(\d+)[\d.]* (?:Mobile\/\S+ )?Safari/, 'Safari'],
  ]
  const hit = known.find(([re]) => re.test(ua))
  const browser = /MicroMessenger/i.test(ua) ? '微信内置浏览器' : hit ? `${hit[1]} ${hit[0].exec(ua)[1]}` : '未知浏览器'
  // 平台按「首个命中的规则」判定：UA 里常同时出现多个系统名，顺序错了会误判
  const platforms = [
    [/Windows NT 10/, 'Windows 10/11'], [/Windows/, 'Windows'], [/Android/, 'Android'],
    [/(iPhone|iPad|iPod)/, 'iOS / iPadOS'], [/Mac OS X/, 'macOS'], [/Linux/, 'Linux'],
  ]
  const platform = platforms.find(([re]) => re.test(ua))?.[1] ?? '未知系统'
  const device = /Mobi|Android|iPhone/.test(ua) ? '手机' : /iPad|Tablet/.test(ua) ? '平板' : '桌面'
  return { browser, platform, device }
}

function collectLocal() {
  const nav = window.navigator
  const uaInfo = parseUA(nav.userAgent)
  // 网络信息 API 只有 Chromium 系有；Firefox/Safari 上如实显示「未提供」
  const conn = nav.connection || nav.mozConnection || nav.webkitConnection
  const screenInfo = window.screen
  const ratio = window.devicePixelRatio || 1
  localRows.value = [
    { label: '浏览器', value: uaInfo.browser, mono: true }, { label: '平台', value: uaInfo.platform, mono: true },
    { label: '设备类型', value: uaInfo.device }, { label: '界面语言', value: nav.language || '未提供' },
    { label: '时区', value: Intl.DateTimeFormat().resolvedOptions().timeZone || '未提供', mono: true },
    { label: '屏幕', value: `${screenInfo.width}×${screenInfo.height}（${ratio}× 像素比）` },
    { label: '网络有效类型', value: conn && conn.effectiveType ? `${conn.effectiveType}` : '浏览器未提供' },
    { label: '估算下行带宽', value: conn && typeof conn.downlink === 'number' ? `${conn.downlink} Mbps` : '浏览器未提供' },
    { label: 'CPU 逻辑核心', value: nav.hardwareConcurrency ? `${nav.hardwareConcurrency} 个` : '浏览器未提供' },
    { label: '设备内存', value: nav.deviceMemory ? `${nav.deviceMemory} GB（约）` : '浏览器未提供' },
    { label: '原始 UA', value: nav.userAgent || '未提供', mono: true },
  ]
}

onMounted(collectLocal)

// ── URL 解析与查询参数 ─────────────────────────────────────────
const urlInput = ref('')
const urlError = ref('')
const urlParts = ref([])
const params = ref([])
const copied = ref(false)
// 解析后的 URL 对象不放 ref：它不可序列化，也不需要响应式
let parsedUrl = null

const rebuiltUrl = computed(() => {
  if (!parsedUrl) return ''
  const query = params.value
    .filter((item) => item.key.trim())
    .map((item) => `${encodeURIComponent(item.key.trim())}=${encodeURIComponent(item.value)}`)
    .join('&')
  return `${parsedUrl.origin}${parsedUrl.pathname}${query ? `?${query}` : ''}${parsedUrl.hash}`
})

function parseUrl() {
  const startedAt = performance.now()
  const raw = urlInput.value.trim()
  urlError.value = ''
  copied.value = false
  if (!raw) { urlError.value = '请先输入 URL'; return }
  try {
    parsedUrl = new URL(raw)
  } catch {
    parsedUrl = null
    urlParts.value = []
    params.value = []
    urlError.value = '不是合法的绝对 URL（需要带协议，例如 https:// 开头）'
    usage.record({ ok: false, errorCode: 'NET_URL_INVALID', durationMs: Math.round(performance.now() - startedAt) })
    return
  }
  urlParts.value = [
    { label: '协议', value: parsedUrl.protocol }, { label: '主机', value: parsedUrl.host },
    { label: '域名', value: parsedUrl.hostname }, { label: '端口', value: parsedUrl.port || '默认端口' },
    { label: '路径', value: parsedUrl.pathname }, { label: '锚点', value: parsedUrl.hash || '（无）' },
  ]
  params.value = [...parsedUrl.searchParams.entries()].map(([key, value]) => ({ key, value }))
  // meta 只放字段计数，绝不放用户输入的完整 URL
  usage.record({ durationMs: Math.round(performance.now() - startedAt), meta: { params: params.value.length } })
}

async function copyRebuilt() {
  if (!rebuiltUrl.value) return
  try {
    await navigator.clipboard.writeText(rebuiltUrl.value)
    copied.value = true
  } catch {
    copied.value = false
  }
}

function resetUrl() {
  parsedUrl = null
  urlInput.value = ''
  urlError.value = ''
  urlParts.value = []
  params.value = []
  copied.value = false
}

// ── 服务端查询（接口未部署时必须降级，不能把页面打崩）──────────────
const serverTabs = [
  { label: '公网 IP', value: 'ip' }, { label: 'DNS', value: 'dns' },
  { label: '响应头', value: 'headers' }, { label: 'OG 预览', value: 'og' },
]
const serverMode = ref('ip')
const dnsType = ref('A')
const dnsTypeOptions = ['A', 'AAAA', 'CNAME', 'MX', 'NS', 'TXT'].map((value) => ({ label: value, value }))
const target = ref('')
const busy = ref(false)
const serverNote = ref('')
const serverOutput = ref('')
const targetPlaceholder = computed(() => (serverMode.value === 'dns' ? 'example.com' : 'https://example.com（要带协议）'))

function pickServerMode(mode) {
  serverMode.value = mode
  serverNote.value = ''
  serverOutput.value = ''
}

async function runServer() {
  const startedAt = performance.now()
  busy.value = true
  serverNote.value = ''
  serverOutput.value = ''
  const kind = serverMode.value
  try {
    // 动态 import：只有真正发起请求时才把 api 层拉进这个页面的 chunk
    const { default: toolApi } = await import('@/api/ask/toolApi.js')
    const body = kind === 'ip' ? await toolApi.getNetIp()
      : kind === 'dns' ? await toolApi.getNetDns(target.value.trim(), dnsType.value)
        : kind === 'headers' ? await toolApi.getNetHeaders(target.value.trim())
          : await toolApi.getNetOg(target.value.trim())
    // 未部署时开发服务器常回整页 HTML，axios 返回的是字符串而不是对象
    if (!body || typeof body !== 'object') throw new Error('响应不是 JSON')
    const payload = body.data !== undefined ? body.data : body
    serverOutput.value = typeof payload === 'string' ? payload : JSON.stringify(payload, null, 2)
    usage.record({ durationMs: Math.round(performance.now() - startedAt), meta: { kind } })
  } catch {
    serverNote.value = `后端未部署或暂不可用：该查询需要服务端代理（/toolApi/net/${kind}），本次请求失败。本页其余功能不依赖后端。`
    usage.record({ ok: false, errorCode: 'SERVER_UNAVAILABLE', durationMs: Math.round(performance.now() - startedAt), meta: { kind } })
  } finally {
    busy.value = false
  }
}
</script>

<style scoped>
.net-facts { display: grid; gap: calc(var(--space-unit) * 0.5); margin: calc(var(--space-unit) * 1.5) 0 0; }
.net-fact { display: grid; grid-template-columns: 130px minmax(0, 1fr); gap: calc(var(--space-unit) * 1.5); padding: calc(var(--space-unit) * 0.75) 0; border-bottom: 1px solid var(--border); }
.net-fact dt { color: var(--text-muted); font-size: var(--fs-label); }
.net-fact dd { margin: 0; overflow-wrap: anywhere; font-size: var(--fs-sm); }
.net-fact-mono { font-family: var(--font-mono); }
.net-sub { margin: calc(var(--space-unit) * 2) 0 calc(var(--space-unit) * 1); color: var(--text-secondary); font-size: var(--fs-label); }
.net-param { display: flex; gap: calc(var(--space-unit) * 1); margin-bottom: calc(var(--space-unit) * 1); }
.net-param-key { flex: 0 0 30%; }
.net-param-value { flex: 1 1 auto; min-width: 0; }
.net-code { white-space: pre-wrap; overflow-wrap: anywhere; }
@media (max-width: 767px) {
  .net-fact { grid-template-columns: 1fr; gap: calc(var(--space-unit) * 0.25); }
  .net-param { flex-wrap: wrap; }
  .net-param-key, .net-param-value { flex: 1 1 100%; }
}
</style>
