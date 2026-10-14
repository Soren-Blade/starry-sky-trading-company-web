/**
 * 会员体系文案与常量 —— **八项权益的唯一实例**
 *
 * ## 为什么必须只有这一份
 *
 * `hero-persona` 的文案 `member-level` 明写「已解锁 **8 项**权益」。
 * 八项权益的名称、顺序、描述如果抄成四份（`/member` 的权益卡、`/member/benefits`
 * 的说明页、`/member/plans` 的对照表、`Legal.vue` 的协议条款），
 * 迟早会出现「文案说 8 项、卡片显示 7 项」—— 上线即说谎。
 *
 * 因此四处的文案都从这里取。**新增或删除权益时必须同步改 hero 文案**
 * （`hero-persona/persona-data.js` 里的 `member-level`），这条写在变更记录纪律里。
 *
 * ## 为什么后端不返回这些文案
 *
 * 后端只返回 `benefits[].{key, unlocked, required_level, value}`（见 `docs/API.md` §4.1）——
 * 解锁状态与逐档数值是只有它才知道的信息，而名称、描述、单位是**文案**，归前端。
 * 后端再存一份就是第二份事实（所以 `value` 里只有 `type/current/next/next_level`，
 * 一个中文字符都没有，翻译由本文件的 `formatBenefitValue()` 负责）。
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

/** 客服等级中文（后端 `member_levels.support_tier` 的枚举） */
export const SUPPORT_TIER_LABELS = {
  standard: '标准客服',
  priority: '优先客服',
  dedicated: '专属客服经理',
}

/** 身份标识中文（后端 `member_levels.identity_tier` 的枚举；none 有意为空串） */
export const IDENTITY_TIER_LABELS = {
  none: '',
  badge: '会员徽章',
  title: '专属称号',
  limited: '限定标识',
}

/**
 * 八项权益 —— 顺序即展示顺序，后端 `benefits` 数组也按这个顺序下发。
 *
 * `requiredLevel` 与后端 `sstc.get_member_snapshot` 里的映射**必须一致**：
 * 不一致会出现「矩阵说未解锁、后端说已解锁」，而两边都不会报错。
 *
 * `valueType` 是「后端那个 value.type」的前端副本，用途只有一个：断言两边没跑偏
 * （`test/memberConstants.test.js` 会拿它和迁移 SQL 逐项比）。**不参与渲染** ——
 * 渲染一律用后端下发的 `value.type`，这样后端加一种类型时前端不会画错。
 *
 * `detail` **只写规则、不写数字**：折扣率、倍率、面额、额度一旦写进常量，
 * 改档位时就会和 `member_levels` 漂移，而两边都不会报错（页面照样渲染，
 * 只是说的是旧数字）。所有数字由值标签与下方的等级对照表从服务端取值呈现，
 * 静态文案只解释「怎么算、能不能叠加、什么时候失效」。平台级规则
 * （合计不超过原价 50%、抵扣必须是 100 积分整数倍）是业务约束而非档位数值，
 * 保留在文案里。
 */
