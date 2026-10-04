<template>
  <!--
    外层只做两件事：给面板一个定位参照、给浮层留出左右各一个间距单位的探出余量
    （面板比触发器宽，贴着视口边缘时才不会被挤出去）。
  -->
  <div ref="rootRef" class="datepicker-field" @keydown="handleKeydown" @focusout="handleFocusOut">
    <!--
      触发器是真实 button（不是 input + 图标）：它不接收文本，只负责开合；
      真 button 自带 Enter / Space 激活，不必自己模拟键盘。
      几何完全复用 .u-select-trigger（与 .u-input 逐值同高同内边距同圆角），
      所以同一个表单里它与其它输入框天然对齐成一条线。
    -->
    <button
      :id="id || undefined"
      ref="triggerRef"
      type="button"
      class="u-select-trigger"
      aria-haspopup="dialog"
      :aria-expanded="open ? 'true' : 'false'"
      :aria-label="ariaLabel"
      :disabled="disabled"
      @mousedown="handleTriggerMouseDown"
      @click="toggle"
    >
      <span class="datepicker-value" :class="{ 'datepicker-value--empty': !hasValue }">
        {{ hasValue ? selectedText : placeholder }}
      </span>
      <span class="u-select-arrow" aria-hidden="true"></span>
    </button>

    <!--
      面板用 v-if 而不是 v-show：关闭时不能有 42 个格子留在无障碍树与 Tab 序列里，
      「点击外部关闭」也要真的关掉，而不是只藏起来。
    -->
    <div
      v-if="open"
      class="u-datepicker datepicker-panel"
      role="dialog"
      aria-modal="false"
      :aria-label="ariaLabel"
    >
      <div class="u-datepicker-head">
        <button
          type="button"
          class="u-datepicker-nav"
          :disabled="prevDisabled"
          aria-label="上一月"
          @click="shiftMonth(-1)"
        >
          ‹
        </button>
        <span class="u-datepicker-title">{{ viewTitle }}</span>
        <button
          type="button"
          class="u-datepicker-nav"
          :disabled="nextDisabled"
          aria-label="下一月"
          @click="shiftMonth(1)"
        >
          ›
        </button>
      </div>

      <!--
        星期行刻意不给 aria-hidden：每个格子自带中文 aria-label，
        整块日历对读屏是一组可读的按钮，藏掉表头只会让人不知道列是什么。
      -->
      <div class="u-datepicker-weekdays">
        <span v-for="weekday in WEEKDAYS" :key="weekday" class="u-datepicker-weekday">
          {{ weekday }}
        </span>
      </div>

      <div class="u-datepicker-grid">
        <button
          v-for="(cell, index) in gridCells"
          :key="cell.iso"
          :ref="(el) => setCellRef(el, index)"
          type="button"
          class="u-datepicker-cell"
          :class="cellClass(cell)"
          :disabled="cell.disabled"
          :tabindex="index === cursorIndex ? 0 : -1"
          :aria-label="cell.ariaLabel"
          :aria-current="cell.isToday ? 'date' : undefined"
          :aria-selected="cell.isSelected ? 'true' : 'false'"
          @click="handlePick(cell)"
        >
          {{ cell.day }}
        </button>
      </div>

      <div class="datepicker-foot">
        <button type="button" class="datepicker-action" @click="handleToday">今天</button>
        <button v-if="clearable" type="button" class="datepicker-action" @click="handleClear">
          清除
        </button>
      </div>
    </div>
  </div>
</template>

