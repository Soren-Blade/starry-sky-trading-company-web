<template>
  <ToolPageShell :title="PAGE.title" :eyebrow="PAGE.eyebrow" :description="PAGE.description" :icon="PAGE.icon" :requires-card="PAGE.requiresCard">
    <section class="ui-card tool-panel">
      <h2 class="tool-panel-title"><AppIcon name="square" aria-hidden="true" /><span>CSS 形状生成器</span></h2>
      <div class="u-field"><label class="u-field-label">阴影 X (px)</label><input v-model.number="shadowX" type="range" min="-50" max="50" class="u-input" /></div>
      <div class="u-field"><label class="u-field-label">阴影 Y (px)</label><input v-model.number="shadowY" type="range" min="-50" max="50" class="u-input" /></div>
      <div class="u-field"><label class="u-field-label">模糊 (px)</label><input v-model.number="shadowBlur" type="range" min="0" max="100" class="u-input" /></div>
      <div class="u-field"><label class="u-field-label">扩散 (px)</label><input v-model.number="shadowSpread" type="range" min="-20" max="50" class="u-input" /></div>
      <div class="u-field"><label class="u-field-label">阴影颜色</label><input v-model="shadowColor" type="color" class="u-input" style="height:40px;padding:2px;" /></div>
      <div class="u-field"><label class="u-field-label">圆角 (px)</label><input v-model.number="borderRadius" type="range" min="0" max="100" class="u-input" /></div>
      <div class="shape-preview" :style="previewStyle"></div>
      <div class="u-field"><label class="u-field-label">CSS 代码</label><textarea :value="cssCode" class="u-input tool-textarea" readonly rows="3" /></div>
      <div class="tool-actions">
        <button type="button" class="u-btn-primary" @click="copyCss">复制 CSS</button>
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

const PAGE = TOOL_PAGES['/design/shape']
const usage = useToolUsage('/design/shape')
const shadowX = ref(4)
const shadowY = ref(4)
const shadowBlur = ref(12)
const shadowSpread = ref(0)
const shadowColor = ref('#00000040')
const borderRadius = ref(12)

const previewStyle = computed(() => ({
  boxShadow: `${shadowX.value}px ${shadowY.value}px ${shadowBlur.value}px ${shadowSpread.value}px ${shadowColor.value}`,
  borderRadius: `${borderRadius.value}px`,
}))

const cssCode = computed(() =>
  `box-shadow: ${shadowX.value}px ${shadowY.value}px ${shadowBlur.value}px ${shadowSpread.value}px ${shadowColor.value};\nborder-radius: ${borderRadius.value}px;`
)

async function copyCss() {
  const startedAt = performance.now()
  try {
    await navigator.clipboard.writeText(cssCode.value)
    usage.record({ durationMs: performance.now() - startedAt, meta: { radius: borderRadius.value } })
  } catch (e) {
    usage.record({ ok: false, errorCode: 'SHAPE_COPY_FAILED', durationMs: performance.now() - startedAt })
  }
}
</script>

<style scoped>
.shape-preview { width: 100%; height: 120px; background: var(--bg-surface-2); border: var(--stroke-width) solid var(--stroke-color); transition: all 0.2s; }
</style>
