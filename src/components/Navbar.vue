<template>
  <!-- 导航栏容器，根据滚动状态添加样式类 -->
  <header class="navbar" :class="{ 'navbar-scrolled': isScrolled }">
    <div class="navbar-container">
      <!-- Logo 区域 -->
      <div class="navbar-logo">
        <span class="logo-icon" aria-hidden="true">⭐</span>
        <span class="logo-text">星辰商行</span>
      </div>

      <!-- 移动端菜单切换按钮（汉堡菜单） -->
      <button
        class="menu-toggle show-mobile"
        :class="{ active: menuOpen }"
        @click="toggleMenu"
        aria-label="切换导航菜单"
        :aria-expanded="menuOpen"
      >
        <span></span>
        <span></span>
        <span></span>
      </button>

      <!-- 导航菜单 -->
      <nav class="navbar-menu" :class="{ active: menuOpen }">
        <ul class="menu-list">
          <li v-for="item in navMenu" :key="item.id" class="menu-item">
            <router-link :to="item.path" class="menu-link" @click="handleMenuClick">
              {{ item.label }}
            </router-link>
          </li>
        </ul>
      </nav>

      <!-- 未登录（含游客）显示登录入口 -->
      <button v-if="!isLoggedIn" class="auth-btn login-btn" @click="openLoginModal">
        登录/注册
      </button>

      <!-- 已登录：用户头像与下拉菜单 -->
      <div v-else class="navbar-actions">
        <div class="user-menu-container">
          <button class="user-avatar-btn" @click="toggleUserMenu" aria-label="打开用户菜单">
            <img :src="avatarUrl" :alt="nickname || '用户头像'" />
          </button>

          <div v-if="userMenuOpen" class="user-dropdown">
            <div class="user-info">
              <p class="user-name">{{ nickname || '未设置昵称' }}</p>
              <p class="created_time">{{ toDate(userInfo.created_at) }}</p>
            </div>
            <div class="dropdown-divider"></div>
            <button class="dropdown-item" @click="handleMyProfile">个人中心</button>
            <button class="dropdown-item" @click="handleMyFavorites">我的收藏</button>
            <button class="dropdown-item" @click="handleMyOrders">订单管理</button>
            <router-link class="dropdown-item" to="/user/kami" @click="handleMyKami">
              卡密管理
            </router-link>
            <div class="dropdown-divider"></div>
            <button class="dropdown-item logout" @click="handleLogout">退出登录</button>
          </div>
        </div>
      </div>
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
import { ref, onMounted, onUnmounted } from 'vue'
import { storeToRefs } from 'pinia'
import { useRoute, useRouter } from 'vue-router'
import { useUserStore } from '@/stores/user'
import { throttle } from '@/utils/index.js'
import LoginModal from './LoginModal.vue'
import { NAV_MENU } from '@/constants/index.js'
import { toDate } from '@/hooks/useSimpleTimeFormatter/index.js'

// ============ 状态管理 ============

const userStore = useUserStore()
const route = useRoute()
const router = useRouter()
// isLoggedIn 是 getter：只有 user_type === 'registered' 才为 true，
// 游客也会拿到 token，但不应被当作已登录。
const { isLoggedIn, userInfo, nickname, avatarUrl } = storeToRefs(userStore)

// 说明：这里**不再**引入 useBodyScroll。
// 早期版本只取了 enableScroll 并在关闭登录弹窗时调用它，但 Navbar 自己
// 从未调用 disableScroll —— 属于「无主释放」。滚动锁现在由 useBodyScroll
// 内部引用计数管理，登录弹窗（LoginModal）是唯一的持有者，
// 它的卸载回调会自行释放，无需外部再解锁。

const isScrolled = ref(false)
const menuOpen = ref(false)
const userMenuOpen = ref(false)
const showLoginModal = ref(false)
const navMenu = NAV_MENU

// ============ 滚动 ============

const handleScroll = throttle(() => {
  isScrolled.value = window.scrollY > 50
}, 100)

