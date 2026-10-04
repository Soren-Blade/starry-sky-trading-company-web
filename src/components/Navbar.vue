<template>
  <!-- 导航栏容器，根据滚动状态显示底部分隔线 -->
  <header class="navbar" :class="{ 'navbar-scrolled': isScrolled }">
    <div class="navbar-inner">
      <!-- Logo -->
      <router-link to="/home" class="navbar-logo" @click="handleMenuClick">
        <span class="logo-icon" aria-hidden="true">{{ SITE.logo }}</span>
        <span class="logo-text">{{ SITE.name }}</span>
      </router-link>

      <!-- 桌面端导航（≥768px） -->
      <nav class="navbar-menu hide-below-768" :aria-label="SITE.name">
        <ul class="menu-list">
          <li v-for="item in navMenu" :key="item.id">
            <router-link :to="item.path" class="menu-link" @click="handleMenuClick">
              {{ item.label }}
            </router-link>
          </li>
        </ul>
      </nav>

      <!-- 桌面端搜索栏（≥992px） -->
      <div class="navbar-search hide-below-992">
        <SearchBar
          v-model="keyword"
          :label="PRODUCT_GRID.searchPlaceholder"
          :placeholder="PRODUCT_GRID.searchPlaceholder"
          :submit-label="'搜索'"
          @submit="handleSearchSubmit"
        />
      </div>

      <div class="navbar-actions">
        <!-- 样式主题切换（图标按钮 + 弹窗） -->
        <ThemeSwitcher />

        <!-- 未登录（含游客）显示登录入口 -->
        <button v-if="!isLoggedIn" type="button" class="u-cta navbar-auth" @click="openLoginModal">
          登录 / 注册
        </button>

        <!-- 已登录：用户头像与下拉菜单 -->
        <div v-else class="navbar-user">
          <button
            type="button"
            class="user-avatar-btn"
            :aria-label="`打开用户菜单（${nickname || '未设置昵称'}）`"
            :aria-expanded="userMenuOpen"
            @click="toggleUserMenu"
          >
            <img :src="avatarUrl" :alt="nickname || '用户头像'" />
          </button>

          <div v-if="userMenuOpen" class="user-dropdown">
            <div class="user-info">
              <p class="user-name">{{ nickname || '未设置昵称' }}</p>
              <p class="user-since">注册于 {{ toDate(userInfo.created_at) }}</p>
            </div>
            <div class="dropdown-divider"></div>
            <button type="button" class="dropdown-item" @click="handleMyProfile">个人中心</button>
            <button type="button" class="dropdown-item" @click="handleMyFavorites">我的收藏</button>
            <button type="button" class="dropdown-item" @click="handleMyOrders">订单管理</button>
            <router-link class="dropdown-item" to="/user/kami" @click="handleMyKami">
              卡密管理
            </router-link>
            <div class="dropdown-divider"></div>
            <button type="button" class="dropdown-item logout" @click="handleLogout">
              退出登录
            </button>
          </div>
        </div>

        <!-- 移动端菜单切换按钮 -->
        <button
          type="button"
          class="menu-toggle show-mobile"
          :class="{ active: menuOpen }"
          :aria-expanded="menuOpen"
          aria-label="切换导航菜单"
          @click="toggleMenu"
        >
          <span></span>
          <span></span>
          <span></span>
        </button>
      </div>
    </div>

    <!-- 移动端抽屉（含搜索栏，桌面端的搜索栏在小屏收起） -->
    <div class="navbar-drawer show-mobile" :class="{ active: menuOpen }">
      <div class="drawer-search">
        <SearchBar
          v-model="keyword"
          :label="PRODUCT_GRID.searchPlaceholder"
          :placeholder="PRODUCT_GRID.searchPlaceholder"
          :submit-label="'搜索'"
          @submit="handleSearchSubmit"
        />
      </div>
      <ul class="drawer-list">
        <li v-for="item in navMenu" :key="item.id">
          <router-link :to="item.path" class="drawer-link" @click="handleMenuClick">
            {{ item.label }}
          </router-link>
        </li>
      </ul>
    </div>

    <!-- 登录/注册模态框 -->
    <LoginModal
      v-if="showLoginModal"
      @close="handleCloseLoginModal"
      @login-success="handleLoginSuccess"
    />
  </header>
