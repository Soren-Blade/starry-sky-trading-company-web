<template>
  <div class="theme-switcher">
    <!-- 导航栏右侧的图标按钮 -->
    <button
      type="button"
      class="u-icon-btn theme-trigger"
      :class="{ 'theme-trigger--active': themeStore.panelOpen }"
      :aria-label="THEME_PANEL.trigger"
      :aria-expanded="themeStore.panelOpen"
      aria-haspopup="dialog"
      @click="themeStore.togglePanel()"
    >
      <span class="theme-trigger-icon"><AppIcon name="palette" /></span>
      <span class="theme-trigger-dot" aria-hidden="true"></span>
    </button>

    <Teleport v-if="themeStore.panelOpen" to="body">
      <div class="u-modal-overlay" @click.self="close">
        <div
          ref="modalRef"
          class="u-modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby="theme-modal-title"
        >
          <h2 id="theme-modal-title" class="visually-hidden">{{ THEME_PANEL.title }}</h2>

          <button
            type="button"
            class="u-modal-close theme-close"
            :aria-label="THEME_PANEL.close"
            @click="close"
          >
            ✕
          </button>

          <p class="u-modal-title theme-modal-title">{{ THEME_PANEL.title }}</p>
          <p class="theme-modal-subtitle">{{ THEME_PANEL.subtitle }}</p>

          <div class="theme-tabs" role="tablist" :aria-label="THEME_PANEL.title">
            <button
              :id="tabId('preset')"
              type="button"
              role="tab"
              class="u-tag theme-tab"
              :class="{ 'u-tag--accent': tab === 'preset' }"
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
              class="u-tag theme-tab"
              :class="{ 'u-tag--accent': tab === 'custom' }"
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

          <div class="u-modal-body theme-body">
            <!-- 整体风格 -->
            <ul
              v-if="tab === 'preset'"
              :id="panelId('preset')"
              role="tabpanel"
              :aria-labelledby="tabId('preset')"
              class="theme-grid"
            >
              <li v-for="(item, index) in themeStore.themeList" :key="item.id">
                <button
                  type="button"
                  class="theme-card u-enter"
                  :class="{ 'theme-card--active': item.id === themeStore.themeId }"
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
                  <span v-if="item.id === themeStore.themeId" class="u-tag u-tag--accent theme-card-badge">
                    {{ THEME_PANEL.currentBadge }}
                  </span>
                </button>
              </li>
            </ul>

            <!-- 单项修改 -->
            <div
              v-else
              :id="panelId('custom')"
              role="tabpanel"
              :aria-labelledby="tabId('custom')"
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

                <!--
                  换掉原生 <select>：它的弹出层由操作系统绘制，五套风格一套都管不到。
                  `:id` 保留原值 —— SelectField 会把它落到触发器（button）上，
                  上方 `<label :for>` 的关联因此照旧成立（label 可标注 button）。
                  `$event` 是 SelectField 抛出的**值**（不是 DOM 事件），
                  所以不再有 `.target.value` 这一跳，setCustom 的入参没有变化。
                -->
                <SelectField
                  v-else-if="field.type === 'select'"
                  :id="fieldId(field.key)"
                  :model-value="themeStore.custom[field.key]"
                  :options="field.options"
                  :aria-label="field.label"
                  @update:model-value="themeStore.setCustom(field.key, $event)"
                />

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
                  class="u-input"
                  type="text"
                  :value="themeStore.custom[field.key]"
                  :placeholder="field.placeholder"
                  @change="themeStore.setCustom(field.key, $event.target.value)"
                />

                <p class="theme-field-hint">{{ field.hint }}</p>
              </div>
            </div>
          </div>

          <footer class="u-modal-foot">
            <button
              type="button"
              class="u-btn-secondary"
              :disabled="!themeStore.isCustomized"
              @click="themeStore.resetCustom()"
            >
              {{ THEME_PANEL.resetCustom }}
            </button>
            <button type="button" class="u-btn-secondary" @click="themeStore.resetAll()">
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
 * 「整体风格」页签整体换风格；「单项修改」页签逐项微调
 * （字号 / 间距密度 / 圆角 / 强调色 / 字体族 / 页面背景图）。
 * 控件由 `CUSTOM_FIELDS` 数据驱动渲染 —— 新增一个可调项只需在 presets.js 里加一条，
 * 不需要改这个组件的模板。
 *
 * 结构全部复用 global.css 的共享类（.u-icon-btn / .u-modal* / .u-tag / .u-input /
 * .u-btn-secondary），因此弹窗宽度、内边距、圆角、阴影、关闭按钮尺寸、
 * 底部按钮组间距都随五套风格自动变化（480~520px、24~28px、16~24px…）；
 * 其中 select 类型的字段交给 SelectField，由它消费 ui-kit-form.css §1 的下拉样式
 * （原生 select 的弹出层由系统绘制，换风格时不会跟着变）。
 *
 * 无障碍遵循项目既有的模态约定：role=dialog + aria-modal + 隐藏标题、
 * Escape 关闭、Tab 焦点陷阱、焦点归还、滚动锁定。
 */
