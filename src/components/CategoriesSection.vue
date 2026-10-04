<template>
  <section id="categories-section" class="categories-section">
    <div class="section-inner">
      <SectionHeader v-bind="SECTIONS.categories" />

      <ul class="categories-grid">
        <li v-for="(category, index) in shopClass" :key="category.id" class="categories-cell">
          <button
            type="button"
            class="category-card ui-card u-enter"
            :style="{ '--i': index }"
            :aria-label="`查看分类 ${category.category_name}`"
            @click="handleCategoryClick(category)"
          >
            <span class="category-visual" aria-hidden="true">
              <!-- 分类色只作为低透明度的底纹出现：既保留分类辨识度，
                   又不让高饱和渐变盖过主题的单一强调色 -->
              <span
                class="category-tint"
                :style="{ backgroundImage: getEmojiGradient(category.icon_url) }"
              ></span>
              <span class="category-icon">{{ category.icon_url }}</span>
            </span>

            <span class="category-name">{{ category.category_name }}</span>
            <span class="category-description">{{ category.description }}</span>

            <span class="category-more">
              <span>浏览</span>
              <span aria-hidden="true">→</span>
            </span>
          </button>
        </li>

        <li v-if="!shopClass.length" class="categories-empty">暂无商品分类</li>
      </ul>
    </div>
  </section>
</template>

<script setup>
/**
 * 商品分类区块
 *
 * 相比旧实现：
 *   - 分类卡从「div + role=link + 整块渐变铺满」改为真实 `<button>`（键盘可达性由浏览器保证）；
 *   - 渐变改为低透明度底纹，只承担分类辨识；
 *   - 整块 `.ui-card` 外壳复用 global.css，组件内只留自身布局。
 */
import { storeToRefs } from 'pinia'
import { useShopStore } from '@/stores/shop'
import { getEmojiGradient } from '@/hooks/useEmoji'
import SectionHeader from '@/components/SectionHeader.vue'
import { SECTIONS } from '@/constants/index.js'

const shopStore = useShopStore()
const { shopClass } = storeToRefs(shopStore)

// 分类详情页尚未实现，先记录点击
const handleCategoryClick = (category) => {
  console.info('查看分类（待实现）:', category.category_name)
}
</script>

<style scoped>
/*
 * 分类区块
 *
 * 分类卡的外壳（圆角/描边/内边距/悬停）全部来自 global.css 的 .ui-card，
 * 这里只保留卡片内部的排布；入场错峰由 .u-enter + `:style="{ '--i': index }"` 提供。
 */
.categories-section {
  width: 100%;
  padding: var(--section-gap) 0;
  background: transparent;
}

.section-inner {
  max-width: var(--container-max);
  margin: 0 auto;
  padding: 0 var(--container-padding);
}

.categories-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: var(--grid-gap);
}

.categories-cell {
  display: flex;
}

/* 卡片本身是 <button>：只补共享类没覆盖到的排版（左对齐、不换行时的截断） */
.category-card {
  width: 100%;
  align-items: flex-start;
  gap: calc(var(--space-unit) * 1.5);
  text-align: left;
  cursor: pointer;
}

/* 图标底纹：分类色只以低透明度出现，容器保持中性表面 + 独立圆角 */
.category-visual {
  position: relative;
  display: grid;
  place-items: center;
  width: calc(var(--space-unit) * 7);
  height: calc(var(--space-unit) * 7);
  overflow: hidden;
  background: var(--bg-surface-2);
  border: var(--stroke-width) solid var(--border);
  border-radius: var(--radius-media);
}

.category-tint {
  position: absolute;
  inset: 0;
  opacity: 0.16;
}

.category-icon {
  position: relative;
  font-size: var(--fs-h2);
  line-height: 1;
}

.category-name {
  font-family: var(--font-display);
  font-size: var(--card-title-size);
  font-weight: var(--fw-heading);
  letter-spacing: var(--tracking-display);
  text-transform: var(--heading-transform);
  color: var(--text-primary);
}

.category-description {
  font-size: var(--fs-sm);
  line-height: var(--leading-body);
  color: var(--text-secondary);
}

/* 「浏览 →」：字号取标签档，颜色取强调色 */
.category-more {
  display: inline-flex;
  align-items: center;
  gap: calc(var(--space-unit) * 0.5);
  margin-top: auto;
  padding-top: var(--space-unit);
  font-size: var(--tag-font-size);
  font-weight: var(--fw-label);
  letter-spacing: var(--tracking-label);
  text-transform: var(--label-transform);
  color: var(--accent);
}

.category-more span:last-child {
  transition: transform var(--transition-interactive);
}

.category-card:hover .category-more span:last-child {
  transform: translateX(calc(var(--space-unit) * 0.25));
}

.categories-empty {
  grid-column: 1 / -1;
  padding: calc(var(--space-unit) * 5) calc(var(--space-unit) * 2);
  font-size: var(--fs-body);
  text-align: center;
  color: var(--text-muted);
  background: var(--bg-surface-2);
  border: var(--stroke-width) solid var(--border);
  border-radius: var(--radius-card);
}

/* ── 响应式：断点统一 1199 / 991 / 767 / 575 ────────────────── */
@media (max-width: 1199px) {
  .categories-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

@media (max-width: 991px) {
  .categories-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

/* 移动端：区块留白 ×0.6、两侧内边距 ×0.8 */
@media (max-width: 767px) {
  .categories-section {
    padding: calc(var(--section-gap) * var(--mobile-section-scale)) 0;
  }

  .section-inner {
    padding: 0 calc(var(--container-padding) * var(--mobile-padding-scale));
  }

  .category-icon {
    font-size: calc(var(--fs-h2) * var(--mobile-title-scale));
  }
}

@media (max-width: 575px) {
  .categories-grid {
    grid-template-columns: 1fr;
    gap: calc(var(--space-unit) * 1.5);
  }

  .category-description {
    display: none;
  }
}
</style>
