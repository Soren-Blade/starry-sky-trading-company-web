<template>
  <ToolPageShell
    :title="PAGE.title"
    :eyebrow="PAGE.eyebrow"
    :description="PAGE.description"
    :icon="PAGE.icon"
    :requires-card="PAGE.requiresCard"
  >
    <section class="ui-card tool-panel">
      <div class="u-field">
        <label class="u-field-label" for="text-kit-mode">{{ PAGE.modeLabel }}</label>
        <SelectField id="text-kit-mode" v-model="currentMode" :options="PAGE.modeOptions" :aria-label="PAGE.modeLabel" />
      </div>
    </section>

    <section class="ui-card tool-panel">
      <h2 class="tool-panel-title">
        <AppIcon name="file-text" aria-hidden="true" /><span>{{ PAGE.inputTitle }}</span>
      </h2>
      <div class="u-field">
        <label class="u-field-label" for="text-source">{{ PAGE.sourceLabel }}</label>
        <textarea id="text-source" v-model="source" class="u-input tool-textarea" :placeholder="PAGE.sourcePlaceholder" spellcheck="false"></textarea>
        <p class="u-field-hint">{{ PAGE.sourceHint }}</p>
      </div>

      <div class="tool-form">
        <template v-if="currentMode === 'find-replace'">
          <div class="u-field">
            <label class="u-field-label" for="find-text">{{ PAGE.findLabel }}</label>
            <input id="find-text" v-model="findText" class="u-input" :placeholder="PAGE.findPlaceholder" />
          </div>
          <div class="u-field">
            <label class="u-field-label" for="replace-text">{{ PAGE.replaceLabel }}</label>
            <input id="replace-text" v-model="replaceText" class="u-input" :placeholder="PAGE.replacePlaceholder" />
          </div>
          <div class="u-field">
            <label class="u-switch" :aria-checked="useRegex ? 'true' : 'false'">
              <input v-model="useRegex" type="checkbox" /><span class="u-switch-track"><span class="u-switch-thumb"></span></span><span class="u-switch-label">{{ PAGE.regexLabel }}</span>
            </label>
            <label class="u-switch" :aria-checked="globalReplace ? 'true' : 'false'">
              <input v-model="globalReplace" type="checkbox" /><span class="u-switch-track"><span class="u-switch-thumb"></span></span><span class="u-switch-label">{{ PAGE.globalLabel }}</span>
            </label>
          </div>
        </template>

        <template v-if="currentMode === 'case-convert'">
          <div class="u-field">
            <label class="u-field-label">{{ PAGE.caseLabel }}</label>
            <div class="tool-actions">
              <button v-for="opt in PAGE.caseOptions" :key="opt.value" type="button" class="u-btn-secondary" :class="{ 'u-btn-primary': caseType === opt.value }" @click="caseType = opt.value">{{ opt.label }}</button>
            </div>
          </div>
        </template>

        <template v-if="currentMode === 'line-sort'">
          <div class="u-field">
            <label class="u-field-label" for="sort-mode">{{ PAGE.sortLabel }}</label>
            <SelectField id="sort-mode" v-model="sortMode" :options="PAGE.sortOptions" />
          </div>
          <label class="u-switch" :aria-checked="sortUnique ? 'true' : 'false'">
            <input v-model="sortUnique" type="checkbox" /><span class="u-switch-track"><span class="u-switch-thumb"></span></span><span class="u-switch-label">{{ PAGE.uniqueLabel }}</span>
          </label>
        </template>

        <template v-if="currentMode === 'line-dedup'">
          <div class="u-field">
            <label class="u-field-label" for="dedup-mode">{{ PAGE.dedupLabel }}</label>
            <SelectField id="dedup-mode" v-model="dedupMode" :options="PAGE.dedupOptions" />
          </div>
        </template>

        <template v-if="currentMode === 'text-clean'">
          <div class="u-field">
            <label class="u-field-label">{{ PAGE.cleanLabel }}</label>
            <div class="tool-form">
              <label v-for="(label, key) in { empty: PAGE.cleanEmpty, trim: PAGE.cleanTrim, collapse: PAGE.cleanCollapse, newlines: PAGE.cleanNewlines }" :key="key" class="u-switch" :aria-checked="clean[key] ? 'true' : 'false'">
                <input v-model="clean[key]" type="checkbox" /><span class="u-switch-track"><span class="u-switch-thumb"></span></span><span class="u-switch-label">{{ label }}</span>
              </label>
            </div>
          </div>
        </template>
      </div>

      <div class="tool-actions">
        <button type="button" class="u-btn-primary" :disabled="!canSubmit" @click="start">{{ PAGE.submit }}</button>
        <button type="button" class="u-btn-secondary" :disabled="!source" @click="clear">{{ PAGE.reset }}</button>
        <button type="button" class="u-btn-secondary" @click="fillSample">{{ PAGE.sample }}</button>
      </div>
    </section>

    <section class="ui-card tool-panel">
      <h2 class="tool-panel-title">
        <AppIcon name="check-circle" aria-hidden="true" /><span>{{ PAGE.resultTitle }}</span>
      </h2>
      <ToolResultPane :state="jobState" :title="PAGE.emptyTitle" :description="PAGE.emptyDesc" :error="jobError" icon="file-text">
        <template v-if="result">
          <div v-if="currentMode === 'word-count'" class="tool-result-stats">
            <div v-for="stat in result.stats" :key="stat.label" class="tool-stat-card"><span class="tool-stat-value">{{ stat.value }}</span><span class="tool-stat-label">{{ stat.label }}</span></div>
          </div>
          <div v-else-if="result.html" class="tool-preview markdown-preview" v-html="result.html"></div>
          <pre v-else class="tool-preview">{{ result.text }}</pre>
          <div v-if="result.meta" class="tool-result-meta">
            <span v-for="(value, key) in result.meta" :key="key" class="tool-result-meta-item">{{ key }}: <span class="tool-result-value">{{ value }}</span></span>
          </div>
        </template>
        <template #actions>
          <button type="button" class="u-btn-primary" :disabled="!result" @click="copyResult">{{ copyLabel }}</button>
        </template>
      </ToolResultPane>
    </section>

    <template #aside>
      <section class="ui-card tool-aside-card">
        <h3 class="tool-aside-title">
          <span class="tool-aside-title-icon" aria-hidden="true"><AppIcon name="info" /></span><span>{{ TOOL_PAGE.usageTitle }}</span>
        </h3>
        <ul class="tool-aside-list"><li v-for="item in PAGE.asideItems" :key="item">{{ item }}</li></ul>
        <p class="tool-aside-note">{{ PAGE.asideNotice }}</p>
      </section>
    </template>
  </ToolPageShell>
