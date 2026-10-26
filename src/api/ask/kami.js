import request from '../request'

const baseURL = '/kamiApi'

/**
 * 获取卡密列表
 * @param {string|number} userId 目标用户 id（后端会校验必须与登录身份一致）
 * @param {{page?: number, limit?: number, status?: string, card_type?: string, tool_id?: number}} [params]
 *
 * 约定：调用方传「裸」查询参数，由这里统一包成 axios 的 { params }。
 * 之前调用方自己又包了一层，导致实际请求变成 ?params[page]=1，后端读不到。
 */
function getUserCards(userId, params = {}) {
    return request.get(`${baseURL}/getUserCards/${userId}`, { params })
}

/**
 * 激活卡密
 *
 * `tool_id` **可选**：积分卡（card_type = 'points'）不解锁工具，不需要传。
 * 工具卡缺工具时服务端返回 400 USE_CARD_FAILED（提示「请选择要激活的工具」），
 * 且**不消耗卡密**，用户补选工具后可以再试。
 *
 * 成功时 data 就是卡密信息（含 card_no / card_value / card_type / entitlement_expires_at）；
 * 按面值兑奖的发放额在 `data.points_granted`（仅积分卡）与 `data.growth_granted`
 * 两个键上 —— **不适用时这两个键不存在**，不要用 `> 0` 判断。
 *
 * @param {{card_no: string, user_id: number, tool_id?: number}} data
 */
function activateCard(data) {
    return request.post(`${baseURL}/activateCard`, data)
}

/**
 * 按卡密号查询它绑定的工具（粘贴卡密后自动识别用）
 *
 * 只读取卡密的元信息，**不消耗**卡密、不改变激活状态。
 * 服务端返回 `{ success: true, data: { tool_id, card_type, status, valid_until, masked_no } }`；
 * `tool_id` 可能为 null（积分卡等不绑定工具的卡密）。
 *
 * 调用方负责静默：查询失败（400/404/网络）不应打断用户正在进行的输入。
 *
 * @param {string} cardNo 完整卡密号
 */
function lookupCard(cardNo) {
    return request.post(`${baseURL}/lookupCard`, { card_no: cardNo })
}

/**
 * 当前登录会员的免卡密激活额度（身份取自 JWT，不接受传 user_id）
 *
 * 返回 data: { is_member, level, level_name, quota, used, remaining, unlimited, expires_at }。
 * 非会员也会正常返回（is_member = false），前端据此显示开通引导而不是隐藏入口。
 */
function getMemberQuota() {
    return request.get(`${baseURL}/memberQuota`)
}

/**
 * 会员免卡密激活工具
 *
 * `user_uuid` 可选：留空时服务端按 JWT 身份校验；填了则同时校验标识与
 * 当前账号一致（不一致返回 403 USER_UUID_MISMATCH）。
 *
 * 成功时 data: { tool_id, remaining, unlimited, expires_at }。
 *
 * @param {{tool_id: number, user_uuid?: string}} data
 */
function activateByMember(data) {
    return request.post(`${baseURL}/activateByMember`, data)
}

/**
 * 验证单个卡密
 * @param {{card_no: string, user_id: number, tool_id: number}} data
 */
function verifyCard(data) {
    return request.post(`${baseURL}/verifyCard`, data)
}

/**
 * 批量验证卡密
 * @param {{card_nos: string[], user_id: number, tool_id: number}} data
 */
function verifyCards(data) {
    return request.post(`${baseURL}/verifyCards`, data)
}

/**
 * 我的工具授权列表（身份取自后端 JWT，不接受传 user_id）
 *
 * 与 getUserCards 的区别：那个回答「我兑换过哪些卡」，这个回答
 * **「我现在能不能用某件工具」**。卡兑换过但授权已过期时，卡列表里仍有这张卡，
 * 工具却已不能用 —— 所以工具页读这个，不读卡列表。
 *
 * 返回 data.entitlements[] 与 data.valid_tool_ids[]。
 */
function getMyEntitlements() {
    return request.get(`${baseURL}/myEntitlements`)
}

export default {
    getUserCards,
    getMyEntitlements,
    activateCard,
    lookupCard,
    getMemberQuota,
    activateByMember,
    verifyCard,
    verifyCards,
}
