<template>
  <section class="hot-section">
    <div class="section-inner">
      <SectionHeader v-bind="SECTIONS.hot" />

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
              :style="{ '--i': index }"
              @go-detail="handleGoDetail"
              @buy="handleBuy"
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
 */
import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useShopStore } from '@/stores/shop'
import ProductCard from '@/components/ProductCard.vue'
import SectionHeader from '@/components/SectionHeader.vue'
import { PRODUCT_GRID, SECTIONS } from '@/constants/index.js'

const shopStore = useShopStore()
const { filteredProducts, searchKeyword, loading, error } = storeToRefs(shopStore)

/** 加载态占位块数量：与桌面端一屏可见的列数一致 */
const SKELETON_COUNT = 4

const products = computed(() => filteredProducts.value)
const keyword = computed(() => searchKeyword.value.trim())

// 详情页尚未实现，先记录并保留入口
const handleGoDetail = (product) => {
  console.info('查看商品详情（待实现）:', product.id || product.main_title)
}

// 下单流程尚未实现
const handleBuy = (product) => {
  console.info('发起购买（待实现）:', product.id || product.main_title)
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

.section-inner {
  max-width: var(--container-content);
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

/* 主推位：跨两列（bento 的 400px 大卡在这一档） */
.products-cell--featured {
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
}
</style>
