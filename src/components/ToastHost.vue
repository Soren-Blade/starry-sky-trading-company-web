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
 * 四态图标着色（需求 7）。
 *
 * EC 的选择器写的是 `.ec-toast--success .ic` / `.ec-toast--danger .ic`，而
 * AppIcon 渲染出的根元素类名是 `app-icon` —— 那两条规则从来没匹配上，
 * 于是成功/失败提示的图标一直是默认灰。这里按四种类型各写一条，作用在
 * 本组件自己的 `.toast-icon` 上：
 *   ① 不去给 AppIcon 全局加 `ic` 类（那会把全站图标描边从 2px 改成 1.5px）；
 *   ② 不改 TYPE_CLASS 映射与 warning/info 的既有类名（后两者是本站扩展）。
 * 文字与图标形状本身也携带语义，不靠颜色单独表达状态（AP-10）。
 */
.ec-toast--success .toast-icon {
  color: var(--ec-success);
}

.ec-toast--danger .toast-icon {
  color: var(--ec-danger);
}

.ec-toast--warning .toast-icon,
.toast-warning .toast-icon {
  color: var(--ec-warning);
}

.ec-toast--info .toast-icon,
.toast-info .toast-icon {
  color: var(--ec-info);
}
</style>
