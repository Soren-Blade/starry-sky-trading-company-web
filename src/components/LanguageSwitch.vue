<template>
  <div
    ref="root"
    class="lang-switch"
    :class="[`lang-switch--${variant}`, { 'is-open': open }]"
    @keydown.esc.stop="closeMenu(true)"
    @focusout="onFocusOut"
  >
    <!--
      抽屉版（4.20.0）：一列语言行改成「左标签 + 右分段」的偏好行控件，
      与同面板的「外观」一行同构：两行都是 [ 标签 ][ 控件 ]，眼睛只要认一次结构。

      为什么是短码（中文 / EN）而不是全名：
      - 这一行只有约 150px 的右半区，全名（简体中文 / English）在三种语言时就会换行，
        短码两枚 48px，加到第四种也还站得住；
      - 全名交给 `aria-label` 与顶栏的语言菜单，屏幕上不需要重复。

      反馈出口不在这里：抽屉底部有一条「语言或翻译有问题？」的脚注，
      链接带 `from`（当前界面语言），客服中心据此把正文骨架填好。
    -->
    <template v-if="variant === 'drawer'">
      <div class="lang-segments" role="radiogroup" :aria-label="t('a11y.languageMenu')">
        <button
          v-for="item in options"
          :key="item.code"
          type="button"
          role="radio"
          class="lang-segment"
          :class="{ 'is-active': current === item.code }"
          :aria-checked="current === item.code"
          :aria-label="item.label"
          @click="choose(item.code)"
        >
          {{ item.short }}
        </button>
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
    // 抽屉里的分段只放短码：右半区约 150px，全名在第三种语言时就会换行
    short: item.shortLabel || item.code,
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

/* 抽屉形态（4.20.0）：只输出一枚分段控件，标签由抽屉那一行提供 */
.lang-switch--drawer {
  flex: 0 0 auto;
}

/* 分段控件：与同面板的三档外观开关同高同圆角，两枚短码并排。
 * 选中态用实底 + 强调字色；未选中只有字色 —— 一深一浅就是「当前值」。 */
.lang-segments {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  padding: 2px;
  border-radius: var(--radius-pill);
  background: var(--bg-soft);
}

.lang-segment {
  min-width: calc(var(--space-unit) * 6);
  height: calc(var(--ec-control-h-sm) - 4px);
  padding: 0 calc(var(--space-unit) * 0.75);
  border: 0;
  border-radius: var(--radius-pill);
  background: transparent;
  color: var(--text-secondary);
  font: inherit;
  font-size: var(--fs-label);
  font-weight: var(--fw-label);
  line-height: 1;
  cursor: pointer;
  transition:
    background var(--transition-interactive),
    color var(--transition-interactive);
}

.lang-segment:hover,
.lang-segment:focus-visible {
  color: var(--text-primary);
}

.lang-segment.is-active {
  background: var(--ec-bg-surface);
  color: var(--accent);
  box-shadow: var(--ec-shadow-xs);
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
