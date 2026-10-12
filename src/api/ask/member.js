import request from '../request'

/**
 * 会员接口（阶段 P0）
 *
 * 契约见后端 `docs/API.md` §4.1 / §4.2。
 *
 * ⚠ **响应里「不适用」的字段是「键不存在」，不是 0 也不是 null。**
 * 后端对非会员不下发 `points` / `coupons` / `days_left` / `growth_to_next` 等键，
 * 因为前端判断的是「字段有没有值」，而 `0` 会被判为有值 —— 那会渲染出
 * 「0 积分」「会员还剩 0 天」。因此取值一律用 `?? 默认值` 兜，
 * **不要用 `=== 0` 判断「没有」**。
 */
const baseURL = '/memberApi'

/** 会员中心总览（唯一数据源） */
function getOverview() {
  return request.get(`${baseURL}/getOverview`)
}

/** 套餐列表 + 等级对照 + 当前等级标记 */
function getPlans() {
  return request.get(`${baseURL}/getPlans`)
}

export { getOverview, getPlans }
