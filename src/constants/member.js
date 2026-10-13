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

/**
 * 会员等级（与后端 `member_levels.level` 对齐，v1.2.0 起为八档 `v1`–`v8`）
 *
 * 这里**只登记 id 与展示名**：门槛、折扣率、积分倍率都由后端下发
 * （`/memberApi/getPlans` 的 `levels`），前端不再抄一份数字 ——
 * 抄一份就会出现「页面写 V3 门槛 1500、后端实际 1600」这类没人会报错的漂移。
 */
export const MEMBER_LEVELS = {
  none: { level: 'none', name: '', label: '非会员' },
  v1: { level: 'v1', name: 'V1', label: 'V1 会员' },
  v2: { level: 'v2', name: 'V2', label: 'V2 会员' },
  v3: { level: 'v3', name: 'V3', label: 'V3 会员' },
  v4: { level: 'v4', name: 'V4', label: 'V4 会员' },
  v5: { level: 'v5', name: 'V5', label: 'V5 会员' },
  v6: { level: 'v6', name: 'V6', label: 'V6 会员' },
  v7: { level: 'v7', name: 'V7', label: 'V7 会员' },
  v8: { level: 'v8', name: 'V8', label: 'V8 会员' },
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
    requiredLevel: 'v1',
    icon: 'tag',
    desc: '会员价购买全站商品，等级越高折扣越低。',
    detail: 'V1 起 95 折，V4 起 9 折，V8 最低 82 折。折扣与优惠券、积分抵扣可叠加，合计不超过原价的 50%。',
  },
  {
    key: 'coupon_pack',
    name: '每月券包',
    requiredLevel: 'v1',
    icon: 'ticket',
    desc: '每月自动到账的优惠券，无需手动领取。',
    detail: '会员有效期内每个自然月发放一次，券的有效期与面额以到账时为准。',
  },
  {
    key: 'points_deduct',
    name: '积分抵扣',
    requiredLevel: 'v1',
    icon: 'landmark',
    desc: '下单可用积分抵扣现金，100 积分 = ¥1。',
    detail: '积分抵扣金额不超过订单原价的 30%，且必须是 100 积分的整数倍。',
  },
  {
    key: 'free_tool',
    name: '会员免卡密',
    requiredLevel: 'v1',
    icon: 'key',
    desc: '权益期内免费使用指定工具，无需另购卡密。',
    detail: '标注「需要卡密」的工具中，参与会员权益的可以免卡密使用；权益到期后授权同时失效。',
  },
  {
    key: 'birthday',
    name: '生日礼遇',
    requiredLevel: 'v4',
    icon: 'gift',
    desc: '生日当月专属礼券。',
    detail: '需在个人资料中填写生日，生日当月发放；补填生日不追溯往月。',
  },
  {
    key: 'support',
    name: '专属客服',
    requiredLevel: 'v4',
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

/**
 * 折扣率 → 中文折扣（`0.95` → `95 折`，`0.9` → `9 折`）
 *
 * 口径与后端列注释一致（`0.95 = 95 折，1.000 = 不打折`）。
 * 这里**只翻译、不计算**：折扣率由 `member_levels.discount_rate` 下发。
 *
 * 两种调用方（套餐卡片的「消费 95 折」、等级阶梯表的「消费折扣」列）
 * 原先各自内联一份，翻译口径一旦分叉就会出现同一等级两个说法。
 * 不进 10 的整数倍时保留一位小数（`0.945` → `94.5 折`），因为折扣率允许两位小数。
 */
export function discountLabel(rate) {
  const value = Number(rate)
  if (!Number.isFinite(value) || value <= 0 || value >= 1) return '无折扣'
  const tenths = Math.round(value * 1000) / 10
  return tenths % 10 === 0 ? `${tenths / 10} 折` : `${tenths} 折`
}

/** 等级 → 徽章文案（非会员给空串，页面据此不渲染徽章） */
export function memberLevelLabel(level) {
  return MEMBER_LEVELS[level]?.label || ''
}

/** 等级 → 中文名 */
export function memberLevelName(level) {
  return MEMBER_LEVELS[level]?.name || ''
}