<script>
/**
 * 日期选择器输入框（消费 ui-kit-data.css §11 的 .u-datepicker 样式契约）
 *
 * 为什么要有这个组件：原生 `<input type="date">` 的弹出日历由操作系统绘制，
 * 五套主题一个都管不到 —— 它是页面上唯一一块「换了主题也不变」的地方。
 *
 * ## 为什么是「普通 script + script setup」两个块
 *
 * 日期运算必须是**可单测的纯函数**，而 `<script setup>` 里不允许有 ESM 导出
 * （`vue/no-export-in-script-setup`）。普通 `<script>` 块与 `<script setup>`
 * 是同一个模块作用域，因此纯函数写在上面导出给 test/datePickerField.test.js，
 * setup 里的人直接用，不需要再 import 一次，也不必为此多开一个文件。
 *
 * ## 与 §11 样式的契约（下面几条看着可选，改了就坏）
 *
 * 1. `.u-datepicker` 自己就是**面板**，不是内联日历：它自带背景 / 描边 / 阴影 /
 *    `width: --datepicker-width`。因此它必须是定位容器，不能再套一层
 *    带同款描边与阴影的壳（会叠出双层边框与双份投影）。
 * 2. 星期行 `.u-datepicker-weekdays` 与网格 `.u-datepicker-grid` 用**同一套
 *    7 列栅格**（各 7 个直接子元素），列才对得齐。
 * 3. 「今天」的类名由本组件打上，颜色由样式分片决定：`--datepicker-today-marker`
 *    的值里带 `currentColor`，所以那两条声明必须成对生效（见 §11）。
 * 4. `.u-datepicker-cell` 的 `max-width` 是**上限**而不是固定宽：面板内宽只够
 *    ~35px/列，格子等比缩到列宽。窄屏继续由 §11 的 575 档收。
 *
 * ## 与页面表单的接口
 *
 * `v-model` 的值恒为 `'YYYY-MM-DD'` 或空串 —— 与 `<input type="date">` 的
 * `value` 完全同构，所以换掉原生控件时保存逻辑（`patch.birthday || null`）
 * 与 `toDateInput()` 一行都不用动。
 *
 * ## 时区
 *
 * 日期一律用 `new Date(y, m, d)`（本地时间）构造。**不要**写
 * `new Date('2026-10-01')`：那按 UTC 解析，UTC+8 里取到的是 9 月 30 日 16:00，
 * `.getDate()` 会得到 30 —— 整个日历错一格。
 */

// ── 纯函数（导出供 test/datePickerField.test.js 直接断言） ──────

/** 固定两位数，避免任何 padStart 散落在模板里 */
const pad2 = (value) => String(value).padStart(2, '0')

/**
 * 周起始日：**周一**。
 *
 * 理由：中文日历表头就是「一二三四五六日」，周末连在末尾；周一打头也与
 * 主流中文日历（含 Windows 中文区域）一致。改成周日只需把这里改成 0，
 * `WEEKDAY_LABELS` 与栅格算法都跟着走。
 */
export const WEEK_START = 1

/** 星期表头，顺序必须与 WEEK_START 对应 */
export const WEEKDAY_LABELS = ['一', '二', '三', '四', '五', '六', '日']

/**
 * 解析 `YYYY-MM-DD` → 本地零点的 Date。
 *
 * @returns {Date|null} 格式非法或日期不存在（如 2026-02-30）时返回 null，
 *   让调用方能区分「没值」与「值是坏的」，而不是悄悄拿到一个被归一化的错日期。
 */
export function parseIsoDate(value) {
  if (typeof value !== 'string') return null

  const matched = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (!matched) return null

  const year = Number(matched[1])
  const month = Number(matched[2]) - 1
  const day = Number(matched[3])
  const date = new Date(year, month, day)

  // 回读校验：2026-02-30 会被 Date 归一化成 3 月 2 日，这类输入必须判非法
  if (date.getFullYear() !== year || date.getMonth() !== month || date.getDate() !== day) return null
  return date
}

/** 年月日 → `YYYY-MM-DD`（本地时间；刻意不走 toISOString，那会先转成 UTC） */
export function formatIsoDate(year, month, day) {
  return `${String(year).padStart(4, '0')}-${pad2(month + 1)}-${pad2(day)}`
}

/** Date → `YYYY-MM-DD` */
export function toIsoDate(date) {
  return formatIsoDate(date.getFullYear(), date.getMonth(), date.getDate())
}

/** 在「年 + 月」上加减月份；跨年由 Date 自己进位（12 月 +1 → 次年 1 月） */
export function addMonths(year, month, delta) {
  const shifted = new Date(year, month + delta, 1)
  return { year: shifted.getFullYear(), month: shifted.getMonth() }
}

/** 某月天数：下个月第 0 天 = 本月最后一天，闰年由 Date 自己判 */
export function daysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate()
}

/**
 * 生成月份视图 —— **恒为 6 行 42 格**（含上 / 下月补位）。
 *
 * 为什么固定 42 格而不是按需 35 / 42：面板高度会随月份跳动，下方内容跟着
 * 上下抖，而且「切到 2 月面板突然变矮」看起来像是没渲染全。
 *
 * @param {number} year
 * @param {number} month 0 基
 * @param {number} [weekStartsOn] 0=周日 1=周一
 * @returns {{ iso: string, day: number, isOutside: boolean }[]} 恒 42 项
 */
