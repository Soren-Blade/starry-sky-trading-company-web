<template>
  <!--
    移动端底部悬浮导航
    设计约束（来自 design-partner 的 Tab Bar 规范）：
    - 5 个入口，图标 + 文字，最后一个放「我的」；
    - 当前项至少两重提示：强调色 + 顶部指示条 + 字重（不能只靠颜色，WCAG 1.4.1）；
    - 每个点击区域 >= 44x44；
    - 高度 64px，另外留 iOS 安全区，页面底部要留出等量空间。
  -->
  <nav class="bottom-nav" :aria-label="t('bottomNav.label')">
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
</script>

<style scoped>
.bottom-nav {
  display: none;
}

@media (max-width: 767px) {
  /* 悬浮 Tab Bar：苹果式 modal glass —— 半透明表面 + 背景模糊，
   * 浮在内容上方时不切断页面，又不会像实底那样「贴一块砖」。 */
  .bottom-nav {
    position: fixed;
    left: 50%;
    bottom: calc(12px + env(safe-area-inset-bottom, 0px));
    z-index: var(--z-sticky, 100);
    display: block;
    width: calc(100% - 24px);
    max-width: 520px;
    padding: 4px;
    transform: translateX(-50%);
    background: var(--glass-nav-bg-strong);
    border: 1px solid var(--glass-nav-border);
    border-radius: 22px;
    box-shadow: var(--shadow-float);
    -webkit-backdrop-filter: blur(var(--glass-nav-blur)) saturate(var(--glass-nav-saturate));
    backdrop-filter: blur(var(--glass-nav-blur)) saturate(var(--glass-nav-saturate));
  }

  /* 不支持背景模糊时退回实底；降低透明度偏好同理 */
  @supports not ((backdrop-filter: blur(1px)) or (-webkit-backdrop-filter: blur(1px))) {
    .bottom-nav {
      background: var(--bg-elevated);
    }
  }

  @media (prefers-reduced-transparency: reduce) {
    .bottom-nav {
      background: var(--bg-elevated);
      -webkit-backdrop-filter: none;
      backdrop-filter: none;
    }
  }
}

.bottom-nav-list {
  display: flex;
  align-items: stretch;
  gap: 2px;
  margin: 0;
  padding: 0;
  list-style: none;
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
  border-radius: 18px;
  color: var(--text-muted);
  text-decoration: none;
  transition:
    color var(--transition-interactive),
    background var(--transition-interactive);
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

.bottom-nav-item.is-active {
  color: var(--accent);
  background: var(--accent-soft);
}

/* 当前项的第三重提示：顶部短指示条（颜色 + 字重之外） */
.bottom-nav-item.is-active::before {
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

.bottom-nav-icon {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
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
  .bottom-nav-item {
    transition: none;
  }
}
</style>
