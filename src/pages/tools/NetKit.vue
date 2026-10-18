<template>
  <ToolPageShell :title="PAGE.title" :eyebrow="PAGE.eyebrow" :description="PAGE.description" :icon="PAGE.icon" :requires-card="PAGE.requiresCard">
    <section class="ui-card tool-panel">
      <h2 class="tool-panel-title"><AppIcon name="globe" aria-hidden="true" /><span>{{ PAGE.inputTitle }}</span></h2>
      <div class="u-field">
        <label class="u-field-label">查询类型</label>
        <SelectField v-model="netMode" :options="netModeOptions" />
      </div>
      <div class="u-field">
        <label class="u-field-label">{{ PAGE.sourceLabel }}</label>
        <textarea v-model="source" class="u-input tool-textarea" :placeholder="sourcePlaceholder" spellcheck="false"></textarea>
      </div>
      <div class="tool-actions">
        <button type="button" class="u-btn-primary" :disabled="!source" @click="process">{{ PAGE.submit }}</button>
        <button type="button" class="u-btn-secondary" @click="clear">{{ PAGE.reset }}</button>
      </div>
    </section>

    <section class="ui-card tool-panel">
      <h2 class="tool-panel-title"><AppIcon name="check-circle" aria-hidden="true" /><span>{{ PAGE.resultTitle }}</span></h2>
      <ToolResultPane :state="result ? 'success' : 'empty'" :title="PAGE.emptyTitle" :description="PAGE.emptyDesc" icon="globe">
        <template v-if="result"><pre class="tool-preview">{{ result }}</pre></template>
        <template #actions><button type="button" class="u-btn-primary" :disabled="!result" @click="copy">{{ copyLabel }}</button></template>
      </ToolResultPane>
    </section>

    <template #aside>
      <section class="ui-card tool-aside-card">
        <h3 class="tool-aside-title"><AppIcon name="info" /> {{ TOOL_PAGE.usageTitle }}</h3>
        <ul class="tool-aside-list"><li v-for="item in PAGE.asideItems" :key="item">{{ item }}</li></ul>
      </section>
      <section class="ui-card tool-aside-card">
        <h3 class="tool-aside-title"><AppIcon name="alert-triangle" /> {{ TOOL_PAGE.noticeTitle }}</h3>
        <p class="tool-aside-note"><AppIcon name="alert-triangle" /> {{ PAGE.asideNotice }}</p>
      </section>
    </template>
  </ToolPageShell>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import AppIcon from '@/components/AppIcon.vue'
import SelectField from '@/components/SelectField.vue'
import ToolPageShell from '@/components/ToolPageShell.vue'
import ToolResultPane from '@/components/ToolResultPane.vue'
import { TOOL_PAGE, TOOL_PAGES, TOOL_RESULT } from '@/constants/index.js'

const PAGE = TOOL_PAGES['/net/kit']
const netMode = ref('ip')
const source = ref('')
const result = ref('')
const copyState = ref('idle')

const netModeOptions = [
  { label: 'IP 验证', value: 'ip' },
  { label: '子网计算', value: 'subnet' },
  { label: 'Ping 模拟', value: 'ping' },
  { label: 'DNS 查询', value: 'dns' },
]

const sourcePlaceholder = computed(() => {
  switch (netMode.value) {
    case 'ip': return '输入 IPv4 地址，如 192.168.1.1'
    case 'subnet': return '输入 CIDR，如 192.168.1.0/24'
    case 'ping': return '输入域名或 IP，如 baidu.com'
    case 'dns': return '输入域名，如 example.com'
    default: return PAGE.sourcePlaceholder
  }
})

const copyLabel = computed(() => copyState.value === 'ok' ? TOOL_RESULT.copied : copyState.value === 'fail' ? TOOL_RESULT.copyFailed : TOOL_RESULT.copy)

watch(netMode, () => { source.value = ''; result.value = ''; copyState.value = 'idle' })

function isValidIPv4(ip) {
  const parts = ip.split('.')
  if (parts.length !== 4) return false
  return parts.every(p => {
    const n = parseInt(p, 10)
    return p === String(n) && n >= 0 && n <= 255
  })
}

function ipToLong(ip) {
  return ip.split('.').reduce((acc, part) => (acc << 8) + parseInt(part, 10), 0) >>> 0
}

function longToIP(long) {
  return [(long >>> 24) & 0xFF, (long >>> 16) & 0xFF, (long >>> 8) & 0xFF, long & 0xFF].join('.')
}