</template>

<script setup>
/**
 * 顶部导航
 *
 * 组成：品牌 + 主导航 + 搜索栏 + 样式主题切换 + 账号入口 + 移动端抽屉。
 *
 * 两个刻意的结构决定：
 *   1. **毛玻璃写在 `.navbar::before` 上，而不是 `.navbar` 本身**。
 *      `backdrop-filter` 会让元素成为 fixed 后代的包含块 —— 写在导航栏上时，
 *      登录弹窗与样式弹窗会被「钉」在导航栏内部（glass 主题下尤其明显）。
 *   2. **搜索关键词直接读写 shop store**。搜索栏与商品网格分处两个组件，
 *      关键词留在组件里就得层层透传事件；匹配规则也只应有一处定义。
 */
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { useRoute, useRouter } from 'vue-router'
import { useUserStore } from '@/stores/user'
import { useShopStore } from '@/stores/shop'
import { throttle } from '@/utils/index.js'
import LoginModal from './LoginModal.vue'
import SearchBar from './SearchBar.vue'
import ThemeSwitcher from './ThemeSwitcher.vue'
import { NAV_MENU, PRODUCT_GRID, SITE } from '@/constants/index.js'
import { toDate } from '@/hooks/useSimpleTimeFormatter/index.js'

const userStore = useUserStore()
const shopStore = useShopStore()
const route = useRoute()
const router = useRouter()

// isLoggedIn 是 getter：只有 user_type === 'registered' 才为 true，
// 游客也会拿到 token，但不应被当作已登录。
const { isLoggedIn, userInfo, nickname, avatarUrl } = storeToRefs(userStore)

// 说明：这里**不**引入 useBodyScroll。
// 滚动锁由 useBodyScroll 内部引用计数管理，LoginModal / ThemeSwitcher 是持有者，
// 它们的卸载与关闭回调会自行释放，无需外部再解锁。

const isScrolled = ref(false)
const menuOpen = ref(false)
const userMenuOpen = ref(false)
const showLoginModal = ref(false)
const navMenu = NAV_MENU

/** 搜索关键词：双向绑定到数据层，商品网格据此过滤 */
const keyword = computed({
  get: () => shopStore.searchKeyword,
  set: (value) => shopStore.setSearchKeyword(value),
})

const handleScroll = throttle(() => {
  isScrolled.value = window.scrollY > 50
}, 100)

const toggleMenu = () => {
  menuOpen.value = !menuOpen.value
}

const handleMenuClick = () => {
  menuOpen.value = false
}

const toggleUserMenu = () => {
  userMenuOpen.value = !userMenuOpen.value
}

/**
 * 提交搜索：若当前页面不展示商品网格，则跳到热门推荐页，
 * 否则原地过滤（关键词已通过 v-model 实时写入 store）。
 */
const handleSearchSubmit = () => {
  menuOpen.value = false
  if (route.name !== 'Home' && route.name !== 'Hot') {
    router.push({ name: 'Hot' })
  }
}

const openLoginModal = () => {
  showLoginModal.value = true
  menuOpen.value = false
}

const handleLoginSuccess = () => {
  showLoginModal.value = false
  userMenuOpen.value = false
  menuOpen.value = false

  // 若因路由守卫被挡回首页，登录成功后回到原目标页
  const redirect = route.query.redirect
  if (typeof redirect === 'string' && redirect.startsWith('/')) {
    router.replace(redirect)
  }
}

const handleCloseLoginModal = () => {
  showLoginModal.value = false
}

// 个人中心 / 我的收藏 / 订单管理 尚未实现，仅关闭菜单
const handleMyProfile = () => {
  userMenuOpen.value = false
}

const handleMyFavorites = () => {
  userMenuOpen.value = false
}

const handleMyOrders = () => {
  userMenuOpen.value = false
}

const handleMyKami = () => {
  userMenuOpen.value = false
}

const handleLogout = async () => {
  await userStore.logout()
  userMenuOpen.value = false
  menuOpen.value = false
}

/**
 * 点击菜单外部时关闭用户下拉与移动端抽屉。
 *
 * 抽屉的判定刻意不用「不在 .navbar 内」：主题切换按钮在抽屉之外、
 * 却在 .navbar 之内，用 .navbar 判断会导致点主题按钮时抽屉不收起。
 */
