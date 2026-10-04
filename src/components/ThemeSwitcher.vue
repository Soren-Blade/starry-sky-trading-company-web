<template>
  <div class="theme-switcher">
    <!-- 导航栏右侧的图标按钮 -->
    <button
      type="button"
      class="theme-trigger"
      :class="{ active: themeStore.panelOpen }"
      :aria-label="THEME_PANEL.trigger"
      :aria-expanded="themeStore.panelOpen"
      aria-haspopup="dialog"
      @click="themeStore.togglePanel()"
    >
      <span class="theme-trigger-icon" aria-hidden="true">🎨</span>
      <span class="theme-trigger-dot" aria-hidden="true"></span>
    </button>

    <Teleport v-if="themeStore.panelOpen" to="body">
      <div class="theme-overlay" @click.self="close">
        <div
          ref="modalRef"
          class="theme-modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby="theme-modal-title"
        >
          <h2 id="theme-modal-title" class="visually-hidden">{{ THEME_PANEL.title }}</h2>

          <header class="theme-modal-head">
            <div class="theme-modal-heading">
              <p class="theme-modal-title">{{ THEME_PANEL.title }}</p>
              <p class="theme-modal-subtitle">{{ THEME_PANEL.subtitle }}</p>
            </div>
            <button
              type="button"
              class="theme-close"
              :aria-label="THEME_PANEL.close"
              @click="close"
            >
              ✕
            </button>
          </header>

          <div class="theme-tabs" role="tablist" :aria-label="THEME_PANEL.title">
            <button
              :id="tabId('preset')"
              type="button"
              role="tab"
              class="theme-tab"
              :class="{ active: tab === 'preset' }"
              :aria-selected="tab === 'preset'"
              :aria-controls="panelId('preset')"
              :tabindex="tab === 'preset' ? 0 : -1"
              @click="tab = 'preset'"
              @keydown="onTabKeydown($event, 'preset')"
            >
              {{ THEME_PANEL.presetTab }}
            </button>
            <button
              :id="tabId('custom')"
              type="button"
              role="tab"
              class="theme-tab"
              :class="{ active: tab === 'custom' }"
              :aria-selected="tab === 'custom'"
              :aria-controls="panelId('custom')"
              :tabindex="tab === 'custom' ? 0 : -1"
              @click="tab = 'custom'"
              @keydown="onTabKeydown($event, 'custom')"
            >
              {{ THEME_PANEL.customTab }}
              <span v-if="themeStore.isCustomized" class="theme-tab-count">
                {{ themeStore.customizedKeys.length }}
              </span>
            </button>
          </div>

          <!-- 整体风格 -->
          <div
            v-if="tab === 'preset'"
            :id="panelId('preset')"
            role="tabpanel"
            :aria-labelledby="tabId('preset')"
            class="theme-body"
          >
            <ul class="theme-grid">
              <li v-for="(item, index) in themeStore.themeList" :key="item.id">
                <button
                  type="button"
                  class="theme-card u-enter"
                  :class="{ active: item.id === themeStore.themeId }"
                  :style="{ '--i': index }"
                  :aria-pressed="item.id === themeStore.themeId"
                  @click="themeStore.setTheme(item.id)"
                >
                  <span class="theme-swatch" aria-hidden="true">
                    <i
                      v-for="(color, i) in item.swatch"
                      :key="i"
                      class="theme-swatch-chip"
                      :style="{ background: color }"
                    ></i>
                  </span>
                  <span class="theme-card-name">{{ item.name }}</span>
                  <span class="theme-card-label">{{ item.label }}</span>
                  <span class="theme-card-tagline">{{ item.tagline }}</span>
                  <span v-if="item.id === themeStore.themeId" class="theme-card-badge">
                    {{ THEME_PANEL.currentBadge }}
                  </span>
                </button>
              </li>
            </ul>
          </div>

          <!-- 单项修改 -->
          <div
            v-else
            :id="panelId('custom')"
            role="tabpanel"
            :aria-labelledby="tabId('custom')"
            class="theme-body"
          >
            <p v-if="themeStore.isCustomized" class="theme-custom-note">
              {{ THEME_PANEL.customizedNote(themeStore.customizedKeys.length) }}
            </p>

            <div v-for="field in CUSTOM_FIELDS" :key="field.key" class="theme-field">
              <div class="theme-field-head">
                <label class="theme-field-label" :for="fieldId(field.key)">
                  {{ field.label }}
                </label>
                <span v-if="field.type === 'range'" class="theme-field-value">
                  {{ field.format(themeStore.custom[field.key]) }}
                </span>
                <button
                  v-if="isChanged(field.key)"
                  type="button"
                  class="theme-field-reset"
                  @click="themeStore.resetCustomField(field.key)"
                >
                  {{ THEME_PANEL.resetField }}
                </button>
              </div>

              <input
                v-if="field.type === 'range'"
                :id="fieldId(field.key)"
                class="theme-range"
                type="range"
                :min="field.min"
                :max="field.max"
                :step="field.step"
                :value="themeStore.custom[field.key]"
                @input="onRangeInput(field.key, $event)"
              />

              <select
                v-else-if="field.type === 'select'"
                :id="fieldId(field.key)"
                class="theme-select"
                :value="themeStore.custom[field.key]"
                @change="themeStore.setCustom(field.key, $event.target.value)"
              >
                <option v-for="option in field.options" :key="option.value" :value="option.value">
                  {{ option.label }}
                </option>
              </select>

              <div v-else-if="field.type === 'color'" class="theme-color-row">
                <input
                  :id="fieldId(field.key)"
                  class="theme-color"
                  type="color"
                  :value="accentValue"
                  @input="themeStore.setCustom('accent', $event.target.value)"
                />
                <span class="theme-color-text">{{ themeStore.custom.accent || accentValue }}</span>
              </div>

              <input
                v-else
                :id="fieldId(field.key)"
                class="theme-text"
                type="text"
                :value="themeStore.custom[field.key]"
                :placeholder="field.placeholder"
                @change="themeStore.setCustom(field.key, $event.target.value)"
              />

              <p class="theme-field-hint">{{ field.hint }}</p>
            </div>
          </div>

          <footer class="theme-modal-foot">
            <button
              type="button"
              class="u-btn theme-foot-btn"
              :disabled="!themeStore.isCustomized"
              @click="themeStore.resetCustom()"
            >
              {{ THEME_PANEL.resetCustom }}
            </button>
            <button
              type="button"
              class="u-btn theme-foot-btn"
              @click="themeStore.resetAll()"
            >
              {{ THEME_PANEL.resetAll }}
            </button>
          </footer>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup>
