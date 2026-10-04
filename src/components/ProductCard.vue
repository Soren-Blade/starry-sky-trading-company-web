<template>
  <div
    class="product-card ui-card ui-card-interactive u-enter"
    role="link"
    tabindex="0"
    :aria-label="`查看商品 ${title}`"
    @click="onGoDetail"
    @keydown.enter.prevent="onGoDetail"
    @keydown.space.prevent="onGoDetail"
  >
    <div class="ui-card-media">
      <img :src="product.main_image_url || product.image" :alt="title" />
      <span v-if="isOut" class="product-flag">{{ PRODUCT_GRID.soldOut }}</span>
    </div>

    <div class="ui-card-body">
      <div class="product-head">
        <h3 class="product-title" :title="title">{{ title }}</h3>
        <span class="product-price">{{ priceText }}</span>
      </div>

      <p class="product-sub" :title="subtitle">{{ subtitle }}</p>

      <dl class="product-meta">
        <div class="product-stat">
          <dt class="product-stat-label">{{ PRODUCT_GRID.viewsLabel }}</dt>
          <dd class="product-stat-value">{{ formatReviewCount(views) }}</dd>
        </div>
        <div class="product-stat">
          <dt class="product-stat-label">{{ PRODUCT_GRID.salesLabel }}</dt>
          <dd class="product-stat-value">{{ formatReviewCount(sales) }}</dd>
        </div>
        <div class="product-stat">
          <dt class="product-stat-label">{{ stockLabel }}</dt>
          <dd class="product-stat-value" :class="{ out: isOut }">{{ stockQuantity }}</dd>
        </div>
      </dl>

      <div class="product-foot">
        <button
          type="button"
          class="u-cta product-buy"
          :disabled="isOut"
          :aria-label="isOut ? '该商品缺货' : `购买 ${title}`"
          @click.stop="onBuy"
        >
          {{ isOut ? PRODUCT_GRID.soldOut : PRODUCT_GRID.buy }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
/**
 * 商品卡
 *
 * 外壳来自 global.css 的 `.ui-card` / `.ui-card-media` / `.ui-card-body`，
 * 价格与货币符号来自主题（`useThemeStore().pricePrefix`）——
 * technical-monochrome 用 `$`，其余用 `¥`。这是「文字/排版变动要同步数据层」
 * 的落点：货币不再写死在格式化函数里。
 */
import { computed } from 'vue'
import { formatUtils } from '@/utils/index.js'
import { PRODUCT_GRID } from '@/constants/index.js'
import { useThemeStore } from '@/stores/theme'

const props = defineProps({
  product: { type: Object, required: true },
})
const emit = defineEmits(['go-detail', 'buy'])

const themeStore = useThemeStore()

const formatReviewCount = formatUtils.formatReviewCount

const title = computed(
  () => props.product.main_title || props.product.name || props.product.product_name || '商品'
)

const subtitle = computed(
  () =>
    props.product.sub_title ||
    props.product.author ||
    props.product.seller ||
    PRODUCT_GRID.defaultSeller
)

const priceText = computed(() =>
  formatUtils.formatPrice(props.product.price, {
    prefix: themeStore.pricePrefix,
    decimals: themeStore.priceDecimals,
  })
)

const views = computed(
  () =>
    props.product.viewCount ??
    props.product.reviewCount ??
    props.product.view_count ??
    0
)

const sales = computed(
  () => props.product.sales_count ?? props.product.sales ?? props.product.sold ?? 0
)

const stockQuantity = computed(() => props.product.stock_quantity ?? 0)

const isOut = computed(() => {
  const raw = props.product.stock_quantity ?? props.product.stock ?? null
  if (raw == null) return false
  const n = Number(raw)
  if (!Number.isFinite(n)) return false
  if (n === 0) return true
  if (n > 0) return false
  if (typeof props.product.is_in_stock === 'boolean') return !props.product.is_in_stock
  return false
})

// stock_status 由后端计算，缺失时兜底，避免模板直接取 .message 抛错
const stockLabel = computed(() => props.product.stock_status?.message || PRODUCT_GRID.stockLabel)

const onGoDetail = () => emit('go-detail', props.product)
const onBuy = () => emit('buy', props.product)
</script>

<style scoped>
.product-card {
  height: 100%;
}

.product-flag {
  position: absolute;
  top: calc(var(--space-unit) * 1.5);
  left: calc(var(--space-unit) * 1.5);
  padding: calc(var(--space-unit) * 0.5) calc(var(--space-unit));
  font-size: var(--fs-label);
  font-weight: var(--fw-label);
  letter-spacing: var(--tracking-label);
  text-transform: var(--label-transform);
  color: var(--danger);
  background: var(--danger-bg);
  border: 1px solid var(--danger);
  border-radius: var(--radius-chip);
}

.product-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: calc(var(--space-unit) * 1.5);
}

.product-title {
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

/* 价格：等宽字体强化数据感；mono 主题还带代码块底色 */
.product-price {
  flex-shrink: 0;
  padding: calc(var(--space-unit) * 0.25) calc(var(--space-unit) * 0.75);
  font-family: var(--font-price);
  font-size: var(--fs-price);
  font-weight: var(--fw-price);
  line-height: 1.2;
  color: var(--price-color);
  background: var(--price-bg);
  border-radius: var(--radius-chip);
}

.product-sub {
  font-size: var(--fs-label);
  color: var(--text-muted);
  margin: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.product-meta {
  display: flex;
  gap: calc(var(--space-unit) * 2);
  margin: 0;
}

.product-stat {
  display: flex;
  flex-direction: column-reverse;
  gap: calc(var(--space-unit) * 0.25);
  min-width: 0;
}

.product-stat-label {
  font-size: var(--fs-label);
  letter-spacing: var(--tracking-label);
  color: var(--text-muted);
}

.product-stat-value {
  margin: 0;
  font-family: var(--font-mono);
  font-size: var(--fs-sm);
  font-weight: var(--fw-heading);
  color: var(--text-primary);
}

.product-stat-value.out {
  color: var(--danger);
}

.product-foot {
  display: flex;
  justify-content: flex-end;
  margin-top: auto;
}

.product-buy {
  min-width: calc(var(--space-unit) * 9);
}

@media (max-width: 575px) {
  .product-head {
    flex-direction: column;
    align-items: flex-start;
    gap: calc(var(--space-unit) * 0.5);
  }

  .product-foot {
    justify-content: flex-start;
  }

  .product-buy {
    width: 100%;
  }
}
</style>
