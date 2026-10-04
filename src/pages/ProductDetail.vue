<template>
  <div class="page-shell product-page">
    <!-- 加载 / 失败：失败态同时承担「商品不存在」与「网络错误」两种情形，
         两者对用户的下一步动作是同一个 —— 回上一页或去热门推荐 -->
    <div v-if="loading" class="u-loading-block" role="status">
      <span class="u-spinner u-spinner--lg" aria-hidden="true"></span>
      <span>{{ PRODUCT_GRID.detailLoading }}</span>
    </div>

    <div v-else-if="error" class="page-empty">
      <p class="page-empty-title">{{ error }}</p>
      <div class="page-actions product-fallback">
        <router-link to="/hot" class="u-btn-primary">去看热门推荐</router-link>
        <button type="button" class="u-btn-secondary" @click="goBack">
          {{ PRODUCT_GRID.detailBack }}
        </button>
      </div>
    </div>

    <template v-else-if="product">
      <!-- 面包屑：给深链进来的用户一条回退路径 -->
      <nav class="product-crumb" aria-label="面包屑">
        <router-link to="/home">首页</router-link>
        <span aria-hidden="true">/</span>
        <router-link to="/categories">商品分类</router-link>
        <template v-if="category">
          <span aria-hidden="true">/</span>
          <router-link :to="`/category/${category.id}`">{{ category.category_name }}</router-link>
        </template>
      </nav>

      <div class="product-layout">
        <!-- 媒体区 -->
        <figure class="product-media">
          <img v-if="product.main_image_url" :src="product.main_image_url" :alt="title" />
          <div v-else class="product-media-placeholder" aria-hidden="true">🛍️</div>
          <span v-if="isOut" class="u-tag u-tag--danger product-flag">
            {{ PRODUCT_GRID.soldOut }}
          </span>
          <span v-else-if="product.discount_percent > 0" class="u-discount product-flag">
            -{{ Math.round(product.discount_percent) }}%
          </span>
        </figure>

        <!-- 信息区 -->
        <div class="product-info">
          <p class="page-shell-eyebrow">{{ PAGES.product.eyebrow }}</p>
          <h1 class="page-shell-title product-title">{{ title }}</h1>
          <p v-if="subtitle" class="product-subtitle">{{ subtitle }}</p>

          <p class="product-prices">
            <span class="u-price">
              <span>{{ price.prefix }}{{ price.integer }}</span>
              <span v-if="price.decimals" class="u-price-decimals">.{{ price.decimals }}</span>
            </span>
            <span v-if="showOriginal" class="u-price-original">{{ originalPrice.text }}</span>
          </p>

          <dl class="product-stats">
            <div class="product-stat">
              <dt>{{ PRODUCT_GRID.viewsLabel }}</dt>
              <dd>{{ formatReviewCount(product.view_count) }}</dd>
            </div>
            <div class="product-stat">
              <dt>{{ PRODUCT_GRID.salesLabel }}</dt>
              <dd>{{ formatReviewCount(product.sales_count) }}</dd>
            </div>
            <div class="product-stat">
              <dt>{{ PRODUCT_GRID.stockLabel }}</dt>
              <dd :class="{ out: isOut }">{{ product.stock_quantity }}</dd>
            </div>
          </dl>

          <!-- 数量：控件是真 <input type="number">，桌面可键盘输入、移动端唤起数字键盘 -->
          <div class="u-field product-quantity">
            <label class="u-field-label" for="product-quantity">数量</label>
            <div class="quantity-control">
              <button
                type="button"
                class="u-btn-secondary quantity-step"
                aria-label="减少数量"
                :disabled="quantity <= 1"
                @click="setQuantity(quantity - 1)"
              >
                −
              </button>
              <input
                id="product-quantity"
                v-model.number="quantity"
                class="u-input quantity-input"
                type="number"
                min="1"
                :max="maxQuantity"
                inputmode="numeric"
                @change="normalizeQuantity"
              />
              <button
                type="button"
                class="u-btn-secondary quantity-step"
                aria-label="增加数量"
                :disabled="quantity >= maxQuantity"
                @click="setQuantity(quantity + 1)"
              >
                +
              </button>
            </div>
            <span class="u-field-hint">
              库存 {{ product.stock_quantity }} 件，单笔最多 {{ maxQuantity }} 件
            </span>
          </div>

          <div class="page-actions product-actions">
            <button
              type="button"
              class="u-btn-primary"
              :disabled="isOut || busy"
              :aria-busy="busy"
              @click="handleAddToCart"
            >
              <span v-if="busy === 'cart'" class="u-spinner u-spinner--sm" aria-hidden="true"></span>
              <span>{{ isOut ? PRODUCT_GRID.soldOut : PRODUCT_GRID.addToCart }}</span>
            </button>
            <button
              type="button"
              class="u-btn-secondary"
              :disabled="isOut || busy"
              @click="handleBuyNow"
            >
              {{ PRODUCT_GRID.buyNow }}
            </button>
            <!-- 收藏：图标按钮 + aria-pressed 表达状态 -->
            <button
              type="button"
              class="u-icon-btn product-favorite"
              :class="{ active: isFavorited }"
              :aria-pressed="isFavorited"
              :aria-label="isFavorited ? `取消收藏 ${title}` : `收藏 ${title}`"
              @click="handleToggleFavorite"
            >
              <span aria-hidden="true">{{ isFavorited ? '❤️' : '🤍' }}</span>
            </button>
          </div>

          <p v-if="!userStore.isLoggedIn" class="page-note">
            加入购物车与下单需要登录账号；游客可以先浏览商品。
          </p>
        </div>
      </div>

      <!-- 描述：单独一块，长文本不挤压信息区 -->
      <section v-if="product.description" class="page-panel product-description">
        <h2 class="page-panel-head">商品详情</h2>
        <p class="product-description-text">{{ product.description }}</p>
      </section>

      <!-- 同类推荐：只取该分类下除自己以外的商品，空则不渲染整块 -->
      <section v-if="related.length" class="related">
        <h2 class="related-title">同类商品</h2>
        <ul class="related-grid">
          <li v-for="(item, index) in related" :key="item.id" class="related-cell">
            <ProductCard :product="item" :style="{ '--i': index }" @go-detail="goDetail" />
          </li>
        </ul>
      </section>
    </template>
  </div>
