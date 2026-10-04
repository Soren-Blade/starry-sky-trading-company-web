// 刷新 access token
//
// 关键点：
// 1. 用「单飞」promise 去重：并发 401 只会触发一次刷新请求。
// 2. 必须在成功与失败两条路径上都 settle —— 原实现用
//    new Promise(async (resolve) => ...) 且从不 reject，
//    刷新失败时 await 会永久挂起，UI 卡死且没有任何报错。
import request from '@/api/request'
import { getRefreshToken } from '@/hooks/useToken'

const REFRESH_TIMEOUT = 15000

let inflight = null

/**
 * 用 refresh token 换取新的 token 对
 * @returns {Promise<{success: boolean, message?: string}>} 永不抛异常，失败时返回 success:false
 */
export function refreshToken() {
    // 已有进行中的刷新请求，直接复用
    if (inflight) return inflight

    const refresh = getRefreshToken()

    if (!refresh) {
        return Promise.resolve({ success: false, message: '缺少刷新凭据' })
    }

    inflight = request({
        method: 'post',
        url: 'user/refreshToken',
        headers: {
            // 后端同时兼容 "Bearer <token>" 与裸 token，这里统一带上前缀
            Authorization: `Bearer ${refresh}`,
        },
        timeout: REFRESH_TIMEOUT,
        __isRefreshToken: true, // 标记：响应拦截器据此避免递归刷新
    })
        .then((result) => result || { success: false, message: '刷新失败' })
        .catch((error) => ({
            success: false,
            message: error?.message || '刷新 token 失败',
        }))
        .finally(() => {
            inflight = null
        })

    return inflight
}

// 判断是否是刷新 token 自身的请求
export function isRefreshToken(config) {
    return Boolean(config?.__isRefreshToken)
}
