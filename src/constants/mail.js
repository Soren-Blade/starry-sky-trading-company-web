/**
 * 邮件与消息中心文案 —— 通知/邮件这套东西的**唯一一份前端事实**
 *
 * ## 边界（与后端 `docs/API.md` §6 保持一致）
 *
 * 邮件只承担三件事：**通知、反馈回执、客服回复**。
 * 不做登录验证码、不做邮箱验证、不做密码重置 —— 涉及「证明你是账号主人」的邮件
 * 需要另一套风控，本版明确不引入。因此页面上任何一句文案都不能暗示「邮件可以找回账号」。
 *
 * ## 为什么开关文案在这里而不在后端
 *
 * 后端 `notification_preferences` 只有六个布尔列与它们的列注释；
 * 中文名称、说明、展示顺序是**文案**，归前端。后端再存一份就是第二份事实，
 * 改一处忘一处就会出现「开关叫邮件通知、说明写着订单动态」这种自相矛盾。
 */

/**
 * 消息中心的三个分区。
 *
 * 顺序即展示顺序：通知（默认）→ 偏好 → 邮件记录。
 * 「邮件记录」是自查用的：用户问「为什么我没收到邮件」时，
 * 他能自己看到那封信是排队中、已发送还是失败重试中。
 */
export const MAIL_TABS = [
  { value: 'messages', label: '通知' },
  { value: 'preferences', label: '通知偏好' },
  { value: 'log', label: '邮件记录' },
]

/**
 * 通知级别 → 标签文案与样式变体。
 *
 * `key` 必须与后端 `notifications.level` 的 CHECK 约束
 * （`info / success / warning / danger`）严格一致；`tag` 必须是共享样式里
 * 已定义的 `.u-tag--*` 变体（否则标签会静默退化成基础灰底）。
 */
export const NOTIFICATION_LEVELS = {
  info: { label: '提示', tag: 'u-tag--info' },
  success: { label: '成功', tag: 'u-tag--success' },
  warning: { label: '提醒', tag: 'u-tag--warning' },
  danger: { label: '重要', tag: 'u-tag--danger' },
}

/**
 * 通知类型 → 分组名。
 *
 * 后端只给机器可读的 `type`（如 `order_created`），中文分组名归前端。
 * 先查精确表，再按前缀兜底：这样后端将来加一个 `order_refunded`，
 * 页面会自动显示成「订单」而不是裸露的英文键。
 */
const TYPE_LABELS = {
  order_created: '订单',
  order_completed: '订单',
  member_activated: '会员',
  member_expiring: '会员',
  points_expiring: '积分',
  points_checkin: '签到',
  coupon_expiring: '优惠券',
  support_reply: '客服',
  feedback_received: '客服',
  feedback_reply: '客服',
}

const TYPE_PREFIXES = [
  ['order', '订单'],
  ['member', '会员'],
  ['points', '积分'],
  ['checkin', '签到'],
  ['coupon', '优惠券'],
  ['support', '客服'],
  ['feedback', '客服'],
]

/**
 * 通知类型的分组名
 * @param {string} type 后端下发的 `notifications.type`
 * @returns {string} 中文分组名；认不出来时给「系统」而不是空串
 */
export function notificationTypeLabel(type) {
  if (!type) return '系统'
  if (TYPE_LABELS[type]) return TYPE_LABELS[type]
  const hit = TYPE_PREFIXES.find(([prefix]) => type.startsWith(prefix))
  return hit ? hit[1] : '系统'
}

/**
 * 邮件投递状态 → 中文。
 *
 * 六个取值来自 `mail_outbox.status` 的 CHECK 约束；`queued` 与 `sending`
 * 都归到「排队中」的语义里，但用不同措辞，免得用户以为卡住了。
 */
const LOG_STATUS_LABELS = {
  queued: '排队中',
  sending: '发送中',
  sent: '已发送',
  failed: '发送失败',
  suppressed: '未发送',
  canceled: '已取消',
}

/**
 * 邮件投递状态的中文名
 * @param {string} status `mail_outbox.status`
 * @returns {string}
 */
export function mailLogStatusLabel(status) {
  return LOG_STATUS_LABELS[status] || '未知'
}

/**
 * 邮件投递状态 → `.u-tag--*` 变体（与上面的中文名一一对应）
 * @param {string} status `mail_outbox.status`
 * @returns {string}
 */
export function mailLogStatusTag(status) {
  if (status === 'sent') return 'u-tag--success'
  if (status === 'failed') return 'u-tag--danger'
  if (status === 'suppressed' || status === 'canceled') return 'u-tag--muted'
  return 'u-tag--info'
}

/**
 * 六个通知开关 —— 与后端 `notification_preferences` 的六列一一对应。
 *
 * `master: true` 的那一项是总开关：它关掉之后，即使分项都开着也不会发信。
 * 页面必须把这件事**写在界面上**（而不是只写在代码注释里），
 * 否则用户会遇到「订单开关明明开着却收不到邮件」这种看起来像 bug 的行为。
 */
export const PREFERENCE_ITEMS = [
  {
    key: 'email_enabled',
    label: '邮件通知',
    desc: '总开关。关闭后不再发送任何邮件；站内通知不受影响。',
    master: true,
  },
  {
    key: 'order_enabled',
    label: '订单动态',
    desc: '下单成功、订单完成时发一封。',
  },
  {
    key: 'member_enabled',
    label: '会员动态',
    desc: '开通或续期、以及到期前的提醒。',
  },
  {
    key: 'points_enabled',
    label: '积分到期',
    desc: '积分即将过期前提醒一次。',
  },
  {
    key: 'coupon_enabled',
    label: '优惠券到期',
    desc: '优惠券即将过期前提醒一次。',
  },
  {
    key: 'support_enabled',
    label: '客服回复',
    desc: '你提交的反馈有新回复时。',
  },
]

/** 六个开关的键名，顺序与 `PREFERENCE_ITEMS` 一致 */
export const PREFERENCE_KEYS = PREFERENCE_ITEMS.map((item) => item.key)
