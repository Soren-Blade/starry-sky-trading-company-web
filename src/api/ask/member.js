import request from '../request'

/**
 * 会员接口（阶段 P0）
 *
 * 契约见后端 `docs/API.md` §4.1 / §4.2 / §4.3。
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

/**
 * 成长值明细 + 进阶 + 来源说明（成长值页的唯一数据源）
 *
 * 满级时后端**不下发** `next_level` / `next_level_name` / `next_level_threshold` /
 * `growth_to_next` 四个键（不是给 0），页面判的是 `!== undefined`。
 */
function getGrowthHistory(params = {}) {
  return request.get(`${baseURL}/getGrowthHistory`, { params })
}

/**
 * 权益公开页数据（契约 §4.4，1.5.0 M6）
 *
 * 返回 `{ benefits: [{ key, name, desc, icon, required_level, level_names, detail }], levels, faq }`：
 *   - `detail` 是**字符串数组**（逐行渲染），与 `constants/member.js` 里那段单串不同；
 *   - `levels` 与 `getPlans` 的 `levels[]` 同源（复用后端 `get_member_plans()`），
 *     所以这一页不需要为了矩阵再调一次 `getPlans`；
 *   - 这一页**游客也能访问**（挂在 `/memberApi`，没有 `requireRegisteredAccount`），
 *     但没有令牌仍然 401 —— 「游客」指的是前端 init 自动创建的游客身份。
 */
function getBenefits() {
  return request.get(`${baseURL}/getBenefits`)
}

export { getOverview, getPlans, getGrowthHistory, getBenefits }
