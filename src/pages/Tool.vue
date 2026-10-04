<template>
  <div class="tool-page">
    <!-- 开场：眉标 + 大标题 + 说明 + 计数（PageHeader 已删除，页面自己排版） -->
    <header class="workspace-head">
      <p class="workspace-eyebrow">{{ PAGES.tools.eyebrow }}</p>
      <h1 class="workspace-title">{{ PAGES.tools.title }}</h1>
      <p class="workspace-desc">{{ PAGES.tools.description }}</p>
      <span class="u-tag u-tag--accent workspace-count">{{ filteredTools.length }} 个工具</span>
    </header>

    <!-- 工作台两栏：左侧竖排筛选轨 + 右侧工具区 -->
    <div class="workspace-body">
      <aside class="workspace-rail" aria-label="工具筛选">
        <div class="rail-group">
          <p class="rail-label">分类</p>
          <div class="rail-list">
            <!--
              「全部」不再手写：classifyToolsByClass 已经合成了一条 class:'all'、
              class_name:'全部工具' 的条目（含图标与总数）。此前模板里另有一个硬编码的
              「全部」按钮，于是左轨出现两条等价条目（截图已确认）。
            -->
            <button
              v-for="category in railClasses"
              :key="category.class"
              type="button"
              class="rail-item"
              :class="{ 'rail-item--active': activeCategory === category.class }"
              :aria-pressed="activeCategory === category.class"
              @click="toolStore.setActiveCategory(category.class)"
            >
              <span class="rail-icon" aria-hidden="true">{{ category.icon }}</span>
              <span class="rail-name">{{ category.class_name }}</span>
              <span v-if="Number.isFinite(Number(category.count))" class="rail-count">
                {{ category.count }}
              </span>
            </button>
          </div>
        </div>

        <!-- 已收藏开关：形态走 .u-btn-secondary，选中态的强调底用 [aria-pressed] 表达 -->
        <button
          type="button"
          class="u-btn-secondary rail-favorites"
          :aria-pressed="showFavorites"
          @click="toggleFavorites"
        >
          <span class="rail-icon" aria-hidden="true">❤️</span>
          <span class="rail-name">{{ TOOL_PAGE.favorites }}</span>
        </button>
      </aside>

      <section class="workspace-main">
        <div class="workspace-toolbar">
          <!-- 搜索框：图标定位与输入区让位来自共享类 .u-search / .u-search-icon -->
          <div class="u-search toolbar-search">
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
          <!-- 工具条右侧：显示当前筛选结果数，避免留一个无意义的占位符 -->
          <p class="toolbar-note">
            <template v-if="showFavorites">
              {{ TOOL_PAGE.favorites }} · {{ filteredTools.length }}
            </template>
            <template v-else>共 {{ filteredTools.length }} 个工具</template>
          </p>
        </div>

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
          <div v-else-if="filteredTools.length === 0" class="empty-note">
            {{ TOOL_PAGE.empty }}
          </div>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { storeToRefs } from 'pinia'
import ToolCard from '@/components/ToolCard.vue'
import { useToolStore } from '@/stores/tool'
import { useFavoriteStore } from '@/stores/favorite'
import { useOpenTool } from '@/hooks/useOpenTool'
import { notify } from '@/hooks/useToast/index.js'
// 页面文案集中在 constants，改文案只碰一个文件
import { PAGES, TOOL_PAGE } from '@/constants/index.js'

const toolStore = useToolStore()
const favoriteStore = useFavoriteStore()
const { toolData, activeCategory, toolsLoading, toolsError } = storeToRefs(toolStore)
const { openTool } = useOpenTool()

const searchQuery = ref('')
const showFavorites = ref(false)

/**
 * 左轨的分类列表。
 *
 * 后端有一批 `class` 为空字符串的工具，`classifyToolsByClass` 会为它们生成一个
 * 「空 class」桶（class_name 取工具自身的 class_name，形如「全部工具」）——
 * 于是左轨会同时出现「全部」（前端合成的 all 桶）与「全部工具」（后端空桶），
 * 两个条目含义相同、计数也相同。这里把空 class 桶滤掉，只保留真实分类。
 */
const railClasses = computed(() =>
  (toolData.value.classes || []).filter((item) => String(item.class || '').trim() !== '')
)

/**
 * 收藏集合来自 favorite store。
 *
 * 此前是组件内的 localStorage 逻辑；现在统一到 store，因为「我的收藏」页
 * 也要读同一份数据 —— 而且登录用户的收藏应该跟着账号走（换浏览器不丢），
 * 游客仍然落在 localStorage（store 内部处理这条分支，组件不关心）。
 */
