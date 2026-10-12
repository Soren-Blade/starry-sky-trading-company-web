/**
 * 会员体系文案与常量 —— **六项权益的唯一实例**
 *
 * ## 为什么必须只有这一份
 *
 * `hero-persona` 的文案 `member-level` 明写「已解锁 **6 项**权益」。
 * 六项权益的名称、顺序、描述如果抄成四份（`/member` 的矩阵、`/member/plans` 的
 * 对照表、`/member/benefits` 的说明页、`Legal.vue` 的协议条款），
 * 迟早会出现「文案说 6 项、矩阵显示 5 项」—— 上线即说谎。
 *
 * 因此四处的文案都从这里取。**新增或删除权益时必须同步改 hero 文案**
 * （`hero-persona/persona-data.js` 里的 `member-level`），这条写在变更记录纪律里。
 *
 * ## 为什么后端不返回这些文案
 *
 * 后端只返回 `benefits[].{key, unlocked, required_level}`（见 `docs/API.md` §4.1）——
 * 解锁状态是只有它才知道的信息，而名称与描述是**文案**，归前端。
 * 后端再存一份就是第二份事实。
 */

/** 会员等级（与后端 `member_levels.level` 对齐） */
export const MEMBER_LEVELS = {
  none: { level: 'none', name: '', label: '非会员' },
  star: { level: 'star', name: '星辉', label: '星辉会员' },
  galaxy: { level: 'galaxy', name: '星耀', label: '星耀会员' },
}

/**
 * 六项权益 —— 顺序即展示顺序，后端 `benefits` 数组也按这个顺序下发。
 *
 * `requiredLevel` 与后端 `sstc.get_member_snapshot` 里的映射**必须一致**：
 * 不一致会出现「矩阵说未解锁、后端说已解锁」，而两边都不会报错。
 */
export const MEMBER_BENEFITS = [
  {
    key: 'discount',
    name: '专属折扣',
    requiredLevel: 'star',
    icon: 'tag',
    desc: '会员价购买全站商品，等级越高折扣越低。',
    detail: '星辉会员 95 折，星耀会员 9 折。折扣与优惠券、积分抵扣可叠加，合计不超过原价的 50%。',
  },
  {
    key: 'coupon_pack',
    name: '每月券包',
    requiredLevel: 'star',
    icon: 'ticket',
    desc: '每月自动到账的优惠券，无需手动领取。',
    detail: '会员有效期内每个自然月发放一次，券的有效期与面额以到账时为准。',
  },
  {
    key: 'points_deduct',
    name: '积分抵扣',
    requiredLevel: 'star',
    icon: 'landmark',
    desc: '下单可用积分抵扣现金，100 积分 = ¥1。',
    detail: '积分抵扣金额不超过订单原价的 30%，且必须是 100 积分的整数倍。',
  },
  {
    key: 'free_tool',
    name: '会员免卡密',
    requiredLevel: 'star',
    icon: 'key',
    desc: '权益期内免费使用指定工具，无需另购卡密。',
    detail: '标注「需要卡密」的工具中，参与会员权益的可以免卡密使用；权益到期后授权同时失效。',
  },
  {
    key: 'birthday',
    name: '生日礼遇',
    requiredLevel: 'galaxy',
    icon: 'gift',
    desc: '生日当月专属礼券。',
    detail: '需在个人资料中填写生日，生日当月发放；补填生日不追溯往月。',
  },
  {
    key: 'support',
    name: '专属客服',
    requiredLevel: 'galaxy',
    icon: 'headset',
    desc: '优先响应的客服通道。',
    detail: '工单优先处理，客服时间 9:00 - 22:00。',
  },
]

/** key → 权益（按 key 查比按索引稳，索引会随顺序调整而变） */
export const MEMBER_BENEFIT_MAP = MEMBER_BENEFITS.reduce((acc, item) => {
  acc[item.key] = item
  return acc
}, {})

/** 券状态（与后端派生的三态一致） */
export const COUPON_STATUSES = [
  { value: 'available', label: '可用' },
  { value: 'used', label: '已使用' },
  { value: 'expired', label: '已过期' },
]

/** 券来源中文（后端已给 `source_text`，这里作为兜底与筛选用） */
export const COUPON_SOURCE_LABELS = {
  member_pack: '会员券包',
  center: '领券中心',
  redeem: '积分兑换',
  admin: '人工发放',
}

/** 积分流水类型中文（后端已给 `type_text`，这里用于筛选下拉） */
export const POINTS_LEDGER_TYPES = [
  { value: 'all', label: '全部' },
  { value: 'earn_order', label: '下单获得' },
  { value: 'earn_checkin', label: '每日签到' },
  { value: 'earn_task', label: '任务奖励' },
  { value: 'earn_member', label: '开通会员赠送' },
  { value: 'spend_order', label: '下单抵扣' },
  { value: 'spend_redeem', label: '积分兑换' },
  { value: 'expire', label: '积分过期' },
]

/** 兑换比例：100 积分 = ¥1（来源：hero 文案 1280 → 12.8） */
export const POINTS_PER_YUAN = 100

/** 与 hero 文案一致的到期提醒阈值（天）—— 两处必须相同 */
export const MEMBER_EXPIRING_DAYS = 60
export const COUPON_EXPIRING_DAYS = 7

/** 积分 → 金额展示 */
export function formatPointsValue(points) {
  const n = Number(points)
  if (!Number.isFinite(n)) return '0.00'
  return (Math.round((n / POINTS_PER_YUAN) * 100) / 100).toFixed(2)
}

/** 等级 → 徽章文案（非会员给空串，页面据此不渲染徽章） */
export function memberLevelLabel(level) {
  return MEMBER_LEVELS[level]?.label || ''
}

/** 等级 → 中文名 */
export function memberLevelName(level) {
  return MEMBER_LEVELS[level]?.name || ''
}
