import { notify } from '@/hooks/useToast/index.js'
import { TOOL_PAGE } from '@/constants/index.js'
import { openToolUrl } from '@/api/ask/toolApi.js'

/**
 * 访问被拒错误码 → 提示文案。
 *
 * 工具地址的判定权在服务端：列表/详情接口对无权限者脱敏，`tool_path` 可能是空串，
 * 所以「打开」不能再只看 `tool.tool_path`，必须先向 `POST /toolApi/openTool` 换地址。
 */
const ACCESS_ERROR_TEXT = {
  TOOL_CARD_REQUIRED: TOOL_PAGE.accessCardRequired,
  TOOL_CARD_OR_MEMBER_REQUIRED: TOOL_PAGE.accessCardOrMember,
  TOOL_MEMBER_REQUIRED: TOOL_PAGE.accessMemberOnly,
  TOOL_UNAVAILABLE: TOOL_PAGE.accessUnavailable,
}

/**
 * 打开外部工具
 *
 * 从 `Tool.vue` 抽出来的：这段逻辑并不只是 `window.open` ——
 * 要处理未配置地址、非法地址、被浏览器拦截，还要记住已打开的窗口，
 * 避免同一工具点两次开出两个标签页。收藏页也要打开工具，
 * 逐处重写必然漏掉其中一条。
 *
 * 受控打开的顺序（顺序本身就是实现的一部分）：
 *   1. 先**同步** `window.open('', '_blank')` 占位 —— `await` 之后才开窗必被拦截；
 *   2. `await openToolUrl({ tool_id })` 由服务端判定策略并返回真实地址；
 *   3. 成功把占位窗口导航过去；失败关掉占位窗口并按错误码提示；
 *   4. 接口本身不可用（老服务端 / 404 / 网络错）时退回 `tool_path` 直接打开。
 *
 * 已打开窗口存在**闭包**里而不是模块级变量：每个调用方各自持有一份，
 * 组件卸载后引用随组件一起释放，不会长期驻留。
 *
 * `deps` 只给单测用（默认值就是线上行为）：不注入时它等价于改造前的
 * `useOpenTool()`，组件侧无需改动。注入点是「开窗」「取地址」「提示」「基准地址」
 * 四件事 —— 它们分别依赖浏览器窗口、网络、UI 层，只有拆开才能在没有浏览器的
 * Node 环境里验证「先占位再 await」「被拒时关窗」这类顺序性约束。
 *
 * @param {object} [deps]
 * @param {(options: {tool_id: number}) => Promise<any>} [deps.openToolUrl] 取真实地址（默认走接口）
 * @param {(payload: any) => {warning?: Function, error?: Function}} [deps.notify] 提示门面（默认全局 notify）
 * @param {(url?: string) => any} [deps.openWindow] 开窗（默认 window.open(url, '_blank')）
 * @param {string} [deps.baseUrl] 相对地址基准（默认 window.location.origin）
 */
