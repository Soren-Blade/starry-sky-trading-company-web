<template>
  <!--
    移动端底部悬浮导航
    设计约束（来自 design-partner 的 Tab Bar 规范）：
    - 5 个入口，图标 + 文字，最后一个放「我的」；
    - 当前项至少两重提示：位移/形状 + 字重 + 颜色（不能只靠颜色，WCAG 1.4.1）；
    - 每个点击区域 >= 44x44；
    - 高度 60px，另外留 iOS 安全区，页面底部要留出等量空间。

    4.12.0 起，选中态不再由「每项自己上底色」表达，而是**一枚共享的胶囊**
    在五个格位之间滑动：胶囊有一条更慢的软尾跟着（像液体被拖动），
    换 Tab 时看到的是「同一块材料移动了」，而不是「颜色从这项跳到那项」。
  -->
  <nav
    class="bottom-nav"
    :style="{ '--nav-index': activeIndex }"
    :aria-label="t('bottomNav.label')"
  >
    <span
      v-if="activeIndex >= 0"
      class="bottom-nav-flow"
      aria-hidden="true"
    ></span>
    <span
      v-if="activeIndex >= 0"
      class="bottom-nav-thumb"
      aria-hidden="true"
    ></span>
    <ul class="bottom-nav-list">
      <li v-for="item in items" :key="item.key" class="bottom-nav-cell">
        <router-link
          :to="item.to"
          class="bottom-nav-item"
          :class="{ 'is-active': isActive(item) }"
          :aria-current="isActive(item) ? 'page' : undefined"
          :aria-label="item.ariaLabel"
        >
          <span class="bottom-nav-icon" aria-hidden="true">
            <AppIcon :name="item.icon" />
            <span v-if="item.key === 'cart' && cartCount > 0" class="bottom-nav-badge">
              {{ cartCount > 99 ? '99+' : cartCount }}
            </span>
          </span>
          <span class="bottom-nav-label">{{ item.label }}</span>
        </router-link>
      </li>
    </ul>
  </nav>
</template>

<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useCartStore } from '@/stores/cart'
import AppIcon from './AppIcon.vue'

const route = useRoute()
const cartStore = useCartStore()
const { t } = useI18n()

const cartCount = computed(() => cartStore.count)

/**
 * 工具页住在十几个顶级前缀下（/dev、/text、/media …），
 * 所以「工具」这一项用前缀集合判断，而不是只看 /tool。
 */
const TOOL_PREFIXES = [
  '/tool',
  '/video',
  '/image',
  '/dev',
  '/text',
  '/code',
  '/media',
  '/office',
  '/design',
  '/convert',
  '/data',
  '/utility',
  '/net',
  '/life',
  '/fun',
  '/other',
]

const ACCOUNT_PREFIXES = [
  '/user',
  '/member',
  '/growth',
  '/points',
  '/checkin',
  '/coupons',
  '/invite',
  '/mail',
  '/support',
]

function startsWithAny(path, prefixes) {
  return prefixes.some((prefix) => path === prefix || path.startsWith(`${prefix}/`))
}

const items = computed(() => [
  {
    key: 'home',
    to: '/home',
    icon: 'home',
    label: t('bottomNav.home'),
    ariaLabel: t('bottomNav.home'),
    match: (path) => path === '/home' || path === '/',
  },
  {
    key: 'categories',
    to: '/categories',
    icon: 'layout-grid',
    label: t('bottomNav.categories'),
    ariaLabel: t('bottomNav.categories'),
    match: (path) => path === '/categories' || path.startsWith('/category/'),
  },
  {
    key: 'tools',
    to: '/tool',
    icon: 'wrench',
    label: t('bottomNav.tools'),
    ariaLabel: t('bottomNav.tools'),
    match: (path) => startsWithAny(path, TOOL_PREFIXES),
  },
  {
    key: 'cart',
    to: '/cart',
    icon: 'shopping-cart',
    label: t('bottomNav.cart'),
    ariaLabel: cartCount.value
      ? t('a11y.cartCount', { count: cartCount.value })
      : t('a11y.cartCountEmpty'),
    match: (path) => path === '/cart',
  },
  {
    key: 'me',
    to: '/user/profile',
    icon: 'user',
    label: t('bottomNav.me'),
    ariaLabel: t('bottomNav.me'),
    match: (path) => startsWithAny(path, ACCOUNT_PREFIXES),
  },
])

