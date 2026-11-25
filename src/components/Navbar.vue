<template>
  <!-- 粘性顶栏：滚动后加强模糊或加阴影（由 --nav-scrolled-* 令牌决定） -->
  <header class="navbar" :class="{ 'navbar-scrolled': isScrolled }">
    <div class="navbar-inner">
      <!-- Logo（高度由 --nav-logo-height 决定，文字随之派生） -->
      <router-link
        to="/home"
        class="navbar-logo"
        :aria-label="SITE.name"
        @click="handleMenuClick"
      >
        <span class="logo-icon" aria-hidden="true"><AppIcon name="star" /></span>
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
          全站搜索：顶栏只留一枚放大镜，点击或 Ctrl / Cmd + K 打开命令面板。
          面板里同时给页面、商品与工具三类结果，见 GlobalSearch.vue。
        -->
        <button
          type="button"
          class="ec-icon-btn navbar-search-trigger navbar-action"
          :aria-label="PAGES.searchGlobal.title"
          :title="PAGES.searchGlobal.title"
          @click="openGlobalSearch"
        >
          <AppIcon name="search" />
        </button>
        <GlobalSearch ref="globalSearchRef" />

        <!-- 语言切换：只占一枚图标的位置；移动端搬进抽屉（顶栏放不下第二组设置） -->
        <LanguageSwitch class="hide-below-768" />

        <!-- 明暗切换（EC theme-switch：浅色 / 深色 / 跟随系统 三档） -->
        <ThemeSwitch />

        <!--
          购物车入口：只要有身份就显示（游客也能看自己的车）。
          未登录时点它不跳转让登录弹窗先拦一道 —— 那样用户会以为按钮坏了。
        -->
        <router-link
          v-if="userStore.userId"
          to="/cart"
          class="u-icon-btn navbar-cart hide-below-768"
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
          class="u-icon-btn navbar-member hide-below-768"
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

          4.18.0：手机端收起。窄屏顶栏只留「搜索 / 身份 / 菜单」三个落点，
          信封与购物车、会员一样是**账号类**入口，搬进身份面板里（同一个目标，
          不再在 390px 的顶栏里挤第四个图标）。
        -->
        <router-link
          v-if="userStore.isLoggedIn"
          to="/mail"
          class="u-icon-btn navbar-mail hide-below-768"
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
          <span class="hide-below-768">{{ AUTH.loginCta }}</span>
          <span class="show-below-768">{{ t('auth.loginShort', '登录') }}</span>
        </button>

        <!-- 有身份（游客或注册用户）：身份胶囊 + 下拉菜单 -->
        <div v-else class="navbar-user">
          <!--
            4.20.0：头像从「一枚裸圆」改成「身份胶囊」——头像 + 一个下拉箭头，
            高、圆角、悬停底色都与左侧搜索、右侧菜单同一套（.navbar-action）。
            改之前三个落点是三种语法：一枚裸图标、一个 28px 的实心圆、两根横杠，
            圆的下缘比两根横杠低半格，眼睛读到的是「一个大头像夹着两个小图标」。
            现在三者共用一个 36px 的视觉盒（手机 40，命中区一律 44），
            头像因此不再是最重的那个，但它多了一个「点开是菜单」的箭头。
          -->
          <button
            id="user-menu-trigger"
            type="button"
            class="user-avatar-btn navbar-action navbar-identity"
            :aria-label="identityLabel"
            aria-haspopup="menu"
            aria-controls="user-menu"
            :aria-expanded="userMenuOpen"
            @click="toggleUserMenu"
            @keydown.down.prevent="openUserMenu(true)"
            @keydown.esc="closeUserMenu(true)"
          >
            <span class="navbar-identity-avatar">
              <span class="u-avatar">
                <!-- 没有头像地址、或头像地址加载失败（外链图床不可达）时，
                     都退化为一个字形占位 —— 不再出现「碎图」，
                     也不会渲染空 src（空 src 会被浏览器当作「请求当前页面」再发一次请求） -->
                <SmartImage
                  v-if="avatarUrl"
                  :src="avatarUrl"
                  :alt="nickname || t('navbar.avatarFallback')"
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
            </span>
            <AppIcon class="navbar-identity-caret" name="chevron-down" aria-hidden="true" />
          </button>

          <div
            v-if="userMenuOpen"
            id="user-menu"
            ref="userMenuPanel"
            class="u-dropdown user-dropdown"
            role="menu"
            :aria-label="t('navbar.accountMenu')"
            @keydown="onMenuKeydown"
          >
            <!--
              4.19.0：头部从「两行文字」改成一张身份卡 ——
              左边是 40px 头像，右边是昵称 + 徽标 + 创建时间，
              底色是一层品牌色洗染（与个人中心的「通行证」同一套语言）。
              它不承担点击：个人中心在下面第一格，面板里不该有两个去同一处的入口。
            -->
            <div class="user-info">
              <span class="u-avatar user-card-avatar" aria-hidden="true">
                <SmartImage
                  v-if="avatarUrl"
                  :src="avatarUrl"
                  :alt="nickname || t('navbar.avatarFallback')"
                  fallback-icon="user"
                  fallback-class="avatar-fallback"
                  loading="eager"
                />
                <span v-else class="avatar-fallback"><AppIcon name="user" /></span>
              </span>
              <span class="user-card-body">
                <span class="user-name">
                  <span class="user-name-text">{{ nickname || t('navbar.nicknameUnset') }}</span>
                  <span v-if="isGuest" class="u-tag u-tag--warning user-badge">
                    {{ AUTH.guestBadge }}
                  </span>
                  <!-- 会员等级徽标：levelName 为空（非会员）时整块不渲染，不留空位 -->
                  <span v-else-if="memberStore.levelName" class="u-tag u-tag--accent user-badge">
                    {{ memberStore.levelName }}
                  </span>
                </span>
                <span class="user-since">
                  {{ isGuest ? AUTH.guestSince : AUTH.registeredSince }}
                  {{ toDate(userInfo.created_at) }}
                </span>
              </span>
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
            <p class="visually-hidden">{{ t('navbar.assetsGroup') }}</p>
            <!--
              4.18.0：这六项在窄屏改成一格一图标的三列网格（见文末 @767）。
              桌面仍是一列文字列表 —— 同一个菜单，两种形态：
              手指下比手指上更需要「看得见的目标」，横向铺开比纵向排队少滑两屏。
            -->
            <div class="user-menu-grid">
            <router-link
              role="menuitem"
              class="u-dropdown-item user-menu-first-item"
              to="/user/profile"
              @click="handleMenuClick"
            >
              <span class="dropdown-item-icon" aria-hidden="true"><AppIcon name="user" /></span>
              {{ t('navbar.profile') }}
            </router-link>
            <router-link
              role="menuitem"
              class="u-dropdown-item"
              to="/user/orders"
              @click="handleMenuClick"
            >
              <span class="dropdown-item-icon" aria-hidden="true"><AppIcon name="package" /></span>
              {{ t('navbar.orders') }}
            </router-link>
            <router-link
              role="menuitem"
              class="u-dropdown-item"
              to="/user/favorites"
              @click="handleMenuClick"
            >
              <span class="dropdown-item-icon" aria-hidden="true"><AppIcon name="heart" /></span>
              {{ t('navbar.favorites') }}
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
              {{ t('navbar.assets') }}
            </router-link>
            <router-link
              role="menuitem"
              class="u-dropdown-item"
              to="/user/kami"
              @click="handleMenuClick"
            >
              <span class="dropdown-item-icon" aria-hidden="true"><AppIcon name="key" /></span>
              {{ t('navbar.kami') }}
            </router-link>
            <!--
              签到归「账号资产」而不是会员那一组：非会员同样每天签到赚积分，
              它是个人中心功能（`/user/checkin`），不是会员门槛。
              3.0.0 起页面本身是「日历 + 日详情」，入口文案随之改成「签到日历」——
              名字要跟点进去看到的东西一致，否则「每日签到」会让人以为是一键按钮。
            -->
            <router-link
              role="menuitem"
              class="u-dropdown-item"
              to="/user/checkin"
              @click="handleMenuClick"
            >
              <span class="dropdown-item-icon" aria-hidden="true"><AppIcon name="calendar" /></span>
              {{ t('navbar.checkin') }}
            </router-link>
            </div>

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

        <!--
          移动端菜单切换按钮（4.18.0）：两道横线 → 展开后交叉成 ×。
          三条横线在 18px 内挤成三行会糊成一片灰，两条在各尺寸下都读得出「菜单」。
        -->
        <button
          type="button"
          class="u-icon-btn menu-toggle show-mobile navbar-action"
          :class="{ active: menuOpen }"
          :aria-expanded="menuOpen"
          :aria-label="t('navbar.toggleMenu')"
          @click="toggleMenu"
        >
          <span class="menu-toggle-bars" aria-hidden="true">
            <i></i><i></i>
          </span>
        </button>
      </div>
    </div>

    <!--
      移动端抽屉（4.18.0 重做）。

      设计判断：抽屉此前是**桌面导航的竖排复制**（五条纯文字 + 下边框），
      而底部悬浮栏已经有「首页 / 分类」两个一级入口 —— 同一个目标在一屏里
      出现两次，抽屉就变成了「桌面菜单的手机备份」。

      现在的取舍：
        · 只保留底部栏没有的三项（热门推荐 / 工具分享 / 关于我们）；
        · 每条是「图标 + 文案 + 箭头」的一行 48px 触控行，而不是带分隔线的纯文字；
        · 账号类入口（消息中心）只出现在这里，注册用户才看得到；
        · 偏好（主题 / 语言）收在同一张面板底部，与导航之间用一条分组标题隔开。
    -->
    <!--
      抽屉（4.20.0）：从「一列带下划线的链接」改成两段卡片。

      为什么分卡：导航（去哪）与偏好（怎么显示）是两件事，之前只靠一条分组标题
      分隔，滚动时标题会滑出视野，链接和开关就混成一片。卡片给了它们各自的边界。
      为什么偏好行是「左标签 + 右控件」：外观三档与语言两枚短码，控件都在右侧，
      两行的左边缘对齐，读起来是一张设置表，而不是两个不同的组件拼在一起。
    -->
    <div
      class="navbar-drawer"
      :class="{ active: menuOpen }"
      role="dialog"
      :aria-label="t('navbar.menuTitle')"
      :aria-hidden="menuOpen ? 'false' : 'true'"
    >
      <section class="drawer-card">
        <p class="drawer-group-title">{{ t('navbar.discoverGroup') }}</p>
        <ul class="drawer-list">
          <li v-for="item in drawerMenu" :key="item.id">
            <router-link :to="item.path" class="drawer-link" @click="handleMenuClick">
              <span class="drawer-link-icon" aria-hidden="true">
                <AppIcon :name="item.icon" />
              </span>
              <span class="drawer-link-text">{{ item.label }}</span>
              <span class="drawer-link-hint" aria-hidden="true">
                <AppIcon name="chevron-right" />
              </span>
            </router-link>
          </li>
        </ul>

        <!-- 消息中心：窄屏顶栏不挂信封之后，这里是它的唯一入口。
             角标沿用顶栏那套未读数，避免出现「入口有了、未读看不见」。 -->
        <router-link
          v-if="userStore.isLoggedIn"
          to="/mail"
          class="drawer-link drawer-link--account"
          @click="handleMenuClick"
        >
          <span class="drawer-link-icon" aria-hidden="true"><AppIcon name="mail" /></span>
          <span class="drawer-link-text">{{ mailLabel }}</span>
          <span v-if="mailStore.hasUnread" class="u-badge drawer-link-badge" aria-hidden="true">
            {{ mailStore.unreadLabel }}
          </span>
          <span class="drawer-link-hint" aria-hidden="true"><AppIcon name="chevron-right" /></span>
        </router-link>
      </section>

      <section class="drawer-card drawer-card--prefs">
        <p class="drawer-group-title">{{ t('navbar.preferencesGroup') }}</p>

        <div class="drawer-row">
          <span class="drawer-row-label">{{ THEME_SWITCH.label }}</span>
          <ThemeSwitch />
        </div>

        <div class="drawer-row">
          <span class="drawer-row-label">{{ t('language.label') }}</span>
          <LanguageSwitch variant="drawer" />
        </div>

        <!--
          语言反馈的出口：放在语言行的正下方，因为它是「这一行不够用」时才会想到的东西。
          链接带 `from`（当前界面语言），客服中心据此把正文骨架写成「界面语言：English (en-US)」，
          用户不必自己描述「我在用哪个语言看到的问题」。
        -->
        <router-link
          class="drawer-note"
          :to="{ path: '/support', query: { topic: 'language', from: locale } }"
          @click="handleMenuClick"
        >
          <span class="drawer-note-text">{{ t('language.feedbackTitle') }}</span>
          <span class="drawer-note-cta">
            {{ t('language.feedbackCta') }}
            <AppIcon name="chevron-right" aria-hidden="true" />
          </span>
        </router-link>
      </section>
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
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useUserStore } from '@/stores/user'
import { useMemberStore } from '@/stores/member'
import { useCartStore } from '@/stores/cart'
import { useMailStore } from '@/stores/mail'
import { throttle } from '@/utils/index.js'
import { createClickGuard } from '@/utils/rateLimit.js'
import ThemeSwitch from './ThemeSwitch.vue'
import LanguageSwitch from './LanguageSwitch.vue'
import AppIcon from './AppIcon.vue'
import GlobalSearch from './GlobalSearch.vue'
import SmartImage from './SmartImage.vue'
import { NAV_MENU, PAGES, SITE, AUTH, BOOT, THEME_SWITCH } from '@/constants/index.js'
import { toDate } from '@/hooks/useSimpleTimeFormatter/index.js'
const userStore = useUserStore()
const cartStore = useCartStore()
const memberStore = useMemberStore()
const mailStore = useMailStore()
const route = useRoute()
const router = useRouter()
const { t, locale } = useI18n()

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
  const who = nickname.value || t('navbar.nicknameUnset')
  const role = isGuest.value ? AUTH.guestBadge : t('navbar.signedIn')
  return t('navbar.identityLabel', { name: who, role })
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

