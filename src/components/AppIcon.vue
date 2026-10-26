<template>
  <svg
    class="app-icon"
    :class="{ 'app-icon--filled': filled }"
    viewBox="0 0 24 24"
    :fill="filled ? 'currentColor' : 'none'"
    stroke="currentColor"
    :stroke-width="strokeWidth"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
    focusable="false"
  >
    <circle v-for="(c, i) in geometry.circles" :key="`c${i}`" :cx="c[0]" :cy="c[1]" :r="c[2]" />
    <rect
      v-for="(r, i) in geometry.rects"
      :key="`r${i}`"
      :x="r[0]"
      :y="r[1]"
      :width="r[2]"
      :height="r[3]"
      :rx="r[4]"
    />
    <path v-for="(d, i) in geometry.paths" :key="`p${i}`" :d="d" />
  </svg>
</template>

<script setup>
/**
 * 线性单色图标
 *
 * 三条设计约定：
 *   1. **颜色完全由 currentColor 决定** —— 组件里不写任何颜色，
 *      因此它跟随所在位置的文字色，也就跟随主题令牌变化。
 *      需要强调色的地方由父级设 color（如 `.rail-item--active { color: var(--accent) }`）。
 *   2. **尺寸用 1em** —— 跟着所在位置的 font-size 走。项目里字号本身是
 *      按主题缩放的（--fs-* / --mobile-*-scale），所以图标自动跟着缩放，
 *      不必为每个位置单独指定像素。
 *   3. **默认 aria-hidden** —— 图标在这些位置都是装饰，语义由相邻文字或
 *      父级按钮的 aria-label 承担。真正的图标按钮请把 aria-label 给 button。
 *
 * 几何数据在 utils/iconSet.js；名字查不到时渲染一个空 svg（占位不塌），
 * 调用方应自行决定是否回退到原文（见 emojiToIconName 的说明）。
 */
import { computed } from 'vue'
import { ICONS, ICON_STROKE_WIDTH } from '@/utils/iconSet.js'

const props = defineProps({
    /** utils/iconSet.js 里 ICONS 的键 */
    name: { type: String, required: true },
    /** 覆盖线宽（默认 2，24 网格上的常规值） */
    strokeWidth: { type: [Number, String], default: ICON_STROKE_WIDTH },
    /**
     * 实心填充。
     *
     * 用来表达「选中」这类二元状态（收藏 = 实心心，未收藏 = 空心）。
     * 填充色仍是 `currentColor`，所以**依然是单色、依然随主题变化** ——
     * 这与「多色 emoji 改成线性单色」的目标一致，只是多了一个实心/空心的维度。
     */
    filled: { type: Boolean, default: false },
})

const EMPTY = { paths: [], circles: [], rects: [] }

const geometry = computed(() => {
    const found = ICONS[props.name] || EMPTY
    return {
        paths: found.paths || [],
        circles: found.circles || [],
        rects: found.rects || [],
    }
})
</script>

<style scoped>
.app-icon {
  /* 1em：跟随所在位置的 font-size，因而跟随主题的字号缩放 */
  width: 1em;
  height: 1em;
  /*
   * 必须显式声明 inline-block。
   *
   * EC 的基线（assets/ec/ec.css）里有 `img, svg { display: block }` —— 那一条是给
   * 内容图片用的（消除行内图片底部的基线间隙）。图标不是内容图片：它是**行内文字
   * 的一部分**，被改成 block 后 vertical-align 直接失效，图标与相邻文字会错位，
   * 且每个图标都会独占一行。
   */
  display: inline-block;
  /* 与相邻文字基线对齐（线性图标常见做法，纯 vertical-align: middle 会偏高） */
  vertical-align: -0.125em;
  flex-shrink: 0;
  /* 描边圆角在缩放后仍保持圆润 */
  overflow: visible;
}
</style>