export function getCalendarGrid(year, month, weekStartsOn = WEEK_START) {
  const firstWeekday = new Date(year, month, 1).getDay()
  // 本月 1 号距本行第一格的天数：0..6。取模写法对任意「星期几 × 周起始日」
  // 组合都成立，不必写 if / else 分支
  const lead = (firstWeekday - weekStartsOn + 7) % 7

  const cells = []
  for (let index = 0; index < 42; index += 1) {
    const date = new Date(year, month, 1 - lead + index)
    cells.push({
      iso: toIsoDate(date),
      day: date.getDate(),
      isOutside: date.getMonth() !== month || date.getFullYear() !== year,
    })
  }
  return cells
}

/** 日期是否落在 [min, max] 内。空串表示该侧不设限 */
export function isWithinRange(iso, min, max) {
  if (min && iso < min) return false
  if (max && iso > max) return false
  return true
}

/** 供 aria-label 用的中文日期：2026 年 10 月 01 日 */
export function formatChineseDate(iso) {
  const date = parseIsoDate(iso)
  if (!date) return iso
  return `${date.getFullYear()} 年 ${pad2(date.getMonth() + 1)} 月 ${pad2(date.getDate())} 日`
}

/** 供面板标题用的中文月份：2026 年 10 月 */
export function formatChineseMonth(year, month) {
  return `${year} 年 ${pad2(month + 1)} 月`
}
</script>

<script setup>
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'

// ── 组件 ────────────────────────────────────────────────────

const props = defineProps({
  /** `YYYY-MM-DD`，空串表示未选择 */
  modelValue: { type: String, default: '' },
  placeholder: { type: String, default: '请选择日期' },
  disabled: { type: Boolean, default: false },
  clearable: { type: Boolean, default: true },
  min: { type: String, default: '' },
  max: { type: String, default: '' },
  /**
   * 可访问名。刻意声明为**非必填**：`test/renderComponents.test.js` 会把
   * src 下所有 .vue 无 props 渲染一遍，必填 prop 在那里只会变成噪音警告，
   * 让「渲染期间无警告」这条断言失去信号。页面必须显式传（Profile.vue 传「生日」），
   * 它同时是触发器与面板的名字。
   */
  ariaLabel: { type: String, default: '请选择日期' },
  /** 可选：沿用调用方给的 id，便于锚点或外部脚本定位到触发器 */
  id: { type: String, default: '' },
})

const emit = defineEmits(['update:modelValue'])

const WEEKDAYS = WEEKDAY_LABELS

const rootRef = ref(null)
const triggerRef = ref(null)
/** 42 个格子的 DOM 引用，用来把键盘光标落到真实元素上 */
const cellRefs = ref([])
const setCellRef = (el, index) => {
  if (el) cellRefs.value[index] = el
}

const open = ref(false)
const viewYear = ref(new Date().getFullYear())
const viewMonth = ref(new Date().getMonth())
const cursorIndex = ref(0)

/**
 * 「今天」。用 ref 而不是一次性常量：生日是低频字段，页面可能开着一整天 ——
 * 常量会让跨过午夜后仍然标着昨天。每次打开面板刷新一次，代价只有一次取日期。
 */
const todayIso = ref(toIsoDate(new Date()))

const hasValue = computed(() => Boolean(parseIsoDate(props.modelValue)))
const selectedIso = computed(() => (hasValue.value ? props.modelValue : ''))
const selectedText = computed(() => formatChineseDate(selectedIso.value))
const viewTitle = computed(() => formatChineseMonth(viewYear.value, viewMonth.value))

/**
 * 42 个单元格要展示的全部信息。
 *
 * 「今天」与「选中」是两个独立布尔量（**可以同时为真**）—— 类名因此可能同时
 * 出现 `--today` 与 `--selected`，样式里也是这么约定的：选中用底色压过今天，
 * 今天标记的 `currentColor` 随之变成强调底色上的文字色。
 */
const gridCells = computed(() =>
  getCalendarGrid(viewYear.value, viewMonth.value).map((cell) => ({
    ...cell,
    isToday: cell.iso === todayIso.value,
    isSelected: Boolean(selectedIso.value) && cell.iso === selectedIso.value,
    disabled: !isWithinRange(cell.iso, props.min, props.max),
    ariaLabel: formatChineseDate(cell.iso),
  }))
)

/** 「今天」在本视图里的下标；不在（不该发生，恒 42 格）时为 -1 */
const todayIndex = computed(() => gridCells.value.findIndex((cell) => cell.iso === todayIso.value))

