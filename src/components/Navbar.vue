<template>
  <!-- 导航栏容器，根据滚动状态添加样式类 -->
  <header class="navbar" :class="{ 'navbar-scrolled': isScrolled }">
    <div class="navbar-container">
      <!-- Logo 区域 -->
      <div class="navbar-logo">
        <span class="logo-icon">⭐</span>
        <span class="logo-text">星辰商行</span>
      </div>

      <!-- 移动端菜单切换按钮（汉堡菜单） -->
      <button
        class="menu-toggle show-mobile"
        :class="{ active: menuOpen }"
        @click="toggleMenu"
        aria-label="Toggle navigation menu"
      >
        <span></span>
        <span></span>
        <span></span>
      </button>

      <!-- 导航菜单 -->
      <nav class="navbar-menu" :class="{ active: menuOpen }">
        <ul class="menu-list">
          <!-- 根据常量数据循环渲染菜单项 -->
          <li v-for="item in navMenu" :key="item.id" class="menu-item">
            <router-link
              :to="item.path"
              class="menu-link"
              @click="handleMenuClick"
            >
              {{ item.label }}
            </router-link>
          </li>
        </ul>
      </nav>

      <!-- Auth Button -->
      <button
        v-if="!isLoggedIn"
        class="auth-btn login-btn"
        @click="openLoginModal"
      >
        登录/注册
      </button>
      <!-- 用户操作区 -->
      <div v-else class="navbar-actions">
        <!-- 显示用户头像和下拉菜单 -->
        <div class="user-menu-container">
          <button class="user-avatar-btn" @click="toggleUserMenu">
            <img
              :src="userInfo.avatar_url"
              :alt="userStore.nickname"
            />
          </button>
          <!-- 用户下拉菜单 -->
          <div v-if="userMenuOpen" class="user-dropdown">
            <div class="user-info">
              <p class="user-name">{{ userInfo.nickname }}</p>
              <p class="created_time">
                {{ toDate(userInfo.created_at) }}
              </p>
            </div>
            <div class="dropdown-divider"></div>
            <button class="dropdown-item" @click="handleMyProfile">
              个人中心
            </button>
            <button class="dropdown-item" @click="handleMyFavorites">
              我的收藏
            </button>
            <button class="dropdown-item" @click="handleMyOrders">
              订单管理
            </button>
            <div class="dropdown-divider"></div>
            <button class="dropdown-item logout" @click="handleLogout">
              退出登录
            </button>
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
// Vue 3 组件生命周期和响应式导入
import { ref, onMounted, onUnmounted } from "vue";
// 
import { storeToRefs } from 'pinia'
// 用户状态管理存储
import { useUserStore } from "@/stores/user";
// 节流工具函数，用于优化滚动事件性能
import { throttle } from "@/utils/index.js";
// 禁用/启用页面滚动的 Hook（模态框打开时禁用）
import { useBodyScroll } from "@/hooks/useBodyScroll/useBodyScroll";
// 登录/注册模态框组件
import LoginModal from "./LoginModal.vue";
// 导航菜单数据常量
import { NAV_MENU } from "@/constants/index.js";
// 使用示例
import { toDate } from "@/hooks/useSimpleTimeFormatter/index.js";

// ============ 状态管理 ============

// 用户存储实例
const userStore = useUserStore();

const { isLoggedIn, userInfo } = storeToRefs(userStore)

// 页面滚动相关状态
const { enableScroll } = useBodyScroll();

// 响应式状态变量
const isScrolled = ref(false); // 是否滚动
const menuOpen = ref(false); // 菜单是否打开
const userMenuOpen = ref(false); // 用户下拉菜单是否打开
const showLoginModal = ref(false); // 登录模态框是否显示
const navMenu = NAV_MENU; // 导航菜单数据

// ============ 滚动事件处理 ============

/**
 * 处理窗口滚动事件（使用节流优化性能）
 * 当滚动距离超过 50px 时，添加导航栏阴影效果
 */
const handleScroll = throttle(() => {
  isScrolled.value = window.scrollY > 50;
}, 100);

// ============ 菜单控制 ============

/**
 * 切换移动端菜单的打开/关闭状态
 */
const toggleMenu = () => {
  menuOpen.value = !menuOpen.value;
};

/**
 * 菜单项点击处理，关闭菜单
 */
const handleMenuClick = () => {
  menuOpen.value = false;
};

/**
 * 切换用户下拉菜单的打开/关闭状态
 */
