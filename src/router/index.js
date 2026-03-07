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

export default router
