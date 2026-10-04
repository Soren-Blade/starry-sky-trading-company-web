<template>
  <!--
    启动遮罩放在 .app-container **外面**：这样可以对整个应用壳加 inert，
    让遮罩期间的 Tab 键不会跑到底下那层还没就绪的界面上。
  -->
  <div class="app-container" :inert="booting">
    <!--
      路由切换进度条：细窄一条钉在顶部，不遮挡内容。
      覆盖的是「点了导航但界面还没换」的那段窗口 —— 分包懒加载时旧页面会多停留
      一会儿，没有这条线的话用户会以为没点上。
    -->
    <div
      v-if="routeLoading && !showBoot"
      class="route-progress"
      role="progressbar"
      :aria-label="BOOT.routeLoading"
    >
      <span class="route-progress-bar" aria-hidden="true"></span>
    </div>

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

  <!--
    首屏启动遮罩：盖住「身份还没解析出来」的那段空白。
    刷新时必须先拿到身份（复用 token 或建游客）才知道顶栏该显示头像还是登录按钮，
    Vercel 上这一步可能到几秒 —— 期间页面是「顶栏 + 空白内容」，看起来像坏了。

    出现时机由 useBootScreen 控制（延迟出现 + 最短停留 + 最长等待），
    请求快的时候全程看不到它。z-index 压在 toast 之下，
    这样启动期间的告警（如「登录状态已失效」）仍然看得见。
  -->
  <Transition name="boot">
    <div v-if="showBoot" class="boot-screen" role="status" aria-live="polite">
      <div class="boot-inner">
        <span class="boot-mark" aria-hidden="true">✦</span>
        <p class="boot-brand">{{ SITE.name }}</p>
        <span class="u-spinner u-spinner--lg" aria-hidden="true"></span>
        <p class="boot-text">{{ BOOT.text }}</p>
      </div>
    </div>
  </Transition>
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
// 首屏加载与路由进度
import { useBootScreen } from '@/hooks/useBootScreen'
import { useRouteLoading } from '@/hooks/useRouteLoading'
import { BOOT, SITE } from '@/constants/index.js'

const shopStore = useShopStore()
const userStore = useUserStore()
const cartStore = useCartStore()
const favoriteStore = useFavoriteStore()
const route = useRoute()
const router = useRouter()

/** 启动阶段（身份 + 首次路由就位之前），整个应用壳 inert */
const booting = ref(true)
/** 遮罩是否真的显示（延迟出现 + 最短停留，见 useBootScreen） */
const { visible: showBoot, start: startBoot, finish: finishBoot } = useBootScreen()
const { loading: routeLoading } = useRouteLoading()

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
  startBoot()

  try {
    // 身份初始化（游客登录或复用本地 token）必须**先于**商品数据初始化。
    //
    // 这里此前是并行执行的，注释还写着「两者互不依赖」—— 实际上商品接口要鉴权，
    // 冷启动（新浏览器、无 token）时两者赛跑：商品请求往往先发出，于是 401 →
    // 刷新 token 也失败 → 触发 main.js 的「登录态失效」回调 → `router.replace({name:'Home'})`。
    // 结果是**深链访问任何页面都会被悄悄带回首页**（实测 /tool 会渲染成首页）。
    // 串行之后商品请求一定带着刚拿到的游客 token 发出。
    await userStore.init()

    // 路由就位再收遮罩：懒加载的首屏分包也要算进启动时间，
    // 否则遮罩撤了、router-view 还是空的。
    await router.isReady()
  } finally {
    // 即使 init 内部抛错（它自己会兜住，这里是双保险）也要放行，
    // 绝不能让遮罩留在屏幕上
    booting.value = false
    finishBoot()
  }

  // 商品数据**不阻塞启动**：它有骨架屏，边渲染边加载的观感好过一个全屏遮罩。
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

/* ── 路由切换进度条 ──────────────────────────────────────────
 * 不定长进度：细条从左往右反复推进，表达「正在进行」而不是「完成了多少」。
 * 钉在视口顶部，不占据文档流（否则每次导航都会把内容顶下去几像素）。
 *
 * 层级：顶栏 100 < 进度条 950 < 模态 2000 < 启动遮罩 2500 < toast 3000。
 *
 * 时长复用 --spinner-duration：它是本设计体系里「不定长活动」的时长档。
 * 不新增专用令牌是因为令牌必须同时进 presets.js 才有五套风格的值，
 * 为一个装饰性动效增加一处需要同步维护的令牌不划算。 */
.route-progress {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 950;
  height: var(--progress-height);
  overflow: hidden;
  background: var(--progress-track);
}

.route-progress-bar {
  display: block;
  width: 40%;
  height: 100%;
  background: var(--accent);
  border-radius: var(--progress-radius);
  animation: routeProgress var(--spinner-duration) var(--skeleton-easing) infinite;
}

@keyframes routeProgress {
  from {
    transform: translateX(-100%);
  }
  to {
    transform: translateX(250%);
  }
}

/* ── 首屏启动遮罩 ────────────────────────────────────────────
 * z-index 2500：压在弹窗（2000）之上，但**低于 toast（3000）** ——
 * 启动期间若触发「登录状态已失效」之类的告警，用户必须看得见。
 * 背景用页面底色而不是半透明：遮罩期间底下那层还没渲染好，
 * 透出来反而是「顶栏 + 空白」那种坏观感。 */
.boot-screen {
  position: fixed;
  inset: 0;
  z-index: 2500;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg-page);
}

.boot-inner {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: calc(var(--space-unit) * 1.5);
  padding: var(--container-padding);
  text-align: center;
}

.boot-mark {
  font-size: var(--fs-h1);
  line-height: 1;
  color: var(--accent);
}

.boot-brand {
  margin: 0;
  font-size: var(--fs-h3);
  font-weight: var(--fw-heading);
  color: var(--text-primary);
}

.boot-text {
  margin: 0;
  font-size: var(--fs-sm);
  color: var(--text-muted);
}

/* 淡入淡出。遮罩本身已经由 useBootScreen 保证了最短停留时间，
 * 这里的过渡只是让出现与消失不硌眼。 */
.boot-enter-active,
.boot-leave-active {
  transition: opacity var(--transition-surface);
}

.boot-enter-from,
.boot-leave-to {
  opacity: 0;
}

/* 尊重「减少动态效果」：进度条与遮罩都改成静态，
 * 旋转的 spinner 也停下（全局没有兜底的降级规则，因此在这里显式声明） */
@media (prefers-reduced-motion: reduce) {
  .route-progress-bar {
    width: 100%;
    animation: none;
  }

  .boot-enter-active,
  .boot-leave-active {
    transition: none;
  }

  .boot-inner :deep(.u-spinner) {
    animation: none;
  }
}

@media (max-width: 767px) {
  .scroll-to-top {
    right: calc(var(--space-unit) * 2);
    bottom: calc(var(--space-unit) * 2);
  }
}
</style>
