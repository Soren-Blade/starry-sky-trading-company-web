// axios 实例：统一注入 token、解析响应信封、401 自动刷新重试
import axios from 'axios'

import { getAccessToken, getRefreshToken, clearTokens, setTokensFromHeaders, getAccessTokenRemainingMs } from '@/hooks/useToken'

const baseURL = import.meta.env.VITE_API_BASE_URL

// 后端在上游数据源较慢时可能接近 10s，5s 会导致联调时频繁超时
const TIMEOUT = 15000
const REFRESH_TIMEOUT = 15000

/**
 * 提前多久刷新。
 *
 * 取 30 秒：足够覆盖一次网络往返与客户端时钟的小幅偏差，
 * 又远小于 access token 自身寿命（180 秒），不会变成「每请求都刷新」。
 */
const REFRESH_SKEW_MS = 30 * 1000

/**
 * 刷新失败后的冷却时间。
 *
 * 必须要有：主动刷新失败后若不停手，紧接着的 401 会再触发一次刷新，
 * 一次网络抖动就变成「主动刷新 → 请求 401 → 再刷新 → 再失败」的四趟往返。
 * 冷却期内 `refreshToken()` 直接返回上次的失败结果，不再发请求。
 */
const REFRESH_FAIL_COOLDOWN_MS = 5 * 1000

const requests = axios.create({
    baseURL,
    timeout: TIMEOUT,
    headers: {
        'Content-Type': 'application/json',
    },
})

// ── 刷新状态（单飞 + 失败冷却）──────────────────────────────────
// 刻意放在本模块内（而不是单独的 hook 模块），原因有两点：
//   1. 它需要用到上面这个 axios 实例；若放在另一个模块里 import 本实例，
//      会形成「本模块 import 它、它 import 本模块」的循环依赖。
//   2. 单飞状态与实例同生命周期，更容易推理；
//      分离模块会让状态在测试与热更新时难以重置。
//
// 无论成功还是失败都必须 settle —— 早期实现用 new Promise(async (resolve) => ...)
// 且从不 reject，刷新失败时 await 会永久挂起，UI 卡死且无任何报错。
let inflight = null

/** 上次刷新失败的时间戳（0 表示没有失败记录），用于冷却 */
let lastRefreshFailureAt = 0

/** 仅测试用：重置刷新状态，避免用例之间互相影响 */
export function __resetRefreshState() {
    inflight = null
    lastRefreshFailureAt = 0
}

// 请求拦截器：每次请求都从 localStorage 读取最新 token。
// 不能在 axios.create 时求值 —— 那样拿到的永远是模块加载时的 null。
//
// **关键：调用方显式设置的 Authorization 必须优先。**
// 刷新 token 的请求会自己带上 `Bearer <refresh token>`；如果这里无条件覆盖，
// 它会变成 `Bearer <access token>`，服务端据此走的是 access 分支校验，
// 刷新必然失败（实测确认 —— 请求日志里刷新请求带的是 access token）。
requests.interceptors.request.use(async (config) => {
    const alreadySet = Boolean(config.headers?.Authorization || config.headers?.authorization)
    if (alreadySet) return config

    // ── 主动刷新：别带着一个即将过期的 token 出门 ──────────────────
    //
    // 被动刷新（只在收到 401 时刷新）的代价是每次过期都要白跑一趟：
    //   请求 → 401 → 刷新 → 重放         共 3 个请求，第一个纯浪费
    // 而且那个请求的延迟翻倍（多了一整轮往返）。提前在本地判断
    // （读 JWT 的 exp，不发请求）就能把这一趟省掉。
    //
    // 两处刻意的设计：
    //   · **懒判断**而不是定时器：只有真要发请求时才检查，
    //     后台标签页因此不产生任何刷新流量（不需要 visibilitychange 逻辑）。
    //   · 失败不阻断本次请求：仍照常发出去，由下面的 401 兜底路径处理。
    //     主动刷新只是「优化」，不应该成为新的失败点。
    const remaining = getAccessTokenRemainingMs()
    const needsRefresh = remaining !== null && remaining < REFRESH_SKEW_MS
    if (needsRefresh && getRefreshToken()) {
        await refreshToken()
    }

    const accessToken = getAccessToken()
    if (accessToken) {
        config.headers.Authorization = `Bearer ${accessToken}`
    }
    return config
})

