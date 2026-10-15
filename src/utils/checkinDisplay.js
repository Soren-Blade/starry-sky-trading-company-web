/**
 * 签到 / 补签的展示逻辑（纯函数，无副作用、不读 store）
 *
 * 抽出来的原因与 `utils/taskDisplay.js` 相同：这些判断决定了按钮是「可点」
 * 还是「置灰 + 一句理由」，散在模板里既没法单测，也容易两处写得不一致。
 *
 * 口径来自服务端 `sstc.replenish_checkin()`（1.5.0 M4）：
 *   - 只能补**本月的、已经过去的、还没签到的**日子；
 *   - 每次 20 积分（`sstc.replenish_cost()`），每月 3 次（`sstc.replenish_monthly_limit()`）；
 *   - 不发签到分、不发成长值，但**会重算连续天数**。
 * 前两条与「日历上的 `replenish_left`」同源，这里只做展示层的前置判断，
 * 真正的裁决仍在服务端（前端判断只是为了避免让用户点了才知道不行）。
 */

/** 补签失败码 → 用户可读的理由（服务端 message 优先，这里是兜底） */
export const REPLENISH_ERROR_TEXT = {
  CHECKIN_DATE_INVALID: '只能补签本月已经过去的日子',
  ALREADY_CHECKED: '这一天已经签到过了',
  REPLENISH_LIMIT: '本月的补签次数已经用完',
  POINTS_NOT_ENOUGH: '积分不足，无法补签',
}

/**
 * 把补签接口的错误转成一句可展示的话。
 *
 * 服务端对 `POINTS_NOT_ENOUGH` 会带 `details.shortage`，把它说出来比
 * 「积分不足」有用得多（用户知道还差多少）。
 */
export function replenishErrorMessage(error, fallback = '补签失败，请稍后重试') {
  const data = error?.response?.data
  const code = data?.code
  const shortage = Number(data?.details?.shortage ?? 0)
  if (code === 'POINTS_NOT_ENOUGH' && shortage > 0) {
    return `积分不足，还差 ${shortage} 积分`
  }
  if (data?.message) return data.message
  if (code && REPLENISH_ERROR_TEXT[code]) return REPLENISH_ERROR_TEXT[code]
  return error?.message || fallback
}

/** 规则区那一行文案：数值来自服务端常量，由调用方传入以免两处写死 */
export function replenishRuleText(cost, limit) {
  return `补签 ${cost} 积分/次，每月最多 ${limit} 次；补签不发签到分与成长值，但会重算连续天数`
}

/**
 * 某一天能不能补签。
 *
 * @param {{date: string, checked?: boolean, future?: boolean, is_today?: boolean}} day
 * @param {{replenishLeft?: number, points?: number, cost?: number}} options
 * @returns {{ok: boolean, reason: string}} `reason` 为置灰时的说明（ok 时为空串）
 */
export function canReplenishDay(day, { replenishLeft = 0, points = 0, cost = 0 } = {}) {
  if (!day || typeof day.date !== 'string') return { ok: false, reason: '这一天没有记录' }
  if (day.checked) return { ok: false, reason: `${day.date} 已签到` }
  if (day.future) return { ok: false, reason: `${day.date} 还没到` }
  if (day.is_today) return { ok: false, reason: '今天直接签到即可，不用补签' }
  if (Number(replenishLeft) <= 0) return { ok: false, reason: '本月的补签次数已用完' }
  if (Number(points) < Number(cost)) return { ok: false, reason: `积分不足（补签需 ${cost} 积分）` }
  return { ok: true, reason: '' }
}

/** 单元格的 title：可补签的说清代价，不可补签的说清原因 */
export function checkinCellTitle(day, { replenishLeft = 0, points = 0, cost = 0 } = {}) {
  if (day.checked) return `${day.date} 已签到`
  if (day.future) return `${day.date} 还没到`
  if (day.is_today) return `${day.date} 今天，直接签到`
  const { ok, reason } = canReplenishDay(day, { replenishLeft, points, cost })
  return ok ? `${day.date} 未签到，点击补签（${cost} 积分）` : `${day.date} 未签到：${reason}`
}
