<template>
  <div class="page-shell category-page">
    <header class="page-shell-head page-shell-head--row">
      <div class="category-heading">
        <p class="page-shell-eyebrow">{{ PAGES.category.eyebrow }}</p>
        <h1 class="page-shell-title">
          <router-link to="/categories" class="page-shell-title-link">
            {{ category ? category.category_name : PAGES.category.title }}
          </router-link>
        </h1>
        <p class="page-shell-desc">
          {{ category?.description || PAGES.category.description }}
        </p>
      </div>

      <div class="category-meta">
        <span class="u-tag u-tag--accent">{{ CATEGORY_PAGE.countLabel(products.length) }}</span>
        <router-link to="/categories" class="category-back">
          {{ CATEGORY_PAGE.backToIndex }}
        </router-link>
      </div>
    </header>

    <!-- 子分类：有下级时先给一排入口，避免用户只能看到本级商品 -->
    <section v-if="children.length" class="page-panel category-children">
      <h2 class="page-panel-head">{{ CATEGORY_PAGE.subCategories }}</h2>
      <ul class="children-list">
        <li v-for="child in children" :key="child.id">
          <router-link :to="`/category/${child.id}`" class="children-item">
            <span class="children-icon" aria-hidden="true">{{ child.icon_url || '📦' }}</span>
            <span class="children-name">{{ child.category_name }}</span>
            <span class="children-arrow" aria-hidden="true">→</span>
          </router-link>
        </li>
      </ul>
    </section>

    <!-- 商品网格：加载 / 错误 / 空三态 -->
    <div v-if="loading" class="u-loading-block" role="status">
      <span class="u-spinner u-spinner--lg" aria-hidden="true"></span>
      <span>{{ PRODUCT_GRID.loading }}</span>
    </div>

    <p v-else-if="error" class="page-note page-note--error" role="alert">
      {{ PRODUCT_GRID.errorPrefix }}{{ error }}
    </p>

    <ul v-else-if="products.length" class="category-grid">
      <li v-for="(product, index) in products" :key="product.id" class="category-cell">
        <ProductCard :product="product" :style="{ '--i': index }" @go-detail="goDetail" />
      </li>
    </ul>

    <div v-else class="page-empty">
      <p class="page-empty-title">{{ CATEGORY_PAGE.empty }}</p>
      <div class="page-actions category-fallback">
        <router-link to="/hot" class="u-btn-primary">去看热门推荐</router-link>
      </div>
    </div>
  </div>
</template>

<script setup>
/**
 * 分类详情页
 *
 * 分类信息优先从 `shopStore.shopClass`（已加载的分类树）里取，取不到再回一次
 * `/class/getCategories?flat=true` 兜底 —— 深链直接打开本页时分类树可能还没加载完。
 *
 * 商品用 `GET /shop/getProducts?category_id=` 过滤。
 * 这里刻意传 `status: 'all'` + `in_stock: 'all'`：分类页要的是「这一类里有什么」，
 * 缺货的商品也应出现（卡片自己会打「缺货」标记），否则用户会以为该分类是空的。
 */
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { storeToRefs } from 'pinia'
import api from '@/api/index'
import ProductCard from '@/components/ProductCard.vue'
import { useShopStore } from '@/stores/shop'
import { useProductActions } from '@/hooks/useProductActions'
import { CATEGORY_PAGE, PAGES, PRODUCT_GRID } from '@/constants/index.js'

const route = useRoute()
const shopStore = useShopStore()
const { goDetail } = useProductActions()
const { shopClass } = storeToRefs(shopStore)

const products = ref([])
const loading = ref(true)
const error = ref('')
/** 兜底取得的分类（分类树里找不到时用） */
const fallbackCategory = ref(null)

const categoryId = computed(() => Number(route.params.id))

/** 分类树是两层结构（tree=true），先拍平再找，避免写两套查找 */
const flatCategories = computed(() => {
  const out = []
  const walk = (list) => {
    for (const item of list || []) {
      out.push(item)
      if (Array.isArray(item.children) && item.children.length) walk(item.children)
    }
  }
  walk(shopClass.value)
  return out
})

const category = computed(
  () => flatCategories.value.find((item) => Number(item.id) === categoryId.value) || fallbackCategory.value
)

