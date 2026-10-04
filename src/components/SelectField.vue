<template>
  <!--
    根容器只做两件事：给面板当定位参照（`.u-select` 自带 position: relative）、
    承接调用方透传的 class / style（id 除外，理由见 rootAttrs）。
    面板与触发器都是它的直接子节点，因此不需要再套一层壳。
  -->
  <div ref="rootRef" class="u-select" v-bind="rootAttrs()" @keydown="handleKeydown">
    <!--
      触发器是真实 <button>：它不接收文本，只负责开合，因此 Enter / Space 的
      「激活」语义由浏览器原生给出，不必自己模拟键盘。
      几何（高度 / 内边距 / 圆角 / 字号）全部来自 .u-select-trigger，
      所以它与相邻的 .u-input 天然对齐成一条线。
    -->
    <button
      :id="attrs.id"
      ref="triggerRef"
      type="button"
      class="u-select-trigger"
      role="combobox"
      aria-haspopup="listbox"
      :aria-expanded="open ? 'true' : 'false'"
      :aria-controls="listboxId"
      :aria-label="ariaLabel || undefined"
      :aria-disabled="disabled ? 'true' : undefined"
      :disabled="disabled"
      @click="toggle"
    >
      <span class="select-value">
        <!-- icon 只是给文字做视觉标记，读屏念它反而是噪音 -->
        <span v-if="selectedOption && selectedOption.icon" aria-hidden="true">
          {{ selectedOption.icon }}
        </span>
        <span class="select-text" :class="{ 'select-text--empty': !selectedOption }">
          {{ selectedOption ? selectedOption.label : placeholder }}
        </span>
      </span>
      <span class="u-select-arrow" aria-hidden="true"></span>
    </button>

    <!--
      面板用 v-if 而不是 v-show：关闭时选项必须真的离开无障碍树与 Tab 序列
      （长列表留着的话，要按几十次 Tab 才能走出这个字段）。
    -->
    <div v-if="open" ref="panelRef" class="u-select-panel">
      <!-- 搜索框复用 .u-input（尺寸令牌已在基础层落地），.u-select-search 只负责留白 -->
      <div v-if="searchable" class="u-select-search">
        <input
          ref="searchRef"
          v-model="keyword"
          class="u-input"
          type="text"
          :placeholder="SEARCH_PLACEHOLDER"
          :aria-label="SEARCH_LABEL"
          :aria-controls="listboxId"
        />
      </div>

      <!-- 滚动发生在 .u-select-list 上（面板自身不滚），搜索框才能常驻在列表上方 -->
      <div
        :id="listboxId"
        ref="listRef"
        class="u-select-list"
        role="listbox"
        :aria-label="ariaLabel || undefined"
      >
        <template v-for="group in visibleGroups" :key="group.key">
          <p v-if="group.label" class="u-select-group">{{ group.label }}</p>
          <button
            v-for="option in group.options"
            :key="option.key"
            type="button"
            class="u-select-item"
            :class="{ 'u-select-item--active': isSelected(option) }"
            role="option"
            :aria-selected="isSelected(option) ? 'true' : 'false'"
            :disabled="option.disabled"
            @click="handleSelect(option)"
          >
            <span v-if="option.icon" aria-hidden="true">{{ option.icon }}</span>
            <span class="select-option-text">
              <template v-for="(part, index) in splitSelectHit(option.label, keyword)" :key="index">
                <mark v-if="part.hit" class="u-select-hit">{{ part.text }}</mark>
                <template v-else>{{ part.text }}</template>
              </template>
            </span>
          </button>
        </template>
      </div>

      <p v-if="visibleOptions.length === 0" class="u-select-empty">{{ EMPTY_TEXT }}</p>
    </div>
  </div>
</template>

