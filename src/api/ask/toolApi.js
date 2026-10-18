import request from '../request'

const baseURL = '/toolApi'

/**
 * 获取工具列表
 * @param {Record<string, unknown>} [params] 查询参数（page/limit/class/keyword/sort_by...）
 *
 * 注意 axios 的第二个参数是 config，查询参数必须放在 { params } 里，
 * 否则会被当成配置对象、参数根本不会拼到 URL 上。
 */
function getTools(params = {}) {
    return request.get(`${baseURL}/getTools`, { params })
}

// 获取工具分类聚合
function getToolClasses() {
    return request.get(`${baseURL}/getToolClasses`)
}

/**
 * 获取单个工具详情
 * @param {string|number} idOrSlug
 */
function getTool(idOrSlug) {
    return request.get(`${baseURL}/getTool/${idOrSlug}`)
}

// 获取共享苹果ID列表
function getAppleIds() {
    return request.get(`${baseURL}/getAppleIds`)
}

/**
 * 上报一次工具操作，用于留痕（谁、何时、用了哪个工具、成没成）。
 *
 * 端点是**公开**的（`/toolApi/usage` 挂在鉴权链之前，见 server 的
 * `src/router/toolUsage.js`），返回 202；令牌存在且有效时服务端自动绑定用户，
 * 游客则记为匿名。调用方一律 catch 掉失败 —— 留痕不能影响工具本身。
 *
 * 单独 5s 超时：后端慢时不该让用户等一次「日志上报」。
 */
function reportToolUsage(payload) {
    return request.post(`${baseURL}/usage`, payload, { timeout: 5000 })
}

export default {
    getTools,
    getToolClasses,
    getTool,
    getAppleIds,
    reportToolUsage,
}