import { computed, nextTick, ref, watch } from 'vue'
import { useThemeStore } from '@/stores/theme'
import { CUSTOM_FIELDS } from '@/theme/presets.js'
import { THEME_PANEL } from '@/constants/content.js'
import { useModalA11y } from '@/hooks/useModalA11y'
import SelectField from '@/components/SelectField.vue'
import AppIcon from '@/components/AppIcon.vue'

const themeStore = useThemeStore()

const tab = ref('preset')

const tabId = (name) => `theme-tab-${name}`
const panelId = (name) => `theme-panel-${name}`
const fieldId = (key) => `theme-field-${key}`

const isChanged = (key) => themeStore.customizedKeys.includes(key)

/** 强调色输入框的初值：未自定义时显示当前主题的强调色 */
const accentValue = computed(() => themeStore.custom.accent || themeStore.theme.tokens['--accent'])

const close = () => themeStore.closePanel()

/**
 * 模态约定（Escape / 焦点陷阱 / 焦点归还 / 滚动锁定）走统一的 useModalA11y。
 *
 * 与 LoginModal 的差别只有两点，都由参数表达：
 *   - `auto: false` —— 本组件常驻，弹窗由 `themeStore.panelOpen` 开关，
 *     不能在组件挂载时就激活；
 *   - `initialFocus` —— 打开后把焦点放到关闭按钮上，而不是第一个输入框
 *     （主题弹窗里第一个可聚焦元素是页签，聚焦它会立刻显示焦点环，
 *      视觉上像是「已经选中了」）。
 */
const { modalRef, activate, deactivate } = useModalA11y({
  close,
  auto: false,
  initialFocus: '.theme-close',
})

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

watch(
  () => themeStore.panelOpen,
  (open) => {
    if (open) {
      tab.value = 'preset'
      activate()
      return
    }
    deactivate()
  }
)
</script>

<style scoped>
/* ── 触发按钮：尺寸/圆角/图标大小来自 .u-icon-btn 与 --icon-btn-* ── */
.theme-trigger {
  position: relative;
}

.theme-trigger--active,
.theme-trigger:hover {
  color: var(--accent);
  border-color: var(--accent);
}

.theme-trigger-icon {
  /* 用 inline-flex 而不是让 SVG 以 inline 参与排版：
   * 图标本身带 vertical-align: -0.125em（与文字并排时的常规做法），
   * 但这里外层是 line-height: 1 的行内 span，那个偏移会让图标看着偏下。
   * 变成 flex 之后图标是 flex item，vertical-align 不参与，必然居中。 */
  display: inline-flex;
  align-items: center;
  justify-content: center;
  line-height: 1;
  animation: var(--decor-animation);
}

/* 右上角的小色点：用当前强调色标记「可换肤」 */
.theme-trigger-dot {
  position: absolute;
  top: 15%;
  right: 15%;
  width: 18%;
  height: 18%;
  border-radius: var(--radius-pill);
  background: var(--accent);
}

/* ── 弹窗：宽度/内边距/圆角/阴影全部来自 .u-modal 与 --modal-* ── */
.theme-modal-title {
  margin-bottom: calc(var(--space-unit) * 0.5);
}

.theme-modal-subtitle {
  margin-bottom: var(--modal-title-gap);
  font-size: var(--fs-sm);
  color: var(--text-secondary);
}

/* ── 页签 ───────────────────────────────────────────────── */
.theme-tabs {
  display: flex;
  gap: calc(var(--space-unit));
  margin-bottom: calc(var(--space-unit) * 2);
}

.theme-tab {
  flex: 1;
  justify-content: center;
  cursor: pointer;
}

