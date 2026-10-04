<template>
  <div class="page-shell favorites-page">
    <header class="page-shell-head page-shell-head--row">
      <div>
        <p class="page-shell-eyebrow">{{ PAGES.favorites.eyebrow }}</p>
        <h1 class="page-shell-title">{{ PAGES.favorites.title }}</h1>
        <p class="page-shell-desc">{{ PAGES.favorites.description }}</p>
      </div>
      <span class="u-tag u-tag--accent">
        商品 {{ favoriteStore.productCount }} · 工具 {{ favoriteStore.toolCount }}
      </span>
    </header>

    <!-- 两个页签：商品收藏与工具收藏是两种完全不同的卡片，不混在一个列表里 -->
    <div class="favorites-tabs" role="tablist" aria-label="收藏类型">
      <button
        v-for="tabItem in tabs"
        :key="tabItem.key"
        :id="`fav-tab-${tabItem.key}`"
        type="button"
        role="tab"
        class="favorites-tab"
        :class="{ 'favorites-tab--active': activeTab === tabItem.key }"
        :aria-selected="activeTab === tabItem.key"
        :aria-controls="`fav-panel-${tabItem.key}`"
        @click="activeTab = tabItem.key"
      >
        {{ tabItem.label }}
        <span class="favorites-tab-count">{{ tabItem.count }}</span>
      </button>
    </div>

    <div
      :id="`fav-panel-${activeTab}`"
      role="tabpanel"
      :aria-labelledby="`fav-tab-${activeTab}`"
    >
      <div v-if="favoriteStore.loading && !favoriteStore.loadedForUserId" class="u-loading-block" role="status">
        <span class="u-spinner u-spinner--lg" aria-hidden="true"></span>
        <span>正在加载收藏…</span>
      </div>

      <!-- 商品收藏 -->
      <template v-else-if="activeTab === 'product'">
        <ul v-if="productList.length" class="favorites-grid">
          <li
            v-for="(entry, index) in productList"
            :key="entry.target_id"
            class="favorites-cell"
          >
            <ProductCard
              v-if="entry.target"
              :product="entry.target"
              :style="{ '--i': index }"
              @go-detail="goDetail"
            />
            <!-- 收藏的商品被删除：保留一行并给出清理入口，
                 静默消失会让用户以为收藏功能坏了 -->
            <div v-else class="page-empty favorites-missing">
              <p class="page-empty-title">{{ TRADE.favoritesMissing }}</p>
              <button type="button" class="u-btn-secondary" @click="removeEntry(entry, 'product')">
                从收藏中移除
              </button>
            </div>
            <button
              v-if="entry.target"
              type="button"
              class="u-btn-secondary favorites-remove"
              @click="removeEntry(entry, 'product')"
            >
              取消收藏
            </button>
          </li>
        </ul>

        <div v-else class="page-empty">
          <p class="page-empty-title">{{ TRADE.favoritesEmpty }}</p>
          <p class="page-empty-hint">{{ TRADE.favoritesEmptyHint }}</p>
          <div class="page-actions favorites-empty-actions">
            <router-link to="/hot" class="u-btn-primary">去看热门推荐</router-link>
          </div>
        </div>
      </template>

      <!-- 工具收藏 -->
      <template v-else>
        <ul v-if="toolList.length" class="favorites-grid">
          <li v-for="(entry, index) in toolList" :key="entry.target_id" class="favorites-cell">
            <ToolCard
              v-if="entry.target"
              :tool="entry.target"
              :is-favorited="true"
              :style="{ '--i': index }"
              @open-tool="openTool"
              @toggle-favorite="removeEntry(entry, 'tool')"
            />
            <div v-else class="page-empty favorites-missing">
              <p class="page-empty-title">{{ TRADE.favoritesMissing }}</p>
              <button type="button" class="u-btn-secondary" @click="removeEntry(entry, 'tool')">
                从收藏中移除
              </button>
            </div>
          </li>
        </ul>

        <div v-else class="page-empty">
          <p class="page-empty-title">{{ TRADE.favoritesEmpty }}</p>
          <p class="page-empty-hint">{{ TRADE.favoritesEmptyHint }}</p>
          <div class="page-actions favorites-empty-actions">
            <router-link to="/tool" class="u-btn-primary">去工具工作台</router-link>
          </div>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup>
