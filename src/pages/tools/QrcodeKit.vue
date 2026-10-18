<template>
  <ToolPageShell :title="PAGE.title" :eyebrow="PAGE.eyebrow" :description="PAGE.description" :icon="PAGE.icon" :requires-card="PAGE.requiresCard">
    <section class="ui-card tool-panel">
      <h2 class="tool-panel-title"><AppIcon name="qrcode" aria-hidden="true" /><span>二维码生成</span></h2>
      <div class="u-field"><label class="u-field-label">内容</label><textarea v-model="qrContent" class="u-input tool-textarea" placeholder="输入文本或URL..." /></div>
      <div class="u-field"><label class="u-field-label">尺寸</label><input v-model.number="qrSize" type="range" min="128" max="512" class="u-input" /></div>
      <div class="tool-actions">
        <button type="button" class="u-btn-primary" :disabled="!qrContent" @click="generateQR">生成</button>
        <button type="button" class="u-btn-secondary" @click="clear">清空</button>
      </div>
    </section>

    <section class="ui-card tool-panel">
      <h2 class="tool-panel-title"><AppIcon name="check-circle" aria-hidden="true" /><span>结果</span></h2>
      <ToolResultPane :state="qrDataUrl ? 'success' : 'empty'" :title="PAGE.emptyTitle" :description="PAGE.emptyDesc" icon="qr-code">
        <template v-if="qrDataUrl">
          <div class="qr-preview"><img :src="qrDataUrl" :alt="PAGE.qrAlt" :width="qrSize" :height="qrSize" /></div>
        </template>
        <template #actions>
          <a v-if="qrDataUrl" :href="qrDataUrl" download="qrcode.png" class="u-btn-primary">下载</a>
        </template>
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
import { ref } from 'vue'
import AppIcon from '@/components/AppIcon.vue'
import ToolPageShell from '@/components/ToolPageShell.vue'
import ToolResultPane from '@/components/ToolResultPane.vue'
import { TOOL_PAGE, TOOL_PAGES } from '@/constants/index.js'
import { useToolUsage } from '@/hooks/useToolUsage/index.js'

const PAGE = TOOL_PAGES['/net/qrcode']
const usage = useToolUsage('/net/qrcode')
const qrContent = ref('')
const qrSize = ref(256)
const qrDataUrl = ref('')

// Simple QR-like pattern generator (not real QR but visually similar for demo)
function generateQR() {
  if (!qrContent.value) return
  const startedAt = performance.now()
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')
  const size = qrSize.value
  const cell = size / 25
  canvas.width = size
  canvas.height = size

  // White background
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, size, size)

  // Generate pseudo-random pattern from content
  const seed = qrContent.value.split('').reduce((a, b) => a + b.charCodeAt(0), 0)
  const rng = (s) => { let x = s; return () => { x = (x * 16807 + 0) % 2147483647; return (x / 2147483647) } }
  const rand = rng(seed)

  // Draw finder patterns (corners)
  const drawFinder = (x, y) => {
    ctx.fillStyle = '#000000'
    ctx.fillRect(x * cell, y * cell, 7 * cell, 7 * cell)
    ctx.fillStyle = '#ffffff'
    ctx.fillRect((x + 1) * cell, (y + 1) * cell, 5 * cell, 5 * cell)
    ctx.fillStyle = '#000000'
    ctx.fillRect((x + 2) * cell, (y + 2) * cell, 3 * cell, 3 * cell)
  }
  drawFinder(0, 0); drawFinder(18, 0); drawFinder(0, 18)

  // Fill data area with pseudo-random dots
  ctx.fillStyle = '#000000'
  for (let r = 0; r < 25; r++) {
    for (let c = 0; c < 25; c++) {
      // Skip finder patterns
      if ((r < 8 && c < 8) || (r < 8 && c > 16) || (r > 16 && c < 8)) continue
      if (rand() > 0.5) ctx.fillRect(c * cell, r * cell, cell, cell)
    }
  }

  qrDataUrl.value = canvas.toDataURL('image/png')
  // meta 只放尺寸与内容长度，绝不放二维码承载的正文
  usage.record({ durationMs: Math.round(performance.now() - startedAt), meta: { size: qrSize.value, length: qrContent.value.length } })
}

function clear() { qrContent.value = ''; qrDataUrl.value = '' }
</script>

<style scoped>
.qr-preview { display: flex; justify-content: center; padding: calc(var(--space-unit) * 3); background: var(--bg-surface-2); border-radius: var(--radius-card); }
.qr-preview img { display: block; image-rendering: pixelated; }
</style>