function validateIP(ip) {
  if (!isValidIPv4(ip)) return `错误：${ip} 不是有效的 IPv4 地址`
  const parts = ip.split('.').map(Number)
  let type = '公网地址'
  if (parts[0] === 10) type = '私有地址 (A类)'
  else if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) type = '私有地址 (B类)'
  else if (parts[0] === 192 && parts[1] === 168) type = '私有地址 (C类)'
  else if (parts[0] === 127) type = '回环地址'
  else if (parts[0] >= 224) type = '组播/保留地址'
  else if (parts[0] === 0 || parts[0] === 255) type = '保留地址'
  return `IP 地址：${ip}\n格式：有效 IPv4\n类型：${type}\n二进制：${parts.map(p => p.toString(2).padStart(8, '0')).join('.')}`
}

function calcSubnet(cidr) {
  const m = cidr.match(/^(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})\/(\d{1,2})$/)
  if (!m) return '错误：格式应为 x.x.x.x/x，如 192.168.1.0/24'
  const ip = m[1]
  const prefix = parseInt(m[2], 10)
  if (!isValidIPv4(ip)) return '错误：IP 地址无效'
  if (prefix < 0 || prefix > 32) return '错误：前缀长度应为 0-32'
  const mask = (0xFFFFFFFF << (32 - prefix)) >>> 0
  const ipLong = ipToLong(ip)
  const networkLong = (ipLong & mask) >>> 0
  const broadcastLong = (networkLong | (~mask >>> 0)) >>> 0
  const hostCount = prefix >= 31 ? 0 : broadcastLong - networkLong - 1
  return `CIDR：${cidr}\n网络地址：${longToIP(networkLong)}\n广播地址：${longToIP(broadcastLong)}\n子网掩码：${longToIP(mask)}\n可用主机数：${hostCount}\nIP 范围：${longToIP(networkLong + 1)} - ${longToIP(broadcastLong - 1)}`
}

function simulatePing(host) {
  const lines = [`正在 Ping ${host} [${host}] 具有 32 字节的数据:`]
  for (let i = 1; i <= 4; i++) {
    const time = Math.floor(Math.random() * 40) + 10
    const ttl = Math.floor(Math.random() * 64) + 64
    lines.push(`来自 ${host} 的回复: 字节=32 时间=${time}ms TTL=${ttl}`)
  }
  const min = Math.floor(Math.random() * 15) + 10
  const max = min + Math.floor(Math.random() * 20) + 5
  const avg = Math.floor((min + max) / 2)
  lines.push('')
  lines.push(`${host} 的 Ping 统计信息:`)
  lines.push('    数据包: 已发送 = 4，已接收 = 4，丢失 = 0 (0% 丢失)，')
  lines.push('往返行程的估计时间(以毫秒为单位):')
  lines.push(`    最短 = ${min}ms，最长 = ${max}ms，平均 = ${avg}ms`)
  return lines.join('\n')
}

function simulateDNS(domain) {
  const lines = [`服务器:  DNS-Simulator`, `Address:  127.0.0.1`, '', `非权威应答:`, `名称:    ${domain}`]
  const hash = domain.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0)
  const aRecords = [`Addresses:  ${(hash % 223 + 1)}.${(hash % 256)}.${(hash % 256)}.${(hash % 254 + 1)}`]
  if (hash % 3 === 0) aRecords.push(`          ${(hash % 223 + 2)}.${(hash % 256)}.${(hash % 256)}.${(hash % 254 + 2)}`)
  lines.push(...aRecords)
  lines.push(`\n别名:  www.${domain}`)
  lines.push(`\nMX 记录:`)
  lines.push(`  ${domain}\tMX preference = 10, mail exchanger = mail.${domain}`)
  lines.push(`\nNS 记录:`)
  lines.push(`  ${domain}\tnameserver = ns1.${domain}`)
  lines.push(`  ${domain}\tnameserver = ns2.${domain}`)
  lines.push(`\nTXT 记录:`)
  lines.push(`  ${domain}\ttext = "v=spf1 include:_spf.${domain} ~all"`)
  return lines.join('\n')
}

function process() {
  if (!source.value) return
  const s = source.value.trim()
  switch (netMode.value) {
    case 'ip': result.value = validateIP(s); break
    case 'subnet': result.value = calcSubnet(s); break
    case 'ping': result.value = simulatePing(s); break
    case 'dns': result.value = simulateDNS(s); break
    default: result.value = '未知查询类型'
  }
  copyState.value = 'idle'
}

function clear() { source.value = ''; result.value = ''; copyState.value = 'idle' }
async function copy() { if (!result.value) return; try { await navigator.clipboard.writeText(result.value); copyState.value = 'ok' } catch (e) { copyState.value = 'fail' } }
</script>
