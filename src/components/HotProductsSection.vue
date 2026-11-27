<template>
  <section class="hot-section" :class="{ 'hot-section--board': isBoard }">
    <div class="section-inner">
      <!-- 榜单页的标题由页面开场的标题带承担，区块不再重复一遍 -->
      <SectionHeader v-if="!isBoard" v-bind="SECTIONS.hot" />

      <!-- 这里曾有一条「『关键词』共 N 件商品」的状态行。搜索改为
           `/search` 页的服务端查询后，本区块不再有任何关键词来源，
           该行永远不满足条件，故连样式一并删除。 -->

      <ul class="products-grid">
        <!-- 骨架屏：占位块与实际卡片的图文结构同高同形，避免加载完成时页面跳动 -->
        <template v-if="loading">
          <li
            v-for="n in SKELETON_COUNT"
            :key="`skeleton-${n}`"
            class="products-cell"
            :class="{ 'products-cell--featured': n === 1 }"
            aria-hidden="true"
          >
            <span class="products-skeleton u-skeleton"></span>
          </li>
          <li class="u-loading-block" role="status">
            <span class="u-spinner u-spinner--lg" aria-hidden="true"></span>
            <span>{{ PRODUCT_GRID.loading }}</span>
          </li>
        </template>

        <template v-else>
          <!-- 第一件商品放主推位：--card-width-lg 大卡 + 双列跨度 -->
          <li
            v-for="(product, index) in products"
            :key="product.id || index"
            class="products-cell"
            :class="{ 'products-cell--featured': index === 0 }"
          >
            <ProductCard
              :product="product"
              :featured="index === 0"
              :rank="isBoard ? index + 1 : 0"
              :style="{ '--i': index }"
              @go-detail="goDetail"
              @add-to-cart="addToCart"
            />
          </li>

          <!--
            错误态：图标 + 两行文案 + 「重新请求」文字按钮。

            为什么不只放一句红字：区块失败时它占满整行，是一块 100% 宽的空白面板，
            只写一行红字既没有视觉重心，也没有出口 —— 用户唯一的动作是刷新整页。
            文案、按钮与图标都排在一条基线上（窄屏改为竖向堆叠，见样式末尾）。
          -->
          <li v-if="error" class="products-note products-note--error" role="alert">
            <span class="products-note__icon">
              <AppIcon name="alert-triangle" />
            </span>
            <span class="products-note__body">
              <span class="products-note__title">{{ PRODUCT_GRID.errorPrefix }}{{ error }}</span>
              <span class="products-note__hint">{{ PRODUCT_GRID.errorHint }}</span>
            </span>
            <button
              type="button"
              class="products-note__retry"
              :disabled="loading"
              :aria-busy="loading"
              @click="retry"
            >
              <span v-if="loading" class="u-spinner u-spinner--sm" aria-hidden="true"></span>
              <AppIcon v-else name="refresh-cw" />
              <span>{{ loading ? PRODUCT_GRID.retrying : PRODUCT_GRID.retry }}</span>
            </button>
          </li>
          <li v-else-if="!products.length" class="products-note">
            {{ PRODUCT_GRID.empty }}
          </li>
        </template>
      </ul>
    </div>
  </section>
</template>

<script setup>
/**
 * 热门商品区块
 *
 * 列表来自 `shopStore.shopInfo`（首页/热卖榜展示的就是 store 里那一份）。
 * 这里**不做**任何关键词过滤 —— 搜索是 `/search` 页的服务端查询
 * （见 pages/SearchResults.vue）。曾经这里读过 `filteredProducts`，
 * 而导航栏把关键词写进同一个 store，导致「搜完再回首页，商品列表还是
 * 搜索后的结果」（用户报的 bug）。那个 getter 已随根因一并删除。
 *
 * 两个变体只差「要不要区块头」与「要不要上榜序号」，栅格完全一致：
 *   - `section`（默认，主页用）—— 带区块头；
 *   - `board`（榜单页用）—— 不带区块头，每张卡带上榜名次。
 */
import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useShopStore } from '@/stores/shop'
import AppIcon from '@/components/AppIcon.vue'
import ProductCard from '@/components/ProductCard.vue'
import SectionHeader from '@/components/SectionHeader.vue'
import { useProductActions } from '@/hooks/useProductActions'
import { PRODUCT_GRID, SECTIONS } from '@/constants/index.js'

