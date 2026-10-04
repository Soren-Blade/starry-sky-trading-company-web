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

export default {
    getTools,
    getToolClasses,
    getTool,
    getAppleIds,
}
