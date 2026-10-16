<template>
  <ToolPageShell
    :title="PAGE.title"
    :eyebrow="PAGE.eyebrow"
    :description="PAGE.description"
    :icon="PAGE.icon"
    :requires-card="PAGE.requiresCard"
  >
    <!-- 输入区 -->
    <section class="ui-card tool-panel">
      <h2 class="tool-panel-title">
        <AppIcon name="monitor" aria-hidden="true" />
        <span>{{ PAGE.inputTitle }}</span>
      </h2>

      <div class="u-field">
        <label class="u-field-label" for="json-source">{{ PAGE.sourceLabel }}</label>
        <textarea
          id="json-source"
          v-model="source"
          class="u-input tool-textarea"
          :placeholder="PAGE.sourcePlaceholder"
          spellcheck="false"
          @input="sourceError = ''"
        ></textarea>
        <p class="u-field-hint">{{ PAGE.sourceHint }}</p>
      </div>

      <p v-if="sourceError" class="u-field-error" role="alert">{{ sourceError }}</p>

      <div class="tool-form">
        <div class="u-field">
          <label class="u-field-label" for="json-indent">{{ PAGE.indentLabel }}</label>
          <SelectField
            id="json-indent"
            v-model="indent"
            :options="PAGE.indentOptions"
            :aria-label="PAGE.indentLabel"
            :disabled="minify"
          />
        </div>

        <div class="u-field">
          <label class="u-switch" :aria-checked="minify ? 'true' : 'false'">
            <input type="checkbox" :checked="minify" @change="minify = $event.target.checked" />
            <span class="u-switch-track"><span class="u-switch-thumb"></span></span>
            <span class="u-switch-label">{{ PAGE.minifyLabel }}</span>
          </label>
          <p class="u-field-hint">{{ PAGE.minifyHint }}</p>
        </div>
      </div>

      <div class="tool-actions">
        <button type="button" class="u-btn-primary" :disabled="!canSubmit" @click="start">
          {{ PAGE.submit }}
        </button>
        <button type="button" class="u-btn-secondary" :disabled="!source" @click="clear">
          {{ PAGE.reset }}
        </button>
      </div>
    </section>

    <!-- 结果区 -->
    <section class="ui-card tool-panel">
      <h2 class="tool-panel-title">
        <AppIcon name="check-circle" aria-hidden="true" />
        <span>{{ PAGE.resultTitle }}</span>
      </h2>

      <ToolResultPane
        :state="jobState"
        :title="PAGE.emptyTitle"
        :description="PAGE.emptyDesc"
        :error="jobError"
        icon="monitor"
      >
        <template #empty-actions>
          <button type="button" class="u-btn-secondary" @click="fillSample">
            {{ PAGE.sample }}
          </button>
        </template>

        <template v-if="result">
          <pre class="tool-preview">{{ result.text }}</pre>

          <div class="tool-result-meta">
            <span class="tool-result-meta-item">
              {{ META.chars }}
              <span class="tool-result-value">{{ result.chars }}</span>
            </span>
            <span class="tool-result-meta-item">
              {{ META.lines }}
              <span class="tool-result-value">{{ result.lines }}</span>
            </span>
          </div>

          <p class="tool-result-note">{{ PAGE.resultNote }}</p>
        </template>

        <template #actions>
          <button type="button" class="u-btn-primary" @click="copyResult">
            {{ copyLabel }}
          </button>
        </template>
      </ToolResultPane>
    </section>

    <!-- 辅助信息 -->
    <template #aside>
      <section class="ui-card tool-aside-card">
        <h3 class="tool-aside-title">
          <span class="tool-aside-title-icon" aria-hidden="true"><AppIcon name="info" /></span>
          <span>{{ TOOL_PAGE.usageTitle }}</span>
        </h3>
        <ul class="tool-aside-list">
          <li v-for="item in PAGE.asideItems" :key="item">{{ item }}</li>
        </ul>
      </section>

      <section class="ui-card tool-aside-card">
        <h3 class="tool-aside-title">
          <span class="tool-aside-title-icon" aria-hidden="true">
            <AppIcon name="shield-alert" />
          </span>
          <span>{{ TOOL_PAGE.noticeTitle }}</span>
        </h3>
        <p class="tool-aside-note">
          <span class="tool-aside-note-icon" aria-hidden="true">
            <AppIcon name="alert-triangle" />
          </span>
          <span>{{ PAGE.asideNotice }}</span>
        </p>
      </section>
    </template>
  </ToolPageShell>
