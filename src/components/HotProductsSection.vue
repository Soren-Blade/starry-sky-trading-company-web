<template>
  <section class="hot-section">
    <div class="section-inner">
      <SectionHeader v-bind="SECTIONS.hot" />

      <!-- 搜索状态：有关键词时告知用户过滤结果数量，避免「商品怎么变少了」的困惑 -->
      <p v-if="keyword" class="hot-status" role="status">
        「{{ keyword }}」共 {{ products.length }} 件商品
      </p>

      <div class="products-grid">
        <ProductCard
          v-for="(product, index) in products"
          :key="product.id || index"
          :product="product"
          :style="{ '--i': index }"
          @go-detail="handleGoDetail"
          @buy="handleBuy"
        />

        <p v-if="loading" class="grid-note">{{ PRODUCT_GRID.loading }}</p>
        <p v-else-if="error" class="grid-note error" role="alert">
          {{ PRODUCT_GRID.errorPrefix }}{{ error }}
        </p>
        <p v-else-if="!products.length" class="grid-note">
          {{ keyword ? PRODUCT_GRID.searchEmpty(keyword) : PRODUCT_GRID.empty }}
        </p>
      </div>
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
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: var(--grid-gap);
}

.grid-note {
  grid-column: 1 / -1;
  padding: calc(var(--space-unit) * 5) calc(var(--space-unit) * 2);
  font-size: var(--fs-body);
  text-align: center;
  color: var(--text-muted);
  background: var(--bg-surface-2);
  border: 1px solid var(--border);
  border-radius: var(--radius-card);
}

.grid-note.error {
  color: var(--danger);
  background: var(--danger-bg);
  border-color: var(--danger);
}

/* ── 响应式 ─────────────────────────────────────────────── */
@media (max-width: 1199px) {
  .products-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

@media (max-width: 991px) {
  .products-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 767px) {
  .hot-section {
    padding: calc(var(--section-gap) * 0.5) 0 calc(var(--section-gap) * 0.7);
  }

  .section-inner {
    padding: 0 16px;
  }
}

@media (max-width: 575px) {
  .products-grid {
    grid-template-columns: 1fr;
  }
}
</style>
