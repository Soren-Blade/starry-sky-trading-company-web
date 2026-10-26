<template>
  <!--
    EC theme-switch：三档 segmented，与 ec-design-system 的 index.html 同构。

    为什么不改成「一个按钮点一下切换」：
      两档开关无法表达「跟随系统」这一档，而 EC 的主题契约里 auto 是一等公民
      （`data-theme-mode` 三个值之一）。三档分段控件把三种意图同时摊开，
      用户不需要猜「现在这个月亮图标是当前状态还是点击后的状态」。

    结构契约（EC 的 `ec.setTheme` 依赖它）：
      - 每个按钮带 `data-set-theme="light|dark|auto"`
      - 当前档 `aria-pressed="true"`
      - 容器 role="group" + aria-label
    这三条让设计系统的行为层（js/ec.js）可以直接接管本组件；
    本组件用 Vue 状态驱动，语义与它完全一致。
  -->
  <div class="theme-switch" role="group" :aria-label="THEME_SWITCH.label">
    <button
      v-for="item in THEME_SWITCH.modes"
      :key="item.mode"
      type="button"
      class="theme-switch__btn"
      :data-set-theme="item.mode"
      :aria-pressed="themeStore.mode === item.mode"
      :aria-label="item.label"
      :title="item.label"
      @click="themeStore.setMode(item.mode)"
    >
      <AppIcon :name="item.icon" />
    </button>
  </div>
</template>

<script setup>
/**
 * 明暗切换（EC theme-switch）
 *
 * 只做一件事：把点击转成 `themeStore.setMode()`。
 * 颜色、尺寸、圆角、选中态全部由 ui-kit-nav.css 的 `.theme-switch` 消费
 * `--ec-*` 令牌实现 —— 这里不写任何视觉值。
 */
import { useThemeStore } from '@/stores/theme'
import { THEME_SWITCH } from '@/constants/index.js'
import AppIcon from '@/components/AppIcon.vue'

const themeStore = useThemeStore()
</script>

<style scoped>
/*
 * 三档分段控件的「滑块」
 * ============================================================
 *
 * 为什么需要它：三档切换后，选中态原本是按钮自己瞬间换上的实心块 ——
 * 点一下，实体块从 A 跳到 B，中间没有任何位移，观感就是「啪」。
 * 这里把那个实心块抽成一个独立的滑块层（容器的 ::before），
 * 用 transform 在 180ms 内平移过去，按钮只剩文字/图标的颜色变化。
 *
 * 滑块位置读的是 `<html data-theme-mode="light|dark|auto">` —— 那正是
 * theme store 写下的「用户选中的档位」，与按钮的 aria-pressed 同源。
 * 不按 `:nth-child` / 按钮索引定位，是因为档位顺序由 THEME_SWITCH.modes
 * 决定，写死索引会在顺序调整时错位。
 *
 * 尺寸全部对齐 ui-kit-nav.css 里 .theme-switch__btn 的实测值：
 * 桌面 padding 2px / 格 28px，窄屏 padding 1px / 格 28×0.9=25.2px。
 * 因此宽度直接复用同一条令牌与同一个缩放系数，不另写像素值。
 */
.theme-switch {
  position: relative;
}

.theme-switch::before {
  content: '';
  position: absolute;
  top: 2px;
  bottom: 2px;
  left: 2px;
  width: var(--ec-control-h-sm);
  background: var(--ec-bg-surface);
  border-radius: var(--ec-radius-sm);
  box-shadow: var(--ec-shadow-sm);
  /* 只过渡位移：滑块不承担换色，颜色由主题切换的瞬时过渡统一管 */
  transition: transform 180ms var(--ec-ease-out);
  pointer-events: none;
}

/* 按钮压在滑块之上，否则滑块会盖住图标 */
.theme-switch__btn {
  position: relative;
  z-index: 1;
}

/* 选中态改由滑块表达：按钮自己再画一层实心块，就会出现「两个块在动」 */
.theme-switch__btn[aria-pressed='true'] {
  background: transparent;
  box-shadow: none;
}

/* 上面那条把选中态的焦点环也一起清掉了，这里补回来（键盘用户需要它） */
.theme-switch__btn[aria-pressed='true']:focus-visible {
  box-shadow: var(--ec-ring);
}

html[data-theme-mode='dark'] .theme-switch::before {
  transform: translateX(calc(100% + 2px));
}

html[data-theme-mode='auto'] .theme-switch::before {
  transform: translateX(calc(200% + 4px));
}

/* 窄屏整组收一档（ui-kit-nav.css §5）：滑块跟着缩，内缩量从 2px 收到 1px */
@media (max-width: 767px) {
  .theme-switch::before {
    top: 1px;
    bottom: 1px;
    left: 1px;
    width: calc(var(--ec-control-h-sm) * var(--mobile-control-scale));
  }
}

/* 前庭系统敏感 / 省电：滑块直接落位，不做位移动画 */
@media (prefers-reduced-motion: reduce) {
  .theme-switch::before {
    transition: none;
  }
}
</style>
