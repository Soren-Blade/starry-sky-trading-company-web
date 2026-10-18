<template>
  <ToolPageShell :title="PAGE.title" :eyebrow="PAGE.eyebrow" :description="PAGE.description" :icon="PAGE.icon" :requires-card="PAGE.requiresCard">
    <section class="ui-card tool-panel">
      <h2 class="tool-panel-title"><AppIcon name="clock" aria-hidden="true" /><span>{{ PAGE.inputTitle }}</span></h2>
      <div class="u-field">
        <label class="u-field-label" for="cron-expr">{{ PAGE.sourceLabel }}</label>
        <input id="cron-expr" v-model="expression" class="u-input" :placeholder="PAGE.sourcePlaceholder" spellcheck="false" autocomplete="off" />
        <p class="u-field-hint">5 段（分 时 日 月 周）或 6 段（秒 分 时 日 月 周）；支持 <code>*</code>、<code>*/n</code>、<code>a-b</code>、<code>a,b</code>。</p>
      </div>
      <div class="cron-presets">
        <button v-for="preset in PRESETS" :key="preset.expr" type="button" class="u-btn-secondary cron-preset" @click="applyPreset(preset.expr)">{{ preset.label }}</button>
      </div>
      <div class="tool-actions">
        <button type="button" class="u-btn-primary" :disabled="!expression.trim()" @click="parse">{{ PAGE.submit }}</button>
        <button type="button" class="u-btn-secondary" @click="clear">{{ PAGE.reset }}</button>
      </div>
    </section>

    <section v-if="error" class="ui-card tool-panel">
      <h2 class="tool-panel-title"><AppIcon name="alert-triangle" aria-hidden="true" /><span>表达式有误</span></h2>
      <p class="cron-error" role="alert">{{ error }}</p>
    </section>

    <section v-else-if="parsed" class="ui-card tool-panel">
      <h2 class="tool-panel-title"><AppIcon name="check-circle" aria-hidden="true" /><span>{{ PAGE.resultTitle }}</span></h2>
      <p class="cron-desc">{{ parsed.description }}</p>
      <dl class="cron-fields">
        <div v-for="field in parsed.fields" :key="field.label" class="cron-field">
          <dt>{{ field.label }}</dt>
          <dd>{{ field.text }}</dd>
        </div>
      </dl>
      <h3 class="cron-next-title">接下来 {{ runs.length }} 次执行</h3>
      <ol class="cron-runs">
        <li v-for="(run, index) in runs" :key="run">{{ run }}<span v-if="index === 0" class="cron-next-badge">下一次</span></li>
      </ol>
      <p class="tool-result-note">按浏览器本地时区计算；6 段表达式以秒为最小步长，这里只展示到分钟。</p>
    </section>

    <template #aside>
      <section class="ui-card tool-aside-card">
        <h3 class="tool-aside-title"><AppIcon name="info" /> {{ TOOL_PAGE.usageTitle }}</h3>
        <ul class="tool-aside-list"><li v-for="item in PAGE.asideItems" :key="item">{{ item }}</li></ul>
      </section>
      <section class="ui-card tool-aside-card">
        <h3 class="tool-aside-title"><AppIcon name="alert-triangle" /> {{ TOOL_PAGE.noticeTitle }}</h3>
        <p class="tool-aside-note">解析全部在本地完成，表达式不会上传；服务器上真实的定时任务未必与本地时区一致。</p>
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
import { CRON_PRESETS, parseCron } from '@/utils/cron.js'

const PAGE = TOOL_PAGES['/dev/cron']
const usage = useToolUsage('/dev/cron', { mode: 'C' })

const PRESETS = CRON_PRESETS

const expression = ref('* * * * *')
const error = ref('')
const parsed = ref(null)

const runs = computed(() => (parsed.value ? parsed.value.runs : []))

function parse() {
  error.value = ''
  parsed.value = null
  const source = expression.value.trim()
  if (!source) return

  // 解析全在本地完成，不上传表达式；只记「谁在什么时候解析了、成没成、几段式」
  const startedAt = performance.now()
  const fieldCount = source.replace(/\s+/g, ' ').split(' ').length

  try {
    parsed.value = parseCron(source)
    usage.record({
      durationMs: performance.now() - startedAt,
      meta: { fields: fieldCount, presets: PRESETS.some((item) => item.expr === source) },
    })
  } catch (e) {
    error.value = e.message
    usage.record({
      ok: false,
      errorCode: 'CRON_INVALID_EXPRESSION',
      durationMs: performance.now() - startedAt,
      meta: { fields: fieldCount },
    })
  }
}

function applyPreset(expr) {
  expression.value = expr
  parse()
}

function clear() {
  expression.value = '* * * * *'
  error.value = ''
  parsed.value = null
}
</script>

<style scoped>
.cron-presets { display: flex; flex-wrap: wrap; gap: calc(var(--space-unit)); margin-top: calc(var(--space-unit)); }
.cron-preset { font-size: var(--fs-label); }
.cron-error { margin: 0; color: var(--danger); font-size: var(--fs-sm); }
.cron-desc { margin: 0 0 calc(var(--space-unit) * 2); font-size: var(--fs-body); color: var(--text-primary); }
.cron-fields { display: grid; grid-template-columns: repeat(auto-fill, minmax(120px, 1fr)); gap: calc(var(--space-unit) * 1.5); margin: 0 0 calc(var(--space-unit) * 2); }
.cron-field dt { font-size: var(--fs-label); color: var(--text-muted); margin-bottom: calc(var(--space-unit) * 0.25); }
.cron-field dd { margin: 0; font-size: var(--fs-sm); color: var(--text-primary); word-break: break-word; }
.cron-next-title { margin: 0 0 calc(var(--space-unit)); font-size: var(--fs-sm); font-weight: var(--fw-heading); color: var(--text-secondary); }
.cron-runs { margin: 0; padding-left: calc(var(--space-unit) * 4); color: var(--text-secondary); font-size: var(--fs-sm); }
.cron-runs li { margin: calc(var(--space-unit) * 0.5) 0; }
.cron-next-badge { margin-left: calc(var(--space-unit)); padding: 0 calc(var(--space-unit) * 0.75); border-radius: var(--radius-pill); background: var(--accent-soft); color: var(--accent); font-size: var(--fs-label); }
</style>
