import request from '../request'

/**
 * 优惠券接口（阶段 P0）
 *
 * 契约见后端 `docs/API.md` §4.12 / §4.14。
 *
 * 「已过期」是**服务端派生**的状态（库里只有 available / used），
 * 因此前端一律用响应里的 `status`，不要自己拿 `expires_at` 与当前时间比 ——
 * 两边各判一次，迟早会出现「页面说可用、下单时被拒」。
 */
const baseURL = '/couponApi'

/** 我的优惠券（status: all / available / used / expired） */
function getMine(params) {
  return request.get(`${baseURL}/getMine`, { params })
}

/**
 * 领券
 *
 * 业务失败用 409：`ALREADY_CLAIMED`（已领过）、`SOLD_OUT`（领完）、
 * `MEMBER_ONLY`（会员专属）；模板不存在用 404。
 * 调用方应把 `message` 直接展示给用户，不必自己编一套说法。
 */
function claim(templateId) {
  return request.post(`${baseURL}/claim`, { template_id: templateId })
}

/**
 * 下单可用券（§4.13，1.5.0 M1）
 *
 * `amount` 是订单原价（判定门槛）；`productIds` 是**契约之外新增**的参数
 * （逗号分隔的商品 id），不传时服务端不做范围判定 —— 券带 `scope` 时
 * 就无法判定「不适用于本单商品」。
 *
 * **不可用的券也返回**（带 `selectable: false` 与 `reason`）：用户需要知道
 * 「我有券但为什么不能用」。
 */
function getAvailable({ amount, productIds } = {}) {
  const params = { amount }
  if (productIds) params.product_ids = productIds
  return request.get(`${baseURL}/getAvailable`, { params })
}

/**
 * 结算试算（§4.15，1.5.0 M1）
 *
 * 与 `POST /orderApi/createOrder` 调用**同一个**库内函数 `sstc.preview_order_amount()`，
 * 因此「试算多少，下单就扣多少」。失败时 `code` 在响应顶层、`details` 在顶层
 * （与下单接口完全一致，可用同一段错误处理）。
 */
function previewUse(payload) {
  return request.post(`${baseURL}/previewUse`, payload)
}

export { getMine, claim, getAvailable, previewUse }
