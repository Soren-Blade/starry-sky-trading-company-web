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

    <!--
      登录 / 注册弹窗：全站唯一实例，挂在根部而不是 Navbar 里。
      因为拉起它的入口不止顶栏一个 —— 下单、加购、收藏、路由守卫都会调
      `userStore.openLoginModal()`。放在 Navbar 内部，其它组件就只能各开一个实例。
    -->
    <LoginModal
      v-if="userStore.loginModalOpen"
      @close="userStore.closeLoginModal()"
      @login-success="handleLoginSuccess"
    />

    <!-- 提示框宿主：全站唯一的 Toast 渲染出口 -->
    <ToastHost />
  </div>
</template>

<script setup>
import { onMounted, onUnmounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { throttle } from '@/utils/index.js'
import Navbar from '@/components/Navbar.vue'
import Footer from '@/components/Footer.vue'
import ToastHost from '@/components/ToastHost.vue'
import LoginModal from '@/components/LoginModal.vue'
// 全局状态
import { useShopStore } from '@/stores/shop'
import { useUserStore } from '@/stores/user'
import { useCartStore } from '@/stores/cart'
import { useFavoriteStore } from '@/stores/favorite'

const shopStore = useShopStore()
const userStore = useUserStore()
const cartStore = useCartStore()
const favoriteStore = useFavoriteStore()
const route = useRoute()
const router = useRouter()

const showScrollTop = ref(false)

const handleScroll = throttle(() => {
  showScrollTop.value = window.scrollY > 300
}, 100)

const scrollToTop = () => {
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

/**
 * 登录成功后的收尾。
 *
 * 除了关弹窗，还要：
 *   1. 按当前账号重新拉购物车与收藏（登录前这两处是空的，或工具收藏在 localStorage）；
 *   2. 若之前被路由守卫挡回首页，回到原目标页。
 */
const handleLoginSuccess = async () => {
  userStore.closeLoginModal()

  await Promise.all([cartStore.fetch({ silent: true }), favoriteStore.load(true)])

  const redirect = route.query.redirect
  if (typeof redirect === 'string' && redirect.startsWith('/')) {
    router.replace(redirect)
  }
}

/**
 * 账号切换（登录 / 登出 / 换号）时重置并重新加载账号级数据。
 *
 * 侦测点用 `userId` 而不是 `isLoggedIn`：登录前后**游客也有 id**，
 * 而从「游客 A」切到「注册用户 B」时两份购物车是完全不同的数据，
 * 必须都跟着 id 变，否则 B 会看到 A 的车。
 */
watch(
  () => userStore.userId,
  async (id, previous) => {
    if (id === previous) return

    cartStore.reset()
    favoriteStore.reset()

    if (userStore.isLoggedIn) {
      await Promise.all([cartStore.fetch({ silent: true }), favoriteStore.load(true)])
    }
  }
)

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

  // 购物车与收藏是账号级数据，必须在身份就绪之后再取。
  // 游客态下 /cartApi 会返回 403，store 会翻译成 needLogin；
  // 这里只在已登录时请求，首屏不因为「没登录」而发无谓的请求。
  if (userStore.isLoggedIn) {
    cartStore.fetch({ silent: true })
    favoriteStore.load()
  }
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