/**
 * 样式主题切换器
 *
 * 功能要求里的「导航栏右侧图标按钮 + 切换弹窗」即此组件：
 *   - 「整体风格」页签：五套设计风格整体切换；
 *   - 「单项修改」页签：字号、间距密度、圆角、强调色、字体族、页面背景图逐项微调。
 * 控件由 `CUSTOM_FIELDS` 数据驱动渲染 —— 新增一个可调项只需在 presets.js 里加一条，
 * 不需要改这个组件的模板。
 *
 * 无障碍遵循项目里 LoginModal 确立的模态约定：
 * role=dialog + aria-modal + 隐藏标题、Escape 关闭、Tab 焦点陷阱、焦点归还、滚动锁定。
 */
import { computed, nextTick, onUnmounted, ref, watch } from 'vue'
import { useThemeStore } from '@/stores/theme'
import { CUSTOM_FIELDS } from '@/theme/presets.js'
import { THEME_PANEL } from '@/constants/content.js'
import { useBodyScroll } from '@/hooks/useBodyScroll/useBodyScroll'

const themeStore = useThemeStore()
const { disableScroll, enableScroll } = useBodyScroll()

const tab = ref('preset')
const modalRef = ref(null)

/** 打开弹窗前拥有焦点的元素，关闭后归还焦点 */
let previouslyFocused = null