</template>

<script setup>
/**
 * JSON 格式化工具页。
 *
 * 这是本期五个工具页里**唯一真实可用**的一个：`JSON.parse` + `JSON.stringify`
 * 本身就完成了全部工作，不需要任何服务端或第三方库，所以没有理由做成占位。
 *
 * 两个刻意的取舍：
 * 1. **不引入语法高亮库**。为了几个颜色增加一个依赖与一套主题适配不划算，
 *    结果用 `.tool-preview`（等宽、保留空白、可滚动）如实展示。
 * 2. **解析前让出一帧**。解析是同步的，不让出的话浏览器一次都画不出「正在处理」，
 *    加载态就等于不存在；让出一帧之后，超大文本也能先看到反馈。
 *
 * 解析失败时把 `SyntaxError.message` 原样交给结果区（`role="alert"`）：
 * 那句话里带着出错位置，换成「解析失败」就等于把最有用的信息丢掉。
 */
import { computed, ref } from 'vue'
import AppIcon from '@/components/AppIcon.vue'
import SelectField from '@/components/SelectField.vue'
import ToolPageShell from '@/components/ToolPageShell.vue'
import ToolResultPane from '@/components/ToolResultPane.vue'
import { TOOL_PAGE, TOOL_PAGES, TOOL_RESULT } from '@/constants/index.js'
import { useToolJob } from '@/hooks/useToolJob/index.js'

const PAGE = TOOL_PAGES['/dev/json-formatter']
const META = TOOL_RESULT.meta

const source = ref('')
const indent = ref('2')
const minify = ref(false)
const sourceError = ref('')
const copyState = ref('idle')

const { state: jobState, result, error: jobError, run, reset: resetJob } = useToolJob({
  run: formatJson,
})

const busy = computed(() => jobState.value === 'loading')
const canSubmit = computed(() => Boolean(source.value.trim()) && !busy.value)

const copyLabel = computed(() => {
  if (copyState.value === 'ok') return TOOL_RESULT.copied
  if (copyState.value === 'fail') return TOOL_RESULT.copyFailed
  return TOOL_RESULT.copy
})

/** '2' / '4' 是空格数，'tab' 是制表符 */
function indentValue() {
  if (indent.value === 'tab') return '\t'
  const width = Number(indent.value)
  return Number.isFinite(width) ? width : 2
}

async function formatJson() {
  const text = source.value.trim()
  if (!text) throw new Error(PAGE.invalidEmpty)

  // 让出一帧，让「正在处理」先被绘制出来（见文件头说明）
  await new Promise((resolve) => {
    setTimeout(resolve, 0)
  })

  const parsed = JSON.parse(text)
  const output = minify.value
    ? JSON.stringify(parsed)
    : JSON.stringify(parsed, null, indentValue())

  return {
    text: output,
    chars: output.length,
    lines: output.split('\n').length,
  }
}

function start() {
  sourceError.value = ''
  copyState.value = 'idle'
  run()
}

function clear() {
  source.value = ''
  sourceError.value = ''
  copyState.value = 'idle'
  resetJob()
}

function fillSample() {
  source.value = PAGE.sampleJson
  sourceError.value = ''
  copyState.value = 'idle'
  resetJob()
}

async function copyResult() {
  const text = result.value?.text
  if (!text) return

  try {
    if (typeof navigator === 'undefined' || !navigator.clipboard) {
      throw new Error('clipboard unavailable')
    }
    await navigator.clipboard.writeText(text)
    copyState.value = 'ok'
  } catch (e) {
    // 剪贴板在非安全上下文 / 未授权时不可用：文案直接告诉用户手动选择，
    // 而不是静默失败（这是本地工具，选不中文本才是真正的死路）
    copyState.value = 'fail'
  }
}
</script>
