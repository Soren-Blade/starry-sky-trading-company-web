import api from '@/api/index'

/**
 * 工具操作留痕
 *
 * 为什么要有这个 hook：工具页里绝大多数计算**完全在浏览器里完成**（哈希、
 * 格式化、正则、进制……），一次操作不产生任何 HTTP 请求，于是运营完全看不到
 * 「哪个工具真的有人用、失败多不多」。这里在工具操作结束时报一条极轻的
 * 使用记录（`POST /toolApi/usage`，返回 202），身份由服务端按令牌自行绑定。
 *
 * 三条使用约定：
 *   1. **只报用户主动发起的一次操作**（生成/解析/转换/导出），不报视图切换、
 *      不报输入框每一次按键 —— 留痕表是给运营看趋势的，不是行为埋点。
 *   2. **失败也要报**，且必须带一个稳定的 `errorCode`（大写下划线），否则
 *      「哪类失败最多」这个问题就答不了；服务端的库还要求失败行必须有错误码。
 *   3. **绝不影响工具本身**：上报是 fire-and-forget，任何异常都被吞掉；
 *      断网、后端 500、被限流（429）都不该让工具报错。
 *
 * 用法：
 * ```js
 * const usage = useToolUsage('/dev/hash')
 *
 * function run() {
 *   const startedAt = performance.now()
 *   try {
 *     ...计算...
 *     usage.record({ durationMs: performance.now() - startedAt, meta: { algorithm } })
 *   } catch (e) {
 *     usage.record({ ok: false, errorCode: 'HASH_UNSUPPORTED', durationMs: ... })
 *   }
 * }
 * ```
 *
 * @param {string} toolPath 工具页路径，如 `/dev/hash`（同时也是 TOOL_PAGES 的键）
 * @param {{ action?: string, mode?: 'A'|'B'|'C'|'D' }} [options]
 */

/**
 * 把路径变成稳定的工具标识：`/dev/cron` → `dev-cron`。
 *
 * 为什么不用数据库里的 `tool_slug`：那 28 个 slug 还躺在 `outputs/tools-register.sql`
 * 这份**未执行**的草稿里，库里可能根本没有这些行；而路径是前端唯一稳定的事实来源。
 * 运营侧的归并口径用 `tool_path` 列（`toolPath` 字段），两者都记。
 */
export function toolKeyOf(toolPath) {
  return String(toolPath || '')
    .replace(/^\/+/, '')
    .replace(/\/+/g, '-')
    .replace(/[^a-z0-9_-]/gi, '')
    .toLowerCase()
}

/** 分类取路径首段：`/dev/cron` → `dev` */
export function toolClassOf(toolPath) {
  const segment = String(toolPath || '').replace(/^\/+/, '').split('/')[0]
  return /^[a-z][a-z0-9-]*$/i.test(segment) ? segment.toLowerCase() : undefined
}

export function useToolUsage(toolPath, options = {}) {
  const toolKey = toolKeyOf(toolPath)
  const toolClass = toolClassOf(toolPath)
  const defaultAction = options.action || 'run'
  const defaultMode = options.mode

  /**
   * 上报一次操作。**永不抛错、永不返回 Promise** —— 调用方不需要 await，
   * 也不该因为上报而改变自己的控制流。
   *
   * @param {{ action?: string, mode?: string, durationMs?: number, ok?: boolean,
   *   errorCode?: string, meta?: Record<string, string|number|boolean> }} [detail]
   */
  function record(detail = {}) {
    if (!toolKey) return

    const payload = {
      toolKey,
      toolPath,
      toolClass,
      action: detail.action || defaultAction,
      mode: detail.mode || defaultMode,
      durationMs: Math.max(0, Math.round(Number(detail.durationMs) || 0)),
      ok: detail.ok !== false,
      errorCode: detail.ok === false ? detail.errorCode : undefined,
      meta: detail.meta && typeof detail.meta === 'object' ? detail.meta : undefined,
    }

    try {
      const pending = api.reportToolUsage(payload)
      // 响应拦截器在非 2xx 时会 reject；这里全部吞掉（见文件头的第 3 条约定）
      if (pending && typeof pending.catch === 'function') pending.catch(() => {})
    } catch (error) {
      // api 层同步抛错（例如模块加载失败）同样不该冒泡到页面
    }
  }

  return { record }
}

export default useToolUsage
