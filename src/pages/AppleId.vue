<template>
    <div class="apple-id-page">
        <!-- <div class="page-header">
        <h1>共享苹果ID</h1>
        <p>浏览最新的共享苹果ID列表，获取更多账号资源</p>
        </div> -->
        <AppleIdSection />
    </div>
</template>

<script setup>
import AppleIdSection from '@/components/AppleIdSection.vue'
</script>

<style scoped>
.apple-id-page {
  width: 100%;
  padding-top: 70px;
}

.page-header {
  text-align: center;
  padding: 60px 20px;
  background: linear-gradient(135deg, #FF9FF3 0%, #F368E0 100%);
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