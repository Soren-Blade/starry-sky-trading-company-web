<template>
  <ToolPageShell :title="PAGE.title" :eyebrow="PAGE.eyebrow" :description="PAGE.description" :icon="PAGE.icon" :requires-card="PAGE.requiresCard">
    <section class="ui-card tool-panel">
      <h2 class="tool-panel-title"><AppIcon name="square" aria-hidden="true" /><span>CSS 形状生成器</span></h2>
      <div class="u-field">
        <label class="u-field-label">形状</label>
        <SelectField v-model="shapeType" :options="SHAPE_OPTIONS" aria-label="形状类型" />
      </div>
      <div class="shape-row">
        <div class="u-field">
          <label class="u-field-label" for="shape-fill">填充色</label>
          <input id="shape-fill" v-model="fill" type="color" class="u-input shape-color" />
        </div>
        <div class="u-field">
          <label class="u-field-label" for="shape-radius">圆角 {{ radius }}px</label>
          <input id="shape-radius" v-model.number="radius" type="range" min="0" max="96" class="u-input" :disabled="!supportsRadius" />
        </div>
      </div>
      <div class="shape-row">
        <div class="u-field"><label class="u-field-label" for="shadow-x">阴影 X {{ shadowX }}px</label><input id="shadow-x" v-model.number="shadowX" type="range" min="-50" max="50" class="u-input" /></div>
        <div class="u-field"><label class="u-field-label" for="shadow-y">阴影 Y {{ shadowY }}px</label><input id="shadow-y" v-model.number="shadowY" type="range" min="-50" max="50" class="u-input" /></div>
      </div>
      <div class="shape-row">
        <div class="u-field"><label class="u-field-label" for="shadow-blur">模糊 {{ shadowBlur }}px</label><input id="shadow-blur" v-model.number="shadowBlur" type="range" min="0" max="80" class="u-input" /></div>
        <div class="u-field"><label class="u-field-label" for="shadow-spread">扩散 {{ shadowSpread }}px</label><input id="shadow-spread" v-model.number="shadowSpread" type="range" min="-20" max="40" class="u-input" /></div>
      </div>
      <div class="shape-row">
        <div class="u-field">
          <label class="u-field-label" for="shadow-color">阴影色</label>
          <input id="shadow-color" type="color" v-model="shadowColor" class="u-input shape-color" />
        </div>
        <div class="u-field">
          <label class="u-field-label" for="shadow-alpha">阴影不透明度 {{ shadowAlpha }}%</label>
          <input id="shadow-alpha" v-model.number="shadowAlpha" type="range" min="0" max="80" class="u-input" />
        </div>
      </div>

      <div class="shape-stage">
        <div class="shape-preview" :style="previewStyle"></div>
      </div>
      <div class="u-field">
        <span class="u-field-label">CSS（预览与它同一份声明）</span>
        <ToolCodeBlock :code="cssCode" lang="css" :copyable="false">
          <template #actions><button type="button" class="u-btn-secondary" @click="copyCss">复制 CSS</button></template>
        </ToolCodeBlock>
      </div>
    </section>

    <template #aside>
      <section class="ui-card tool-aside-card">
        <h3 class="tool-aside-title"><AppIcon name="info" /> {{ TOOL_PAGE.usageTitle }}</h3>
        <ul class="tool-aside-list"><li v-for="item in PAGE.asideItems" :key="item">{{ item }}</li></ul>
      </section>
      <section class="ui-card tool-aside-card">
        <h3 class="tool-aside-title"><AppIcon name="alert-triangle" /> 一致性说明</h3>
        <p class="tool-aside-note">预览元素与下方代码来自同一份声明数组：改任一滑块，两边同时变。clip-path 形状忽略 border-radius（浏览器行为也是如此），圆形/胶囊用 border-radius 实现，六边形/星形/箭头用 clip-path polygon。</p>
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

const PAGE = TOOL_PAGES['/design/shape']
const usage = useToolUsage('/design/shape')

const SIZE = 160
// radius: 'rect' 走滑块；'auto' 用固定圆角；clip 存在时忽略圆角
const SHAPES = [
  { value: 'rect', label: '圆角矩形', radius: 'rect' },
  { value: 'circle', label: '圆形', radius: '50%' },
  { value: 'capsule', label: '胶囊', radius: '999px' },
  { value: 'leaf', label: '叶形', radius: '96px 0 96px 0' },
  { value: 'hexagon', label: '六边形', clip: 'polygon(25% 0, 75% 0, 100% 50%, 75% 100%, 25% 100%, 0 50%)' },
  { value: 'star', label: '五角星', clip: 'polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)' },
  { value: 'arrow', label: '箭头', clip: 'polygon(0 30%, 58% 30%, 58% 0, 100% 50%, 58% 100%, 58% 70%, 0 70%)' },
]
const SHAPE_OPTIONS = SHAPES.map(({ value, label }) => ({ value, label }))

const shapeType = ref('rect')
const fill = ref('#3b82f6')
const radius = ref(16)
const shadowX = ref(0)
const shadowY = ref(8)
const shadowBlur = ref(24)
const shadowSpread = ref(0)
const shadowColor = ref('#000000')
const shadowAlpha = ref(30)

const shape = computed(() => SHAPES.find((item) => item.value === shapeType.value) || SHAPES[0])
const supportsRadius = computed(() => shape.value.radius === 'rect')

function hexToRgbTriplet(hex) {
  const text = String(hex || '#000000').replace('#', '')
  const bigint = Number.parseInt(text, 16)
  return `${(bigint >> 16) & 255}, ${(bigint >> 8) & 255}, ${bigint & 255}`
}

/** 唯一的声明来源：预览与导出的 CSS 都由它生成，杜绝「预览一套、导出另一套」 */
const declarations = computed(() => {
  const list = [
    ['width', `${SIZE}px`],
    ['height', `${SIZE}px`],
    ['background', fill.value],
  ]
  if (shape.value.clip) {
    list.push(['clip-path', shape.value.clip])
  } else if (shape.value.radius === 'rect') {
    list.push(['border-radius', `${radius.value}px`])
  } else {
    list.push(['border-radius', shape.value.radius])
  }
  if (shadowAlpha.value > 0) {
    list.push(['box-shadow', `${shadowX.value}px ${shadowY.value}px ${shadowBlur.value}px ${shadowSpread.value}px rgba(${hexToRgbTriplet(shadowColor.value)}, ${(shadowAlpha.value / 100).toFixed(2)})`])
  }
  return list
})

const previewStyle = computed(() => Object.fromEntries(declarations.value))
const cssCode = computed(() => `.shape-demo {\n${declarations.value.map(([prop, value]) => `  ${prop}: ${value};`).join('\n')}\n}`)

async function copyCss() {
  const startedAt = performance.now()
  try {
    await navigator.clipboard.writeText(cssCode.value)
    usage.record({ durationMs: Math.round(performance.now() - startedAt), meta: { shape: shapeType.value, radius: radius.value } })
  } catch {
    usage.record({ ok: false, errorCode: 'SHAPE_COPY_FAILED', durationMs: Math.round(performance.now() - startedAt) })
  }
}
</script>

<style scoped>
.shape-row { display: grid; grid-template-columns: 1fr 1fr; gap: calc(var(--space-unit) * 2); }
.shape-color { height: 40px; padding: 4px; }
.shape-stage { display: flex; justify-content: center; padding: calc(var(--space-unit) * 3) 0; }
.shape-preview { transition: all 0.2s; }
@media (max-width: 575px) {
  .shape-row { grid-template-columns: 1fr; }
}
</style>