const tabId = (name) => `theme-tab-${name}`
const panelId = (name) => `theme-panel-${name}`
const fieldId = (key) => `theme-field-${key}`

const isChanged = (key) => themeStore.customizedKeys.includes(key)

/** 强调色输入框的初值：未自定义时显示当前主题的强调色 */
const accentValue = computed(() => themeStore.custom.accent || themeStore.theme.tokens['--accent'])

const close = () => themeStore.closePanel()

/** 范围控件用 input 事件，拖动过程中即时预览 */
const onRangeInput = (key, event) => {
  const value = Number(event.target.value)
  if (Number.isFinite(value)) themeStore.setCustom(key, value)
}

/** 左右方向键在页签之间切换（WAI-ARIA tabs 约定） */
const onTabKeydown = (event, current) => {
  if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return
  event.preventDefault()
  tab.value = current === 'preset' ? 'custom' : 'preset'
  nextTick(() => document.getElementById(tabId(tab.value))?.focus())
}

/** 焦点陷阱：弹窗是模态的，Tab 不应跑到背后的页面 */
const handleKeydown = (event) => {
  if (event.key === 'Escape') {
    event.preventDefault()
    close()
    return
  }

  if (event.key !== 'Tab' || !modalRef.value) return

  const focusable = modalRef.value.querySelectorAll(
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
  )
  const list = Array.from(focusable).filter((el) => !el.disabled && el.offsetParent !== null)
  if (list.length === 0) return

  const first = list[0]
  const last = list[list.length - 1]

  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault()
    last.focus()
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault()
    first.focus()
  }
}

watch(
  () => themeStore.panelOpen,
  async (open) => {
    if (open) {
      tab.value = 'preset'
      disableScroll()
      previouslyFocused = typeof document !== 'undefined' ? document.activeElement : null
      await nextTick()
      modalRef.value?.querySelector('.theme-close')?.focus()
      document.addEventListener('keydown', handleKeydown)
      return
    }

    enableScroll()
    document.removeEventListener('keydown', handleKeydown)
    if (previouslyFocused && typeof previouslyFocused.focus === 'function') {
      previouslyFocused.focus()
    }
    previouslyFocused = null
  }
)

onUnmounted(() => {
  // 滚动锁由 useBodyScroll 在卸载时自动释放；这里只需摘掉键盘监听
  if (typeof document !== 'undefined') document.removeEventListener('keydown', handleKeydown)
})
</script>

<style scoped>
/* ── 触发按钮 ───────────────────────────────────────────── */
.theme-trigger {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border: 1px solid var(--border);
  border-radius: var(--radius-btn);
  background: var(--bg-surface);
  transition:
    border-color var(--transition-interactive),
    background-color var(--transition-interactive);
}

.theme-trigger:hover,
.theme-trigger.active {
  border-color: var(--accent);
}

.theme-trigger-icon {
  font-size: 16px;
  line-height: 1;
  animation: var(--decor-animation);
}

/* 右上角的小色点：用当前强调色标记「可换肤」 */
.theme-trigger-dot {
  position: absolute;
  top: 5px;
  right: 5px;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--accent);
}

/* ── 弹窗 ───────────────────────────────────────────────── */
.theme-overlay {
  position: fixed;
  inset: 0;
  z-index: 2000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--container-padding);
  background: var(--scrim);
  animation: enterUp var(--enter-duration) var(--enter-ease) both;
}

.theme-modal {
  display: flex;
  flex-direction: column;
  width: 100%;
  max-width: 720px;
  max-height: min(86vh, 720px);
  padding: var(--panel-padding);
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  border-radius: var(--radius-panel);
  box-shadow: var(--shadow-elevated);
  backdrop-filter: var(--effect-backdrop);
  -webkit-backdrop-filter: var(--effect-backdrop);
  animation: enterUp var(--enter-duration) var(--enter-ease) both;
}

