<template>
  <div class="section-header">
    <h2 class="section-title">
      <AppIcon v-if="icon" class="title-icon" :name="icon" />
      {{ title }}
    </h2>
    <p v-if="description" class="section-description">{{ description }}</p>
  </div>
</template>

<script setup>
/**
 * 区块头：原先在 5 个 Section 组件里各抄一份，现统一到这里。
 * 样式定义在 global.css（.section-header 系列），保证跨组件完全一致。
 */
import AppIcon from '@/components/AppIcon.vue'

defineProps({
  /** AppIcon 的图标名（此前是 emoji 字符，颜色不随主题变化） */
  icon: { type: String, default: '' },
  /** 标题文字 */
  title: { type: String, required: true },
  /** 标题下的说明文字 */
  description: { type: String, default: '' },
})
</script>
