import { notify } from '@/hooks/useToast/index.js'
import { TOOL_PAGE } from '@/constants/index.js'

/**
 * 打开外部工具
 *
 * 从 `Tool.vue` 抽出来的：这段逻辑并不只是 `window.open` ——
 * 要处理未配置地址、非法地址、被浏览器拦截，还要记住已打开的窗口，
 * 避免同一工具点两次开出两个标签页。收藏页也要打开工具，
 * 逐处重写必然漏掉其中一条。
 *
 * 已打开窗口存在**闭包**里而不是模块级变量：每个调用方各自持有一份，
 * 组件卸载后引用随组件一起释放，不会长期驻留。
 */
export function useOpenTool() {
  /** url → Window，用于复用已打开的窗口 */
  const openedWindows = new Map()

  /** 顺带清理已关闭的窗口引用 */
  const pruneClosed = () => {
    for (const [key, win] of openedWindows) {
      if (win.closed) openedWindows.delete(key)
    }
  }

  /**
   * @param {object} tool 需要有 tool_path
   * @returns {boolean} 是否成功打开（或聚焦到已有窗口）
   */
  const openTool = (tool) => {
    const url = tool?.tool_path

    if (!url || typeof url !== 'string') {
      notify.warning(TOOL_PAGE.missingPath)
      return false
    }

    pruneClosed()

    let absoluteUrl
    try {
      absoluteUrl = new URL(url, window.location.origin).href
    } catch {
      notify.error(TOOL_PAGE.invalidPath)
      return false
    }

    const existing = openedWindows.get(url)
    if (existing && !existing.closed) {
      try {
        // 窗口仍停留在原地址时直接聚焦，否则重新打开
        if (existing.location.href === absoluteUrl) {
          existing.focus()
          return true
        }
      } catch {
        // 跨域读取 location 会抛错，视为页面已变化
      }
      openedWindows.delete(url)
    }

    const win = window.open(url, '_blank')
    if (!win) {
      notify.warning(TOOL_PAGE.popupBlocked)
      return false
    }
    openedWindows.set(url, win)
    return true
  }

  return { openTool }
}

export default useOpenTool
