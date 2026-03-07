<template>
  <div class="hot-page">
    <div class="page-header">
      <h1>热门推荐</h1>
      <p>精选热销商品，享受优质生活</p>
    </div>
    <HotProductsSection />
  </div>
</template>

<script setup>
import HotProductsSection from '@/components/HotProductsSection.vue'
</script>

<style scoped>
.hot-page {
  width: 100%;
  padding-top: 70px;
}

.page-header {
  text-align: center;
  padding: 60px 20px;
  background: linear-gradient(135deg, #FD79A8 0%, #FF7675 100%);
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