const closeMenusOnClickOutside = (event) => {
  const target = event.target
  const within = (selector) =>
    typeof target?.closest === 'function' && Boolean(target.closest(selector))

  if (!within('.navbar-user')) userMenuOpen.value = false
  if (!within('.navbar-drawer') && !within('.menu-toggle')) menuOpen.value = false
}

// 身份初始化由 App.vue 统一负责（userStore.init()），此处不重复请求。
onMounted(() => {
  window.addEventListener('scroll', handleScroll)
  document.addEventListener('click', closeMenusOnClickOutside)
})

onUnmounted(() => {
  window.removeEventListener('scroll', handleScroll)
  document.removeEventListener('click', closeMenusOnClickOutside)
})
</script>

<style scoped>
.navbar {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 1000;
  border-bottom: 1px solid transparent;
  transition: border-color var(--transition-surface);
}

/* 表面与毛玻璃层。
 * 放在伪元素上是为了不产生 fixed 后代的包含块（见组件顶部注释）。 */
.navbar::before {
  content: '';
  position: absolute;
  inset: 0;
  z-index: -1;
  background: var(--bg-nav);
  backdrop-filter: var(--nav-backdrop);
  -webkit-backdrop-filter: var(--nav-backdrop);
}

/* 滚动态只强化分隔线，不加阴影 —— 五套规范里导航都不靠投影建立层级 */
.navbar-scrolled {
  border-bottom-color: var(--border);
}

.navbar-inner {
  display: flex;
  align-items: center;
  gap: calc(var(--space-unit) * 2);
  max-width: var(--container-max);
  height: var(--navbar-height);
  margin: 0 auto;
  padding: 0 var(--container-padding);
}

/* ── Logo ───────────────────────────────────────────────── */
.navbar-logo {
  display: flex;
  align-items: center;
  gap: calc(var(--space-unit));
  flex-shrink: 0;
}

.logo-icon {
  font-size: 22px;
  line-height: 1;
  animation: var(--decor-animation);
}

.logo-text {
  font-family: var(--font-display);
  font-size: var(--fs-h3);
  font-weight: var(--fw-display);
  letter-spacing: var(--tracking-display);
  color: var(--text-primary);
  white-space: nowrap;
}

.navbar-logo:hover .logo-text {
  color: var(--accent);
}

/* ── 主导航 ─────────────────────────────────────────────── */
.navbar-menu {
  flex: 1;
  min-width: 0;
}

.menu-list {
  display: flex;
  align-items: center;
  gap: calc(var(--space-unit) * 0.5);
}

.menu-link {
  position: relative;
  display: block;
  padding: calc(var(--space-unit)) calc(var(--space-unit) * 1.25);
  font-size: var(--fs-label);
  font-weight: var(--fw-label);
  letter-spacing: var(--tracking-label);
  text-transform: var(--label-transform);
  color: var(--text-secondary);
  border-radius: var(--radius-btn);
  transition: color var(--transition-interactive);
}

.menu-link:hover {
  color: var(--text-primary);
}

.menu-link::after {
  content: '';
  position: absolute;
  left: 50%;
  bottom: 2px;
  width: 0;
  height: 2px;
  background: var(--accent);
  transform: translateX(-50%);
  transition: width var(--transition-interactive);
}

.menu-link:hover::after,
.menu-link.router-link-active::after {
  width: calc(100% - var(--space-unit) * 2.5);
}

.menu-link.router-link-active {
  color: var(--text-primary);
}

/* ── 搜索栏 ─────────────────────────────────────────────── */
.navbar-search {
  flex: 0 1 260px;
  min-width: 180px;
}

/* ── 操作区 ─────────────────────────────────────────────── */
.navbar-actions {
  display: flex;
  align-items: center;
  gap: calc(var(--space-unit));
  margin-left: auto;
  flex-shrink: 0;
}

.navbar-auth {
  white-space: nowrap;
}

/* ── 用户菜单 ───────────────────────────────────────────── */
.navbar-user {
  position: relative;
}

.user-avatar-btn {
  display: block;
  width: 36px;
  height: 36px;
  overflow: hidden;
  border: 1px solid var(--border-strong);
  border-radius: var(--radius-pill);
  transition: border-color var(--transition-interactive);
}