const cellClass = (cell) => ({
  'u-datepicker-cell--today': cell.isToday,
  'u-datepicker-cell--selected': cell.isSelected,
  'u-datepicker-cell--outside': cell.isOutside,
})

/**
 * 翻页按钮是否可点。
 *
 * 判据不是「整月越界」，而是**目标月的最后 / 第一天**是否已越过 min / max：
 * 越过了说明那个月一个可选的日期都没有，翻过去只会看到 42 个死格子。
 */
const prevDisabled = computed(() => {
  const target = addMonths(viewYear.value, viewMonth.value, -1)
  const lastDay = formatIsoDate(target.year, target.month, daysInMonth(target.year, target.month))
  return Boolean(props.min) && lastDay < props.min
})

const nextDisabled = computed(() => {
  const target = addMonths(viewYear.value, viewMonth.value, 1)
  return Boolean(props.max) && formatIsoDate(target.year, target.month, 1) > props.max
})

/** 把焦点落到键盘光标格，并保证它可见 */
const focusCursorCell = () => {
  const el = cellRefs.value[cursorIndex.value]
  if (!el || typeof el.focus !== 'function') return
  el.focus()
  if (typeof el.scrollIntoView !== 'function') return
  // 面板是 6 行定高，通常不会滚；保留是因为窄屏 / 放大字号后仍可能溢出 ——
  // 键盘移动后当前格必须可见，否则表现为「按了方向键没反应」
  el.scrollIntoView({ block: 'nearest', inline: 'nearest' })
}

/**
 * 把键盘光标重置到「选中日」，没有选中则落在「今天」。
 *
 * 为什么不沿用上次的光标：重新打开面板时用户最容易找的就是自己选过的那个日期，
 * 停在别处会让人以为「值没带上」。
 */
const resetCursor = () => {
  const selectedIndex = selectedIso.value
    ? gridCells.value.findIndex((cell) => cell.iso === selectedIso.value)
    : -1
  cursorIndex.value = selectedIndex >= 0 ? selectedIndex : Math.max(todayIndex.value, 0)
}

/** 只移动键盘光标（不选中、不关闭）：方向键的语义是「先走一圈看看」 */
const moveCursorTo = (iso) => {
  const index = gridCells.value.findIndex((cell) => cell.iso === iso)
  if (index >= 0) cursorIndex.value = index
}

/** 翻月：光标停在同一张视图里的「同一天」，跨月边界由 Date 进位 */
const shiftMonthKeepingDay = (delta) => {
  const cursor = gridCells.value[cursorIndex.value]
  const base = (cursor && parseIsoDate(cursor.iso)) || new Date(viewYear.value, viewMonth.value, 1)
  const target = addMonths(base.getFullYear(), base.getMonth(), delta)
  const day = Math.min(base.getDate(), daysInMonth(target.year, target.month))

  viewYear.value = target.year
  viewMonth.value = target.month
  moveCursorTo(formatIsoDate(target.year, target.month, day))
}

/**
 * 面板头部的 ‹ › 按钮：只翻月，光标落到同一个日期数上（31 日翻到只有 30 天的
 * 月份时收到 30 日，靠 daysInMonth 取小值 —— 直接写 31 会溢出到下个月）。
 *
 * 日期数取**视图月份**的锚点（1 号）而不是光标所在的格子：光标可能停在补位格
 * （上 / 下月的日期）上，那会以补位格的日期数当锚点，翻月后落点看着像是随机跳的。
 */
const shiftMonth = (delta) => {
  const cursor = gridCells.value[cursorIndex.value]
  const anchor = cursor && !cursor.isOutside ? cursor.day : 1
  const target = addMonths(viewYear.value, viewMonth.value, delta)
  const nextDay = Math.min(anchor, daysInMonth(target.year, target.month))

  viewYear.value = target.year
  viewMonth.value = target.month
  moveCursorTo(formatIsoDate(target.year, target.month, nextDay))
}

const openPanel = () => {
  // 打开时刷新「今天」：页面可能挂着过了一夜，标记与「今天」按钮都要跟上
  todayIso.value = toIsoDate(new Date())

  // 每次打开都从「当前值 / 今天」出发，不沿用上次翻到的月份
  const base = parseIsoDate(selectedIso.value) || parseIsoDate(todayIso.value) || new Date()
  viewYear.value = base.getFullYear()
  viewMonth.value = base.getMonth()
  open.value = true
  resetCursor()
}

