<template>
  <div class="hot-page">
    <PageHeader title="热门推荐" subtitle="精选热销商品，享受优质生活" />
    <HotProductsSection />
  </div>
</template>

<script setup>
import PageHeader from '@/components/PageHeader.vue'
import HotProductsSection from '@/components/HotProductsSection.vue'
</script>

<style scoped>
.hot-page {
  width: 100%;
  padding-top: var(--navbar-height);
  /* 通过变量给共享的 .page-header 换主题色 */
  --page-header-gradient: var(--gradient-hot);
}
</style>
