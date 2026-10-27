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

        <!-- 明暗切换（EC theme-switch：浅色 / 深色 / 跟随系统 三档） -->
        <ThemeSwitch />

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
          <span v-if="cartCount > 0" class="u-badge u-badge--ring navbar-cart-badge" aria-hidden="true">
            {{ cartCount > 99 ? '99+' : cartCount }}
          </span>
        </router-link>

        <!--
          会员中心入口：与购物车同样「有身份就显示」。
          未开通的人也需要一个常驻入口（下拉里的「会员权益」组要展开才看得到，
          会员体系本身要靠未开通的人转化）；等级徽标才是会员专属 ——
          levelName 为空（未开通）时整块不渲染，那时它就是一枚普通图标。
        -->
        <router-link
          v-if="userStore.userId"
          to="/member"
          class="u-icon-btn navbar-member"
          :aria-label="memberLabel"
        >
          <AppIcon name="crown" />
          <span v-if="memberStore.levelName" class="u-badge u-badge--ring navbar-member-badge" aria-hidden="true">
            {{ memberStore.levelName }}
          </span>
        </router-link>

        <!--
          消息中心入口：与上面两个不同，它**只给注册用户**。

          游客也有 userId，但后端 `enqueue_notification` 对非注册用户直接返回
          false —— 游客的站内通知永远是空的。给游客一个信封图标，等于给了一个
          点进去什么都没有的入口；他的诉求（问客服）在 /support，那里对游客开放。
        -->
        <router-link
          v-if="userStore.isLoggedIn"
          to="/mail"
          class="u-icon-btn navbar-mail"
          :aria-label="mailLabel"
        >
          <AppIcon name="mail" />
          <span v-if="mailStore.hasUnread" class="u-badge u-badge--ring navbar-mail-badge" aria-hidden="true">
            {{ mailStore.unreadLabel }}
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
            id="user-menu-trigger"
            type="button"
            class="user-avatar-btn"
            :aria-label="identityLabel"
            aria-haspopup="menu"
            aria-controls="user-menu"
            :aria-expanded="userMenuOpen"
            @click="toggleUserMenu"
            @keydown.down.prevent="openUserMenu(true)"
            @keydown.esc="closeUserMenu(true)"
          >
            <span class="u-avatar">
              <!-- 没有头像地址、或头像地址加载失败（外链图床不可达）时，
                   都退化为一个字形占位 —— 不再出现「碎图」，
                   也不会渲染空 src（空 src 会被浏览器当作「请求当前页面」再发一次请求） -->
              <SmartImage
                v-if="avatarUrl"
                :src="avatarUrl"
                :alt="nickname || '用户头像'"
                fallback-icon="user"
                fallback-class="avatar-fallback"
                loading="eager"
              />
              <span v-else class="avatar-fallback"><AppIcon name="user" /></span>
            </span>
            <!-- 在线状态圆点：有身份就常驻头像右下角，呼吸光晕表达「在线」。
                 条件用 hasIdentity 而不是 userStore.isLoggedIn —— 后者是
                 `user_type === 'registered'`，会把游客判成未登录而让圆点消失，
                 而游客同样是已解析出来的身份（有 userId），也该显示在线点。
                 纯装饰：语义由头像按钮的 aria-label 承担，读屏不必多读一遍。 -->
            <span
              v-if="hasIdentity"
              class="navbar-avatar-status"
              aria-hidden="true"
            ></span>
          </button>

          <div
            v-if="userMenuOpen"
            id="user-menu"
            ref="userMenuPanel"
            class="u-dropdown user-dropdown"
            role="menu"
            aria-label="账号菜单"
            @keydown="onMenuKeydown"
          >
            <div class="user-info">
              <p class="user-name">
                <span class="user-name-text">{{ nickname || '未设置昵称' }}</span>
                <span v-if="isGuest" class="u-tag u-tag--warning user-badge">
                  {{ AUTH.guestBadge }}
                </span>
                <!-- 会员等级徽标：levelName 为空（非会员）时整块不渲染，不留空位 -->
                <span v-else-if="memberStore.levelName" class="u-tag u-tag--accent user-badge">
                  {{ memberStore.levelName }}
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
              role="menuitem"
              class="u-dropdown-item guest-login"
              @click="openLoginModal"
            >
              <span class="dropdown-item-icon" aria-hidden="true"><AppIcon name="log-in" /></span>
              {{ AUTH.loginCta }}
            </button>

            <!--
              下拉项一律用 <router-link>，不要用「button 里包 router-link」——
              那是嵌套交互元素，键盘与读屏都会出问题。
              游客点这些会被路由守卫拦下并弹出登录弹窗（requiresAuth），
              这正好起到「登录后能解锁什么」的提示作用。

              排序按「账号类动作的使用频率」：个人中心 → 我的订单 → 我的收藏
              → 卡密管理 → 每日签到。名称与跳转目标与重排前完全一致。

              图标是纯装饰（整块 aria-hidden）：条目的无障碍名由文本本身承担，
              读屏时不该多读一遍「用户图标」这种噪声。
            -->
            <!-- 分组标题按设计去掉了可见形态：菜单里不再出现「账号资产」这行小字。
                 组名保留为 visually-hidden —— role="menu" 的条目仍需要一个分组上下文，
                 读屏用户听到的是「账号资产，个人中心」，而不是一串没有归属的跳转。 -->
            <p class="visually-hidden">账号资产</p>
            <router-link
              role="menuitem"
              class="u-dropdown-item user-menu-first-item"
              to="/user/profile"
              @click="handleMenuClick"
            >
              <span class="dropdown-item-icon" aria-hidden="true"><AppIcon name="user" /></span>
              个人中心
            </router-link>
            <router-link
              role="menuitem"
              class="u-dropdown-item"
              to="/user/orders"
              @click="handleMenuClick"
            >
              <span class="dropdown-item-icon" aria-hidden="true"><AppIcon name="package" /></span>
              我的订单
            </router-link>
            <router-link
              role="menuitem"
              class="u-dropdown-item"
              to="/user/favorites"
              @click="handleMenuClick"
            >
              <span class="dropdown-item-icon" aria-hidden="true"><AppIcon name="heart" /></span>
              我的收藏
            </router-link>
            <!--
              我的资产（2.3.0）：数字商品、卡密、已激活工具的统一入口。
              它是「我买了什么」的聚合，与「我的订单」（交易过程）分工不同，
              所以两者都保留，资产排在订单之后、收藏之前。
            -->
            <router-link
              role="menuitem"
              class="u-dropdown-item"
              to="/user/assets"
              @click="handleMenuClick"
            >
              <span class="dropdown-item-icon" aria-hidden="true"><AppIcon name="credit-card" /></span>
              我的资产
            </router-link>
            <router-link
              role="menuitem"
              class="u-dropdown-item"
              to="/user/kami"
              @click="handleMenuClick"
            >
              <span class="dropdown-item-icon" aria-hidden="true"><AppIcon name="key" /></span>
              卡密管理
            </router-link>
            <!--
              每日签到归「账号资产」而不是会员那一组：非会员同样每天签到赚积分，
              它是个人中心功能（`/user/checkin`），不是会员门槛。
            -->
            <router-link
              role="menuitem"
              class="u-dropdown-item"
              to="/user/checkin"
              @click="handleMenuClick"
            >
              <span class="dropdown-item-icon" aria-hidden="true"><AppIcon name="check-circle" /></span>
              每日签到
            </router-link>

            <!--
              消息中心**刻意不在这里**：顶栏信封（`.navbar-mail`）已经是同一个入口
              并且带未读角标，下拉里再放一项就是同一个目标的两个入口 ——
              这是本次优化的硬约束（下拉不得重复顶栏已有入口）。
              回归由 test/navbarMail.test.js 与 test/navbarUserMenu.test.js 双重钉住。
            -->

            <!--
              会员相关的四项（套餐 / 积分 / 成长值 / 优惠券）整组已移除：
              它们在个人中心与顶栏皇冠入口都能到达，下拉里再列一遍就会把面板撑长、
              并让真正高频的账号动作沉到折叠线以下。会员中心本身同样不放（顶栏皇冠即入口）。
              退出登录是唯一的「离开」动作，保留在末尾并用分隔线隔开。
            -->
            <div class="u-dropdown-divider"></div>
            <button
              type="button"
              role="menuitem"
              class="u-dropdown-item logout"
              @click="handleLogout"
            >
              <span class="dropdown-item-icon" aria-hidden="true"><AppIcon name="log-out" /></span>
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

      <!--
        明暗切换在窄屏搬进抽屉。

        为什么不在顶栏硬留：三档控件约 80px 宽，390px 的顶栏里已经挤着
        搜索 / 购物车 / 会员 / 消息 / 头像 / 汉堡六个入口，再加一组必然溢出。
        抽屉是移动端唯一有纵向余量的地方，且它是「设置类」控件，
        放在导航列表末尾符合「导航 → 偏好」的阅读顺序。
      -->
      <div class="drawer-theme">
        <span class="drawer-theme-label">{{ THEME_SWITCH.label }}</span>
        <ThemeSwitch />
      </div>
    </div>
  </header>
