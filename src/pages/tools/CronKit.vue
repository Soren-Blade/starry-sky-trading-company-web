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

const PAGE = TOOL_PAGES['/dev/cron']
const usage = useToolUsage('/dev/cron', { mode: 'C' })

const PRESETS = [
  { label: '每小时', expr: '0 * * * *' },
  { label: '每天 09:00', expr: '0 9 * * *' },
  { label: '每周一 09:00', expr: '0 9 * * 1' },
  { label: '每月 1 日 00:00', expr: '0 0 1 * *' },
]

const WEEKDAYS = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
const MONTHS = ['1 月', '2 月', '3 月', '4 月', '5 月', '6 月', '7 月', '8 月', '9 月', '10 月', '11 月', '12 月']

const FIELD_LIMITS = [
  { label: '分钟', min: 0, max: 59 },
  { label: '小时', min: 0, max: 23 },
  { label: '日', min: 1, max: 31 },
  { label: '月', min: 1, max: 12 },
  { label: '星期', min: 0, max: 7 },
]

const expression = ref('* * * * *')
const error = ref('')
const parsed = ref(null)

const runs = computed(() => (parsed.value ? parsed.value.runs : []))

/** 把一段字段展开成允许值的数组（支持星号、星号加步长、范围、列表）。 */
function expandField(source, limit) {
  const values = new Set()
  for (const part of source.split(',')) {
    const piece = part.trim()
    if (!piece) throw new Error('出现了空字段')

    const [range, stepText] = piece.split('/')
    if (piece.includes('/') && range === '') throw new Error(`“${piece}” 少了步长前的范围`)
    const step = stepText === undefined ? 1 : Number(stepText)
    if (!Number.isInteger(step) || step <= 0) throw new Error(`步长必须是正整数：“${piece}”`)

    let from = limit.min
    let to = limit.max
    if (range !== '*') {
      if (range.includes('-')) {
        const [a, b] = range.split('-').map(Number)
        if (!Number.isInteger(a) || !Number.isInteger(b)) throw new Error(`范围写法不对：“${piece}”`)
        from = a
        to = b
      } else {
        const single = Number(range)
        if (!Number.isInteger(single)) throw new Error(`不是数字：“${piece}”`)
        from = single
        to = stepText === undefined ? single : limit.max
      }
    }
    if (from < limit.min || to > limit.max) {
      throw new Error(`${limit.label}只能取 ${limit.min}-${limit.max}：“${piece}”`)
    }
    if (from > to) throw new Error(`范围起点大于终点：“${piece}”`)
    for (let value = from; value <= to; value += step) values.add(value)
  }
  return values
}

/** 中文可读描述：只覆盖最常见的几种形状，其余退回字段表。 */
function describe(fields, source) {
  const [minute, hour, dom, month, dow] = fields
  const everyMinute = minute.size === 60
  const everyHour = hour.size === 24
  const everyDom = dom.size === 31
  const everyMonth = month.size === 12
  const everyDow = dow.size === 7

  if (everyMinute && everyHour && everyDom && everyMonth && everyDow) return '每分钟执行一次'
  if (!everyMinute && everyHour && everyDom && everyMonth && everyDow) {
    return `每小时的第 ${[...minute].join('、')} 分钟执行`
  }
  if (!everyMinute && !everyHour && everyDom && everyMonth && everyDow) {
    const hh = [...hour].map((h) => String(h).padStart(2, '0'))
    const mm = [...minute].map((m) => String(m).padStart(2, '0'))
    return `每天 ${hh.map((h, i) => `${h}:${mm[i] ?? mm[0]}`).join('、')} 执行`
  }
  if (!everyMinute && !everyHour && everyDom && everyMonth && !everyDow) {
    const days = [...dow].map((d) => WEEKDAYS[d === 7 ? 0 : d]).join('、')
    return `每${days} ${[...hour].map((h) => String(h).padStart(2, '0')).join('、')}:${[...minute].map((m) => String(m).padStart(2, '0')).join('、')} 执行`
  }
  if (!everyMinute && !everyHour && !everyDom && everyMonth && everyDow) {
    return `每月 ${[...dom].join('、')} 日的 ${[...hour].map((h) => String(h).padStart(2, '0')).join('、')}:${[...minute].map((m) => String(m).padStart(2, '0')).join('、')} 执行`
  }
  if (!everyMonth) {
    return `${[...month].map((m) => MONTHS[m - 1]).join('、')}：${source}`
  }
  return `按表达式执行：${source}`
}