<script>
/**
 * 下拉选择器（消费 ui-kit-form.css §1 的 .u-select* 样式契约）
 *
 * 为什么要有这个组件：应用里原本用原生 `<select class="u-input">`，它的弹出层
 * 由操作系统绘制 —— 五套主题一套都管不到，它是页面上唯一一块「换了主题也不变」
 * 的地方；而套件里那套完整的下拉样式（触发器 / 面板 / 选项 / 分组 / 搜索 / 空态 /
 * 命中高亮）此前零引用，样式打进了产物却没人看得见。
 *
 * ## 为什么是「普通 script + script setup」两个块
 *
 * 过滤与命中切片必须是**可单测的纯函数**，而 `<script setup>` 里不允许有 ESM 导出
 * （vue/no-export-in-script-setup）。两个块共享同一个模块作用域，因此纯函数写在上面
 * 导出给 test/selectField.test.js，setup 里的人直接用，不必为此多开一个文件。
 *
 * ## 与 §1 样式的契约（下面几条看着可选，改了就坏）
 *
 * 1. `.u-select` 是定位容器，`.u-select-panel` 自带 absolute + top + left + z-index
 *    与 min-width，因此面板**不要**再套一层带定位的壳。
 * 2. `.u-select-list` 是唯一的高度受限 + 可滚动区域：搜索框放在它**外面**，
 *    否则输入时搜索框会跟着列表一起滚走。
 * 3. `.u-select-item--active` 是「已选中」（行末有勾、左侧有竖条），不是「键盘高亮」；
 *    套件里唯一的键盘态是 `.u-select-item:focus-visible`。
 * 4. `.u-select-hit` 专门给 `<mark>` 用：它把 UA 默认的黄底黑字都改掉了，
 *    因此命中片段必须用 `<mark>`，不要换成别的元素。
 *
 * ## 键盘与焦点：为什么把真实焦点移进列表
 *
 * 套件没有「高亮但未聚焦」的类名（只有 :focus-visible），若自己维护一个虚拟高亮
 * 下标，方向键按下去会是一个**看不见的高亮**，等同于没反应。因此这里把真实焦点
 * 落到选项按钮上（它们本来就是 <button>），Enter / Space 由原生 click 提交。
 * 触发器上保留 role=combobox + aria-expanded / aria-controls / aria-haspopup，
 * 面板角色是 listbox、选项是 option + aria-selected，与 WAI-ARIA 的对应关系一致。
 */

// ── 纯函数（导出供 test/selectField.test.js 直接断言） ──────────

/**
 * 选项过滤：大小写不敏感的子串匹配，**只匹配 label**。
 *
 * 为什么只匹配 label：用户看得见并据此检索的是文字；value 往往是 id 或内部枚举
 * （'theme' / 'unused'），把 value 也纳入匹配会让「输入 a 却出现一屏看不出为什么
 * 命中的选项」。
 *
 * @param {Array<{label?: *}>} options
 * @param {string} keyword
 * @returns {Array} 命中项；恒为新数组，调用方改它不会污染 props
 */
export function filterSelectOptions(options, keyword) {
  const list = Array.isArray(options) ? options : []
  const needle = String(keyword ?? '').trim().toLowerCase()
  if (!needle) return list.slice()
  return list.filter((option) => String(option?.label ?? '').toLowerCase().includes(needle))
}

/**
 * 把 label 切成「命中 / 未命中」片段，供模板渲染 `<mark class="u-select-hit">`。
 *
 * 为什么要切片而不是只判真假：套件的高亮是行内元素（mark），只有拿到片段才能
 * 只给命中的那几个字上底色，而不是整条选项一起变色。
 *
 * @param {*} label
 * @param {string} keyword
 * @returns {{text: string, hit: boolean}[]} 至少一项；无关键字时是整段未命中
 */
export function splitSelectHit(label, keyword) {
  const text = String(label ?? '')
  const needle = String(keyword ?? '').trim()
  if (!needle) return [{ text, hit: false }]

  // 在**小写副本**上找位置，切的是原文 —— 否则高亮出来的字会被改成小写
  const haystack = text.toLowerCase()
  const lower = needle.toLowerCase()
  const parts = []
  let cursor = 0
  let at = haystack.indexOf(lower)

  while (at !== -1) {
    if (at > cursor) parts.push({ text: text.slice(cursor, at), hit: false })
    parts.push({ text: text.slice(at, at + needle.length), hit: true })
    cursor = at + needle.length
    at = haystack.indexOf(lower, cursor)
  }

  if (cursor < text.length) parts.push({ text: text.slice(cursor), hit: false })
  return parts.length > 0 ? parts : [{ text, hit: false }]
}

/**
 * 值比较。
 *
 * 为什么不用 `===`：原生 `<select>` 的 value 恒为字符串，所以工具选项的 value 是
 * `String(tool.id)`，而后端 id 可能是数字；调用方直接把数字塞进 modelValue 时，
 * 严格相等会让「已选中」判定失败，表现为触发器空白、选项里也没有勾。
 */
export function isSameSelectValue(a, b) {
  if (a === b) return true
  if (a === null || a === undefined || b === null || b === undefined) return false
  return String(a) === String(b)
}
</script>

