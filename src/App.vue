<template>
  <div class="app-container">
    <!-- 顶部导航 -->
    <Navbar />

    <!-- 主内容：给固定顶栏留出高度，页面自身不再各写一份 padding-top -->
    <main class="main-content">
      <router-view />
    </main>

    <!-- 页脚 -->
    <Footer />

    <!-- 回到顶部 -->
    <button
      v-if="showScrollTop"
      type="button"
      class="scroll-to-top"
      aria-label="回到顶部"
      @click="scrollToTop"
    >
      <span aria-hidden="true">↑</span>
    </button>
  </div>
</template>

<script setup>
import { onMounted, onUnmounted, ref } from 'vue'
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
  /* 固定顶栏占位：各页面不再重复声明 */
  padding-top: var(--navbar-height);
}

.scroll-to-top {
  position: fixed;
  right: calc(var(--space-unit) * 3);
  bottom: calc(var(--space-unit) * 3);
  z-index: 900;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  font-size: 18px;
  color: var(--text-on-accent);
  background: var(--accent);
  border-radius: var(--radius-btn);
  box-shadow: var(--shadow-cta);
  transition:
    background-color var(--transition-interactive),
    color var(--transition-interactive),
    transform var(--transition-interactive);
  animation: enterUp var(--enter-duration) var(--enter-ease) both;
}

.scroll-to-top:hover {
  background: var(--accent-strong);
  transform: translateY(-2px);
}

.scroll-to-top:active {
  transform: translateY(0);
}

@media (max-width: 767px) {
  .scroll-to-top {
    right: calc(var(--space-unit) * 2);
    bottom: calc(var(--space-unit) * 2);
    width: 40px;
    height: 40px;
    font-size: 16px;
  }
}
</style>
