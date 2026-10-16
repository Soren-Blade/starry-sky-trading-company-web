<template>
  <!--
    共享 Apple ID（工具页骨架）。
    页头与「使用说明 / 注意事项」交给公共工具页外壳；
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

    <!-- 辅助信息 -->
    <template #aside>
      <section class="ui-card tool-aside-card">
        <h3 class="tool-aside-title">
          <span class="tool-aside-title-icon" aria-hidden="true"><AppIcon name="info" /></span>
          <span>{{ TOOL_PAGE.usageTitle }}</span>
        </h3>
        <ul class="tool-aside-list">
          <li v-for="item in PAGE.asideItems" :key="item">{{ item }}</li>
        </ul>
      </section>

      <section class="ui-card tool-aside-card">
        <h3 class="tool-aside-title">
          <span class="tool-aside-title-icon" aria-hidden="true">
            <AppIcon name="shield-alert" />
          </span>
          <span>{{ TOOL_PAGE.noticeTitle }}</span>
        </h3>
        <p class="tool-aside-note">
          <span class="tool-aside-note-icon" aria-hidden="true">
            <AppIcon name="alert-triangle" />
          </span>
          <span>{{ PAGE.asideNotice }}</span>
        </p>
      </section>
    </template>
  </ToolPageShell>
</template>

<script setup>
/**
 * 共享 Apple ID（工具页）。
 *
 * 本文件只做两件事：把页头 / 辅助信息接到公共工具页外壳，并把两条线路的
 * 计数标签放在列表上方。列表本身（含拉取与领取）仍由 AppleIdSection 负责，
 * 计数与它读同一份 store 状态，因此这里不额外发请求、也不新增入参。
 */
import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import AppleIdSection from '@/components/AppleIdSection.vue'
import AppIcon from '@/components/AppIcon.vue'
import ToolPageShell from '@/components/ToolPageShell.vue'
import { TOOL_PAGE, TOOL_PAGES } from '@/constants/index.js'
import { useToolStore } from '@/stores/tool'

const PAGE = TOOL_PAGES['/other/appleId']

// 拉取仍由 AppleIdSection 负责，这里只读同一份状态做计数
const { appleIds } = storeToRefs(useToolStore())

const nanoCloudCount = computed(() => appleIds.value?.nanoCloud?.length || 0)
const fangQiangNanCount = computed(() => appleIds.value?.fangQiangNan?.length || 0)
</script>

<style scoped>
/*
 * 页头、容器宽度与辅助信息栅格由 ToolPageShell + ui-kit-tool.css 提供，
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
