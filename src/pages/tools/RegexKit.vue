<template>
  <ToolPageShell :title="PAGE.title" :eyebrow="PAGE.eyebrow" :description="PAGE.description" :icon="PAGE.icon" :requires-card="PAGE.requiresCard">
    <section class="ui-card tool-panel">
      <h2 class="tool-panel-title"><AppIcon name="search" aria-hidden="true" /><span>{{ PAGE.inputTitle }}</span></h2>
      <div class="u-field">
        <label class="u-field-label" for="regex-pattern">正则表达式</label>
        <input id="regex-pattern" v-model="pattern" class="u-input" :placeholder="PAGE.patternPlaceholder" />
        <p v-if="regexError" class="u-field-error" role="alert">{{ regexError }}</p>
      </div>
      <div class="u-field">
        <label class="u-field-label" for="regex-flags">标志位</label>
        <div class="tool-actions">
          <label v-for="flag in flagsOptions" :key="flag.value" class="u-switch" :aria-checked="flags.includes(flag.value) ? 'true' : 'false'">
            <input type="checkbox" :checked="flags.includes(flag.value)" @change="toggleFlag(flag.value, $event.target.checked)" />
            <span class="u-switch-track"><span class="u-switch-thumb"></span></span>
            <span class="u-switch-label">{{ flag.label }}</span>
          </label>
        </div>
      </div>
      <div class="u-field">
        <label class="u-field-label" for="regex-test">测试文本</label>
        <textarea id="regex-test" v-model="testText" class="u-input tool-textarea" :placeholder="PAGE.testPlaceholder" spellcheck="false"></textarea>
      </div>
    </section>

    <section class="ui-card tool-panel">
      <h2 class="tool-panel-title"><AppIcon name="check-circle" aria-hidden="true" /><span>{{ PAGE.resultTitle }}</span></h2>
      <ToolResultPane :state="result ? 'success' : 'empty'" :title="PAGE.emptyTitle" :description="PAGE.emptyDesc" icon="search">
        <template v-if="result">
          <div v-if="result.matches.length" class="regex-matches">
            <p class="tool-result-note">找到 {{ result.matches.length }} 个匹配</p>
            <div v-for="(match, i) in result.matches" :key="i" class="regex-match-row">
              <span class="regex-match-index">#{{ i + 1 }}</span>
              <code class="regex-match-text">{{ match.text }}</code>
              <span class="regex-match-pos">位置: {{ match.index }}</span>
            </div>
          </div>
          <p v-else class="tool-result-note">未找到匹配</p>
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
import { ref, watch } from 'vue'
import AppIcon from '@/components/AppIcon.vue'
import ToolPageShell from '@/components/ToolPageShell.vue'
import ToolResultPane from '@/components/ToolResultPane.vue'
import { TOOL_PAGE, TOOL_PAGES } from '@/constants/index.js'
import { useToolUsage } from '@/hooks/useToolUsage/index.js'

const PAGE = TOOL_PAGES['/text/regex-kit']
const usage = useToolUsage('/text/regex-kit')
const pattern = ref('')
const flags = ref('g')
const testText = ref('')
const regexError = ref('')
const result = ref(null)

const flagsOptions = [
  { label: 'g 全局', value: 'g' },
  { label: 'i 忽略大小写', value: 'i' },
  { label: 'm 多行', value: 'm' },
  { label: 's 点号通配', value: 's' },
  { label: 'u Unicode', value: 'u' },
]

function toggleFlag(flag, checked) {
  if (checked) flags.value = [...new Set(flags.value + flag)].sort().join('')
  else flags.value = flags.value.replace(flag, '')
}

function testRegex() {
  const startedAt = performance.now()
  regexError.value = ''
  result.value = null
  if (!pattern.value || !testText.value) return
  try {
    const regex = new RegExp(pattern.value, flags.value)
    const matches = []
    let match
    if (flags.value.includes('g')) {
      while ((match = regex.exec(testText.value)) !== null) {
        matches.push({ text: match[0], index: match.index, groups: match.slice(1) })
        if (match.index === regex.lastIndex) regex.lastIndex++
      }
    } else {
      match = regex.exec(testText.value)
      if (match) matches.push({ text: match[0], index: match.index, groups: match.slice(1) })
    }
    result.value = { matches }
    usage.record({ durationMs: performance.now() - startedAt, meta: { flags: flags.value, matches: matches.length } })
  } catch (e) {
    regexError.value = e.message
    usage.record({ ok: false, errorCode: 'REGEX_COMPILE_FAILED', durationMs: performance.now() - startedAt })
  }
}

watch([pattern, flags, testText], () => { testRegex() }, { debounce: 200 })
</script>

<style scoped>
.regex-matches { display: flex; flex-direction: column; gap: calc(var(--space-unit)); }
.regex-match-row { display: flex; align-items: center; gap: calc(var(--space-unit)); padding: calc(var(--space-unit)); background: var(--bg-surface-2); border-radius: var(--radius-input); }
.regex-match-index { font-size: var(--fs-label); color: var(--accent); min-width: 32px; }
.regex-match-text { font-family: var(--font-mono); font-size: var(--fs-sm); color: var(--text-primary); flex: 1; word-break: break-all; }
.regex-match-pos { font-size: var(--fs-label); color: var(--text-muted); }
</style>
