// token 的本地存储读写
//
// 存储位置说明：
// - access token 放 localStorage：刷新页面后仍保持登录态。
// - refresh token 放 sessionStorage：关闭标签页即失效，缩小长效凭据的暴露窗口。
//
// 注意：localStorage/sessionStorage 都无法防御 XSS。彻底方案是让后端改用
// httpOnly Cookie 下发 refresh token，那需要后端配合，属于后续演进项。

const ACCESS_KEY = 'ACCESS_TOKEN'
const REFRESH_KEY = 'REFRESH_TOKEN'

function safeGet(storage, key) {
    try {
        return storage.getItem(key)
    } catch {
        return null
    }
}

function safeSet(storage, key, value) {
    try {
        if (value) storage.setItem(key, value)
        else storage.removeItem(key)
    } catch {
        /* 隐私模式下可能不可写，静默降级 */
    }
}

export function getAccessToken() {
    return safeGet(localStorage, ACCESS_KEY)
}

export function setAccessToken(token) {
    safeSet(localStorage, ACCESS_KEY, token)
}

export function getRefreshToken() {
    return safeGet(sessionStorage, REFRESH_KEY) || safeGet(localStorage, REFRESH_KEY)
}

export function setRefreshToken(token) {
    // 迁移旧版本遗留在 localStorage 的值
    safeSet(localStorage, REFRESH_KEY, '')
    safeSet(sessionStorage, REFRESH_KEY, token)
}

export function clearTokens() {
    safeSet(localStorage, ACCESS_KEY, '')
    safeSet(localStorage, REFRESH_KEY, '')
    safeSet(sessionStorage, REFRESH_KEY, '')
}

/**
 * 从响应头里提取并保存 token。
 * 后端下发的头名是 Access-Token / Refresh-Token（见 server/src/utils/index.js 的 TOKEN_HEADERS）。
 * axios 会把响应头键名小写化，因此这里统一按小写读取。
 * @param {Record<string, string>} headers
 * @returns {{ accessToken?: string, refreshToken?: string }}
 */
export function setTokensFromHeaders(headers) {
    if (!headers) return {}

    const accessToken = headers['access-token']
    const refreshToken = headers['refresh-token']

    if (accessToken) setAccessToken(accessToken)
    if (refreshToken) setRefreshToken(refreshToken)

    return { accessToken, refreshToken }
}
