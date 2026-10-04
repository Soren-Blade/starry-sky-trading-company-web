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
  {
    path: '/user/kami',
    name: 'kami',
    component: () => import('@/pages/Kami.vue'),
    meta: { title: '卡密管理 - 星辰商行', requiresAuth: true }
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
    } else {
      return { top: 0 }
    }
  }
})

// 路由守卫 - 更新页面标题
router.afterEach((to) => {
  document.title = to.meta.title || '星辰商行'
})

// 路由守卫 - 需要账号登录的页面
// 游客也会拿到 token 与 userInfo，因此不能用「有 userInfo」判断，
// 必须看 user_type 是否为 registered（即 userStore.isLoggedIn）。
// 这里懒加载 store，避免 router 与 store 的循环依赖。
router.beforeEach(async (to) => {
  if (!to.meta.requiresAuth) return true

  const { useUserStore } = await import('@/stores/user')
  const userStore = useUserStore()

  // 首屏可能仍在初始化身份，等一次
  if (!userStore.initialized) {
    await userStore.init()
  }

  if (userStore.isLoggedIn) return true

  const { message } = await import('ant-design-vue')
  message.warning('请先登录账号后再访问卡密管理')

  return { name: 'Home', query: { redirect: to.fullPath } }
})

export default router