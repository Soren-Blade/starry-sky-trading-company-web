<template>
  <!-- 粘性顶栏：滚动后加强模糊或加阴影（由 --nav-scrolled-* 令牌决定） -->
  <header class="navbar" :class="{ 'navbar-scrolled': isScrolled }">
    <div class="navbar-inner">
      <!-- Logo（高度由 --nav-logo-height 决定，文字随之派生） -->
      <router-link to="/home" class="navbar-logo" @click="handleMenuClick">
        <span class="logo-icon" aria-hidden="true">{{ SITE.logo }}</span>
        <span class="logo-text">{{ SITE.name }}</span>
      </router-link>

      <!-- 桌面端导航（≥768px）：通高 tab，下划线落在导航栏底边 -->
      <nav class="navbar-menu hide-below-768" :aria-label="SITE.name">
        <ul class="menu-list">
          <li v-for="item in navMenu" :key="item.id" class="menu-item">
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
          submit-label="搜索"
          @submit="handleSearchSubmit"
        />
      </div>

      <div class="navbar-actions">
        <!-- 样式主题切换（图标按钮 + 弹窗） -->
        <ThemeSwitcher />

        <!--
          购物车入口：只要有身份就显示（游客也能看自己的车）。
          未登录时点它不跳转让登录弹窗先拦一道 —— 那样用户会以为按钮坏了。
        -->
        <router-link
          v-if="userStore.userId"
          to="/cart"
          class="u-icon-btn navbar-cart"
          :aria-label="cartLabel"
        >
          <span aria-hidden="true">🛒</span>
          <span v-if="cartCount > 0" class="navbar-cart-badge" aria-hidden="true">
            {{ cartCount > 99 ? '99+' : cartCount }}
          </span>
        </router-link>

        <!-- 未登录（含游客）显示登录入口 -->
        <button v-if="!isLoggedIn" type="button" class="u-btn-primary" @click="openLoginModal">
          登录 / 注册
        </button>

        <!-- 已登录：头像与下拉菜单 -->
        <div v-else class="navbar-user">
          <button
            type="button"
            class="user-avatar-btn"
            :aria-label="`打开用户菜单（${nickname || '未设置昵称'}）`"
            :aria-expanded="userMenuOpen"
            @click="toggleUserMenu"
          >
            <span class="u-avatar">
              <img :src="avatarUrl" :alt="nickname || '用户头像'" />
            </span>
          </button>

          <div v-if="userMenuOpen" class="u-dropdown user-dropdown">
            <div class="user-info">
              <p class="user-name">{{ nickname || '未设置昵称' }}</p>
              <p class="user-since">注册于 {{ toDate(userInfo.created_at) }}</p>
            </div>
            <div class="u-dropdown-divider"></div>
            <!--
              下拉项一律用 <router-link>，不要用「button 里包 router-link」——
              那是嵌套交互元素，键盘与读屏都会出问题（此前卡密管理项就是这么写的）。
              需要先关菜单的场景由 @click 统一处理。
            -->
            <router-link class="u-dropdown-item" to="/user/profile" @click="handleMenuClick">
              个人中心
            </router-link>
            <router-link class="u-dropdown-item" to="/user/favorites" @click="handleMenuClick">
              我的收藏
            </router-link>
            <router-link class="u-dropdown-item" to="/user/orders" @click="handleMenuClick">
              订单管理
            </router-link>
            <router-link class="u-dropdown-item" to="/user/kami" @click="handleMenuClick">
              卡密管理
            </router-link>
            <div class="u-dropdown-divider"></div>
            <button type="button" class="u-dropdown-item logout" @click="handleLogout">
              退出登录
            </button>
          </div>
        </div>

        <!-- 移动端菜单切换按钮 -->
        <button
          type="button"
          class="u-icon-btn menu-toggle show-mobile"
          :class="{ active: menuOpen }"
          :aria-expanded="menuOpen"
          aria-label="切换导航菜单"
          @click="toggleMenu"
        >
          <span class="menu-toggle-bars" aria-hidden="true">
            <i></i><i></i><i></i>
          </span>
        </button>
      </div>
    </div>

    <!-- 移动端抽屉（含搜索栏，桌面端的搜索栏在小屏收起） -->
    <div class="navbar-drawer" :class="{ active: menuOpen }">
      <div class="drawer-search">
        <SearchBar
          v-model="keyword"
          :label="PRODUCT_GRID.searchPlaceholder"
          :placeholder="PRODUCT_GRID.searchPlaceholder"
          submit-label="搜索"
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
  </header>
