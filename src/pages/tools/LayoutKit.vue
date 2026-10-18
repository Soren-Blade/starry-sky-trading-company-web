<template>
  <ToolPageShell :title="PAGE.title" :eyebrow="PAGE.eyebrow" :description="PAGE.description" :icon="PAGE.icon" :requires-card="PAGE.requiresCard">
    <section class="ui-card tool-panel">
      <h2 class="tool-panel-title"><AppIcon name="layout-grid" aria-hidden="true" /><span>{{ PAGE.inputTitle }}</span></h2>

      <div class="layout-grid">
        <div class="u-field">
          <label class="u-field-label">flex-direction</label>
          <SelectField v-model="flexDirection" :options="directionOptions" aria-label="flex direction" />
        </div>
        <div class="u-field">
          <label class="u-field-label">justify-content</label>
          <SelectField v-model="justifyContent" :options="justifyOptions" aria-label="justify content" />
        </div>
        <div class="u-field">
          <label class="u-field-label">align-items</label>
          <SelectField v-model="alignItems" :options="alignOptions" aria-label="align items" />
        </div>
        <div class="u-field">
          <label class="u-field-label">flex-wrap</label>
          <SelectField v-model="flexWrap" :options="wrapOptions" aria-label="flex wrap" />
        </div>
        <div class="u-field">
          <label class="u-field-label">gap</label>
          <div class="layout-gap-row">
            <input v-model.number="gap" type="range" min="0" max="48" class="layout-gap-slider" />
            <input v-model.number="gap" type="number" min="0" max="48" class="layout-gap-number" />
            <span class="layout-gap-unit">px</span>
          </div>
        </div>
        <div class="u-field">
          <label class="u-field-label">子元素数量</label>
          <div class="layout-gap-row">
            <input v-model.number="childCount" type="range" min="1" max="12" class="layout-gap-slider" />
            <input v-model.number="childCount" type="number" min="1" max="12" class="layout-gap-number" />
          </div>
        </div>
      </div>

      <div class="tool-actions">
        <button type="button" class="u-btn-primary" @click="process">{{ PAGE.submit }}</button>
        <button type="button" class="u-btn-secondary" @click="clear">{{ PAGE.reset }}</button>
      </div>
    </section>

    <section class="ui-card tool-panel">
      <h2 class="tool-panel-title"><AppIcon name="check-circle" aria-hidden="true" /><span>{{ PAGE.resultTitle }}</span></h2>
      <ToolResultPane :state="result ? 'success' : 'empty'" :title="PAGE.emptyTitle" :description="PAGE.emptyDesc" icon="layout">
        <template v-if="result">
          <div class="layout-preview-wrap">
            <div class="layout-preview-container" :style="containerStyle">
              <div v-for="n in childCount" :key="n" class="layout-preview-item">{{ n }}</div>
            </div>
          </div>
          <pre class="tool-preview">{{ result }}</pre>
        </template>
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
import { computed, ref } from 'vue'
import AppIcon from '@/components/AppIcon.vue'
import SelectField from '@/components/SelectField.vue'
import ToolPageShell from '@/components/ToolPageShell.vue'
import ToolResultPane from '@/components/ToolResultPane.vue'
import { TOOL_PAGE, TOOL_PAGES, TOOL_RESULT } from '@/constants/index.js'

const PAGE = TOOL_PAGES['/design/layout']
const result = ref('')
const copyState = ref('idle')
const copyLabel = computed(() => copyState.value === 'ok' ? TOOL_RESULT.copied : copyState.value === 'fail' ? TOOL_RESULT.copyFailed : TOOL_RESULT.copy)

const flexDirection = ref('row')
const justifyContent = ref('flex-start')
const alignItems = ref('stretch')
const flexWrap = ref('nowrap')
const gap = ref(8)
const childCount = ref(6)

const directionOptions = [
  { label: 'row', value: 'row' },
  { label: 'row-reverse', value: 'row-reverse' },
  { label: 'column', value: 'column' },
  { label: 'column-reverse', value: 'column-reverse' },
]

const justifyOptions = [
  { label: 'flex-start', value: 'flex-start' },
  { label: 'flex-end', value: 'flex-end' },
  { label: 'center', value: 'center' },
  { label: 'space-between', value: 'space-between' },
  { label: 'space-around', value: 'space-around' },
  { label: 'space-evenly', value: 'space-evenly' },
]

const alignOptions = [
  { label: 'stretch', value: 'stretch' },
  { label: 'flex-start', value: 'flex-start' },
  { label: 'flex-end', value: 'flex-end' },
  { label: 'center', value: 'center' },
  { label: 'baseline', value: 'baseline' },
]

const wrapOptions = [
  { label: 'nowrap', value: 'nowrap' },
  { label: 'wrap', value: 'wrap' },
  { label: 'wrap-reverse', value: 'wrap-reverse' },
]

const containerStyle = computed(() => ({
  display: 'flex',
  flexDirection: flexDirection.value,
  justifyContent: justifyContent.value,
  alignItems: alignItems.value,
  flexWrap: flexWrap.value,
  gap: `${gap.value}px`,
}))

function process() {
  const lines = [
    '.container {',
    '  display: flex;',
    `  flex-direction: ${flexDirection.value};`,
    `  justify-content: ${justifyContent.value};`,
    `  align-items: ${alignItems.value};`,
    `  flex-wrap: ${flexWrap.value};`,
    `  gap: ${gap.value}px;`,
    '}',
  ]
  result.value = lines.join('\n')
  copyState.value = 'idle'
}

function clear() {
  flexDirection.value = 'row'
  justifyContent.value = 'flex-start'
  alignItems.value = 'stretch'
  flexWrap.value = 'nowrap'
  gap.value = 8
  childCount.value = 6
  result.value = ''
  copyState.value = 'idle'
}

async function copy() {
  if (!result.value) return
  try {
    await navigator.clipboard.writeText(result.value)
    copyState.value = 'ok'
  } catch (e) {
    copyState.value = 'fail'
  }
}
</script>

<style scoped>
.layout-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: calc(var(--space-unit) * 2);
}
@media (max-width: 575px) {
  .layout-grid {
    grid-template-columns: 1fr;
  }
}
.layout-gap-row {
  display: flex;
  align-items: center;
  gap: calc(var(--space-unit) * 1);
}
.layout-gap-slider {
  flex: 1;
}
.layout-gap-number {
  width: 56px;
  padding: calc(var(--space-unit) * 0.5) calc(var(--space-unit) * 0.75);
  border: 1px solid var(--border);
  border-radius: var(--radius-input);
  background: var(--bg-surface);
  color: var(--text-primary);
  font-family: var(--font-mono);
  font-size: var(--fs-sm);
}
.layout-gap-unit {
  font-size: var(--fs-sm);
  color: var(--text-secondary);
}
.layout-preview-wrap {
  padding: calc(var(--space-unit) * 3);
  background: var(--bg-surface-2);
  border-radius: var(--radius-card);
  margin-bottom: calc(var(--space-unit) * 2);
  min-height: 160px;
}
.layout-preview-container {
  min-height: 120px;
  padding: calc(var(--space-unit) * 2);
  background: var(--bg-surface);
  border-radius: var(--radius-card);
  border: 1px dashed var(--border);
}
.layout-preview-item {
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--accent);
  color: #fff;
  border-radius: var(--radius-input);
  font-family: var(--font-mono);
  font-size: var(--fs-sm);
  font-weight: var(--fw-heading);
  flex-shrink: 0;
}
</style>