const favoriteTools = computed(() => new Set(favoriteStore.toolIds))

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

/** 打开外部工具（含未配置地址、非法地址、弹窗被拦截三种处理） */
const handleOpenTool = (tool) => {
  openTool(tool)
}

const handleToggleFavorite = async (tool) => {
  const result = await favoriteStore.toggle('tool', tool?.id)
  if (result.success) notify.success(result.favorited ? TOOL_PAGE.addedFavorite : TOOL_PAGE.removedFavorite)
  else notify.error(result.message)
}

onMounted(() => {
  toolStore.init()
  // 收藏与工具列表并行取；失败不影响工具网格
  favoriteStore.load()
})
</script>

<style scoped>
/* ════════════════════════════════════════════════════════════════
 * 工作台版式：开场 + 「左轨筛选 / 右区工具」两栏，小屏退化为单栏。
 *
 * 只消费 variables.css 的令牌与 global.css 的共享类（.u-tag / .u-input /
 * .u-search / .u-btn-secondary / .u-loading-block / .u-spinner），
 * 本文件不新增令牌、不新增全局类。
 *
 * 两处刻意的选择：
 *   1. 左轨固定用 --dropdown-width 这一档宽度，不做 max-content 自适应 ——
 *      「技术单色」主题的 --space-unit 是 4px，若间距写法取 var(--space-unit) * n，
 *      同一版面会在五套主题间漂移；控件内部节奏一律取组件尺寸令牌。
 *   2. 轨道/工具栏的面板厚度写死 calc(var(--space-unit) * n)，因为它表达的是
 *      「这个面板多厚」，应当随主题密度一起缩放。
 * ════════════════════════════════════════════════════════════════ */

.tool-page {
  width: 100%;
  max-width: var(--container-max);
  margin: 0 auto;
  /* 顶栏占位由 App.vue 的 .main-content 统一负责，页面不再声明顶部内边距 */
  padding: var(--section-gap) var(--container-padding);
  /* 页面底色由 body 的 --bg-page 承担 */
  background: transparent;
}

/* ── 开场 ─────────────────────────────────────────────────────── */

.workspace-head {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: calc(var(--space-unit) * 1.5);
  margin-bottom: var(--section-gap);
}

.workspace-eyebrow {
  margin: 0;
  font-family: var(--font-mono);
  font-size: var(--fs-label);
  font-weight: var(--fw-label);
  letter-spacing: var(--tracking-label);
  text-transform: var(--label-transform);
  color: var(--accent);
}

.workspace-title {
  margin: 0;
  font-family: var(--font-display);
  font-size: var(--fs-h1);
  font-weight: var(--fw-display);
  letter-spacing: var(--tracking-display);
  text-transform: var(--heading-transform);
  color: var(--text-primary);
}

.workspace-desc {
  max-width: var(--container-narrow);
  margin: 0;
  font-size: var(--fs-body);
  line-height: var(--leading-body);
  color: var(--text-secondary);
}

/* 计数：外观全部来自 .u-tag / .u-tag--accent，这里只让它自己占一行 */
.workspace-count {
  margin-top: calc(var(--space-unit) * 0.5);
}

/* ── 两栏 ─────────────────────────────────────────────────────── */

.workspace-body {
  display: grid;
  grid-template-columns: var(--dropdown-width) minmax(0, 1fr);
  align-items: start;
  gap: var(--section-gap);
}

/* ── 左轨 ─────────────────────────────────────────────────────── */

.workspace-rail {
  /* 顶栏是 position: sticky，因此吸顶位置必须在顶栏高度之下留出空隙 */
  position: sticky;
  top: calc(var(--navbar-height) + var(--space-unit) * 2);
  display: flex;
  flex-direction: column;
  gap: calc(var(--space-unit) * 3);
  padding: calc(var(--space-unit) * 2.5);
  /* 样式用与 .ui-card 同一族令牌，但它是面板而非卡片：不套 .ui-card，
     以免继承悬停位移与图片区规则 */
  background: var(--bg-surface);
  border: var(--stroke-width) solid var(--border);
  border-radius: var(--radius-panel);
}

.rail-group {
  display: flex;
  flex-direction: column;
  gap: calc(var(--space-unit) * 1.5);
}

.rail-label {
  margin: 0;
  font-family: var(--font-mono);
  font-size: var(--fs-label);
  font-weight: var(--fw-label);
  letter-spacing: var(--tracking-label);
  text-transform: var(--label-transform);
  color: var(--text-muted);
}