/** 关闭并归还焦点。由 focusout 触发的关闭不归还 —— 焦点已经去了别处，抢回来是错的 */
const close = ({ restoreFocus = false } = {}) => {
  if (!open.value) return
  open.value = false
  if (!restoreFocus) return
  nextTick(() => {
    const trigger = triggerRef.value
    if (trigger && typeof trigger.focus === 'function') trigger.focus()
  })
}

const toggle = () => {
  if (props.disabled) return
  if (open.value) close({ restoreFocus: true })
  else openPanel()
}

const selectIso = (iso) => {
  emit('update:modelValue', iso)
  close({ restoreFocus: true })
}

const handlePick = (cell) => {
  if (cell.disabled) return
  selectIso(cell.iso)
}

const handleToday = () => {
  const index = todayIndex.value
  if (index >= 0) cursorIndex.value = index

  // 今天越界（被 min / max 排除）时只把光标带过去，不写入非法值
  if (isWithinRange(todayIso.value, props.min, props.max)) selectIso(todayIso.value)
  else focusCursorCell()
}

const handleClear = () => {
  // 清成空串（不是 null）：与 <input type="date"> 清空后的 value 同构，
  // isDirty 的比较与 `patch.birthday = form.birthday || null` 都依赖这一点
  emit('update:modelValue', '')
  close({ restoreFocus: true })
}

/** 只移动焦点，不提交 —— 提交仍由 Enter / Space 触发的 click 完成 */
const handleKeydown = (event) => {
  if (!open.value) return

  const cell = gridCells.value[cursorIndex.value]
  const date = cell ? parseIsoDate(cell.iso) : null
  if (!date) return

  if (event.key === 'Escape') {
    event.preventDefault()
    close({ restoreFocus: true })
    return
  }

  // Tab 关面板：把 42 个格子留在 Tab 序列里，意味着要按 42 次才能走出这个字段
  if (event.key === 'Tab') {
    close()
    return
  }

  /** 按天移动。目标格不在当前 42 格内就不动（6 周视图覆盖前后各一个月） */
  const step = (days) => {
    const next = toIsoDate(new Date(date.getFullYear(), date.getMonth(), date.getDate() + days))
    if (gridCells.value.some((item) => item.iso === next)) moveCursorTo(next)
  }

  const handlers = {
    ArrowLeft: () => step(-1),
    ArrowRight: () => step(1),
    ArrowUp: () => step(-7),
    ArrowDown: () => step(7),
    // 行首 / 行尾：一行的第一格就是周起始日（周一）
    Home: () => step(-(cursorIndex.value % 7)),
    End: () => step(6 - (cursorIndex.value % 7)),
    PageUp: () => shiftMonthKeepingDay(-1),
    PageDown: () => shiftMonthKeepingDay(1),
  }

  const handler = handlers[event.key]
  if (!handler) return
  event.preventDefault()
  handler()
}

/**
 * 点击外部关闭：用**捕获阶段**的 pointerdown。
 *
 * 不用 click：click 要等 pointerup，落点可能已经被别处的重渲染换掉；
 * 捕获阶段又先于任何 stopPropagation 的处理函数，落点判定最准。
 */
const handleDocumentPointerDown = (event) => {
  if (!open.value) return
  const root = rootRef.value
  if (!root || root.contains(event.target)) return
  close()
}

/**
 * 触发器上按下时**拦掉默认的取焦行为**。
 *
 * 不这么做会有个真实缺陷：面板开着、焦点已在触发器上，再点触发器时浏览器不会
 * 触发 focusout（焦点没变），但若焦点在别处（例如刚从面板的格子上移开），
 * focusout 会先到、click 后到 —— 结果是「关掉又被同一次点击打开」。
 * 拦掉取焦后焦点变化不再发生，开合只由 click 这一条路径决定。
 * 键盘交互不受影响（button 的 Enter / Space 由 click 触发）。
 */
const handleTriggerMouseDown = (event) => {
  if (typeof event.preventDefault === 'function') event.preventDefault()
}

/**
 * 焦点离开组件即关闭：点外部、Tab 出去、切窗口都会走到这里，
 * 比「只监听 Tab」更稳（relatedTarget 为 null 表示焦点去了浏览器 chrome）。
 */
const handleFocusOut = (event) => {
  if (!open.value) return
  const root = rootRef.value
  const next = event.relatedTarget
  if (root && next && root.contains(next)) return
  close()
}

