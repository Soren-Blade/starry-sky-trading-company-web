import request from '../request'

/**
 * 个人操作日志（服务端 `/userLogsApi`，2.1.0 起是「本人所有重要操作」的时间线）
 *
 * 服务端把 `user_events`（登录/注册等无主表可查的动作）与各业务主表（工具使用、下单、
 * 兑换卡密、收藏、加购、积分与成长值变动、签到、领券、开通会员）合并后按时间倒序返回，
 * 每行带 `category/action/outcome` 与对应中文 `*_label`。业务动作不双写，历史数据也能覆盖到。
 *
 * 与 `/userApi` 分成两套路径的原因：
 *   · `/userApi` 是「账号资料与凭据」的路由，日志导出属于旁路能力；
 *   · 它只接受「注册账号」的令牌（游客没有可导出的账号历史），
 *     守卫与 `/userApi` 不同，单独挂一个前缀比在 `/userApi` 内部再分级更清楚。
 *
 * 返回体是 CSV 时（`format=csv`）axios 的响应拦截器拿到的是 Blob，
 * 拿不到服务端的 JSON 信封 —— 调用方要自行判断 `instanceof Blob`。
 */
const baseURL = '/userLogsApi'

/**
 * 时间窗只有三档：服务端白名单，非法值会静默回落到 `30d`。
 * 不提供自由起止日期，是因为「查一次自己干过什么」用不到它，而校验成本不低。
 */
export const LOG_RANGES = [
    { value: '30d', label: '近一个月' },
    { value: '180d', label: '近半年' },
    { value: '365d', label: '近一年' },
]

/** 页面内预览用的 JSON 版本（最多 5000 条，服务端已按时间倒序） */
export function getMyLogs({ range = '30d' } = {}) {
    return request.get(`${baseURL}/`, { params: { range } })
}

/**
 * 下载 CSV。
 *
 * 请求里不设 `Content-Type`（GET 无 body），响应必须按 blob 取，
 * 否则 axios 会把 CSV 当字符串解析、中文在没有 BOM 信息的情况下被二次转码。
 */
export function downloadMyLogs({ range = '30d' } = {}) {
    return request.get(`${baseURL}/`, {
        params: { range, format: 'csv' },
        responseType: 'blob',
        // 导出可能比普通接口慢（5000 行 + 服务端拼 CSV），给足时间
        timeout: 30000,
    })
}

export default {
    LOG_RANGES,
    getMyLogs,
    downloadMyLogs,
}
