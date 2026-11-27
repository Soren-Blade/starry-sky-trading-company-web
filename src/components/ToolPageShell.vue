<template>
  <div class="page-shell tool-shell">
    <header class="page-shell-head" :class="{ 'page-shell-head--row': backInline }">
      <div class="tool-shell-head-main">
        <p class="page-shell-eyebrow">{{ eyebrowText }}</p>
        <h1 class="page-shell-title">
          <span class="tool-shell-title-icon" aria-hidden="true"><AppIcon :name="icon" /></span>
          <span>{{ title }}</span>
        </h1>
        <p class="page-shell-desc">{{ description }}</p>

        <!-- 页头按 access_policy 给出状态说明。
             卡密工具仍然只做「标示」：卡密刚过期的用户应该在工具中心看到一个统一的入口，
             不该在页面里再看到另一套拦截文案。会员专属才做真正的拦截（见下方 mustUpgrade）。 -->
        <div v-if="accessNote" class="tool-shell-access">
          <p class="tool-shell-card-tag ec-tag ec-tag--sm" :class="accessNote.tone">
            <AppIcon :name="accessNote.icon" />
            <span>{{ accessNote.text }}</span>
          </p>
          <p v-if="accessHint" class="tool-shell-access-hint">{{ accessHint }}</p>
        </div>
      </div>

      <!-- back-inline：返回入口并进标题带右侧（长列表页用）。
           它只是「离开」，不该在标题与内容之间独占一整行 —— 那一行会吃掉首屏 40px +
           两段外边距，把正文往下推。默认仍是独立一行，避免改动其余工具页的节奏。 -->
      <RouterLink
        v-if="backInline"
        class="u-btn-secondary tool-shell-back tool-shell-back--inline"
        :to="{ path: '/tool' }"
      >
        <AppIcon name="chevron-left" />
        <span>{{ backText }}</span>
      </RouterLink>
    </header>

    <RouterLink v-if="!backInline" class="u-btn-secondary tool-shell-back" :to="{ path: '/tool' }">
      <AppIcon name="chevron-left" />
      <span>{{ backText }}</span>
    </RouterLink>

    <div class="tool-layout" :class="{ 'tool-layout--single': !hasAside }">
      <div class="tool-main">
        <!-- 会员专属且当前不是会员：页面内容本身不渲染，避免用户绕过卡片直接访问路由 -->
        <template v-if="!mustUpgrade">
          <slot />
        </template>
        <div v-else class="tool-shell-lock ec-stack ec-stack--center ec-stack--3">
          <p class="tool-shell-lock-text">{{ SHELL_TEXT.memberOnlyLock }}</p>
          <RouterLink class="ec-btn ec-btn--gold ec-btn--sm" :to="{ path: '/member/plans' }">
            {{ SHELL_TEXT.viewPlans }}
          </RouterLink>
        </div>
      </div>

      <aside v-if="hasAside" class="tool-aside">
        <slot name="aside" />
      </aside>
    </div>
  </div>
</template>

<script setup>
/**
 * 工具页公共外壳：页头 + 返回入口 + 主区 + 可选侧栏。
 *
 * 为什么要有它：五个工具页此前各自写页头 —— `VideoTool.vue` 用全局 `.page-shell-*`、
 * `2FA.vue` 用自造 `.fp-*`、`AppleId.vue` 用自造 `.page-intro`，
 * 同一层级（「工具页的标题与简介」）出现三套互不相干的版式，
 * 改一处间距要改三份、而且它们在窄屏下的缩放手感并不一致。
 *
 * 页头只使用**全局**的 `.page-shell-*`（见 global.css）：那是共享层，
 * 借用任何页面的 scoped 类名都等于零样式（`test/componentClasses.test.js` 挡这一类）。
 *
 * props 全部给默认值：`test/renderComponents.test.js` 会用**空 props** 渲染 src 下
 * 每一个 .vue，声明 required 会让那个用例失败。
 */
import { computed, useSlots } from 'vue'
import AppIcon from '@/components/AppIcon.vue'
import { useMemberStore } from '@/stores/member'
import { PAGES, TOOL_PAGE, VIDEO_TOOL } from '@/constants/index.js'

/**
 * 访问策略文案。
 *
 * `access_policy` 是服务端新字段，工具页常量（`tool-pages.js`）里还没有它，
 * 也不允许改 `constants/content.js`，所以文案在页壳内收敛一份。
 */
const SHELL_TEXT = Object.freeze({
  memberFree: '会员免费',
  memberOnly: '会员专属',
  memberFreeHint: '会员可直接使用，无需卡密',
  memberFreeVisitorHint: '会员可免卡密使用；非会员需使用卡密激活',
  memberOnlyHint: '会员专属工具，已为当前会员开放',
  memberOnlyLock: '此工具仅对会员开放，开通会员后即可使用。',
  viewPlans: '查看会员方案',
})

const ACCESS_POLICIES = ['free', 'card', 'member_free', 'member_only']

const props = defineProps({
  /** 工具名（工具页标题） */
  title: { type: String, default: '' },
  /** 页头眉标，默认沿用「工具分享」这一层级的眉标 */
  eyebrow: { type: String, default: '' },
  /** 一句话简介 */
  description: { type: String, default: '' },
  /** AppIcon 图标名（不是 emoji：图标集里没有的 emoji 会在页头显示成方框） */
  icon: { type: String, default: 'wrench' },
  /** 该工具是否需要卡密激活（旧字段，继续作为 access_policy 缺失时的回退） */
  requiresCard: { type: Boolean, default: false },
  /**
   * 服务端新契约字段。既有工具页只传 requiresCard，默认空串时走旧逻辑，
   * 因此不要求 40+ 个页面同步改传参。
   */
  accessPolicy: { type: String, default: '' },
  /** 当前用户是否已拥有该工具的卡密权益；只影响页头文案，不改变页面结构 */
  hasEntitlement: { type: Boolean, default: false },
  /**
   * 返回入口是否并进标题带右侧。
   *
   * 默认 false：其余工具页保持「页头 → 返回一行 → 内容」的既有节奏。
   * 打开后页头变成 `.page-shell-head--row`（左标题带 / 右返回），
   * 省掉标题与正文之间那整行的高度与两段外边距 —— 长列表页的首屏能多露出一屏内容。
   */
  backInline: { type: Boolean, default: false },
})

