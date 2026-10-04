<template>
  <div class="page-header">
    <h1>{{ title }}</h1>
    <p v-if="subtitle">{{ subtitle }}</p>
  </div>
</template>

<script setup>
/**
 * 页面头：原先在 Categories / Hot / About / AppleId 各抄一份，只有渐变不同。
 * 渐变通过 CSS 变量在页面上覆写，默认使用主渐变。
 */
defineProps({
  /** 页面标题 */
  title: { type: String, required: true },
  /** 标题下的说明文字 */
  subtitle: { type: String, default: '' },
})
</script>