</template>

<script setup>
import { computed, reactive, ref, watch } from 'vue'
import AppIcon from '@/components/AppIcon.vue'
import SelectField from '@/components/SelectField.vue'
import ToolPageShell from '@/components/ToolPageShell.vue'
import ToolResultPane from '@/components/ToolResultPane.vue'
import { TOOL_PAGE, TOOL_PAGES, TOOL_RESULT } from '@/constants/index.js'
import { CASE_FNS, cleanText, countStats, dedupLines, encodeEntities, htmlToMarkdown, sortLines, zhConvert } from '@/utils/textKit.js'
import { useToolJob } from '@/hooks/useToolJob/index.js'
import { useToolUsage } from '@/hooks/useToolUsage/index.js'

const PAGE = TOOL_PAGES['/text/kit']
const usage = useToolUsage('/text/kit')
const currentMode = ref('markdown-html'), source = ref('')
const findText = ref(''), replaceText = ref(''), useRegex = ref(false), globalReplace = ref(true)
const caseType = ref('upper'), sortMode = ref('asc'), sortUnique = ref(false), dedupMode = ref('first')
const clean = reactive({ empty: true, trim: true, collapse: false, newlines: false })
const copyState = ref('idle')

const { state: jobState, result, error: jobError, run, reset: resetJob } = useToolJob({ run: processText, usage })
const busy = computed(() => jobState.value === 'loading')
const canSubmit = computed(() => Boolean(source.value.trim()) && !busy.value)
const copyLabel = computed(() => (copyState.value === 'ok' ? TOOL_RESULT.copied : copyState.value === 'fail' ? TOOL_RESULT.copyFailed : TOOL_RESULT.copy))


function fail(message, code) { return Object.assign(new Error(message), { code }) }

function updateWordCount() {
  if (!source.value.trim()) return resetJob()
  const text = source.value
  const startedAt = performance.now()
  Object.assign(result.value, countStats(text, new Blob([text]).size))
  jobState.value = 'success'
  usage.record({ durationMs: Math.round(performance.now() - startedAt), meta: { mode: 'word-count', chars: text.length } })
}

watch([source, currentMode], () => { if (currentMode.value === 'word-count') updateWordCount() }, { immediate: true })