export function useOpenTool(deps = {}) {
  const requestToolUrl = deps.openToolUrl || openToolUrl
  const toast = deps.notify || notify
  const openWindow =
    deps.openWindow ||
    ((url) => window.open(url, '_blank'))
  const baseUrl =
    deps.baseUrl ||
    (typeof window !== 'undefined' && window.location ? window.location.origin : '')

  /** tool key → { win, url }，用于复用已打开的窗口 */
  const openedWindows = new Map()

  /** 顺带清理已关闭的窗口引用 */
  const pruneClosed = () => {
    for (const [key, entry] of openedWindows) {
      if (!entry?.win || entry.win.closed) openedWindows.delete(key)
    }
  }

  const remember = (key, win, url) => openedWindows.set(key, { win, url })

  /** 复用已打开窗口：窗口仍停在原地址就聚焦，否则重新打开（跨域读不到 location 视为已变化） */
  const focusOpened = (key) => {
    const entry = openedWindows.get(key)
    if (!entry?.win || entry.win.closed) return false
    try {
      if (entry.win.location.href === entry.url) {
        entry.win.focus()
        return true
      }
    } catch {
      // 跨域读取 location 会抛错，视为页面已变化
    }
    openedWindows.delete(key)
    return false
  }

  /** 相对地址补全；非法地址返回空串 */
  const resolveUrl = (url) => {
    try {
      return new URL(url, baseUrl).href
    } catch {
      return ''
    }
  }

  /** 关掉占位窗口；浏览器拒绝 close 时忽略（后续提示照常给） */
  const closeQuietly = (win) => {
    try {
      win.close()
    } catch {
      // 忽略：close 失败不该遮住真正的错误提示
    }
  }

  /**
   * @param {object} tool 需要有 id；tool_path 可能因脱敏为空
   * @returns {Promise<boolean>} 是否成功打开（或聚焦到已有窗口）
   */
  const openTool = async (tool) => {
    const legacyUrl = typeof tool?.tool_path === 'string' ? tool.tool_path : ''
    const toolId = Number(tool?.id)
    const hasToolId = Number.isInteger(toolId) && toolId > 0
    const key = hasToolId ? `id:${toolId}` : `url:${legacyUrl}`

    pruneClosed()
    if (focusOpened(key)) return true

    // 没有 id 就走不了受控端点：完整退回改造前「直接打开 tool_path」的行为
    if (!hasToolId) {
      if (!legacyUrl) {
        toast.warning(TOOL_PAGE.missingPath)
        return false
      }
      const absoluteUrl = resolveUrl(legacyUrl)
      if (!absoluteUrl) {
        toast.error(TOOL_PAGE.invalidPath)
        return false
      }
      const win = openWindow(absoluteUrl)
      if (!win) {
        toast.warning(TOOL_PAGE.popupBlocked)
        return false
      }
      remember(key, win, absoluteUrl)
      return true
    }

    // 关键：必须在 await 之前同步开窗，否则弹窗被浏览器拦截
    const placeholder = openWindow('')
    if (!placeholder) {
      toast.warning(TOOL_PAGE.popupBlocked)
      return false
    }

    /** 接口不可用（老服务端 / 404 / 网络错）→ 退回 tool_path 直接打开 */
    const fallbackToLegacy = () => {
      if (placeholder.closed) return false
      if (!legacyUrl) {
        closeQuietly(placeholder)
        toast.warning(TOOL_PAGE.missingPath)
        return false
      }
      const absoluteUrl = resolveUrl(legacyUrl)
      if (!absoluteUrl) {
        closeQuietly(placeholder)
        toast.error(TOOL_PAGE.invalidPath)
        return false
      }
      placeholder.location.href = absoluteUrl
      remember(key, placeholder, absoluteUrl)
      return true
    }

    try {
      const payload = await requestToolUrl({ tool_id: toolId })
      const url = payload?.data?.url

      // 服务端说成功却没给地址：按「接口不可用」处理，尽量别让用户空等
      if (typeof url !== 'string' || !url) return fallbackToLegacy()

      const absoluteUrl = resolveUrl(url)
      if (!absoluteUrl) {
        closeQuietly(placeholder)
        toast.error(TOOL_PAGE.invalidPath)
        return false
      }

      // 用户可能在等待期间关掉了占位窗口，此时不要再操作它
      if (placeholder.closed) return false

      placeholder.location.href = absoluteUrl
      remember(key, placeholder, absoluteUrl)
      return true
    } catch (error) {
      // 被拒绝：关掉占位窗口，按错误码提示（响应里本来也没有地址可用）
      const text = ACCESS_ERROR_TEXT[error?.code]
      if (text) {
        closeQuietly(placeholder)
        toast.warning(text)
        return false
      }
      // 其余错误（网络/404/老服务端）才允许退回旧地址
      return fallbackToLegacy()
    }
  }

  return { openTool }
}

export default useOpenTool
