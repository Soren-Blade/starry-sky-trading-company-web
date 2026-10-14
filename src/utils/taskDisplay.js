/**
 * 商城 / 任务列表的展示口径（`/points` 的商店页签与任务页签共用）
 *
 * 这些函数都在回答同一个问题：**「这个按钮能不能点，不能点的理由是什么」**。
 * 把它们从页面里提出来，是因为「理由」这件事最容易写成两份：
 * 页面一处、模板一处，改了一处就出现「按钮灰着但没有任何解释」。
 *
 * 两条纪律：
 *   1. **先给理由，再禁用按钮**：会员专属 / 已兑完 / 积分不够三种情况在点击前
 *      就能算出来，等服务端 403/409 再告诉用户是白跑一趟。服务端仍有同样的校验，
 *      这里只是提前量，不是替代。
 *   2. **不改状态**：全部是纯函数，拿 store 里的数字当参数传进来，
 *      不要在 util 里读 store（否则又变成第二个真相源）。
 */

/** 任务周期中文（服务端 `period` 只有这三种值） */
export const TASK_PERIOD_TEXT = {
  daily: '每日',
  monthly: '每月',
  once: '一次性',
}

export function periodText(period) {
  return TASK_PERIOD_TEXT[period] || ''
}

/** 进度百分比：`target` 缺失或为 0 时给 0，不产生 NaN 宽度 */
export function progressPercent(task) {
  const target = Number(task?.target) || 0
  if (target <= 0) return 0
  const progress = Number(task?.progress) || 0
  return Math.min(100, Math.max(0, Math.round((progress / target) * 100)))
}

/**
 * 能否领奖。
 *
 * 服务端的 `claimable` 口径是「**现在就能领**」= 有奖励 && 没领过 && 进度达标
 * （见 `sstc.get_tasks()`），所以这里不再重复判断进度；仍然叠一次是为了
 * 防手动构造的数据（服务端字段缺失时不要凭空放出可点的按钮）。
 */
export function canClaimTask(task) {
  if (!task || task.claimable !== true || task.claimed === true) return false
  return Number(task.progress) >= Number(task.target)
}

/**
 * 按钮文案四态：`已领取` / `自动发放` / `未完成` / `领取`。
 *
 * **不能用 `claimable` 区分「自动发放」与「未完成」** —— `claimable` 是
 * 「现在能领」，未完成的任务它同样是 `false`，早期版本据此把「每日下单 0/1」
 * 显示成「自动发放」，等于告诉用户这条任务不需要操作。
 * 「自动发放」只属于**没有领奖入口**的任务（奖励由签到接口当场发），
 * 判据是 `reward_points <= 0`。
 */
export function taskButtonLabel(task) {
  if (Number(task?.reward_points) <= 0) return '自动发放'
  if (task?.claimed === true) return '已领取'
  if (Number(task.progress) < Number(task.target)) return '未完成'
  return '领取'
}

/** 按钮悬浮提示：给「为什么点不了」补一句上下文，能点的时候不给噪音 */
export function taskButtonHint(task) {
  if (Number(task?.reward_points) <= 0) {
    return '该任务的奖励由签到接口当场发放，不需要在这里领取'
  }
  if (task?.claimed === true) return '本期已领取，下个周期刷新后可再领'
  if (Number(task.progress) < Number(task.target)) {
    return `当前进度 ${Number(task.progress) || 0}/${Number(task.target) || 0}`
  }
  return ''
}

/**
 * 商城库存文案：`null` 是**不限量**、`0` 是**已兑完**、其余是剩余数 ——
 * 三者不能糊成一句（把不限量写成「剩余 0」等于把可兑换的条目说成没货）。
 */
export function mallStockText(item) {
  if (item?.stock === null || item?.stock === undefined) return '不限量'
  if (Number(item.stock) <= 0) return '已兑完'
  return `剩余 ${item.stock}`
}

/**
 * 商城「兑换」按钮的可点性与理由。
 *
 * `{ isMember, points }` 由调用方从 store 取（见文件头第 2 条纪律）。
 * 顺序有讲究：会员专属与库存是「这条目本身不行」，积分是「你不行」——
 * 先说完条目本身的条件，用户才知道该去开通会员还是去攒积分。
 */
export function mallRedeemState(item, { isMember = false, points = 0 } = {}) {
  if (item?.member_only && !isMember) {
    return { ok: false, reason: '会员专属，开通会员后可兑换' }
  }
  if (item?.stock !== null && item?.stock !== undefined && Number(item.stock) <= 0) {
    return { ok: false, reason: '已兑完，等运营补货' }
  }
  const cost = Number(item?.cost) || 0
  if (Number(points) < cost) {
    return { ok: false, reason: `还差 ${cost - Number(points)} 积分` }
  }
  return { ok: true, reason: '' }
}
