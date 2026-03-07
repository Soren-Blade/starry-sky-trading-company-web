<template>
  <div class="tool-page">
    <div class="page-container">
      <!-- 分类过滤器 -->
      <div class="category-filter">
        <div class="filter-tabs">
          <button
            v-for="category in toolData.classes"
            :key="category.class"
            class="filter-tab"
            :class="{ active: activeCategory === category.class }"
            @click="toolStore.setActiveCategory(category.class)"
          >
            <span class="tab-icon">{{ category.icon }}</span>
            <span class="tab-label">{{ category.class_name }}</span>
          </button>
        </div>
        <div class="filter-actions">
          <div class="search-box">
            <input
              v-model="searchQuery"
              type="text"
              placeholder="搜索工具..."
              class="search-input"
            />
            <button class="search-btn" @click="performSearch">
              <span class="search-icon">🔍</span>
            </button>
          </div>
          <button
            class="favorites-btn"
            :class="{ active: showFavorites }"
            @click="toggleFavorites"
          >
            <span class="favorites-icon">❤️</span>
            <span class="favorites-text">已收藏</span>
          </button>
        </div>
      </div>

      <!-- 工具网格 -->
      <div class="tools-grid">
        <ToolCard
          v-for="tool in filteredTools"
          :key="tool.id"
          :tool="tool"
          :is-favorited="favoriteTools.has(parseInt(tool.id))"
          @open-tool="handleOpenTool"
          @toggle-favorite="handleToggleFavorite"
        />
        <div v-if="filteredTools.length === 0" class="empty-note">
          该分类下暂无工具
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from "vue";
import ToolCard from "@/components/ToolCard.vue";

// 工具管理存储
import { useToolStore } from "@/stores/tool";
import { storeToRefs } from "pinia";

const toolStore = useToolStore();
const { toolData, activeCategory } = storeToRefs(toolStore);

const searchQuery = ref("");
const showFavorites = ref(false);
const favoriteTools = ref(new Set([1, 3, 5])); // 示例收藏工具ID

const filteredTools = computed(() => {
  let toolsdata = toolData.value.tools || [];

  // 分类过滤
  if (activeCategory.value !== "all") {
    toolsdata = toolsdata.filter((tool) => tool.class === activeCategory.value);
  }

  // 搜索过滤
  if (searchQuery.value.trim()) {
    const query = searchQuery.value.toLowerCase();
    toolsdata = toolsdata.filter(tool =>
      tool.class_name.toLowerCase().includes(query) ||
      tool.description.toLowerCase().includes(query) ||
      tool.tool_name.toLowerCase().includes(query) ||
      tool.display_name.toLowerCase().includes(query)
    );
  }

  // 收藏过滤
  if (showFavorites.value) {
    toolsdata = toolsdata.filter(tool => favoriteTools.value.has(parseInt(tool.id)));
  }

  return toolsdata;
});

const performSearch = () => {
  // 搜索逻辑已在computed中处理，这里可以添加额外逻辑
  console.log("搜索:", searchQuery.value);
};

const toggleFavorites = () => {
  showFavorites.value = !showFavorites.value;
  if (showFavorites.value) {
    activeCategory.value = "all"; // 显示收藏时重置分类
    searchQuery.value = ""; // 清除搜索
  }
};

// keep references to opened tool windows by path
const openedWindows = new Map();

const handleOpenTool = (tool) => {
  const url = tool.tool_path;
  console.log("打开工具详情:", url);

  // check if we already have an open window for this path
  const existing = openedWindows.get(url);
  if (existing && !existing.closed) {
    // focus the existing window instead of opening new one
    existing.focus();
    return;
  }

  // otherwise open a new window and store reference
  const win = window.open(url, '_blank');
  if (win) {
    openedWindows.set(url, win);
  }
};

const handleToggleFavorite = (tool) => {
  // if (favoriteTools.value.has(tool.id)) {
  //   favoriteTools.value.delete(tool.id);
  //   console.log("取消收藏:", tool.name);
  // } else {
  //   favoriteTools.value.add(tool.id);
  //   console.log("添加收藏:", tool.name);
  // }
  console.log('收藏相关')
};