async function processText() {
  const text = source.value
  if (!text.trim()) throw fail(PAGE.invalidEmpty, 'TEXT_EMPTY_INPUT')
  await new Promise((resolve) => { setTimeout(resolve, 0) })
  let output = text, html = '', meta = {}

  switch (currentMode.value) {
    case 'markdown-html':
      try {
        // marked 解析 Markdown，DOMPurify 清除脚本、事件属性和危险链接，必须经过净化再 v-html。
        const [markedMod, dompurifyMod] = await Promise.all([import('marked'), import('dompurify')])
        const purify = dompurifyMod.default || dompurifyMod
        const sanitize = purify.sanitize ? purify.sanitize.bind(purify) : purify(window).sanitize
        html = sanitize(await (markedMod.marked?.parse || markedMod.parse)(text))
        output = html
        meta = { 模式: 'Markdown → HTML' }
      } catch (error) { throw fail(`Markdown 渲染失败：${error.message}`, 'MARKDOWN_RENDER_FAILED') }
      break
    case 'html-markdown': output = htmlToMarkdown(text); meta = { 模式: 'HTML → Markdown' }; break
    case 'html-entity':
      output = encodeEntities(text)
      meta = { 模式: 'HTML 实体编码' }
      break
    case 'html-decode': {
      const area = document.createElement('textarea'); area.innerHTML = text; output = area.value
      meta = { 模式: 'HTML 实体解码' }
      break
    }
    case 'find-replace':
      if (!findText.value) throw fail(PAGE.needFindText, 'TEXT_FIND_REQUIRED')
      if (useRegex.value) {
        try { output = text.replace(new RegExp(findText.value, globalReplace.value ? 'g' : ''), replaceText.value) } catch (error) { throw fail(`${PAGE.invalidRegex}${error.message}`, 'TEXT_INVALID_REGEX') }
      } else output = globalReplace.value ? text.split(findText.value).join(replaceText.value) : text.replace(findText.value, replaceText.value)
      meta = { 查找: findText.value, 替换: replaceText.value }; break
    case 'case-convert': output = CASE_FNS[caseType.value](text); meta = { 转换: PAGE.caseOptions.find((o) => o.value === caseType.value)?.label }; break
    case 'line-sort':
      output = sortLines(text, sortMode.value, sortUnique.value)
      meta = { 排序: sortMode.value, 去重: sortUnique.value ? '是' : '否' }
      break
    case 'line-dedup': {
      const before = text.split('\n').length
      output = dedupLines(text, dedupMode.value)
      meta = { 原行数: before, 去重后: output.split('\n').length }
      break
    }
    case 'text-clean':
      output = cleanText(text, clean)
      meta = { 原长度: text.length, 处理后: output.length }; break
    case 'zh-convert': output = zhConvert(text); meta = { 模式: '简繁转换（常用字）' }; break
  }
  return { text: output, html, meta }
}

function start() { copyState.value = 'idle'; if (currentMode.value === 'word-count') updateWordCount(); else run() }
function clear() { source.value = ''; copyState.value = 'idle'; resetJob() }
function fillSample() { source.value = PAGE.sampleText; copyState.value = 'idle'; resetJob() }
async function copyResult() {
  if (!result.value?.text) return
  try { if (!navigator.clipboard) throw new Error('clipboard unavailable'); await navigator.clipboard.writeText(result.value.text); copyState.value = 'ok' } catch { copyState.value = 'fail' }
}
</script>

<style scoped>
.tool-result-stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: calc(var(--space-unit) * 1.5); }
.tool-stat-card { display: flex; flex-direction: column; align-items: center; gap: calc(var(--space-unit) * 0.5); padding: calc(var(--space-unit) * 2); border-radius: var(--radius-card); background: var(--bg-surface-2); }
.tool-stat-value { font-family: var(--font-mono); font-size: var(--fs-h3); font-weight: var(--fw-heading); color: var(--accent); }
.tool-stat-label { font-size: var(--fs-sm); color: var(--text-secondary); }
.markdown-preview { line-height: var(--leading-body); color: var(--text-primary); }
.markdown-preview :deep(h1), .markdown-preview :deep(h2), .markdown-preview :deep(h3) { margin: calc(var(--space-unit) * 2) 0 var(--space-unit); font-size: var(--fs-h3); color: var(--text-primary); }
.markdown-preview :deep(p) { margin: 0 0 var(--space-unit); }
.markdown-preview :deep(a) { color: var(--accent); }
.markdown-preview :deep(code) { padding: 0 calc(var(--space-unit) * 0.5); border-radius: var(--radius-input); background: var(--bg-surface-2); font-family: var(--font-mono); }
.markdown-preview :deep(blockquote) { margin: 0; padding-left: calc(var(--space-unit) * 1.5); border-left: 2px solid var(--border); color: var(--text-secondary); }
</style>
