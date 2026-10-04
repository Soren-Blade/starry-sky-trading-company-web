<template>
  <div class="hot-page">
    <!--
      页面开场：榜单页自己写（统一的页头组件已删除）。
      版式是「横向标题带」—— 眉标与标题同行居左、说明在下一行，
      计数在右侧跨两行居中，整条带用一条发丝线与下方的榜单分隔。
    -->
    <header class="rank-band">
      <div class="rank-band-inner">
        <div class="rank-heading">
          <p class="rank-eyebrow">{{ PAGES.hot.eyebrow }}</p>
          <h1 class="rank-title">{{ PAGES.hot.title }}</h1>
        </div>

        <p class="rank-description">{{ PAGES.hot.description }}</p>

        <!-- 计数：大字是装饰性排版，语义由「共 N 件」承担，避免朗读两遍 -->
        <p class="rank-total">
          <span class="rank-total-value" aria-hidden="true">{{ hitCount }}</span>
          <span class="rank-total-label">共 {{ hitCount }} 件</span>
        </p>
      </div>
    </header>

    <HotProductsSection variant="board" />
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import HotProductsSection from '@/components/HotProductsSection.vue'
import { useShopStore } from '@/stores/shop'
// 开场文案集中在 constants，改文案只碰一个文件
import { PAGES } from '@/constants/index.js'

const shopStore = useShopStore()
const { filteredProducts } = storeToRefs(shopStore)

/** 在榜数量：与榜单区块同源（关键词过滤在数据层，见 stores/shop.js） */
const hitCount = computed(() => filteredProducts.value.length)
</script>

<style scoped>
/*
 * 榜单标题带
 *
 * 与分类页的竖排刊头刻意不同：眉标与标题同一行（等宽眉标 + --fs-h1 标题），
 * 说明另起一行，计数右对齐并跨两行居中；带底用 --divider 与下方榜单分隔。
 * 顶栏是 sticky 且参与文档流，页面无需再留占位（见 App.vue 的注释）。
 */
.rank-band {
  width: 100%;
  border-bottom: var(--stroke-width) solid var(--divider);
}

.rank-band-inner {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  grid-template-areas:
    'heading total'
    'description total';
  align-items: center;
  column-gap: calc(var(--space-unit) * 5);
  row-gap: calc(var(--space-unit) * 1.5);
  max-width: var(--container-max);
  margin: 0 auto;
  padding: calc(var(--section-gap) * 0.5) var(--container-padding)
    calc(var(--section-gap) * 0.3);
}

.rank-heading {
  grid-area: heading;
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: calc(var(--space-unit) * 2);
  min-width: 0;
}

.rank-eyebrow {
  font-family: var(--font-mono);
  font-size: var(--fs-label);
  font-weight: var(--fw-label);
  letter-spacing: var(--tracking-label);
  text-transform: var(--label-transform);
  color: var(--accent);
  margin: 0;
}

.rank-title {
  font-family: var(--font-display);
  font-size: var(--fs-h1);
  font-weight: var(--fw-display);
  letter-spacing: var(--tracking-display);
  text-transform: var(--heading-transform);
  color: var(--text-primary);
  margin: 0;
}

.rank-description {
  grid-area: description;
  max-width: 46ch;
  font-size: var(--fs-body);
  line-height: var(--leading-body);
  color: var(--text-secondary);
  margin: 0;
}

/* 计数：等宽大字 + 标签，右对齐压在标题带的右端 */
.rank-total {
  grid-area: total;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: calc(var(--space-unit) * 0.5);
  margin: 0;
  text-align: right;
}

.rank-total-value {
  font-family: var(--font-mono);
  font-size: var(--fs-h2);
  font-weight: var(--fw-display);
  line-height: 1;
  letter-spacing: var(--tracking-display);
  color: var(--accent);
}

.rank-total-label {
  font-family: var(--font-mono);
  font-size: var(--fs-label);
  font-weight: var(--fw-label);
  letter-spacing: var(--tracking-label);
  text-transform: var(--label-transform);
  color: var(--text-muted);
}

/* 移动端：标题带折成竖排，区块留白 ×0.6、两侧内边距 ×0.8、标题 ×0.7、正文 ×0.95 */
@media (max-width: 767px) {
  .rank-band-inner {
    grid-template-columns: minmax(0, 1fr);
    grid-template-areas:
      'heading'
      'description'
      'total';
    row-gap: calc(var(--space-unit) * 1.5);
    padding: calc(var(--section-gap) * 0.5 * var(--mobile-section-scale))
      calc(var(--container-padding) * var(--mobile-padding-scale))
      calc(var(--section-gap) * 0.3 * var(--mobile-section-scale));
  }

  .rank-heading {
    gap: calc(var(--space-unit) * 1.5);
  }

  .rank-title {
    font-size: calc(var(--fs-h1) * var(--mobile-title-scale));
  }

  .rank-description {
    font-size: calc(var(--fs-body) * var(--mobile-body-scale));
  }

  /* 竖排后计数不再是右端的「秤砣」，改成一行「数值 + 文案」 */
  .rank-total {
    flex-direction: row;
    align-items: baseline;
    gap: calc(var(--space-unit) * 1.5);
    text-align: left;
  }

  .rank-total-value {
    font-size: calc(var(--fs-h2) * var(--mobile-title-scale));
  }
}
</style>