const props = defineProps({
  /**
   * 区块变体：
   *   'section' 带区块头的常规区块（主页）
   *   'board'   榜单（无区块头 + 卡片序号）
   */
  variant: { type: String, default: 'section' },
})

const shopStore = useShopStore()
const { shopInfo, loading, error } = storeToRefs(shopStore)

// 「看详情」与「加入购物车」的完整逻辑（未登录时拉起登录弹窗等）在 composable 里，
// 与商品详情页、分类详情页共用同一份，避免三处各写一遍。
const { goDetail, addToCart } = useProductActions()

/** 加载态占位块数量：与桌面端一屏可见的列数一致 */
const SKELETON_COUNT = 4

const products = computed(() => shopInfo.value || [])
const isBoard = computed(() => props.variant === 'board')

/**
 * 重新请求。
 *
 * 复用 `shopStore.init()` 而不是只重取商品：`error` 是 categories 与 products
 * **共用**的一个字段，失败原因可能是分类接口而不是商品接口，只重取商品会让
 * 分类失败时按钮永远点不好。`init()` 会先把 `error` 清空、`loading` 置真，
 * 因此按钮本身也进入了「请求中…」的禁用态，无需在组件里另存一份 loading。
 */
const retry = () => {
  if (loading.value) return
  shopStore.init()
}
</script>

<style scoped>
/*
 * 热门商品区块
 *
 * 栅格按卡片宽度自动分列（--card-width 随风格变化：260 / 280 / 300），
 * 卡片外壳与图片区高度由 global.css 的 .ui-card / .ui-card-media 负责，
 * 这里只负责栅格；.u-skeleton 提供底色与 shimmer 动效。
 */
.hot-section {
  width: 100%;
  padding: calc(var(--section-gap) * 0.6) 0 var(--section-gap);
  background: transparent;
}

/* 榜单版：顶部留白由页面的标题带承担，区块只留一点呼吸位（底部不变，页脚前仍需留白） */
.hot-section--board {
  padding-top: calc(var(--section-gap) * 0.3);
}

.products-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(var(--card-width), 1fr));
  gap: var(--grid-gap);
  margin: 0;
  padding: 0;
}

/* 每个格子自己是一个 flex 容器：卡片高度撑满，主推位加宽时同行卡片不受影响 */
.products-cell {
  display: flex;
  min-width: 0;
}

/*
 * 主推位：**明暗两套主题都只跨一列**。
 *
 * 这里曾经有一条按主题分叉的规则 `:root[data-theme='bento-editorial']
 * .products-cell--featured { grid-column: span 2 }`，理由是「只有 bento 的规范
 * 定义了大卡片 400px」。那个 400px 已经随「尺寸统一」并入了 280px（见
 * EC 的尺寸令牌（assets/ec/tokens/semantic.css）），理由消失、规则却留着 —— 后果是真机实测出来的：
 * 1199px 与 991px 下九个商品从 3 行变 4 行，整页高比单一列时
 * 多 475px（4942 vs 4467），正是「切主题让窗口变大」。
 *
 * 现在跨两列反而会变成一张 620×200 的横幅：图片被拉成 3:1、正文留出大片空白。
 * 主题差异只能走令牌，不得在组件里按 data-theme 分叉 —— 这条由
 * test/themeContract.test.js 的「组件样式不得按主题分叉」守住。
 */
.products-cell--featured {
  grid-column: span 1;
}

/* 骨架屏：高度按「卡片内边距 ×2 + 图片区 + 正文留白」拼出来，与真实卡片同形 */
.products-skeleton {
  display: block;
  width: 100%;
  height: calc(
    var(--card-padding) * 2 + var(--card-image-height) + var(--space-unit) * 4
  );
}

/* 空态与错误态：上下留白仍走间距令牌，左右借用标签档内边距 */
.products-note {
  grid-column: 1 / -1;
  padding: calc(var(--space-unit) * 5) var(--tag-padding-x);
  font-size: var(--fs-body);
  text-align: center;
  color: var(--text-muted);
  background: var(--bg-surface-2);
  border: var(--stroke-width) solid var(--border);
  border-radius: var(--radius-card);
}

