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
 * 受控打开工具：由服务端判定访问策略并返回真实地址。
 *
 * 工具地址不再由前端直接使用（服务端的列表/详情接口会对无权限者脱敏），
 * 打开前必须先问这里；被拒绝时响应里没有 url，只有错误码：
 * TOOL_CARD_REQUIRED / TOOL_CARD_OR_MEMBER_REQUIRED / TOOL_MEMBER_REQUIRED / TOOL_UNAVAILABLE。
 *
 * @param {{ tool_id?: number|string, tool_slug?: string }} payload
 */
export function openToolUrl(payload) {
    return request.post(`${baseURL}/openTool`, payload)
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

// ── 网络工具（必须走服务端代理）──────────────────────────────────
//
// 这三件事浏览器做不到，所以只能问服务端：
//   · 公网 IP：浏览器知道自己能上网，但不知道出口 IP；
//   · DNS：没有浏览器 API，且必须由服务端代查才不受 CORS 限制；
//   · 目标站响应头 / OG：跨域 HEAD/GET 会被 CORS 拦掉，页面也读不到对方 HTML。
//
// 接口正在并行开发、**可能尚未部署**，因此统一给较短超时，并在调用方
// （NetKit / ShareKit）catch 后降级成「后端未部署」提示 —— 绝不冒泡成页面报错。
function getNetIp() {
    return request.get(`${baseURL}/net/ip`, { timeout: 8000 })
}

/**
 * @param {string} name 域名
 * @param {string} [type] 记录类型 A/AAAA/CNAME/MX/NS/TXT
 */
function getNetDns(name, type = 'A') {
    return request.get(`${baseURL}/net/dns`, { params: { name, type }, timeout: 10000 })
}

/** @param {string} url 目标地址（含协议） */
function getNetHeaders(url) {
    return request.get(`${baseURL}/net/headers`, { params: { url }, timeout: 10000 })
}

/** @param {string} url 目标地址（含协议） */
function getNetOg(url) {
    return request.get(`${baseURL}/net/og`, { params: { url }, timeout: 10000 })
}

/** 短链：失败即代表服务未部署，调用方回退展示原始链接 */
function createShortLink(url) {
    return request.post(`${baseURL}/shortlink`, { url }, { timeout: 8000 })
}

export default {
    getTools,
    getToolClasses,
    getTool,
    getAppleIds,
    openToolUrl,
    reportToolUsage,
    getNetIp,
    getNetDns,
    getNetHeaders,
    getNetOg,
    createShortLink,
}