.theme-modal-head {
  display: flex;
  align-items: flex-start;
  gap: calc(var(--space-unit) * 2);
  margin-bottom: calc(var(--space-unit) * 2);
}

.theme-modal-heading {
  flex: 1;
  min-width: 0;
}

.theme-modal-title {
  font-family: var(--font-display);
  font-size: var(--fs-h3);
  font-weight: var(--fw-heading);
  letter-spacing: var(--tracking-display);
  text-transform: var(--heading-transform);
  color: var(--text-primary);
  margin: 0 0 calc(var(--space-unit) * 0.5);
}

.theme-modal-subtitle {
  font-size: var(--fs-sm);
  color: var(--text-secondary);
  margin: 0;
}

.theme-close {
  flex-shrink: 0;
  width: 32px;
  height: 32px;
  font-size: 16px;
  color: var(--text-muted);
  border-radius: var(--radius-btn);
  transition: color var(--transition-interactive), background-color var(--transition-interactive);
}

.theme-close:hover {
  color: var(--accent);
  background: var(--bg-soft);
}

/* ── 页签 ───────────────────────────────────────────────── */
.theme-tabs {
  display: flex;
  gap: calc(var(--space-unit) * 0.5);
  padding: calc(var(--space-unit) * 0.5);
  margin-bottom: calc(var(--space-unit) * 2);
  background: var(--bg-surface-2);
  border-radius: var(--radius-btn);
}

.theme-tab {
  flex: 1;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: calc(var(--space-unit) * 0.75);
  padding: calc(var(--space-unit) * 1.25) calc(var(--space-unit) * 1.5);
  font-size: var(--fs-sm);
  font-weight: var(--fw-label);
  letter-spacing: var(--tracking-label);
  text-transform: var(--label-transform);
  color: var(--text-secondary);
  border-radius: var(--radius-btn);
  transition: color var(--transition-interactive), background-color var(--transition-interactive);
}

.theme-tab:hover {
  color: var(--text-primary);
}

.theme-tab.active {
  color: var(--text-on-accent);
  background: var(--accent);
}

.theme-tab-count {
  min-width: 18px;
  padding: 0 4px;
  font-family: var(--font-mono);
  font-size: var(--fs-label);
  line-height: 18px;
  text-align: center;
  border-radius: var(--radius-chip);
  background: var(--bg-elevated);
  color: var(--accent);
}

/* ── 内容区 ─────────────────────────────────────────────── */
.theme-body {
  flex: 1;
  overflow-y: auto;
  padding-right: calc(var(--space-unit) * 0.5);
}

.theme-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--card-gap);
}

.theme-card {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: calc(var(--space-unit) * 0.5);
  width: 100%;
  height: 100%;
  padding: var(--card-padding);
  text-align: left;
  background: var(--bg-surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-card);
  transition:
    border-color var(--transition-interactive),
    background-color var(--transition-interactive);
}

.theme-card:hover {
  border-color: var(--card-hover-border);
}

.theme-card.active {
  border-color: var(--accent);
  background: var(--bg-soft);
}

.theme-swatch {
  display: flex;
  gap: calc(var(--space-unit) * 0.5);
  margin-bottom: calc(var(--space-unit) * 0.5);
}

.theme-swatch-chip {
  width: 20px;
  height: 20px;
  border: 1px solid var(--border);
  border-radius: var(--radius-chip);
}

.theme-card-name {
  font-family: var(--font-display);
  font-size: var(--fs-sm);
  font-weight: var(--fw-heading);
  letter-spacing: var(--tracking-label);
  color: var(--text-primary);
}

.theme-card-label {
  font-size: var(--fs-label);
  color: var(--accent);
}

.theme-card-tagline {
  font-size: var(--fs-label);
  line-height: 1.5;
  color: var(--text-muted);
}

