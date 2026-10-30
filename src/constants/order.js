/**
 * 订单状态与展示元数据（3.3.0 起五态）
 *
 * 为什么单独抽一个常量文件：接入支付后状态从三态扩到五态，
 * 而「列表页签 / 徽标颜色 / 详情页按钮 / 后台筛选」四处各自写一套 `if` 必然漂移
 * （现实里最常见的就是「详情页已支付、列表页还显示待处理」）。
 *
 * 与后端 `server/src/utils/trade.js` 的 `ORDER_STATUSES` / `ORDER_STATUS_TEXT`
 * **必须逐项一致**（`test/orderStatus.test.js` 会比对两边的键集合）。
 */

/** 状态值：顺序即业务流转顺序 */
export const ORDER_STATUSES = ['pending', 'paid', 'completed', 'cancelled', 'refunded']

/** 状态 → 文案 + 徽标语义色 */
export const ORDER_STATUS_META = {
  pending: { label: '待处理', tag: 'u-tag--warning' },
  paid: { label: '已支付', tag: 'u-tag--accent' },
  completed: { label: '已完成', tag: 'u-tag--success' },
  cancelled: { label: '已取消', tag: 'u-tag--danger' },
  refunded: { label: '已退款', tag: 'u-tag--danger' },
}

/** 状态 → 一句话说明（详情页时间线复用） */
export const ORDER_STATUS_DESC = {
  pending: '等待付款',
  paid: '已付款，等待交付',
  completed: '交易完成',
  cancelled: '订单已取消',
  refunded: '款项已退回',
}

/** 列表页签（'all' 由页面用文案常量覆盖） */
export const ORDER_STATUS_TABS = ['all', ...ORDER_STATUSES]

/** 未知状态原样返回，避免历史数据/新状态把界面渲染成空白 */
export function orderStatusLabel(value) {
  const meta = ORDER_STATUS_META[value]
  return meta ? meta.label : value || ''
}

/**
 * 徽标类名：未知状态给中性色（muted），不冒充「待处理」。
 *
 * 设计系统只有 accent / danger / info / muted / success / warning 六个变体，
 * 写一个不存在的变体不会报错，只是没有样式 —— 有守卫测试盯着这件事。
 */
export function orderStatusTagClass(value) {
  const meta = ORDER_STATUS_META[value]
  return meta ? meta.tag : 'u-tag--muted'
}

export function orderStatusDesc(value) {
  return ORDER_STATUS_DESC[value] || ''
}

/** 只有这两种状态允许用户「确认完成」（已付款或线下结算的待处理单） */
export function canConfirmComplete(status, payEnabled) {
  if (status === 'completed') return false
  if (status === 'paid') return true
  // 未接入支付时保留老的线下结算流程
  return status === 'pending' && !payEnabled
}

/** 只有这两种状态允许取消（已支付的单必须走退款，不能靠取消「退回」） */
export function canCancel(status) {
  return status === 'pending'
}

/** 待支付：可以点「立即支付」 */
export function canPay(status) {
  return status === 'pending'
}
