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

// 说明：这里**故意没有** refreshToken。
//
// 曾经有过一个 `request.post('/user/refreshToken', {})` 的实现，但它不带
// refresh token（请求拦截器只会填 access token），而服务端要求令牌 type 为
// 'refresh'，因此调用它必然 401。更糟的是 api/index.js 用 `...user` 展开时，
// 这个名字会**覆盖**掉 request.js 里正确的 refreshToken 实现。
//
// 唯一实现见 src/api/request.js 的 refreshToken（单飞 + 正确携带 refresh token）。

export default {
    visitorLogin,
    login,
    register,
}