<script setup>
import { computed, nextTick, onMounted, onUnmounted, ref, useAttrs, useId, watch } from 'vue'

/** 面板内的固定文案：这里没有第二处消费方，因此不进 constants */
const SEARCH_PLACEHOLDER = '输入关键字筛选'
const SEARCH_LABEL = '搜索选项'
const EMPTY_TEXT = '无匹配结果'

const props = defineProps({
  /** 当前值。空串 / null 表示未选择，触发器显示 placeholder */
  modelValue: { type: [String, Number], default: null },
  /** 扁平选项：`[{ value, label, icon?, disabled? }]`，与 groups 二选一 */
  options: { type: Array, default: () => [] },
  /** 分组选项：`[{ label, options: [...] }]`。非空时优先于 options */
  groups: { type: Array, default: () => [] },
  placeholder: { type: String, default: '请选择' },
  /** 开启后面板顶部出现搜索框，输入即过滤 */
  searchable: { type: Boolean, default: false },
  disabled: { type: Boolean, default: false },
  /**
   * 触发器的可访问名（下拉触发器是 button，没有它读屏只会念出当前值）。
   *
   * 刻意**不声明 required**：test/renderComponents.test.js 会把 src 下所有 .vue
   * 无 props 渲染一遍，必填 prop 在那里只会变成噪音警告，让「渲染期间无警告」
   * 这条断言失去信号。调用方必须显式传（语义上必填）。
   */
  ariaLabel: { type: String, default: '' },
})

const emit = defineEmits(['update:modelValue'])

defineOptions({ inheritAttrs: false })

const attrs = useAttrs()

/**
 * 根容器承接 id 之外的透传属性（含 class / style）。
 *
 * 为什么要把 id 摘出来：调用方用 `<label :for="…">` 关联本组件（ThemeSwitcher 的
 * 「字体族」就是），而 label 只能关联**可标注元素** —— div 不是，button 是。
 * id 落在容器上，点标签就不会聚焦 / 开合下拉，`for` 关联名存实亡。
 *
 * 为什么用普通函数而不是 computed：attrs 是运行时就地改写的对象，computed 会把它
 * 第一次的结果缓存住 —— 父组件换 id 后按钮上留的还是旧值。
 */
const rootAttrs = () => {
  const { id: _id, ...rest } = attrs
  return rest
}

const open = ref(false)
const keyword = ref('')
const rootRef = ref(null)
const triggerRef = ref(null)
const panelRef = ref(null)
const listRef = ref(null)
const searchRef = ref(null)

/** 面板 id 由 useId 生成：SSR 与客户端各渲染一次时也必须一致，不能用随机数 */
const listboxId = `${useId()}-listbox`

/** groups 优先于 options（API 约定二选一），两者都空时给一个空分组兜底 */
const normalizedGroups = computed(() => {
  const groups = Array.isArray(props.groups) ? props.groups : []
  if (groups.length > 0) {
    return groups.map((group) => ({
      label: group?.label ?? '',
      options: Array.isArray(group?.options) ? group.options : [],
    }))
  }
  return [{ label: '', options: Array.isArray(props.options) ? props.options : [] }]
})

/** 全部选项（未过滤）：只用来查「当前值对应哪一项」 */
const allOptions = computed(() => normalizedGroups.value.flatMap((group) => group.options))

/**
 * 已选中项。
 *
 * 用值查找而不是按下标：过滤只影响渲染列表，选中项必须始终能从**完整**列表里找回，
 * 否则「输入关键字筛掉当前项」会让触发器变空、像是值丢了。
 */
const selectedOption = computed(
  () => allOptions.value.find((option) => isSameSelectValue(option.value, props.modelValue)) || null
)

/**
 * 渲染用的分组（已过滤）。
 *
 * key 用下标而不是 value：后端数据不保证 value 唯一，重复 key 会让 Vue 复用错节点
 * （表现为勾跑到别的选项上）。
 */
const visibleGroups = computed(() =>
  normalizedGroups.value
    .map((group, groupIndex) => ({
      key: `group-${groupIndex}`,
      label: group.label,
      options: filterSelectOptions(group.options, keyword.value).map((option, optionIndex) => ({
        ...option,
        key: `option-${groupIndex}-${optionIndex}`,
      })),
    }))
    .filter((group) => group.options.length > 0)
)

