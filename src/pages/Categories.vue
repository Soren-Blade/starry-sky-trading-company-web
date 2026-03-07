<template>
  <div class="categories-page">
    <div class="page-header">
      <h1>商品分类</h1>
      <p>浏览所有分类，发现适合你的完美选择</p>
    </div>
    <CategoriesSection />
  </div>
</template>

<script setup>
import CategoriesSection from '@/components/CategoriesSection.vue'
</script>

<style scoped>
.categories-page {
  width: 100%;
  padding-top: 70px;
}

.page-header {
  text-align: center;
  padding: 60px 20px;
  background: linear-gradient(135deg, #8A6DFF 0%, #6C5CE7 100%);
  color: white;
}

.page-header h1 {
  font-size: 48px;
  margin: 0 0 16px 0;
  font-weight: 800;
}

.page-header p {
  font-size: 18px;
  margin: 0;
  opacity: 0.9;
}

@media (max-width: 767px) {
  .page-header {
    padding: 40px 16px;
  }

  .page-header h1 {
    font-size: 32px;
  }

  .page-header p {
    font-size: 14px;
  }
}
</style>