function isActive(item) {
  return item.match(route.path)
}

/**
 * 胶囊的格位索引：-1 表示当前路由不在这五项里（例如 /login），此时不画胶囊。
 * 用 findIndex 而不是把 index 写进 items —— 胶囊和列表必须来自同一份顺序。
 */
const activeIndex = computed(() => items.value.findIndex((item) => isActive(item)))
</script>

<style scoped>
.bottom-nav {
  display: none;
}

@media (max-width: 767px) {
  /* 悬浮 Tab Bar：Liquid Glass —— 半透明表面 + 背景模糊 + 顶部 specular。
   * 上缘亮、往下衰减，再用内缘高光把圆角「折」出来；
   * 浮在内容上方时不切断页面，也不会像实底那样「贴一块砖」。 */
  .bottom-nav {
    position: fixed;
    left: 50%;
    bottom: calc(12px + env(safe-area-inset-bottom, 0px));
    z-index: var(--z-sticky, 100);
    display: block;
    width: calc(100% - 24px);
    max-width: 520px;
    padding: 5px;
    transform: translateX(-50%);
    /* 与顶栏同一套拆法：底色走 background-color，specular 与品牌洗染走图层 */
    background-color: var(--glass-nav-bg-strong);
    background-image: var(--glass-nav-specular), var(--glass-nav-wash);
    border: 1px solid var(--glass-nav-border);
    border-radius: 22px;
    box-shadow: var(--glass-nav-highlight), var(--glass-nav-rim), var(--glass-nav-lift-strong);
    -webkit-backdrop-filter: blur(var(--glass-nav-blur)) saturate(var(--glass-nav-saturate));
    backdrop-filter: blur(var(--glass-nav-blur)) saturate(var(--glass-nav-saturate));
    /* 胶囊与软尾都是绝对定位，锚在这层玻璃的 padding box 上 */
    isolation: isolate;
  }

  /* 不支持背景模糊时退回实底；降低透明度偏好同理 */
  @supports not ((backdrop-filter: blur(1px)) or (-webkit-backdrop-filter: blur(1px))) {
    .bottom-nav {
      background-color: var(--bg-elevated);
      background-image: none;
    }
  }

  @media (prefers-reduced-transparency: reduce) {
    .bottom-nav {
      background-color: var(--bg-elevated);
      background-image: none;
      -webkit-backdrop-filter: none;
      backdrop-filter: none;
    }
  }
}

/* 五个格位必须等宽且无间隙：胶囊按 1/5 宽度平移，缝会累积成错位 */
.bottom-nav-list {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: stretch;
  gap: 0;
  margin: 0;
  padding: 0;
  list-style: none;
}

/* 选中胶囊：一枚实体，在五个格位间滑动。
 * 里面的层叠是「玻璃上的凸起」：顶部一道受光、底部轻微压暗，
 * 再叠一层品牌色的淡染，读起来像玻璃下面浮起的一颗液滴。 */
.bottom-nav-thumb {
  position: absolute;
  top: 5px;
  bottom: 5px;
  left: 5px;
  width: calc((100% - 10px) / 5);
  border-radius: 17px;
  background:
    radial-gradient(
      120% 100% at 50% 0%,
      color-mix(in srgb, var(--ec-bg-surface) 82%, transparent),
      transparent 72%
    ),
    var(--accent-soft);
  box-shadow:
    inset 0 1px 0 color-mix(in srgb, var(--ec-bg-surface) 78%, transparent),
    inset 0 -1px 0 color-mix(in srgb, var(--accent) 14%, transparent);
  transform: translateX(calc(var(--nav-index, 0) * 100%));
  transition: transform 320ms cubic-bezier(0.34, 1.4, 0.5, 1);
  pointer-events: none;
}

