<template>
  <div class="tool-code">
    <div class="tool-code-header">
      <span class="tool-code-lang">{{ langLabel }}</span>
      <div v-if="copyable || $slots.actions" class="tool-code-actions">
        <button v-if="copyable" type="button" class="u-btn-secondary" @click="copyText">{{ copyLabel }}</button>
        <slot name="actions" />
      </div>
    </div>
    <pre class="tool-preview-code"><code>{{ code }}</code></pre>
  </div>
</template>

<script setup>
/**
 * 带语言条与复制按钮的代码块（结果区里的 CSS / JSON / SQL / 高亮 HTML 都用它）。
 *
 * 为什么单独抽出来：这一块在 8 个页面里重复了 5 份不同写法 —— 有的语言标签
 * 硬编码成 `CSS`，有的把复制按钮放在结果区底部，有的干脆没有复制入口。
 * 收成一处之后，语言条、等宽字体、最大高度（420px）与复制反馈只有一份实现。
 *
 * 复制失败不抛错也不静默：`navigator.clipboard` 在非安全上下文里可能不存在，
 * 此时按钮文案变成「复制失败」，不打断用户手上的其它操作。
 */
import { computed, onUnmounted, ref } from 'vue'

const props = defineProps({
  /** 要展示的代码文本 */
  code: { type: String, default: '' },
  /** 语言标识，显示在左上角（会被转成大写） */
  lang: { type: String, default: 'text' },
  /** 是否显示复制按钮 */
  copyable: { type: Boolean, default: true },
})

const copied = ref(false)
const failed = ref(false)
let timer = null

const langLabel = computed(() => props.lang || 'text')
const copyLabel = computed(() => (failed.value ? '复制失败' : copied.value ? '已复制' : '复制'))

function clearTimer() {
  if (timer) {
    clearTimeout(timer)
    timer = null
  }
}

async function copyText() {
  clearTimer()
  try {
    await navigator.clipboard.writeText(props.code)
    copied.value = true
    failed.value = false
  } catch {
    copied.value = false
    failed.value = true
  }
  timer = setTimeout(() => {
    copied.value = false
    failed.value = false
  }, 1800)
}

// 页面卸载时清掉反馈定时器：SSR 场景下组件不会被卸载，但客户端切换路由会。
onUnmounted(clearTimer)
</script>

<style scoped>
.tool-code {
  display: flex;
  flex-direction: column;
}

.tool-code-actions {
  display: flex;
  align-items: center;
  gap: calc(var(--space-unit));
}

/* 语言条里的按钮比常规按钮矮一档：它和「CSS」这类小字同高才不显得突兀 */
.tool-code-actions :deep(.u-btn-secondary) {
  padding: calc(var(--space-unit) * 0.25) calc(var(--space-unit) * 1);
  font-size: var(--fs-label);
}
</style>