</template>

<script setup>
/**
 * 顶部导航（position: sticky）
 *
 * 组成：品牌 + 主导航 + 搜索栏 + 明暗切换 + 账号入口 + 移动端抽屉。
 *
 * 三个刻意的结构决定：
 *   1. **sticky 而不是 fixed**。层级取 `--z-nav`（100）——
 *      靠 DOM 顺序压住页面内容，但仍低于下拉（200）与弹窗（400）。
 *      顶栏因此参与文档流，主内容不再需要 `padding-top` 占位。
 *   2. **背景与底边框写在 `.navbar::before` 上，而不是 `.navbar` 本身**。
 *      任何会创建包含块的属性（transform / filter / backdrop-filter）写在
 *      导航栏上时，登录弹窗这类 fixed 后代会被「钉」在导航栏内部。
 *      EC 不用毛玻璃，但这条约束继续适用 —— 将来谁想加回来都会踩到。
 *   3. **搜索关键词直接读写 shop store**。搜索栏与商品网格分处两个组件，
 *      关键词留在组件里就得层层透传事件；匹配规则也只应有一处定义。
 */
import { computed, nextTick, onMounted, onUnmounted, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { useRoute, useRouter } from 'vue-router'
import { useUserStore } from '@/stores/user'
import { useMemberStore } from '@/stores/member'
import { useCartStore } from '@/stores/cart'
import { useMailStore } from '@/stores/mail'
import { throttle } from '@/utils/index.js'
import { createClickGuard } from '@/utils/rateLimit.js'
import SearchBar from './SearchBar.vue'
import ThemeSwitch from './ThemeSwitch.vue'
import AppIcon from './AppIcon.vue'
import SmartImage from './SmartImage.vue'
import { NAV_MENU, PRODUCT_GRID, SITE, AUTH, BOOT, THEME_SWITCH } from '@/constants/index.js'
import { toDate } from '@/hooks/useSimpleTimeFormatter/index.js'
const userStore = useUserStore()
const cartStore = useCartStore()
const memberStore = useMemberStore()
const mailStore = useMailStore()
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
/** 用户下拉面板本体：键盘导航需要拿它查询可聚焦条目，因此必须是 ref */
const userMenuPanel = ref(null)
const navMenu = NAV_MENU

/** 购物车角标：来自 cart store，登录后由 App.vue 拉取 */
const cartCount = computed(() => cartStore.count)
const cartLabel = computed(() =>
  cartCount.value > 0 ? `购物车，${cartCount.value} 件商品` : '购物车'
)

/**
 * 会员入口的无障碍名：等级只在**已经拿到**会员概览时才读出来。
 *
 * 概览由 App.vue 在身份就绪后统一拉取（登录、换号、首屏各一次），这里不自己发请求 ——
 * 顶栏拿不到的只有「未登录」这一种情况，那时读成「会员中心」即可，不编造等级。
 */
const memberLabel = computed(() =>
  memberStore.levelName ? `会员中心，当前等级 ${memberStore.levelName}` : '会员中心'
)

/**
 * 消息入口的无障碍名：把未读数读出来。
 *
 * 角标本身是 `aria-hidden` 的纯装饰（读屏用户看不到那个红点），
 * 因此「有几条未读」这件事必须由这个标签承担，否则它对读屏用户完全不可见。
 * 未读数由 App.vue 在身份就绪后统一拉取，这里不自己发请求。
 */
const mailLabel = computed(() =>
  mailStore.hasUnread ? `消息中心，${mailStore.unreadCount} 条未读` : '消息中心'
)

/**
 * 搜索关键词：**组件自己的状态**，不写进 shop store。
 *
 * 这里原先双向绑定到 `shopStore.searchKeyword`，而首页/热卖榜的商品栅格
 * 会按那个字段持续过滤 —— 于是「搜完再点首页，商品列表还是搜索后的结果」
 * （用户报的 bug）。
 *
 * 根因不是「忘了清空」，而是**把一个瞬态的输入框内容放进了全局状态**：
 * 只要它还在 store 里，任何读它的列表就会一直受它影响，而导航栏的输入框
 * 与「首页要展示哪些商品」本来是两件不相干的事。
 *
 * 所以这里改成组件内的 ref。搜索这个动作由 `/search?q=` 承担（见下）。
 */
const keyword = ref('')

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

/**
 * 展开用户下拉时顺手刷新一次会员概览与未读数。
 *
 * 不在顶层 onMounted 里拉：会员等级会因为「客服确认结算」而在会话中途变化，
 * 进站时的快照可能已经过期。下拉是用户主动查看「我是谁、我有什么」的动作，
 * 在这个时刻拉一次，看到的才是当下真实的等级与积分。
 * 游客不拉 —— 他没有会员数据也没有站内通知，接口只会回 401 / 403。
 *
 * `focusFirst`：从触发器按 ↓ 展开时，焦点必须落到第一项上 ——
 * 只把面板显示出来而焦点还留在触发器上，键盘用户按 ↓ 等于什么都没发生。
 * 鼠标点击展开时不抢焦点（那会让 hover 态与焦点态同时亮起）。
 */
const openUserMenu = (focusFirst = false) => {
  if (userMenuOpen.value) return
  userMenuOpen.value = true

  if (!isGuest.value) {
    memberStore.fetchOverview({ silent: true })
    mailStore.fetchUnreadCount({ silent: true })
  }

  if (!focusFirst) return
  nextTick(() => {
    menuItems()[0]?.focus()
  })
}

/**
 * 关闭用户下拉。
 *
 * `restoreFocus`：由 Esc 关闭时必须把焦点还给触发器 ——
 * 焦点留在已经被卸载的节点上时，后面的 Tab 会从 body 重新开始，键盘用户就丢了位置。
 */
const closeUserMenu = (restoreFocus = false) => {
  if (!userMenuOpen.value) return
  userMenuOpen.value = false

  if (!restoreFocus) return
  document.getElementById('user-menu-trigger')?.focus()
}

/** 面板里可聚焦的条目。跳过后禁用项，避免焦点落在不可用的按钮上 */
const menuItems = () =>
  Array.from(userMenuPanel.value?.querySelectorAll('.u-dropdown-item:not(:disabled)') ?? [])

/**
 * 面板内的键盘导航：↑/↓ 循环、Home/End 到首尾、Esc 关闭并把焦点还给触发器。
 *
 * 刻意**不**拦 Tab：把面板卸载掉再让浏览器继续找下一个可聚焦元素，
 * 焦点会落到 body 上。Tab 走默认行为即可（焦点离开面板后，
 * 点击别处仍会由 closeMenusOnClickOutside 收起菜单）。
 */
const onMenuKeydown = (event) => {
  if (event.key === 'Escape') {
    event.preventDefault()
    closeUserMenu(true)
    return
  }

  if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return

  const items = menuItems()
  if (!items.length) return
  event.preventDefault()

  const last = items.length - 1
  const current = items.indexOf(document.activeElement)
  if (event.key === 'Home') {
    items[0].focus()
    return
  }
  if (event.key === 'End') {
    items[last].focus()
    return
  }
  if (event.key === 'ArrowDown') {
    items[current < 0 || current === last ? 0 : current + 1].focus()
    return
  }
  items[current <= 0 ? last : current - 1].focus()
}

const toggleUserMenu = () => {
  if (userMenuOpen.value) closeUserMenu()
  else openUserMenu()
}

/**
 * 提交搜索：跳到搜索结果页，**商品与工具一起搜**。
 *
 * 此前这里的行为是「当前不在首页/热卖榜就跳热卖榜，否则什么都不做」——
 * 也就是说它从来没有发起过一次搜索，只是把用户送到一个会被客户端过滤的栅格前，
 * 而且那个栅格只有商品。工具的数据在另一个接口里，客户端过滤拿不到。
 *
 * 关键词由 URL 携带（`/search?q=`），因此：
 *   · 结果页可以直接分享/收藏链接；
 *   · 用户离开结果页后，首页的商品列表**不会**再受这次搜索影响
 *     （关键词不再进 store，见上面 `keyword` 的说明）。
 */
const handleSearchSubmit = () => {
  menuOpen.value = false
  // 收起搜索框：结果已经在页面上了，留着展开只是占地方
  closeSearch()

  const text = keyword.value.trim()
  // 空关键词不跳：结果页没有关键词时只会显示引导语，跳过去等于把用户从一个
  // 空输入框送到另一个空页面
  if (!text) return

  router.push({ name: 'SearchResults', query: { q: text } })
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

/** 退出登录的点击闸门：连着点两下会发两次 logout 请求（第二次必然 401，还会污染日志）。 */
const logoutGuard = createClickGuard(1000)

const handleLogout = async () => {
  if (!logoutGuard()) return
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
  /* 规范：z-index 100。低于模态框（400）与提示框（500） */
  z-index: var(--z-nav);
  transition: box-shadow var(--transition-surface);
}

/* 表面 + 底部边框（都放在同一个伪元素上，保证铺满整高）
 * 放在伪元素上是为了不产生 fixed 后代的包含块（见组件顶部注释） */
.navbar::before {
  content: '';
  position: absolute;
  inset: 0;
  z-index: -1;
  background: var(--bg-nav);
  border-bottom: var(--stroke-width) solid var(--nav-border-color);
}

/* 滚动后：EC 的层级信号是「沉下去」的一档阴影（浅色阴影 / 暗色也统一走阴影） */
.navbar-scrolled {
  box-shadow: var(--nav-scrolled-shadow);
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
 * 这两组令牌的取值并不相等（底色一深一浅、描边一有一无、圆角不同档）。
 * 于是**一点击盒子就明显变样**，明暗两套主题全中。
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
   * 宽度按图标格换算（36px × 8 = 288px），同时不超过视口。 */
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
 * 左右留白**全部由这一层给**（见下方 .u-input 的注释），右侧留出
 * 「按钮宽 + 一点间距」，文字才不会钻到放大镜底下。 */
.search-field :deep(.u-search) {
  width: 100%;
  height: 100%;
  min-width: 0;
  padding-left: var(--input-padding-x);
  padding-right: calc(var(--icon-btn-size) - var(--stroke-width) * 2 + var(--input-padding-x));
}

/* 输入框自己不留横向内边距：内边距会把它的盒子撑得比内容宽，
 * 收起时就是这个「看不见的盒子」压在绝对定位的放大镜底下，并给原生的
 * 清除按钮（✕）提供了绘制位置。留白改由外层 .u-search 承担后，
 * 输入框的盒子 = 表单的内容盒，收起时真正是 0。 */
.search-field :deep(.u-input) {
  height: 100%;
  padding-left: 0;
  padding-right: 0;
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

/* ── 收起态：原生清除按钮必须消失 ──────────────────────────────
 *
 * 输入框是 type="search"，Chromium 会在里面画一个原生的 ✕
 * （::-webkit-search-cancel-button，位于内容盒右缘）。收起后输入框只剩
 * 图标那样宽，而这个 ✕ 仍然会在「鼠标停留在框内 / 框仍有焦点」时被画出来，
 * 正好落在绝对定位的放大镜上 —— 就是用户看到的图标重叠。
 *
 * 收起态直接不画它；展开态照旧（那里有足够的空间，位置在放大镜左侧十几像素）。
 * 这里只隐藏 UA 装饰、不动任何间距，因此不存在「按状态切换间距导致首帧溢出」
 * 那一类老问题。 */
.navbar-search:not(.search-open) .search-field :deep(.u-input::-webkit-search-cancel-button) {
  display: none;
  -webkit-appearance: none;
  appearance: none;
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

/* 在线状态圆点：头像右下角的 6px 绿点。
 *
 * 为什么挂在 .user-avatar-btn 而不是 .u-avatar 里面：
 *   `.u-avatar` 是 `overflow: hidden` + 圆形，挂在里面会被裁成半个月牙。
 *   按钮本身就是头像盒子的相对定位容器，圆点贴它的右下角，天然落在头像边缘。
 *
 * 为什么只动 box-shadow / opacity：
 *   顶栏是 flex 行，`transform: scale` 会把圆点算进布局或触发相邻图标的
 *   重排/裁剪，切换呼吸时整条导航会跟着抖；阴影不参与布局。
 */
.navbar-avatar-status {
  position: absolute;
  right: 0;
  bottom: 0;
  width: 6px;
  height: 6px;
  border-radius: var(--ec-radius-full);
  background: var(--ec-success);
  /* 1.5px 顶栏表面色描边：把圆点从头像图上切下来，再亮也不会糊成一团 */
  box-shadow: 0 0 0 1.5px var(--ec-bg-surface);
  pointer-events: none;
}

/* 呼吸圈：从描边处向外扩散、同时淡出，2s 一圈。 */
.navbar-avatar-status::after {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: inherit;
  box-shadow: 0 0 0 2px var(--ec-success);
  opacity: 0;
  animation: navbar-avatar-pulse 2s var(--ec-ease-out) infinite;
}

@keyframes navbar-avatar-pulse {
  0% {
    box-shadow: 0 0 0 2px var(--ec-success);
    opacity: 0.45;
  }

  70%,
  100% {
    box-shadow: 0 0 0 4px var(--ec-success);
    opacity: 0;
  }
}

/* 前庭系统敏感 / 低电量模式：保留静息绿点，关掉呼吸 */
@media (prefers-reduced-motion: reduce) {
  .navbar-avatar-status::after {
    animation: none;
  }
}

/*
 * 头像下拉：定位 + 三处刻意的局部覆盖。
 *  1. 动画：全局 `.u-dropdown` 用的是 `--enter-duration`(0.5s)，那是**页面进入**的节奏；
 *     下拉是就地展开的动作，0.5s 会让人以为界面卡住了。这里收紧到 180ms，
 *     只覆盖本组件、不动共享令牌（改令牌会连带改掉所有页面的进入动画）。
 *  2. 高度：桌面端**不再限高**——面板只剩 6 项（游客 7 项），最高约 300px，
 *     远小于任何可用视口；此前给 280px 上限反而把「退出登录」压进滚动区。
 *     只在 767px 及以下的窄屏上限制在视口内（见文末媒体查询）。
 *  3. 宽度：`--dropdown-width` 只有 200px，带图标后条目会折行，
 *     取 224px（28 个间距单位）当下限，长条目不再挤成两行。
 */
.user-dropdown {
  position: absolute;
  top: calc(100% + var(--space-unit) * 1.5);
  right: 0;
  width: max(var(--dropdown-width), calc(var(--space-unit) * 28));
  overflow: visible;
  animation: enterUp 180ms var(--enter-ease) both;
}

/* 图标列：不参与压缩，条目文字因此左对齐；颜色随条目 hover/focus 一起走 */
.dropdown-item-icon {
  display: inline-flex;
  flex: none;
  align-items: center;
  justify-content: center;
  font-size: var(--fs-sm);
  color: var(--text-muted);
}

.u-dropdown-item:hover .dropdown-item-icon,
.u-dropdown-item:focus-visible .dropdown-item-icon {
  color: currentColor;
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

/* 分组标题的可见形态已删（组名只留给读屏，见模板里的 visually-hidden）。
 *
 * 原来那行标题自带 12px 上内边距 + 4px 下内边距，删掉后首项会直接贴上分隔线，
 * 面板顶部会突然「变紧」。这里把那段呼吸折算成首项的上外边距：
 * 分隔线到「个人中心」的视觉间距从 ~40px 收到 ~25px —— 标题没了，空白不该
 * 还按有标题时的量留着，但也不能贴着线，取两者之间的一档。 */
.user-menu-first-item {
  margin-top: calc(var(--space-unit) * 2);
}

.u-dropdown-item.logout {
  color: var(--danger);
}

/* ── 图标入口与角标（购物车件数 / 会员等级 / 未读消息数） ── */
.navbar-cart,
.navbar-member,
.navbar-mail {
  position: relative;
  flex: none;
}

/* 角标压在图标按钮右上角。尺寸/圆角/字号/底色一律来自共享的 .u-badge
 * （--badge-height 18px、--badge-min-width、--badge-radius、--badge-bg…），
 * 这里只留定位与顶栏自身的描边颜色。
 *
 * 三处的语义不同，因此会员等级不走徽标底色：
 *   · 购物车件数 / 未读消息数 —— 是「数量」，用 .u-badge 默认的 --badge-bg；
 *   · 会员等级（V1–V8）—— 是「身份状态」，徽标底色在 neo 主题下是橙、
 *     tech 下是红，读起来像告警，所以改为强调色 + 反白字。 */
.navbar-cart-badge,
.navbar-member-badge,
.navbar-mail-badge {
  position: absolute;
  top: calc(var(--space-unit) * -0.5);
  right: calc(var(--space-unit) * -0.5);
  /* 描边取顶栏表面色，与背景连成一体（.u-badge--ring 的默认值是 --bg-surface） */
  --badge-ring-color: var(--bg-nav);
}

.navbar-member-badge {
  background-color: var(--accent);
  color: var(--text-on-accent);
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

/* ── 抽屉里的明暗切换（仅窄屏出现，宽屏隐藏） ──
 * 默认 display:none —— 宽屏时顶栏已经有那组三档控件，
 * 抽屉本身也只在 ≤991 才会被汉堡打开。 */
.drawer-theme {
  display: none;
}

.drawer-theme-label {
  font-size: var(--fs-sm);
  color: var(--text-secondary);
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

  /* 窄屏下把下拉限制在视口内：顶栏右侧还挂着图标入口，200px 面板会顶出屏幕。
     触屏设备横屏可用高度可能只有 350px 左右，这里才真正需要滚动轴。 */
  .user-dropdown {
    max-width: calc(100vw - var(--space-unit) * 4);
    max-height: calc(100vh - var(--navbar-height) * var(--mobile-nav-scale) - var(--space-unit) * 4);
    overflow-y: auto;
    overscroll-behavior: contain;
  }

  /* 触控目标：桌面 36px 的条目在手指下太窄，窄屏放宽到 44px 并允许换行 */
  .user-dropdown .u-dropdown-item {
    height: auto;
    min-height: 44px;
  }

  /* 明暗切换：顶栏让位、抽屉接管。
   * 390px 宽的顶栏要放下搜索 / 购物车 / 会员 / 消息 / 头像 / 汉堡六个入口，
   * 再塞一组 80px 的三档控件必然溢出（会挤压 logo 或把汉堡顶出屏幕）。 */
  .navbar-actions :deep(.theme-switch) {
    display: none;
  }

  .drawer-theme {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: calc(var(--space-unit) * 2);
    margin-top: calc(var(--space-unit) * 2);
    padding-top: calc(var(--space-unit) * 2);
    border-top: var(--stroke-width) solid var(--divider);
  }
}

@media (max-width: 575px) {
  .logo-text {
    display: none;
  }
}
</style>