/** 可见选项的扁平视图：空态判定与「Enter 选首个匹配」都要用它 */
const visibleOptions = computed(() => visibleGroups.value.flatMap((group) => group.options))

const isSelected = (option) => isSameSelectValue(option.value, props.modelValue)

/** 已选中项在**可见**列表里的下标；不在（被过滤掉 / 未选择）时为 -1 */
const selectedVisibleIndex = computed(() =>
  visibleOptions.value.findIndex((option) => isSelected(option))
)

// ── 焦点与键盘 ──────────────────────────────────────────────

/** 可见选项的 DOM（分组标题不是选项，不在其中；顺序即可见顺序） */
const optionNodes = () => {
  const list = listRef.value
  if (!list || typeof list.querySelectorAll !== 'function') return []
  return Array.from(list.querySelectorAll('.u-select-item'))
}

const focusTrigger = () => {
  const trigger = triggerRef.value
  if (trigger && typeof trigger.focus === 'function') trigger.focus()
}

/**
 * 从 from 出发按 delta 找下一个**可聚焦**的选项下标，找不到返回 -1。
 *
 * 必须跳过 disabled：`<button disabled>` 根本无法获得焦点，对它调 focus() 是空操作 ——
 * 不跳过的话，光标停在一条禁用项前面就再也走不动了（表现为「方向键按了没反应」）。
 */
const stepFocusable = (from, delta) => {
  const options = visibleOptions.value
  for (let cursor = from + delta; cursor >= 0 && cursor < options.length; cursor += delta) {
    if (!options[cursor]?.disabled) return cursor
  }
  return -1
}

/**
 * 焦点还没进列表时的落点。
 *
 * 优先落在当前选中项上：面板打开时已经滚到它那里，若第一次方向键就直接往下走一格，
 * 高亮会出现在**没有铺过底的**下一项上，看起来像是跳过了一项。选中项不可用
 * （被禁用或不可见）时，才按方向从对应的一端往里找第一个可用项。
 */
const anchorIndex = (delta) => {
  const options = visibleOptions.value
  const selected = selectedVisibleIndex.value
  if (selected >= 0 && !options[selected]?.disabled) return selected
  return stepFocusable(delta > 0 ? -1 : options.length, delta)
}

/**
 * 在可见选项之间移动焦点。
 *
 * 不循环：到头就停。焦点从末项跳回首项会让「已经到底了」这件事失去反馈，
 * 长列表里还会把面板猛地滚回顶部。
 */
const moveFocus = (delta) => {
  const nodes = optionNodes()
  if (nodes.length === 0) return

  const current = nodes.indexOf(document.activeElement)
  const at = current === -1 ? anchorIndex(delta) : stepFocusable(current, delta)
  if (at >= 0) nodes[at].focus()
}

const focusEdge = (which) => {
  const nodes = optionNodes()
  if (nodes.length === 0) return
  const at = which === 'first' ? stepFocusable(-1, 1) : stepFocusable(nodes.length, -1)
  if (at >= 0) nodes[at].focus()
}

/**
 * 打开面板并给出焦点。
 *
 * 必须等 nextTick：面板是 v-if 出来的，此刻 optionNodes() 还是空的，
 * 直接 focus 会静默失败（表现为「按了方向键什么都没发生」）。
 *
 * @param {'first'|'last'|'selected'} target 'selected' 时按 delta 决定兜底落在哪一端
 */
const openWithFocus = (target, delta = 1) => {
  openPanel()
  nextTick(() => {
    if (target === 'first') focusEdge('first')
    else if (target === 'last') focusEdge('last')
    else moveFocus(delta)
  })
}

/** 把当前选中项滚到可视区：面板高度受限，长列表里选中项可能在折叠线以下 */
const scrollSelectedIntoView = () => {
  const el = listRef.value?.querySelector?.('.u-select-item--active')
  if (el && typeof el.scrollIntoView === 'function') el.scrollIntoView({ block: 'nearest' })
}

const openPanel = () => {
  if (props.disabled) return
  open.value = true
  // 每次打开都从完整列表开始：上次的过滤词留着，会让人以为「选项变少了」
  keyword.value = ''
  nextTick(() => {
    // 搜索型下拉：焦点进搜索框，打开即可输入
    if (props.searchable) searchRef.value?.focus?.()
    scrollSelectedIntoView()
  })
}

/** 关闭面板。restoreFocus 只在「键盘主动关闭 / 选中」时为真：点外部关闭时抢焦点是错的 */
const closePanel = ({ restoreFocus = false } = {}) => {
  if (!open.value) return
  open.value = false
  keyword.value = ''
  if (restoreFocus) nextTick(focusTrigger)
}