const slots = useSlots()

/**
 * 会员身份。
 *
 * 会员判定复用 member store 的 `isMember`（数据来自 `/memberApi/overview`），
 * 不在这里重新推导等级。SSR 单测偶尔会不装 pinia，读取失败时降级为非会员。
 */
const memberStore = (() => {
  try {
    return useMemberStore()
  } catch {
    return null
  }
})()

const isMember = computed(() => Boolean(memberStore?.isMember))

/** 与 ToolCard 相同的回退：字段缺失或非法时按 requires_card 推断 */
const resolvedPolicy = computed(() => {
  const declared = props.accessPolicy
  if (ACCESS_POLICIES.includes(declared)) return declared
  return props.requiresCard ? 'card' : 'free'
})

const accessNote = computed(() => {
  if (resolvedPolicy.value === 'card') {
    return props.hasEntitlement
      ? { tone: 'ec-tag--success', icon: 'check-circle', text: TOOL_PAGE.activatedTag }
      : { tone: 'ec-tag--warning', icon: 'key', text: TOOL_PAGE.needCardTag }
  }
  if (resolvedPolicy.value === 'member_free') {
    return { tone: 'ec-tag--gold', icon: 'crown', text: SHELL_TEXT.memberFree }
  }
  if (resolvedPolicy.value === 'member_only') {
    return { tone: 'ec-tag--gold', icon: 'crown', text: SHELL_TEXT.memberOnly }
  }
  return null
})

const accessHint = computed(() => {
  if (resolvedPolicy.value === 'card') {
    return props.hasEntitlement ? TOOL_PAGE.activatedHint : TOOL_PAGE.needCardHint
  }
  if (resolvedPolicy.value === 'member_free') {
    return isMember.value ? SHELL_TEXT.memberFreeHint : SHELL_TEXT.memberFreeVisitorHint
  }
  if (resolvedPolicy.value === 'member_only') {
    return isMember.value ? SHELL_TEXT.memberOnlyHint : SHELL_TEXT.memberOnlyLock
  }
  return ''
})

/** 会员专属 + 非会员：拦截页面内容（工具卡在列表里也不会给入口） */
const mustUpgrade = computed(
  () => resolvedPolicy.value === 'member_only' && !isMember.value
)

// 侧栏有没有内容决定用单列还是两列：模板里传了 <template #aside> 才渲染侧栏，
// 因此这里必须看插槽而不是 props（空侧栏会留出一整列空白）。
const hasAside = computed(() => Boolean(slots.aside))

const eyebrowText = computed(() => props.eyebrow || PAGES.tools.eyebrow)
const backText = computed(() => VIDEO_TOOL.backToTools)
</script>

<style scoped>
/* 标题带内部：眉标 / 标题 / 简介 / 权限说明仍是竖排的一列。
   外壳在 back-inline 时把这一列与返回入口并排（.page-shell-head--row）。 */
.tool-shell-head-main {
  display: flex;
  flex-direction: column;
  gap: var(--ec-space-3);
  min-width: 0;
}

/* 并进标题带时不再需要「与正文之间」的那段外边距 */
.tool-shell-back--inline {
  flex-shrink: 0;
  margin-bottom: 0;
}

.tool-shell-access {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--ec-space-2);
  margin-top: var(--ec-space-2);
}

.tool-shell-access-hint {
  margin: 0;
  font-size: var(--ec-caption-size);
  line-height: var(--ec-caption-lh);
  color: var(--ec-text-secondary);
}

/* 会员专属拦截：沿用 .ec-tool 的卡片语言，不另外发明一套容器样式 */
.tool-shell-lock {
  padding: var(--ec-space-8) var(--ec-space-4);
  border: 1px solid var(--ec-card-border);
  border-radius: var(--ec-radius-lg);
  background: var(--ec-bg-surface);
  text-align: center;
}

.tool-shell-lock-text {
  margin: 0;
  color: var(--ec-text-secondary);
}

/* ── 窄屏 ─────────────────────────────────────────────────────
 * 390px 上「标题带 + 返回按钮」并排会把简介压成窄柱，因此回到竖排；
 * 返回入口退成一行安静的文字链（不再是一个 40px 的按钮框）：
 * 手机上它是「回头」而不是「行动」，不该和内容争注意力。 */
@media (max-width: 767px) {
  .page-shell-head--row {
    flex-direction: column;
    align-items: stretch;
  }

  .tool-shell-back--inline.u-btn-secondary {
    align-self: flex-start;
    height: auto;
    padding: 0;
    font-size: calc(var(--fs-sm) * var(--mobile-body-scale));
    font-weight: var(--fw-body);
    line-height: var(--leading-title);
    color: var(--text-secondary);
    background: none;
    border-color: transparent;
    box-shadow: none;
  }

  .tool-shell-back--inline.u-btn-secondary:hover:not(:disabled),
  .tool-shell-back--inline.u-btn-secondary:active:not(:disabled) {
    color: var(--accent);
    background: none;
    border-color: transparent;
    transform: none;
  }
}
</style>