onMounted(() => {
  // 初始化
  toolStore.init();
});
</script>

<style scoped>
.tool-page {
  min-height: 100vh;
  background: linear-gradient(180deg, #f8f9fa 0%, #f1f2f4 100%);
  padding: 80px 0 56px;
}

.page-container {
  max-width: 1280px;
  margin: 0 auto;
  padding: 0 20px;
}

.page-header {
  text-align: center;
  margin-bottom: 48px;
}

.page-title {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  font-size: 36px;
  font-weight: 800;
  color: #222;
  margin-bottom: 12px;
}

.title-icon {
  font-size: 32px;
}

.page-description {
  color: #666;
  font-size: 16px;
  margin: 0;
}

.category-filter {
  margin-bottom: 32px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
}

.filter-tabs {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.filter-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.search-box {
  position: relative;
  display: flex;
  align-items: center;
}

.search-input {
  width: 200px;
  padding: 8px 12px;
  border: 2px solid #e9ecef;
  border-radius: 25px;
  font-size: 14px;
  outline: none;
  transition: border-color 0.2s ease;
}

.search-input:focus {
  border-color: #8a6dff;
}

.search-btn {
  position: absolute;
  right: 4px;
  /* background: linear-gradient(90deg, #8a6dff, #6c5ce7); */
  border: none;
  border-radius: 50%;
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: transform 0.2s ease;
}

.search-btn:hover {
  transform: scale(1.1);
}

.search-icon {
  font-size: 14px;
}

.favorites-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  background: #fff;
  border: 2px solid #e9ecef;
  border-radius: 25px;
  font-size: 14px;
  font-weight: 600;
  color: #666;
  cursor: pointer;
  transition: all 0.2s ease;
}

.favorites-btn:hover {
  border-color: #fd79a8;
  color: #fd79a8;
  transform: translateY(-1px);
}

.favorites-btn.active {
  background: linear-gradient(90deg, #fd79a8, #e84393);
  border-color: #fd79a8;
  color: #fff;
  box-shadow: 0 4px 12px rgba(253, 121, 168, 0.3);
}

.favorites-icon {
  font-size: 16px;
}

.favorites-text {
  font-weight: 600;
}

.filter-tab {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 10px 16px;
  background: #fff;
  border: 2px solid #e9ecef;
  border-radius: 25px;
  font-size: 14px;
  font-weight: 600;
  color: #666;
  cursor: pointer;
  transition: all 0.2s ease;
}

.filter-tab:hover {
  border-color: #8a6dff;
  color: #8a6dff;
  transform: translateY(-1px);
}

.filter-tab.active {
  background: linear-gradient(90deg, #8a6dff, #6c5ce7);
  border-color: #8a6dff;
  color: #fff;
  box-shadow: 0 4px 12px rgba(138, 109, 255, 0.3);
}

.tab-icon {
  font-size: 16px;
}

.tools-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 24px;
}

.empty-note {
  grid-column: 1 / -1;
  text-align: center;
  color: #888;
  padding: 48px 20px;
  background: rgba(250, 250, 250, 0.7);
  border-radius: 12px;
  font-size: 16px;
}

@media (max-width: 1199px) {
  .tools-grid {
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  }
}

@media (max-width: 767px) {
  .tool-page {
    padding: 60px 0 40px;
  }

  .page-title {
    font-size: 28px;
  }

  .title-icon {
    font-size: 24px;
  }

  .page-description {
    font-size: 14px;
  }

  .category-filter {
    flex-direction: column;
    align-items: stretch;
    gap: 16px;
  }

  .filter-tabs {
    justify-content: center;
    gap: 6px;
  }

  .filter-tab {
    padding: 8px 12px;
    font-size: 13px;
  }

  .filter-actions {
    justify-content: center;
    gap: 8px;
  }

  .search-input {
    width: 150px;
  }

  .favorites-btn {
    padding: 6px 12px;
    font-size: 13px;
  }

  .tools-grid {
    /* keep at least two cards per row on small screens */
    grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
    gap: 16px;
  }
}
</style>