/** 子分类：分类树里有 children 就用，否则从拍平结果里按 parent_id 找 */
const children = computed(() => {
  const found = category.value
  if (found && Array.isArray(found.children) && found.children.length) return found.children
  return flatCategories.value.filter((item) => Number(item.parent_id) === categoryId.value)
})

const loadProducts = async () => {
  loading.value = true
  error.value = ''
  try {
    const result = await api.getProducts({
      category_id: categoryId.value,
      status: 'all',
      in_stock: 'all',
      limit: 100,
      sort_by: 'created_at',
      sort_order: 'desc',
    })
    if (!result?.success) {
      error.value = result?.message || '加载失败'
      products.value = []
      return
    }
    products.value = result.data?.products || []
  } catch (err) {
    error.value = err?.message || '加载失败'
    products.value = []
  } finally {
    loading.value = false
  }
}

/** 分类树里没有这条分类时，单独查一次扁平列表 */
const ensureCategory = async () => {
  if (category.value) return
  try {
    const result = await api.getCategories({ flat: true, limit: 500 })
    const list = result?.data?.categories || []
    fallbackCategory.value = list.find((item) => Number(item.id) === categoryId.value) || null
  } catch {
    /* 兜底失败不报错：只要商品能出来，页面仍然可用 */
  }
}

const load = async () => {
  if (!Number.isFinite(categoryId.value) || categoryId.value <= 0) {
    error.value = '分类参数不合法'
    loading.value = false
    products.value = []
    return
  }
  await Promise.all([loadProducts(), ensureCategory()])
}

onMounted(async () => {
  if (!shopClass.value.length) await shopStore.getCategories()
  load()
})

// 从子分类点进另一个分类时组件被复用，必须重新拉取
watch(categoryId, () => {
  fallbackCategory.value = null
  load()
})
</script>

<style scoped>
/*
 * 分类详情：标题带右侧是「计数 + 返回索引」，商品网格复用 ProductCard。
 * 外壳来自 global.css 的 .page-shell 系列，这里只写本页特有部分。
 */

.category-heading {
  display: flex;
  flex-direction: column;
  gap: calc(var(--space-unit) * 1.5);
  min-width: 0;
}

.category-meta {
  display: flex;
  align-items: center;
  gap: calc(var(--space-unit) * 2);
  flex-shrink: 0;
}

.category-back {
  font-size: var(--fs-sm);
  color: var(--text-secondary);
  transition: color var(--transition-interactive);
}

.category-back:hover {
  color: var(--accent);
}

.category-children {
  margin-bottom: var(--section-gap);
}

.children-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(calc(var(--card-width) * 0.7), 1fr));
  gap: calc(var(--space-unit) * 1.5);
  margin: 0;
  padding: 0;
  list-style: none;
}

.children-item {
  display: flex;
  align-items: center;
  gap: calc(var(--space-unit) * 1.25);
  height: var(--dropdown-item-height);
  padding: 0 calc(var(--space-unit) * 1.5);
  font-size: var(--fs-sm);
  color: var(--text-secondary);
  background: var(--bg-surface-2);
  border: var(--stroke-width) solid var(--border);
  border-radius: var(--btn-radius);
  transition:
    background-color var(--transition-interactive),
    border-color var(--transition-interactive),
    color var(--transition-interactive);
}

.children-item:hover {
  color: var(--accent);
  background: var(--bg-soft);
  border-color: var(--accent);
}

.children-icon {
  flex-shrink: 0;
  font-size: var(--input-icon-size);
  line-height: 1;
}

.children-name {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.children-arrow {
  flex-shrink: 0;
  transition: transform var(--transition-interactive);
}

.children-item:hover .children-arrow {
  transform: translateX(calc(var(--space-unit) * 0.25));
}

.category-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(var(--card-width), 1fr));
  gap: var(--grid-gap);
  margin: 0;
  padding: 0;
  list-style: none;
}

.category-cell {
  display: flex;
  min-width: 0;
}

.category-fallback {
  justify-content: center;
  margin-top: calc(var(--space-unit) * 2.5);
}

/* ── 响应式：断点统一 1199 / 991 / 767 / 575 ────────────────── */
@media (max-width: 767px) {
  .category-meta {
    flex-wrap: wrap;
  }

  .category-children {
    margin-bottom: calc(var(--section-gap) * var(--mobile-section-scale));
  }

  .category-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 575px) {
  .category-grid {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
