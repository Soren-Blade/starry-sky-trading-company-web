<template>
  <ToolPageShell :title="PAGE.title" :eyebrow="PAGE.eyebrow" :description="PAGE.description" :icon="PAGE.icon" :requires-card="PAGE.requiresCard">
    <section class="ui-card tool-panel">
      <h2 class="tool-panel-title"><AppIcon name="key" aria-hidden="true" /><span>JWT 解析</span></h2>
      <div class="u-field"><label class="u-field-label">JWT 字符串</label><textarea v-model="jwt" class="u-input tool-textarea" placeholder="eyJhbGciOiJIUzI1NiIs..." spellcheck="false" /></div>
      <div class="tool-actions">
        <button type="button" class="u-btn-primary" :disabled="!jwt" @click="decode">解析</button>
        <button type="button" class="u-btn-secondary" @click="clear">清空</button>
      </div>
    </section>

    <section v-if="decoded" class="ui-card tool-panel">
      <h2 class="tool-panel-title"><AppIcon name="check-circle" aria-hidden="true" /><span>解析结果</span></h2>
      <div class="jwt-section">
        <h4 class="jwt-label">Header</h4>
        <pre class="tool-preview">{{ JSON.stringify(decoded.header, null, 2) }}</pre>
      </div>
      <div class="jwt-section">
        <h4 class="jwt-label">Payload</h4>
        <pre class="tool-preview">{{ JSON.stringify(decoded.payload, null, 2) }}</pre>
        <div v-if="decoded.payload.exp" class="jwt-exp">
          <span :class="['jwt-exp-badge', isExpired ? 'jwt-expired' : 'jwt-valid']">{{ isExpired ? '已过期' : '有效' }}</span>
          <span class="tool-result-note">过期时间: {{ expDate }}</span>
        </div>
      </div>
      <div class="jwt-section">
        <h4 class="jwt-label">Signature</h4>
        <code class="tool-preview" style="word-break:break-all;">{{ decoded.signature }}</code>
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
import { computed, ref } from 'vue'
import AppIcon from '@/components/AppIcon.vue'
import ToolPageShell from '@/components/ToolPageShell.vue'
import { TOOL_PAGE, TOOL_PAGES } from '@/constants/index.js'

const PAGE = TOOL_PAGES['/dev/jwt']
const jwt = ref('')
const decoded = ref(null)

const isExpired = computed(() => decoded.value?.payload?.exp ? decoded.value.payload.exp * 1000 < Date.now() : false)
const expDate = computed(() => decoded.value?.payload?.exp ? new Date(decoded.value.payload.exp * 1000).toLocaleString('zh-CN') : '')

function decode() {
  if (!jwt.value) return
  try {
    const parts = jwt.value.trim().split('.')
    if (parts.length !== 3) throw new Error('JWT 必须由三段组成')
    const header = JSON.parse(atob(parts[0].replace(/-/g, '+').replace(/_/g, '/')))
    const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')))
    decoded.value = { header, payload, signature: parts[2] }
  } catch (e) { decoded.value = null; alert('解析失败: ' + e.message) }
}

function clear() { jwt.value = ''; decoded.value = null }
</script>

<style scoped>
.jwt-section { margin-bottom: calc(var(--space-unit) * 2); }
.jwt-label { font-size: var(--fs-sm); font-weight: var(--fw-heading); color: var(--text-secondary); margin: 0 0 calc(var(--space-unit)); }
.jwt-exp { display: flex; align-items: center; gap: calc(var(--space-unit)); margin-top: calc(var(--space-unit)); }
.jwt-exp-badge { padding: calc(var(--space-unit) * 0.5) calc(var(--space-unit)); border-radius: var(--radius-pill); font-size: var(--fs-label); font-weight: var(--fw-heading); }
.jwt-exp-badge.jwt-valid { background: var(--success-bg); color: var(--success); }
.jwt-exp-badge.jwt-expired { background: var(--danger-bg); color: var(--danger); }
</style>
