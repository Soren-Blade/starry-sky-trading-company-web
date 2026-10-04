<template>
  <div class="categories-page">
    <!--
      页面开场：分类页自己写（统一的页头组件已删除）。
      版式是「索引刊头」—— 眉标 / 大字标题 / 说明在左竖排，计数标签贴右下，
      且**不加**分隔线：下方的索引面板自带边框，两道线会打架。
    -->
    <header class="index-masthead">
      <div class="index-masthead-inner">
        <div class="index-heading u-enter" :style="{ '--i': 0 }">
          <p class="index-eyebrow">{{ PAGES.categories.eyebrow }}</p>
          <h1 class="index-title">{{ PAGES.categories.title }}</h1>
          <p class="index-description">{{ PAGES.categories.description }}</p>
        </div>

        <!-- 计数：总数取自数据层，与下方索引行的条数同源 -->
        <p class="index-total u-tag u-tag--accent u-enter" :style="{ '--i': 1 }">
          <span class="index-total-value">{{ categoryCount }}</span>
          <span>个分类</span>
        </p>
      </div>
    </header>

    <CategoriesSection variant="index" />
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import CategoriesSection from '@/components/CategoriesSection.vue'
import { useShopStore } from '@/stores/shop'
// 开场文案集中在 constants，改文案只碰一个文件
import { PAGES } from '@/constants/index.js'

const shopStore = useShopStore()
const { shopClass } = storeToRefs(shopStore)

/** 分类总数：数据层持有分类树，页面只读不重算 */
const categoryCount = computed(() => shopClass.value.length)
</script>

<style scoped>
/*
 * 索引刊头
 *
 * 标题走 --fs-h1 + --fw-display + --tracking-display（与已删除的页头同档字号，
 * 令牌照旧有人消费）；眉标用等宽字体 + 标签字距，是「索引」版式的识别点。
 * 顶栏是 sticky 且参与文档流，页面无需再留占位（见 App.vue 的注释）。
 */
.index-masthead {
  width: 100%;
}

.index-masthead-inner {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: calc(var(--space-unit) * 4);
  max-width: var(--container-max);
  margin: 0 auto;
  padding: calc(var(--section-gap) * 0.6) var(--container-padding)
    calc(var(--section-gap) * 0.2);
}

.index-heading {
  display: flex;
  flex-direction: column;
  gap: calc(var(--space-unit) * 1.5);
  min-width: 0;
}

.index-eyebrow {
  font-family: var(--font-mono);
  font-size: var(--fs-label);
  font-weight: var(--fw-label);
  letter-spacing: var(--tracking-label);
  text-transform: var(--label-transform);
  color: var(--accent);
  margin: 0;
}

.index-title {
  font-family: var(--font-display);
  font-size: var(--fs-h1);
  font-weight: var(--fw-display);
  letter-spacing: var(--tracking-display);
  text-transform: var(--heading-transform);
  color: var(--text-primary);
  margin: 0;
}

.index-description {
  max-width: 46ch;
  font-size: var(--fs-body);
  line-height: var(--leading-body);
  color: var(--text-secondary);
  margin: 0;
}

/* 计数标签：数字用等宽，读起来像「条目数」而不是一句宣传语 */
.index-total {
  flex-shrink: 0;
  margin: 0;
}

.index-total-value {
  font-family: var(--font-mono);
  font-weight: var(--fw-heading);
}

/* 移动端：区块留白 ×0.6、两侧内边距 ×0.8、标题 ×0.7、正文 ×0.95 */
@media (max-width: 767px) {
  .index-masthead-inner {
    flex-direction: column;
    align-items: flex-start;
    gap: calc(var(--space-unit) * 2);
    padding: calc(var(--section-gap) * 0.6 * var(--mobile-section-scale))
      calc(var(--container-padding) * var(--mobile-padding-scale))
      calc(var(--section-gap) * 0.2 * var(--mobile-section-scale));
  }

  .index-title {
    font-size: calc(var(--fs-h1) * var(--mobile-title-scale));
  }

  .index-description {
    font-size: calc(var(--fs-body) * var(--mobile-body-scale));
  }
}
</style>