const toggleUserMenu = () => {
  userMenuOpen.value = !userMenuOpen.value;
};

// ============ 登录相关 ============

/**
 * 打开登录/注册模态框
 */
const openLoginModal = () => {
  showLoginModal.value = true;
  menuOpen.value = false;
};

/**
 * 关闭模态框和菜单，恢复页面滚动
 */
const handleLoginSuccess = (username) => {
  showLoginModal.value = false;
  enableScroll();
  userMenuOpen.value = false;
  menuOpen.value = false;
};

/**
 * 关闭登录模态框
 * 恢复页面滚动
 */
const handleCloseLoginModal = () => {
  showLoginModal.value = false;
  enableScroll();
};

// ============ 用户菜单项处理 ============

/**
 * 个人中心按钮点击处理
 * TODO: 实现跳转个人中心页面
 */
const handleMyProfile = () => {
  userMenuOpen.value = false;
};

/**
 * 我的收藏按钮点击处理
 * TODO: 实现跳转收藏页面
 */
const handleMyFavorites = () => {
  userMenuOpen.value = false;
};

/**
 * 订单管理按钮点击处理
 * TODO: 实现跳转订单页面
 */
const handleMyOrders = () => {
  userMenuOpen.value = false;
};

/**
 * 退出登录处理
 * 调用 Store 的 logout 方法，清除用户信息和菜单状态
 */
const handleLogout = () => {
  userStore.logout();
  userMenuOpen.value = false;
  menuOpen.value = false;
};

/**
 * 点击菜单外部时关闭用户下拉菜单
 */
const closeMenusOnClickOutside = (event) => {
  if (!event.target.closest(".navbar-actions")) {
    userMenuOpen.value = false;
  }
};

// ============ 生命周期钩子 ============

/**
 * 组件挂载时：
 * 1. 添加滚动事件监听
 * 2. 添加文档点击事件监听（用于关闭菜单）
 * 3. 获取用户信息
 */
onMounted(() => {
  window.addEventListener("scroll", handleScroll);
  document.addEventListener("click", closeMenusOnClickOutside);
  userStore.visitorLogin();
});

/**
 * 组件卸载时：
 * 1. 移除滚动事件监听
 * 2. 移除文档点击事件监听
 * 防止内存泄漏
 */
onUnmounted(() => {
  window.removeEventListener("scroll", handleScroll);
  document.removeEventListener("click", closeMenusOnClickOutside);
});
</script>

<style scoped>
/* ============ 导航栏主容器 ============ */

/**
 * 导航栏基础样式
 * - 固定定位，始终显示在顶部
 * - 使用玻璃态效果（毛玻璃）
 * - 响应滚动事件改变阴影
 */
.navbar {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 1000;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(10px);
  border-bottom: 1px solid rgba(0, 0, 0, 0.05);
  transition: all 0.3s ease-in-out;
  box-shadow: 0 0 0 rgba(0, 0, 0, 0);
}

/**
 * 滚动时的导航栏样式
 * 当页面滚动超过 50px 时应用此样式
 */
.navbar-scrolled {
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
  background: rgba(255, 255, 255, 0.98);
}

/**
 * 导航栏内部容器
 * - 最大宽度限制
 * - 使用 flexbox 布局实现左中右三列
 */
.navbar-container {
  max-width: 1320px;
  margin: 0 auto;
  padding: 0 20px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 70px;
}

/* ============ Logo 区域 ============ */

/**
 * Logo 容器
 * - 左侧固定位置
 * - 不缩小以保持最小宽度
 */
.navbar-logo {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  user-select: none;
  flex-shrink: 0;
}

/**
 * Logo 图标
 * 应用浮动动画，在全局样式中定义
 */
.logo-icon {
  font-size: 28px;
  animation: float 3s ease-in-out infinite;
}

/**
 * Logo 文字
 * - 应用渐变色效果
 * - 使用 CSS 变量 --gradient-primary
 */
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

/**
 * 导航菜单容器
 * - 占据中间区域
 * - 使用 flex-1 自动扩展
 */
.navbar-menu {
  display: flex;
  align-items: center;
  flex: 1;
  margin: 0 40px;
}

/**
 * 菜单列表
 * 重置默认列表样式
 */
.menu-list {
  margin: 0;
  display: flex;
  align-items: center;
  gap: 0;
  list-style: none;
}

/**
 * 菜单项容器
 */
.menu-item {
  position: relative;
}

