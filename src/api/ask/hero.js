import request from '../request'

/**
 * 首页人格位（1.6.0，契约 §4.22）
 *
 * **本接口对游客开放**（`/heroApi` 不带 `requireRegisteredAccount`），
 * 但返回是按身份分档的：
 *   - 游客 / 非会员 → `data = {}`，**`benefits` 整块缺席**（不是 `null`、
 *     也不是一堆 0）。前端据此决定「不展示会员速览」，不要用 `benefits === null` 判。
 *   - 会员 → `data.benefits`，且里面的键还有细分：
 *     `coupons` / `coupon_expiring` **为 0 时不下发**、
 *     `checkin_available` **只在 true 时下发**（与 `checkin_points` 同现）。
 *
 * 也就是说「键在不在」本身携带信息（L2 纪律），消费时用 `'key' in benefits` 或
 * `!== undefined` 判断，不要一律 `|| 0` —— 那会把「没有」读成「0 张券」。
 */
const baseURL = '/heroApi'

/** 人格位。当前只落地 `benefits` 分块，其余字段属 hero-persona 接入工程 */
function getHeroPersona() {
  return request.get(`${baseURL}/getHeroPersona`)
}

export { getHeroPersona }
