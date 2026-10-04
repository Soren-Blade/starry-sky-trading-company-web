/**
 * 颜色与长度的小工具（主题层专用，纯函数、可单测）
 *
 * 为什么自己写而不是引依赖：这里只用到三件事 —— 十六进制解析、按比例压暗、
 * 转 rgba。为此新增一个 color 库不划算，而 `color-mix()` 的浏览器支持面
 * 与「主题色必须立刻生效」的要求不匹配。
 */

/** 解析 #rgb / #rrggbb，非法输入返回 null（不抛错，交给调用方兜底） */
export function parseHex(input) {
  if (typeof input !== 'string') return null
  const hex = input.trim().replace(/^#/, '')
  if (!/^([0-9a-f]{3}|[0-9a-f]{6})$/i.test(hex)) return null

  const full =
    hex.length === 3
      ? hex
          .split('')
          .map((ch) => ch + ch)
          .join('')
      : hex

  return {
    r: parseInt(full.slice(0, 2), 16),
    g: parseInt(full.slice(2, 4), 16),
    b: parseInt(full.slice(4, 6), 16),
  }
}

const clamp255 = (n) => Math.max(0, Math.min(255, Math.round(n)))

/** 压暗（amount 0~1）；解析失败时原样返回，避免把主题色变成 undefined */
export function darken(color, amount = 0.15) {
  const rgb = parseHex(color)
  if (!rgb) return color
  const k = 1 - Math.max(0, Math.min(1, amount))
  const toHex = (n) => clamp255(n * k).toString(16).padStart(2, '0')
  return `#${toHex(rgb.r)}${toHex(rgb.g)}${toHex(rgb.b)}`
}

/** 提亮（用于深色主题上的柔和底色派生） */
export function lighten(color, amount = 0.15) {
  const rgb = parseHex(color)
  if (!rgb) return color
  const k = Math.max(0, Math.min(1, amount))
  const toHex = (n) => clamp255(n + (255 - n) * k).toString(16).padStart(2, '0')
  return `#${toHex(rgb.r)}${toHex(rgb.g)}${toHex(rgb.b)}`
}

/** 转 rgba()；解析失败时返回原值 */
export function withAlpha(color, alpha) {
  const rgb = parseHex(color)
  if (!rgb) return color
  const a = Math.max(0, Math.min(1, alpha))
  return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${a})`
}

/**
 * 缩放带 px 单位的长度值。
 *
 * - 非 px 值（`9999px` 之外的百分比、`none`、`auto`、含 var() 的表达式）原样返回；
 * - `9999px` 视为「胶囊哨兵值」，永远不缩放，否则圆角会被算成几万像素。
 */
export function scalePx(value, factor) {
  if (typeof value !== 'string') return value
  if (factor === 1) return value

  const match = value.match(/^(-?\d*\.?\d+)px$/)
  if (!match) return value

  const px = Number(match[1])
  if (!Number.isFinite(px)) return value
  // 胶囊哨兵：不参与缩放
  if (px >= 9999) return value

  const scaled = px * factor
  // 保留两位小数并去掉多余的 0，避免生成 19.200000000000003px 这类值
  return `${Number(scaled.toFixed(2))}px`
}