</template>

<script setup>
/**
 * 商品详情页
 *
 * 数据来自 `GET /shop/getProduct/:id`（公开接口，深链可直接打开）。
 * 服务端对已下架商品返回 404，因此这里不需要再判 `status` ——
 * 「不存在」与「已下架」对用户是同一件事：看不到这件商品。
 *
 * 与商品卡的分工：卡片只做「看」与「加购」，真正的数量选择与立即购买在这里。
 */
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import api from '@/api/index'
import ProductCard from '@/components/ProductCard.vue'
import { useShopStore } from '@/stores/shop'
import { useThemeStore } from '@/stores/theme'
import { useFavoriteStore } from '@/stores/favorite'
import { useUserStore } from '@/stores/user'
import { useProductActions } from '@/hooks/useProductActions'
import { notify } from '@/hooks/useToast/index.js'
import { formatUtils } from '@/utils/index.js'
import { PAGES, PRODUCT_GRID } from '@/constants/index.js'

const route = useRoute()
const router = useRouter()
const shopStore = useShopStore()
const themeStore = useThemeStore()
const favoriteStore = useFavoriteStore()
const userStore = useUserStore()
const { addToCart, buyNow, goDetail } = useProductActions()

const { shopClass } = storeToRefs(shopStore)

const product = ref(null)
const related = ref([])
const loading = ref(true)
const error = ref('')
const quantity = ref(1)
/** 进行中的动作（'cart' / 'buy' / null）—— 用来禁用按钮并显示内联 spinner */
const busy = ref(null)

const formatReviewCount = formatUtils.formatReviewCount

const title = computed(
  () => product.value?.main_title || product.value?.sub_title || '商品'
)
const subtitle = computed(() => product.value?.sub_title || '')

const currency = computed(() => ({
  prefix: themeStore.pricePrefix,
  decimals: themeStore.priceDecimals,
}))

const price = computed(() => formatUtils.splitPrice(product.value?.price, currency.value))
const originalPrice = computed(() =>
  formatUtils.splitPrice(product.value?.original_price, currency.value)
)

const showOriginal = computed(() => Boolean(product.value?.has_discount))

const isOut = computed(() => {
  const item = product.value
  if (!item) return false
  if (item.is_in_stock === false) return true
  return Number(item.stock_quantity) <= 0
})

/** 单笔最多 999 件（与服务端 cart_items 的 CHECK、orders 的数量上限一致） */
const maxQuantity = computed(() => {
  const stock = Number(product.value?.stock_quantity)
  if (!Number.isFinite(stock) || stock <= 0) return 1
  return Math.min(999, stock)
})