// ============ 菜单控制 ============

const toggleMenu = () => {
  menuOpen.value = !menuOpen.value
}

const handleMenuClick = () => {
  menuOpen.value = false
}

const toggleUserMenu = () => {
  userMenuOpen.value = !userMenuOpen.value
}

// ============ 登录相关 ============

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

// ============ 用户菜单项 ============
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

// 点击菜单外部时关闭用户下拉与移动端菜单
const closeMenusOnClickOutside = (event) => {
  if (!event.target.closest('.navbar-actions')) {
    userMenuOpen.value = false
  }
  if (!event.target.closest('.navbar')) {
    menuOpen.value = false
  }
}

// ============ 生命周期 ============
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
/* ============ 导航栏主容器 ============ */
.navbar {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 1000;
  background: var(--glass-effect);
  backdrop-filter: var(--glass-backdrop);
  border-bottom: 1px solid rgba(0, 0, 0, 0.05);
  transition: var(--transition-base);
  box-shadow: 0 0 0 rgba(0, 0, 0, 0);
}

.navbar-scrolled {
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
  background: rgba(255, 255, 255, 0.98);
}

.navbar-container {
  max-width: var(--container-max);
  margin: 0 auto;
  padding: 0 var(--container-padding);
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: var(--navbar-height);
}

/* ============ Logo ============ */
.navbar-logo {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  user-select: none;
  flex-shrink: 0;
}

.logo-icon {
  font-size: 28px;
  animation: float 3s ease-in-out infinite;
}

.logo-text {
  font-size: 20px;
  font-weight: 700;
  background: var(--gradient-primary);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  letter-spacing: 0.5px;
}

/* ============ 导航菜单 ============ */
.navbar-menu {
  display: flex;
  align-items: center;
  flex: 1;
  margin: 0 40px;
}

.menu-list {
  margin: 0;
  display: flex;
  align-items: center;
  gap: 0;
  list-style: none;
}

.menu-item {
  position: relative;
}

.menu-link {
  display: block;
  padding: 8px 16px;
  color: var(--color-dark);
  font-weight: 500;
  position: relative;
  transition: color var(--transition-base);
}

.menu-link::after {
  content: '';
  position: absolute;
  bottom: 5px;
  left: 50%;
  width: 0;
  height: 2px;
  background: var(--gradient-primary);
  transform: translateX(-50%);
  transition: width var(--transition-base);
}

.menu-link:hover {
  color: var(--color-primary);
}

.menu-link:hover::after {
  width: 30px;
}

/* ============ 用户操作区 ============ */
.navbar-actions {
  display: flex;
  align-items: center;
  gap: 16px;
  flex-shrink: 0;
}

.login-btn,
.auth-btn {
  padding: 10px 24px;
  background: var(--gradient-primary);
  color: #fff;
  border-radius: var(--radius-sm);
  font-weight: 600;
  transition: var(--transition-base);
  cursor: pointer;
}

.login-btn:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-primary);
}

/* ============ 用户菜单 ============ */
.user-menu-container {
  position: relative;
}

.user-avatar-btn {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  overflow: hidden;
  cursor: pointer;
  border: 2px solid var(--color-primary);
  transition: var(--transition-base);
  padding: 0;
  background: none;
}

.user-avatar-btn img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.user-avatar-btn:hover {
  transform: scale(1.05);
  box-shadow: var(--shadow-primary);
}

.user-dropdown {
  position: absolute;
  top: 100%;
  right: 0;
  margin-top: 12px;
  width: 240px;
  background: #fff;
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-lg);
  overflow: hidden;
  animation: fadeInScale var(--transition-base);
}

.user-info {
  padding: 16px;
  text-align: center;
  background: linear-gradient(
    135deg,
    rgba(138, 109, 255, 0.1) 0%,
    rgba(253, 121, 168, 0.1) 100%
  );
}

.user-name {
  font-weight: 600;
  color: var(--color-dark);
  margin-bottom: 4px;
}

