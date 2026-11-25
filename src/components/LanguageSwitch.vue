<template>
  <div
    ref="root"
    class="lang-switch"
    :class="[`lang-switch--${variant}`, { 'is-open': open }]"
    @keydown.esc.stop="closeMenu(true)"
    @focusout="onFocusOut"
  >
    <!--
      抽屉版（4.19.0）：从「两枚大胶囊」改成「一列语言行 + 一条反馈入口」。
      理由：
      - 胶囊在两种语言时刚好，第三种语言就开始挤压（加一种就掉一行），
        而语言是只会增加、不会减少的清单 —— 行式列表天然可加，不重排版面；
      - 行的右侧留一个「勾」作为选中标记（WCAG 1.4.1：不只靠颜色）；
      - 底部给「没有你的语言 / 翻译读着别扭」一个出口，直接带到客服中心的
        语言反馈模式（/support?topic=language），不让人自己找路径。
    -->
    <template v-if="variant === 'drawer'">
      <span class="lang-drawer-label">{{ t('language.label') }}</span>
      <div class="lang-rows" role="radiogroup" :aria-label="t('a11y.languageMenu')">
        <button
          v-for="item in options"
          :key="item.code"
          type="button"
          role="radio"
          class="lang-row"
          :class="{ 'is-active': current === item.code }"
          :aria-checked="current === item.code"
          @click="choose(item.code)"
        >
          <span class="lang-row-label">{{ item.label }}</span>
          <AppIcon
            v-if="current === item.code"
            class="lang-row-check"
            name="check-circle"
            aria-hidden="true"
          />
        </button>
      </div>

      <router-link class="lang-feedback" :to="{ path: '/support', query: { topic: 'language' } }">
        <span class="lang-feedback-text">
          <strong class="lang-feedback-title">{{ t('language.feedbackTitle') }}</strong>
          <span class="lang-feedback-desc">{{ t('language.feedbackDesc') }}</span>
        </span>
        <span class="lang-feedback-cta">
          {{ t('language.feedbackCta') }}
          <AppIcon name="chevron-right" aria-hidden="true" />
        </span>
      </router-link>
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
 * - `drawer`：移动端抽屉里的分段控件，一眼看到全部选项。
 *
 * 无障碍要点：触发按钮有 `aria-haspopup` / `aria-expanded`；
 * 菜单项用 `menuitemradio` + `aria-checked`（这是单选，不是多选）；
 * 当前项除了颜色还有圆点指示（WCAG 1.4.1：不能只靠颜色）。
 */
import { computed, onBeforeUnmount, onMounted, ref, nextTick } from 'vue'
import { useI18n } from 'vue-i18n'
import { SUPPORTED_LOCALES, getLocale, setLocale } from '@/i18n/index.js'
import AppIcon from './AppIcon.vue'

const props = defineProps({
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
    nextTick(() => menu.value?.querySelector('button')?.focus({ preventScroll: true }))
  }
}

function closeMenu(restoreFocus = false) {
  if (!open.value) return
  open.value = false
  if (restoreFocus) trigger.value?.focus({ preventScroll: true })
}

function choose(code) {
  setLocale(code)
  closeMenu(props.variant === 'inline')
}

function onPointerDown(event) {
  if (!root.value?.contains(event.target)) closeMenu()
}

function onFocusOut(event) {
  if (root.value?.contains(event.relatedTarget)) return
  closeMenu()
}

onMounted(() => {
  if (props.variant !== 'inline') return
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

/* 抽屉形态（4.19.0）：语言行 + 反馈入口 */
.lang-switch--drawer {
  flex-direction: column;
  align-items: stretch;
  gap: calc(var(--space-unit) * 1);
  width: 100%;
}

.lang-drawer-label {
  color: var(--text-secondary);
  font-size: var(--fs-sm);
}

/* 语言行：一行一种语言，右侧勾 = 当前选中。行高 44 起，多语言时只增行数不改排版 */
.lang-rows {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.lang-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: calc(var(--space-unit) * 1.5);
  width: 100%;
  min-height: var(--ec-control-h-md);
  padding: 0 calc(var(--space-unit) * 1.5);
  border: 0;
  border-radius: var(--ec-radius-md);
  background: transparent;
  color: var(--text-primary);
  font: inherit;
  font-size: var(--fs-sm);
  text-align: left;
  cursor: pointer;
  transition:
    background var(--transition-interactive),
    color var(--transition-interactive);
}

.lang-row:hover,
.lang-row:focus-visible {
  background: var(--bg-soft);
}

.lang-row.is-active {
  color: var(--accent);
  font-weight: var(--fw-label);
  background: var(--accent-soft);
}

.lang-row-check {
  flex: none;
  font-size: calc(var(--icon-btn-icon-size) * 0.8);
}

/* 反馈入口：与语言行同宽的一条描边行，文字两行、右侧一个动作 */
.lang-feedback {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: calc(var(--space-unit) * 1.5);
  margin-top: calc(var(--space-unit) * 0.5);
  padding: calc(var(--space-unit) * 1.25) calc(var(--space-unit) * 1.5);
  border: 1px solid var(--border);
  border-radius: var(--ec-radius-lg);
  background: var(--bg-surface);
  text-decoration: none;
  transition:
    border-color var(--transition-interactive),
    background var(--transition-interactive);
}

.lang-feedback:hover,
.lang-feedback:focus-visible {
  border-color: var(--accent);
  background: var(--bg-soft);
}

.lang-feedback-text {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.lang-feedback-title {
  font-size: var(--fs-label);
  font-weight: var(--fw-heading);
  color: var(--text-primary);
}

.lang-feedback-desc {
  font-size: var(--fs-label);
  line-height: var(--leading-body);
  color: var(--text-muted);
}

.lang-feedback-cta {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  flex: none;
  font-size: var(--fs-label);
  font-weight: var(--fw-label);
  color: var(--accent);
  white-space: nowrap;
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
