<template>
  <div class="tool-card ui-card u-enter">
    <div class="ui-card-media">
      <img v-if="tool.cover_url" :src="tool.cover_url" :alt="tool.tool_name" />
      <div v-else class="tool-icon" aria-hidden="true">{{ tool.icon }}</div>
      <span v-if="tool.is_new" class="u-tag u-tag--accent tool-new-badge">新</span>
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
        <div class="tool-category u-tag">{{ tool.class_name }}</div>
      </div>

      <p class="tool-description">{{ tool.description }}</p>

      <!-- Collection count moved to media section as badge -->

      <div class="tool-actions">
        <button class="tool-btn u-btn-primary" @click.stop="onOpenTool">打开工具</button>
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

/* 媒体区没有图片时退化为图标：字号取标题档 --fs-h1，
   hover 缩放走 --media-hover-scale（mono 主题该令牌为 1，即不缩放） */
.tool-icon {
  font-size: var(--fs-h1);
  transition: transform var(--transition-surface);
}

.tool-card:hover .tool-icon {
  transform: scale(var(--media-hover-scale));
}

/* 「新」标记：外观全部来自共享类 .u-tag / .u-tag--accent
   （强调底 + 反白字，高度/内边距/圆角由 --tag-* 令牌给全），
   组件内只负责把它钉在媒体区左上角，不再自写配色与内边距 */
.tool-new-badge {
  position: absolute;
  top: calc(var(--space-unit) * 1.5);
  left: calc(var(--space-unit) * 1.5);
}

/* 收藏按钮：尺寸与 .u-icon-btn 同档（--icon-btn-size），
   胶囊圆角 + 浮起表面 + 描边色走令牌，因此五套主题下形态一致 */
.favorite-btn {
  position: absolute;
  top: calc(var(--space-unit) * 1.5);
  right: calc(var(--space-unit) * 1.5);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: var(--icon-btn-size);
  height: var(--icon-btn-size);
  background: var(--bg-elevated);
  border: var(--stroke-width) solid var(--stroke-color);
  border-radius: var(--radius-pill);
  cursor: pointer;
  transition:
    background-color var(--transition-interactive),
    border-color var(--transition-interactive),
    transform var(--transition-interactive);
}

.favorite-btn:hover {
  border-color: var(--accent);
  transform: var(--btn-hover-transform);
}

.favorite-btn.active {
  background: var(--accent-soft);
  border-color: var(--accent);
}

.favorite-icon {
  font-size: var(--fs-h3);
}

/* 数量徽标压在圆形按钮的右上角：微型徽标圆角 + 强调底 + 反白字，
   描边取卡片表面色，与卡片背景连成一体而不需要额外的描边令牌 */
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
  border: var(--stroke-width) solid var(--bg-surface);
  border-radius: var(--micro-badge-radius);
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

/* 分类标签复用 .u-tag（高度/内边距/圆角都由共享类给全），
   这里只保证长分类名不换行（标题才是可压缩的一侧） */
.tool-category {
  flex-shrink: 0;
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

/* .u-btn-primary 提供底色/圆角/悬停位移与 disabled 样式，
   这里只负责铺满操作区宽度 */
.tool-btn {
  flex: 1;
  width: 100%;
}

/* 窄卡片下标题与分类并排会互相挤压，改为上下排列；
   同时按规范收一档：控件高度 ×0.9、内边距 ×0.8、标题字号 ×0.7、正文字号 ×0.95 */
@media (max-width: 767px) {
  .tool-header {
    flex-direction: column;
    align-items: flex-start;
    gap: calc(var(--space-unit) * 0.5);
  }

  .tool-title {
    font-size: calc(var(--fs-h3) * var(--mobile-title-scale));
  }

  .tool-description {
    font-size: calc(var(--fs-sm) * var(--mobile-body-scale));
  }

  .tool-new-badge {
    top: calc(var(--space-unit) * 1.5 * var(--mobile-padding-scale));
    left: calc(var(--space-unit) * 1.5 * var(--mobile-padding-scale));
  }

  .favorite-btn {
    top: calc(var(--space-unit) * 1.5 * var(--mobile-padding-scale));
    right: calc(var(--space-unit) * 1.5 * var(--mobile-padding-scale));
    width: calc(var(--icon-btn-size) * var(--mobile-control-scale));
    height: calc(var(--icon-btn-size) * var(--mobile-control-scale));
  }
}
</style>