/**
 * 抽屉里展示哪些导航项（4.18.0）。
 *
 * 首页与商品分类在移动端已经是底部悬浮栏的一级入口，抽屉再列一遍就是
 * 同一个目标的第二个入口 —— 触屏上「同一件事只在一处出现」比「到处都能到」更重要。
 * 图标按目标配：热门推荐=火苗、工具分享=扳手、关于我们=信息。
 */
const DRAWER_ICONS = { '/hot': 'flame', '/tool': 'wrench', '/about': 'info' }
const drawerMenu = computed(() =>
  navMenu
    .filter((item) => item.path !== '/home' && item.path !== '/categories')
    .map((item) => ({ ...item, icon: DRAWER_ICONS[item.path] || 'sparkles' })),
)

/** 购物车角标：来自 cart store，登录后由 App.vue 拉取 */
const cartCount = computed(() => cartStore.count)
const cartLabel = computed(() =>
  cartCount.value > 0 ? t('navbar.cartCount', { count: cartCount.value }) : t('navbar.cartEmpty')
)

/**
 * 会员入口的无障碍名：等级只在**已经拿到**会员概览时才读出来。
 *
 * 概览由 App.vue 在身份就绪后统一拉取（登录、换号、首屏各一次），这里不自己发请求 ——
 * 顶栏拿不到的只有「未登录」这一种情况，那时读成「会员中心」即可，不编造等级。
 */
