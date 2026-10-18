<template>
  <ToolPageShell :title="PAGE.title" :eyebrow="PAGE.eyebrow" :description="PAGE.description" :icon="PAGE.icon" :requires-card="PAGE.requiresCard">
    <section class="ui-card tool-panel">
      <h2 class="tool-panel-title"><AppIcon name="presentation" aria-hidden="true" /><span>Markdown 转大纲</span></h2>
      <div class="u-field">
        <label class="u-field-label">Markdown 内容</label>
        <textarea v-model="source" class="u-input tool-textarea" placeholder="# 标题&#10;## 要点 1&#10;- 内容 A&#10;- 内容 B&#10;## 要点 2&#10;- 内容 C" spellcheck="false" rows="10"></textarea>
      </div>
      <div class="tool-actions">
        <button type="button" class="u-btn-primary" :disabled="!source" @click="convert">转换</button>
        <button type="button" class="u-btn-secondary" @click="clear">清空</button>
      </div>
    </section>

    <section v-if="outline.length" class="ui-card tool-panel">
      <h2 class="tool-panel-title"><AppIcon name="check-circle" aria-hidden="true" /><span>幻灯片大纲</span></h2>
      <div class="slides-outline">
        <div v-for="(slide, i) in outline" :key="i" class="slide-card">
          <h4 class="slide-title">{{ slide.title }}</h4>
          <ul class="slide-bullets"><li v-for="(b, j) in slide.bullets" :key="j">{{ b }}</li></ul>
        </div>
      </div>
      <div class="tool-actions">
        <button type="button" class="u-btn-primary" @click="copyOutline">复制大纲</button>
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
import { ref } from 'vue'
import AppIcon from '@/components/AppIcon.vue'
import ToolPageShell from '@/components/ToolPageShell.vue'
import { TOOL_PAGE, TOOL_PAGES } from '@/constants/index.js'
import { useToolUsage } from '@/hooks/useToolUsage/index.js'

const PAGE = TOOL_PAGES['/office/slides']
const usage = useToolUsage('/office/slides')
const source = ref('')
const outline = ref([])

function convert() {
  if (!source.value) return
  const startedAt = performance.now()
  const lines = source.value.split('\n')
  const slides = []
  let current = null
  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed) continue
    const h1 = trimmed.match(/^#\s+(.+)/)
    const h2 = trimmed.match(/^##\s+(.+)/)
    const bullet = trimmed.match(/^[-*]\s+(.+)/)
    if (h1) {
      if (current) slides.push(current)
      current = { title: h1[1], bullets: [] }
    } else if (h2) {
      if (current) slides.push(current)
      current = { title: h2[1], bullets: [] }
    } else if (bullet && current) {
      current.bullets.push(bullet[1])
    }
  }
  if (current) slides.push(current)
  outline.value = slides
  usage.record({ durationMs: performance.now() - startedAt, meta: { slides: slides.length } })
}

function clear() { source.value = ''; outline.value = [] }

function copyOutline() {
  const text = outline.value.map(s => s.title + '\n' + s.bullets.map(b => '- ' + b).join('\n')).join('\n\n')
  navigator.clipboard.writeText(text)
}
</script>

<style scoped>
.slides-outline { display: flex; flex-direction: column; gap: calc(var(--space-unit) * 2); }
.slide-card { padding: calc(var(--space-unit) * 2); background: var(--bg-surface-2); border-radius: var(--radius-card); border-left: 4px solid var(--accent); }
.slide-title { margin: 0 0 calc(var(--space-unit)); font-size: var(--fs-sm); font-weight: var(--fw-heading); color: var(--text-primary); }
.slide-bullets { margin: 0; padding-left: calc(var(--space-unit) * 4); color: var(--text-secondary); }
.slide-bullets li { margin: calc(var(--space-unit)) 0; }
</style>
