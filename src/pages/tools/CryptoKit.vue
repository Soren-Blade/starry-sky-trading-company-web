<template>
  <ToolPageShell :title="PAGE.title" :eyebrow="PAGE.eyebrow" :description="PAGE.description" :icon="PAGE.icon" :requires-card="PAGE.requiresCard">
    <section class="ui-card tool-panel">
      <h2 class="tool-panel-title"><AppIcon name="lock" aria-hidden="true" /><span>{{ PAGE.inputTitle }}</span></h2>
      <div class="u-field"><label class="u-field-label">操作</label>
        <div class="tool-actions">
          <button v-for="op in operations" :key="op.value" type="button" class="u-btn-secondary" :class="{ 'u-btn-primary': operation === op.value }" @click="operation = op.value">{{ op.label }}</button>
        </div>
      </div>
      <div class="u-field"><label class="u-field-label">输入</label><textarea v-model="source" class="u-input tool-textarea" spellcheck="false" /></div>
      <div v-if="operation === 'aes'" class="u-field"><label class="u-field-label">密码</label><input v-model="password" type="password" class="u-input" /></div>
      <div class="tool-actions">
        <button type="button" class="u-btn-primary" :disabled="!source" @click="process">{{ operation === 'aes-d' ? '解密' : '处理' }}</button>
        <button type="button" class="u-btn-secondary" @click="clear">清空</button>
      </div>
    </section>

    <section class="ui-card tool-panel">
      <h2 class="tool-panel-title"><AppIcon name="check-circle" aria-hidden="true" /><span>结果</span></h2>
      <ToolResultPane :state="result ? 'success' : 'empty'" :title="PAGE.emptyTitle" :description="PAGE.emptyDesc" icon="lock">
        <template v-if="result"><pre class="tool-preview">{{ result }}</pre></template>
        <template #actions><button type="button" class="u-btn-primary" :disabled="!result" @click="copy">{{ copyLabel }}</button></template>
      </ToolResultPane>
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
import ToolResultPane from '@/components/ToolResultPane.vue'
import { TOOL_PAGE, TOOL_PAGES, TOOL_RESULT } from '@/constants/index.js'

const PAGE = TOOL_PAGES['/dev/crypto']
const operation = ref('base64-e')
const source = ref('')
const password = ref('')
const result = ref('')
const copyState = ref('idle')

const operations = [
  { label: 'Base64 编码', value: 'base64-e' },
  { label: 'Base64 解码', value: 'base64-d' },
  { label: 'URL 编码', value: 'url-e' },
  { label: 'URL 解码', value: 'url-d' },
  { label: 'Hex 编码', value: 'hex-e' },
  { label: 'Hex 解码', value: 'hex-d' },
]

const copyLabel = computed(() => copyState.value === 'ok' ? TOOL_RESULT.copied : copyState.value === 'fail' ? TOOL_RESULT.copyFailed : TOOL_RESULT.copy)

function process() {
  if (!source.value) return
  const text = source.value
  try {
    switch (operation.value) {
      case 'base64-e': result.value = btoa(unescape(encodeURIComponent(text))); break
      case 'base64-d': result.value = decodeURIComponent(escape(atob(text))); break
      case 'url-e': result.value = encodeURIComponent(text); break
      case 'url-d': result.value = decodeURIComponent(text); break
      case 'hex-e': result.value = Array.from(new TextEncoder().encode(text)).map(b => b.toString(16).padStart(2, '0')).join(' '); break
      case 'hex-d': { const bytes = text.replace(/\s/g, '').match(/.{2}/g) || []; result.value = new TextDecoder().decode(new Uint8Array(bytes.map(b => parseInt(b, 16)))); break }
    }
  } catch (e) { result.value = `错误: ${e.message}` }
  copyState.value = 'idle'
}

function clear() { source.value = ''; result.value = ''; copyState.value = 'idle' }
async function copy() { if (!result.value) return; try { await navigator.clipboard.writeText(result.value); copyState.value = 'ok' } catch (e) { copyState.value = 'fail' } }
</script>