export const MEMBER_BENEFITS = [
  {
    key: 'discount',
    name: '专属折扣',
    requiredLevel: 'v1',
    valueType: 'rate',
    icon: 'tag',
    desc: '会员价购买全站商品，等级越高折扣越低。',
    detail: '折扣与优惠券、积分抵扣可以叠加，合计优惠不超过商品原价的 50%；各档折扣率见下方等级对照表。',
  },
  {
    key: 'points_boost',
    name: '积分加速',
    requiredLevel: 'v1',
    valueType: 'multiplier',
    icon: 'zap',
    desc: '下单获得的积分按倍率放大，等级越高倍数越大。',
    detail: '倍率作用于积分获取（下单所得与每日签到的基础分），成长值按固定规则累加、不受倍率影响；各档倍率见下方等级对照表。',
  },
  {
    key: 'coupon_pack',
    name: '每月券包',
    requiredLevel: 'v1',
    valueType: 'money',
    unit: '/月',
    icon: 'ticket',
    desc: '每月自动到账的优惠券，面额随等级递增。',
    detail: '会员有效期内每个自然月发放一次，总面额按当前生效等级计算（各档见下方对照表）；券的有效期以到账时为准。',
  },
  {
    key: 'points_deduct',
    name: '积分抵扣',
    requiredLevel: 'v1',
    valueType: 'percent',
    icon: 'landmark',
    desc: '下单可用积分抵扣现金，100 积分 = ¥1。',
    detail: '单笔订单的积分抵扣上限随等级提高（见下方对照表），且抵扣金额必须是 100 积分的整数倍；与折扣、券叠加后合计不超过原价的 50%。',
  },
  {
    key: 'free_tool',
    name: '会员免卡密',
    requiredLevel: 'v1',
    valueType: 'quota',
    icon: 'key',
    desc: '权益期内免费使用指定工具，无需另购卡密。',
    detail: '额度指「同时可免卡密使用的工具数量」，随等级递增，最高档不再限制数量（见下方对照表）；权益到期后授权同时失效。',
  },
  {
    key: 'identity',
    name: '专属身份',
    requiredLevel: 'v3',
    valueType: 'tier',
    tierLabels: IDENTITY_TIER_LABELS,
    icon: 'crown',
    desc: '等级标识出现在账号与评论等位置，等级越高越醒目。',
    detail: '标识只用于身份展示，不改变任何数值权益；等级变化后标识随之下发，各档见下方对照表。',
  },
  {
    key: 'birthday',
    name: '生日礼遇',
    requiredLevel: 'v4',
    valueType: 'money',
    icon: 'gift',
    desc: '生日当月专属礼券，面额随等级递增。',
    detail: '需先在个人资料中填写生日，生日当月发放一次，面额按当前生效等级计算（见下方对照表）；补填生日不追溯往月。',
  },
  {
    key: 'support',
    name: '专属客服',
    requiredLevel: 'v4',
    valueType: 'tier',
    tierLabels: SUPPORT_TIER_LABELS,
    icon: 'headset',
    desc: '优先响应的客服通道。',
    detail: '客服服务时间 9:00 - 22:00，等级越高响应优先级越高，各档见下方对照表。',
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

/** 金额 → 展示（整数不带小数点：`10` → `10`，`12.5` → `12.50`） */
function formatMoneyValue(amount) {
  const n = Number(amount)
  if (!Number.isFinite(n)) return ''
  return Number.isInteger(n) ? String(n) : n.toFixed(2)
}

/**
 * 后端 `benefits[].value` → 可显示的中文数值（**唯一翻译入口**）
 *
 * 契约（`docs/API.md` §4.1）：`value = { type, current, next, next_level }`，
 * `type` ∈ `rate` / `multiplier` / `money` / `percent` / `quota` / `tier`；
 * **未解锁的权益不下发 `value` 键**（不是给 0），调用方据此判断是否有数值。
 *
 * 三条设计口径：
 * 1. **只翻译、不计算** —— 数值全部来自后端，前端不做「V3 应该是 ×2.5」这类推算，
 *    否则改档位时前端要跟着改，且两边会漂移。
 * 2. `money` / `percent` / `multiplier` / `rate` 的 `current` 为 0 或非法时返回**空串**
 *    而不是 `¥0` / `0%`：`birthday_value = 0` 的语义是「这一档还没有生日礼遇」，
 *    显示 `¥0` 会被当成「有礼遇但金额为 0」。`quota` 是例外 —— 它的 `0` 是真实含义
 *    （一个额度都没有），`-1` 才是「不限」。
 * 3. 认不出的 `type` 返回空串 —— 后端将来加类型时，页面显示「—」而不是 `undefined`。
 *
 * `labels` 只在 `type === 'tier'` 时使用（`SUPPORT_TIER_LABELS` / `IDENTITY_TIER_LABELS`），
 * 因为「专属客服」与「专属身份」都下发一个枚举字符串，翻译表由调用方按权益给。
 */
export function formatBenefitValue(value, labels = null) {
  if (!value || typeof value !== 'object') return ''
  const current = value.current

  switch (value.type) {
    case 'rate': {
      const text = discountLabel(current)
      return text === '无折扣' ? '' : text
    }
    case 'multiplier': {
      const n = Number(current)
      return Number.isFinite(n) && n > 0 ? `×${n.toFixed(1)}` : ''
    }
    case 'money': {
      const n = Number(current)
      return Number.isFinite(n) && n > 0 ? `¥${formatMoneyValue(n)}` : ''
    }
    case 'percent': {
      const n = Number(current)
      return Number.isFinite(n) && n > 0 ? `${Math.round(n * 100)}%` : ''
    }
    case 'quota': {
      // `null` 是「没有数据」、`0` 是「一个都没有」—— `Number(null)` 会悄悄变成 0，
      // 于是后端漏下发的值会显示成「0 个」（额度明明存在却说没有），先挡掉
      if (current === null || current === undefined || current === '') return ''
      const n = Number(current)
      if (!Number.isFinite(n)) return ''
      return n < 0 ? '不限' : `${n} 个`
    }
    case 'tier': {
      if (!labels) return ''
      return labels[current] || ''
    }
    default:
      return ''
  }
}

/**
 * 「下一档会变成什么」的预告文案（`value.next` + `value.next_level`）
 *
 * 返回空串表示「没有下一档」：最高档、或后端没下发 `next`（例如该权益已经拉满）。
 * 调用方负责加上 `name`（`专属折扣` 等）与「下一档」这类前缀词，
 * 本函数只回答数字部分（`→ 94 折`）。
 */
export function formatBenefitNext(value, labels = null) {
  if (!value || typeof value !== 'object') return ''
  if (value.next === null || value.next === undefined) return ''
  return formatBenefitValue({ type: value.type, current: value.next }, labels)
}
