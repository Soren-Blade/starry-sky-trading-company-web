import { nextTick, onMounted, onUnmounted, ref } from 'vue'
import { useBodyScroll } from '@/hooks/useBodyScroll/useBodyScroll'

/**
 * 模态弹窗的无障碍约定（项目里唯一的实现）
 *
 * 这段逻辑此前在 `LoginModal.vue` 与 `ThemeSwitcher.vue` 中各写了一份，
 * 本文件是第三处需要它（联系客服弹窗）时抽出来的 —— 三份逐字相同的
 * 「Escape 关闭 + Tab 焦点陷阱 + 焦点归还 + 滚动锁定」正是该收敛的信号。
 *
 * 约定（项目 UI 规范「弹窗（模态）」一节，硬性要求）：
 *   - Escape 关闭，监听挂在 `document` 上。**不能只挂在容器上** ——
 *     焦点有可能不在弹窗内（例如用户点了遮罩），那样 Escape 会失效。
 *   - Tab / Shift+Tab 在弹窗内循环，不跑到背后的页面。
 *   - 打开前记录 `document.activeElement`，关闭时归还，避免焦点掉回 body
 *     让键盘用户失去位置。
 *   - 打开期间锁定 body 滚动（`useBodyScroll` 内部引用计数，关闭自动恢复）。
 *
 * 用法（挂载即打开，如 LoginModal / HelpModal）：
 *
 *   const { modalRef } = useModalA11y({ close: () => emit('close') })
 *
 * 用法（常驻组件 + 由状态开关，如 ThemeSwitcher）：
 *
 *   const { modalRef, activate, deactivate } = useModalA11y({
 *     close: () => store.closePanel(),
 *     auto: false,
 *     initialFocus: '.theme-close',
 *   })
 *   watch(() => store.panelOpen, (open) => (open ? activate() : deactivate()))
 *
 * @param {object} options
 * @param {() => void} options.close 关闭动作（Escape 时调用）
 * @param {boolean} [options.auto=true] 是否在组件挂载时自动激活
 * @param {string|HTMLElement|(() => any)} [options.initialFocus]
 *   打开后聚焦的目标：CSS 选择器 / 元素 / 返回前两者的函数。
 *   缺省聚焦弹窗内第一个可聚焦元素。
 * @returns {{ modalRef, activate, deactivate, handleKeydown }}
 */
export function useModalA11y(options = {}) {
  const { close, auto = true, initialFocus } = options

  const modalRef = ref(null)
  const { disableScroll, enableScroll } = useBodyScroll()

  /** 打开前拥有焦点的元素，关闭后归还 */
  let previouslyFocused = null
  /** 是否已激活。防止重复 activate 造成滚动锁计数泄漏 */
  let active = false

  const emitClose = () => {
    if (typeof close === 'function') close()
  }

  /** 焦点陷阱 + Escape */
  const handleKeydown = (event) => {
    if (event.key === 'Escape') {
      event.preventDefault()
      emitClose()
      return
    }

    if (event.key !== 'Tab' || !modalRef.value) return

    const focusable = modalRef.value.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    )
    // offsetParent 为 null 的是被隐藏的元素（例如未激活的页签内容）
    const list = Array.from(focusable).filter((el) => !el.disabled && el.offsetParent !== null)
    if (list.length === 0) return

    const first = list[0]
    const last = list[list.length - 1]

    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault()
      last.focus()
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault()
      first.focus()
    }
  }

  /** 解析 initialFocus 支持选择器、元素与函数三种写法 */
  const resolveInitialFocus = () => {
    const raw = typeof initialFocus === 'function' ? initialFocus() : initialFocus
    if (!raw) return modalRef.value?.querySelector('input, button, [href]') || null
    if (typeof raw === 'string') return modalRef.value?.querySelector(raw) || null
    return raw
  }

  /** 打开：锁滚动、记焦点、移入焦点、挂键盘监听 */
  const activate = async () => {
    if (active) return
    active = true

    disableScroll()
    previouslyFocused =
      typeof document !== 'undefined' && document.activeElement ? document.activeElement : null

    await nextTick()
    // await 之后组件可能已被卸载（例如「打开后立刻关闭」），modalRef 会变回 null
    resolveInitialFocus()?.focus?.()

    if (typeof document !== 'undefined') {
      document.addEventListener('keydown', handleKeydown)
    }
  }

  /** 关闭：解锁滚动、摘监听、归还焦点 */
  const deactivate = () => {
    if (!active) return
    active = false

    enableScroll()

    if (typeof document !== 'undefined') {
      document.removeEventListener('keydown', handleKeydown)
    }

    if (previouslyFocused && typeof previouslyFocused.focus === 'function') {
      previouslyFocused.focus()
    }
    previouslyFocused = null
  }

  if (auto) {
    onMounted(activate)
  }

  // 卸载时无条件收尾：即使 activate 尚未 resolve，deactivate 的 active 守卫
  // 也保证不会误释放别人的滚动锁
  onUnmounted(deactivate)

  return { modalRef, activate, deactivate, handleKeydown }
}

export default useModalA11y
