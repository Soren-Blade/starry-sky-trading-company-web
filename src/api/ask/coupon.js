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

export { getMine, claim }
