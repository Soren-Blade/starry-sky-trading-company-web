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

onMounted(async () => {
  window.addEventListener('scroll', handleScroll)

  // 身份初始化（游客登录或复用本地 token）必须**先于**商品数据初始化。
  //
  // 这里此前是并行执行的，注释还写着「两者互不依赖」—— 实际上商品接口要鉴权，
  // 冷启动（新浏览器、无 token）时两者赛跑：商品请求往往先发出，于是 401 →
  // 刷新 token 也失败 → 触发 main.js 的「登录态失效」回调 → `router.replace({name:'Home'})`。
  // 结果是**深链访问任何页面都会被悄悄带回首页**（实测 /tool 会渲染成首页）。
  // 串行之后商品请求一定带着刚拿到的游客 token 发出。
  await userStore.init()
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
