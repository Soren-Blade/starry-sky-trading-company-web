<template>
  <article
    class="ec-product product-card u-enter"
    :class="{ 'is-soldout': isOut }"
    role="link"
    tabindex="0"
    :aria-label="ariaLabel"
    @click="onGoDetail"
    @keydown.enter.self.prevent="onGoDetail"
    @keydown.space.self.prevent="onGoDetail"
  >
    <!-- 封面 16:10 由 .ec-product__cover 的 aspect-ratio 提供，这里不再写高度 -->
    <div class="ec-product__cover">
      <SmartImage
        :src="product.main_image_url || product.image"
        :alt="title"
        fallback-icon="shopping-bag"
      />
      <span v-if="isOut" class="ec-product__flag">{{ PRODUCT_GRID.soldOut }}</span>
      <span v-else-if="discountPercent > 0" class="ec-product__flag ec-product__flag--hot">
        -{{ discountPercent }}%
      </span>
      <span v-if="rank > 0" class="product-card__rank" aria-hidden="true">{{ rank }}</span>
    </div>

    <div class="ec-product__body">
      <!--
        形态角标（虚拟商品 / 实物 / 服务 / 账号）：放在标题前的元信息行，
        不去封面左上角与「缺货 / 折扣」角标抢位置。`goods_type` 缺失或非法时
        这里整块不渲染 —— 不猜成 digital，见 utils/goodsType.js。
      -->
      <span
        v-if="goodsTypeTag"
        class="ec-tag ec-tag--sm ec-tag--outline product-card__type"
      >
        {{ goodsTypeTag }}
      </span>

      <h3 class="ec-product__title" :title="title">{{ title }}</h3>
      <p v-if="subtitle" class="product-card__sub" :title="subtitle">{{ subtitle }}</p>

      <!-- 三段式价格：符号 / 整数 / 小数各自成节点，小数单独小一号（.ec-price--md） -->
      <span class="ec-price ec-price--md">
        <span class="ec-price__main">
          <span class="ec-price__sym">{{ price.prefix }}</span>
          <span class="ec-price__int">{{ price.integer }}</span>
          <span v-if="price.decimals" class="ec-price__dec">.{{ price.decimals }}</span>
        </span>
        <s v-if="showOriginal" class="ec-price__origin">{{ originalPrice.text }}</s>
      </span>

      <!-- 销量 / 浏览 / 库存：沿用既有字段，不新增后端未下发的「评分」 -->
      <div class="ec-product__meta product-card__meta">
        <span>{{ PRODUCT_GRID.viewsLabel }} {{ formatReviewCount(views) }}</span>
        <span aria-hidden="true">·</span>
        <span>{{ PRODUCT_GRID.salesLabel }} {{ formatReviewCount(sales) }}</span>
        <span aria-hidden="true">·</span>
        <span>{{ stockLabel }} {{ stockQuantity }}</span>
      </div>

      <!--
        刻意偏离 EC Design System：EC 把收藏按钮 `.ec-product__fav` 绝对定位在
        封面右上角，且默认 opacity:0、hover 才出现。产品需求要求收藏、加入购物车、
        立即购买三个动作在卡片底部同一行**始终可见**，所以把收藏移到 CTA 行首，
        并给 `.ec-product__cta` 加 flex。这里不用 `.ec-product__fav` 是因为它的
        定位/淡入语义只适用于封面角标；改用视觉体系内的 `.ec-icon-btn`。
        这是有意为之的偏离，不是漏用设计系统类。
      -->
      <!--
        立即购买沿用既有 `go-detail` 契约：网格卡没有数量/金额确认，
        详情页才是下单确认步骤（不在卡里直接创建订单）。
      -->
      <div class="ec-product__cta">
        <button
          type="button"
          class="ec-icon-btn product-card__icon"
          :class="{ 'is-active': isFavorited }"
          :aria-pressed="isFavorited"
          :aria-label="isFavorited ? `取消收藏 ${title}` : `收藏 ${title}`"
          :disabled="favoriteBusy"
          @click.stop="onToggleFavorite"
        >
          <AppIcon name="heart" :filled="isFavorited" />
        </button>

        <!-- 售罄时仍保留按钮但禁用：隐藏会让行内只剩两个控件，也失去「为什么不能买」的提示 -->
        <button
          v-if="!isOut"
          type="button"
          class="ec-icon-btn product-card__icon"
          :aria-label="PRODUCT_GRID.addToCart"
          :title="PRODUCT_GRID.addToCart"
          @click.stop="onBuy"
        >
          <AppIcon name="shopping-cart" />
        </button>
        <button
          v-else
          type="button"
          class="ec-icon-btn product-card__icon"
          disabled
          aria-label="已售罄，不可加入购物车"
        >
          <AppIcon name="shopping-cart" />
        </button>

        <button
          v-if="!isOut"
          type="button"
          class="ec-btn ec-btn--primary ec-btn--block product-card__buy"
          @click.stop="onGoDetail"
        >
          {{ PRODUCT_GRID.buyNow }}
        </button>
        <button
          v-else
          type="button"
          class="ec-btn ec-btn--outline ec-btn--block product-card__buy"
          @click.stop="onGoDetail"
        >
          {{ RESTOCK_CTA }}
        </button>
      </div>
    </div>
  </article>
