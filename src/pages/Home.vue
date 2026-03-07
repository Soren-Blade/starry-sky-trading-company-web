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
.home-page {
  width: 100%;
}
</style>
