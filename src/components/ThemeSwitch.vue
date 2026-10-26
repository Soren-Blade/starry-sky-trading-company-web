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
