<template>
  <div class="home-page">
    <HeroSection @shop-click="handleShopClick" />
    <CategoriesSection />
    <HotProductsSection />
  </div>
</template>

<script setup>
import HeroSection from '@/components/HeroSection.vue'
import CategoriesSection from '@/components/CategoriesSection.vue'
import HotProductsSection from '@/components/HotProductsSection.vue'

const handleShopClick = () => {
  const categoriesSection = document.querySelector('.categories-section')
  if (categoriesSection) {
    categoriesSection.scrollIntoView({ behavior: 'smooth' })
  }
}
</script>

<style scoped>
/* 首页壳只负责装配三个区块：
   底色由 body 的 --bg-page 承担，顶栏占位由 App.vue 的 .main-content 承担，
   区块各自的上下留白在区块内部（.section-header / .section-container）。 */
.home-page {
  width: 100%;
}
</style>