.products-note--error {
  /*
   * 排版：图标 | 文案 | 按钮 三段一条基线。
   *
   * 面板本身仍是整行（`grid-column: 1 / -1`，来自上面的基类），所以这里必须
   * 自己变成 flex —— 基类的 `text-align: center` 对三段式来说会把按钮挤到文字
   * 中间。左对齐 + 居中留白，读起来是一条「发生了什么 → 怎么办」的纵线。
   */
  display: flex;
  align-items: center;
  gap: calc(var(--space-unit) * 2);
  text-align: left;
  color: var(--danger);
  background: var(--danger-bg);
  border-color: var(--danger);
}

/* 图标：做成圆形徽标，给这块整幅面板一个视觉锚点（尺寸与字号同阶，靠 1em 缩放） */
.products-note__icon {
  display: inline-flex;
  flex: 0 0 auto;
  align-items: center;
  justify-content: center;
  width: calc(var(--space-unit) * 5);
  height: calc(var(--space-unit) * 5);
  font-size: var(--fs-h3);
  color: var(--danger);
  background: var(--bg-surface);
  border: var(--stroke-width) solid var(--danger);
  border-radius: var(--radius-pill);
}

/* 文案：主行是失败原因，副行是「怎么办」。两行之间只留半个间距单位，作为一个语义块 */
.products-note__body {
  display: flex;
  flex: 1 1 auto;
  flex-direction: column;
  gap: calc(var(--space-unit) * 0.5);
  min-width: 0;
}

.products-note__title {
  font-size: var(--fs-body);
  font-weight: var(--fw-label);
  line-height: var(--leading-title);
  /* 后端错误里可能带一长串英文/URL，允许在任意位置断行，避免撑破面板 */
  overflow-wrap: anywhere;
}

.products-note__hint {
  font-size: var(--fs-label);
  line-height: var(--leading-title);
  color: var(--text-muted);
}

/*
 * 「重新请求」是**文字按钮**（用户明确要求文字按钮，不是填充按钮）：
 * 无底色、无描边，靠强调色 + 下划线表明「这是可以点的」。
 * 高度不锁 md，和副行同一行高，避免面板被按钮撑高。
 */
.products-note__retry {
  display: inline-flex;
  flex: 0 0 auto;
  align-items: center;
  gap: calc(var(--space-unit) * 0.5);
  padding: calc(var(--space-unit) * 0.5) calc(var(--space-unit) * 0.75);
  font-family: var(--font-body);
  font-size: var(--fs-body);
  font-weight: var(--fw-label);
  line-height: var(--leading-title);
  color: var(--accent);
  text-decoration: underline;
  text-underline-offset: 3px;
  background: transparent;
  border: 0;
  border-radius: var(--radius-input);
  cursor: pointer;
  transition: color var(--ec-dur-fast) var(--ec-ease-out);
}

.products-note__retry:hover:not(:disabled) {
  color: var(--accent-strong);
}

.products-note__retry:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}

.products-note__retry:disabled {
  color: var(--disabled-text);
  text-decoration: none;
  cursor: progress;
}

/* ── 响应式：断点统一 1199 / 991 / 767 / 575 ────────────────── */
/* 移动端（规范第十四节）：区块留白 ×0.6、两侧内边距 ×0.8、商品卡片单列宽 100% */
@media (max-width: 767px) {
  .hot-section {
    padding: calc(var(--section-gap) * 0.5 * var(--mobile-section-scale)) 0
      calc(var(--section-gap) * 0.7 * var(--mobile-section-scale));
  }

  .hot-section--board {
    padding-top: calc(var(--section-gap) * 0.3 * var(--mobile-section-scale));
  }

  .section-inner {
    padding: 0 calc(var(--container-padding) * var(--mobile-padding-scale));
  }

  .products-grid {
    grid-template-columns: 1fr;
  }

  /* 单列时主推位不再跨列，否则会把栅格撑破 */
  .products-cell--featured {
    grid-column: span 1;
  }

  /*
   * 错误态在窄屏改为竖向堆叠：图标居顶、文案居中、按钮居中。
   * 横排在 375–430px 上会把主行挤成两三行、按钮掉到第二行且右缘参差，
   * 竖排是唯一能保证「一眼看到原因、一步点到重试」的排法。
   */
  .products-note--error {
    flex-direction: column;
    gap: calc(var(--space-unit) * 1.5);
    padding: calc(var(--space-unit) * 4) calc(var(--space-unit) * 2);
    text-align: center;
  }

  .products-note__body {
    align-items: center;
  }
}
</style>
