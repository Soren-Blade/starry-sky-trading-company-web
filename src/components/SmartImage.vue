<template>
  <!--
    加载失败（或地址为空）时退化为占位图形，而不是浏览器默认的「碎图」图标。

    背景：商品 / 工具 / 头像的图片地址来自后端返回的**第三方图床**
    （images.pexels.com、images.unsplash.com、api.dicebear.com …）。
    这类外部域名一旦不可达（网络受限、图床下线、链接失效），
    全站 `<img>` 会同时渲染成「碎图」——用户看到的是满屏红叉，
    比没有图更糟。此组件把这两种失败统一收敛为与「无图」一致的占位观感。

    仍然只做展示层的事：不改动任何图片地址 / 数据来源。
  -->
  <img
    v-if="resolved && !failed"
    :src="resolved"
    :alt="alt"
    :loading="loading"
    :decoding="decoding"
    @error="onError"
  />
  <span v-else class="smart-image-fallback" :class="fallbackClass" aria-hidden="true">
    <slot>
      <AppIcon :name="fallbackIcon" />
    </slot>
  </span>
</template>

<script setup>
/**
 * 带失败兜底的图片
 *
 * - `src` 为空 / 空白 → 直接渲染占位（等价于原来的 `v-else` 分支）
 * - `src` 非空但加载失败（`@error`）→ 切到占位，且不再重试，避免抖动
 * - 加载成功 → 正常渲染 `<img>`，所有既有样式（object-fit / hover 等）不变
 *
 * 占位内容默认是 `AppIcon`（线性单色，随主题变色）；需要别的图形时用默认插槽覆盖。
 */
import { computed, ref, watch } from 'vue'
import AppIcon from './AppIcon.vue'

const props = defineProps({
  /** 图片地址；空值 / 非字符串都视为「无图」，直接走占位 */
  src: { type: [String, null, undefined], default: '' },
  /** 替代文本；装饰性图片传空串 */
  alt: { type: String, default: '' },
  /** 占位图标名（utils/iconSet.js 的键），默认用通用「图片」图标 */
  fallbackIcon: { type: String, default: 'image' },
  /** 占位容器的额外 class（不同位置的尺寸 / 底色可覆盖） */
  fallbackClass: { type: [String, Array, Object], default: '' },
  /** 传给原生 img 的 loading；默认 lazy，避免首屏一次性拉全部外链图 */
  loading: { type: String, default: 'lazy' },
  /** 传给原生 img 的 decoding */
  decoding: { type: String, default: 'async' },
})

const failed = ref(false)

const resolved = computed(() => {
  const v = typeof props.src === 'string' ? props.src.trim() : ''
  return v
})

// 地址变化（如切换商品 / 上传新头像）时重置失败态，让新地址有机会重新加载
watch(
  () => props.src,
  () => {
    failed.value = false
  }
)

function onError() {
  failed.value = true
}
</script>

<style scoped>
.smart-image-fallback {
  /* 撑满父容器；父级多为固定尺寸的媒体区（.ui-card-media / .cart-thumb …），
     全幅铺开即可与正常图片占同一位置，不引起布局跳动。 */
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  font-size: var(--fs-h1);
  color: var(--text-muted);
  background: transparent;
}
</style>
