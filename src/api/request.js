// axios 实例：统一注入 token、解析响应信封、401 自动刷新重试
import axios from 'axios'

import { getAccessToken, setTokensFromHeaders, clearTokens } from '@/hooks/useToken'
import { refreshToken, isRefreshToken } from '@/hooks/useRefreshToken'

const baseURL = import.meta.env.VITE_API_BASE_URL

// 后端在上游数据源较慢时可能接近 10s，5s 会导致联调时频繁超时
const TIMEOUT = 15000

const requests = axios.create({
    baseURL,
    timeout: TIMEOUT,
    headers: {
        'Content-Type': 'application/json',
    },
})

// 请求拦截器：每次请求都从 localStorage 读取最新 token。
// 不能在 axios.create 时求值 —— 那样拿到的永远是模块加载时的 null。
requests.interceptors.request.use((config) => {
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

// 响应拦截器
requests.interceptors.response.use(
    async (res) => {
        // 后端通过 Access-Token / Refresh-Token 响应头下发 token
        setTokensFromHeaders(res.headers)

        const body = res.data

        // 未授权且不是刷新请求本身 → 尝试刷新一次再重放
        if (body && body.code === 401 && !isRefreshToken(res.config)) {
            const refreshed = await refreshToken()

            if (refreshed && refreshed.success === true) {
                // 用新 token 重放原请求（去掉旧的 Authorization，交给请求拦截器重设）
                const retryConfig = { ...res.config }
                delete retryConfig.headers?.Authorization
                return requests.request(retryConfig)
            }

            // 刷新失败：清理凭据并通知上层跳转登录
            clearTokens()
            if (typeof onAuthExpired === 'function') {
                onAuthExpired()
            }
            return Promise.reject(new Error(body.message || '登录状态已失效，请重新登录'))
        }

        // 统一返回服务端 JSON 报文（调用方拿到的是 body，不是 axios response）
        return body
    },
    (error) => {
        // 把服务端的错误信息透传出去，而不是压成 'faile'
        const status = error?.response?.status
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
