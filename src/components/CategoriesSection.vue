<template>
  <section class="categories-section" id="categories-section">
    <div class="section-container">
      <!-- Section Header（共享组件，样式在 global.css） -->
      <SectionHeader
        icon="🛍️"
        title="商品分类"
        description="探索丰富多彩的商品世界，发现适合你的完美选择"
      />

      <!-- Categories Grid -->
      <div class="categories-grid">
        <div
          v-for="(category, index) in shopClass"
          :key="category.id"
          class="category-card"
          :style="{ '--animation-delay': index * 0.1 + 's' }"
          role="link"
          :tabindex="0"
          :aria-label="`查看分类 ${category.category_name}`"
          @click="handleCategoryClick(category)"
          @keyup.enter="handleCategoryClick(category)"
          @keyup.space.prevent="handleCategoryClick(category)"
        >
          <div class="card-inner">
            <!-- 背景渐变 -->
            <div class="card-background" :style="{ background: getEmojiGradient(category.icon_url) }"></div>

            <!-- 卡片内容 -->
            <div class="card-content">
              <div class="category-icon" aria-hidden="true">
                {{ category.icon_url }}
              </div>
              <h3 class="category-name">{{ category.category_name }}</h3>
              <p class="category-description">{{ category.description }}</p>
              <div class="card-footer">
                <span class="browse-link">浏览</span>
                <span class="arrow-icon">→</span>
              </div>
            </div>

            <!-- 悬停效果覆盖 -->
            <div class="card-overlay"></div>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup>
import { storeToRefs } from 'pinia'
// 商品状态管理存储
import { useShopStore } from "@/stores/shop";
/* 导入 Emoji 渐变颜色钩子 */
import { getEmojiGradient } from '@/hooks/useEmoji'
// 共享区块头
import SectionHeader from '@/components/SectionHeader.vue'
// 商品存储实例
const shopStore = useShopStore();
const { shopClass } = storeToRefs(shopStore);

const handleCategoryClick = (category) => {
  console.log('Clicked category:', category);
  // TODO: 导航到分类详情页
};
</script>

<style scoped>
.categories-section {
  position: relative;
  width: 100%;
  padding: 120px 0;
  background: linear-gradient(
    180deg,
    #F8F9FA 0%,
    #EEE 50%,
    #F8F9FA 100%
  );
}

.section-container {
  max-width: 1320px;
  margin: 0 auto;
  padding: 0 20px;
}

/* 章节头部样式已抽到 global.css（.section-header 系列） */

/* 分类网格 */
.categories-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 24px;
  margin-bottom: 60px;
}

.category-card {
  position: relative;
  height: 280px;
  border-radius: var(--radius-lg);
  cursor: pointer;
  animation: fadeInUp 0.6s ease-out both;
  animation-delay: var(--animation-delay);
  outline: none;
  transition: transform 0.3s ease-in-out;
}

.category-card:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: 4px;
}

.category-card:hover {
  transform: translateY(-12px);
}

.card-inner {
  position: relative;
  width: 100%;
  height: 100%;
  border-radius: var(--radius-lg);
  overflow: hidden;
  box-shadow: var(--shadow-md);
  transition: all 0.4s ease-in-out;
}

.category-card:hover .card-inner {
  box-shadow: var(--shadow-xl);
}

.card-background {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  opacity: 0.9;
  transition: opacity 0.3s ease-in-out;
}

.category-card:hover .card-background {
  opacity: 1;
}

.card-content {
  position: relative;
  z-index: 10;
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  padding: 32px 24px;
  color: white;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.category-icon {
  font-size: 56px;
  margin-bottom: 8px;
  animation: float 2s ease-in-out infinite;
}

.category-name {
  font-size: 24px;
  font-weight: 700;
  margin: 0 0 8px 0;
  line-height: 1.2;
}

.category-description {
  font-size: 14px;
  margin: 0;
  opacity: 0.95;
  line-height: 1.5;
}

.card-footer {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: auto;
}

.browse-link {
  font-weight: 600;
  font-size: 14px;
  transition: opacity 0.3s ease-in-out;
}

.arrow-icon {
  display: inline-block;
  transition: transform 0.3s ease-in-out;
  font-size: 18px;
}

.category-card:hover .arrow-icon {
  transform: translateX(4px);
}

.card-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.1);
  opacity: 0;
  transition: opacity 0.3s ease-in-out;
  z-index: 5;
}

.category-card:hover .card-overlay {
  opacity: 1;
}

/* 响应式设计 */
@media (max-width: 1199px) {
  .categories-grid {
    grid-template-columns: repeat(3, 1fr);
    gap: 20px;
  }

  .category-card {
    height: 260px;
  }

  .category-icon {
    font-size: 48px;
  }

  .category-name {
    font-size: 20px;
  }
}

@media (max-width: 991px) {
  .categories-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 16px;
  }

  .category-card {
    height: 240px;
  }

  .card-content {
    padding: 24px 18px;
  }

  .category-icon {
    font-size: 40px;
  }

  .category-name {
    font-size: 18px;
  }

  .category-description {
    font-size: 13px;
  }
}

@media (max-width: 767px) {
  .categories-section {
    padding: 80px 0;
  }

  .categories-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 12px;
  }

  .category-card {
    height: 200px;
    animation-delay: 0s !important;
  }

  .card-content {
    padding: 18px 14px;
  }

  .category-icon {
    font-size: 32px;
    margin-bottom: 4px;
  }

  .category-name {
    font-size: 16px;
    margin-bottom: 4px;
  }

  .category-description {
    font-size: 12px;
    display: none;
  }

  .card-footer {
    gap: 4px;
  }

  .browse-link {
    font-size: 12px;
  }

  .arrow-icon {
    font-size: 14px;
  }
}

@media (max-width: 575px) {
  .categories-section {
    padding: 60px 0;
  }

  .categories-grid {
    grid-template-columns: repeat(2, 1fr);
  }

  .category-card {
    height: 180px;
  }

  .card-content {
    padding: 14px 10px;
  }

  .category-icon {
    font-size: 28px;
  }

  .category-name {
    font-size: 14px;
  }

  .card-footer {
    margin-top: auto;
  }

  .browse-link {
    font-size: 11px;
  }
}
</style>