/**
 * 菜单链接样式
 * - 光滑过渡效果
 * - 悬停时改变颜色
 */
.menu-link {
  display: block;
  padding: 8px 16px;
  color: var(--color-dark);
  font-weight: 500;
  position: relative;
  transition: color 0.3s ease-in-out;
}

/**
 * 菜单链接悬停下划线效果
 * - 使用 ::after 伪元素创建动画下划线
 * - 宽度从 0 扩展到 30px
 */
.menu-link::after {
  content: "";
  position: absolute;
  bottom: 5px;
  left: 50%;
  width: 0;
  height: 2px;
  background: var(--gradient-primary);
  transform: translateX(-50%);
  transition: width 0.3s ease-in-out;
}

/**
 * 菜单链接悬停状态
 * - 文字颜色改变
 * - 下划线扩展
 */
.menu-link:hover {
  color: var(--color-primary);
}

.menu-link:hover::after {
  width: 30px;
}

/* ============ 用户操作区 ============ */

/**
 * 用户操作按钮容器
 * - 右侧固定位置
 * - 不缩小以保持按钮完整显示
 */
.navbar-actions {
  display: flex;
  align-items: center;
  gap: 16px;
  flex-shrink: 0;
}

/**
 * 通用操作按钮样式
 * - 圆形背景
 * - 悬停时改变背景和缩放
 */

/**
 * 登录/注册按钮
 * - 渐变背景
 * - 有阴影效果
 */
.login-btn,
.auth-btn {
  padding: 10px 24px;
  background: var(--gradient-primary);
  color: white;
  border-radius: 8px;
  font-weight: 600;
  transition: all 0.3s ease-in-out;
  cursor: pointer;
}

.login-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(138, 109, 255, 0.4);
}

/* ============ 用户菜单 ============ */

/**
 * 用户菜单容器
 */
.user-menu-container {
  position: relative;
}

/**
 * 用户头像按钮
 * - 圆形头像
 * - 紫色边框
 */
.user-avatar-btn {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  overflow: hidden;
  cursor: pointer;
  border: 2px solid var(--color-primary);
  transition: all 0.3s ease-in-out;
}

.user-avatar-btn img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.user-avatar-btn:hover {
  transform: scale(1.05);
  box-shadow: 0 4px 16px rgba(138, 109, 255, 0.4);
}

/**
 * 用户下拉菜单
 * - 绝对定位于头像下方
 * - 动画出现效果
 */
.user-dropdown {
  position: absolute;
  top: 100%;
  right: 0;
  margin-top: 12px;
  width: 240px;
  background: white;
  border-radius: 12px;
  box-shadow: var(--shadow-lg);
  overflow: hidden;
  animation: fadeInScale 0.3s ease-in-out;
}

/**
 * 用户信息区
 * 显示用户名和邮箱
 */
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
  color: #999;
  margin: 0;
}

/**
 * 下拉菜单分隔线
 */
.dropdown-divider {
  height: 1px;
  background: rgba(0, 0, 0, 0.08);
}

/**
 * 下拉菜单项
 * - 悬停时改变背景和颜色
 * - 退出登录项使用不同的颜色
 */
.dropdown-item {
  display: block;
  width: 100%;
  padding: 12px 16px;
  text-align: left;
  background: none;
  color: var(--color-dark);
  cursor: pointer;
  font-size: 14px;
  transition: all 0.2s ease-in-out;
}

.dropdown-item:hover {
  background: rgba(138, 109, 255, 0.08);
  color: var(--color-primary);
  padding-left: 20px;
}

/**
 * 退出登录按钮
 * 使用红色强调
 */
.dropdown-item.logout {
  color: #ff6b6b;
}

.dropdown-item.logout:hover {
  background: rgba(255, 107, 107, 0.08);
  color: #ff6b6b;
}

/* ============ 移动端菜单 ============ */

/**
 * 汉堡菜单按钮
 * - 默认隐藏，通过 show-mobile 类在移动端显示
 * - 包含三条横线
 */
.menu-toggle {
  display: none;
  flex-direction: column;
  gap: 5px;
  width: 28px;
  height: 24px;
  background: none;
  cursor: pointer;
  z-index: 1001;
}

.menu-toggle span {
  width: 28px;
  height: 2px;
  background: var(--color-dark);
  border-radius: 2px;
  transition: all 0.3s ease-in-out;
}

/**
 * 汉堡菜单激活状态（变成 X 形）
 */