const memberLabel = computed(() =>
  memberStore.levelName
    ? t('navbar.memberLevel', { level: memberStore.levelName })
    : t('navbar.member')
)

/**
 * 消息入口的无障碍名：把未读数读出来。
 *
 * 角标本身是 `aria-hidden` 的纯装饰（读屏用户看不到那个红点），
 * 因此「有几条未读」这件事必须由这个标签承担，否则它对读屏用户完全不可见。
 * 未读数由 App.vue 在身份就绪后统一拉取，这里不自己发请求。
 */
const mailLabel = computed(() =>
  mailStore.hasUnread
    ? t('navbar.mailUnread', { count: mailStore.unreadCount })
    : t('navbar.mail')
)

/**
 * 全局搜索：顶栏只留一枚放大镜，真正的搜索面板由 GlobalSearch 承担。
 *
 * 为什么不再把输入框塞进顶栏：
 *   - 展开式输入框一次只能搜商品，工具在另一个接口里；
 *   - 手机上展开要挤掉 Logo 与图标，收起后又只剩一个图标；
 *   - 结果还要跳到结果页，等于把「输入」和「看结果」拆成两页。
 * 现在点击或 Ctrl / Cmd + K 打开命令面板，页面 / 商品 / 工具同屏。
 */
const globalSearchRef = ref(null)

