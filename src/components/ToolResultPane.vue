<template>
  <div class="tool-result">
    <!-- 空态：还没开始，或开始前要先选输入 -->
    <div v-if="state === 'empty'" class="u-empty">
      <span class="u-empty-icon"><AppIcon :name="icon" /></span>
      <p class="u-empty-title">{{ emptyTitle }}</p>
      <p v-if="emptyDesc" class="u-empty-desc">{{ emptyDesc }}</p>
      <div v-if="$slots['empty-actions']" class="u-empty-actions"><slot name="empty-actions" /></div>
    </div>

    <!-- 加载态：role=status + aria-busy，读屏会说「正在处理」而不是读到一片空白 -->
    <div v-else-if="state === 'loading'" class="tool-result-loading" role="status" aria-busy="true">
      <span class="u-spinner u-spinner--lg" aria-hidden="true"></span>
      <p class="tool-result-note">{{ loadingText }}</p>
    </div>

    <!-- 失败态：role=alert，红色描边 + 图标 + 原始报错，重试按钮由调用方塞进 #error -->
    <div v-else-if="state === 'error'" class="tool-result-error" role="alert">
      <span class="tool-result-error-icon" aria-hidden="true"><AppIcon name="alert-triangle" /></span>
      <div class="tool-result-error-main">
        <p class="tool-result-error-text">{{ errorText }}</p>
        <div v-if="$slots.error" class="tool-result-actions"><slot name="error" /></div>
      </div>
    </div>

    <!-- 成功态：内容由页面提供，操作按钮放 #actions -->
    <div v-else class="tool-result-body">
      <slot />
      <div v-if="$slots.actions" class="tool-result-actions"><slot name="actions" /></div>
    </div>
  </div>
</template>

<script setup>
/**
 * 工具页结果区：空 / 加载 / 成功 / 失败四个状态。
 *
 * 为什么要有它：这三个状态在改造前的三个工具页里写法完全不同 ——
 * 有的用 `v-if` 各画一套 div，有的干脆没有加载态（点完按钮页面没任何变化），
 * 而「失败」被写成了行内红字。四态收在一处之后，
 * 状态机的分支（`test/toolPages.test.js` 会断言四个分支）与无障碍标记也就只有一份实现。
 *
 * 状态由 `useToolJob` 给出（`empty` → `loading` → `success` / `error`），
 * 本组件只负责渲染，不自己发起请求。
 *
 * props 全部有默认值：`test/renderComponents.test.js` 用空 props 渲染 src 下每个 .vue。
 */
import { computed } from 'vue'
import AppIcon from '@/components/AppIcon.vue'
import { TOOL_RESULT } from '@/constants/index.js'

// defineProps 的参数必须能被编译器静态分析：校验函数里直接写字面量数组，
// 不能引用外部常量（否则 vue/valid-define-props 报错）。
const props = defineProps({
  /** 四态之一 */
  state: {
    type: String,
    default: 'empty',
    validator: (value) => ['empty', 'loading', 'success', 'error'].includes(value),
  },
  /** 空态标题（留空用共享兜底文案） */
  title: { type: String, default: '' },
  /** 空态说明（留空用共享兜底文案） */
  description: { type: String, default: '' },
  /** 失败原因（通常是 Error.message 原文） */
  error: { type: String, default: '' },
  /** 空态图标（AppIcon 图标名） */
  icon: { type: String, default: 'clipboard' },
  /** 加载态文案（留空用共享兜底文案） */
  loadingText: { type: String, default: '' },
})

const emptyTitle = computed(() => props.title || TOOL_RESULT.emptyTitle)
const emptyDesc = computed(() => props.description || TOOL_RESULT.emptyDesc)
const errorText = computed(() => props.error || TOOL_RESULT.errorTitle)
const loadingText = computed(() => props.loadingText || TOOL_RESULT.loading)
</script>
