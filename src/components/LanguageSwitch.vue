<template>
  <div
    ref="root"
    class="lang-switch"
    :class="[`lang-switch--${variant}`, { 'is-open': open }]"
    @keydown.esc.stop="closeMenu(true)"
    @focusout="onFocusOut"
  >
    <!--
      抽屉版（4.21.0）：单选下拉。触发按钮显示当前语言的**全名**，点开在下方
      浮出一张单选面板（`role="listbox"` + `role="option"` + 勾）。

      为什么从 4.20.0 的分段控件改回「下拉」：
      - 分段控件把选项摊在行里，两门语言刚好，第三门就开始挤（右半区约 150px）；
        下拉只占一个触发器的宽度，语言涨到五门也不用改版式；
      - 它与左侧「明暗模式」的三档开关仍是同一套「左标签 + 右控件」结构，
        但两枚短码并排会让人以为是开关（switch），而语言是「从一列里挑一个」。
    -->
    <template v-if="variant === 'drawer'">
      <div class="lang-select">
        <button
          ref="trigger"
          type="button"
          class="lang-select-trigger"
          :aria-expanded="open"
          aria-haspopup="listbox"
          :aria-label="triggerLabel"
          @click="toggleMenu"
        >
          <span class="lang-select-value">{{ currentLabel }}</span>
          <AppIcon class="lang-select-caret" name="chevron-down" aria-hidden="true" />
        </button>

        <Transition name="lang-pop">
          <ul
            v-if="open"
            ref="menu"
            class="lang-picker"
            role="listbox"
            :aria-label="t('a11y.languageMenu')"
            @keydown.down.prevent="moveActive(1)"
            @keydown.up.prevent="moveActive(-1)"
            @keydown.home.prevent="focusItem(0)"
            @keydown.end.prevent="focusItem(-1)"
          >
            <li v-for="item in options" :key="item.code" role="none">
              <button
                type="button"
                role="option"
                class="lang-picker-item"
                :class="{ 'is-active': current === item.code }"
                :aria-selected="current === item.code"
                :aria-label="item.label"
                @click="choose(item.code)"
              >
                <span>{{ item.label }}</span>
                <AppIcon
                  v-if="current === item.code"
                  class="lang-picker-check"
                  name="check-circle"
                  aria-hidden="true"
                />
              </button>
            </li>
          </ul>
        </Transition>
      </div>
    </template>

    <!-- 顶栏版：一枚地球图标 + 当前语言缩写，点开是菜单 -->
    <template v-else>
      <button
        ref="trigger"
        type="button"
        class="u-icon-btn lang-trigger"
        :aria-label="triggerLabel"
        :title="triggerLabel"
        aria-haspopup="menu"
        :aria-expanded="open"
        @click="toggleMenu"
      >
        <AppIcon name="globe" />
        <span class="lang-code" aria-hidden="true">{{ currentShort }}</span>
      </button>

      <Transition name="lang-pop">
        <div v-if="open" ref="menu" class="lang-menu" role="menu" :aria-label="t('a11y.languageMenu')">
          <button
            v-for="item in options"
            :key="item.code"
            type="button"
            role="menuitemradio"
            :aria-checked="current === item.code"
            class="lang-option"
            @click="choose(item.code)"
          >
            <span>{{ item.label }}</span>
            <span v-if="current === item.code" class="lang-dot" aria-hidden="true"></span>
          </button>
        </div>
      </Transition>
    </template>
  </div>
</template>

<script setup>
/**
 * 语言切换
 *
 * 两个形态：
 * - `inline`：顶栏的一枚图标按钮，点开是 `role="menu"` 的弹出菜单；
 * - `drawer`：移动端抽屉里的**单选下拉**（`listbox` + `option` + 勾）。
 *
 * 无障碍要点：触发按钮有 `aria-haspopup` / `aria-expanded`；
 * 下拉项用 `role="option"` + `aria-selected`（这是单选，不是多选）；
 * 当前项除了颜色还有勾（WCAG 1.4.1：不能只靠颜色）；↑↓ / Home / End 在项间移动，Esc 收起并把焦点还给触发器。
 */
