<template>
  <nav v-if="items.length" class="ec-breadcrumb page-breadcrumb" aria-label="面包屑">
    <template v-for="(item, index) in items" :key="`${index}-${item.label}`">
      <span v-if="index > 0" class="ec-breadcrumb__sep" aria-hidden="true">/</span>
      <!-- 末项是当前页：不可点、带 aria-current，屏幕阅读器才会念成「当前页」 -->
      <span v-if="index === items.length - 1" aria-current="page">{{ item.label }}</span>
      <router-link v-else :to="item.to">{{ item.label }}</router-link>
    </template>
  </nav>
</template>

<script setup>
/**
 * 面包屑（EC `.ec-breadcrumb`）
 *
 * 用法：`items` 按「从外到内」排列，**末项即当前页**，末项的 `to` 会被忽略。
 * 只允许 2 段以上 —— 1 段面包屑没有回退价值，反而占掉一行页头空间。
 *
 * 为什么不用 `<a href>`：站内跳转必须走 router，否则整页刷新丢 store 状态。
 * `<router-link>` 渲染出来仍然是 `<a>`，`.ec-breadcrumb a` 的配色照常生效。
 */
defineProps({
  items: {
    type: Array,
    default: () => [],
  },
})
</script>

<style scoped>
/*
 * 只补设计系统不管的那一件事：与下方内容的间距。
 * 布局（flex / 换行 / gap）与配色全部由 `.ec-breadcrumb` 提供，不在这里重复定义，
 * 否则改了设计系统的那一处，这里会静默地不跟随。
 */
.page-breadcrumb {
  margin-block-end: var(--ec-space-4);
}
</style>
