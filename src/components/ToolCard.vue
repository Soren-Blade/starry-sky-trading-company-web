<template>
  <div class="tool-card ui-card">
    <div class="tool-media ui-card-media">
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

    <div class="tool-body">
      <div class="tool-header">
        <h3 class="tool-title">{{ tool.tool_name }}</h3>
        <div class="tool-category">{{ tool.class_name }}</div>
      </div>

      <p class="tool-description">{{ tool.description }}</p>

      <!-- Collection count moved to media section as badge -->

      <div class="tool-actions">
        <button class="tool-btn primary" @click.stop="onOpenTool">打开工具</button>
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
/* 外壳（背景/圆角/阴影/hover 位移）来自 global.css 的 .ui-card，
   这里只保留工具卡特有的内部布局 */
.tool-card {
  cursor: default;
}

.tool-card .tool-btn {
  cursor: pointer;
}

.tool-media {
  display: flex;
  align-items: center;
  justify-content: center;
}

.tool-icon {
  font-size: 48px;
}

.tool-card:hover .tool-icon {
  transform: scale(1.1);
}

.tool-new-badge {
  position: absolute;
  top: 12px;
  left: 12px;
  background: linear-gradient(135deg, #ff6b6b, #ee5a52);
  color: #fff;
  padding: 6px 10px;
  border-radius: 16px;
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  box-shadow: 0 2px 8px rgba(255, 107, 107, 0.3);
  border: 1px solid rgba(255, 255, 255, 0.2);
  backdrop-filter: blur(12px);
  animation: pulse 2s infinite;
}

.favorite-btn {
  position: absolute;
  top: 12px;
  right: 12px;
  background: rgba(255, 255, 255, 0.95);
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: 50%;
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.3s ease;
  backdrop-filter: blur(12px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.favorite-count {
  position: absolute;
  top: -8px;
  right: -8px;
  background: linear-gradient(135deg, #ff6b6b, #ee5a52);
  color: #fff;
  border-radius: 50%;
  min-width: 20px;
  height: 20px;
  padding: 0 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 9px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  box-shadow: 0 2px 6px rgba(255, 107, 107, 0.4);
  border: 2px solid #fff;
  animation: bounceIn 0.5s ease-out;
}

.favorite-btn:hover {
  transform: scale(1.1);
  background: rgba(255, 255, 255, 1);
}

.favorite-btn.active {
  background: rgba(253, 121, 168, 0.9);
}

.favorite-icon {
  font-size: 16px;
}

.tool-body {
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.tool-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.tool-title {
  font-size: 18px;
  font-weight: 700;
  color: #222;
  margin: 0;
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.tool-category {
  background: rgba(138, 109, 255, 0.1);
  color: #8a6dff;
  padding: 4px 8px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 600;
}

.tool-description {
  font-size: 14px;
  color: #666;
  line-height: 1.5;
  margin: 0;
  display: -webkit-box;
  line-clamp: 2;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.tool-actions {
  display: flex;
  gap: 8px;
  margin-top: auto;
}

.tool-btn {
  flex: 1;
  padding: 8px 12px;
  border: none;
  border-radius: 6px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.tool-btn.primary {
  background: linear-gradient(90deg, #8a6dff, #6c5ce7);
  color: #fff;
}

.tool-btn.primary:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(138, 109, 255, 0.3);
}

.tool-btn.secondary {
  background: #f8f9fa;
  color: #666;
  border: 1px solid #e9ecef;
}

.tool-btn.secondary:hover {
  background: #e9ecef;
}

@media (max-width: 767px) {
  .tool-header {
    flex-direction: column;
    align-items: flex-start;
  }

  .tool-rating {
    align-self: flex-end;
  }

  .tool-actions {
    flex-direction: column;
  }

  .tool-new-badge {
    top: 12px;
    left: 12px;
  }
}

@keyframes pulse {
  0%, 100% {
    transform: scale(1);
    opacity: 1;
  }
  50% {
    transform: scale(1.05);
    opacity: 0.9;
  }
}

@keyframes bounceIn {
  0% {
    transform: scale(0.3);
    opacity: 0;
  }
  50% {
    transform: scale(1.1);
  }
  70% {
    transform: scale(0.9);
  }
  100% {
    transform: scale(1);
    opacity: 1;
  }
}
</style>