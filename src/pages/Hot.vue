<template>
  <div class="hot-page">
    <PageHeader v-bind="PAGES.hot" />
    <HotProductsSection />
  </div>
</template>

<script setup>
import PageHeader from '@/components/PageHeader.vue'
import HotProductsSection from '@/components/HotProductsSection.vue'
import { PAGES } from '@/constants/index.js'
</script>

<style scoped>
/* 顶栏占位由 App.vue 的 .main-content 统一负责。
   页面头统一走主题表面（global.css 的 .page-header），不再逐页覆写渐变变量。 */
.hot-page {
  width: 100%;
}
</style>
