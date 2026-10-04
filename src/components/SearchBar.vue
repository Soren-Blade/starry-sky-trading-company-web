<template>
  <form class="search-bar" role="search" @submit.prevent="$emit('submit', modelValue)">
    <label class="visually-hidden" :for="inputId">{{ label }}</label>
    <span class="search-bar-icon" aria-hidden="true">🔍</span>
    <input
      :id="inputId"
      class="search-bar-input"
      type="search"
      autocomplete="off"
      :value="modelValue"
      :placeholder="placeholder"
      @input="$emit('update:modelValue', $event.target.value)"
    />
    <button type="submit" class="search-bar-submit">{{ submitLabel }}</button>
  </form>
</template>

<script setup>
/**
 * 搜索栏（受控组件）
 *
 * 只负责输入与提交，不直接读写 store —— 过滤逻辑属于数据层
 * （`stores/shop.js` 的 `searchKeyword` / `filteredProducts`），
 * 这样同一个搜索栏可以放在导航栏、移动端菜单或任意页面里复用。
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
.search-bar {
  position: relative;
  display: flex;
  align-items: center;
  gap: calc(var(--space-unit) * 0.75);
  width: 100%;
}

.search-bar-icon {
  position: absolute;
  left: calc(var(--space-unit) * 1.5);
  font-size: var(--fs-sm);
  line-height: 1;
  pointer-events: none;
}

.search-bar-input {
  flex: 1;
  min-width: 0;
  padding-left: calc(var(--space-unit) * 4);
  padding-right: calc(var(--space-unit) * 1.5);
  background: var(--bg-surface-2);
  border-color: var(--border);
  /* 搜索框圆角独立于按钮：glass 是全胶囊，mono 是 6px */
  border-radius: var(--radius-input);
}

.search-bar-submit {
  flex-shrink: 0;
  padding: calc(var(--space-unit) * 1.25) calc(var(--space-unit) * 2);
  font-family: var(--font-body);
  font-size: var(--fs-label);
  font-weight: var(--fw-label);
  letter-spacing: var(--tracking-label);
  text-transform: var(--label-transform);
  color: var(--text-on-accent);
  background: var(--accent);
  border-radius: var(--radius-btn);
  transition: background-color var(--transition-interactive);
}

.search-bar-submit:hover {
  background: var(--accent-strong);
}

@media (max-width: 767px) {
  .search-bar-submit {
    display: none;
  }

  .search-bar-input {
    padding-right: calc(var(--space-unit) * 2);
  }
}
</style>
