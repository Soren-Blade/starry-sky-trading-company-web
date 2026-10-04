<template>
  <div class="categories-page">
    <PageHeader title="商品分类" subtitle="浏览所有分类，发现适合你的完美选择" />
    <CategoriesSection />
  </div>
</template>

<script setup>
import PageHeader from '@/components/PageHeader.vue'
import CategoriesSection from '@/components/CategoriesSection.vue'
</script>

<style scoped>
.categories-page {
  width: 100%;
  padding-top: var(--navbar-height);
}
</style>