</template>

<script setup>
/**
 * 商品卡
 *
 * 标记已切到 EC Design System 的 `.ec-product` 结构（封面 / 角标 / 两行标题 /
 * 三段式价格 / meta / CTA），视觉全部来自 `src/assets/ec/ec-business.css`。
 * 本组件只补几处 EC ProductCard 没有的业务差异：
 *
 *   1. 收藏按钮按产品要求从封面右上角移到 CTA 行首，与加入购物车图标、
 *      主按钮同一行（模板与样式中都有「刻意偏离」注释）；
 *   2. 副标题与榜单序号（EC 卡没有这两层）；
 *   3. 卡片在栅格里要撑满单元格高度。
 *
 * 交互契约保持不变：`go-detail` / `add-to-cart` 两个 emit 原样保留，
 * 加购仍由调用方经 `useProductActions()` 走 cart store —— 登录 / 游客分支
 * 不在卡片里重写。收藏直接复用 favorite store 的 toggle，与商品详情页
 * 同一套逻辑（needLogin 时拉起登录弹窗）。
 */
import { computed, ref } from 'vue'
import SmartImage from '@/components/SmartImage.vue'
import AppIcon from '@/components/AppIcon.vue'
import { useThemeStore } from '@/stores/theme'
import { useFavoriteStore } from '@/stores/favorite'
import { useUserStore } from '@/stores/user'
import { notify } from '@/hooks/useToast/index.js'
import { PRODUCT_GRID } from '@/constants/index.js'
import { formatUtils } from '@/utils/index.js'
import { goodsTypeLabel } from '@/utils/goodsType.js'

const props = defineProps({
  /** 商品对象；字段与后端 `products` 下发保持一致 */
  product: { type: Object, required: true },
  /**
   * 主推位标记。当前栅格宽度已统一（见 HotProductsSection 的说明），
   * 尺寸不再由卡片自己分叉；保留 prop 以兼容既有调用方。
   */
  featured: { type: Boolean, default: false },
  /** 榜单名次：>0 时在封面右上角显示序号 */
  rank: { type: Number, default: 0 },
})

const emit = defineEmits(['go-detail', 'add-to-cart'])

const themeStore = useThemeStore()
const favoriteStore = useFavoriteStore()
const userStore = useUserStore()

const formatReviewCount = formatUtils.formatReviewCount

const currency = computed(() => ({
  prefix: themeStore.pricePrefix,
  decimals: themeStore.priceDecimals,
}))

const title = computed(
  () => props.product.main_title || props.product.name || props.product.product_name || '商品'
)

const ariaLabel = computed(() =>
  props.rank > 0
    ? `查看商品 ${title.value}（榜单第 ${props.rank} 名）`
    : `查看商品 ${title.value}`
)

const subtitle = computed(
  () =>
    props.product.sub_title ||
    props.product.author ||
    props.product.seller ||
    PRODUCT_GRID.defaultSeller
)

/** 形态角标：合法值才有文案；缺失/非法返回空串，模板整块不渲染 */
const goodsTypeTag = computed(() => goodsTypeLabel(props.product.goods_type))

const price = computed(() => formatUtils.splitPrice(props.product.price, currency.value))

const discountPercent = computed(() => {
  const value = Number(props.product.discount_percent)
  return value > 0 ? Math.round(value) : 0
})

/** 有折扣标记，或原价确实高于现价时才展示划线原价 */
const showOriginal = computed(
  () =>
    props.product.has_discount === true ||
    Number(props.product.original_price) > Number(props.product.price)
)

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