import { computed, onBeforeUnmount, onMounted, ref, nextTick } from 'vue'
import { useI18n } from 'vue-i18n'
import { SUPPORTED_LOCALES, getLocale, setLocale } from '@/i18n/index.js'
import AppIcon from './AppIcon.vue'

defineProps({
  variant: {
    type: String,
    default: 'inline',
    validator: (value) => ['inline', 'drawer'].includes(value),
  },
})

const { t, locale } = useI18n()
const open = ref(false)
const root = ref(null)
const trigger = ref(null)
const menu = ref(null)

const current = computed(() => locale.value || getLocale())
const currentShort = computed(
  () => SUPPORTED_LOCALES.find((item) => item.code === current.value)?.shortLabel || 'EN'
)
const currentLabel = computed(() =>
  current.value === 'zh-CN' ? t('language.zh') : t('language.en')
)
const triggerLabel = computed(() => t('language.current', { language: currentLabel.value }))

const options = computed(() =>
  SUPPORTED_LOCALES.map((item) => ({
    code: item.code,
    label: item.code === 'zh-CN' ? t('language.zh') : t('language.en'),
  }))
)

function toggleMenu() {
  open.value = !open.value
  if (open.value) {
    nextTick(() => {
      // 打开后焦点落在「当前项」上：下拉里用户最可能先确认现状，再改
      const items = menuItems()
      const currentIndex = options.value.findIndex((item) => item.code === current.value)
      const target = items[currentIndex] || items[0]
      target?.focus({ preventScroll: true })
    })
  }
}

/** 下拉里的可聚焦项（抽屉版的 option 与顶栏版的 menuitemradio 都能用） */
function menuItems() {
  return [...(menu.value?.querySelectorAll('button') || [])]
}

function focusItem(index) {
  const items = menuItems()
  if (!items.length) return
  const target = index < 0 ? items[items.length - 1] : items[index % items.length]
  target?.focus({ preventScroll: true })
}

/** ↑↓ 在选项间移动；焦点不在列表里时从当前项起跳 */
function moveActive(step) {
  const items = menuItems()
  if (!items.length) return
  const from = items.indexOf(document.activeElement)
  const start = from === -1 ? options.value.findIndex((item) => item.code === current.value) : from
  focusItem(start + step)
}

function closeMenu(restoreFocus = false) {
  if (!open.value) return
  open.value = false
  if (restoreFocus) trigger.value?.focus({ preventScroll: true })
}

function choose(code) {
  setLocale(code)
  // 两种形态都把焦点还给触发器：抽屉版的下拉一收起，焦点不能落在不存在的节点上
  closeMenu(true)
}

function onPointerDown(event) {
  if (!root.value?.contains(event.target)) closeMenu()
}

function onFocusOut(event) {
  if (root.value?.contains(event.relatedTarget)) return
  closeMenu()
}

onMounted(() => {
  // 顶栏版与抽屉版都需要「点外面收起」：抽屉里也不例外，点另一行应关掉下拉
  document.addEventListener('pointerdown', onPointerDown)
})

onBeforeUnmount(() => {
  document.removeEventListener('pointerdown', onPointerDown)
})
</script>

<style scoped>
.lang-switch {
  position: relative;
  display: flex;
  align-items: center;
  flex: 0 0 auto;
}

.lang-trigger {
  gap: 2px;
  padding-inline: 6px;
}

.lang-code {
  font-size: 10px;
  font-weight: var(--fw-heading);
  letter-spacing: 0.02em;
  line-height: 1;
}

.lang-menu {
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  z-index: var(--z-dropdown, 200);
  min-width: 176px;
  padding: calc(var(--space-unit) * 0.5) 0;
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  border-radius: var(--radius-input);
  box-shadow: var(--shadow-float);
}

