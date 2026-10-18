<template>
  <ToolPageShell :title="PAGE.title" :eyebrow="PAGE.eyebrow" :description="PAGE.description" :icon="PAGE.icon" :requires-card="PAGE.requiresCard">
    <section class="ui-card tool-panel">
      <h2 class="tool-panel-title"><AppIcon name="palette" aria-hidden="true" /><span>颜色工具</span></h2>
      <div class="u-field"><label class="u-field-label">选择颜色</label><input v-model="colorHex" type="color" class="u-input" style="height:48px;padding:4px;" /></div>
      <div class="color-preview" :style="{ backgroundColor: colorHex }"></div>

      <div class="u-field"><label class="u-field-label">HEX</label><input v-model="colorHex" class="u-input" /></div>
      <div class="u-field"><label class="u-field-label">RGB</label><input :value="rgb" class="u-input" readonly @click="copy(rgb)" /></div>
      <div class="u-field"><label class="u-field-label">HSL</label><input :value="hsl" class="u-input" readonly @click="copy(hsl)" /></div>
      <div class="u-field"><label class="u-field-label">CMYK</label><input :value="cmyk" class="u-input" readonly @click="copy(cmyk)" /></div>

      <div class="tool-result-meta">
        <span class="tool-result-meta-item">HEX: <code class="tool-result-value">{{ colorHex }}</code></span>
        <span class="tool-result-meta-item">RGB: <code class="tool-result-value">{{ rgb }}</code></span>
      </div>
    </section>

    <section class="ui-card tool-panel">
      <h2 class="tool-panel-title"><AppIcon name="palette" aria-hidden="true" /><span>配色方案</span></h2>
      <div class="color-schemes">
        <div class="scheme-row">
          <span class="scheme-label">互补色</span>
          <div class="scheme-colors">
            <div v-for="(c, i) in schemeComplementary" :key="i" class="scheme-swatch" :style="{ backgroundColor: c }" :title="c" @click="copy(c)"></div>
          </div>
        </div>
        <div class="scheme-row">
          <span class="scheme-label">类比色</span>
          <div class="scheme-colors">
            <div v-for="(c, i) in schemeAnalogous" :key="i" class="scheme-swatch" :style="{ backgroundColor: c }" :title="c" @click="copy(c)"></div>
          </div>
        </div>
        <div class="scheme-row">
          <span class="scheme-label">三角色</span>
          <div class="scheme-colors">
            <div v-for="(c, i) in schemeTriadic" :key="i" class="scheme-swatch" :style="{ backgroundColor: c }" :title="c" @click="copy(c)"></div>
          </div>
        </div>
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
import { useToolUsage } from '@/hooks/useToolUsage/index.js'

const PAGE = TOOL_PAGES['/design/color']
const usage = useToolUsage('/design/color')
const colorHex = ref('#3b82f6')

const rgb = computed(() => {
  const { r, g, b } = hexToRgb(colorHex.value)
  return `rgb(${r}, ${g}, ${b})`
})

const hsl = computed(() => {
  const { r, g, b } = hexToRgb(colorHex.value)
  const { h, s, l } = rgbToHsl(r, g, b)
  return `hsl(${h}, ${s}%, ${l}%)`
})

const cmyk = computed(() => {
  const { r, g, b } = hexToRgb(colorHex.value)
  const { c, m, y, k } = rgbToCmyk(r, g, b)
  return `cmyk(${c}%, ${m}%, ${y}%, ${k}%)`
})

const schemeComplementary = computed(() => {
  const { r, g, b } = hexToRgb(colorHex.value)
  const { h, s, l } = rgbToHsl(r, g, b)
  return [colorHex.value, hslToHex((h + 180) % 360, s, l)]
})

const schemeAnalogous = computed(() => {
  const { r, g, b } = hexToRgb(colorHex.value)
  const { h, s, l } = rgbToHsl(r, g, b)
  return [hslToHex((h - 30 + 360) % 360, s, l), colorHex.value, hslToHex((h + 30) % 360, s, l)]
})

const schemeTriadic = computed(() => {
  const { r, g, b } = hexToRgb(colorHex.value)
  const { h, s, l } = rgbToHsl(r, g, b)
  return [colorHex.value, hslToHex((h + 120) % 360, s, l), hslToHex((h + 240) % 360, s, l)]
})

function hexToRgb(hex) {
  const h = hex.replace('#', '')
  const bigint = parseInt(h, 16)
  return { r: (bigint >> 16) & 255, g: (bigint >> 8) & 255, b: bigint & 255 }
}

function rgbToHsl(r, g, b) {
  r /= 255; g /= 255; b /= 255
  const max = Math.max(r, g, b), min = Math.min(r, g, b)
  let h, s, l = (max + min) / 2
  if (max === min) { h = s = 0 } else {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break
      case g: h = (b - r) / d + 2; break
      case b: h = (r - g) / d + 4; break
    }
    h /= 6
  }
  return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) }
}

function rgbToCmyk(r, g, b) {
  let c = 1 - r / 255, m = 1 - g / 255, y = 1 - b / 255
  const k = Math.min(c, m, y)
  if (k < 1) { c = (c - k) / (1 - k); m = (m - k) / (1 - k); y = (y - k) / (1 - k) } else { c = m = y = 0 }
  return { c: Math.round(c * 100), m: Math.round(m * 100), y: Math.round(y * 100), k: Math.round(k * 100) }
}

function hslToHex(h, s, l) {
  s /= 100; l /= 100
  const k = n => (n + h / 30) % 12
  const a = s * Math.min(l, 1 - l)
  const f = n => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)))
  const toHex = x => Math.round(x * 255).toString(16).padStart(2, '0')
  return `#${toHex(f(0))}${toHex(f(8))}${toHex(f(4))}`
}

async function copy(text) {
  const startedAt = performance.now()
  try {
    await navigator.clipboard.writeText(text)
    usage.record({ durationMs: performance.now() - startedAt })
  } catch (e) {
    usage.record({ ok: false, errorCode: 'COLOR_COPY_FAILED', durationMs: performance.now() - startedAt })
  }
}
</script>

<style scoped>
.color-preview { width: 100%; height: 120px; border-radius: var(--radius-card); border: var(--stroke-width) solid var(--stroke-color); transition: background-color 0.2s; }
.color-schemes { display: flex; flex-direction: column; gap: calc(var(--space-unit) * 2); }
.scheme-row { display: flex; align-items: center; gap: calc(var(--space-unit) * 2); }
.scheme-label { width: 80px; font-size: var(--fs-sm); color: var(--text-secondary); flex-shrink: 0; }
.scheme-colors { display: flex; gap: calc(var(--space-unit)); flex: 1; }
.scheme-swatch { flex: 1; height: 40px; border-radius: var(--radius-input); border: var(--stroke-width) solid var(--stroke-color); cursor: pointer; transition: transform 0.15s; }
.scheme-swatch:hover { transform: scale(1.05); }
</style>
