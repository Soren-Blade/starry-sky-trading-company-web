<template>
  <form class="u-search" role="search" @submit.prevent="$emit('submit', modelValue)">
    <label class="visually-hidden" :for="inputId">{{ label }}</label>
    <span class="u-search-icon" aria-hidden="true">🔍</span>
    <input
      :id="inputId"
      class="u-input"
      type="search"
      autocomplete="off"
      :value="modelValue"
      :placeholder="placeholder"
      @input="$emit('update:modelValue', $event.target.value)"
    />
    <button type="submit" class="u-btn-primary search-submit">{{ submitLabel }}</button>
  </form>
</template>

<script setup>
/**
 * 搜索栏（受控组件）
 *
 * 尺寸、圆角、描边、图标尺寸与间距、聚焦态全部来自 `.u-search` / `.u-input`
 * 与 `--input-*` 令牌 —— 五套风格下分别是
 * 40px/12px 直角系、48px/全胶囊玻璃、44px/24px 便当、48px/8px 粗野、36px/6px 等宽。
 *
 * 只负责输入与提交，不直接读写 store —— 过滤逻辑属于数据层
 * （`stores/shop.js` 的 `searchKeyword` / `filteredProducts`）。
 */
import { useId } from 'vue'

defineProps({
  modelValue: { type: String, default: '' },
  /** 输入框的无障碍名称（同时作为隐藏 label 文本） */
  label: { type: String, default: '搜索商品' },
  placeholder: { type: String, default: '搜索商品或分类' },
  submitLabel: { type: String, default: '搜索' },
})

defineEmits(['update:modelValue', 'submit'])

// 页面上可能同时存在桌面端与移动端两个实例，id 必须唯一
const inputId = `search-bar-${useId()}`
</script>

<style scoped>
.search-submit {
  flex-shrink: 0;
}

@media (max-width: 767px) {
  /* 移动端隐藏提交按钮，改由软键盘的「搜索」键提交（表单 submit 仍然生效） */
  .search-submit {
    display: none;
  }
}
</style>