.created_time {
  font-size: 14px;
  color: var(--color-muted);
  margin: 0;
}

.dropdown-divider {
  height: 1px;
  background: rgba(0, 0, 0, 0.08);
}

.dropdown-item {
  display: block;
  width: 100%;
  padding: 12px 16px;
  text-align: left;
  background: none;
  border: none;
  color: var(--color-dark);
  cursor: pointer;
  font-size: 14px;
  text-decoration: none;
  transition: var(--transition-fast);
}

.dropdown-item:hover {
  background: rgba(138, 109, 255, 0.08);
  color: var(--color-primary);
  padding-left: 20px;
}

.dropdown-item.logout {
  color: #ff6b6b;
}

.dropdown-item.logout:hover {
  background: rgba(255, 107, 107, 0.08);
  color: #ff6b6b;
}

/* ============ 移动端菜单 ============ */
.menu-toggle {
  display: none;
  flex-direction: column;
  gap: 5px;
  width: 28px;
  height: 24px;
  background: none;
  border: none;
  cursor: pointer;
  z-index: 1001;
}

.menu-toggle span {
  width: 28px;
  height: 2px;
  background: var(--color-dark);
  border-radius: 2px;
  transition: var(--transition-base);
}

.menu-toggle.active span:nth-child(1) {
  transform: rotate(45deg) translateY(11px);
}

.menu-toggle.active span:nth-child(2) {
  opacity: 0;
}

.menu-toggle.active span:nth-child(3) {
  transform: rotate(-45deg) translateY(-11px);
}

/* ============ 响应式 ============ */
@media (max-width: 1199px) {
  .navbar-container {
    height: 60px;
    padding: 0 16px;
  }

  .navbar-menu {
    margin: 0 20px;
  }

  .logo-text {
    font-size: 18px;
  }

  .menu-link {
    padding: 8px 12px;
  }
}

@media (max-width: 767px) {
  .navbar-container {
    height: 56px;
  }

  .navbar-logo {
    gap: 6px;
    order: 0;
  }

  .logo-icon {
    font-size: 24px;
  }

  .logo-text {
    font-size: 16px;
  }

  .menu-toggle {
    display: flex;
    order: -1;
  }

  .navbar-actions,
  .auth-btn {
    order: 1;
  }

  .navbar-menu {
    order: 2;
    position: fixed;
    top: 56px;
    left: 0;
    right: 0;
    background: #fff;
    flex-direction: column;
    margin: 0;
    padding: 16px 0;
    border-bottom: 1px solid rgba(0, 0, 0, 0.08);
    max-height: calc(100vh - 56px);
    overflow-y: auto;
    transform: translateX(-100%);
    transition: transform var(--transition-base);
    z-index: 999;
  }

  .navbar-menu.active {
    transform: translateX(0);
  }

  .menu-list {
    flex-direction: column;
    width: 100%;
    gap: 0;
  }

  .menu-item {
    width: 100%;
  }

  .menu-link {
    display: block;
    padding: 12px 20px;
    border-left: 4px solid transparent;
    transition: var(--transition-base);
  }

  .menu-link::after {
    display: none;
  }

  .menu-link:hover {
    background: rgba(138, 109, 255, 0.08);
    border-left-color: var(--color-primary);
    padding-left: 24px;
  }

  .navbar-actions {
    gap: 8px;
  }

  .login-btn {
    padding: 8px 16px;
    font-size: 14px;
  }

  .user-avatar-btn {
    width: 40px;
    height: 40px;
  }

  .user-dropdown {
    width: 200px;
  }
}

@media (max-width: 575px) {
  .navbar-container {
    height: 52px;
  }

  .logo-text {
    font-size: 14px;
  }

  .navbar-actions {
    gap: 4px;
  }

  .login-btn {
    padding: 6px 12px;
    font-size: 12px;
  }

  .user-avatar-btn {
    width: 36px;
    height: 36px;
  }

  .user-dropdown {
    width: 180px;
  }
}
</style>
