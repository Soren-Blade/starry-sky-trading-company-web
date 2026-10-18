<template>
  <ToolPageShell :title="PAGE.title" :eyebrow="PAGE.eyebrow" :description="PAGE.description" :icon="PAGE.icon" :requires-card="PAGE.requiresCard">
    <section class="ui-card tool-panel">
      <h2 class="tool-panel-title"><AppIcon name="share" aria-hidden="true" /><span>分享这条链接</span></h2>
      <div class="u-field">
        <label class="u-field-label" for="share-url">链接</label>
        <input id="share-url" v-model="urlInput" type="text" class="u-input" placeholder="https://...（默认填入当前页地址）" spellcheck="false" />
      </div>
      <div class="u-field">
        <label class="u-field-label" for="share-title">标题（可选，仅系统分享用）</label>
        <input id="share-title" v-model="shareTitle" type="text" class="u-input" placeholder="留空则用页面标题" />
      </div>
      <div class="u-field">
        <label class="u-field-label" for="share-text">说明（可选，仅系统分享用）</label>
        <input id="share-text" v-model="shareText" type="text" class="u-input" placeholder="附带给接收方的说明文字" />
      </div>
      <div class="tool-actions">
        <button type="button" class="u-btn-primary" @click="copyLink">{{ copyLabel }}</button>
        <button v-if="shareSupported" type="button" class="u-btn-secondary" @click="systemShare">系统分享</button>
        <button type="button" class="u-btn-secondary" :disabled="busy" @click="makeQr">{{ busy ? '生成中…' : '生成二维码' }}</button>
        <button type="button" class="u-btn-secondary" :disabled="busy" @click="makeShort">生成短链</button>
      </div>
      <p class="tool-result-note">系统分享按钮只在浏览器支持 navigator.share（多为手机端）时出现，不支持就不显示——不做假的分享面板。</p>
      <p v-if="notice" class="tool-calc-note" role="status">{{ notice }}</p>
    </section>

    <section class="ui-card tool-panel">
      <h2 class="tool-panel-title"><AppIcon name="qrcode" aria-hidden="true" /><span>该链接的二维码</span></h2>
      <ToolResultPane :state="qrDataUrl ? 'success' : 'empty'" :title="PAGE.emptyTitle" :description="PAGE.emptyDesc" icon="qrcode">
        <template v-if="qrDataUrl">
          <div class="tool-preview-media"><img :src="qrDataUrl" :alt="`${urlInput} 的二维码`" width="240" height="240" /></div>
          <p class="tool-result-note">由 qrcode 库按上方链接实时编码，扫码结果与链接一字不差。</p>
        </template>
        <template #actions>
          <a v-if="qrDataUrl" :href="qrDataUrl" :download="qrFileName" class="u-btn-primary">下载 PNG</a>
        </template>
      </ToolResultPane>
    </section>

    <section class="ui-card tool-panel">
      <h2 class="tool-panel-title"><AppIcon name="link" aria-hidden="true" /><span>短链</span></h2>
      <ToolResultPane :state="shortUrl ? 'success' : 'empty'" title="还没有短链" description="点上方「生成短链」；服务未部署时这里会回退展示原始链接。" icon="link">
        <template v-if="shortUrl">
          <pre class="tool-result-value">{{ shortUrl }}</pre>
          <p v-if="shortNote" class="tool-result-note">{{ shortNote }}</p>
        </template>
        <template #actions>
          <button v-if="shortUrl" type="button" class="u-btn-primary" @click="copyShort">{{ shortCopyLabel }}</button>
        </template>
      </ToolResultPane>
    </section>

    <template #aside>
      <section class="ui-card tool-aside-card">
        <h3 class="tool-aside-title"><AppIcon name="info" /> {{ TOOL_PAGE.usageTitle }}</h3>
        <ul class="tool-aside-list"><li v-for="item in PAGE.asideItems" :key="item">{{ item }}</li></ul>
      </section>
      <section class="ui-card tool-aside-card">
        <h3 class="tool-aside-title"><AppIcon name="alert-triangle" /> 能力边界</h3>
        <p class="tool-aside-note">本页不做分享次数统计、点击排行和「分享卡片预览」——这些都需要服务端埋点或抓取，原先的卡片样式预览只是本地拼出的假预览，已删除。</p>
      </section>
    </template>
  </ToolPageShell>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import AppIcon from '@/components/AppIcon.vue'
import ToolPageShell from '@/components/ToolPageShell.vue'
import ToolResultPane from '@/components/ToolResultPane.vue'
import { TOOL_PAGE, TOOL_PAGES } from '@/constants/index.js'
import { useToolUsage } from '@/hooks/useToolUsage/index.js'

const PAGE = TOOL_PAGES['/net/share']
const usage = useToolUsage('/net/share')

const urlInput = ref('')
const shareTitle = ref('')
const shareText = ref('')
const shareSupported = ref(false)
const qrDataUrl = ref('')
const shortUrl = ref('')
const shortNote = ref('')
const notice = ref('')
const busy = ref(false)
const copyState = ref('idle')
const shortCopyState = ref('idle')