// 刷新失败后的回调由外部注入（避免 request 层直接依赖 router/store）
let onAuthExpired = null
export function setAuthExpiredHandler(handler) {
    onAuthExpired = handler
}

// ── 单飞刷新 ────────────────────────────────────────────────────
// 并发 401（以及并发「主动刷新」）只会触发一次刷新请求。
// 状态（inflight / lastRefreshFailureAt）声明在**请求拦截器之前**，
// 因为拦截器里就要用到 refreshToken。
//
// 无论成功还是失败都必须 settle —— 早期实现用 new Promise(async (resolve) => ...)
// 且从不 reject，刷新失败时 await 会永久挂起，UI 卡死且无任何报错。

/**
 * 用 refresh token 换取新的 token 对。
 * @returns {Promise<{success: boolean, message?: string}>} 永不抛异常
 */
export function refreshToken() {
    if (inflight) return inflight

    // 冷却期内直接返回失败，不再发请求（见 REFRESH_FAIL_COOLDOWN_MS 的说明）
    const sinceFailure = Date.now() - lastRefreshFailureAt
    if (lastRefreshFailureAt && sinceFailure < REFRESH_FAIL_COOLDOWN_MS) {
        return Promise.resolve({ success: false, message: '刷新失败，请稍后重试' })
    }

    const refresh = getRefreshToken()
    if (!refresh) {
        return Promise.resolve({ success: false, message: '缺少刷新凭据' })
    }

    inflight = requests({
        method: 'post',
        // 必须带前导斜杠：baseURL 在 dev 下为空，此时 axios 原样透传该地址，
        // 浏览器按**当前文档路径**解析相对地址 —— 在 /user/kami 上会变成
        // /user/user/refreshToken（不命中任何代理规则 → 404 → 静默登出）。
        url: '/user/refreshToken',
        headers: {
            // 后端同时兼容 "Bearer <token>" 与裸 token，这里统一带上前缀
            Authorization: `Bearer ${refresh}`,
        },
        timeout: REFRESH_TIMEOUT,
        __isRefreshToken: true, // 标记：错误处理器据此避免递归刷新
    })
        .then((result) => {
            const ok = Boolean(result && result.success === true)
            // 成功要清掉失败记录，否则冷却期会把一次成功后紧接着的刷新挡掉
            lastRefreshFailureAt = ok ? 0 : Date.now()
            return result || { success: false, message: '刷新失败' }
        })
        .catch((error) => {
            lastRefreshFailureAt = Date.now()
            return {
                success: false,
                message: error?.message || '刷新 token 失败',
            }
        })
        .finally(() => {
            inflight = null
        })

    return inflight
}

/** 判断是否是刷新 token 自身的请求 */
export function isRefreshToken(config) {
    return Boolean(config?.__isRefreshToken)
}

/**
 * 判断响应体是否表示「未授权」。
 * 兼容两种约定：code 为数字 401，或为字符串 'UNAUTHORIZED'。
 */
function isUnauthorizedBody(body) {
    if (!body || typeof body !== 'object') return false
    return body.code === 401 || body.code === 'UNAUTHORIZED'
}

/**
 * 尝试刷新 token 并重放请求。
 *
 * **必须防止无限重试**：重放后的请求如果再次返回 401（例如服务端持续拒绝），
 * 不能再触发一轮刷新，否则会形成 refresh → replay → 401 → refresh … 的死循环
 * （实测会挂死）。这里给重放请求打上 __isRetry 标记，拦截器据此只放行一次。
 *
 * @param {object} config 原始请求配置
 * @returns {Promise<any|null>} 成功时返回重放结果；失败时返回 null
 */