/**
 * 我的收藏
 *
 * 数据来自 `favorite` store —— 它负责「登录用户走服务端、游客走 localStorage」
 * 这条分支，页面只读结果。工具的详情由服务端在列表接口里补齐（`target`）；
 * 商品同理。`target` 为 null 表示收藏对象已被删除，此时保留一行并给出清理入口。
 */
import { computed, onMounted, ref } from 'vue'
import { useFavoriteStore } from '@/stores/favorite'
import { useProductActions } from '@/hooks/useProductActions'
import { useOpenTool } from '@/hooks/useOpenTool'
import { notify } from '@/hooks/useToast/index.js'
import ProductCard from '@/components/ProductCard.vue'
import ToolCard from '@/components/ToolCard.vue'
import { PAGES, TRADE } from '@/constants/index.js'

const favoriteStore = useFavoriteStore()
const { goDetail } = useProductActions()
const { openTool } = useOpenTool()

const activeTab = ref('product')

const productList = computed(() => favoriteStore.productItems)
const toolList = computed(() => favoriteStore.toolItems)

const tabs = computed(() => [
  { key: 'product', label: TRADE.favoritesProductTab, count: favoriteStore.productCount },
  { key: 'tool', label: TRADE.favoritesToolTab, count: favoriteStore.toolCount },
])

const removeEntry = async (entry, targetType) => {
  const result = await favoriteStore.toggle(targetType, entry.target_id)
  if (result.success) notify.success(TRADE.favoritesRemoved)
  else notify.error(result.message)
}

onMounted(() => {
  // force 一次：从别处刚收藏的商品要能立刻出现在这里
  favoriteStore.load(true)
})
</script>

<style scoped>
/*
 * 收藏页：胶囊页签 + 卡片网格（复用 ProductCard / ToolCard 的外壳）。
 */

.favorites-tabs {
  display: flex;
  flex-wrap: wrap;
  gap: calc(var(--space-unit));
  margin-bottom: var(--section-gap);
}

/* 胶囊型筛选页签：与 .u-btn-secondary 同族，但选中态用强调底填充 */
.favorites-tab {
  display: inline-flex;
  align-items: center;
  gap: calc(var(--space-unit) * 0.75);
  height: var(--btn-height);
  padding: 0 calc(var(--btn-padding-x));
  font-size: var(--btn-font-size);
  font-family: inherit;
  color: var(--text-secondary);
  background: var(--bg-surface);
  border: var(--stroke-width) solid var(--border);
  border-radius: var(--radius-pill);
  cursor: pointer;
  transition:
    background-color var(--transition-interactive),
    border-color var(--transition-interactive),
    color var(--transition-interactive);
}

.favorites-tab:hover {
  border-color: var(--accent);
  color: var(--accent);
}

.favorites-tab--active {
  color: var(--text-on-accent);
  background: var(--accent);
  border-color: var(--accent);
}

.favorites-tab-count {
  font-family: var(--font-mono);
  font-size: var(--tag-font-size);
  opacity: 0.8;
}

.favorites-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(var(--card-width), 1fr));
  gap: var(--grid-gap);
  margin: 0;
  padding: 0;
  list-style: none;
}

.favorites-cell {
  display: flex;
  flex-direction: column;
  gap: calc(var(--space-unit));
  min-width: 0;
}

/* 卡片在收藏页里要撑满格子高度，取消收藏按钮才落在同一水平线 */
.favorites-cell > *:first-child {
  flex: 1;
}

.favorites-remove {
  width: 100%;
}

.favorites-missing {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: calc(var(--space-unit) * 1.5);
  flex: 1;
}

.favorites-empty-actions {
  justify-content: center;
  margin-top: calc(var(--space-unit) * 2.5);
}

/* ── 响应式：断点统一 1199 / 991 / 767 / 575 ────────────────── */
@media (max-width: 767px) {
  .favorites-tabs {
    margin-bottom: calc(var(--section-gap) * var(--mobile-section-scale));
  }

  .favorites-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 575px) {
  .favorites-grid {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