/* 胶囊顶部的 2px 指示条跟着胶囊走：位移本身就是「第几项」的提示，
 * 不需要每项各自长一条（那会让换 Tab 时三条线索各说各话）。 */
.bottom-nav-thumb::after {
  content: '';
  position: absolute;
  top: 2px;
  left: 50%;
  width: 16px;
  height: 2px;
  border-radius: 1px;
  background: var(--accent);
  transform: translateX(-50%);
}

/* 软尾：同一块材料被「拖」出来的拖影，比胶囊慢 240ms，先到的是胶囊、后到的是它。
 * 只有位移，没有透明度变化 —— 停下来的那一刻它会自己追上，不会留残影。 */
.bottom-nav-flow {
  position: absolute;
  top: 7px;
  bottom: 7px;
  left: 5px;
  width: calc((100% - 10px) / 5);
  border-radius: 17px;
  background: color-mix(in srgb, var(--accent) 16%, transparent);
  filter: blur(7px);
  transform: translateX(calc(var(--nav-index, 0) * 100%));
  transition: transform 560ms cubic-bezier(0.22, 1, 0.36, 1);
  pointer-events: none;
}

.bottom-nav-cell {
  flex: 1 1 0;
  min-width: 0;
}

.bottom-nav-item {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 3px;
  min-height: 56px;
  padding: 6px 2px;
  border-radius: 17px;
  color: var(--text-muted);
  text-decoration: none;
  transition:
    color var(--transition-interactive),
    transform 160ms var(--ec-ease-out);
}

/* 按下时整项向内收一点：手指得到的反馈来自「被压下去」，不来自变色 */
.bottom-nav-item:active {
  transform: scale(0.96);
}

/* 触控目标补足到 44x44：视觉高度已经是 56，这条只是兜底 */
.bottom-nav-item::after {
  content: '';
  position: absolute;
  inset: 50% auto auto 50%;
  width: 44px;
  height: 44px;
  transform: translate(-50%, -50%);
  pointer-events: none;
}

.bottom-nav-item:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}

/* 选中项：颜色 + 字重 + 图标上浮三重提示，底色交给共享胶囊
 * （胶囊在下方滑动，所以这里不能再上底色，否则会出现两块色） */
.bottom-nav-item.is-active {
  color: var(--accent);
}

.bottom-nav-icon {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  transition: transform 260ms cubic-bezier(0.34, 1.4, 0.5, 1);
}

.bottom-nav-item.is-active .bottom-nav-icon {
  transform: translateY(-1px) scale(1.06);
}

.bottom-nav-icon :deep(svg) {
  width: 22px;
  height: 22px;
}

.bottom-nav-label {
  max-width: 100%;
  font-size: 10px;
  line-height: 1.2;
  font-weight: var(--fw-body);
  letter-spacing: 0.01em;
  white-space: nowrap;
}

.bottom-nav-item.is-active .bottom-nav-label {
  font-weight: var(--fw-label);
}

.bottom-nav-badge {
  position: absolute;
  top: -5px;
  right: -8px;
  min-width: 16px;
  height: 16px;
  padding: 0 4px;
  border-radius: 8px;
  background: var(--accent);
  color: var(--text-on-accent);
  font-size: 9px;
  font-weight: var(--fw-heading);
  line-height: 16px;
  text-align: center;
}

@media (prefers-reduced-motion: reduce) {
  .bottom-nav-item,
  .bottom-nav-icon,
  .bottom-nav-thumb,
  .bottom-nav-flow {
    transition: none;
  }

  /* 减弱动效时取消软尾：一帧就位的胶囊已经够清楚，拖影只会变成噪点 */
  .bottom-nav-flow {
    display: none;
  }
}
</style>