.theme-card-badge {
  position: absolute;
  top: calc(var(--space-unit) * 1.25);
  right: calc(var(--space-unit) * 1.25);
  padding: 2px 6px;
  font-size: var(--fs-label);
  font-weight: var(--fw-label);
  color: var(--text-on-accent);
  background: var(--accent);
  border-radius: var(--radius-chip);
}

/* ── 单项修改 ───────────────────────────────────────────── */
.theme-custom-note {
  margin-bottom: calc(var(--space-unit) * 2);
  font-size: var(--fs-sm);
  color: var(--accent);
}

.theme-field {
  padding: calc(var(--space-unit) * 1.5) 0;
  border-bottom: 1px solid var(--divider);
}

.theme-field:last-child {
  border-bottom: none;
}

.theme-field-head {
  display: flex;
  align-items: center;
  gap: calc(var(--space-unit));
  margin-bottom: calc(var(--space-unit));
}

.theme-field-label {
  font-size: var(--fs-sm);
  font-weight: var(--fw-label);
  letter-spacing: var(--tracking-label);
  color: var(--text-primary);
}

.theme-field-value {
  font-family: var(--font-mono);
  font-size: var(--fs-label);
  color: var(--accent);
}

.theme-field-reset {
  margin-left: auto;
  font-size: var(--fs-label);
  color: var(--text-muted);
  transition: color var(--transition-interactive);
}

.theme-field-reset:hover {
  color: var(--accent);
}

.theme-range {
  width: 100%;
  height: 4px;
  appearance: none;
  background: var(--bg-surface-2);
  border-radius: var(--radius-chip);
  cursor: pointer;
}

.theme-range::-webkit-slider-thumb {
  appearance: none;
  width: 14px;
  height: 14px;
  margin-top: 0;
  border-radius: 50%;
  background: var(--accent);
  cursor: pointer;
}

.theme-range::-moz-range-thumb {
  width: 14px;
  height: 14px;
  border: none;
  border-radius: 50%;
  background: var(--accent);
  cursor: pointer;
}

.theme-select,
.theme-text,
.theme-color-row {
  width: 100%;
}

.theme-select,
.theme-text {
  padding: calc(var(--space-unit) * 1.25) calc(var(--space-unit) * 1.5);
  font-size: var(--fs-sm);
  color: var(--text-primary);
  background: var(--bg-surface-2);
  border: 1px solid var(--border);
  border-radius: var(--radius-input);
  transition: border-color var(--transition-interactive);
}

.theme-select:focus,
.theme-text:focus {
  border-color: var(--accent);
}

.theme-color-row {
  display: flex;
  align-items: center;
  gap: calc(var(--space-unit) * 1.5);
}

.theme-color {
  width: 44px;
  height: 32px;
  padding: 0;
  border: 1px solid var(--border);
  border-radius: var(--radius-chip);
  background: none;
  cursor: pointer;
}

.theme-color-text {
  font-family: var(--font-mono);
  font-size: var(--fs-label);
  color: var(--text-secondary);
}

.theme-field-hint {
  margin-top: calc(var(--space-unit) * 0.75);
  font-size: var(--fs-label);
  line-height: 1.5;
  color: var(--text-muted);
}

/* ── 底部操作 ───────────────────────────────────────────── */
.theme-modal-foot {
  display: flex;
  gap: calc(var(--space-unit));
  margin-top: calc(var(--space-unit) * 2);
  padding-top: calc(var(--space-unit) * 2);
  border-top: 1px solid var(--divider);
}

.theme-foot-btn {
  flex: 1;
}

/* ── 响应式 ─────────────────────────────────────────────── */
@media (max-width: 767px) {
  .theme-modal {
    max-height: 88vh;
  }

  .theme-grid {
    grid-template-columns: 1fr;
  }

  .theme-modal-foot {
    flex-direction: column;
  }
}

@media (max-width: 575px) {
  .theme-trigger {
    width: 32px;
    height: 32px;
  }

  .theme-modal {
    padding: calc(var(--space-unit) * 1.5);
  }

  .theme-card {
    padding: calc(var(--space-unit) * 1.5);
  }
}
</style>
