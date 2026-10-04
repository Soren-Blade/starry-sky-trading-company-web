<template>
  <div class="apple-id-page">
    <PageHeader v-bind="PAGES.appleId" />
    <AppleIdSection />
  </div>
</template>

<script setup>
import PageHeader from '@/components/PageHeader.vue'
import AppleIdSection from '@/components/AppleIdSection.vue'
import { PAGES } from '@/constants/index.js'
</script>

<style scoped>
/* 顶栏占位由 App.vue 的 .main-content 统一负责。
   页面头统一走主题表面（global.css 的 .page-header），不再逐页覆写渐变变量。 */
.apple-id-page {
  width: 100%;
}
</style>
