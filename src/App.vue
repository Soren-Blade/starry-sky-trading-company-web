<template>
  <div class="app-container">
    <!-- 顶部导航（position: sticky，参与文档流，因此主内容不再需要顶栏占位） -->
    <Navbar />

    <!-- 主内容 -->
    <main class="main-content">
      <router-view />
    </main>

    <!-- 页脚 -->
    <Footer />

    <!-- 回到顶部 -->
    <button
      v-if="showScrollTop"
      type="button"
      class="u-icon-btn scroll-to-top"
      aria-label="回到顶部"
      @click="scrollToTop"
    >
      <span aria-hidden="true">↑</span>
    </button>

    <!-- 提示框宿主：全站唯一的 Toast 渲染出口 -->
    <ToastHost />
  </div>
</template>

<script setup>
import { onMounted, onUnmounted, ref } from 'vue'
import { throttle } from '@/utils/index.js'
import Navbar from '@/components/Navbar.vue'
import Footer from '@/components/Footer.vue'
import ToastHost from '@/components/ToastHost.vue'
// 全局状态
import { useShopStore } from '@/stores/shop'
import { useUserStore } from '@/stores/user'

const shopStore = useShopStore()
const userStore = useUserStore()

const showScrollTop = ref(false)

const handleScroll = throttle(() => {
  showScrollTop.value = window.scrollY > 300
}, 100)

const scrollToTop = () => {
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

onMounted(() => {
  window.addEventListener('scroll', handleScroll)

  // 身份初始化（游客登录或复用本地 token）与商品数据初始化。
  // 两者互不依赖，并行执行；失败不阻塞页面渲染。
  //
  // 主题初始化**不在这里**：它必须在首屏渲染前完成，见 main.js ——
  // 放到 onMounted 会让用户先看到默认主题闪一下。
  userStore.init()
  shopStore.init()
})

onUnmounted(() => {
  window.removeEventListener('scroll', handleScroll)
})
</script>

<style scoped>
.app-container {
  position: relative;
  display: flex;
  flex-direction: column;
  width: 100%;
  min-height: 100vh;
}

.main-content {
  flex: 1;
  width: 100%;
}

/* 悬浮在内容之上，但不遮挡弹窗（modal 2000 / toast 3000） */
.scroll-to-top {
  position: fixed;
  right: calc(var(--space-unit) * 3);
  bottom: calc(var(--space-unit) * 3);
  z-index: 900;
  animation: enterUp var(--enter-duration) var(--enter-ease) both;
}

@media (max-width: 767px) {
  .scroll-to-top {
    right: calc(var(--space-unit) * 2);
    bottom: calc(var(--space-unit) * 2);
  }
}
</style>
