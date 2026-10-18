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
        <p class="u-field-hint">为避免灾难性回溯卡死页面，测试文本限制为 50KB；匹配超过 1 秒会提示你优化正则。浏览器无法中断正在执行的 RegExp，超时只能提示，不能强制停止。</p>
      </div>
    </section>

    <section class="ui-card tool-panel">
      <h2 class="tool-panel-title"><AppIcon name="check-circle" aria-hidden="true" /><span>{{ PAGE.resultTitle }}</span></h2>
      <ToolResultPane :state="result ? 'success' : 'empty'" :title="PAGE.emptyTitle" :description="PAGE.emptyDesc" icon="search">
        <template v-if="result">
          <p v-if="result.tooSlow" class="tool-result-note regex-slow" role="alert">本次匹配耗时 {{ result.elapsedMs }}ms，超过 1 秒，可能存在灾难性回溯。请避免嵌套量词（如 (a+)+），或缩短测试文本。</p>
          <div v-if="result.matches.length" class="regex-matches">
            <p class="tool-result-note">找到 {{ result.matches.length }} 个匹配，耗时 {{ result.elapsedMs }}ms</p>
            <div v-for="(match, i) in result.matches" :key="i" class="regex-match-row">
              <span class="regex-match-index">#{{ i + 1 }}</span>
              <div class="regex-match-body">
                <code class="regex-match-text">{{ match.text || '（空匹配）' }}</code>
                <span v-if="match.groups.length" class="regex-match-groups">捕获组: {{ match.groups.map((g) => g ?? 'undefined').join(' | ') }}</span>
              </div>
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
import { onUnmounted, ref, watch } from 'vue'
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
let timer = 0

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
  if (new Blob([testText.value]).size > 50 * 1024) {
    regexError.value = '测试文本超过 50KB。灾难性回溯会让页面长时间无响应，请缩短文本或改用更精确的正则。'
    usage.record({ ok: false, errorCode: 'REGEX_INPUT_TOO_LARGE', durationMs: Math.round(performance.now() - startedAt) })
    return
  }
  let regex
  try {
    regex = new RegExp(pattern.value, flags.value)
  } catch (e) {
    regexError.value = `正则编译失败：${e.message}。请检查括号、方括号、转义字符和标志位是否合法。`
    usage.record({ ok: false, errorCode: 'REGEX_COMPILE_FAILED', durationMs: Math.round(performance.now() - startedAt) })
    return
  }
  try {
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
    const elapsedMs = Math.round(performance.now() - startedAt)
    result.value = { matches, elapsedMs, tooSlow: elapsedMs > 1000 }
    usage.record({ durationMs: elapsedMs, meta: { flags: flags.value, matches: matches.length } })
  } catch (e) {
    regexError.value = `匹配执行失败：${e.message}`
    usage.record({ ok: false, errorCode: 'REGEX_EXEC_FAILED', durationMs: Math.round(performance.now() - startedAt) })
  }
}

watch([pattern, flags, testText], () => {
  clearTimeout(timer)
  timer = setTimeout(testRegex, 200)
})

onUnmounted(() => clearTimeout(timer))
</script>

<style scoped>
.regex-matches { display: flex; flex-direction: column; gap: calc(var(--space-unit)); }
.regex-match-row { display: flex; align-items: flex-start; gap: calc(var(--space-unit)); padding: calc(var(--space-unit)); background: var(--bg-surface-2); border-radius: var(--radius-input); }
.regex-match-index { font-size: var(--fs-label); color: var(--accent); min-width: 32px; }
.regex-match-body { display: flex; flex: 1; flex-direction: column; gap: calc(var(--space-unit) * 0.5); min-width: 0; }
.regex-match-text { font-family: var(--font-mono); font-size: var(--fs-sm); color: var(--text-primary); word-break: break-all; }
.regex-match-groups { font-size: var(--fs-label); color: var(--text-muted); word-break: break-all; }
.regex-match-pos { font-size: var(--fs-label); color: var(--text-muted); white-space: nowrap; }
.regex-slow { color: var(--danger); }
</style>
