<template>
  <div
    class="product-card ui-card u-enter"
    :class="{ 'ui-card--lg': featured }"
    role="link"
    tabindex="0"
    :aria-label="`查看商品 ${title}`"
    @click="onGoDetail"
    @keydown.enter.prevent="onGoDetail"
    @keydown.space.prevent="onGoDetail"
  >
    <div class="ui-card-media">
      <img :src="product.main_image_url || product.image" :alt="title" />
      <!-- 缺货标记：语义色 10% 底 + 语义色文字（规范第八节的颜色变体） -->
      <span v-if="isOut" class="u-tag u-tag--danger product-flag">
        {{ PRODUCT_GRID.soldOut }}
      </span>
      <!-- 折扣标签：accent 底 + 反白字 -->
      <span v-else-if="discountPercent > 0" class="u-discount product-flag">
        -{{ discountPercent }}%
      </span>
    </div>

    <div class="ui-card-body">
      <h3 class="ui-card-title" :title="title">{{ title }}</h3>
      <p class="ui-card-sub" :title="subtitle">{{ subtitle }}</p>

      <p class="product-prices">
        <!-- 价格：整数 + 小数分开渲染，小数「小一号」；无小数的风格只出整数 -->
        <span class="u-price">
          <span>{{ price.prefix }}{{ price.integer }}</span>
          <span v-if="price.decimals" class="u-price-decimals">.{{ price.decimals }}</span>
        </span>
        <!-- 划线原价：字号小 2px、弱化 + line-through -->
        <span v-if="showOriginal" class="u-price-original">{{ originalPrice.text }}</span>
      </p>

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
          class="u-btn-primary product-buy"
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
 * 外壳（宽度/内边距/圆角/边框/图片高度与圆角）来自 global.css 的
 * `.ui-card` / `.ui-card--lg` / `.ui-card-media`，尺寸随五套风格切换：
 * 280px/20px/12px 的极简卡、300px/24px/20px 的玻璃卡、bento 的 400px 大卡、
 * 260px/16px/4px 的等宽卡。
 *
 * 货币与小数位由**主题**决定（`price.decimals`：bento/neo/mono 无小数，
 * mono 用 `$` 前缀）—— 这是「排版变动要同步数据层」的落点：
 * 货币不再是格式化函数里的常量，价格也不再是一个拼好的字符串。
 */
import { computed } from 'vue'
import { formatUtils } from '@/utils/index.js'
import { PRODUCT_GRID } from '@/constants/index.js'
import { useThemeStore } from '@/stores/theme'

const props = defineProps({
  product: { type: Object, required: true },
  /** bento 的主推位用大卡片（400px / 28px 内边距 / 280px 图片） */
  featured: { type: Boolean, default: false },
})
const emit = defineEmits(['go-detail', 'buy'])

const themeStore = useThemeStore()

const formatReviewCount = formatUtils.formatReviewCount

const currency = computed(() => ({
  prefix: themeStore.pricePrefix,
  decimals: themeStore.priceDecimals,
}))

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

const price = computed(() => formatUtils.splitPrice(props.product.price, currency.value))

/** 后端已给出 has_discount / discount_percent，直接消费，不在前端重算 */
const discountPercent = computed(() => {
  const percent = Number(props.product.discount_percent)
  return Number.isFinite(percent) && percent > 0 ? Math.round(percent) : 0
})

const showOriginal = computed(() => {
  if (props.product.has_discount === true) return true
  const original = Number(props.product.original_price)
  const current = Number(props.product.price)
  return Number.isFinite(original) && Number.isFinite(current) && original > current
})

const originalPrice = computed(() =>
  formatUtils.splitPrice(props.product.original_price, currency.value)
)

const views = computed(
  () => props.product.viewCount ?? props.product.reviewCount ?? props.product.view_count ?? 0
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
}

.product-prices {
  display: flex;
  align-items: baseline;
  gap: calc(var(--space-unit));
  margin: 0;
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
  font-size: var(--tag-font-size);
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
  .product-foot {
    justify-content: flex-start;
  }

  .product-buy {
    width: 100%;
  }
}
</style>
