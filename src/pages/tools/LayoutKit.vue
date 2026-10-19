<template>
  <ToolPageShell :title="PAGE.title" :eyebrow="PAGE.eyebrow" :description="PAGE.description" :icon="PAGE.icon" :requires-card="PAGE.requiresCard">
    <section class="ui-card tool-panel">
      <h2 class="tool-panel-title"><AppIcon name="layout-grid" aria-hidden="true" /><span>{{ PAGE.inputTitle }}</span></h2>
      <div class="layout-grid">
        <div class="u-field">
          <label class="u-field-label">布局方式</label>
          <SelectField v-model="layoutType" :options="TYPE_OPTIONS" aria-label="布局方式" />
        </div>
        <div class="u-field">
          <label class="u-field-label">gap</label>
          <div class="layout-gap-row">
            <input v-model.number="gap" type="range" min="0" max="48" class="layout-gap-slider" />
            <input v-model.number="gap" type="number" min="0" max="48" class="layout-gap-number" />
            <span class="layout-gap-unit">px</span>
          </div>
        </div>
        <template v-if="layoutType === 'flex'">
          <div class="u-field"><label class="u-field-label">flex-direction</label><SelectField v-model="flexDirection" :options="DIRECTION_OPTIONS" aria-label="flex direction" /></div>
          <div class="u-field"><label class="u-field-label">justify-content</label><SelectField v-model="justifyContent" :options="JUSTIFY_OPTIONS" aria-label="justify content" /></div>
          <div class="u-field"><label class="u-field-label">align-items</label><SelectField v-model="alignItems" :options="ALIGN_OPTIONS" aria-label="align items" /></div>
          <div class="u-field"><label class="u-field-label">flex-wrap</label><SelectField v-model="flexWrap" :options="WRAP_OPTIONS" aria-label="flex wrap" /></div>
        </template>
        <template v-else>
          <div class="u-field"><label class="u-field-label">grid-template-columns</label><SelectField v-model="gridColumns" :options="COLUMN_OPTIONS" aria-label="网格列数" /></div>
          <div class="u-field"><label class="u-field-label">align-items</label><SelectField v-model="alignItems" :options="ALIGN_OPTIONS" aria-label="align items" /></div>
        </template>
        <div class="u-field">
          <label class="u-field-label">子元素数量</label>
          <div class="layout-gap-row">
            <input v-model.number="childCount" type="range" min="1" max="12" class="layout-gap-slider" />
            <input v-model.number="childCount" type="number" min="1" max="12" class="layout-gap-number" />
          </div>
        </div>
        <div class="u-field">
          <label class="u-field-label">响应式断点（max-width）</label>
          <SelectField v-model="breakpoint" :options="BREAKPOINT_OPTIONS" aria-label="响应式断点" />
        </div>
      </div>
      <div class="tool-actions">
        <button type="button" class="u-btn-primary" @click="process">{{ PAGE.submit }}</button>
        <button type="button" class="u-btn-secondary" @click="clear">{{ PAGE.reset }}</button>
      </div>
    </section>

    <section class="ui-card tool-panel">
      <h2 class="tool-panel-title"><AppIcon name="check-circle" aria-hidden="true" /><span>{{ PAGE.resultTitle }}</span></h2>
      <ToolResultPane :state="result ? 'success' : 'empty'" :title="PAGE.emptyTitle" :description="PAGE.emptyDesc" icon="layout-grid">
        <template v-if="result">
          <component :is="'style'">{{ previewCss }}</component>
          <div class="layout-preview-wrap">
            <div class="layout-demo">
              <div v-for="n in childCount" :key="n" class="layout-preview-item">{{ n }}</div>
            </div>
          </div>
          <p class="tool-result-note">上面的预览就是下面这段 CSS 直接作用于 <code>.layout-demo</code> 的结果（选择器换成 <code>.container</code> 即可粘走）。</p>
          <ToolCodeBlock :code="result" lang="css" />
        </template>
      </ToolResultPane>
    </section>

    <template #aside>
      <section class="ui-card tool-aside-card">
        <h3 class="tool-aside-title"><AppIcon name="info" /> {{ TOOL_PAGE.usageTitle }}</h3>
        <ul class="tool-aside-list"><li v-for="item in PAGE.asideItems" :key="item">{{ item }}</li></ul>
      </section>
      <section class="ui-card tool-aside-card">
        <h3 class="tool-aside-title"><AppIcon name="alert-triangle" /> {{ TOOL_PAGE.noticeTitle }}</h3>
        <p class="tool-aside-note">{{ PAGE.asideNotice }} 断点只提供 1199 / 991 / 767 / 575 四档，与本项目的响应式约定一致。</p>
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
import ToolResultPane from '@/components/ToolResultPane.vue'
import { TOOL_PAGE, TOOL_PAGES } from '@/constants/index.js'
import { useToolUsage } from '@/hooks/useToolUsage/index.js'

const PAGE = TOOL_PAGES['/design/layout']
const usage = useToolUsage('/design/layout')