</template>

<script setup>
/**
 * 顶部导航（position: sticky）
 *
 * 组成：品牌 + 主导航 + 搜索栏 + 样式主题切换 + 账号入口 + 移动端抽屉。
 *
 * 三个刻意的结构决定：
 *   1. **sticky 而不是 fixed**。规范要求 `position: sticky; top: 0; z-index: 100`；
 *      切过来之后顶栏参与文档流，主内容不再需要 `padding-top` 占位。
 *   2. **毛玻璃写在 `.navbar::before` 上，而不是 `.navbar` 本身**。
 *      `backdrop-filter` 会让元素成为 fixed 后代的包含块 —— 写在导航栏上时，
 *      登录弹窗与样式弹窗会被「钉」在导航栏内部（glass 主题下必然复现）。
 *   3. **搜索关键词直接读写 shop store**。搜索栏与商品网格分处两个组件，
 *      关键词留在组件里就得层层透传事件；匹配规则也只应有一处定义。
 */
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { useRoute, useRouter } from 'vue-router'
import { useUserStore } from '@/stores/user'
import { useShopStore } from '@/stores/shop'
import { useCartStore } from '@/stores/cart'
import { throttle } from '@/utils/index.js'
import SearchBar from './SearchBar.vue'
import ThemeSwitcher from './ThemeSwitcher.vue'
import { NAV_MENU, PRODUCT_GRID, SITE } from '@/constants/index.js'
import { toDate } from '@/hooks/useSimpleTimeFormatter/index.js'

const userStore = useUserStore()
const shopStore = useShopStore()
const cartStore = useCartStore()
const route = useRoute()
const router = useRouter()

// isLoggedIn 是 getter：只有 user_type === 'registered' 才为 true，
// 游客也会拿到 token，但不应被当作已登录。
const { isLoggedIn, userInfo, nickname, avatarUrl } = storeToRefs(userStore)

// 说明：这里**不**引入 useBodyScroll。
// 滚动锁由 useModalA11y / useBodyScroll 内部引用计数管理，弹窗组件是持有者，
// 它们的卸载与关闭回调会自行释放，无需外部再解锁。

const isScrolled = ref(false)
const menuOpen = ref(false)
const userMenuOpen = ref(false)
const navMenu = NAV_MENU

/** 购物车角标：来自 cart store，登录后由 App.vue 拉取 */
const cartCount = computed(() => cartStore.count)
const cartLabel = computed(() =>
  cartCount.value > 0 ? `购物车，${cartCount.value} 件商品` : '购物车'
)

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

