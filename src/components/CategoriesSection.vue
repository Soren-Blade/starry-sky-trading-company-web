<template>
  <section
    id="categories-section"
    class="categories-section"
    :class="{ 'categories-section--index': isIndex }"
  >
    <div class="section-inner">
      <!-- 索引版不渲染区块头：分类页的开场已经承担了标题职能 -->
      <SectionHeader v-if="!isIndex" v-bind="SECTIONS.categories" />

      <ul :class="isIndex ? 'category-index' : 'categories-grid'">
        <li v-for="(category, index) in shopClass" :key="category.id" class="categories-cell">
          <button
            type="button"
            class="u-enter"
            :class="isIndex ? 'category-row' : 'category-card ui-card'"
            :style="{ '--i': index }"
            :aria-label="`查看分类 ${category.category_name}`"
            @click="handleCategoryClick(category)"
          >
            <!-- 索引版行号：两位补零的等宽数字，属排版信息，不参与朗读 -->
            <span v-if="isIndex" class="category-order" aria-hidden="true">
              {{ formatOrder(index) }}
            </span>

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
 * 两个变体共用一份数据与一份行内内容，只换外壳与排布：
 *   - `grid`（默认，主页用）—— 卡片网格，观感与之前一致；
 *   - `index`（分类页用）—— 行式索引面板，且不渲染区块头
 *     （页面开场已给出眉标与大字标题，区块再放一个标题就是重复）。
 *
 * 分类卡从「div + role=link + 整块渐变铺满」改为真实 `<button>`（键盘可达性由浏览器保证），
 * 渐变只作低透明度底纹；卡片外壳复用 global.css 的 `.ui-card`，组件内只留自身布局。
 */
import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useRouter } from 'vue-router'
import { useShopStore } from '@/stores/shop'
import { getEmojiGradient } from '@/hooks/useEmoji'
import SectionHeader from '@/components/SectionHeader.vue'
import { SECTIONS } from '@/constants/index.js'

const props = defineProps({
  /**
   * 区块变体：
   *   'grid'  卡片网格（主页）
   *   'index' 行式索引面板（分类页）
   */
  variant: { type: String, default: 'grid' },
})

const shopStore = useShopStore()
const router = useRouter()
const { shopClass } = storeToRefs(shopStore)

const isIndex = computed(() => props.variant === 'index')

/** 索引行号：两位补零（01、02…），等宽字体下不会因位数变化而抖动 */
const formatOrder = (index) => String(index + 1).padStart(2, '0')

/** 进入分类详情页（此前只 console.info 一句「待实现」） */
const handleCategoryClick = (category) => {
  const id = Number(category?.id)
  if (!Number.isFinite(id)) return
  router.push({ name: 'CategoryDetail', params: { id } })
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

/* 索引版：标题职能已由页面开场承担，上下留白收紧 */
.categories-section--index {
  padding: calc(var(--section-gap) * 0.2) 0 calc(var(--section-gap) * 0.6);
}

.section-inner {
  max-width: var(--container-max);
  margin: 0 auto;
  padding: 0 var(--container-padding);
}

/* ── grid 变体（主页）：卡片网格 ─────────────────────────────── */

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

/* ── index 变体（分类页）：行式索引面板 ───────────────────────
 *
 * 与主页的卡片网格刻意拉开距离：整块是一个面板，一行一条记录，
 * 行内按「序号 / 图标 / 名称+说明 / 浏览 →」四段横向排布，行间用发丝线分隔。
 * 行号与箭头都在等宽的节奏里，读起来像一本索引，而不是一排卡片。
 */

.category-index {
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: var(--bg-surface);
  border: var(--stroke-width) solid var(--border);
  border-radius: var(--radius-card);
  box-shadow: var(--shadow-card);
}

/* 面板只需一层外框：行与行之间用一条发丝线，而不是给每行描边 */
.category-index .categories-cell + .categories-cell {
  border-top: var(--stroke-width) solid var(--divider);
}

.category-index .categories-cell {
  display: block;
}

/* 四段横向排布靠 grid-area 定位，因此「名称 + 说明」无需再包一层容器 */
.category-row {
  display: grid;
  grid-template-columns: auto auto minmax(0, 1fr) auto;
  grid-template-areas:
    'order visual name more'
    'order visual desc more';
  align-items: center;
  column-gap: calc(var(--space-unit) * 2.5);
  width: 100%;
  padding: calc(var(--space-unit) * 2) calc(var(--space-unit) * 3);
  text-align: left;
  cursor: pointer;
  transition: background-color var(--transition-interactive);
}

.category-row:hover {
  background: var(--bg-soft);
}

.category-order {
  grid-area: order;
  font-family: var(--font-mono);
  font-size: var(--fs-sm);
  font-weight: var(--fw-label);
  letter-spacing: var(--tracking-label);
  color: var(--text-muted);
  transition: color var(--transition-interactive);
}

/* 行内的图标块比卡片里小一号，让一屏能容纳更多条目 */
.category-row .category-visual {
  grid-area: visual;
  width: calc(var(--space-unit) * 5);
  height: calc(var(--space-unit) * 5);
}

.category-row .category-icon {
  font-size: var(--fs-h3);
}

.category-row .category-name {
  grid-area: name;
  font-size: var(--fs-h3);
  transition: color var(--transition-interactive);
}

/* 说明固定一行：索引要的是可扫读的节奏，长文案不该把某一行撑高 */
.category-row .category-description {
  grid-area: desc;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.category-row .category-more {
  grid-area: more;
  margin-top: 0;
  padding-top: 0;
}

.category-row:hover .category-name,
.category-row:hover .category-order {
  color: var(--accent);
}

.category-row:hover .category-more span:last-child {
  transform: translateX(calc(var(--space-unit) * 0.5));
}

/* 空态已经在面板里，不再套第二层边框 */
.category-index .categories-empty {
  background: transparent;
  border-color: transparent;
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

/* 移动端：区块留白 ×0.6、两侧内边距 ×0.8、行内边距 ×0.8、标题 ×0.7、正文 ×0.95。
 * 行本身是「高度由内容决定」的按钮，没有固定控件高可缩，
 * 控件高 ×0.9 由 global.css 统一作用在 .u-btn-* / .u-icon-btn / .u-input 上。 */
@media (max-width: 767px) {
  .categories-section {
    padding: calc(var(--section-gap) * var(--mobile-section-scale)) 0;
  }

  .categories-section--index {
    padding: calc(var(--section-gap) * 0.2 * var(--mobile-section-scale)) 0
      calc(var(--section-gap) * 0.6 * var(--mobile-section-scale));
  }

  .section-inner {
    padding: 0 calc(var(--container-padding) * var(--mobile-padding-scale));
  }

  .category-icon {
    font-size: calc(var(--fs-h2) * var(--mobile-title-scale));
  }

  .category-row {
    column-gap: calc(var(--space-unit) * 1.5);
    padding: calc(var(--space-unit) * 2 * var(--mobile-padding-scale))
      calc(var(--space-unit) * 3 * var(--mobile-padding-scale));
  }

  .category-row .category-name {
    font-size: calc(var(--fs-h3) * var(--mobile-title-scale));
  }

  .category-row .category-description {
    font-size: calc(var(--fs-sm) * var(--mobile-body-scale));
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
