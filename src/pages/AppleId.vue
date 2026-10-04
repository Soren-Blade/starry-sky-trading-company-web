<template>
  <div class="apple-id-page">
    <!--
      页面开场（PageHeader 已删除，本页自己承担）：
      「目录」版式的开场是一条左对齐的标题带 —— 眉标 + 标题 + 说明在左，
      两条线路的计数在右，底部一条 hairline 与下方「左轨 + 账号目录」两栏连成一体。
    -->
    <header class="page-intro">
      <div class="intro-main">
        <p class="intro-eyebrow">{{ PAGES.appleId.eyebrow }}</p>
        <h1 class="intro-title">{{ PAGES.appleId.title }}</h1>
        <p class="intro-description">{{ PAGES.appleId.description }}</p>
      </div>

      <!-- 计数与 AppleIdSection 共用同一份 store 状态：数据到达后自动更新 -->
      <ul class="intro-stats">
        <li>
          <span class="u-tag u-tag--accent">主线路 {{ nanoCloudCount }}</span>
        </li>
        <li>
          <span class="u-tag">副线路 {{ fangQiangNanCount }}</span>
        </li>
      </ul>
    </header>

    <AppleIdSection />
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import AppleIdSection from '@/components/AppleIdSection.vue'
import { PAGES } from '@/constants/index.js'
import { useToolStore } from '@/stores/tool'

// 拉取仍由 AppleIdSection 负责，这里只读同一份状态做计数
const { appleIds } = storeToRefs(useToolStore())

const nanoCloudCount = computed(() => appleIds.value?.nanoCloud?.length || 0)
const fangQiangNanCount = computed(() => appleIds.value?.fangQiangNan?.length || 0)
</script>

<style scoped>
/*
 * 开场是「目录」版式的一部分：左对齐的眉标 / 标题 / 说明 + 右侧计数，
 * 与下方 sticky 左轨的锚点语言一致（同一套 .u-tag 变体表达两条线路）。
 * 标题字号走 --fs-h1（变量登记表里页面标题的唯一档位），移动端 ×0.7。
 */

.apple-id-page {
  width: 100%;
}

.page-intro {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  justify-content: space-between;
  gap: calc(var(--space-unit) * 3);
  max-width: var(--container-max);
  margin: 0 auto;
  padding: calc(var(--section-gap) * 0.5) var(--container-padding) calc(var(--space-unit) * 3);
  border-bottom: var(--stroke-width) solid var(--border);
}

.intro-main {
  display: flex;
  flex-direction: column;
  gap: calc(var(--space-unit));
  min-width: 0;
}

.intro-eyebrow {
  margin: 0;
  font-family: var(--font-mono);
  font-size: var(--fs-label);
  font-weight: var(--fw-label);
  letter-spacing: var(--tracking-label);
  text-transform: var(--label-transform);
  color: var(--accent);
}

.intro-title {
  margin: 0;
  font-family: var(--font-display);
  font-size: var(--fs-h1);
  font-weight: var(--fw-display);
  letter-spacing: var(--tracking-display);
  text-transform: var(--heading-transform);
  color: var(--text-primary);
}

.intro-description {
  margin: 0;
  font-size: var(--fs-body);
  line-height: var(--leading-body);
  color: var(--text-secondary);
}

/* 两条线路的计数：主线路用强调变体，副线路退回 .u-tag 的中性默认态 */
.intro-stats {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: calc(var(--space-unit) * 1.5);
  margin: 0;
  padding: 0;
}

/* 移动端：区块间距 ×0.6、内边距 ×0.8、标题 ×0.7、正文 ×0.95 */
@media (max-width: 767px) {
  .page-intro {
    gap: calc(var(--space-unit) * 3 * var(--mobile-section-scale));
    padding-top: calc(var(--section-gap) * 0.5 * var(--mobile-section-scale));
    padding-bottom: calc(var(--space-unit) * 3 * var(--mobile-padding-scale));
  }

  .intro-title {
    font-size: calc(var(--fs-h1) * var(--mobile-title-scale));
  }

  .intro-description {
    font-size: calc(var(--fs-body) * var(--mobile-body-scale));
  }
}

@media (max-width: 575px) {
  .page-intro {
    padding-right: calc(var(--container-padding) * var(--mobile-padding-scale));
    padding-left: calc(var(--container-padding) * var(--mobile-padding-scale));
  }
}
</style>
