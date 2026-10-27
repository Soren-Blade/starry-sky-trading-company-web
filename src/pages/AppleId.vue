<template>
  <!--
    共享 Apple ID（工具页骨架）。
    页头与栅格交给公共工具页外壳，但不再使用 `#aside` 插槽：
    「使用说明 / 注意事项」现在由 AppleIdSection 的左轨承担 —— 说明与风险提示
    必须贴着账号列表（用户边看边操作），放在页面最右侧的独立卡片里会被长列表甩在
    屏幕外。因此外壳自动落成单列，AppleIdSection 自己再分「左轨 + 列表」两栏。
    主区仍是原来的 AppleIdSection —— 拉取、领取、复制、来源切换一行未动，
    只在它上方保留两条线路的计数标签。
  -->
  <ToolPageShell
    :title="PAGE.title"
    :eyebrow="PAGE.eyebrow"
    :description="PAGE.description"
    :icon="PAGE.icon"
  >
    <!-- 计数与 AppleIdSection 共用同一份 store 状态：数据到达后自动更新 -->
    <ul class="apple-id-stats">
      <li>
        <span class="u-tag u-tag--accent">主线路 {{ nanoCloudCount }}</span>
      </li>
      <li>
        <span class="u-tag">副线路 {{ fangQiangNanCount }}</span>
      </li>
    </ul>

    <AppleIdSection />
  </ToolPageShell>
</template>

<script setup>
/**
 * 共享 Apple ID（工具页）。
 *
 * 本文件只做两件事：把页头接到公共工具页外壳，并把两条线路的计数标签放在列表上方。
 * 说明 / 注意事项不在这里：它们改由 AppleIdSection 的左轨承载（见该组件模板），
 * 这样滚动长列表时始终在侧边可读，也会在 ≤991px 折到列表前面。
 * 列表本身（含拉取与领取）仍由 AppleIdSection 负责，计数与它读同一份 store 状态，
 * 因此这里不额外发请求、也不新增入参。
 */
import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import AppleIdSection from '@/components/AppleIdSection.vue'
import ToolPageShell from '@/components/ToolPageShell.vue'
import { TOOL_PAGES } from '@/constants/index.js'
import { useToolStore } from '@/stores/tool'

const PAGE = TOOL_PAGES['/other/appleId']

// 拉取仍由 AppleIdSection 负责，这里只读同一份状态做计数
const { appleIds } = storeToRefs(useToolStore())

const nanoCloudCount = computed(() => appleIds.value?.nanoCloud?.length || 0)
const fangQiangNanCount = computed(() => appleIds.value?.fangQiangNan?.length || 0)
</script>

<style scoped>
/*
 * 页头、容器宽度与单列栅格由 ToolPageShell + ui-kit-tool.css 提供，
 * 本文件只剩「两条线路的计数」这一处页面私有版式：
 * 主线路用强调变体，副线路退回 .u-tag 的中性默认态。
 */
.apple-id-stats {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: calc(var(--space-unit) * 1.5);
  margin: 0;
  padding: 0;
  list-style: none;
}

@media (max-width: 767px) {
  .apple-id-stats {
    gap: calc(var(--space-unit) * 1.5 * var(--mobile-padding-scale));
  }
}
</style>