const openGlobalSearch = () => {
  menuOpen.value = false
  globalSearchRef.value?.open()
}

const handleScroll = throttle(() => {
  isScrolled.value = window.scrollY > 50
}, 100)

const toggleMenu = () => {
  menuOpen.value = !menuOpen.value
  //  drawers 与身份面板同占顶栏下方那块空间，同时展开会叠在一起
  if (menuOpen.value) userMenuOpen.value = false
}

/** 收起所有菜单（抽屉与用户下拉） */
const handleMenuClick = () => {
  menuOpen.value = false
  userMenuOpen.value = false
}

/* 点抽屉里的链接（站内路由 / 语言反馈）后必须自己收起来：
 * 4.19.0 加了「反馈语言问题」才暴露 —— 抽屉不在 RouterView 里，路由变了它不会自动关，
 * 用户会落在「新页面已被菜单盖住」的状态。 */
watch(
  () => route.fullPath,
  () => {
    menuOpen.value = false
    userMenuOpen.value = false
  }
)

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
  if (userMenuOpen.value) {
    closeUserMenu()
    return
  }
  // 身份面板与抽屉同占顶栏下方那块空间，先收起抽屉
  menuOpen.value = false
  openUserMenu()
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
 * 放在伪元素上是为了不产生 fixed 后代的包含块（见组件顶部注释）。
 * 4.8.0：顶栏改成「浮在内容上」的玻璃表面；
 * 4.10.0：按 Liquid Glass 补一层顶部 specular 与内缘高光，
 * 玻璃不再是一块均匀的半透明色，上缘有光、往下衰减。
 * backdrop-filter 只写在这个伪元素上，不会给导航内部的下拉制造包含块。 */
.navbar::before {
  content: '';
  position: absolute;
  inset: 0;
  z-index: -1;
  /* 玻璃 = 背景色（表面）+ 背景图层（上缘 specular、品牌色洗染）。
   *
   * 4.12.0 修正：这里原本写成一串 `background: specular, tint, bg`，
   * 但 CSS 的 background 简写里**只有最后一层能放颜色**，中间两层是颜色 → 整条声明
   * 在计算值阶段作废（既不报错也不生效），于是顶栏一直没有底色，只剩模糊与投影。
   * 拆成 background-color + background-image 之后，洗染以线性渐变（合法的图层）参与叠加。 */
  background-color: var(--glass-nav-bg);
  background-image: var(--glass-nav-specular), var(--glass-nav-wash);
  border-bottom: var(--stroke-width) solid var(--glass-nav-border);
  box-shadow: var(--glass-nav-highlight), var(--glass-nav-rim);
  -webkit-backdrop-filter: blur(var(--glass-nav-blur)) saturate(var(--glass-nav-saturate));
  backdrop-filter: blur(var(--glass-nav-blur)) saturate(var(--glass-nav-saturate));
  transition:
    background-color var(--transition-surface),
    box-shadow var(--transition-surface);
}

