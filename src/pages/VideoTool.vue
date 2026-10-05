<template>
  <div class="placeholder-page">
    <header class="workspace-head">
      <p class="workspace-eyebrow">{{ PAGES.tools.eyebrow }}</p>
      <h1 class="workspace-title">{{ VIDEO_TOOL.title }}</h1>
      <p class="workspace-desc">{{ VIDEO_TOOL.description }}</p>
    </header>

    <div class="placeholder-card ui-card">
      <div class="placeholder-icon" aria-hidden="true">
        <AppIcon name="video" />
      </div>

      <p class="placeholder-status u-tag u-tag--warning">
        <AppIcon name="clock" />
        <span>{{ VIDEO_TOOL.status }}</span>
      </p>

      <p class="placeholder-body">{{ VIDEO_TOOL.body }}</p>

      <div class="placeholder-actions">
        <RouterLink class="u-btn-primary" :to="{ path: '/tool' }">
          {{ VIDEO_TOOL.backToTools }}
        </RouterLink>
        <RouterLink class="u-btn-secondary" :to="{ path: '/user/kami' }">
          {{ VIDEO_TOOL.myCards }}
        </RouterLink>
      </div>
    </div>
  </div>
</template>

<script setup>
import AppIcon from '@/components/AppIcon.vue'
import { PAGES, VIDEO_TOOL } from '@/constants/index.js'

/**
 * 视频下载工具的**占位页**。
 *
 * 为什么需要它：解析服务暂停中（原候选服务 ALAPI 的接口是会员制，
 * 且文档给的地址实测 404），但工具条目已经在数据库里、
 * 也已经标为「需要卡密激活」—— 也就是说**已激活的用户点进来必然是死链**。
 *
 * 宁可给一个说明页，也不要让付过费的用户撞上 404：
 * 404 传达的是「这个站坏了」，而这一页传达的是「这功能还没上线」。
 *
 * 服务接通后，把这个路由的组件换成真实页面即可，
 * 数据库里的 tool_path 不需要改（已经是 /video/downloader）。
 */
</script>

<style scoped>
.placeholder-page {
  display: flex;
  flex-direction: column;
  gap: calc(var(--space-unit) * 3);
}

/* 居中的单卡片：内容很少，不需要两栏工作台版式 */
.placeholder-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: calc(var(--space-unit) * 2);
  padding: calc(var(--space-unit) * 5) calc(var(--space-unit) * 3);
  text-align: center;
}

/* 图标取标题档字号并染成强调色，与页面标题形成层次 */
.placeholder-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: var(--fs-h1);
  color: var(--accent);
}

/* .u-tag 给全高度/内边距/圆角/配色，这里只让它横排图标与文字 */
.placeholder-status {
  display: inline-flex;
  align-items: center;
  gap: calc(var(--space-unit) * 0.5);
  margin: 0;
}

.placeholder-body {
  max-width: 46ch;
  font-size: var(--fs-sm);
  line-height: var(--leading-body);
  color: var(--text-secondary);
  margin: 0;
}

.placeholder-actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: calc(var(--space-unit) * 1.5);
}

/* RouterLink 不是 <button>，需要自己补齐 .u-btn-* 不给的排版属性 */
.placeholder-actions a {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  text-decoration: none;
}

@media (max-width: 767px) {
  .placeholder-card {
    padding: calc(var(--space-unit) * 4 * var(--mobile-padding-scale)) calc(var(--space-unit) * 2);
  }

  .placeholder-actions {
    width: 100%;
    flex-direction: column;
  }
}
</style>
