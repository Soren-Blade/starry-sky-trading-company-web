<template>
    <div class="apple-id-page">
        <PageHeader title="共享苹果ID" subtitle="浏览最新的共享苹果ID列表，获取更多账号资源" />
        <AppleIdSection />
    </div>
</template>

<script setup>
import PageHeader from '@/components/PageHeader.vue'
import AppleIdSection from '@/components/AppleIdSection.vue'
</script>

<style scoped>
.apple-id-page {
  width: 100%;
  padding-top: var(--navbar-height);
  /* 通过变量给共享的 .page-header 换主题色 */
  --page-header-gradient: var(--gradient-apple);
}
</style>
