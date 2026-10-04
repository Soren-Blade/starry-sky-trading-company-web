<template>
  <div class="categories-page">
    <PageHeader v-bind="PAGES.categories" />
    <CategoriesSection />
  </div>
</template>

<script setup>
import PageHeader from '@/components/PageHeader.vue'
import CategoriesSection from '@/components/CategoriesSection.vue'
// 页头文案集中在 constants，改文案只碰一个文件
import { PAGES } from '@/constants/index.js'
</script>

<style scoped>
/* 顶栏占位由 App.vue 的 .main-content 统一负责，页面不再各写一份；
   页面底色同理由 body 的 --bg-page 承担。 */
.categories-page {
  width: 100%;
}
</style>
