<template>
  <div class="ec-alert" :class="variantClass" role="note">
    <AppIcon v-if="iconName" :name="iconName" class="alert-icon" />
    <div class="alert-main">
      <p v-if="title" class="ec-alert__title">{{ title }}</p>
      <p v-if="body || $slots.default" class="ec-alert__body">
        <slot>{{ body }}</slot>
      </p>
    </div>
  </div>
</template>

<script setup>
/**
 * 行内提示（EC `.ec-alert`）
 *
 * 用来表达「不需要用户立刻决策、但要留在页面上」的信息：
 * 支付后多久发卡密、游客身份限制、维护公告等。
 * 与 Toast 的分工：**会消失的用 Toast，要回看的用 Alert**（EC 的弹层选择规则）。
 *
 * 不使用危险的红色作为「未拥有/未开放」的表达（AP-04）—— 那类场景用 info。
 */
import { computed } from 'vue'
import AppIcon from '@/components/AppIcon.vue'

const props = defineProps({
  /** info | success | warning | danger */
  variant: { type: String, default: 'info' },
  /** 一句话结论；省略时只渲染正文 */
  title: { type: String, default: '' },
  /** 正文；也可以用默认插槽传更复杂的结构 */
  body: { type: String, default: '' },
  /** 覆盖默认图标；传空字符串表示不显示图标 */
  icon: { type: String, default: null },
})

const VARIANTS = {
  info: { cls: 'ec-alert--info', icon: 'info' },
  success: { cls: 'ec-alert--success', icon: 'check-circle' },
  warning: { cls: 'ec-alert--warning', icon: 'alert-triangle' },
  danger: { cls: 'ec-alert--danger', icon: 'ban' },
}

const resolved = computed(() => VARIANTS[props.variant] || VARIANTS.info)
const variantClass = computed(() => resolved.value.cls)
const iconName = computed(() => (props.icon === null ? resolved.value.icon : props.icon))
</script>

<style scoped>
/*
 * EC 的 `.ec-alert__icon` 用像素宽高，AppIcon 用 1em 定尺寸；
 * 这里用字号表达同一个 16px，避免两层覆盖打架。
 */
.alert-icon {
  font-size: 16px;
  flex: none;
}

.alert-main {
  min-width: 0;
}
</style>
