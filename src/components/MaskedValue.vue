<template>
  <span class="masked-value">
    <span
      v-for="(part, index) in parts"
      :key="index"
      :class="part.masked ? 'masked-value__mask' : 'masked-value__plain'"
    >{{ part.text }}</span>
  </span>
</template>

<script setup>
/**
 * 脱敏编码展示
 *
 * 为什么单做一个组件：脱敏的「长什么样」是设计系统的一部分，不是各页面的自由发挥。
 * 掩码段统一用 `--ec-code-mask`（各主题在 `src/assets/ec/theme-*.css` 里定义），
 * 明文段用 `currentColor` 继承正文色——于是同一段脱敏在任何主题下都跟着变色，
 * 不需要在模板里写任何色值（写死色值会被 `designTokens` 测试判红）。
 *
 * 用法：
 *   <MaskedValue :value="card.card_no_display" />           服务端已脱敏的串
 *   <MaskedValue :value="maskCode(card.card_no)" />         前端脱敏后再展示
 */
import { computed } from 'vue';
import { splitMasked } from '@/utils/mask.js';

const props = defineProps({
    /** 可能含 `****` 掩码的文本 */
    value: { type: String, default: '' },
});

const parts = computed(() => splitMasked(props.value));
</script>

<style scoped>
.masked-value {
    display: inline-flex;
    flex-wrap: wrap;
    align-items: baseline;
    gap: 0;
    font-variant-numeric: tabular-nums;
}

/* 掩码段：主题令牌决定颜色与字重，浅色主题下是浅灰、深色主题下是暗灰 */
.masked-value__mask {
    color: var(--ec-code-mask);
    letter-spacing: 0.08em;
}

.masked-value__plain {
    color: inherit;
}
</style>
