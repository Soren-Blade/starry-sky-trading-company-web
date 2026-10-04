<template>
  <div class="u-toast-host" role="region" aria-label="系统提示">
    <div
      v-for="item in toast.items"
      :key="item.id"
      class="u-toast"
      :class="`u-toast--${item.type}`"
      role="status"
      aria-live="polite"
      @mouseenter="toast.pause(item.id)"
      @mouseleave="toast.resume(item.id)"
      @focusin="toast.pause(item.id)"
      @focusout="toast.resume(item.id)"
    >
      <span class="u-toast-icon" aria-hidden="true">{{ toast.icon(item.type) }}</span>
      <span class="u-toast-text">{{ item.text }}</span>
      <button
        type="button"
        class="u-toast-close"
        aria-label="关闭提示"
        @click="toast.dismiss(item.id)"
      >
        ✕
      </button>
    </div>
  </div>
</template>

<script setup>
/**
 * 提示框宿主：应用里唯一的 Toast 渲染出口，挂在 App.vue 根部。
 *
 * 位置、尺寸、圆角、描边、阴影、图标大小全部来自 `.u-toast*`（global.css）
 * 与 `--toast-*` 令牌；这里只负责把 store 里的条目渲染出来，
 * 以及把「悬停暂停」这条规范行为接到鼠标/键盘焦点上。
 */
import { useToastStore } from '@/stores/toast'

const toast = useToastStore()
</script>