.lang-option {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: calc(var(--space-unit) * 1.5);
  width: 100%;
  min-height: 44px;
  padding: 0 calc(var(--space-unit) * 2);
  border: 0;
  background: transparent;
  color: var(--text-primary);
  font: inherit;
  font-size: var(--fs-sm);
  text-align: left;
  cursor: pointer;
  transition: background var(--transition-interactive);
}

.lang-option:hover,
.lang-option:focus-visible {
  background: var(--bg-soft);
}

.lang-option[aria-checked='true'] {
  color: var(--accent);
  font-weight: var(--fw-label);
}

.lang-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: currentColor;
  flex: 0 0 auto;
}

/* 抽屉形态（4.21.0）：一枚「选择器」触发器 + 下方单选面板，标签由抽屉那一行提供 */
.lang-switch--drawer {
  flex: 0 0 auto;
}

.lang-select {
  position: relative;
  display: inline-flex;
}

/* 触发器：与同面板的三档外观开关同高（32）、同圆角，但它是「值 + 箭头」，
 * 读起来是「从一列里挑一个」，不会被误认成开关。 */
.lang-select-trigger {
  display: inline-flex;
  align-items: center;
  gap: calc(var(--space-unit) * 0.75);
  height: var(--ec-control-h-sm);
  padding: 0 calc(var(--space-unit) * 1.25);
  border: 1px solid var(--border);
  border-radius: var(--radius-pill);
  background: var(--bg-soft);
  color: var(--text-primary);
  font: inherit;
  font-size: var(--fs-label);
  font-weight: var(--fw-label);
  line-height: 1;
  cursor: pointer;
  transition:
    background var(--transition-interactive),
    border-color var(--transition-interactive);
}

.lang-select-trigger:hover,
.lang-select-trigger:focus-visible {
  border-color: var(--accent);
}

.lang-switch.is-open .lang-select-trigger {
  background: var(--ec-bg-surface);
  border-color: var(--accent);
}

.lang-select-caret {
  font-size: 12px;
  opacity: 0.6;
  transition: transform var(--transition-interactive);
}

.lang-switch.is-open .lang-select-caret {
  transform: rotate(180deg);
}

/* 单选面板：贴触发器下方、右对齐；2 项 80px，语言增加时向下长，不换版式 */
.lang-picker {
  position: absolute;
  top: calc(100% + calc(var(--space-unit) * 0.75));
  right: 0;
  z-index: var(--z-dropdown, 200);
  min-width: calc(var(--space-unit) * 17);
  margin: 0;
  padding: calc(var(--space-unit) * 0.5);
  list-style: none;
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  border-radius: var(--ec-radius-lg);
  box-shadow: var(--ec-shadow-lg);
}

.lang-picker-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: calc(var(--space-unit) * 1.5);
  width: 100%;
  min-height: var(--ec-control-h-sm);
  padding: 0 calc(var(--space-unit) * 1.25);
  border: 0;
  border-radius: var(--ec-radius-sm);
  background: transparent;
  color: var(--text-primary);
  font: inherit;
  font-size: var(--fs-sm);
  text-align: left;
  cursor: pointer;
  transition: background var(--transition-interactive);
}

.lang-picker-item:hover,
.lang-picker-item:focus-visible {
  background: var(--bg-soft);
}

.lang-picker-item.is-active {
  color: var(--accent);
  font-weight: var(--fw-label);
}

.lang-picker-check {
  font-size: 14px;
  flex: 0 0 auto;
}

.lang-pop-enter-active,
.lang-pop-leave-active {
  transition:
    opacity var(--transition-interactive),
    transform var(--transition-interactive);
}

.lang-pop-enter-from,
.lang-pop-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}

@media (prefers-reduced-motion: reduce) {
  .lang-pop-enter-active,
  .lang-pop-leave-active {
    transition: none;
  }
}
</style>
