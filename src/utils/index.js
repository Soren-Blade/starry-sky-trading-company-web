/**
 * 通用工具
 *
 * 说明：本文件原先还导出 animationUtils / styleUtils / responsiveUtils /
 * applyAnimationStyle / generateId / debounce —— 六者**均无人引用**：
 * 动画与配色早已改由设计令牌 + CSS 关键帧承担（见 assets/styles/global.css），
 * 用 JS 拼渐变/阴影字符串只会制造第二份事实来源。已删除。
 *
 * 保留的三个都有人在用：
 *   - `throttle`            Navbar / App 的滚动监听
 *   - `domUtils.smoothScroll` Hero 的「了解更多」锚点滚动
 *   - `formatUtils`         商品卡片的价格与计数展示
 */

/** 滚动节流 */
export const throttle = (func, limit) => {
  let inThrottle
  return function (...args) {
    if (!inThrottle) {
      func.apply(this, args)
      inThrottle = true
      setTimeout(() => (inThrottle = false), limit)
    }
  }
}

/** DOM 工具 */
export const domUtils = {
  /** 平滑滚动到选择器或元素 */
  smoothScroll: (target) => {
    if (typeof target === 'string') {
      document.querySelector(target)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    } else {
      target?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  },
}

/**
 * 展示层格式化
 *
 * 价格必须带货币信息，而货币由**主题**决定（technical-monochrome 用 `$`），
 * 因此 `formatPrice` 接受一个货币描述对象，默认值与主站一致（¥ / 两位小数）。
 * 调用方应从 `useThemeStore()` 取 `pricePrefix` / `priceDecimals` 传入，
 * 不要在各组件里各写一个符号。
 */
export const formatUtils = {
  /**
   * @param {number|string} price 价格
   * @param {{ prefix?: string, decimals?: number }} [currency] 货币描述
   */
  formatPrice: (price, currency = {}) => {
    const prefix = typeof currency.prefix === 'string' ? currency.prefix : '¥'
    const decimals = Number.isInteger(currency.decimals) ? currency.decimals : 2
    const value = Number(price)
    return `${prefix}${(Number.isFinite(value) ? value : 0).toFixed(decimals)}`
  },

  /** 计数：按量级使用 k / 万 后缀 */
  formatReviewCount: (count) => {
    const value = Number(count)
    if (!Number.isFinite(value)) return '0'
    if (value >= 10000) return `${(value / 10000).toFixed(1)}万`
    if (value >= 1000) return `${(value / 1000).toFixed(1)}k`
    return String(value)
  },
}
