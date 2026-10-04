import { createRouter, createWebHistory } from 'vue-router'

const routes = [
  {
    path: '/home',
    name: 'Home',
    component: () => import('@/pages/Home.vue'),
    meta: { title: '首页 - 星辰商行' }
  },
  {
    path: '/categories',
    name: 'Categories',
    component: () => import('@/pages/Categories.vue'),
    meta: { title: '商品分类 - 星辰商行' }
  },
  {
    path: '/hot',
    name: 'Hot',
    component: () => import('@/pages/Hot.vue'),
    meta: { title: '热门推荐 - 星辰商行' }
  },
  {
    path: '/tool',
    name: 'Tool',
    component: () => import('@/pages/Tool.vue'),
    meta: { title: '工具分类 - 星辰商行' },
  },
  {
    path: '/about',
    name: 'About',
    component: () => import('@/pages/About.vue'),
    meta: { title: '关于我们 - 星辰商行' }
  },
  // ── 商品线 ────────────────────────────────────────────────────
  {
    path: '/product/:id',
    name: 'ProductDetail',
    component: () => import('@/pages/ProductDetail.vue'),
    meta: { title: '商品详情 - 星辰商行' }
  },
  {
    path: '/category/:id',
    name: 'CategoryDetail',
    component: () => import('@/pages/CategoryDetail.vue'),
    meta: { title: '分类商品 - 星辰商行' }
  },
  {
    path: '/cart',
    name: 'Cart',
    component: () => import('@/pages/Cart.vue'),
    meta: { title: '购物车 - 星辰商行' }
  },
  // ── 账户线 ────────────────────────────────────────────────────
  {
    path: '/user/kami',
    name: 'kami',
    component: () => import('@/pages/Kami.vue'),
    meta: { title: '卡密管理 - 星辰商行', requiresAuth: true }
  },
  {
    path: '/user/profile',
    name: 'Profile',
    component: () => import('@/pages/Profile.vue'),
    meta: { title: '个人中心 - 星辰商行', requiresAuth: true }
  },
  {
    path: '/user/favorites',
    name: 'Favorites',
    component: () => import('@/pages/Favorites.vue'),
    meta: { title: '我的收藏 - 星辰商行', requiresAuth: true }
  },
  {
    path: '/user/orders',
    name: 'Orders',
    component: () => import('@/pages/Orders.vue'),
    meta: { title: '订单管理 - 星辰商行', requiresAuth: true }
  },
  {
    path: '/user/orders/:orderNo',
    name: 'OrderDetail',
    component: () => import('@/pages/OrderDetail.vue'),
    meta: { title: '订单详情 - 星辰商行', requiresAuth: true }
  },
  // ── 工具页 ────────────────────────────────────────────────────
  {
    path: '/other/2fa',
    name: '2fa',
    component: () => import('@/pages/2FA.vue'),
    meta: { title: '2FA - 星辰商行' }
  },
  {
    path: '/other/appleId',
    name: 'appleId',
    component: () => import('@/pages/AppleId.vue'),
    meta: { title: 'appleId - 星辰商行' }
  },
  // ── 法务页（三页共用一个组件，由 meta.legalKey 选内容）───────
  {
    path: '/terms',
    name: 'Terms',
    component: () => import('@/pages/Legal.vue'),
    meta: { title: '用户协议 - 星辰商行', legalKey: 'terms' }
  },
  {
    path: '/privacy',
    name: 'Privacy',
    component: () => import('@/pages/Legal.vue'),
    meta: { title: '隐私政策 - 星辰商行', legalKey: 'privacy' }
  },
  {
    path: '/rules',
    name: 'Rules',
    component: () => import('@/pages/Legal.vue'),
    meta: { title: '平台规则 - 星辰商行', legalKey: 'rules' }
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'NotFound',
    component: () => import('@/pages/NotFound.vue'),
    meta: { title: '页面未找到 - 星辰商行' }
  },
  // 重定向 在项目跑起来的时候 访问“/”的时候 定位在主页
  {
    path: '/',
    redirect: '/home'
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior(to, from, savedPosition) {
    if (savedPosition) {
      return savedPosition
    } else if (to.hash) {
      // 锚点跳转（如页脚的「联系我们」→ /about#about-contact）。
      // 不处理 hash 的话会永远滚到顶部，锚点等于失效。
      return { el: to.hash, behavior: 'smooth', top: 80 }
    } else {
      return { top: 0 }
    }
  }
})

// 路由守卫 - 更新页面标题
router.afterEach((to) => {
  document.title = to.meta.title || '星辰商行'
})

// 路由守卫 - 任何页面都先确保身份就绪，再判断是否需要账号登录。
//
// 身份必须**先于路由组件挂载**完成：商品/工具/卡密等接口都要鉴权，而组件在
// onMounted 里立刻发请求。若此时还没有游客 token，请求会 401 → 刷新失败 →
// 触发「登录态失效」回调 → 被 `router.replace({ name: 'Home' })` 带回首页，
// 表现就是深链访问任何页面都静默变成首页（实测冷启动访问 /tool 会渲染成首页）。
//
// 初始化本身是幂等的（user.js 的 init() 用共享 Promise 合并并发调用），
// 而 App.vue 在 onMounted 里已经先发起了一次，所以这里通常只是等那个 Promise。
// 这里懒加载 store，避免 router 与 store 的循环依赖。
router.beforeEach(async (to) => {
  const { useUserStore } = await import('@/stores/user')
  const userStore = useUserStore()

  if (!userStore.initialized) {
    await userStore.init()
  }

  if (!to.meta.requiresAuth) return true

  if (userStore.isLoggedIn) return true

  // 不只弹提示：直接**把登录弹窗打开**，并把原目标记在 query 里。
  // 只提示不打开弹窗的话，用户还得自己找到右上角的登录入口。
  userStore.openLoginModal('请先登录账号后再访问该页面')

  return { name: 'Home', query: { redirect: to.fullPath } }
})

export default router
