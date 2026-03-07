<template>
  <section class="hot-products-section">
    <div class="section-container">
      <!-- 区块头部 -->
      <div class="section-header">
        <h2 class="section-title">
          <span class="title-icon">🔥</span>
          热门商品
        </h2>
        <p class="section-description">精选热销商品，享受优质生活</p>
      </div>

      <!-- 商品网格 -->
      <div class="products-grid">
        <ProductCard
          v-for="(product, idx) in shopInfo"
          :key="product.id || idx"
          :product="product"
          @go-detail="handleGoDetail"
          @buy="handleBuy"
        />
        <div v-if="shopInfo.length === 0" class="empty-note">
          暂无商品可展示
        </div>
      </div>
    </div>
  </section>
</template>

<script setup>
import { storeToRefs } from "pinia";
import { useShopStore } from "@/stores/shop";
import ProductCard from "@/components/ProductCard.vue";

// 绑定后端 store（优先），否则回退到常量示例数据
const shopStore = useShopStore();
const { shopInfo } = storeToRefs(shopStore);

// 点击卡片查看详情（示例函数 — 仅示例，不做真实跳转）
const handleGoDetail = (product) => {
  console.log(
    "Navigate to detail (示例):",
    product.id || product.main_title || product.name
  );
};

// 购买示例函数（示例：触发购买流程或打开下单模态）
const handleBuy = (product) => {
  console.log(
    "Purchase triggered (示例):",
    product.id || product.main_title || product.name
  );
  // 示例：可以集成购物车 store 或直接调用后端接口
};
</script>

<style scoped>
/* 按附件设计的卡片样式 */
.hot-products-section {
  position: relative;
  width: 100%;
  /* padding: 56px 0; */
  background: linear-gradient(180deg, #f8f9fa 0%, #f1f2f4 100%);
}
.section-container {
  max-width: 1280px;
  margin: 0 auto;
  padding: 0 20px;
}
.section-header {
  text-align: center;
  margin-bottom: 80px;
  animation: fadeInUp 0.6s ease-out;
}
.section-title {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  font-size: 48px;
  font-weight: 800;
  margin-bottom: 16px;
  letter-spacing: -1px;
}

.title-icon {
  display: inline-block;
  font-size: 48px;
  animation: float 3s ease-in-out infinite;
}

.section-description {
  font-size: 18px;
  color: #666;
  margin: 0;
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
  border-radius: 10px;
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
  .section-title {
    font-size: 22px;
  }
  .fp-head-row {
    /* flex-direction: column; */
    align-items: flex-start;
  }
  .fp-price {
    align-self: flex-end;
    /* margin-top: 8px; */
  }
}
@media (max-width: 600px) {
  .products-grid {
    grid-template-columns: 1fr;
  }
  .section-title {
    font-size: 22px;
  }
  .fp-head-row {
    /* flex-direction: column; */
    align-items: flex-start;
  }
  .fp-price {
    align-self: flex-end;
    /* margin-top: 8px; */
  }
}
</style>