.user-avatar-btn:hover {
  border-color: var(--accent);
}

.user-avatar-btn img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.user-dropdown {
  position: absolute;
  top: calc(100% + var(--space-unit));
  right: 0;
  width: 220px;
  overflow: hidden;
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  border-radius: var(--radius-panel);
  box-shadow: var(--shadow-elevated);
  animation: enterUp var(--enter-duration) var(--enter-ease) both;
}

.user-info {
  padding: calc(var(--space-unit) * 1.5);
  background: var(--bg-soft);
}

.user-name {
  font-size: var(--fs-sm);
  font-weight: var(--fw-heading);
  color: var(--text-primary);
  margin: 0 0 calc(var(--space-unit) * 0.5);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.user-since {
  font-size: var(--fs-label);
  color: var(--text-muted);
  margin: 0;
}

.dropdown-divider {
  height: 1px;
  background: var(--divider);
}

.dropdown-item {
  display: block;
  width: 100%;
  padding: calc(var(--space-unit) * 1.25) calc(var(--space-unit) * 1.5);
  font-size: var(--fs-sm);
  text-align: left;
  color: var(--text-primary);
  transition: background-color var(--transition-interactive), color var(--transition-interactive);
}

.dropdown-item:hover {
  background: var(--bg-soft);
  color: var(--accent);
}

.dropdown-item.logout {
  color: var(--danger);
}

/* ── 移动端抽屉 ─────────────────────────────────────────── */
.menu-toggle {
  display: none;
  flex-direction: column;
  gap: 5px;
  width: 28px;
  height: 22px;
  flex-shrink: 0;
}

.menu-toggle span {
  display: block;
  width: 100%;
  height: 2px;
  background: var(--text-primary);
  border-radius: 2px;
  transition: transform var(--transition-interactive), opacity var(--transition-interactive);
}

.menu-toggle.active span:nth-child(1) {
  transform: translateY(7px) rotate(45deg);
}

.menu-toggle.active span:nth-child(2) {
  opacity: 0;
}

.menu-toggle.active span:nth-child(3) {
  transform: translateY(-7px) rotate(-45deg);
}

.navbar-drawer {
  position: fixed;
  top: var(--navbar-height);
  left: 0;
  right: 0;
  max-height: calc(100vh - var(--navbar-height));
  overflow-y: auto;
  padding: calc(var(--space-unit) * 2) var(--container-padding) calc(var(--space-unit) * 3);
  background: var(--bg-elevated);
  border-bottom: 1px solid var(--border);
  transform: translateY(-8px);
  opacity: 0;
  visibility: hidden;
  transition:
    transform var(--transition-surface),
    opacity var(--transition-surface),
    visibility var(--transition-surface);
}

.navbar-drawer.active {
  transform: translateY(0);
  opacity: 1;
  visibility: visible;
}

.drawer-search {
  margin-bottom: calc(var(--space-unit) * 2);
}

.drawer-list {
  display: flex;
  flex-direction: column;
}

.drawer-link {
  display: block;
  padding: calc(var(--space-unit) * 1.5) calc(var(--space-unit));
  font-size: var(--fs-body);
  font-weight: var(--fw-label);
  letter-spacing: var(--tracking-label);
  color: var(--text-secondary);
  border-bottom: 1px solid var(--divider);
}

.drawer-link.router-link-active {
  color: var(--accent);
}

/* ── 响应式 ─────────────────────────────────────────────── */
@media (max-width: 991px) {
  .hide-below-992 {
    display: none;
  }

  .navbar-inner {
    gap: calc(var(--space-unit) * 1.5);
    padding: 0 16px;
  }
}

@media (max-width: 767px) {
  .hide-below-768 {
    display: none;
  }

  .menu-toggle {
    display: flex;
  }

  .logo-text {
    font-size: var(--fs-body);
    font-weight: var(--fw-heading);
  }
}

@media (max-width: 575px) {
  .navbar-inner {
    gap: var(--space-unit);
    padding: 0 12px;
  }

  .logo-icon {
    font-size: 18px;
  }

  .navbar-auth {
    padding: calc(var(--space-unit)) calc(var(--space-unit) * 1.25);
    font-size: var(--fs-label);
  }
}
</style>
