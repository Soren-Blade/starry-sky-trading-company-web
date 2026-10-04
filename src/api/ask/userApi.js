import request from '../request'
const baseURL = '/userApi'

// 获取用户信息
function getUserInfo() {
    return request.get(`${baseURL}/getUserInfo`)
}

/**
 * 修改个人资料
 *
 * 只支持昵称 / 头像 / 性别 / 生日四个字段 —— 用户名、邮箱、手机号都是登录凭据，
 * 改它们需要验证码或旧密码确认；服务端也只认这四个（其余键会被丢弃）。
 *
 * 传 `null` 或空串表示清空该字段。
 *
 * @param {{nickname?: string, avatar_url?: string|null, gender?: string|null, birthday?: string|null}} patch
 */
function updateProfile(patch) {
    return request.put(`${baseURL}/profile`, patch)
}

export default {
    getUserInfo,
    updateProfile,
}
