<template>
  <ToolPageShell :title="PAGE.title" :eyebrow="PAGE.eyebrow" :description="PAGE.description" :icon="PAGE.icon" :requires-card="PAGE.requiresCard">
    <section class="ui-card tool-panel">
      <h2 class="tool-panel-title"><AppIcon name="palette" aria-hidden="true" /><span>取色与转换</span></h2>
      <div class="color-row">
        <div class="u-field">
          <label class="u-field-label" for="color-picker">选择颜色</label>
          <input id="color-picker" v-model="colorHex" type="color" class="u-input color-input" />
        </div>
        <div class="u-field">
          <label class="u-field-label" for="color-hex">HEX</label>
          <input id="color-hex" v-model="colorHex" class="u-input" spellcheck="false" placeholder="#3b82f6" />
        </div>
      </div>
      <div class="color-preview" :style="{ backgroundColor: safeHex }"></div>
      <p v-if="invalid" class="color-warn" role="alert">「{{ colorHex }}」不是合法的 3/6 位 HEX，预览暂按 #000000 显示。</p>
      <ToolCodeBlock :code="valueText" lang="text" :copyable="false">
        <template #actions><button type="button" class="u-btn-secondary" @click="copy(valueText)">复制全部</button></template>
      </ToolCodeBlock>
      <p class="tool-calc-note">上面的块列出同一颜色的五种写法，点「复制全部」可整段带走。转换用的是标准公式：HSL/HSV 由 RGB 逐通道推导，CMYK 先算 K 再归一化其余分量。</p>
    </section>
    <section class="ui-card tool-panel">
      <h2 class="tool-panel-title"><AppIcon name="eye" aria-hidden="true" /><span>对比度（W3C 相对亮度）</span></h2>
      <div v-for="pair in contrastPairs" :key="pair.label" class="contrast-row">
        <span class="contrast-sample" :style="{ backgroundColor: pair.bg, color: pair.fg }">Aa</span>
        <div class="contrast-body">
          <p class="contrast-title">{{ pair.label }}：<strong>{{ pair.ratio }} : 1</strong></p>
          <p class="tool-result-note">正文（AA 需 ≥ 4.5）{{ pair.aa ? '通过' : '不通过' }} · 大字号（AA 需 ≥ 3）{{ pair.aaLarge ? '通过' : '不通过' }} · AAA（需 ≥ 7）{{ pair.aaa ? '通过' : '不通过' }}</p>
        </div>
      </div>
      <p class="tool-calc-note">比值 = (L亮 + 0.05) / (L暗 + 0.05)，L 按 sRGB 反伽马后的 0.2126R + 0.7152G + 0.0722B 计算，即 WCAG 2.1 公式。</p>
    </section>
    <section class="ui-card tool-panel">
      <h2 class="tool-panel-title"><AppIcon name="eye-off" aria-hidden="true" /><span>色觉模拟</span></h2>
      <div class="u-field"><label class="u-field-label">模拟类型</label><SelectField v-model="blindType" :options="BLIND_OPTIONS" aria-label="色觉模拟类型" /></div>
      <div class="color-row">
        <div class="blind-swatch" :style="{ backgroundColor: safeHex }"><span>原色</span></div>
        <div class="blind-swatch" :style="{ backgroundColor: simulatedHex }"><span>模拟 {{ simulatedHex }}</span></div>
      </div>
      <p class="tool-calc-note">用 Machado 2009 的三型色觉缺失矩阵在 sRGB 空间做线性近似（不是医学诊断），只用于自查配色在色盲视角下是否还分得清。</p>
    </section>
    <section class="ui-card tool-panel">
      <h2 class="tool-panel-title"><AppIcon name="palette" aria-hidden="true" /><span>配色方案（HSL 旋转）</span></h2>
      <div v-for="row in schemeRows" :key="row.label" class="scheme-row">
        <span class="scheme-label">{{ row.label }}</span>
        <div class="scheme-colors">
          <button v-for="color in row.colors" :key="color" type="button" class="scheme-swatch" :style="{ backgroundColor: color }" :title="`${color}（点击复制）`" :aria-label="`复制 ${color}`" @click="copy(color)"></button>
        </div>
      </div>
      <p class="tool-calc-note">色相按 +180 / ±30 / ±120 旋转，饱和度与亮度沿用当前色，因此色板始终与当前色同「浓淡」。</p>
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
import SelectField from '@/components/SelectField.vue'
import ToolCodeBlock from '@/components/ToolCodeBlock.vue'
import ToolPageShell from '@/components/ToolPageShell.vue'
import { TOOL_PAGE, TOOL_PAGES } from '@/constants/index.js'
import { useToolUsage } from '@/hooks/useToolUsage/index.js'
const PAGE = TOOL_PAGES['/design/color']
const usage = useToolUsage('/design/color')
const BLIND_OPTIONS = [['none', '不模拟'], ['protanopia', '红色盲（protanopia）'], ['deuteranopia', '绿色盲（deuteranopia）'], ['tritanopia', '蓝色盲（tritanopia）']].map(([value, label]) => ({ value, label }))
// Machado 2009 三型色觉缺失矩阵（severity = 1.0）
const BLIND_MATRICES = {
  protanopia: [[0.152286, 1.052583, -0.204868], [0.114503, 0.786281, 0.099216], [-0.003882, -0.048116, 1.051998]],
  deuteranopia: [[0.367322, 0.860646, -0.227968], [0.280085, 0.672501, 0.047413], [-0.01182, 0.04294, 0.968881]],
  tritanopia: [[1.255528, -0.076749, -0.178779], [-0.078411, 0.930809, 0.147602], [0.004733, 0.691367, 0.3039]],
}
const colorHex = ref('#3b82f6')
const blindType = ref('none')
function normalizeHex(input) {
  const text = String(input || '').trim().replace(/^#/, '')
  if (/^[0-9a-fA-F]{3}$/.test(text)) return `#${text.split('').map((char) => char + char).join('').toLowerCase()}`
  if (/^[0-9a-fA-F]{6}$/.test(text)) return `#${text.toLowerCase()}`
  return ''
}
function hexToRgb(hex) {
  const bigint = parseInt(String(hex).replace('#', ''), 16)
  return { r: (bigint >> 16) & 255, g: (bigint >> 8) & 255, b: bigint & 255 }
}
function rgbToHex({ r, g, b }) {
  return `#${[r, g, b].map((value) => Math.max(0, Math.min(255, Math.round(value))).toString(16).padStart(2, '0')).join('')}`
}
function rgbToHsl({ r, g, b }) {
  const [rn, gn, bn] = [r / 255, g / 255, b / 255]
  const max = Math.max(rn, gn, bn)
  const min = Math.min(rn, gn, bn)
  const l = (max + min) / 2
  const delta = max - min
  if (delta === 0) return { h: 0, s: 0, l: Math.round(l * 100) }
  const s = l > 0.5 ? delta / (2 - max - min) : delta / (max + min)
  let h = 0
  if (max === rn) h = ((gn - bn) / delta + (gn < bn ? 6 : 0)) / 6
  else if (max === gn) h = ((bn - rn) / delta + 2) / 6
  else h = ((rn - gn) / delta + 4) / 6
  return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) }
}
function rgbToHsv({ r, g, b }) {
  const [rn, gn, bn] = [r / 255, g / 255, b / 255]
  const max = Math.max(rn, gn, bn)
  const min = Math.min(rn, gn, bn)
  const delta = max - min
  const { h } = rgbToHsl({ r, g, b })
  return { h, s: Math.round((max === 0 ? 0 : delta / max) * 100), v: Math.round(max * 100) }
}
function rgbToCmyk({ r, g, b }) {
  const [c0, m0, y0] = [1 - r / 255, 1 - g / 255, 1 - b / 255]
  const k = Math.min(c0, m0, y0)
  const scale = k < 1 ? 1 - k : 1
  return {
    c: Math.round(((c0 - k) / scale) * 100),
    m: Math.round(((m0 - k) / scale) * 100),
    y: Math.round(((y0 - k) / scale) * 100),
    k: Math.round(k * 100),
  }
}
function hslToHex(h, s, l) {
  const sat = s / 100
  const light = l / 100
  const k = (n) => (n + h / 30) % 12
  const a = sat * Math.min(light, 1 - light)
  const f = (n) => light - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)))
  const toHex = (x) => Math.round(x * 255).toString(16).padStart(2, '0')
  return `#${toHex(f(0))}${toHex(f(8))}${toHex(f(4))}`
}
function relativeLuminance({ r, g, b }) {
  const channel = (value) => {
    const c = value / 255
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  }
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b)
}
function contrastRatio(fg, bg) {
  const [high, low] = [relativeLuminance(fg), relativeLuminance(bg)].sort((a, b) => b - a)
  return (high + 0.05) / (low + 0.05)
}
const safeHex = computed(() => normalizeHex(colorHex.value) || '#000000')
const invalid = computed(() => normalizeHex(colorHex.value) === '')
const rgbValue = computed(() => hexToRgb(safeHex.value))
const hslValue = computed(() => rgbToHsl(rgbValue.value))
const hsvValue = computed(() => rgbToHsv(rgbValue.value))
const cmykValue = computed(() => rgbToCmyk(rgbValue.value))
const valueList = computed(() => {
  const { r, g, b } = rgbValue.value
  const hsl = hslValue.value
  const hsv = hsvValue.value
  const cmyk = cmykValue.value
  return [
    { label: 'HEX', text: safeHex.value },
    { label: 'RGB', text: `rgb(${r}, ${g}, ${b})` },
    { label: 'HSL', text: `hsl(${hsl.h}, ${hsl.s}%, ${hsl.l}%)` },
    { label: 'HSV', text: `hsv(${hsv.h}, ${hsv.s}%, ${hsv.v}%)` },
    { label: 'CMYK', text: `cmyk(${cmyk.c}%, ${cmyk.m}%, ${cmyk.y}%, ${cmyk.k}%)` },
  ]
})
// 五种写法拼成一段：整块展示 + 一次复制全部，比原来逐行点击更省事
const valueText = computed(() => valueList.value.map((item) => `${item.label}: ${item.text}`).join('\n'))
const contrastPairs = computed(() => {
  const target = rgbValue.value
  const white = { r: 255, g: 255, b: 255 }
  const black = { r: 0, g: 0, b: 0 }
  return [
    { label: '当前色文字 / 白底', fg: target, bg: white, fgHex: safeHex.value },
    { label: '当前色文字 / 黑底', fg: target, bg: black, fgHex: safeHex.value },
    { label: '白字 / 当前色底', fg: white, bg: target, fgHex: '#ffffff' },
    { label: '黑字 / 当前色底', fg: black, bg: target, fgHex: '#000000' },
  ].map((pair) => {
    const ratio = contrastRatio(pair.fg, pair.bg)
    return {
      label: pair.label,
      fg: pair.fgHex,
      bg: rgbToHex(pair.bg),
      ratio: ratio.toFixed(2),
      aaLarge: ratio >= 3,
      aa: ratio >= 4.5,
      aaa: ratio >= 7,
    }
  })
})
const simulatedHex = computed(() => {
  const matrix = BLIND_MATRICES[blindType.value]
  if (!matrix) return safeHex.value
  const { r, g, b } = rgbValue.value
  const [rr, rg, rb] = matrix.map((row) => row[0] * r + row[1] * g + row[2] * b)
  return rgbToHex({ r: rr, g: rg, b: rb })
})
const schemeRows = computed(() => {
  const { h, s, l } = hslValue.value
  return [
    { label: '互补色', colors: [safeHex.value, hslToHex((h + 180) % 360, s, l)] },
    { label: '类比色', colors: [hslToHex((h + 330) % 360, s, l), safeHex.value, hslToHex((h + 30) % 360, s, l)] },
    { label: '三角色', colors: [safeHex.value, hslToHex((h + 120) % 360, s, l), hslToHex((h + 240) % 360, s, l)] },
    { label: '亮调 / 暗调', colors: [hslToHex(h, s, Math.min(100, l + 20)), hslToHex(h, s, Math.max(0, l - 20))] },
  ]
})
async function copy(text) {
  const startedAt = performance.now()
  try {
    await navigator.clipboard.writeText(text)
    usage.record({ durationMs: Math.round(performance.now() - startedAt), meta: { action: 'copy' } })
  } catch {
    usage.record({ ok: false, errorCode: 'COLOR_COPY_FAILED', durationMs: Math.round(performance.now() - startedAt) })
  }
}
</script>
<style scoped>
.color-row { display: grid; grid-template-columns: 120px 1fr; gap: calc(var(--space-unit) * 2); }
.color-input { height: 48px; padding: 4px; }
.color-preview { width: 100%; height: 120px; margin: calc(var(--space-unit) * 2) 0; border-radius: var(--radius-card); border: var(--stroke-width) solid var(--stroke-color); transition: background-color 0.2s; }
.color-warn { margin: 0 0 var(--space-unit); color: var(--danger); font-size: var(--fs-sm); }
.contrast-row { display: flex; align-items: center; gap: calc(var(--space-unit) * 2); padding: var(--space-unit) 0; }
.contrast-sample { width: 56px; height: 56px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; border-radius: var(--radius-input); border: var(--stroke-width) solid var(--stroke-color); font-size: 20px; }
.contrast-title { margin: 0; font-size: var(--fs-sm); font-family: var(--font-mono); }
.contrast-body .tool-result-note { margin: 2px 0 0; }
.blind-swatch { height: 56px; border-radius: var(--radius-input); border: var(--stroke-width) solid var(--stroke-color); display: flex; align-items: flex-end; justify-content: center; padding: 4px; }
.blind-swatch span { font-size: var(--fs-label); font-family: var(--font-mono); background: rgba(0, 0, 0, 0.55); color: #fff; padding: 1px 6px; border-radius: 4px; }
.scheme-row { display: flex; align-items: center; gap: calc(var(--space-unit) * 2); margin-bottom: var(--space-unit); }
.scheme-label { width: 80px; flex-shrink: 0; font-size: var(--fs-sm); color: var(--text-secondary); }
.scheme-colors { display: flex; gap: var(--space-unit); flex: 1; }
.scheme-swatch { flex: 1; height: 40px; border: var(--stroke-width) solid var(--stroke-color); border-radius: var(--radius-input); cursor: pointer; transition: transform 0.15s; }
.scheme-swatch:hover { transform: scale(1.05); }
@media (max-width: 575px) {
  .color-row { grid-template-columns: 1fr; }
  .scheme-label { width: 64px; }
}
</style>
