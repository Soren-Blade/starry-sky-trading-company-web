<template>
  <section class="hot-products-section">
    <div class="section-container">
      <!-- 区块头部（共享组件，样式在 global.css） -->
      <SectionHeader
        icon="🔥"
        title="热门商品"
        description="精选热销商品，享受优质生活"
      />

      <!-- 商品网格 -->
      <div class="products-grid">
        <ProductCard
          v-for="(product, idx) in shopInfo"
          :key="product.id || idx"
          :product="product"
          @go-detail="handleGoDetail"
          @buy="handleBuy"
        />
        <div v-if="shopStore.loading" class="empty-note">正在加载商品…</div>
        <div v-else-if="shopStore.error" class="empty-note error">
          商品加载失败：{{ shopStore.error }}
        </div>
        <div v-else-if="!shopInfo.length" class="empty-note">暂无商品可展示</div>
      </div>
    </div>
  </section>
</template>

<script setup>
import { storeToRefs } from 'pinia'
import { useShopStore } from '@/stores/shop'
import ProductCard from '@/components/ProductCard.vue'
import SectionHeader from '@/components/SectionHeader.vue'

const shopStore = useShopStore()
const { shopInfo } = storeToRefs(shopStore)

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
.hot-products-section {
  position: relative;
  width: 100%;
  background: var(--color-page-bg);
}

.section-container {
  max-width: var(--container-content);
  margin: 0 auto;
  padding: 0 var(--container-padding);
}

.products-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 24px;
  margin-bottom: 60px;
}

.empty-note {
  grid-column: 1 / -1;
  text-align: center;
  color: #888;
  padding: 28px 12px;
  background: rgba(250, 250, 250, 0.7);
  border-radius: var(--radius-md);
}

.empty-note.error {
  color: var(--color-danger);
  background: var(--color-danger-bg);
}

@media (max-width: 1199px) {
  .products-grid {
    grid-template-columns: repeat(3, 1fr);
  }
}

@media (max-width: 767px) {
  .products-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 575px) {
  .products-grid {
    grid-template-columns: 1fr;
  }
}
</style>
