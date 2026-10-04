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
            <label class="visually-hidden" for="tool-search">搜索工具</label>
            <input
              id="tool-search"
              v-model="searchQuery"
              type="search"
              placeholder="搜索工具..."
              class="search-input"
            />
            <span class="search-icon" aria-hidden="true">🔍</span>
          </div>
          <button
            type="button"
            class="favorites-btn"
            :class="{ active: showFavorites }"
            :aria-pressed="showFavorites"
            @click="toggleFavorites"
          >
            <span class="favorites-icon" aria-hidden="true">❤️</span>
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
          :is-favorited="favoriteTools.has(Number(tool.id))"
          @open-tool="handleOpenTool"
          @toggle-favorite="handleToggleFavorite"
        />
        <div v-if="toolsLoading" class="empty-note">正在加载工具…</div>
        <div v-else-if="toolsError" class="empty-note error">工具加载失败：{{ toolsError }}</div>
        <div v-else-if="filteredTools.length === 0" class="empty-note">
          该分类下暂无工具
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { storeToRefs } from 'pinia'
import { message } from 'ant-design-vue'
import ToolCard from '@/components/ToolCard.vue'
import { useToolStore } from '@/stores/tool'

const toolStore = useToolStore()
const { toolData, activeCategory, toolsLoading, toolsError } = storeToRefs(toolStore)

const searchQuery = ref('')
const showFavorites = ref(false)

// 收藏为本地偏好（尚无后端接口），持久化到 localStorage 以便刷新后保留
const FAVORITES_KEY = 'SSTC_TOOL_FAVORITES'

const loadFavorites = () => {
  try {
    const raw = localStorage.getItem(FAVORITES_KEY)
    const parsed = raw ? JSON.parse(raw) : []
    return new Set(Array.isArray(parsed) ? parsed.map(Number) : [])
  } catch {
    return new Set()
  }
}

const favoriteTools = ref(loadFavorites())

const persistFavorites = () => {
  try {
    localStorage.setItem(FAVORITES_KEY, JSON.stringify([...favoriteTools.value]))
  } catch {
    /* 隐私模式下不可写，忽略 */
  }
}

/** 统一取小写字符串，兼容后端可能返回 null 的字段 */
const lower = (value) => (value == null ? '' : String(value).toLowerCase())

const filteredTools = computed(() => {
  let list = toolData.value.tools || []

  // 分类过滤
  if (activeCategory.value !== 'all') {
    list = list.filter((tool) => tool.class === activeCategory.value)
  }

  // 搜索过滤
  const query = searchQuery.value.trim().toLowerCase()
  if (query) {
    list = list.filter((tool) =>
      lower(tool.class_name).includes(query) ||
      lower(tool.tool_name).includes(query) ||
      lower(tool.display_name).includes(query) ||
      lower(tool.description).includes(query)
    )
  }

  // 收藏过滤
  if (showFavorites.value) {
    list = list.filter((tool) => favoriteTools.value.has(Number(tool.id)))
  }

  return list
})

const toggleFavorites = () => {
  showFavorites.value = !showFavorites.value
  if (showFavorites.value) {
    // 显示收藏时重置分类与搜索，避免两个过滤条件叠加后看不到结果
    toolStore.setActiveCategory('all')
    searchQuery.value = ''
  }
}

// 记录已打开的工具窗口，避免同一工具重复开窗
// 使用 Map 并在每次打开时顺带清理已关闭的引用，避免长期驻留
const openedWindows = new Map()

const handleOpenTool = (tool) => {
  const url = tool?.tool_path

  if (!url || typeof url !== 'string') {
    message.warning('该工具暂未配置跳转地址')
    return
  }

  // 顺带清理已关闭的窗口引用
  for (const [key, win] of openedWindows) {
    if (win.closed) openedWindows.delete(key)
  }

  let absoluteUrl
  try {
    absoluteUrl = new URL(url, window.location.origin).href
  } catch {
    message.error('工具地址无效')
    return
  }

  const existing = openedWindows.get(url)
  if (existing && !existing.closed) {
    try {
      // 窗口仍停留在原地址时直接聚焦，否则重新打开
      if (existing.location.href === absoluteUrl) {
        existing.focus()
        return
      }
    } catch {
      // 跨域读取 location 会抛错，视为页面已变化
    }
    openedWindows.delete(url)
  }

  const win = window.open(url, '_blank')
  if (!win) {
    message.warning('浏览器拦截了新窗口，请允许本站弹出窗口')
    return
  }
  openedWindows.set(url, win)
}

const handleToggleFavorite = (tool) => {
  const id = Number(tool?.id)
  if (!Number.isFinite(id)) return

  if (favoriteTools.value.has(id)) {
    favoriteTools.value.delete(id)
    message.success('已取消收藏')
  } else {
    favoriteTools.value.add(id)
    message.success('已收藏')
  }
  // Set 是响应式 ref 的内部可变对象，需触发一次更新
  favoriteTools.value = new Set(favoriteTools.value)
  persistFavorites()
}

onMounted(() => {
  toolStore.init()
})
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
  padding: 8px 34px 8px 12px;
  border: 2px solid var(--color-border);
  border-radius: var(--radius-pill);
  font-size: 14px;
  outline: none;
  transition: border-color var(--transition-fast);
}

.search-input:focus {
  border-color: var(--color-primary);
}

/* 搜索是即时的（由 computed 完成），图标仅作提示 */
.search-icon {
  position: absolute;
  right: 12px;
  font-size: 14px;
  pointer-events: none;
}

/* .visually-hidden 已抽取到 global.css，供各组件复用 */

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
  border-radius: var(--radius-md);
  font-size: 16px;
}

.empty-note.error {
  color: var(--color-danger);
  background: var(--color-danger-bg);
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