/* 滚动后：玻璃变「厚」一档 —— 底色加密、模糊加深、投影落下。
 * 三件事一起变，用户读到的是「有一层东西压上来了」，而不是某一项数值在动。 */
.navbar-scrolled::before {
  background-color: var(--glass-nav-bg-strong);
  background-image: var(--glass-nav-specular), var(--glass-nav-wash-strong);
  -webkit-backdrop-filter: blur(var(--glass-nav-blur-strong)) saturate(var(--glass-nav-saturate));
  backdrop-filter: blur(var(--glass-nav-blur-strong)) saturate(var(--glass-nav-saturate));
}

/* 不支持背景模糊 / 用户要求降低透明度时退回实底，不做「假玻璃」 */
@supports not ((backdrop-filter: blur(1px)) or (-webkit-backdrop-filter: blur(1px))) {
  .navbar::before,
  .navbar-scrolled::before {
    background-color: var(--bg-nav);
    background-image: none;
  }
}

@media (prefers-reduced-transparency: reduce) {
  .navbar::before,
  .navbar-scrolled::before {
    background-color: var(--bg-nav);
    background-image: none;
    -webkit-backdrop-filter: none;
    backdrop-filter: none;
  }
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
  display: inline-flex;
  align-items: center;
  font-size: calc(var(--nav-logo-height) * 0.9);
  line-height: 1;
  color: var(--accent);
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

/* ── 操作区 ─────────────────────────────────────────────── */
.navbar-actions {
  display: flex;
  align-items: center;
  gap: calc(var(--space-unit) * 1.5);
  flex: none;
  margin-left: auto;
}

/*
 * 操作区的三个落点（4.20.0）：共用一个「动作盒」。
 *
 * 4.19.0 之前它们是三种语法：一枚裸图标、一个 28px 实心圆、两根横杠。
 * 视觉重量不同、下缘也对不齐，读起来像三个来源不同的控件。
 * 现在：同一个 36px 视觉盒（手机 40）+ 同一个圆角 + 同一套悬停底色，
 * 图标统一 20px；头像缩成 24px 的圆形子元素，右侧再补一枚 14px 的箭头
 * —— 它于是变成「身份胶囊」，是这个家庭里的一员，而不是一个更大的头像。
 *
 * 命中区：盒子里是 36/40，但 `::after` 撑到 44×44（触控下限），
 * 所以看起来轻、点起来不费劲。
 */
.navbar-action {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 2px;
  width: 36px;
  height: 36px;
  padding: 0;
  border: 0;
  border-radius: var(--radius-pill);
  background: transparent;
  color: var(--text-secondary);
  cursor: pointer;
  transition:
    background var(--transition-interactive),
    color var(--transition-interactive);
}

.navbar-action:hover,
.navbar-action:focus-visible {
  background: var(--bg-soft);
  color: var(--text-primary);
}

.navbar-action::after {
  content: '';
  position: absolute;
  inset: -4px;
  border-radius: inherit;
}

/* 图标尺寸（4.21.0）：AppIcon 渲染成 `.app-icon`，不吃 `.ec-icon-btn .ic` 的 18px，
 * 于是搜索那枚只有 13.3px、汉堡却是 20px —— 同排两个图标一大一小，正是这套按钮
 * 最刺眼的破绽。这里给三个落点同一把尺子：桌面 18、手机 20；身份里的箭头单独 9。
 */
.navbar-action .app-icon:not(.navbar-identity-caret) {
  width: 18px;
  height: 18px;
}

/* ── 用户菜单 ───────────────────────────────────────────── */
.navbar-user {
  position: relative;
}

/* 身份胶囊：宽度由内容决定（头像 + 箭头），高度仍与两侧图标一致 */
.user-avatar-btn {
  width: auto;
  padding: 0 calc(var(--space-unit) * 0.75) 0 calc(var(--space-unit) * 0.5);
}

.navbar-identity-avatar {
  position: relative;
  display: inline-flex;
  flex: none;
  border-radius: var(--avatar-radius);
}

.navbar-identity-caret {
  flex: none;
  font-size: calc(var(--icon-btn-icon-size) * 0.7);
  opacity: 0.7;
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

/* 在线状态圆点：头像右下角的小绿点。
 *
 * 为什么挂在 `.navbar-identity-avatar`（头像的定位盒）而不是 `.u-avatar` 里面：
 *   `.u-avatar` 是 `overflow: hidden` + 圆形，挂在里面会被裁成半个月牙。
 *   4.20.0 起头像外面多了一层定位盒，圆点贴盒的右下角，恰好落在头像边缘。
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

/* 身份卡（4.19.0）：头像 + 昵称/徽标/创建时间。
 * 底色是一层品牌色洗染 + 表面色，与个人中心的「通行证」同一套语言；
 * 它只是抬头，不承接点击 —— 个人中心就在下面第一格。 */
.user-info {
  display: flex;
  align-items: center;
  gap: calc(var(--space-unit) * 1.5);
  margin: calc(var(--space-unit) * 0.5) calc(var(--space-unit) * 0.5) 0;
  padding: calc(var(--space-unit) * 1.5);
  border-radius: var(--ec-radius-lg);
  background:
    linear-gradient(
      135deg,
      color-mix(in srgb, var(--accent) 12%, transparent),
      transparent 72%
    ),
    var(--bg-soft);
}

.user-card-avatar {
  flex: none;
  width: calc(var(--space-unit) * 5);
  height: calc(var(--space-unit) * 5);
}

.user-card-body {
  display: flex;
  flex-direction: column;
  gap: calc(var(--space-unit) * 0.5);
  min-width: 0;
}

/* 昵称与「游客」徽标同一行：徽标不参与压缩，昵称过长时省略 */
.user-name {
  display: flex;
  align-items: center;
  gap: calc(var(--space-unit));
  font-size: var(--fs-sm);
  font-weight: var(--fw-heading);
  color: var(--text-primary);
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
  gap: calc(var(--space-unit) * 0.75);
  width: var(--icon-btn-icon-size);
}

.menu-toggle-bars i {
  display: block;
  height: calc(var(--space-unit) * 0.3);
  background: currentColor;
  border-radius: var(--radius-pill);
  transition: transform var(--transition-interactive), opacity var(--transition-interactive);
}

/* 4.18.0：两道横线 → ×（原来三道线，18px 内挤成三条 1.2px 的灰杠，读不出「菜单」）。
 * 两道线的中线正好落在盒心，因此两条各转 ±45° 就是干净的叉号，不需要位移补偿。 */
.menu-toggle.active .menu-toggle-bars i:nth-child(1) {
  transform: translateY(calc(var(--space-unit) * 0.53)) rotate(45deg);
}

.menu-toggle.active .menu-toggle-bars i:nth-child(2) {
  transform: translateY(calc(var(--space-unit) * -0.52)) rotate(-45deg);
}

/* ── 移动端抽屉 ─────────────────────────────────────────── */
.navbar-drawer {
  position: fixed;
  top: var(--navbar-height);
  left: 0;
  right: 0;
  max-height: calc(100vh - var(--navbar-height));
  overflow-y: auto;
  overscroll-behavior: contain;
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

/* 抽屉只属于窄屏。桌面没有汉堡，但「在窄屏打开后再拉宽窗口」会把这层留
 * 在页面上（4.20.0 实测：整宽两张卡盖住首屏），所以桌面直接不渲染。 */
@media (min-width: 768px) {
  .navbar-drawer {
    display: none;
  }
}

/* 分组标题：抽屉从「一列纯文字」变成「两组」，需要一行小字说明第一组是什么 */
.drawer-group-title {
  margin: 0 0 calc(var(--space-unit) * 1);
  font-size: var(--fs-label);
  font-weight: var(--fw-label);
  letter-spacing: var(--tracking-label);
  text-transform: uppercase;
  color: var(--text-muted);
}

.drawer-list {
  display: flex;
  flex-direction: column;
  gap: calc(var(--space-unit) * 0.75);
}

/* 4.18.0 抽屉行：图标 + 文案 + 箭头，48px 触控高度。
 * 不再是「纯文字 + 下边框」——那种列表在触屏上没有可指认的目标边界。 */
.drawer-link {
  display: flex;
  align-items: center;
  gap: calc(var(--space-unit) * 1.5);
  min-height: 48px;
  padding: 0 calc(var(--space-unit) * 1.5);
  font-size: var(--fs-body);
  font-weight: var(--fw-label);
  letter-spacing: var(--tracking-label);
  color: var(--text-secondary);
  border-radius: var(--ec-radius-lg);
  transition: background-color var(--transition-interactive), color var(--transition-interactive);
}

.drawer-link:hover,
.drawer-link:focus-visible {
  background: var(--bg-soft);
  color: var(--text-primary);
}

.drawer-link.router-link-active {
  color: var(--accent);
  background: var(--accent-soft);
}

.drawer-link-icon {
  display: inline-flex;
  flex: none;
  font-size: var(--icon-btn-icon-size);
  color: var(--text-muted);
}

.drawer-link.router-link-active .drawer-link-icon {
  color: currentColor;
}

.drawer-link-text {
  flex: 1 1 auto;
  min-width: 0;
}

.drawer-link-hint {
  display: inline-flex;
  flex: none;
  font-size: var(--fs-sm);
  color: var(--text-muted);
}

.drawer-link-badge {
  flex: none;
}

/* 账号类入口与「发现」组之间留一道气口，避免读成同一组 */
.drawer-link--account {
  margin-top: calc(var(--space-unit) * 2);
  background: var(--bg-soft);
}

/* ── 抽屉里的分组卡片（4.20.0） ──
 * 抽屉外层已经是一张浮起的面板，里面再套卡片的唯一理由是**分组**：
 * 导航（去哪）与偏好（怎么显示）不是一件事，各自有一块边界之后，
 * 滚动时分组标题滑出视野也不会让两类内容混成一片。 */
.drawer-card {
  padding: calc(var(--space-unit) * 1.5);
  border: 1px solid var(--border);
  border-radius: var(--ec-radius-lg);
  background: var(--ec-bg-surface);
}

.drawer-card--prefs {
  margin-top: calc(var(--space-unit) * 1.5);
}

/* 偏好行：左标签 + 右控件。
 * 与「外观」一行同构 —— 两行左边缘对齐、控件右对齐，读起来是一张设置表，
 * 而不是「一行文字 + 一列语言」和「一行文字 + 三枚图标」拼起来的两个组件。 */
.drawer-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: calc(var(--space-unit) * 1.5);
  min-height: var(--ec-control-h-lg);
}

.drawer-row + .drawer-row {
  margin-top: calc(var(--space-unit) * 0.5);
}

.drawer-row-label {
  font-size: var(--fs-sm);
  color: var(--text-secondary);
}

/* 脚注：语言反馈的出口。做成一条轻链接，不做卡片 ——
 * 它是「这一行不够用」时的补充路径，不该与上面的导航行争视觉重量。 */
.drawer-note {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: calc(var(--space-unit) * 1.5);
  margin-top: calc(var(--space-unit) * 1);
  padding: calc(var(--space-unit) * 0.75) 0 0;
  border-top: 1px solid var(--divider);
  font-size: var(--fs-label);
  color: var(--text-muted);
  text-decoration: none;
}

.drawer-note:hover,
.drawer-note:focus-visible {
  color: var(--text-primary);
}

.drawer-note-cta {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  flex: none;
  font-weight: var(--fw-label);
  color: var(--accent);
  white-space: nowrap;
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

.show-below-768 {
  display: none;
}

@media (max-width: 767px) {
  /* 手机搜索抽屉从顶边铺下来时，顶栏**不再让位**。
   *
   * 4.11.0 曾用 `html.gs-open` 把顶栏 opacity 归零：抽屉背后确实干净了，
   * 但顶栏那块玻璃是页面的固定结构 —— 关抽屉时它要重新淡入 180ms，
   * 读起来就是「背景突然出现」。改成让抽屉自己盖住顶栏那一行：
   * 顶栏始终保持原样，进出抽屉时只有抽屉在动，页面背景不再闪。 */

  .hide-below-768 {
    display: none;
  }

  .show-below-768 {
    display: inline-flex;
  }

  .menu-toggle {
    display: inline-flex;
    /* 视觉盒由 .navbar-action 给（手机 40），这里只保证它排得下 */
    min-width: var(--ec-control-h-md);
    min-height: var(--ec-control-h-md);
    justify-content: center;
  }

  /* 移动端缩放：导航高度 ×0.85 */
  .navbar-inner {
    height: calc(var(--navbar-height) * var(--mobile-nav-scale));
    gap: calc(var(--space-unit) * 2);
  }

  /* 手机：玻璃面积小、滚动又长，模糊收一档换帧率（令牌覆盖，不动规则本身，
   * 滚动态与常驻态一起缩放，级联顺序不会互相盖掉）。 */
  .navbar {
    --glass-nav-blur: 18px;
    --glass-nav-blur-strong: 24px;
    /* 头像（4.20.0）：24px，是 20px 图标略大一号，但整枚胶囊仍是 40 高，
     * 所以它在行里不再比搜索与菜单「重」。 */
    --navbar-avatar-size: 24px;
  }

  /* 三个落点（搜索 / 身份 / 菜单）在窄屏上视觉盒一律 40×40、间距 10：
   * 4.21.0 起身份也不再是「头像 + 箭头」的宽胶囊 —— 它在 40 的盒子里装
   * 24 的头像与 9 的箭头，于是三枚盒子等宽等高，眼睛读到的是同一排动作。
   * 命中区由 `.navbar-action::after` 撑到 44，拇指不会点错邻居。 */
  .navbar-actions {
    gap: calc(var(--space-unit) * 1.25);
    /* 三个落点的图标统一 20（原来是 18，比 24 的头像轻一档，看着不是一个量级） */
    --icon-btn-icon-size: 20px;
  }

  .navbar-action {
    width: 40px;
    height: 40px;
  }

  /* 手机图标 20：与 24 的头像同一量级（18 配 24 时，头像明显更重） */
  .navbar-action .app-icon:not(.navbar-identity-caret) {
    width: 20px;
    height: 20px;
  }

  /* 身份按钮：定宽 40，内部 24 头像 + 9 箭头居中对齐，宽度不再随内容漂移 */
  .user-avatar-btn {
    width: 40px;
    gap: 2px;
    padding: 0;
  }

  .navbar-identity-caret {
    font-size: 9px;
    opacity: 0.6;
  }

  /* 打开态：与悬停同一套底色，外加一枚强调色内环 —— 箭头很小，
   * 「点开了」这件事交给底色和内环来说。 */
  .user-avatar-btn[aria-expanded='true'] {
    background: var(--bg-soft);
    color: var(--text-primary);
  }

  .user-avatar-btn[aria-expanded='true'] .u-avatar {
    box-shadow: 0 0 0 1.5px var(--accent);
  }

  .user-avatar-btn .u-avatar {
    width: var(--navbar-avatar-size);
    height: var(--navbar-avatar-size);
    /* 外描边：玻璃是半透的，头像边缘若没有一圈表面色，遇到深色内容会「融」进去 */
    box-shadow: 0 0 0 1.5px var(--ec-bg-surface);
  }

  /* 头像 24 后，状态点 7px / 2px 描边，贴在圆形边缘的右下 45° */
  .navbar-avatar-status {
    right: -1px;
    bottom: -1px;
    width: 7px;
    height: 7px;
    box-shadow: 0 0 0 2px var(--ec-bg-surface);
  }

  /* ── 抽屉：手机上是「从顶栏垂下来的面板」，不是铺满屏的菜单 ──
   * 与身份面板同一套几何：离顶栏 1.5 单位、左右各 2 单位，两张浮层因此能互换。 */
  .navbar-drawer {
    top: calc(var(--navbar-height) * var(--mobile-nav-scale) + var(--space-unit) * 1.5);
    left: calc(var(--space-unit) * 2);
    right: calc(var(--space-unit) * 2);
    max-height: calc(100dvh - var(--navbar-height) * var(--mobile-nav-scale) - var(--space-unit) * 6);
    padding: calc(var(--space-unit) * 2) calc(var(--space-unit) * 1.5) calc(var(--space-unit) * 2);
    background: var(--ec-bg-raised);
    border: var(--stroke-width) solid var(--stroke-color);
    border-radius: var(--ec-radius-xl);
    box-shadow: var(--ec-shadow-xl);
  }

  /* ── 身份面板：窄屏从这里展开成一张「账号卡 + 三列资产网格」 ──
   * 桌面那版是 224px 的右侧小下拉；在 390px 上它只有 224px 宽、条目挤在
   * 右上角，手指够不到底部两行。窄屏改成与抽屉同一张面板的宽度与圆角。 */
  .user-dropdown {
    position: fixed;
    top: calc(var(--navbar-height) * var(--mobile-nav-scale) + var(--space-unit) * 1.5);
    left: calc(var(--space-unit) * 2);
    right: calc(var(--space-unit) * 2);
    width: auto;
    max-width: none;
    max-height: calc(100dvh - var(--navbar-height) * var(--mobile-nav-scale) - var(--space-unit) * 6);
    padding: calc(var(--space-unit) * 1.5);
    overflow-y: auto;
    overscroll-behavior: contain;
    border-radius: var(--ec-radius-xl);
  }

  /* 两列入口（4.19.0）：六个目的地从「3 列方格墙」改成「2 列横条」。
   * 方格墙的问题是六格等重、每格 76px，像一块仪表盘而不是菜单；
   * 横条 44px 高、图标 + 标签一行读完，面板高度少了约 40%，拇指一屏看全。 */
  .user-menu-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: var(--space-unit);
    margin-top: calc(var(--space-unit) * 1.5);
  }

  .user-menu-grid .u-dropdown-item {
    flex-direction: row;
    justify-content: flex-start;
    gap: calc(var(--space-unit) * 1.25);
    height: auto;
    min-height: var(--ec-control-h-md);
    padding: 0 calc(var(--space-unit) * 1.5);
    font-size: var(--fs-label);
    background: var(--bg-soft);
    border-radius: var(--ec-radius-lg);
  }

  .user-menu-grid .user-menu-first-item {
    margin-top: 0;
  }

  .user-menu-grid .dropdown-item-icon {
    font-size: calc(var(--icon-btn-icon-size) * 1.1);
  }

  /* 顶栏自带的那组三档控件在窄屏收进抽屉，这里把它藏掉，避免出现两份外观开关 */
  .navbar-actions :deep(.theme-switch) {
    display: none;
  }
}

@media (max-width: 575px) {
  .logo-text {
    display: none;
  }
}
</style>
