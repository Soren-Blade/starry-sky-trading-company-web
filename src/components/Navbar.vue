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

      <div class="navbar-actions">
        <!--
          搜索收成一个图标：**点击**展开（悬停不再展开），展开后光标直接落进输入框。

          **放大镜在展开前后停在原地** —— 这是靠两点做到的：
            1. 浮层 .search-field 是 `right: 0`，右边缘永远与图标格对齐；
            2. 放大镜是浮层的**最后一个**子元素，于是它右贴浮层右缘，
               浮层向**左**生长时它一动不动。
          （此前放大镜是浮层的第一个子元素，浮层一展开它就被推到左边去了。）

          展开后放大镜内嵌在输入框右侧，同时抹掉它自身的按钮外观 ——
          外层 .search-field 负责输入框的底、描边、圆角与聚焦态。
          因此视觉上始终只有一个放大镜，也没有单独的「搜索」提交按钮
          （回车 / 手机键盘的搜索键都能提交）。

          收起有三种途径：再点一次图标、按 Escape、焦点离开整块（点了别处）。
          提交之后也会收起 —— 结果已经在页面上了，留着只是占地方。
        -->
        <div
          ref="searchRoot"
          class="navbar-search"
          :class="{ 'search-open': searchOpen }"
          @focusin="handleSearchFocusIn"
          @focusout="handleSearchFocusOut"
          @keydown.esc="closeSearch"
        >
          <!-- 这一格始终占住图标宽度：浮层是绝对定位的，
               没有它的话展开瞬间后面几个图标会整体跳一下 -->
          <span class="search-slot" aria-hidden="true"></span>

          <div class="search-field">
            <SearchBar
              ref="searchBarRef"
              v-model="keyword"
              :label="PRODUCT_GRID.searchLabel"
              :placeholder="PRODUCT_GRID.searchPlaceholder"
              :show-icon="false"
              :show-submit="false"
              @submit="handleSearchSubmit"
            />

            <button
              ref="searchToggleRef"
              type="button"
              class="u-icon-btn search-toggle"
              :aria-label="PRODUCT_GRID.searchLabel"
              :aria-expanded="searchOpen"
              @click="toggleSearch"
            >
              <AppIcon name="search" />
            </button>
          </div>
        </div>

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
          <AppIcon name="shopping-cart" />
          <span v-if="cartCount > 0" class="navbar-cart-badge" aria-hidden="true">
            {{ cartCount > 99 ? '99+' : cartCount }}
          </span>
        </router-link>

        <!--
          身份占位骨架：身份**还没解析出来**的那一瞬间。
          此时既不能显示登录按钮（几百毫秒后会变成头像，是一次刺眼的跳动），
          也不能留空（顶栏会先塌再撑开）。用一个与头像等尺寸的骨架占住位置。
          它覆盖的正是启动遮罩延迟出现的那一小段（遮罩 200ms 内不显示）。
        -->
        <span
          v-if="!identityResolved"
          class="u-skeleton u-skeleton--avatar"
          role="status"
          :aria-label="BOOT.identityPending"
        ></span>

        <!--
          无身份（退出登录 / 退出游客之后）才显示登录入口。
          游客**不再**走这一支：他有头像、有昵称、也有要退出的身份，
          把他当成「未登录」会让他既看不到自己是谁，也找不到退出入口。
        -->
        <button
          v-else-if="!hasIdentity"
          type="button"
          class="u-btn-primary"
          @click="openLoginModal"
        >
          {{ AUTH.loginCta }}
        </button>

        <!-- 有身份（游客或注册用户）：头像与下拉菜单 -->
        <div v-else class="navbar-user">
          <button
            type="button"
            class="user-avatar-btn"
            :aria-label="identityLabel"
            :aria-expanded="userMenuOpen"
            @click="toggleUserMenu"
          >
            <span class="u-avatar">
              <!-- 没有头像地址时退化成一个字形，而不是渲染空 src
                   （空 src 会被浏览器当作「请求当前页面」再发一次请求） -->
              <img v-if="avatarUrl" :src="avatarUrl" :alt="nickname || '用户头像'" />
              <span v-else class="avatar-fallback"><AppIcon name="user" /></span>
            </span>
            <!-- 游客标记直接压在头像上：不展开菜单也能一眼看出当前不是正式账号 -->
            <span v-if="isGuest" class="guest-mark" aria-hidden="true">游</span>
          </button>

          <div v-if="userMenuOpen" class="u-dropdown user-dropdown">
            <div class="user-info">
              <p class="user-name">
                <span class="user-name-text">{{ nickname || '未设置昵称' }}</span>
                <span v-if="isGuest" class="u-tag u-tag--warning user-badge">
                  {{ AUTH.guestBadge }}
                </span>
              </p>
              <p class="user-since">
                {{ isGuest ? AUTH.guestSince : AUTH.registeredSince }}
                {{ toDate(userInfo.created_at) }}
              </p>
            </div>

            <!--
              游客提醒。文案必须与真实能力一致（见 constants 里的说明）：
              游客能浏览公开内容，但下单 / 卡密 / 收藏都要正式账号。
            -->
            <p v-if="isGuest" class="guest-note" role="status">{{ AUTH.guestNote }}</p>

            <div class="u-dropdown-divider"></div>

            <!-- 游客的登录入口放在最上面：这是这个面板里最该被点的一项 -->
            <button
              v-if="isGuest"
              type="button"
              class="u-dropdown-item guest-login"
              @click="openLoginModal"
            >
              {{ AUTH.loginCta }}
            </button>

            <!--
              下拉项一律用 <router-link>，不要用「button 里包 router-link」——
              那是嵌套交互元素，键盘与读屏都会出问题。
              游客点这些会被路由守卫拦下并弹出登录弹窗（requiresAuth），
              这正好起到「登录后能解锁什么」的提示作用。
            -->
            <router-link class="u-dropdown-item" to="/user/profile" @click="handleMenuClick">
              个人中心
            </router-link>
            <router-link class="u-dropdown-item" to="/user/favorites" @click="handleMenuClick">
              我的收藏
            </router-link>
            <router-link class="u-dropdown-item" to="/user/orders" @click="handleMenuClick">
              我的订单
            </router-link>
            <router-link class="u-dropdown-item" to="/user/kami" @click="handleMenuClick">
              卡密管理
            </router-link>
            <div class="u-dropdown-divider"></div>
            <button type="button" class="u-dropdown-item logout" @click="handleLogout">
              {{ isGuest ? AUTH.guestLogout : AUTH.logout }}
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

    <!-- 移动端抽屉（导航入口；搜索已统一收到顶栏的图标里） -->
    <div class="navbar-drawer" :class="{ active: menuOpen }">
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
import { computed, nextTick, onMounted, onUnmounted, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { useRoute, useRouter } from 'vue-router'
import { useUserStore } from '@/stores/user'
import { useShopStore } from '@/stores/shop'
import { useCartStore } from '@/stores/cart'
import { throttle } from '@/utils/index.js'
import SearchBar from './SearchBar.vue'
import ThemeSwitcher from './ThemeSwitcher.vue'
import AppIcon from './AppIcon.vue'
import { NAV_MENU, PRODUCT_GRID, SITE, AUTH, BOOT } from '@/constants/index.js'
import { toDate } from '@/hooks/useSimpleTimeFormatter/index.js'

const userStore = useUserStore()
const shopStore = useShopStore()
const cartStore = useCartStore()
const route = useRoute()
const router = useRouter()

// isGuest 用于游客标记与文案；顶栏的「显示头像还是登录按钮」判断走的是
// hasIdentity（游客也算有身份），因此这里不需要 isLoggedIn。
const { isGuest, userInfo, nickname, avatarUrl } = storeToRefs(userStore)

/**
 * 身份是否已经解析过一次。
 *
 * `initialized` 在 `init()` 结束后为 true（无论结果是注册用户、游客还是失败），
 * 而 `logout()` 之后刻意保持 true（否则路由守卫会立刻再建一个游客）。
 * 因此它正好能区分三种状态：
 *   !initialized            → 还在解析，显示占位骨架
 *   initialized && userId   → 有身份，显示头像与用户面板
 *   initialized && !userId  → 确实没有身份，显示登录按钮
 */
const identityResolved = computed(() => userStore.initialized)

/**
 * 是否有身份（游客也算）。
 *
 * 与 `isLoggedIn` 是两个不同的问题，顶栏两处判断都基于这一条：
 *   - 有身份  → 显示头像与下拉菜单（游客也显示，他需要看到自己是谁、也需要能退出）
 *   - 无身份  → 显示「登录 / 注册」按钮（只有刚退出之后才会出现这种状态）
 */
const hasIdentity = computed(() => Boolean(userStore.userId))

/** 头像按钮的无障碍名：把身份一并读出来，读屏用户同样能知道自己是游客 */
const identityLabel = computed(() => {
  const who = nickname.value || '未设置昵称'
  const role = isGuest.value ? AUTH.guestBadge : '已登录'
  return `打开用户菜单（${who}，${role}）`
})

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
 * 提交搜索：跳到搜索结果页，**商品与工具一起搜**。
 *
 * 此前这里的行为是「当前不在首页/热卖榜就跳热卖榜，否则什么都不做」——
 * 也就是说它从来没有发起过一次搜索，只是把用户送到一个会被客户端过滤的栅格前，
 * 而且那个栅格只有商品。工具的数据在另一个接口里，客户端过滤拿不到。
 *
 * 现在：
 *   · 打字时仍由 v-model 写入 shopStore.searchKeyword，首页/热卖榜的栅格**即时**过滤商品
 *     （本地零延迟的反馈，保留）；
 *   · 回车才打开 `/search?q=`，那里同时查商品与工具。
 *
 * 两级行为是刻意的：即时反馈用本地过滤，完整搜索交给结果页。
 */
const handleSearchSubmit = () => {
  menuOpen.value = false
  // 收起搜索框：结果已经在页面上了，留着展开只是占地方
  closeSearch()

  const keyword = String(shopStore.searchKeyword || '').trim()
  // 空关键词不跳：结果页没有关键词时只会显示引导语，跳过去等于把用户从一个
  // 空输入框送到另一个空页面
  if (!keyword) return

  router.push({ name: 'SearchResults', query: { q: keyword } })
}

// ── 搜索图标的展开 / 收起 ──────────────────────────────────────
//
// 点击展开（悬停**不**展开，按要求改掉）。三件事必须一起成立，
// 只做其中一件都会让这块变得难用：
//   1. 点开时把光标落进输入框 —— 否则用户还得再点一次输入框
//   2. 键盘 Tab 进来也要展开 —— 收起态宽度为 0，不展开就是往一个看不见的框里打字
//   3. 焦点只是在**这块之内**移动（输入框 ⇄ 放大镜按钮）时不能收起 ——
//      否则「再点一次图标收起」会先被 focusout 关掉、再被 click 打开，
//      看起来就是「点了没反应」

const searchRoot = ref(null)
const searchBarRef = ref(null)
const searchToggleRef = ref(null)
const searchOpen = ref(false)

const closeSearch = () => {
  searchOpen.value = false
  // 收起时同时把焦点移走：只改状态的话，界面已收起而键盘输入仍打进看不见的框里。
  // 元素本来就未聚焦时 blur() 是空操作，不会再触发 focusout，因此不会递归。
  searchBarRef.value?.blur()
}

/** 点图标：展开则收起，收起则展开并把光标送进输入框 */
const toggleSearch = async () => {
  if (searchOpen.value) {
    closeSearch()
    return
  }
  searchOpen.value = true
  await nextTick()
  searchBarRef.value?.focus()
}

/**
 * 焦点进入这块时展开（键盘 Tab 过来用）。
 *
 * ⚠ **必须忽略来自放大镜按钮自身的 focusin。**
 *
 * 浏览器在 mousedown 时就会把焦点给按钮，而 focusin 冒泡到 wrapper 时
 * click 还没发生。若这里无条件置 true，点一下就会变成：
 *   mousedown → focusin → 展开
 *   click     → toggleSearch 看到已展开 → 收起
 * 净效果是「闪一下又没了」，看起来像有个莫名的动画。
 *
 * 忽略按钮自身之后：点按钮只走 click 的切换逻辑，展开时再把光标送进输入框；
 * 键盘用户第一下 Tab 落在按钮上（它本来就是展开/收起的开关），
 * 第二下 Tab 进输入框时展开，回车/Space 也仍然有效。
 */
const handleSearchFocusIn = (event) => {
  if (event.target === searchToggleRef.value) return
  searchOpen.value = true
}

const handleSearchFocusOut = (event) => {
  // relatedTarget 为 null 表示焦点落到了不可聚焦的地方（例如点了页面空白）
  if (!event.relatedTarget || !searchRoot.value?.contains(event.relatedTarget)) {
    closeSearch()
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

  // 退出后如果没有身份，停留在「需要登录」的页面上只会看到空数据或反复失败
  // （订单页、个人中心、卡密页、购物车都要正式账号）。把这些页面送回首页，
  // 公开页面则原地不动 —— 用户在 /hot 上退出时不该被莫名弹走。
  if (route.meta?.requiresAuth || route.name === 'Cart') {
    router.push({ name: 'Home' }).catch(() => {
      /* 跳转失败不影响退出本身 */
    })
  }
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

/* ── 搜索：收起是一个图标，展开后输入框从图标**左侧**长出来 ──────
 *
 * 结构：.navbar-search（定位锚点）
 *         ├─ .search-slot   占位格，始终占住图标宽度
 *         └─ .search-field  绝对定位的「框」，内部是 [输入框][放大镜按钮]
 *
 * 为什么这样搭：
 *   - 浮层是**绝对定位**的，不参与文档流。否则 1024px 与手机宽度下
 *     Logo + 菜单 + 五组图标的总宽会超视口，把主导航挤变形。
 *   - 它 `right: 0` 与占位格右缘对齐、向**左**生长，因此永远不会顶出屏幕右边；
 *     而放大镜是框的最后一个子元素，右贴框缘 ——
 *     于是**展开前后放大镜一动不动**，长出来的是它左边的输入区。
 *
 * ⚠⚠ 收起态与展开态**必须共用同一套尺寸令牌**，只允许宽度变。
 *
 * 这里踩过一次：收起态用 `--icon-btn-size` / `--icon-btn-radius` /
 * `--bg-surface`，展开态用 `--input-height` / `--radius-input` / `--bg-surface-2`。
 * 五套主题里这两组值并不相等 —— 高度在玻璃（44→48）、便当（40→44）、
 * 粗野（44→48）、单色（32→36）四套里都不一致，圆角在便当（10→24）与
 * 粗野（0→8）也不同。于是**一点击盒子就明显长大、变方**，四套主题全中。
 *
 * 现在统一锚在图标按钮那一组上（它是顶栏里的一员，收起时就该和左右邻居
 * 一模一样），展开只加宽：
 *   height / border-radius / background / border  → 两个状态完全相同
 *   width                                        → 唯一变化的属性
 * 阴影也不再在展开时凭空出现（那同样是一次「明显差异」），
 * 只在真正聚焦时给一圈焦点环 —— 那是用户主动操作的结果，不是点击的副作用。
 */
.navbar-search {
  position: relative;
  display: flex;
  align-items: center;
  flex: none;
}

.search-slot {
  display: block;
  width: var(--icon-btn-size);
  height: var(--icon-btn-size);
}

.search-field {
  position: absolute;
  top: 50%;
  right: 0;
  /*
   * 框里**只有一个参与文档流的子元素**（输入区），放大镜是绝对定位的
   * —— 见下方 .search-toggle 的说明。因此这里不需要 flex 排版，
   * 也不需要 gap：任何「按状态切换间距」的写法都会在动画首帧造成溢出。
   */
  width: var(--icon-btn-size);
  /* 与左右邻居（主题 / 购物车 / 头像）逐值相同的图标按钮外观 */
  height: var(--icon-btn-size);
  /*
   * 用 clip 而不是 hidden：hidden 只隐藏滚动条，容器**仍可被程序滚动**，
   * 而聚焦一个溢出其容器的输入框时浏览器会滚动它 —— 那会让整个框的内容
   * 横向位移。clip 彻底禁止滚动，从根上排除这类位移。
   */
  overflow: clip;
  color: var(--text-secondary);
  background: var(--bg-surface);
  border: var(--stroke-width) solid var(--stroke-color);
  border-radius: var(--icon-btn-radius);
  transform: translateY(-50%);
  transition:
    width var(--transition-surface),
    color var(--transition-interactive),
    border-color var(--transition-interactive),
    /* box-shadow 必须一起过渡：聚焦环是「描边变色 + 外发光」两件事，
     * 只过渡 border-color 的话，外发光会**瞬间出现**而描边在淡入 ——
     * 一个渐变一个硬切，看起来就是一次莫名的闪动。 */
    box-shadow var(--transition-interactive);
}

.navbar-search.search-open .search-field {
  /* **唯一**的几何变化：变宽。
   * 宽度按图标格换算，五套主题各得其所（极简 320 / 玻璃 352 / 便当 320 /
   * 粗野 352 / 单色 256），同时不超过视口。 */
  width: min(calc(var(--icon-btn-size) * 8), calc(100vw - var(--space-unit) * 6));
}

/* 悬停反馈照搬 .u-icon-btn:hover:not(:disabled)（只变字色与描边色）——
 * 盒子已经移到外框上，这套反馈也要跟着上来，否则鼠标移上去毫无反应。
 * 字形靠按钮的 color: inherit 跟着变色。 */
.navbar-search .search-field:hover {
  color: var(--accent);
  border-color: var(--accent);
}

/* 展开后它已经是输入框：描边不再随悬停变色，字色仍随悬停提亮
 * （提示右端的放大镜仍可点击收起）。 */
.navbar-search.search-open .search-field:hover {
  border-color: var(--stroke-color);
}

/* 聚焦时给一圈焦点环。这是用户主动把光标放进来才有的，
 * 与「点击展开」无关，因此不算上面说的那种差异。放在悬停规则之后才盖得住。 */
.navbar-search.search-open .search-field:focus-within {
  border-color: var(--input-focus-border);
  box-shadow: var(--input-focus-shadow);
}

/* 放大镜：**绝对定位贴框的右缘**，不参与文档流。
 *
 * 这是为了彻底消灭「点击时图标闪一下」这类问题。此前按钮是框的 flex 子元素，
 * 它的位置与尺寸取决于框**正在变化的宽度** —— 于是任何一帧的排版细节
 * （首帧溢出、被裁、重排）都会表现在按钮上，表现为闪动或抖动。
 *
 * 拿出来之后：框的右缘是固定的（right: 0 且外层宽度恒定），按钮贴右缘，
 * 于是它的位置**在数学上与宽度动画无关** —— 宽度怎么变它都不动，
 * 也不可能被裁（它始终落在内边距盒之内）。
 *
 * 同时满足「展开前后按钮位置不变」：右缘对齐，向左侧生长的是输入区。
 *
 * 按钮**永远不画自己的底与描边**（盒子统一由外框承担）：收起时若两层都画，
 * 描边会错位 1px 并在右侧被裁掉（粗野主题 2px 更明显）；展开时若还画着，
 * 框里就多出一个方按钮。尺寸取内容盒大小，字形才在外框里真正居中。
 * 写到三层选择器，确保压得过 .u-icon-btn 自身的 width/height/color。 */
.navbar-search .search-field .search-toggle {
  position: absolute;
  top: 50%;
  right: 0;
  width: calc(var(--icon-btn-size) - var(--stroke-width) * 2);
  height: calc(var(--icon-btn-size) - var(--stroke-width) * 2);
  color: inherit;
  background: transparent;
  border-color: transparent;
  cursor: pointer;
  transform: translateY(-50%);
}

.navbar-search .search-field .search-toggle:hover {
  background: transparent;
  border-color: transparent;
}

/* 内层：SearchBar 自带的外框全部抹掉（由 .search-field 承担），
 * 图标也让位（放大镜就是外面那个按钮）。
 * 右侧留出「按钮宽 + 一点间距」，文字才不会钻到放大镜底下。 */
.search-field :deep(.u-search) {
  width: 100%;
  height: 100%;
  min-width: 0;
  padding-right: calc(var(--icon-btn-size) - var(--stroke-width) * 2);
}

.search-field :deep(.u-input) {
  height: 100%;
  /* 左侧留白由输入框自己给；右侧的 padding-right 承担
   * 「文字与放大镜之间的间距」——因此外层不需要 gap */
  padding-left: var(--input-padding-x);
  padding-right: var(--input-padding-x);
  background: transparent;
  border: 0;
  border-radius: 0;
  box-shadow: none;
  backdrop-filter: none;
  -webkit-backdrop-filter: none;
  /* 收起时输入框会和放大镜重叠：input 的 min-width: auto 会把它撑到
   * 浏览器默认宽度（约 170px），而按钮压在它右边。置 0 让它真正收缩掉，
   * 避免一个看不见的输入框盖在按钮上。 */
  min-width: 0;
}

/* 输入框自己的聚焦态也抹掉 —— 高亮统一由 .search-field:focus-within 表达 */
.search-field :deep(.u-input:focus) {
  border-color: transparent;
  box-shadow: none;
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
  position: relative;
  display: block;
  border-radius: var(--avatar-radius);
  transition: opacity var(--transition-interactive);
}

.user-avatar-btn:hover {
  opacity: 0.85;
}

/* 无头像地址时的退化字形：尺寸跟随 .u-avatar 的令牌 */
.avatar-fallback {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  font-size: var(--fs-label);
  line-height: 1;
  background: var(--bg-soft);
}

/* 游客标记：压在头像右下角的小圆片。
 * 用警告色（而不是强调色）—— 它表达的是「这不是正式账号」，
 * 与状态徽标同族的语义，不该抢走强调色在导航里的唯一地位。 */.guest-mark {
  position: absolute;
  right: calc(var(--space-unit) * -0.5);
  bottom: calc(var(--space-unit) * -0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  width: calc(var(--space-unit) * 2);
  height: calc(var(--space-unit) * 2);
  font-size: var(--fs-label);
  font-weight: var(--fw-label);
  line-height: 1;
  color: var(--text-on-accent);
  background: var(--warning);
  /* 描边取顶栏表面色，让圆片与底下的头像分开 */
  border: var(--stroke-width) solid var(--bg-nav);
  border-radius: var(--radius-pill);
}

.user-dropdown {
  position: absolute;
  top: calc(100% + var(--space-unit) * 1.5);
  right: 0;
}

.user-info {
  padding: calc(var(--space-unit) * 1.5) var(--dropdown-item-padding-x);
}

/* 昵称与「游客」徽标同一行：徽标不参与压缩，昵称过长时省略 */
.user-name {
  display: flex;
  align-items: center;
  gap: calc(var(--space-unit));
  font-size: var(--fs-sm);
  font-weight: var(--fw-heading);
  color: var(--text-primary);
  margin: 0 0 calc(var(--space-unit) * 0.5);
}

.user-name-text {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.user-badge {
  flex-shrink: 0;
}

/* 游客提醒：可换行的说明段落，不是一行省略的标签 */
.guest-note {
  margin: 0;
  padding: 0 var(--dropdown-item-padding-x) calc(var(--space-unit) * 1.5);
  font-size: var(--fs-label);
  line-height: var(--leading-body);
  color: var(--text-muted);
}

/* 游客面板里的「登录 / 注册」：与其它下拉项同高，但用强调色标出这是主行动 */
.u-dropdown-item.guest-login {
  color: var(--accent);
  font-weight: var(--fw-heading);
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

  .navbar-actions {
    gap: var(--space-unit);
  }
}

@media (max-width: 991px) {
  /* 主导航收进抽屉后，操作区推到最右（搜索图标现在也在操作区里，
   * 因此这里不再需要给 .navbar-search 留任何位置） */
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
