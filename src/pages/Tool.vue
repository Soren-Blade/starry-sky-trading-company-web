<template>
  <div class="tool-page">
    <!-- 页头：文案与其它页面同源（constants/content.js 的 PAGES） -->
    <PageHeader v-bind="PAGES.tools" />

    <div class="page-container">
      <!-- 分类过滤器 -->
      <div class="category-filter">
        <div class="filter-tabs">
          <button
            v-for="category in toolData.classes"
            :key="category.class"
            type="button"
            class="u-tag filter-tab"
            :class="{ 'u-tag--accent': activeCategory === category.class }"
            @click="toolStore.setActiveCategory(category.class)"
          >
            <span class="tab-icon" aria-hidden="true">{{ category.icon }}</span>
            <span class="tab-label">{{ category.class_name }}</span>
          </button>
        </div>
        <div class="filter-actions">
          <!-- 搜索框：图标定位与输入区让位来自共享类 .u-search / .u-search-icon -->
          <div class="u-search search-box">
            <label class="visually-hidden" for="tool-search">搜索工具</label>
            <span class="u-search-icon" aria-hidden="true">🔍</span>
            <input
              id="tool-search"
              v-model="searchQuery"
              type="search"
              :placeholder="TOOL_PAGE.searchPlaceholder"
              class="u-input"
            />
          </div>
          <button
            type="button"
            class="u-tag favorites-btn"
            :class="{ 'u-tag--accent': showFavorites }"
            :aria-pressed="showFavorites"
            @click="toggleFavorites"
          >
            <span class="favorites-icon" aria-hidden="true">❤️</span>
            <span class="favorites-text">{{ TOOL_PAGE.favorites }}</span>
          </button>
        </div>
      </div>

      <!-- 工具网格 -->
      <div class="tools-grid">
        <ToolCard
          v-for="(tool, index) in filteredTools"
          :key="tool.id"
          :tool="tool"
          :is-favorited="favoriteTools.has(Number(tool.id))"
          :style="{ '--i': index }"
          @open-tool="handleOpenTool"
          @toggle-favorite="handleToggleFavorite"
        />
        <!-- 加载 / 错误 / 空态：加载走共享的 .u-loading-block，另两态共用同一块占位 -->
        <div v-if="toolsLoading" class="u-loading-block" role="status">
          <span class="u-spinner u-spinner--lg" aria-hidden="true"></span>
          <span>{{ TOOL_PAGE.loading }}</span>
        </div>
        <div v-else-if="toolsError" class="empty-note empty-note--error">
          {{ TOOL_PAGE.errorPrefix }}{{ toolsError }}
        </div>
        <div v-else-if="filteredTools.length === 0" class="empty-note">{{ TOOL_PAGE.empty }}</div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { storeToRefs } from 'pinia'
import ToolCard from '@/components/ToolCard.vue'
import PageHeader from '@/components/PageHeader.vue'
import { useToolStore } from '@/stores/tool'
import { notify } from '@/hooks/useToast/index.js'
// 页面文案集中在 constants，改文案只碰一个文件
import { PAGES, TOOL_PAGE } from '@/constants/index.js'

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
    notify.warning(TOOL_PAGE.missingPath)
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
    notify.error(TOOL_PAGE.invalidPath)
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
    notify.warning(TOOL_PAGE.popupBlocked)
    return
  }
  openedWindows.set(url, win)
}

const handleToggleFavorite = (tool) => {
  const id = Number(tool?.id)
  if (!Number.isFinite(id)) return

  if (favoriteTools.value.has(id)) {
    favoriteTools.value.delete(id)
    notify.success(TOOL_PAGE.removedFavorite)
  } else {
    favoriteTools.value.add(id)
    notify.success(TOOL_PAGE.addedFavorite)
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
  width: 100%;
  /* 顶栏占位由 App.vue 的 .main-content 统一负责，页面不再声明顶部内边距 */
  padding: var(--section-gap) 0;
  /* 页面底色由 body 的 --bg-page 承担，页面不再自带浅色渐变底 */
  background: transparent;
}

.page-container {
  max-width: var(--container-content);
  margin: 0 auto;
  padding: 0 var(--container-padding);
}

.category-filter {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: calc(var(--space-unit) * 2.5);
  margin-bottom: calc(var(--space-unit) * 4);
}

.filter-tabs {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-unit);
}

/* 分类 tab 与「已收藏」的尺寸、描边、圆角与选中态全部来自 .u-tag / .u-tag--accent
   （选中态悬停时的文字色已在 global.css 修好，这里不再写兜底覆盖），
   组件内只放大 emoji 图标，使其与标签文字比例协调 */
.tab-icon,
.favorites-icon {
  font-size: var(--fs-body);
  line-height: 1;
}

.filter-actions {
  display: flex;
  align-items: center;
  gap: calc(var(--space-unit) * 1.5);
}

/* 搜索框的 flex 布局、图标定位与输入区让位来自 .u-search / .u-search-icon / .u-input，
   这里只负责它在筛选行里占多宽 */
.search-box {
  width: calc(var(--space-unit) * 25);
}

.tools-grid {
  display: grid;
  /* 卡片最小宽度走 --card-width，随主题密度一起缩放（不再借用间距单位换算） */
  grid-template-columns: repeat(auto-fill, minmax(var(--card-width), 1fr));
  gap: var(--grid-gap);
}

/* 空态 / 错误态共用同一块占位：差异只在语义色 */
.empty-note {
  grid-column: 1 / -1;
  padding: calc(var(--space-unit) * 6) calc(var(--space-unit) * 2.5);
  font-size: var(--fs-body);
  color: var(--text-muted);
  text-align: center;
  background: var(--bg-surface-2);
  border: var(--stroke-width) solid var(--border);
  border-radius: var(--radius-card);
}

.empty-note--error {
  color: var(--danger);
  background: var(--danger-bg);
  border-color: var(--danger);
}

@media (max-width: 767px) {
  .tool-page {
    padding: calc(var(--section-gap) * var(--mobile-section-scale)) 0;
  }

  .category-filter {
    flex-direction: column;
    align-items: stretch;
    gap: calc(var(--space-unit) * 1.5);
  }

  .filter-tabs {
    justify-content: center;
    gap: calc(var(--space-unit) * 0.75);
  }

  .filter-actions {
    justify-content: center;
    gap: var(--space-unit);
  }

  /* 搜索框占满剩余宽度，与「已收藏」并排 */
  .search-box {
    flex: 1;
    width: auto;
    min-width: 0;
  }

  /* 卡片窄一档（×0.8）：小屏每行至少两张，窄到 575 时回到一张 */
  .tools-grid {
    grid-template-columns: repeat(auto-fill, minmax(calc(var(--card-width) * 0.8), 1fr));
  }

  .empty-note {
    font-size: calc(var(--fs-body) * var(--mobile-body-scale));
  }
}
</style>
