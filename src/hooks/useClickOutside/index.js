import { onMounted, onUnmounted } from 'vue'

/**
 * 点击元素外部时触发回调。
 *
 * ## 为什么是共享 hook
 *
 * SelectField 与 DatePickerField 原本各写了一份完全相同的实现，连注释都是同一套道理。
 * 这段代码的坑很细（见下），复制两份迟早会有一份漂移 —— 而漂移的表现是
 * 「浮层关不掉」或「点自己的触发器也被当成点了外面」，都属于不易复现的交互缺陷。
 *
 * ## 两个刻意的选择
 *
 * 1. **捕获阶段（`capture: true`）**，不是冒泡：`click` 事件要等 `pointerup` 才派发，
 *    而在这之间目标元素可能已经被移除或替换（浮层里的选项点击后常常如此），
 *    于是冒泡阶段的 `click` 会落在 `document` 或别的元素上，
 *    `contains(event.target)` 的判断随之失真。捕获阶段在事件下行时就判定，稳定得多。
 * 2. **`pointerdown` 而不是 `mousedown`**：指针事件在触摸设备上同样触发，
 *    不必再为触屏单独挂一套 `touchstart`。
 *
 * ## 用法
 *
 * ```js
 * const rootRef = ref(null)
 * useClickOutside(rootRef, () => {
 *   if (open.value) close()
 * })
 * ```
 *
 * 回调里**自己判断「现在是否需要关闭」**（例如浮层没开就直接返回）：
 * 监听是常驻的，不要指望 hook 帮你省这一步 —— 否则每次点击都会产生一次无谓的状态写入。
 *
 * @param {import('vue').Ref<HTMLElement|null>} targetRef 边界元素；它内部的点击不算「外部」
 * @param {(event: PointerEvent) => void} handler 判定为外部点击时调用
 */
export function useClickOutside(targetRef, handler) {
  const onPointerDown = (event) => {
    const root = targetRef?.value
    // 边界元素还没挂上（或已卸载）时不做判定：此时「外部」无从谈起，
    // 贸然回调会在挂载前就把面板关掉。
    if (!root) return
    // contains 不是所有环境都有（SSR / 测试桩里的假元素可能缺），缺了就当内部处理，
    // 宁可不关，也不要在不确定的情况下关掉用户正在操作的浮层。
    if (typeof root.contains !== 'function') return
    if (root.contains(event.target)) return
    handler(event)
  }

  onMounted(() => {
    if (typeof document === 'undefined' || typeof document.addEventListener !== 'function') return
    document.addEventListener('pointerdown', onPointerDown, true)
  })

  onUnmounted(() => {
    if (typeof document === 'undefined' || typeof document.removeEventListener !== 'function') return
    document.removeEventListener('pointerdown', onPointerDown, true)
  })
}
