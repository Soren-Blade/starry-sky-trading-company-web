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

/**
 * 积分商城清单（1.5.0 M3，契约 §4.10）
 *
 * 清单是服务端常量，**库存每次实时读库**（`stock: null` = 不限量，`0` = 已兑完）。
 * `icon` 是 AppIcon 的图标名，不是 emoji。
 */
function getMallItems() {
  return request.get(`${baseURL}/getMallItems`)
}

/**
 * 兑换商城条目（1.5.0 M3，契约 §4.11）
 *
 * 券类即时发券（`coupon` 有值、`order_no` 为 null）；实物类生成 0 元兑换单
 * （`order_no` 有值、`coupon` 为 null）。失败码：`ITEM_NOT_FOUND` 404、
 * `MEMBER_ONLY` 403、`OUT_OF_STOCK` 409、`POINTS_NOT_ENOUGH` 409（带 `details.shortage`）。
 */
function redeem(itemId) {
  return request.post(`${baseURL}/redeem`, { item_id: itemId })
}

/**
 * 补签（1.5.0 M4，契约 §4.8）
 *
 * **必须传日期**（与签到相反）：补的就是某一天。服务端只接受
 * 「本月的、已经过去的、还没签到的」日子，跨月与未来都算参数错误。
 * 失败码：`CHECKIN_DATE_INVALID` 400、`ALREADY_CHECKED` 409、
 * `REPLENISH_LIMIT` 409、`POINTS_NOT_ENOUGH` 409（带 `details.shortage`）。
 */
function replenishCheckin(date) {
  return request.post(`${baseURL}/replenishCheckin`, { date })
}

export {
  getAccount,
  getHistory,
  checkin,
  getCheckinCalendar,
  getMallItems,
  redeem,
  replenishCheckin,
}
