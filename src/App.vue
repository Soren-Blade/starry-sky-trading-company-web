<template>
  <div class="app-container">
    <!-- Navigation -->
    <Navbar />

    <!-- Main Content with Router -->
    <main class="main-content">
      <router-view />
    </main>

    <!-- Footer -->
    <Footer />

    <!-- Scroll to Top Button -->
    <button
      v-if="showScrollTop"
      class="scroll-to-top"
      @click="scrollToTop"
      aria-label="Scroll to top"
    >
      ↑
    </button>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { throttle } from '@/utils/index.js'
import Navbar from '@/components/Navbar.vue'
import Footer from '@/components/Footer.vue'
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
  width: 100%;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.main-content {
  flex: 1;
  width: 100%;
}

/* Scroll to Top Button */
.scroll-to-top {
  position: fixed;
  bottom: 30px;
  right: 30px;
  width: 50px;
  height: 50px;
  background: var(--gradient-primary);
  color: white;
  border: none;
  border-radius: 50%;
  font-size: 24px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 8px 24px rgba(138, 109, 255, 0.4);
  transition: all 0.3s ease-in-out;
  z-index: 900;
  animation: slideInUp 0.3s ease-out;
}

.scroll-to-top:hover {
  transform: translateY(-4px);
  box-shadow: 0 12px 32px rgba(138, 109, 255, 0.6);
}

.scroll-to-top:active {
  transform: translateY(0);
}

@keyframes slideInUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* 响应式 */
@media (max-width: 767px) {
  .scroll-to-top {
    width: 44px;
    height: 44px;
    bottom: 20px;
    right: 20px;
    font-size: 20px;
  }
}

@media (max-width: 575px) {
  .scroll-to-top {
    width: 40px;
    height: 40px;
    bottom: 16px;
    right: 16px;
    font-size: 18px;
  }
}
</style>