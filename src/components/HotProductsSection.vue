<template>
  <section class="hot-section" :class="{ 'hot-section--board': isBoard }">
    <div class="section-inner">
      <!-- 榜单页的标题由页面开场的标题带承担，区块不再重复一遍 -->
      <SectionHeader v-if="!isBoard" v-bind="SECTIONS.hot" />

      <!-- 搜索状态：有关键词时告知用户过滤结果数量，避免「商品怎么变少了」的困惑 -->
      <p v-if="keyword" class="hot-status" role="status">
        「{{ keyword }}」共 {{ products.length }} 件商品
      </p>

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
          <li class="u-loading-block">
            <span class="u-spinner u-spinner--lg" aria-hidden="true"></span>
            <span>{{ PRODUCT_GRID.loading }}</span>
          </li>
        </template>

        <template v-else>
          <!-- 第一件商品放主推位：bento 的 400px 大卡 + 双列跨度 -->
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

          <li v-if="error" class="products-note products-note--error" role="alert">
            {{ PRODUCT_GRID.errorPrefix }}{{ error }}
          </li>
          <li v-else-if="!products.length" class="products-note">
            {{ keyword ? PRODUCT_GRID.searchEmpty(keyword) : PRODUCT_GRID.empty }}
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
 * 列表来自 `shopStore.filteredProducts`（数据层负责搜索匹配），
 * 组件不再自己写一份 filter —— 搜索栏在导航栏里，两处必须用同一套规则。
 *
 * 两个变体只差「要不要区块头」与「要不要上榜序号」，栅格完全一致：
 *   - `section`（默认，主页用）—— 带区块头；
 *   - `board`（榜单页用）—— 不带区块头，每张卡带上榜名次。
 */
import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useShopStore } from '@/stores/shop'
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
const { filteredProducts, searchKeyword, loading, error } = storeToRefs(shopStore)

// 「看详情」与「加入购物车」的完整逻辑（未登录时拉起登录弹窗等）在 composable 里，
// 与商品详情页、分类详情页共用同一份，避免三处各写一遍。
const { goDetail, addToCart } = useProductActions()

/** 加载态占位块数量：与桌面端一屏可见的列数一致 */
const SKELETON_COUNT = 4

const products = computed(() => filteredProducts.value)
const keyword = computed(() => searchKeyword.value.trim())
const isBoard = computed(() => props.variant === 'board')
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

.section-inner {
  max-width: var(--container-max);
  margin: 0 auto;
  padding: 0 var(--container-padding);
}

.hot-status {
  margin: 0 0 calc(var(--space-unit) * 2.5);
  font-family: var(--font-mono);
  font-size: var(--fs-sm);
  color: var(--accent);
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

/* 主推位：只有 bento 的规范定义了「大卡片 400px」，因此只有该主题跨两列。
 * 其余主题跨两列会变成一张 620×200 的横幅：图片被拉成 3:1、正文留出大片空白
 * （1440px 截图已确认）。 */
.products-cell--featured {
  grid-column: span 1;
}

:root[data-theme='bento-editorial'] .products-cell--featured {
  grid-column: span 2;
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
  color: var(--danger);
  background: var(--danger-bg);
  border-color: var(--danger);
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

  /* 单列时主推位不再跨列，否则会把栅格撑破。
   * 必须连 bento 的高特异性选择器一起覆盖，否则会盖不住上面那条 :root[...] 规则。 */
  .products-cell--featured,
  :root[data-theme='bento-editorial'] .products-cell--featured {
    grid-column: span 1;
  }
}
</style>
