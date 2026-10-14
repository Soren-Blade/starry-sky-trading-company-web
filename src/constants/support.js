/**
 * 客服中心的枚举与文案（前端唯一一份）
 *
 * ## 为什么单独一个文件而不塞进页面
 *
 * 客服页要显示三种「服务端枚举」：分类、状态、消息来源。它们**全部**在数据库里
 * 有 CHECK 约束（`support_threads_status_check` / `support_threads_category_check`
 * / `support_messages_author_check` / `support_messages_source_check`），
 * 前端只是把取值翻译成人话。翻译表放在页面里，就会出现「页面上有、另一个页面没有」
 * 的漂移；放在这里，`test/supportConstants.test.js` 能直接读服务端迁移 SQL 逐条比对。
 *
 * ## 三条边界（写文案时不要越界）
 *
 * 1. **不承诺时效**：后台没有 SLA，也没有「工单」概念，文案只能说「会尽快回复」。
 * 2. **不承诺邮件**：注册用户的邮件取决于通知偏好，游客只有反馈回执；
 *    说「我们会邮件通知你」在偏好关掉时就是假话。
 * 3. **客服入口不是密码找回通道**：平台没有邮件/短信服务，重置密码仍需人工核验
 *    （见 `content.js` 的 AUTH.forgot*）。客服页不提「找回密码」。
 */

/** 页签：提交反馈 / 我的会话 */
export const SUPPORT_TABS = [
  { value: 'submit', label: '提交反馈' },
  { value: 'threads', label: '我的会话' },
]

/**
 * 反馈分类 —— 取值必须与 `support_threads_category_check` 完全一致。
 *
 * 顺序是刻意排的：交易类（订单/会员/积分/优惠券）在前，账号与其他在后，
 * 因为服务端把非法取值落到 `other`，列表里最常出现的兜底项排在看得见的位置。
 */
export const SUPPORT_CATEGORIES = [
  { value: 'order', label: '订单问题', icon: 'package' },
  { value: 'member', label: '会员问题', icon: 'crown' },
  { value: 'points', label: '积分问题', icon: 'star' },
  { value: 'coupon', label: '优惠券问题', icon: 'ticket' },
  { value: 'account', label: '账号问题', icon: 'user' },
  { value: 'other', label: '其他问题', icon: 'message-circle' },
]

/** 分类的取值列表（测试与选择器共用） */
export const SUPPORT_CATEGORY_VALUES = SUPPORT_CATEGORIES.map((item) => item.value)

/** 未指定 / 服务端回了没见过的分类时的兜底文案 */
export const SUPPORT_CATEGORY_FALLBACK = '其他问题'

/**
 * 会状态话术 —— 取值必须与 `support_threads_status_check` 完全一致。
 *
 * `tag` 用的是 `global.css` 里真实存在的 `.u-tag--*` 变体；用户发言会把
 * `pending`/`resolved`/`closed` 推回 `open`，因此「已解决」不是终态。
 */
export const SUPPORT_STATUSES = {
  open: { label: '待客服回复', tag: 'u-tag--warning' },
  pending: { label: '客服已回复', tag: 'u-tag--info' },
  resolved: { label: '已解决', tag: 'u-tag--success' },
  closed: { label: '已关闭', tag: 'u-tag--muted' },
}

export const SUPPORT_STATUS_VALUES = Object.keys(SUPPORT_STATUSES)

/** 消息作者 —— 取值必须与 `support_messages_author_check` 一致 */
export const SUPPORT_AUTHOR_LABELS = {
  user: '我',
  staff: '客服',
  system: '系统',
}

export const SUPPORT_AUTHOR_VALUES = Object.keys(SUPPORT_AUTHOR_LABELS)

/**
 * 消息来源 —— 取值必须与 `support_messages_source_check` 一致。
 *
 * 对用户展示的是「这条消息从哪来」，因此 `admin` 说成「运营后台」而不是「后台」：
 * 用户视角里没有「后台」，只有「不是我发的」。
 */
export const SUPPORT_SOURCE_LABELS = {
  web: '网页',
  admin: '运营后台',
  email: '邮件',
  system: '系统',
}

export const SUPPORT_SOURCE_VALUES = Object.keys(SUPPORT_SOURCE_LABELS)

/**
 * 字段上限 —— 与服务端校验、数据库列宽三方一致。
 *
 * 前端 `maxlength` 只是**第一道**（阻止无意义的输入），真正的拦截在服务端
 * （400 或列宽错误）。两者不一致时受害者是用户：前端放行、服务端拒绝，
 * 用户看着一屏自己写的字被退回。
 */
export const SUPPORT_LIMITS = {
  subject: 120,
  body: 5000,
  email: 255,
  message: 5000,
}

/** 分类取值 → 中文名（认不出给兜底，不裸露英文键） */
export function supportCategoryLabel(value) {
  const hit = SUPPORT_CATEGORIES.find((item) => item.value === value)
  return hit ? hit.label : SUPPORT_CATEGORY_FALLBACK
}

/** 会话状态 → 中文名（认不出给「已关闭」，不显示英文键） */
export function supportStatusLabel(status) {
  return SUPPORT_STATUSES[status]?.label || SUPPORT_STATUSES.closed.label
}

/** 会话状态 → `.u-tag--*` 变体（认不出给 muted，不退化成无底色） */
export function supportStatusTag(status) {
  return SUPPORT_STATUSES[status]?.tag || 'u-tag--muted'
}

/** 消息作者 → 中文名（认不出给「系统」） */
export function supportAuthorLabel(authorType) {
  return SUPPORT_AUTHOR_LABELS[authorType] || SUPPORT_AUTHOR_LABELS.system
}

/** 消息来源 → 中文名（认不出给「系统」） */
export function supportSourceLabel(source) {
  return SUPPORT_SOURCE_LABELS[source] || SUPPORT_SOURCE_LABELS.system
}

/** 未读角标文案：超过 99 收敛成 99+（与消息中心同一口径） */
export function supportUnreadLabel(count) {
  const value = Number(count) || 0
  if (value <= 0) return ''
  return value > 99 ? '99+' : String(value)
}
