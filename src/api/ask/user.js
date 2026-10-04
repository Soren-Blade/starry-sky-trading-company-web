import request from '../request'

const baseURL = '/user'

// 游客登录：由后端按 IP 复用或新建游客账号，并通过响应头下发 token
function visitorLogin() {
    return request.post(`${baseURL}/visitorLogin`, {})
}

/**
 * 账号登录
 * @param {{login_type: 'username'|'email'|'phone', username?: string, email?: string, phone?: string, password: string}} payload
 */
function login(payload) {
    return request.post(`${baseURL}/login`, payload)
}

/**
 * 注册
 * @param {{username: string, email: string, password: string}} payload
 */
function register(payload) {
    return request.post(`${baseURL}/register`, payload)
}

// 刷新 token（一般由 request.js 的拦截器自动调用；这里导出便于手动排查）
function refreshToken() {
    return request.post(`${baseURL}/refreshToken`, {})
}

export default {
    visitorLogin,
    login,
    register,
    refreshToken,
}