.menu-toggle.active span:nth-child(1) {
  transform: rotate(45deg) translateY(11px);
}

.menu-toggle.active span:nth-child(2) {
  opacity: 0;
}

.menu-toggle.active span:nth-child(3) {
  transform: rotate(-45deg) translateY(-11px);
}

/* ============ 响应式设计 ============ */

/**
 * 平板设备（max-width: 1199px）
 */
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

/**
 * 平板/大手机设备（max-width: 767px）
 */
@media (max-width: 767px) {
  .navbar-container {
    height: 56px;
  }

  .navbar-logo {
    gap: 6px;
  }

  .logo-icon {
    font-size: 24px;
  }

  .logo-text {
    font-size: 16px;
  }

  /* 显示汉堡菜单按钮 */
  .menu-toggle {
    display: flex;
  }

  .menu-toggle {
    order: -1;
  }

  .navbar-logo {
    order: 0;
  }

  .navbar-actions,
  .auth-btn {
    order: 1;
  }

  .navbar-menu {
    order: 2;
  }

  /**
   * 移动端菜单：
   * - 全屏宽度
   * - 从左侧滑入
   * - 固定定位在导航栏下方
   */
  .navbar-menu {
    position: fixed;
    top: 56px;
    left: 0;
    right: 0;
    background: white;
    flex-direction: column;
    margin: 0;
    padding: 16px 0;
    border-bottom: 1px solid rgba(0, 0, 0, 0.08);
    max-height: calc(100vh - 56px);
    overflow-y: auto;
    transform: translateX(-100%);
    transition: transform 0.3s ease-in-out;
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
    transition: all 0.3s ease-in-out;
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

  .action-btn {
    width: 40px;
    height: 40px;
    font-size: 18px;
  }

  .user-avatar-btn {
    width: 40px;
    height: 40px;
  }

  .user-dropdown {
    width: 200px;
  }
}

/**
 * 小手机设备（max-width: 575px）
 */
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

  .action-btn {
    width: 36px;
    height: 36px;
    font-size: 16px;
  }

  .user-avatar-btn {
    width: 36px;
    height: 36px;
  }

  .user-dropdown {
    width: 180px;
  }
}

.login-btn,
.auth-btn {
  padding: 10px 24px;
  background: var(--gradient-primary);
  color: white;
  border-radius: 8px;
  font-weight: 600;
  transition: all 0.3s ease-in-out;
  cursor: pointer;
}

.login-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(138, 109, 255, 0.4);
}

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
  transition: all 0.3s ease-in-out;
}

.user-avatar-btn img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.user-avatar-btn:hover {
  transform: scale(1.05);
  box-shadow: 0 4px 16px rgba(138, 109, 255, 0.4);
}

.user-dropdown {
  position: absolute;
  top: 100%;
  right: 0;
  margin-top: 12px;
  width: 240px;
  background: white;
  border-radius: 12px;
  box-shadow: var(--shadow-lg);
  overflow: hidden;
  animation: fadeInScale 0.3s ease-in-out;
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

.user-email {
  font-size: 12px;
  color: #999;
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
  color: var(--color-dark);
  cursor: pointer;
  font-size: 14px;
  transition: all 0.2s ease-in-out;
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

.menu-toggle {
  display: none;
  flex-direction: column;
  gap: 5px;
  width: 28px;
  height: 24px;
  background: none;
  cursor: pointer;
  z-index: 1001;
}

.menu-toggle span {
  width: 28px;
  height: 2px;
  background: var(--color-dark);
  border-radius: 2px;
  transition: all 0.3s ease-in-out;
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

/* 移动端响应式 */
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
  }

  .logo-icon {
    font-size: 24px;
  }

  .logo-text {
    font-size: 16px;
  }

  .menu-toggle {
    display: flex;
  }

  .navbar-menu {
    position: fixed;
    top: 56px;
    left: 0;
    right: 0;
    background: white;
    flex-direction: column;
    margin: 0;
    padding: 16px 0;
    border-bottom: 1px solid rgba(0, 0, 0, 0.08);
    max-height: calc(100vh - 56px);
    overflow-y: auto;
    transform: translateX(-100%);
    transition: transform 0.3s ease-in-out;
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
    transition: all 0.3s ease-in-out;
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

  .action-btn {
    width: 40px;
    height: 40px;
    font-size: 18px;
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

  .action-btn {
    width: 36px;
    height: 36px;
    font-size: 16px;
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
