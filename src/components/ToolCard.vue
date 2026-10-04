<template>
  <div class="tool-card ui-card u-enter">
    <div class="ui-card-media">
      <img v-if="tool.cover_url" :src="tool.cover_url" :alt="tool.tool_name" />
      <div v-else class="tool-icon" aria-hidden="true">{{ tool.icon }}</div>
      <div v-if="tool.is_new" class="tool-new-badge">新</div>
      <button
        class="favorite-btn"
        :class="{ active: isFavorited }"
        :aria-pressed="isFavorited"
        :title="isFavorited ? '取消收藏' : '添加收藏'"
        :aria-label="isFavorited ? `取消收藏 ${tool.tool_name}` : `收藏 ${tool.tool_name}`"
        @click.stop="toggleFavorite"
      >
        <span class="favorite-icon" aria-hidden="true">{{ isFavorited ? '❤️' : '🤍' }}</span>
        <span class="favorite-count">{{ tool.collection_count > 99 ? '99+' : tool.collection_count }}</span>
      </button>
    </div>

    <div class="ui-card-body">
      <div class="tool-header">
        <h3 class="tool-title">{{ tool.tool_name }}</h3>
        <div class="tool-category u-chip">{{ tool.class_name }}</div>
      </div>

      <p class="tool-description">{{ tool.description }}</p>

      <!-- Collection count moved to media section as badge -->

      <div class="tool-actions">
        <button class="tool-btn u-cta" @click.stop="onOpenTool">打开工具</button>
      </div>
    </div>
  </div>
</template>

<script setup>

const props = defineProps({
  tool: { type: Object, required: true },
  isFavorited: { type: Boolean, default: false }
});
const emit = defineEmits(['open-tool', 'toggle-favorite']);

const onOpenTool = () => emit('open-tool', props.tool);
const toggleFavorite = () => emit('toggle-favorite', props.tool);
</script>

<style scoped>
/* 外壳（表面/边框/圆角/阴影/hover 位移 + 毛玻璃）来自 global.css 的 .ui-card，
   正文与媒体区同样复用共享类，这里只保留工具卡特有的内部布局。
   整卡不可点击（入口是「打开工具」按钮），因此消掉指针暗示 */
.tool-card {
  cursor: default;
}

/* 媒体区没有图片时退化为图标：居中由共享类提供，这里只给 hover 缩放，
   缩放幅度走令牌，保证与有图卡片在同一主题下动作一致 */
.tool-icon {
  font-size: var(--fs-h1);
  transition: transform var(--transition-surface);
}

.tool-card:hover .tool-icon {
  transform: scale(var(--media-hover-scale));
}

/* 「新」标记：与 ProductCard 的缺货标记同源（语义色 + 柔和底 + 细边），
   不再自造渐变；backdrop-filter 交给令牌，非玻璃主题该令牌为 none */
.tool-new-badge {
  position: absolute;
  top: calc(var(--space-unit) * 1.5);
  left: calc(var(--space-unit) * 1.5);
  padding: calc(var(--space-unit) * 0.5) calc(var(--space-unit) * 1.25);
  font-size: var(--fs-label);
  font-weight: var(--fw-label);
  letter-spacing: var(--tracking-label);
  text-transform: var(--label-transform);
  color: var(--danger);
  background: var(--danger-bg);
  border: 1px solid var(--danger);
  border-radius: var(--radius-chip);
  backdrop-filter: var(--effect-backdrop);
  -webkit-backdrop-filter: var(--effect-backdrop);
}

/* 圆形按钮：用 padding 撑出尺寸下限（不写死宽高，否则 mono 主题的 4px
   基础单位会显得过大）。0.75 倍单位让最紧凑的 mono 主题也有 24px 触控目标 */
.favorite-btn {
  position: absolute;
  top: calc(var(--space-unit) * 1.5);
  right: calc(var(--space-unit) * 1.5);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: calc(var(--space-unit) * 0.75);
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  border-radius: var(--radius-pill);
  cursor: pointer;
  transition:
    background-color var(--transition-interactive),
    border-color var(--transition-interactive),
    transform var(--transition-interactive);
}

.favorite-btn:hover {
  border-color: var(--accent);
  transform: var(--cta-hover-transform);
}

.favorite-btn.active {
  background: var(--accent-soft);
  border-color: var(--accent);
}

.favorite-icon {
  font-size: var(--fs-h3);
}

/* 数量徽标压在圆形按钮的右上角：边框取卡片表面色，
   与卡片背景连成一体而不需要额外的描边令牌 */
.favorite-count {
  position: absolute;
  top: calc(var(--space-unit) * -1);
  right: calc(var(--space-unit) * -1);
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: calc(var(--space-unit) * 2.5);
  height: calc(var(--space-unit) * 2.5);
  padding: 0 calc(var(--space-unit) * 0.5);
  font-size: var(--fs-label);
  font-weight: var(--fw-label);
  font-variant-numeric: tabular-nums;
  line-height: 1;
  color: var(--text-on-accent);
  background: var(--accent);
  border: 2px solid var(--bg-surface);
  border-radius: var(--radius-pill);
}

.tool-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: calc(var(--space-unit) * 1.5);
}

.tool-title {
  flex: 1;
  min-width: 0;
  font-family: var(--font-display);
  font-size: var(--fs-h3);
  font-weight: var(--fw-heading);
  letter-spacing: var(--tracking-display);
  color: var(--text-primary);
  margin: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* 分类标签复用 .u-chip，这里只保证长分类名不换行（标题才是可压缩的一侧） */
.tool-category {
  flex-shrink: 0;
  white-space: nowrap;
}

.tool-description {
  font-size: var(--fs-sm);
  line-height: var(--leading-body);
  color: var(--text-secondary);
  margin: 0;
  display: -webkit-box;
  line-clamp: 2;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

/* margin-top: auto 把操作区压到卡片底部，卡片等高时按钮在同一水平线 */
.tool-actions {
  display: flex;
  margin-top: auto;
}

/* u-cta 提供底色/圆角/悬停位移与粗野主义主题下的 3px 黑边，
   这里只负责铺满操作区宽度 */
.tool-btn {
  flex: 1;
  width: 100%;
}

/* 窄卡片下标题与分类并排会互相挤压，改为上下排列 */
@media (max-width: 767px) {
  .tool-header {
    flex-direction: column;
    align-items: flex-start;
    gap: calc(var(--space-unit) * 0.5);
  }

  .tool-new-badge {
    top: calc(var(--space-unit));
    left: calc(var(--space-unit));
  }
}
</style>
