<template>
  <div class="ec-toast-layer" role="region" aria-label="系统提示">
    <div
      v-for="item in toast.items"
      :key="item.id"
      class="ec-toast"
      :class="typeClass(item.type)"
      role="status"
      aria-live="polite"
      @mouseenter="toast.pause(item.id)"
      @mouseleave="toast.resume(item.id)"
      @focusin="toast.pause(item.id)"
      @focusout="toast.resume(item.id)"
    >
      <AppIcon :name="toast.icon(item.type)" class="toast-icon" />
      <span>{{ item.text }}</span>
    </div>
  </div>
</template>

<script setup>
/**
 * 提示框宿主：应用里唯一的 Toast 渲染出口，挂在 App.vue 根部。
 *
 * 形态完全来自设计系统的 `.ec-toast-layer` / `.ec-toast`（顶部居中、堆叠 8px、
 * 圆角与阴影走 `--ec-toast-radius` / `--ec-shadow-lg`）。
 *
 * **不放关闭按钮**：EC 的 Toast 是「2s 成功 / 3s 错误、最多 3 条、无操作按钮」，
 * 会自己消失的东西再加一个 × 只会让人误以为需要手动清理。悬停暂停保留 ——
 * 那是「别在读的时候消失」的可达性行为，与按钮无关。
 */
import AppIcon from '@/components/AppIcon.vue'
import { useToastStore } from '@/stores/toast'

const toast = useToastStore()

/**
 * 类型 → EC 修饰类。
 *
 * EC 只为 Toast 定义了 success / danger 两种着色；warning 与 info
 * 沿用同一层语义色（`--ec-warning` / `--ec-info`）扩展，见 ToastHost 的 scoped 样式
 * 与 `docs/changes/` 里的偏离记录 —— 不新增令牌、不新增变体名，只是补两个类。
 */
const TYPE_CLASS = {
  success: 'ec-toast--success',
  error: 'ec-toast--danger',
  warning: 'toast-warning',
  info: 'toast-info',
}

const typeClass = (type) => TYPE_CLASS[type] || 'toast-info'
</script>

<style scoped>
/*
 * AppIcon 用 1em 定尺寸（跟随字号），而 `.ec-toast .ic` 给的是像素宽高；
 * 这里直接用字号表达同一个 14px，省掉一层会打架的覆盖。
 */
.toast-icon {
  font-size: 14px;
}

/*
 * EC 的 Toast 只给了成功/危险两色。warning 与 info 用同一套语义色补齐，
 * 保证「橙=注意、蓝=信息」在明暗两套主题下都成立。
 * 文字与图标形状本身也携带语义，不靠颜色单独表达状态（AP-10）。
 */
.toast-warning .toast-icon {
  color: var(--ec-warning);
}

.toast-info .toast-icon {
  color: var(--ec-info);
}
</style>
