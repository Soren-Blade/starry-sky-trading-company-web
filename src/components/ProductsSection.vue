<template>
  <section class="products-section">
    <div class="section-container">
      <!-- Section Header -->
      <div class="section-header">
        <h2 class="section-title">
          <span class="title-icon">⭐</span>
          热门商品
        </h2>
        <p class="section-description">精选热销商品，为你呈现最好的选择</p>
      </div>

      <!-- Products Grid -->
      <div class="products-grid">
        <div
          v-for="(product, index) in products"
          :key="product.id"
          class="product-card"
          :style="{ '--animation-delay': (index % 4) * 0.1 + 's' }"
        >
          <!-- Tag -->
          <div v-if="product.tag" class="product-tag" :style="getTagStyle(product.tag)">
            {{ product.tag }}
          </div>

          <!-- Image Container -->
          <div class="product-image">
            <div class="image-placeholder">
              <span class="image-emoji">{{ product.icon }}</span>
            </div>
            <div class="image-overlay"></div>
          </div>

          <!-- Product Info -->
          <div class="product-info">
            <!-- Rating -->
            <div class="product-rating">
              <span class="stars">★</span>
              <span class="rating-value">{{ product.rating }}</span>
              <span class="review-count">({{ formatReviewCount(product.reviewCount) }})</span>
            </div>

            <!-- Name -->
            <h3 class="product-name">{{ product.name }}</h3>

            <!-- Description -->
            <p class="product-description">{{ product.description }}</p>

            <!-- Price -->
            <div class="product-price">
              <span class="price">¥{{ product.price }}</span>
              <span v-if="product.originalPrice" class="original-price">
                ¥{{ product.originalPrice }}
              </span>
            </div>

            <!-- Actions -->
            <div class="product-actions">
              <button
                class="action-btn favorite-btn"
                :class="{ liked: isLiked(product.id) }"
                @click="toggleFavorite(product.id)"
                :aria-label="`收藏 ${product.name}`"
              >
                <span class="heart-icon">♥</span>
              </button>
              <button class="action-btn quick-view-btn" @click="openQuickView(product)">
                快速预览
              </button>
              <button class="action-btn add-cart-btn" @click="addToCart(product)">
                <span>加购</span>
                <span class="icon">🛍️</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- View More Button -->
      <div class="view-more-container">
        <button class="view-more-btn" @click="handleViewMore">
          查看全部商品
          <span class="arrow">→</span>
        </button>
      </div>
    </div>
  </section>
</template>

<script setup>
import { ref } from 'vue';
import { HOT_PRODUCTS, TAG_COLORS, TAG_BG_COLORS } from '@/constants/index.js';
import { useUserStore } from '@/stores/user';
import { formatUtils } from '@/utils/index.js';

const userStore = useUserStore();
const products = HOT_PRODUCTS;
const favorites = ref(new Set());

const formatReviewCount = (count) => {
  return formatUtils.formatReviewCount(count);
};

const getTagStyle = (tag) => {
  return {
    color: TAG_COLORS[tag] || '#333',
    backgroundColor: TAG_BG_COLORS[tag] || '#f0f0f0',
  };
};

const isLiked = (productId) => {
  return favorites.value.has(productId);
};

const toggleFavorite = (productId) => {
  if (favorites.value.has(productId)) {
    favorites.value.delete(productId);
    userStore.removeFromFavorite();
  } else {
    favorites.value.add(productId);
    userStore.addToFavorite();
  }
};

const openQuickView = (product) => {
  console.log('Quick view:', product.name);
  // TODO: 打开商品快速预览模态框
};

const addToCart = (product) => {
  userStore.addToCart();
  console.log('Added to cart:', product.name);
  // TODO: 显示添加成功提示
};

const handleViewMore = () => {
  console.log('View more products');
  // TODO: 导航到商品列表页面
};
</script>

<style scoped>
.products-section {
  position: relative;
  width: 100%;
  padding: 120px 0;
  background: linear-gradient(180deg, #F8F9FA 0%, #EEEEEE 100%);
}

.section-container {
  max-width: 1320px;
  margin: 0 auto;
  padding: 0 20px;
}

/* 章节头部 */
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

/* 商品网格 */
.products-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 24px;
  margin-bottom: 60px;
}

.product-card {
  background: white;
  border-radius: var(--radius-lg);
  overflow: hidden;
  box-shadow: var(--shadow-md);
  transition: all 0.4s ease-in-out;
  animation: fadeInUp 0.6s ease-out both;
  animation-delay: var(--animation-delay);
  display: flex;
  flex-direction: column;
  height: 100%;
  position: relative;
}

.product-card:hover {
  transform: translateY(-12px);
  box-shadow: var(--shadow-xl);
}

/* 标签 */
.product-tag {
  position: absolute;
  top: 12px;
  right: 12px;
  z-index: 10;
  padding: 6px 12px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 600;
  line-height: 1;
}

/* 图片容器 */
.product-image {
  position: relative;
  width: 100%;
  height: 220px;
  background: linear-gradient(135deg, rgba(138, 109, 255, 0.05) 0%, rgba(253, 121, 168, 0.05) 100%);
  overflow: hidden;
}

.image-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 80px;
  transition: transform 0.4s ease-in-out;
}

.product-card:hover .image-placeholder {
  transform: scale(1.1);
}

.image-emoji {
  display: block;
}

.image-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(138, 109, 255, 0.1);
  opacity: 0;
  transition: opacity 0.3s ease-in-out;
  z-index: 5;
}