/**
 * 售罄判定沿用改造前的优先级：
 * 明确的 stock_quantity 最可信；缺失时再看 is_in_stock 布尔值。
 */
const isOut = computed(() => {
  const raw = props.product.stock_quantity ?? props.product.stock ?? null
  if (raw === null || raw === undefined || raw === '') return false
  const value = Number(raw)
  if (Number.isFinite(value)) {
    if (value === 0) return true
    if (value > 0) return false
  }
  return typeof props.product.is_in_stock === 'boolean' ? !props.product.is_in_stock : false
})

const stockLabel = computed(() => props.product.stock_status?.message || PRODUCT_GRID.stockLabel)

const isFavorited = computed(() => favoriteStore.isProductFavorited(props.product?.id))
const favoriteBusy = ref(false)

/** 「到货提醒」在 PRODUCT_GRID 里没有对应文案，且目前只有商品卡用，就地定义 */
const RESTOCK_CTA = '到货提醒'

function onGoDetail() {
  emit('go-detail', props.product)
}

function onBuy() {
  // 设计系统反模式：售罄仍可加购。按钮虽已禁用，这里再兜一层
  if (isOut.value) return
  emit('add-to-cart', props.product)
}

async function onToggleFavorite() {
  const id = Number(props.product?.id)
  if (!Number.isFinite(id) || favoriteBusy.value) return

  favoriteBusy.value = true
  try {
    const result = await favoriteStore.toggle('product', id)
    if (result.needLogin) {
      userStore.openLoginModal(PRODUCT_GRID.favoriteNeedLogin)
      return
    }
    if (result.success) notify.success(result.message)
    else notify.error(result.message)
  } finally {
    favoriteBusy.value = false
  }
}
</script>

<style scoped>
/*
 * 卡片只补 EC ProductCard 没有的几件事：撑满栅格单元格、副标题、榜单序号，
 * 以及下方注明的 CTA 行布局（刻意偏离）。
 * 颜色 / 间距 / 圆角全部走 --ec-* 令牌，不出现任何色值。
 */
.product-card {
  height: 100%;
}

/* EC 的 ProductCard 没有副标题层；保留项目既有字段（作者 / 卖家 / 默认店铺） */
.product-card__sub {
  margin: 0;
  overflow: hidden;
  font-size: var(--ec-caption-size);
  line-height: var(--ec-caption-lh);
  color: var(--ec-text-tertiary);
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* 形态角标：`.ec-product__body` 是 flex 列，默认会把子项横向拉伸，
 * 短标签因此需要显式靠左，与标题左对齐 */
.product-card__type {
  align-self: flex-start;
}

/* 榜单序号：封面右上角，与左上角角标对称 */
.product-card__rank {
  position: absolute;
  inset-block-start: var(--ec-space-2);
  inset-inline-end: var(--ec-space-2);
  z-index: 1;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 24px;
  height: 24px;
  padding-inline: var(--ec-space-1);
  border-radius: var(--ec-radius-full);
  background: var(--ec-action-primary);
  color: var(--ec-text-on-action);
  font-size: var(--ec-micro-size);
  font-weight: 600;
  box-shadow: var(--ec-shadow-sm);
}

.product-card__meta {
  flex-wrap: wrap;
  row-gap: var(--ec-space-1);
}

/*
 * 刻意偏离 EC Design System：EC 把 `.ec-product__fav` 绝对定位在封面右上角，
 * 且默认 opacity:0、hover 才出现。产品需求要求收藏 / 加购 / 主按钮在卡内
 * 同一行始终可见，所以给 `.ec-product__cta` 加 flex，收藏改用 `.ec-icon-btn`
 * 放在行首（模板里有同样说明）。不要把它改回 `.ec-product__fav`。
 */
.ec-product__cta {
  display: flex;
  align-items: center;
  gap: var(--ec-space-2);
  margin-block-start: var(--ec-space-2);
}

/* 图标按钮固定宽度；AppIcon 的 1em 取 EC 的按钮图标尺寸 */
.product-card__icon {
  flex: none;
  font-size: var(--ec-button-icon-size);
}

/* 收藏激活沿用 EC `.ec-product__fav[aria-pressed="true"]` 的 danger 语义色 */
.product-card__icon.is-active {
  color: var(--ec-danger-text);
  background: var(--ec-danger-soft);
}

/* 主按钮吃掉行内剩余宽度，窄卡下也不会把两个图标挤走 */
.product-card__buy {
  flex: 1;
  min-width: 0;
}
</style>