.theme-tab-count {
  min-width: var(--tag-height);
  padding: 0 calc(var(--space-unit) * 0.5);
  font-family: var(--font-mono);
  font-size: var(--tag-font-size);
  text-align: center;
  border-radius: var(--micro-badge-radius);
  background: var(--bg-elevated);
  color: var(--accent);
}

/* ── 风格卡片网格 ───────────────────────────────────────── */
.theme-body {
  padding-right: calc(var(--space-unit) * 0.5);
}

.theme-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--grid-gap);
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
  background: var(--bg-surface-2);
  border: var(--stroke-width) solid var(--border);
  border-radius: var(--radius-card);
  transition:
    border-color var(--transition-interactive),
    background-color var(--transition-interactive);
}

.theme-card:hover {
  border-color: var(--card-hover-border);
}

.theme-card--active {
  border-color: var(--accent);
  background: var(--bg-soft);
}

.theme-swatch {
  display: flex;
  gap: calc(var(--space-unit) * 0.5);
  margin-bottom: calc(var(--space-unit) * 0.5);
}

.theme-swatch-chip {
  width: calc(var(--space-unit) * 2.5);
  height: calc(var(--space-unit) * 2.5);
  border: var(--stroke-width) solid var(--border);
  border-radius: var(--micro-badge-radius);
}

.theme-card-name {
  font-family: var(--font-display);
  font-size: var(--fs-sm);
  font-weight: var(--fw-heading);
  letter-spacing: var(--tracking-label);
  color: var(--text-primary);
}

.theme-card-label {
  font-size: var(--tag-font-size);
  color: var(--accent);
}

.theme-card-tagline {
  font-size: var(--tag-font-size);
  line-height: var(--leading-body);
  color: var(--text-muted);
}

.theme-card-badge {
  position: absolute;
  top: calc(var(--space-unit) * 1.25);
  right: calc(var(--space-unit) * 1.25);
}

/* ── 单项修改 ───────────────────────────────────────────── */
.theme-custom-note {
  margin-bottom: calc(var(--space-unit) * 2);
  font-size: var(--fs-sm);
  color: var(--accent);
}

.theme-field {
  padding: calc(var(--space-unit) * 1.5) 0;
  border-bottom: var(--stroke-width) solid var(--divider);
}

.theme-field:last-child {
  border-bottom: none;
}

.theme-field-head {
  display: flex;
  align-items: center;
  gap: var(--space-unit);
  margin-bottom: var(--space-unit);
}

.theme-field-label {
  font-size: var(--fs-sm);
  font-weight: var(--fw-label);
  letter-spacing: var(--tracking-label);
  color: var(--text-primary);
}

.theme-field-value {
  font-family: var(--font-mono);
  font-size: var(--tag-font-size);
  color: var(--accent);
}

.theme-field-reset {
  margin-left: auto;
  font-size: var(--tag-font-size);
  color: var(--text-muted);
  transition: color var(--transition-interactive);
}

.theme-field-reset:hover {
  color: var(--accent);
}

.theme-range {
  width: 100%;
  height: var(--progress-height);
  appearance: none;
  background: var(--progress-track);
  border-radius: var(--progress-radius);
  cursor: pointer;
}

.theme-range::-webkit-slider-thumb {
  appearance: none;
  width: var(--checkbox-size);
  height: var(--checkbox-size);
  border-radius: var(--radius-pill);
  background: var(--accent);
  cursor: pointer;
}

.theme-range::-moz-range-thumb {
  width: var(--checkbox-size);
  height: var(--checkbox-size);
  border: none;
  border-radius: var(--radius-pill);
  background: var(--accent);
  cursor: pointer;
}

.theme-color-row {
  display: flex;
  align-items: center;
  gap: calc(var(--space-unit) * 1.5);
}

.theme-color {
  width: calc(var(--input-height) * 1.1);
  height: var(--input-height);
  padding: 0;
  border: var(--stroke-width) solid var(--stroke-color);
  border-radius: var(--radius-input);
  background: none;
  cursor: pointer;
}

.theme-color-text {
  font-family: var(--font-mono);
  font-size: var(--tag-font-size);
  color: var(--text-secondary);
}

.theme-field-hint {
  margin-top: calc(var(--space-unit) * 0.75);
  font-size: var(--tag-font-size);
  line-height: var(--leading-body);
  color: var(--text-muted);
}

/* ── 响应式 ─────────────────────────────────────────────── */
@media (max-width: 767px) {
  .theme-grid {
    grid-template-columns: 1fr;
  }

  .theme-tabs {
    flex-direction: column;
  }
}
</style>