const isFavorited = computed(() =>
  product.value ? favoriteStore.isProductFavorited(product.value.id) : false
)

/** 所属分类：从已加载的分类树里找，找不到就不显示面包屑那一段 */
const category = computed(() => {
  const id = product.value?.category_id
  if (id === null || id === undefined) return null
  const found = (shopClass.value || []).find((item) => Number(item.id) === Number(id))
  return found || null
})

const normalizeQuantity = () => {
  const raw = Number(quantity.value)
  if (!Number.isFinite(raw) || raw < 1) quantity.value = 1
  else quantity.value = Math.min(Math.floor(raw), maxQuantity.value)
}

const setQuantity = (value) => {
  quantity.value = value
  normalizeQuantity()
}

const goBack = () => {
  if (window.history.length > 1) router.back()
  else router.push({ name: 'Hot' })
}

const handleAddToCart = async () => {
  if (busy.value) return
  busy.value = 'cart'
  try {
    await addToCart(product.value, quantity.value)
  } finally {
    busy.value = null
  }
}

const handleBuyNow = async () => {
  if (busy.value) return
  busy.value = 'buy'
  try {
    await buyNow(product.value, quantity.value)
  } finally {
    busy.value = null
  }
}

const handleToggleFavorite = async () => {
  if (!product.value) return
  const result = await favoriteStore.toggle('product', product.value.id)
  if (result.needLogin) {
    userStore.openLoginModal(PRODUCT_GRID.favoriteNeedLogin)
    return
  }
  if (result.success) notify.success(result.message)
  else notify.error(result.message)
}

/** 拉商品（含同类推荐）。推荐失败不影响主内容，因此单独吞掉 */
const load = async (id) => {
  loading.value = true
  error.value = ''
  product.value = null
  related.value = []
  quantity.value = 1

  try {
    const result = await api.getProduct(id)
    if (!result?.success || !result.data?.product) {
      error.value = result?.message || PRODUCT_GRID.detailMissing
      return
    }
    product.value = result.data.product

    // 同类商品：复用商品列表接口按 category_id 过滤，取 8 条后去掉自己
    const categoryId = product.value.category_id
    if (categoryId !== null && categoryId !== undefined) {
      const list = await api.getProducts({
        category_id: categoryId,
        status: 'all',
        in_stock: 'all',
        limit: 9,
        sort_by: 'sales_count',
        sort_order: 'desc',
      })
      const items = list?.data?.products || []
      related.value = items.filter((item) => Number(item.id) !== Number(product.value.id)).slice(0, 4)
    }
  } catch (err) {
    error.value = err?.status === 404
      ? PRODUCT_GRID.detailMissing
      : err?.message || PRODUCT_GRID.detailMissing
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  // 分类树用于面包屑；未加载时补一次，失败也不影响详情主体
  if (!shopClass.value.length) shopStore.getCategories()
  favoriteStore.load()
  load(route.params.id)
})

// 从「同类商品」跳到另一件商品时组件被复用，必须监听路由参数重新拉取，
// 否则页面会停在上一个商品的数据上
watch(() => route.params.id, (id) => {
  if (id) load(id)
})
</script>

<style scoped>
/*
 * 商品详情
 *
 * 外壳（容器宽度、标题带、面板、空态、动作行）来自 global.css 的 .page-shell /
 * .page-panel / .page-empty / .page-actions；这里只写详情页特有的两栏布局。
 */

.product-crumb {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: calc(var(--space-unit));
  margin-bottom: calc(var(--space-unit) * 2.5);
  font-size: var(--fs-sm);
  color: var(--text-muted);
}

.product-crumb a {
  color: var(--text-secondary);
  transition: color var(--transition-interactive);
}

.product-crumb a:hover {
  color: var(--accent);
}

/* 左媒体 / 右信息：桌面两栏，991 以下单栏 */
.product-layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  align-items: start;
  gap: var(--section-gap);
}

.product-media {
  position: relative;
  display: grid;
  place-items: center;
  margin: 0;
  overflow: hidden;
  background: var(--bg-surface-2);
  border: var(--stroke-width) solid var(--border);
  border-radius: var(--radius-card);
}

.product-media img {
  display: block;
  width: 100%;
  aspect-ratio: 4 / 3;
  object-fit: cover;
}

.product-media-placeholder {
  font-size: calc(var(--fs-display) * 2);
  line-height: 1;
  padding: calc(var(--space-unit) * 12) 0;
}