.rail-list {
  display: flex;
  flex-direction: column;
  /* 分类多到超出视口时轨内自滚，吸顶面板不会被拉出屏幕 */
  max-height: calc(var(--space-unit) * 40);
  overflow-y: auto;
}

/* 竖排分类项：做法参照 .u-dropdown-item--active（左侧强调竖条 + 柔和强调底），
   但这里是导航列表而不是下拉菜单，因此按令牌自己写，不套 .u-dropdown-item */
.rail-item {
  position: relative;
  display: flex;
  align-items: center;
  gap: calc(var(--space-unit) * 1.25);
  width: 100%;
  height: var(--dropdown-item-height);
  padding: 0 calc(var(--space-unit) * 1.5);
  font-size: var(--fs-sm);
  color: var(--text-secondary);
  text-align: left;
  border-radius: var(--btn-radius);
  transition:
    background-color var(--transition-interactive),
    color var(--transition-interactive);
}

/* 选中竖条：常态就在（透明），选中才上色，因此切换时文字不会横向位移 */
.rail-item::before {
  content: '';
  position: absolute;
  top: calc(50% - var(--dropdown-item-height) / 2);
  left: 0;
  width: var(--dropdown-active-bar);
  height: var(--dropdown-item-height);
  background: transparent;
}

.rail-item:hover {
  background: var(--bg-soft);
  color: var(--accent);
}

.rail-item--active {
  background: var(--bg-soft);
  color: var(--accent);
}

.rail-item--active::before {
  background: var(--accent);
}

.rail-icon {
  flex-shrink: 0;
  font-size: var(--input-icon-size);
  line-height: 1;
}