async function tryRefreshAndReplay(config) {
    if (config.__isRetry) return null

    const refreshed = await refreshToken()

    if (refreshed && refreshed.success === true) {
        const retryConfig = { ...config, __isRetry: true }
        if (retryConfig.headers) {
            // AxiosHeaders 实例要用 delete 方法；普通对象直接删属性
            if (typeof retryConfig.headers.delete === 'function') {
                retryConfig.headers.delete('Authorization')
            } else {
                delete retryConfig.headers.Authorization
            }
        }
        return requests.request(retryConfig)
    }

    // 刷新失败。只有在「本来持有会话」时才算登录态失效：
    // 匿名访客（从未拿到过 token）遇到 401 不是会话过期，触发跳转会把
    // 深链访问悄悄带回首页 —— 调用方自己会拿到失败结果并给出提示即可。
    const hadSession = Boolean(getRefreshToken() || getAccessToken())

    clearTokens()
    if (hadSession && typeof onAuthExpired === 'function') {
        onAuthExpired()
    }
    return null
}

// 响应拦截器
requests.interceptors.response.use(
    async (res) => {
        // 后端通过 Access-Token / Refresh-Token 响应头下发 token
        const issued = setTokensFromHeaders(res.headers)

        // 拿到了新签发的凭据（通常是刚登录）：把刷新失败记录清掉。
        // 否则「登录失败几次 → 立刻重新登录成功」会因为还在冷却期内，
        // 让第一次刷新被无谓地挡掉。
        if (issued?.accessToken) {
            lastRefreshFailureAt = 0
        }

        const body = res.data

        // 少数情况下后端会把 401 放在 200 响应体里（约定是 HTTP 状态码，
        // 但历史实现存在这种形态），因此这里保留同一套处理。
        // 真正的 401 由下面的错误处理器负责 —— axios 默认 reject 4xx/5xx。
        if (isUnauthorizedBody(body) && !isRefreshToken(res.config) && !res.config.__isRetry) {
            const recovered = await tryRefreshAndReplay(res.config)
            if (recovered) return recovered
        }

        // 统一返回服务端 JSON 报文（调用方拿到的是 body，不是 axios response）
        return body
    },
    async (error) => {
        const status = error?.response?.status
        const originalConfig = error?.config

        // ── 401 自动刷新并重放 ─────────────────────────────────
        // 必须在**错误处理器**里做：axios 的 validateStatus 默认对所有 4xx/5xx
        // 返回 false，因此 401 会 reject 到这里。此前这段逻辑写在成功回调里
        // 判断 body.code === 401，而那个分支永远不可达 ——
        // 也就是说「access token 过期自动续期」从未生效过：
        // 用户会直接被登出，而不是静默刷新。
        //
        // !originalConfig.__isRetry 是必需的：否则「刷新成功但服务端仍返回 401」时
        // 会形成 refresh → replay → 401 → refresh 的死循环（实测会挂死）。
        if (
            status === 401 &&
            originalConfig &&
            !isRefreshToken(originalConfig) &&
            !originalConfig.__isRetry
        ) {
            const recovered = await tryRefreshAndReplay(originalConfig)
            if (recovered) return recovered
        }

        // 把服务端的错误信息透传出去，而不是压成 'faile'
        const serverMessage = error?.response?.data?.message
        const message =
            serverMessage ||
            (error?.code === 'ECONNABORTED'
                ? `请求超时（${TIMEOUT / 1000}s），请稍后重试`
                : error?.message) ||
            '网络请求失败'

        const wrapped = new Error(message)
        wrapped.status = status
        wrapped.code = error?.response?.data?.code
        wrapped.raw = error
        return Promise.reject(wrapped)
    }
)

export default requests
