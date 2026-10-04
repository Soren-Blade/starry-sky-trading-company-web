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

/**
 * 上传头像
 *
 * 传的是 base64 data URL 而不是 multipart —— 服务端走的是普通的
 * `express.json()`，因此不需要 multipart 解析器。前端会先在 canvas 上
 * 把图缩到 256px 再编码，载荷通常 10–25 KB。
 *
 * 成功返回 `data.avatar_url`（形如 `/uploads/avatars/u42-....webp`），
 * 需要经 `resolveAssetUrl` 解析后才能放进 `<img src>`。
 *
 * @param {{image: string}} payload image 必须是 `data:image/...;base64,` 开头的字符串
 */
function uploadAvatar(payload) {
    return request.post(`${baseURL}/avatar`, payload)
}

export default {
    getUserInfo,
    updateProfile,
    uploadAvatar,
}