.product-card:hover .image-overlay {
  opacity: 1;
}

/* 产品信息 */
.product-info {
  flex: 1;
  padding: 20px;
  display: flex;
  flex-direction: column;
}

/* 评分 */
.product-rating {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-bottom: 12px;
  font-size: 13px;
}

.stars {
  color: #FFEAA7;
}

.rating-value {
  color: var(--color-dark);
  font-weight: 600;
}

.review-count {
  color: #999;
}

/* 商品名称 */
.product-name {
  font-size: 16px;
  font-weight: 600;
  margin: 0 0 8px 0;
  color: var(--color-dark);
  line-height: 1.4;
  display: -webkit-box;
  line-clamp: 2;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

/* 商品描述 */
.product-description {
  font-size: 13px;
  color: #999;
  margin: 0 0 12px 0;
  line-height: 1.4;
  display: -webkit-box;
  line-clamp: 2;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

/* 价格 */
.product-price {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 16px;
  margin-top: auto;
}

.price {
  font-size: 20px;
  font-weight: 700;
  color: var(--color-primary);
}

.original-price {
  font-size: 14px;
  color: #999;
  text-decoration: line-through;
}

/* 操作按钮 */
.product-actions {
  display: grid;
  grid-template-columns: 40px 1fr 1fr;
  gap: 8px;
}

.action-btn {
  padding: 10px 12px;
  border: 1px solid #E0E0E0;
  border-radius: 6px;
  background: white;
  color: var(--color-dark);
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease-in-out;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
}

.action-btn:hover {
  border-color: var(--color-primary);
  color: var(--color-primary);
  transform: translateY(-2px);
}

.favorite-btn {
  padding: 10px;
  border-color: #E0E0E0;
}

.favorite-btn:hover,
.favorite-btn.liked {
  border-color: var(--color-secondary);
  color: var(--color-secondary);
  background: rgba(253, 121, 168, 0.05);
}

.heart-icon {
  display: block;
  font-size: 16px;
}

.quick-view-btn {
  border-color: #E0E0E0;
  background: rgba(138, 109, 255, 0.05);
}

.quick-view-btn:hover {
  background: rgba(138, 109, 255, 0.1);
}

.add-cart-btn {
  background: var(--gradient-primary);
  color: white;
  border: none;
}

.add-cart-btn:hover {
  box-shadow: 0 4px 12px rgba(138, 109, 255, 0.4);
  transform: translateY(-2px);
}

.add-cart-btn .icon {
  display: block;
  font-size: 14px;
}

/* 查看更多按钮 */
.view-more-container {
  text-align: center;
  animation: fadeInUp 0.6s ease-out 0.5s both;
}

.view-more-btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 14px 48px;
  background: white;
  color: var(--color-primary);
  border: 2px solid var(--color-primary);
  border-radius: 8px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease-in-out;
}

.view-more-btn:hover {
  background: var(--color-primary);
  color: white;
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(138, 109, 255, 0.4);
}

.arrow {
  display: inline-block;
  transition: transform 0.3s ease-in-out;
}

.view-more-btn:hover .arrow {
  transform: translateX(4px);
}

/* 响应式 */
@media (max-width: 1199px) {
  .products-grid {
    grid-template-columns: repeat(3, 1fr);
    gap: 20px;
  }

  .section-title {
    font-size: 40px;
  }

  .product-image {
    height: 200px;
  }

  .image-placeholder {
    font-size: 64px;
  }
}

@media (max-width: 991px) {
  .products-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 16px;
  }

  .section-header {
    margin-bottom: 60px;
  }

  .section-title {
    font-size: 32px;
  }

  .section-description {
    font-size: 15px;
  }

  .product-image {
    height: 180px;
  }

  .image-placeholder {
    font-size: 56px;
  }

  .product-info {
    padding: 16px;
  }

  .product-name {
    font-size: 15px;
  }

  .product-description {
    font-size: 12px;
  }
}

@media (max-width: 767px) {
  .products-section {
    padding: 80px 0;
  }

  .products-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 12px;
  }

  .section-header {
    margin-bottom: 40px;
  }

  .section-title {
    font-size: 24px;
    gap: 8px;
  }

  .title-icon {
    font-size: 28px;
  }

  .section-description {
    font-size: 14px;
  }

  .product-card {
    animation-delay: 0s !important;
  }

  .product-image {
    height: 160px;
  }

  .image-placeholder {
    font-size: 48px;
  }

  .product-info {
    padding: 12px;
  }

  .product-name {
    font-size: 14px;
    margin-bottom: 6px;
  }

  .product-description {
    font-size: 11px;
    margin-bottom: 8px;
  }

  .product-price {
    margin-bottom: 12px;
  }

  .price {
    font-size: 18px;
  }

  .product-actions {
    grid-template-columns: 36px 1fr 1fr;
    gap: 6px;
  }

  .action-btn {
    padding: 8px 10px;
    font-size: 11px;
  }

  .favorite-btn {
    padding: 8px;
  }
}

@media (max-width: 575px) {
  .products-section {
    padding: 60px 0;
  }

  .products-grid {
    grid-template-columns: 1fr;
  }

  .section-title {
    font-size: 20px;
  }

  .title-icon {
    font-size: 24px;
  }

  .product-image {
    height: 200px;
  }

  .image-placeholder {
    font-size: 64px;
  }

  .product-actions {
    grid-template-columns: 1fr;
  }

  .favorite-btn {
    display: none;
  }

  .view-more-btn {
    padding: 12px 32px;
    font-size: 14px;
  }
}
</style>
