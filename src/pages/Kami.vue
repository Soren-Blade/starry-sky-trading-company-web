<template>
  <div class="kami-page">
    <KamiSection />
  </div>
</template>

<script setup>
import KamiSection from '@/components/KamiSection.vue'
</script>

<style scoped>
/* 顶栏占位由 App.vue 的 .main-content 统一负责；
   区块自身的上下留白与底色由 KamiSection 承担，页面壳不再叠加 padding。 */
.kami-page {
  width: 100%;
}
</style>
