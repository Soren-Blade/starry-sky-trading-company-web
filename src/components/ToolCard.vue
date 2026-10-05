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

      <!-- 需要卡密的工具要在**动手之前**就告知，因此标注放在按钮正上方：
           放在媒体区会与「新」标记抢左上角，放在标题行又会被长分类名挤 -->
      <p v-if="tool.requires_card" class="tool-access">
        <span class="u-tag u-tag--warning tool-access-tag">
          <AppIcon name="key" />
          <span>{{ hasEntitlement ? TOOL_PAGE.activatedTag : TOOL_PAGE.needCardTag }}</span>
        </span>
        <span class="tool-access-hint">
          {{ hasEntitlement ? TOOL_PAGE.activatedHint : TOOL_PAGE.needCardHint }}
        </span>
      </p>

      <div class="tool-actions">
        <!-- 需要卡密且尚未激活：按钮变成入口，携带工具 id 跳到卡密激活页，
             让用户在激活页就能看到「自己在激活哪件工具」，不必再选一次 -->
        <RouterLink
          v-if="tool.requires_card && !hasEntitlement"
          class="tool-btn u-btn-primary tool-activate-link"
          :to="{ path: '/user/kami', query: { tool_id: String(tool.id) } }"
          @click.stop
        >
          {{ TOOL_PAGE.activateNow }}
        </RouterLink>
        <button v-else class="tool-btn u-btn-primary" @click.stop="onOpenTool">
          {{ TOOL_PAGE.openTool }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import AppIcon from '@/components/AppIcon.vue'
// 文案集中在 constants，改文案只碰一个文件
import { TOOL_PAGE } from '@/constants/index.js'

const props = defineProps({
  tool: { type: Object, required: true },
  isFavorited: { type: Boolean, default: false },
  /**
   * 当前用户是否已拥有这件工具的授权（由父组件从 /kamiApi/myEntitlements 的结果传入）。
   * 不在这里自己请求：一张卡片一个请求会把列表打成 N+1 个 HTTP 调用。
   */
  hasEntitlement: { type: Boolean, default: false }
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

/* 需要卡密的标注行：标签 + 一句提示。放在按钮上方，尺寸与正文同档 */
.tool-access {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: calc(var(--space-unit) * 1);
  margin: 0;
}

.tool-access-tag {
  /* .u-tag 给全高度/内边距/圆角/配色，这里只让它横向排图标与文字 */
  display: inline-flex;
  align-items: center;
  gap: calc(var(--space-unit) * 0.5);
  flex-shrink: 0;
}

.tool-access-hint {
  font-size: var(--fs-label);
  line-height: var(--leading-body);
  color: var(--text-secondary);
}

/* margin-top: auto 把操作区压到卡片底部，卡片等高时按钮在同一水平线 */
.tool-actions {
  display: flex;
  margin-top: auto;
}

/* 激活入口是 RouterLink（真链接，可中键新开页），
   因此要补齐 .u-btn-primary 在 <a> 上不会自动获得的排版属性 */
.tool-activate-link {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  text-decoration: none;
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
