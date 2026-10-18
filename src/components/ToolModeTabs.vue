<template>
  <div class="tool-mode">
    <div class="tool-mode-tabs" role="group" :aria-label="label">
      <button
        v-for="item in options"
        :key="item.value"
        type="button"
        class="tool-mode-tab"
        :class="{ 'is-active': item.value === modelValue }"
        :aria-pressed="item.value === modelValue"
        @click="$emit('update:modelValue', item.value)"
      >
        <AppIcon v-if="item.icon" :name="item.icon" aria-hidden="true" />
        <span>{{ item.label }}</span>
      </button>
    </div>
    <p v-if="hint" class="tool-mode-hint">{{ hint }}</p>
  </div>
</template>

<script setup>
/**
 * 工具页的模式切换（生成 / 识别、合并 / 拆分这类二选一）。
 *
 * 为什么单独抽出来：改造前 33 个页面里有 6 页各自写了一排「像个标签」的按钮，
 * 选中态写法五花八门（有的只换文字颜色、有的只加下划线），键盘可达性和读屏语义
 * 也不一致。收成一处之后，样式走 `ui-kit-tool.css` §8，选中态同时用底色 + 加粗
 * 表达（不靠颜色单一编码），并统一 `aria-pressed`。
 *
 * 与「标签页」的区别：这里不是页面级导航，只是同一张面板里换个计算方式，
 * 所以用 `role="group"` + `aria-pressed`，不用 tablist（tablist 会要求面板随切换而增删）。
 */
import AppIcon from '@/components/AppIcon.vue'

defineProps({
  /** 当前选中的模式值 */
  modelValue: { type: String, default: '' },
  /** 可选模式：[{ value, label, icon? }] */
  options: {
    type: Array,
    default: () => [
      { value: 'generate', label: '生成' },
      { value: 'recognize', label: '识别' },
    ],
  },
  /** 分组读屏名（「二维码操作模式」这种） */
  label: { type: String, default: '操作模式' },
  /** 一行说明，放在标签下方 */
  hint: { type: String, default: '' },
})

defineEmits(['update:modelValue'])
</script>

<style scoped>
.tool-mode {
  display: flex;
  flex-direction: column;
  gap: calc(var(--space-unit) * 1);
}

.tool-mode-hint {
  margin: 0;
}
</style>
