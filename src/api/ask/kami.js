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
 * @param {{card_no: string, user_id: number, tool_id: number}} data
 */
function activateCard(data) {
    return request.post(`${baseURL}/activateCard`, data)
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
    verifyCard,
    verifyCards,
}
