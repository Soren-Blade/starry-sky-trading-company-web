import request from '../request'

/**
 * 积分接口（阶段 P0）
 *
 * 契约见后端 `docs/API.md` §4.5–§4.9。同样遵守「不适用 = 键不存在」的约定：
 * 没有将过期的批次时，响应里**没有** `expire_soon` 这个键。
 */
const baseURL = '/pointsApi'

/** 积分账户：余额 / 折算 / 倍率 / 最近将过期 / 本年度构成 */
function getAccount() {
  return request.get(`${baseURL}/getAccount`)
}

/** 积分明细（分页 + 类型筛选） */
function getHistory(params) {
  return request.get(`${baseURL}/getHistory`, { params })
}

/**
 * 每日签到
 *
 * **不传日期**：服务端按 `Asia/Shanghai` 判定「今天」。客户端传日期会让
 * 「客户端时区与服务器不一致」变成一个 bug 来源，而签到恰恰是最在意这一点的地方。
 */
function checkin() {
  return request.post(`${baseURL}/checkin`)
}

/** 签到日历（不传 month 则当月） */
function getCheckinCalendar(params) {
  return request.get(`${baseURL}/getCheckinCalendar`, { params })
}

export { getAccount, getHistory, checkin, getCheckinCalendar }