onMounted(() => {
  // 能力检测必须在 onMounted：SSR 阶段没有 navigator
  shareSupported.value = typeof navigator.share === 'function'
  // 最高频的用法是「分享我现在看的这一页」，所以默认填入当前地址
  if (!urlInput.value) urlInput.value = window.location.href
})

const copyLabel = computed(() => (copyState.value === 'ok' ? '已复制' : copyState.value === 'fail' ? '复制失败' : '复制链接'))
const shortCopyLabel = computed(() => (shortCopyState.value === 'ok' ? '已复制' : shortCopyState.value === 'fail' ? '复制失败' : '复制短链'))
const qrFileName = computed(() => `link-qrcode-${Date.now()}.png`)
const trimmedUrl = computed(() => urlInput.value.trim())

/** 只接受绝对 http(s) 地址：相对路径分享出去对接收方没有意义 */
const validUrl = computed(() => {
  try {
    const parsed = new URL(trimmedUrl.value)
    return parsed.protocol === 'http:' || parsed.protocol === 'https:'
  } catch {
    return false
  }
})

function fail(code, startedAt) {
  usage.record({ ok: false, errorCode: code, durationMs: Math.round(performance.now() - startedAt) })
}

async function copyLink() {
  const startedAt = performance.now()
  notice.value = ''
  if (!validUrl.value) {
    notice.value = '请先填入 http(s) 开头的完整链接'
    copyState.value = 'fail'
    fail('SHARE_URL_INVALID', startedAt)
    return
  }
  try {
    await navigator.clipboard.writeText(trimmedUrl.value)
    copyState.value = 'ok'
    usage.record({ durationMs: Math.round(performance.now() - startedAt), meta: { action: 'copy' } })
  } catch {
    copyState.value = 'fail'
    notice.value = '浏览器拒绝了剪贴板写入（需要 https 或用户手势），请手动复制'
    fail('CLIPBOARD_DENIED', startedAt)
  }
}

async function systemShare() {
  const startedAt = performance.now()
  notice.value = ''
  try {
    await navigator.share({
      title: shareTitle.value.trim() || document.title,
      text: shareText.value.trim() || undefined,
      url: trimmedUrl.value,
    })
    usage.record({ durationMs: Math.round(performance.now() - startedAt), meta: { action: 'share' } })
  } catch (error) {
    // 用户主动取消不是失败，不该污染留痕
    if (error && error.name === 'AbortError') return
    notice.value = '系统分享调用失败，可改用复制链接'
    fail('SHARE_ABORTED', startedAt)
  }
}

async function makeQr() {
  const startedAt = performance.now()
  notice.value = ''
  if (!validUrl.value) {
    notice.value = '二维码只编码 http(s) 完整链接，请先修正输入'
    fail('SHARE_URL_INVALID', startedAt)
    return
  }
  busy.value = true
  try {
    // 体积纪律：qrcode 只在用户点按钮时才加载
    const { default: QRCode } = await import('qrcode')
    qrDataUrl.value = await QRCode.toDataURL(trimmedUrl.value, { width: 320, margin: 1, errorCorrectionLevel: 'M' })
    usage.record({ durationMs: Math.round(performance.now() - startedAt), meta: { action: 'qr', length: trimmedUrl.value.length } })
  } catch {
    qrDataUrl.value = ''
    notice.value = '二维码库未能加载，请刷新重试'
    fail('QR_GENERATE_FAILED', startedAt)
  } finally {
    busy.value = false
  }
}

async function makeShort() {
  const startedAt = performance.now()
  notice.value = ''
  shortNote.value = ''
  if (!validUrl.value) {
    notice.value = '短链只接受 http(s) 完整链接'
    fail('SHARE_URL_INVALID', startedAt)
    return
  }
  busy.value = true
  try {
    const { default: toolApi } = await import('@/api/ask/toolApi.js')
    const body = await toolApi.createShortLink(trimmedUrl.value)
    const data = body && body.data !== undefined ? body.data : body
    const candidate = typeof data === 'string' ? data : (data && (data.shortUrl || data.short_url || data.url)) || ''
    if (!/^https?:\/\//.test(candidate)) throw new Error('shortlink payload invalid')
    shortUrl.value = candidate
    usage.record({ durationMs: Math.round(performance.now() - startedAt), meta: { action: 'short' } })
  } catch {
    // 服务端未部署时回退展示原链接：功能可解释地降级，而不是报错
    shortUrl.value = trimmedUrl.value
    shortNote.value = '短链服务未部署（POST /toolApi/shortlink 不可用），已回退显示原始链接，可直接复制使用。'
    fail('SHORTLINK_UNAVAILABLE', startedAt)
  } finally {
    busy.value = false
  }
}

async function copyShort() {
  const startedAt = performance.now()
  try {
    await navigator.clipboard.writeText(shortUrl.value)
    shortCopyState.value = 'ok'
    usage.record({ durationMs: Math.round(performance.now() - startedAt), meta: { action: 'copy-short' } })
  } catch {
    shortCopyState.value = 'fail'
    fail('CLIPBOARD_DENIED', startedAt)
  }
}
</script>