.rail-name {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* 每项右侧的工具数：等宽数字，避免个位数/两位数切换时标签左右抖 */
.rail-count {
  flex-shrink: 0;
  font-family: var(--font-mono);
  font-size: var(--tag-font-size);
  font-variant-numeric: tabular-nums;
  color: var(--text-muted);
}

/* 选中项的计数跟着标签一起提亮（--text-muted 在强调底上对比度不足） */
.rail-item--active .rail-count {
  color: var(--accent);
}

/* 已收藏开关：形态来自 .u-btn-secondary，选中态（aria-pressed）换成强调底 */
.rail-favorites {
  gap: calc(var(--space-unit) * 1.25);
  width: 100%;
  color: var(--text-on-accent);
}

.rail-favorites[aria-pressed='true'] {
  background: var(--accent);
  border-color: var(--accent);
  color: var(--text-on-accent);
}

.rail-favorites[aria-pressed='true']:hover {
  border-color: var(--accent-strong);
  color: var(--text-on-accent);
}

/* ── 右区：工具条 + 网格 ──────────────────────────────────────── */

.workspace-main {
  display: flex;
  flex-direction: column;
  gap: calc(var(--space-unit) * 2.5);
  min-width: 0;
}

.workspace-toolbar {
  display: flex;
  align-items: center;
  gap: calc(var(--space-unit) * 2);
  padding: calc(var(--space-unit) * 2) calc(var(--space-unit) * 2.5);
  background: var(--bg-surface-2);
  border: var(--stroke-width) solid var(--border);
  border-radius: var(--radius-panel);
}

/* 搜索框的定位与输入区让位来自 .u-search / .u-search-icon / .u-input，
 * 这里只负责它在工具条里占多宽：可伸缩但有上限，把工具条的横向空间用满
 * （此前固定 320px，右侧留出一大片空白）。 */
.toolbar-search {
  flex: 1;
  max-width: calc(var(--input-height) * 14);
}

.toolbar-note {
  flex-shrink: 0;
  margin: 0 0 0 auto;
  font-family: var(--font-mono);
  font-size: var(--fs-label);
  letter-spacing: var(--tracking-label);
  color: var(--text-muted);
}

.tools-grid {
  display: grid;
  /* 卡片最小宽度走 --card-width，随主题密度一起缩放 */
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

/* ── 1199：两栏间距先收一档 ───────────────────────────────────── */

@media (max-width: 1199px) {
  .workspace-body {
    gap: calc(var(--section-gap) * 0.75);
  }
}

/* ── 991：两栏变单栏，左轨退化为横向可滚动的筛选条 ─────────────── */

@media (max-width: 991px) {
  .workspace-body {
    grid-template-columns: minmax(0, 1fr);
    gap: calc(var(--section-gap) * 0.5);
  }

  .workspace-rail {
    position: static;
    flex-direction: row;
    align-items: center;
    gap: calc(var(--space-unit) * 2);
  }

  .rail-group {
    flex: 1;
    min-width: 0;
  }

  /* 横排时分类在轨内横向滚动（滚动条隐藏，触屏与 Shift+滚轮仍可用） */
  .rail-list {
    flex-direction: row;
    gap: var(--space-unit);
    max-height: none;
    overflow-x: auto;
    overflow-y: hidden;
    scrollbar-width: none;
  }

  .rail-list::-webkit-scrollbar {
    display: none;
  }

  .rail-item {
    width: auto;
    padding: 0 calc(var(--space-unit) * 1.25);
    white-space: nowrap;
  }

  /* 横排没有左侧竖条的位置，改由底色与文字色表达选中 */
  .rail-item::before {
    content: none;
  }

  .rail-favorites {
    width: auto;
    flex-shrink: 0;
  }
}

/* ── 767：移动端缩放（控件高 ×0.9、内边距 ×0.8、区块间距 ×0.6、
 *          标题字号 ×0.7、正文字号 ×0.95）───────────────────────── */

@media (max-width: 767px) {
  .tool-page {
    padding: calc(var(--section-gap) * var(--mobile-section-scale)) var(--container-padding);
  }

  .workspace-head {
    gap: calc(var(--space-unit) * var(--mobile-padding-scale));
    margin-bottom: calc(var(--section-gap) * var(--mobile-section-scale));
  }

  .workspace-title {
    font-size: calc(var(--fs-h1) * var(--mobile-title-scale));
  }

  .workspace-desc {
    font-size: calc(var(--fs-body) * var(--mobile-body-scale));
  }

  .workspace-count {
    /* --tag-height 是「文字行高 + 微小余量」，×0.9 会把中文裁掉；
       计数的字号与内边距在这里只按内边距系数收 */
    padding: calc(var(--tag-padding-y) * var(--mobile-padding-scale))
      calc(var(--tag-padding-x) * var(--mobile-padding-scale));
  }

  .workspace-body {
    gap: calc(var(--section-gap) * var(--mobile-section-scale));
  }

  .workspace-rail {
    /* 单栏后是一块横向面板，内边距按 ×0.8 收。
     * 这里改回纵向：分类换行后需要整行宽度，「已收藏」另起一行，
     * 否则 width:100% 的按钮会在横向 flex 里溢出面板右边缘。 */
    flex-direction: column;
    align-items: stretch;
    padding: calc(var(--space-unit) * 2.5 * var(--mobile-padding-scale));
    gap: calc(var(--space-unit) * 2 * var(--mobile-padding-scale));
  }

  /* 手机上分类改成**换行**而不是横向隐藏滚动：
   * 991 档的横滚条在 500px 截图里会把最后一个分类从中间裁断，
   * 且滚动条是隐藏的，用户看不出还能滑。 */
  .rail-group {
    flex: none;
    width: 100%;
  }

  .rail-list {
    flex-wrap: wrap;
    overflow-x: visible;
    row-gap: calc(var(--space-unit) * 0.75);
  }

  /* 换行后「已收藏」独占一行，不再挤压分类 */
  .rail-favorites {
    width: 100%;
  }

  .rail-item {
    height: calc(var(--dropdown-item-height) * var(--mobile-control-scale));
    padding: 0 calc(var(--space-unit) * 1.25 * var(--mobile-padding-scale));
  }

  .workspace-toolbar {
    flex-direction: column;
    align-items: stretch;
    gap: calc(var(--space-unit) * 1.5);
    padding: calc(var(--space-unit) * 2 * var(--mobile-padding-scale))
      calc(var(--space-unit) * 2.5 * var(--mobile-padding-scale));
  }

  .toolbar-search {
    max-width: none;
  }

  /* 两列而不是「自动铺」：--card-width 在窄屏会把 auto-fill 撑破容器 */
  .tools-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .empty-note {
    padding: calc(var(--space-unit) * 6 * var(--mobile-padding-scale))
      calc(var(--space-unit) * 2.5 * var(--mobile-padding-scale));
    font-size: calc(var(--fs-body) * var(--mobile-body-scale));
  }

  /* .u-loading-block 的区块级内边距在这里跟着移动端系数收 */
  .u-loading-block {
    padding: calc(var(--section-gap) * 0.4 * var(--mobile-section-scale))
      var(--container-padding);
  }
}

/* ── 575：单列 + 容器装订线收一档 ─────────────────────────────── */

@media (max-width: 575px) {
  .tool-page {
    padding-right: calc(var(--container-padding) * var(--mobile-padding-scale));
    padding-left: calc(var(--container-padding) * var(--mobile-padding-scale));
  }

  .tools-grid {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