function fieldText(set, limit) {
  if (set.size === limit.max - limit.min + 1) return '每' + limit.label
  return [...set].sort((a, b) => a - b).join('、')
}

/**
 * 找出接下来的若干次执行时间。
 *
 * 逐分钟推进太慢（一年 52 万次），所以按「月 → 日 → 时 → 分」逐级跳过：
 * 当前字段不匹配时直接跳到下一个更大的时间单位，真实迭代次数通常只有几十次。
 */
function nextRuns(fields, count) {
  const [minute, hour, dom, month, dow] = fields
  const result = []
  const cursor = new Date()
  cursor.setSeconds(0, 0)
  cursor.setMinutes(cursor.getMinutes() + 1)

  const horizon = new Date(cursor)
  horizon.setFullYear(horizon.getFullYear() + 5)

  while (result.length < count && cursor <= horizon) {
    if (!month.has(cursor.getMonth() + 1)) {
      cursor.setDate(1)
      cursor.setHours(0, 0, 0, 0)
      cursor.setMonth(cursor.getMonth() + 1)
      continue
    }
    // 日与星期的组合语义与 Linux cron 一致：两者都受限时取并集
    const domOk = dom.has(cursor.getDate())
    const dowOk = dow.has(cursor.getDay())
    const dayOk = dom.size === 31 && dow.size === 7 ? true : dom.size === 31 ? dowOk : dow.size === 7 ? domOk : domOk || dowOk
    if (!dayOk) {
      cursor.setDate(cursor.getDate() + 1)
      cursor.setHours(0, 0, 0, 0)
      continue
    }
    if (!hour.has(cursor.getHours())) {
      cursor.setHours(cursor.getHours() + 1, 0, 0, 0)
      continue
    }
    if (!minute.has(cursor.getMinutes())) {
      cursor.setMinutes(cursor.getMinutes() + 1, 0, 0)
      continue
    }
    result.push(cursor.toLocaleString('zh-CN', { hour12: false }))
    cursor.setMinutes(cursor.getMinutes() + 1, 0, 0)
  }
  return result
}

function parse() {
  error.value = ''
  parsed.value = null
  const source = expression.value.trim().replace(/\s+/g, ' ')
  if (!source) return

  // 解析全在本地完成，不上传表达式；只记「谁在什么时候解析了、成没成、几段式」
  const startedAt = performance.now()
  const fieldCount = source.split(' ').length

  try {
    const parts = source.split(' ')
    if (parts.length !== 5 && parts.length !== 6) {
      throw new Error(`需要 5 段或 6 段，当前是 ${parts.length} 段`)
    }
    const fieldSources = parts.length === 6 ? parts.slice(1) : parts
    if (parts.length === 6) {
      const seconds = expandField(parts[0], { label: '秒', min: 0, max: 59 })
      if (seconds.size !== 1) throw new Error('秒字段目前只支持固定值（如 0）')
    }
    const fields = fieldSources.map((part, index) => expandField(part, FIELD_LIMITS[index]))

    // 星期 0 与 7 都是周日；`*` 会同时展开出两个值，这里并成一个，
    // 否则「每星期」的集合大小对不上，描述会退回成表达式原文。
    const weekdaySet = fields[4]
    if (weekdaySet.has(7)) {
      weekdaySet.delete(7)
      weekdaySet.add(0)
    }

    parsed.value = {
      fields: FIELD_LIMITS.map((limit, index) => ({
        label: limit.label,
        text: fieldText(fields[index], limit),
      })),
      description: describe(fields, source),
      runs: nextRuns(fields, 10),
    }
    if (!parsed.value.runs.length) throw new Error('这个表达式在 5 年内不会触发，检查日/月/星期的组合')

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
