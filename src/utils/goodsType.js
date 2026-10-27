/**
 * 商品形态（`products.goods_type`）的展示逻辑
 *
 * 文案全部在 `src/constants/content.js` 的 `GOODS_TYPE` 里；这里只负责
 * 「取值是否合法」的判定与拼接，商品卡角标与详情页交付说明共用，避免两处
 * 各写一份回落规则。
 *
 * 关键约束：合法枚举之外一律当作「不知道形态」返回空串 —— 包括 undefined、
 * 空串、大小写不符、后端将来新增的枚举值。宁可少显示一块信息，也不要把
 * 未分类商品猜成「虚拟商品」误导用户下单。
 */

import { GOODS_TYPE } from '@/constants/content.js'

/**
 * 是否是受支持的形态值
 * @param {unknown} raw 后端下发的 `goods_type`
 * @returns {boolean}
 */
export function isGoodsType(raw) {
  return typeof raw === 'string' && GOODS_TYPE.values.includes(raw)
}

/**
 * 商品卡角标文案
 * @param {unknown} raw 后端下发的 `goods_type`
 * @returns {string} 非法/缺失时为空串，调用方据此决定不渲染
 */
export function goodsTypeLabel(raw) {
  if (!isGoodsType(raw)) return ''
  return GOODS_TYPE.labels[raw] || ''
}

/**
 * `dimensions` 是 jsonb 列，但老数据/手填可能是纯文本，因此三种形态都要能读：
 *   - 字符串：原样显示（数据库里就是「30 × 20 × 10 cm」这种写法）
 *   - 数组：按顺序拼成「30 × 20 × 10」
 *   - 对象：各值按顺序拼接，有 unit 时补在末尾
 * 读不出内容时返回空串，调用方不渲染这一段。
 *
 * @param {unknown} raw
 * @returns {string}
 */
export function formatDimensions(raw) {
  if (raw === null || raw === undefined) return ''

  if (typeof raw === 'string') return raw.trim()

  if (Array.isArray(raw)) {
    return raw
      .filter((part) => part !== null && part !== undefined && part !== '')
      .map((part) => String(part))
      .join(' × ')
  }

  if (typeof raw === 'object') {
    const unit = typeof raw.unit === 'string' ? raw.unit.trim() : ''
    const parts = Object.entries(raw)
      .filter(([key, value]) => {
        if (key === 'unit') return false
        if (value === null || value === undefined || value === '') return false
        return typeof value === 'string' || typeof value === 'number'
      })
      .map(([, value]) => String(value))
    if (!parts.length) return ''
    return unit ? `${parts.join(' × ')} ${unit}` : parts.join(' × ')
  }

  return ''
}

/**
 * 详情页交付说明。
 *
 * 实物商品额外带出重量与体积（接口有才带，没有就不提）：
 *   `实物商品 · 需物流配送 · 约 1.2 kg · 30 × 20 × 10 cm`
 *
 * @param {{ goods_type?: unknown, weight_kg?: unknown, dimensions?: unknown }} product
 * @returns {string} 非法/缺失形态时为空串
 */
export function buildDeliveryNote(product) {
  const type = product?.goods_type
  if (!isGoodsType(type)) return ''

  const base = GOODS_TYPE.delivery[type]
  if (!base) return ''

  // 只有实物商品需要补重量/体积；虚拟、服务、账号不涉及物流
  if (type !== 'physical') return base

  const weight = Number(product?.weight_kg)
  const weightText = Number.isFinite(weight) && weight > 0 ? GOODS_TYPE.weight(weight) : ''
  const dimensionText = formatDimensions(product?.dimensions)

  return [base, weightText, dimensionText].filter(Boolean).join(GOODS_TYPE.separator)
}