.product-flag {
  position: absolute;
  top: calc(var(--space-unit) * 1.5);
  left: calc(var(--space-unit) * 1.5);
}

.product-info {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: calc(var(--space-unit) * 1.5);
  min-width: 0;
}

.product-title {
  /* 详情页标题按内容换行，不套 --heading-transform 之外的额外处理 */
  overflow-wrap: anywhere;
}

.product-subtitle {
  margin: 0;
  font-size: var(--fs-body);
  color: var(--text-secondary);
}

.product-prices {
  display: flex;
  align-items: baseline;
  gap: calc(var(--space-unit) * 1.5);
  margin: calc(var(--space-unit)) 0 0;
}

/* 详情页的价格比卡片大一档（--fs-h2 而不是 --price-size），
 * 因为这里是决策页面，价格是主角 */
.product-prices .u-price {
  font-size: var(--fs-h2);
}

.product-stats {
  display: flex;
  flex-wrap: wrap;
  gap: calc(var(--space-unit) * 3);
  margin: 0;
}

.product-stat {
  display: flex;
  flex-direction: column-reverse;
  gap: calc(var(--space-unit) * 0.25);
}

.product-stat dt {
  font-size: var(--tag-font-size);
  letter-spacing: var(--tracking-label);
  color: var(--text-muted);
}

.product-stat dd {
  margin: 0;
  font-family: var(--font-mono);
  font-size: var(--fs-sm);
  font-weight: var(--fw-heading);
  color: var(--text-primary);
}

.product-stat dd.out {
  color: var(--danger);
}

.product-quantity {
  margin-top: calc(var(--space-unit));
}

.quantity-control {
  display: flex;
  align-items: center;
  gap: calc(var(--space-unit));
}

/* 加减按钮是方形图标按钮尺寸，因此宽度取 --icon-btn-size 而不是自适应 */
.quantity-step {
  width: var(--icon-btn-size);
  min-width: var(--icon-btn-size);
  padding: 0;
  font-size: var(--fs-h3);
  line-height: 1;
}

.quantity-input {
  width: calc(var(--space-unit) * 10);
  text-align: center;
  font-family: var(--font-mono);
}

/* 去掉 number 输入框的上下微调箭头：它会和两侧的加减按钮重复，且占用宽度 */
.quantity-input::-webkit-outer-spin-button,
.quantity-input::-webkit-inner-spin-button {
  margin: 0;
  appearance: none;
}

.product-actions {
  margin-top: calc(var(--space-unit) * 2);
}

.product-favorite {
  transition: transform var(--transition-interactive), border-color var(--transition-interactive);
}

.product-favorite.active {
  background: var(--accent-soft);
  border-color: var(--accent);
}

.product-fallback {
  justify-content: center;
  margin-top: calc(var(--space-unit) * 2.5);
}

.product-description {
  margin-top: var(--section-gap);
}

.product-description-text {
  margin: 0;
  font-size: var(--fs-body);
  line-height: var(--leading-body);
  color: var(--text-secondary);
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}

.related {
  margin-top: var(--section-gap);
}

.related-title {
  margin: 0 0 calc(var(--space-unit) * 2.5);
  font-family: var(--font-display);
  font-size: var(--fs-h3);
  font-weight: var(--fw-heading);
  letter-spacing: var(--tracking-display);
  text-transform: var(--heading-transform);
  color: var(--text-primary);
}

.related-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(var(--card-width), 1fr));
  gap: var(--grid-gap);
  margin: 0;
  padding: 0;
}

.related-cell {
  display: flex;
  min-width: 0;
}

/* ── 响应式：断点统一 1199 / 991 / 767 / 575 ────────────────── */
@media (max-width: 991px) {
  .product-layout {
    grid-template-columns: minmax(0, 1fr);
    gap: var(--section-gap);
  }
}

@media (max-width: 767px) {
  .product-layout {
    gap: calc(var(--section-gap) * var(--mobile-section-scale));
  }

  .product-description,
  .related {
    margin-top: calc(var(--section-gap) * var(--mobile-section-scale));
  }

  .related-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .product-media-placeholder {
    padding: calc(var(--space-unit) * 8) 0;
  }
}

@media (max-width: 575px) {
  .related-grid {
    grid-template-columns: minmax(0, 1fr);
  }

  .quantity-input {
    flex: 1;
    width: auto;
  }
}
</style>