const toggle = () => {
  // 原生 disabled 已经拦掉了 click，这里是双保险
  if (props.disabled) return
  if (open.value) closePanel({ restoreFocus: true })
  else openPanel()
}

const handleSelect = (option) => {
  if (!option || option.disabled) return
  emit('update:modelValue', option.value)
  closePanel({ restoreFocus: true })
}

const handleKeydown = (event) => {
  if (props.disabled) return
  const key = event.key

  if (key === 'Escape') {
    if (!open.value) return
    // 焦点可能还在搜索框里：Escape 的语义是「退出本组件」，一并交还触发器
    event.preventDefault()
    closePanel({ restoreFocus: true })
    return
  }

  if (key === 'Tab') {
    // Tab 的语义是「离开本组件」，面板必须收起来 —— 否则选项会一直挂在 Tab 序列里。
    // 这里不 preventDefault：让浏览器按默认顺序继续走。只有当焦点还在面板**内部**
    // （搜索框 / 选项）时才先把它按回触发器：面板一关那些元素就被移除，
    // 焦点会掉回 body，后续 Tab 会从文档开头重新数。
    if (open.value && panelRef.value?.contains?.(document.activeElement)) {
      event.preventDefault()
      closePanel()
      focusTrigger()
      return
    }
    closePanel()
    return
  }

  if (key === 'Enter') {
    // 触发器与选项上的 Enter / Space 由 <button> 原生触发 click，不必在这里模拟；
    // 只有搜索框需要补一条：Enter 选中首个匹配项（输入完直接回车是最顺手的路径）
    if (open.value && event.target === searchRef.value) {
      const first = visibleOptions.value.find((option) => !option.disabled)
      if (!first) return
      event.preventDefault()
      handleSelect(first)
    }
    return
  }

  if (key === 'ArrowDown' || key === 'ArrowUp') {
    event.preventDefault()
    const delta = key === 'ArrowDown' ? 1 : -1
    if (open.value) moveFocus(delta)
    else openWithFocus('selected', delta)
    return
  }

  if (key === 'Home' || key === 'End') {
    event.preventDefault()
    const which = key === 'Home' ? 'first' : 'last'
    if (open.value) focusEdge(which)
    else openWithFocus(which)
  }
}

// ── 点击外部关闭 ────────────────────────────────────────────

/**
 * 用**捕获阶段**的 pointerdown 而不是 click：click 要等 pointerup，落点可能已经被
 * 别处的重渲染换掉；捕获阶段又先于任何 stopPropagation 的处理函数，落点判定最准。
 *
 * 用 pointerdown 而不是 mousedown：触摸设备上同样会触发，不必再挂一套 touch 监听。
 */
const handleDocumentPointerDown = (event) => {
  if (!open.value) return
  const root = rootRef.value
  if (!root || root.contains(event.target)) return
  closePanel()
}

onMounted(() => {
  document.addEventListener('pointerdown', handleDocumentPointerDown, true)
})

onUnmounted(() => {
  document.removeEventListener('pointerdown', handleDocumentPointerDown, true)
})

// 面板开着时被父组件禁用：立刻收起来，不能留一个点不动的浮层
watch(
  () => props.disabled,
  (isDisabled) => {
    if (isDisabled) closePanel()
  }
)
</script>

<style scoped>
/*
 * 本组件只补套件没有的那部分 —— 触发器外壳、面板定位与宽度、箭头、选项 / 分组 /
 * 搜索 / 空态 / 命中高亮的外观全部由 §1 的 .u-select* 给出，这里一条都不重复。
 * 剩下三件事：
 *   1. 触发器内部「值 + 箭头」的排布（套件给的是 space-between，
 *      值那一侧还得自己成为一行 flex，图标与文字才会对齐）；
 *   2. 长文本省略（套件没写：超长工具名会在定高 36px 的选项里溢出到下一行）；
 *   3. 未选择时的占位色（与 .u-input::placeholder 同一套令牌）。
 */

.select-value {
  display: flex;
  align-items: center;
  gap: calc(var(--space-unit) * 0.75);
  min-width: 0;
}

/* flex 子项默认 min-width: auto：不给 0 的话盒子会被文字撑开，省略号永远不出现 */
.select-text,
.select-option-text {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.select-text--empty {
  color: var(--placeholder);
}
</style>