/** 收起所有菜单（抽屉与用户下拉） */
const handleMenuClick = () => {
  menuOpen.value = false
  userMenuOpen.value = false
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

/**
 * 打开登录弹窗。
 *
 * 弹窗本体挂在 App.vue 上（全站唯一实例），这里只改 store 状态 ——
 * 因为拉起登录的入口不止顶栏一个（下单、收藏、购物车、路由守卫都要能拉起）。
 */
const openLoginModal = () => {
  userStore.openLoginModal()
  menuOpen.value = false
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
/* ── 粘性定位与表面 ─────────────────────────────────────── */
/*
 * 排查修复记录（导航栏排版问题）：
 *  1. 装订线不一致：`.navbar-inner` 用 --container-max(1320)，而商品/工具/卡密
 *     区块用 --container-content(1280)，导致 Logo 左边缘与下方卡片差 20px。
 *     → 令牌层只保留 --container-max，全站共用一条装订线。
 *  2. 导航链接会与搜索栏重叠：`.navbar-menu` 曾是 `flex: 1`（flex-basis 0）+
 *     `min-width: 0`，而 `.menu-list` 不换行 —— 宽度不足时菜单盒被压到 0，
 *     内部链接溢出到搜索栏上。→ 菜单改为 `flex: none`（不参与伸缩），
 *     由搜索栏吸收剩余空间，并在 ≤1199 收一档密度。
 *  3. 底部边框那一像素没有背景：`::before` 的 `inset: 0` 只覆盖 padding box，
 *     边框区域露出的是页面内容。→ 边框移到 `::before` 上，背景与模糊一起铺满整高。
 *  4. 菜单项可点区域只有 ~21px：`padding: 4px 0`。→ 改为整条通高（tab 式），
 *     下划线落在导航栏底边上。
 */
.navbar {
  position: sticky;
  top: 0;
  /* 规范：z-index 100。低于模态框（2000）与提示框（3000） */
  z-index: 100;
  transition: box-shadow var(--transition-surface);
}

/* 表面 + 毛玻璃 + 底部边框（三层都放在同一个伪元素上，保证铺满整高）
 * 放在伪元素上是为了不产生 fixed 后代的包含块（见组件顶部注释） */
.navbar::before {
  content: '';
  position: absolute;
  inset: 0;
  z-index: -1;
  background: var(--bg-nav);
  border-bottom: var(--stroke-width) solid var(--nav-border-color);
  backdrop-filter: var(--nav-backdrop);
  -webkit-backdrop-filter: var(--nav-backdrop);
  transition: backdrop-filter var(--transition-surface);
}

/* 滚动后：glass 加强模糊，其余风格用各自的一档阴影 */
.navbar-scrolled {
  box-shadow: var(--nav-scrolled-shadow);
}

.navbar-scrolled::before {
  backdrop-filter: var(--nav-scrolled-backdrop);
  -webkit-backdrop-filter: var(--nav-scrolled-backdrop);
}

.navbar-inner {
  display: flex;
  align-items: center;
  gap: var(--nav-menu-gap);
  height: var(--navbar-height);
  max-width: var(--container-max);
  margin: 0 auto;
  padding: 0 var(--nav-padding-x);
}

/* ── Logo ───────────────────────────────────────────────── */
.navbar-logo {
  display: flex;
  align-items: center;
  gap: calc(var(--space-unit));
  flex: none;
  height: var(--nav-logo-height);
}

.logo-icon {
  font-size: var(--nav-logo-height);
  line-height: 1;
  animation: var(--decor-animation);
}

.logo-text {
  /* 文字由 Logo 高度派生：换风格时两者同步，不需要第二个令牌 */
  font-family: var(--font-display);
  font-size: calc(var(--nav-logo-height) * 0.72);
  font-weight: var(--fw-display);
  letter-spacing: var(--tracking-display);
  color: var(--text-primary);
  white-space: nowrap;
}

.navbar-logo:hover .logo-text {
  color: var(--accent);
}

/* ── 主导航：通高 tab，不参与伸缩 ───────────────────────── */
.navbar-menu {
  flex: none;
  height: 100%;
}

.menu-list {
  display: flex;
  align-items: stretch;
  gap: var(--nav-menu-gap);
  height: 100%;
}

.menu-item {
  display: flex;
}

.menu-link {
  position: relative;
  display: flex;
  align-items: center;
  height: 100%;
  font-size: var(--nav-link-size);
  font-weight: var(--fw-label);
  letter-spacing: var(--tracking-label);
  text-transform: var(--label-transform);
  white-space: nowrap;
  color: var(--text-secondary);
  transition: color var(--transition-interactive);
}

.menu-link:hover,
.menu-link.router-link-active {
  color: var(--text-primary);
}

/* 选中/悬停用一道强调色下划线表达，落在导航栏底边上 */
.menu-link::after {
  content: '';
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  height: calc(var(--space-unit) * 0.25);
  background: var(--accent);
  transform: scaleX(0);
  transition: transform var(--transition-interactive);
}

.menu-link:hover::after,
.menu-link.router-link-active::after {
  transform: scaleX(1);
}

/* ── 搜索栏：吸收剩余空间，因此导航项与操作区之间不再有一个大空洞 ── */
.navbar-search {
  flex: 1 1 auto;
  min-width: 0;
  max-width: calc(var(--input-height) * 12);
  margin-left: calc(var(--space-unit) * 2);
}

/* ── 操作区 ─────────────────────────────────────────────── */
.navbar-actions {
  display: flex;
  align-items: center;
  gap: calc(var(--space-unit) * 1.5);
  flex: none;
  margin-left: auto;
}

/* ── 用户菜单 ───────────────────────────────────────────── */
.navbar-user {
  position: relative;
}

.user-avatar-btn {
  display: block;
  border-radius: var(--avatar-radius);
  transition: opacity var(--transition-interactive);
}

.user-avatar-btn:hover {
  opacity: 0.85;
}

.user-dropdown {
  position: absolute;
  top: calc(100% + var(--space-unit) * 1.5);
  right: 0;
}

.user-info {
  padding: calc(var(--space-unit) * 1.5) var(--dropdown-item-padding-x);
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
  font-size: var(--tag-font-size);
  color: var(--text-muted);
  margin: 0;
}

.u-dropdown-item.logout {
  color: var(--danger);
}

/* ── 购物车入口与角标 ───────────────────────────────────── */
.navbar-cart {
  position: relative;
  flex: none;
}

/* 角标压在图标按钮右上角：微型徽标圆角 + 强调底 + 反白字，
   与 ToolCard 的收藏数徽标同构（描边取顶栏表面色，与背景连成一体） */
.navbar-cart-badge {
  position: absolute;
  top: calc(var(--space-unit) * -0.5);
  right: calc(var(--space-unit) * -0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: calc(var(--space-unit) * 2.5);
  height: calc(var(--space-unit) * 2.5);
  padding: 0 calc(var(--space-unit) * 0.5);
  font-family: var(--font-mono);
  font-size: var(--fs-label);
  font-weight: var(--fw-label);
  line-height: 1;
  color: var(--text-on-accent);
  background: var(--accent);
  border: var(--stroke-width) solid var(--bg-nav);
  border-radius: var(--micro-badge-radius);
}

/* ── 汉堡按钮 ───────────────────────────────────────────── */
.menu-toggle {
  display: none;
}

.menu-toggle-bars {
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: calc(var(--space-unit) * 0.5);
  width: var(--icon-btn-icon-size);
}

.menu-toggle-bars i {
  display: block;
  height: calc(var(--space-unit) * 0.25);
  background: currentColor;
  border-radius: var(--radius-pill);
  transition: transform var(--transition-interactive), opacity var(--transition-interactive);
}

.menu-toggle.active .menu-toggle-bars i:nth-child(1) {
  transform: translateY(calc(var(--space-unit) * 0.75)) rotate(45deg);
}

.menu-toggle.active .menu-toggle-bars i:nth-child(2) {
  opacity: 0;
}

.menu-toggle.active .menu-toggle-bars i:nth-child(3) {
  transform: translateY(calc(var(--space-unit) * -0.75)) rotate(-45deg);
}

/* ── 移动端抽屉 ─────────────────────────────────────────── */
.navbar-drawer {
  position: fixed;
  top: var(--navbar-height);
  left: 0;
  right: 0;
  max-height: calc(100vh - var(--navbar-height));
  overflow-y: auto;
  padding: calc(var(--space-unit) * 2) var(--nav-padding-x) calc(var(--space-unit) * 3);
  background: var(--bg-elevated);
  border-bottom: var(--stroke-width) solid var(--stroke-color);
  transform: translateY(calc(var(--space-unit) * -1));
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
  padding: calc(var(--space-unit) * 1.5) 0;
  font-size: var(--fs-body);
  font-weight: var(--fw-label);
  letter-spacing: var(--tracking-label);
  color: var(--text-secondary);
  border-bottom: var(--stroke-width) solid var(--divider);
}

.drawer-link.router-link-active {
  color: var(--accent);
}

/* ── 响应式 ─────────────────────────────────────────────── */
/* 992–1199：菜单项、间距、内边距各收一档，保证搜索栏仍放得下且不挤压菜单 */
@media (max-width: 1199px) {
  .navbar-inner {
    gap: calc(var(--nav-menu-gap) * 0.6);
    padding: 0 calc(var(--nav-padding-x) * 0.6);
  }

  .menu-list {
    gap: calc(var(--nav-menu-gap) * 0.6);
  }

  .menu-link {
    font-size: calc(var(--nav-link-size) * 0.92);
  }

  .navbar-search {
    margin-left: var(--space-unit);
  }

  .navbar-actions {
    gap: var(--space-unit);
  }
}

@media (max-width: 991px) {
  .hide-below-992 {
    display: none;
  }

  /* 搜索栏收起后，菜单贴住 Logo，操作区推到最右 */
  .navbar-menu {
    margin-right: auto;
  }
}

@media (max-width: 767px) {
  .hide-below-768 {
    display: none;
  }

  .menu-toggle {
    display: inline-flex;
  }

  /* 移动端缩放：导航高度 ×0.85 */
  .navbar-inner {
    height: calc(var(--navbar-height) * var(--mobile-nav-scale));
    gap: calc(var(--space-unit) * 2);
  }

  .navbar-drawer {
    top: calc(var(--navbar-height) * var(--mobile-nav-scale));
    max-height: calc(100vh - var(--navbar-height) * var(--mobile-nav-scale));
    padding-left: calc(var(--nav-padding-x) * 0.6);
    padding-right: calc(var(--nav-padding-x) * 0.6);
  }
}

@media (max-width: 575px) {
  .logo-text {
    display: none;
  }
}
</style>
