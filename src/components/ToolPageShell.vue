<template>
  <div class="page-shell tool-shell">
    <header class="page-shell-head">
      <p class="page-shell-eyebrow">{{ eyebrowText }}</p>
      <h1 class="page-shell-title">
        <span class="tool-shell-title-icon" aria-hidden="true"><AppIcon :name="icon" /></span>
        <span>{{ title }}</span>
      </h1>
      <p class="page-shell-desc">{{ description }}</p>
      <!-- 需卡密激活的工具：这里只做**标示**，不做拦截 ——
           守门在工具中心（未激活时那边给的是「立即激活」而不是「打开工具」），
           页面再拦一道只会让「卡密刚过期」的用户看到两个不同版本的提示。 -->
      <p v-if="requiresCard" class="tool-shell-card-tag u-tag u-tag--warning">
        <AppIcon name="key" />
        <span>{{ cardTag }}</span>
      </p>
    </header>

    <RouterLink class="u-btn-secondary tool-shell-back" :to="{ path: '/tool' }">
      <AppIcon name="chevron-left" />
      <span>{{ backText }}</span>
    </RouterLink>

    <div class="tool-layout" :class="{ 'tool-layout--single': !hasAside }">
      <div class="tool-main">
        <slot />
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
import { PAGES, TOOL_PAGE, VIDEO_TOOL } from '@/constants/index.js'

const props = defineProps({
  /** 工具名（工具页标题） */
  title: { type: String, default: '' },
  /** 页头眉标，默认沿用「工具分享」这一层级的眉标 */
  eyebrow: { type: String, default: '' },
  /** 一句话简介 */
  description: { type: String, default: '' },
  /** AppIcon 图标名（不是 emoji：图标集里没有的 emoji 会在页头显示成方框） */
  icon: { type: String, default: 'wrench' },
  /** 该工具是否需要卡密激活（仅用于页头标示） */
  requiresCard: { type: Boolean, default: false },
})

const slots = useSlots()

// 侧栏有没有内容决定用单列还是两列：模板里传了 <template #aside> 才渲染侧栏，
// 因此这里必须看插槽而不是 props（空侧栏会留出一整列空白）。
const hasAside = computed(() => Boolean(slots.aside))

const eyebrowText = computed(() => props.eyebrow || PAGES.tools.eyebrow)
const backText = computed(() => VIDEO_TOOL.backToTools)
const cardTag = computed(() => TOOL_PAGE.needCardTag)
</script>