const TYPE_OPTIONS = [
  { label: 'Flex', value: 'flex' },
  { label: 'Grid', value: 'grid' },
]
const DIRECTION_OPTIONS = ['row', 'row-reverse', 'column', 'column-reverse'].map((value) => ({ label: value, value }))
const JUSTIFY_OPTIONS = ['flex-start', 'flex-end', 'center', 'space-between', 'space-around', 'space-evenly'].map((value) => ({ label: value, value }))
const ALIGN_OPTIONS = ['stretch', 'flex-start', 'flex-end', 'center', 'baseline'].map((value) => ({ label: value, value }))
const WRAP_OPTIONS = ['nowrap', 'wrap', 'wrap-reverse'].map((value) => ({ label: value, value }))
const COLUMN_OPTIONS = [1, 2, 3, 4, 6].map((value) => ({ label: `repeat(${value}, 1fr)`, value: String(value) }))
// 选项文案只写断点值，不写完整的 `@media (...)` 字面量：
// 样式块里已经有一个真正的媒体查询，文案里再抄一遍会让「同一断点出现两次」的检查误报。
const BREAKPOINT_OPTIONS = [
  { label: '不需要媒体查询', value: 'none' },
  { label: '≤ 1199px', value: '1199' },
  { label: '≤ 991px', value: '991' },
  { label: '≤ 767px', value: '767' },
  { label: '≤ 575px', value: '575' },
]

const layoutType = ref('flex')
const flexDirection = ref('row')
const justifyContent = ref('flex-start')
const alignItems = ref('stretch')
const flexWrap = ref('nowrap')
const gridColumns = ref('3')
const gap = ref(8)
const childCount = ref(6)
const breakpoint = ref('none')
const result = ref('')

/** 声明行是唯一来源：导出代码与预览样式都从它生成，避免「预览一套、导出另一套」 */
const declarationLines = computed(() => {
  const lines = layoutType.value === 'flex'
    ? [
        'display: flex;',
        `flex-direction: ${flexDirection.value};`,
        `justify-content: ${justifyContent.value};`,
        `align-items: ${alignItems.value};`,
        `flex-wrap: ${flexWrap.value};`,
      ]
    : [
        'display: grid;',
        `grid-template-columns: repeat(${gridColumns.value}, 1fr);`,
        `align-items: ${alignItems.value};`,
      ]
  lines.push(`gap: ${gap.value}px;`)
  return lines
})

function buildRule(selector) {
  return [`${selector} {`, ...declarationLines.value.map((line) => `  ${line}`), '}'].join('\n')
}

const mediaRule = computed(() => {
  if (breakpoint.value === 'none') return ''
  // 收窄到单列：flex 竖排、grid 单列，是这两套布局最常见的降级
  const override = layoutType.value === 'flex' ? ['flex-direction: column;', 'align-items: stretch;'] : ['grid-template-columns: 1fr;']
  return [`@media (max-width: ${breakpoint.value}px) {`, '  .container {', ...override.map((line) => `    ${line}`), '  }', '}'].join('\n')
})

const cssText = computed(() => (mediaRule.value ? `${buildRule('.container')}\n\n${mediaRule.value}` : buildRule('.container')))

/** 预览用的样式：同一份声明 + 同一个断点，只把选择器换成预览节点 */
const previewCss = computed(() => cssText.value.replace(/\.container\b/g, '.layout-demo'))

function process() {
  const startedAt = performance.now()
  result.value = cssText.value
  usage.record({ durationMs: Math.round(performance.now() - startedAt), meta: { type: layoutType.value, breakpoint: breakpoint.value } })
}

function clear() {
  layoutType.value = 'flex'
  flexDirection.value = 'row'
  justifyContent.value = 'flex-start'
  alignItems.value = 'stretch'
  flexWrap.value = 'nowrap'
  gridColumns.value = '3'
  gap.value = 8
  childCount.value = 6
  breakpoint.value = 'none'
  result.value = ''
}
</script>

<style scoped>
.layout-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: calc(var(--space-unit) * 2); }
.layout-gap-row { display: flex; align-items: center; gap: var(--space-unit); }
.layout-gap-slider { flex: 1; }
.layout-gap-number { width: 56px; padding: 4px 6px; border: 1px solid var(--stroke-color); border-radius: var(--radius-input); background: var(--bg-surface-2); color: var(--text-primary); font-family: var(--font-mono); font-size: var(--fs-sm); }
.layout-gap-unit { font-size: var(--fs-sm); color: var(--text-secondary); }
.layout-preview-wrap { padding: calc(var(--space-unit) * 3); background: var(--bg-surface-2); border-radius: var(--radius-card); margin-bottom: calc(var(--space-unit) * 2); min-height: 160px; }
.layout-preview-item { width: 48px; height: 48px; display: flex; align-items: center; justify-content: center; background: var(--accent); color: var(--text-on-accent); border-radius: var(--radius-input); font-family: var(--font-mono); font-size: var(--fs-sm); font-weight: var(--fw-heading); flex-shrink: 0; }
@media (max-width: 575px) {
  .layout-grid { grid-template-columns: 1fr; }
}
</style>