/**
 * 打开后落焦点。
 *
 * `flush: 'post'` 是关键：面板是 v-if 出来的 42 个格子，默认 watch 在 DOM
 * 更新前就跑，那时 cellRefs 还是空的，焦点会掉回 body。
 */
watch(
  open,
  (isOpen) => {
    if (isOpen) focusCursorCell()
  },
  { flush: 'post' }
)

// 键盘光标换格后把焦点跟过去（点「今天」、点 ‹ ›、按方向键都走这条）
watch(cursorIndex, () => {
  if (open.value) focusCursorCell()
})

// 面板开着时被父组件禁用：立刻收起来，不能留一个点不动的浮层
watch(
  () => props.disabled,
  (isDisabled) => {
    if (isDisabled) close()
  }
)

if (typeof document !== 'undefined' && typeof document.addEventListener === 'function') {
  document.addEventListener('pointerdown', handleDocumentPointerDown, true)
}

onBeforeUnmount(() => {
  if (typeof document !== 'undefined' && typeof document.removeEventListener === 'function') {
    document.removeEventListener('pointerdown', handleDocumentPointerDown, true)
  }
})
</script>

<style scoped>
/*
 * 本组件只写「套件没有的那部分」：
 *   · 触发器几何 → 复用 global.css 的 .u-select-trigger（与 .u-input 逐值同形）
 *   · 面板本体   → §11 的 .u-datepicker 全套
 * 这里只补定位、宽度收敛、被省略的日期文字、底部动作行与窄屏收敛。
 * 颜色与尺寸一律走令牌，不写死值。
 */

.datepicker-field {
  position: relative;
  width: 100%;
  /* 面板比触发器宽，左右各让出一个间距单位，贴边时才不会被视口挤出去 */
  margin-inline: calc(var(--space-unit) * -1);
  padding-inline: var(--space-unit);
}

/* 未选日期用占位色，有值时是正文色 —— 与 .u-input::placeholder 同一套观感 */
.datepicker-value {
  overflow: hidden;
  color: var(--text-primary);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.datepicker-value--empty {
  color: var(--placeholder);
}

/*
 * 定位写在这里而不是样式的 .u-datepicker 上：那个类还要能当**内联日历**用
 * （只读展示场景，README 的标记契约里写了 `aria-readonly`），把 absolute
 * 写死进去会毁掉它的第二种用法。
 *
 * width 用 100% 而不是 --datepicker-width：面板的横向位置由触发器决定，
 * 宽度跟随字段是表单里最自然的形态；--datepicker-width 仍是兜底上限。
 */
.datepicker-panel {
  position: absolute;
  top: calc(100% + var(--dropdown-offset));
  left: 0;
  z-index: 20;
  width: 100%;
  max-width: 100%;
  /* 圆角靠裁剪表达，不必回样式分片给 .u-datepicker 补 overflow */
  overflow: hidden;
  animation: enterUp var(--enter-duration) var(--enter-ease) both;
}

/*
 * 「今天 / 清除」在样式的类名表里没有，属于本组件独有的结构。
 * 竖条与悬停写法对齐下拉项：常态保留等宽透明竖条，悬停只换色、文字不位移。
 */
.datepicker-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: calc(var(--space-unit) * 0.5);
  margin-top: var(--datepicker-cell-radius);
  padding-top: calc(var(--space-unit) * 0.5);
  border-top: var(--stroke-width) solid var(--divider);
}

.datepicker-action {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: 1;
  height: var(--dropdown-item-height);
  padding: 0 calc(var(--space-unit) * 0.75);
  font-family: var(--font-body);
  font-size: var(--datepicker-font-size);
  color: var(--text-secondary);
  border-left: var(--dropdown-active-bar) solid transparent;
  border-radius: var(--datepicker-cell-radius);
  cursor: pointer;
  transition:
    background-color var(--transition-interactive),
    border-color var(--transition-interactive),
    color var(--transition-interactive);
}

.datepicker-action:hover {
  color: var(--accent);
  background: var(--bg-soft);
}

.datepicker-action:focus-visible {
  box-shadow: var(--focus-ring);
  outline: none;
}

.datepicker-action:active {
  transform: scale(var(--active-scale));
}

/* 窄屏：面板与字段左右对齐（不再向外探出），日期尺寸由 §11 的 575 档继续收 */
@media (max-width: 767px) {
  .datepicker-panel {
    right: 0;
  }

  .datepicker-field {
    margin-inline: 0;
    padding-inline: 0;
  }
}
</style>
