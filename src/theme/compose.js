/**
 * 把「主题预设 + 单项自定义」合成为最终令牌表。
 *
 * 单独成模块（而不是写在 store 的 action 里）的理由：这是**纯函数**，
 * 可以用最便宜的方式断言「五套主题 × 任意自定义组合都不会产出非法令牌」。
 * store 只负责把它写到 DOM 上。
 */
import {
  DEFAULT_CUSTOM,
  FONT_STACKS,
  SCALE_TARGETS,
  TOKEN_NAMES,
  getTheme,
} from './presets.js'
import { darken, parseHex, scalePx, withAlpha } from './color.js'

/** 相对亮度（sRGB 加权），用于决定强调色之上的文字该用黑还是白 */
export function relativeLuminance(color) {
  const rgb = parseHex(color)
  if (!rgb) return 0
  const channel = (v) => {
    const s = v / 255
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
  }
  return 0.2126 * channel(rgb.r) + 0.7152 * channel(rgb.g) + 0.0722 * channel(rgb.b)
}

export const isLightColor = (color) => relativeLuminance(color) > 0.45

/**
 * 规范化用户填写的背景图地址。
 *
 * 只接受 http(s)、data:image 与站内绝对路径 —— 其余（含 `javascript:`）
 * 一律丢弃。同时剔除会破坏 `url("...")` 字面量的引号、反斜杠与换行，
 * 避免自定义值逃逸出 CSS 声明。
 */
export function normalizeImageUrl(input) {
  if (typeof input !== 'string') return ''
  const raw = input.trim()
  if (!raw) return ''
  if (!/^(https?:\/\/|data:image\/|\/)/i.test(raw)) return ''
  return raw.replace(/["'\\\n\r\t]/g, '')
}

const clamp = (value, min, max) => Math.max(min, Math.min(max, value))

/**
 * 合成令牌表。
 *
 * @param {string} themeId 主题 id（非法值退回默认主题）
 * @param {Record<string, unknown>} [custom] 单项自定义值
 * @returns {Record<string, string>} 覆盖设计令牌契约全部键的最终值
 */
export function composeTokens(themeId, custom = {}) {
  const theme = getTheme(themeId)
  const c = { ...DEFAULT_CUSTOM, ...custom }
  const tokens = { ...theme.tokens }

  // 1) 字号 / 间距 / 圆角缩放
  for (const [key, targets] of Object.entries(SCALE_TARGETS)) {
    const factor = Number(c[key])
    if (!Number.isFinite(factor) || factor === 1) continue
    for (const token of targets) {
      tokens[token] = scalePx(tokens[token], factor)
    }
  }

  // 2) 强调色：同时派生悬停色、柔和底色、按钮悬停底色与「强调色之上的文字色」
  if (parseHex(c.accent)) {
    tokens['--accent'] = c.accent
    tokens['--accent-strong'] = darken(c.accent, 0.18)
    tokens['--accent-soft'] = withAlpha(c.accent, theme.scheme === 'dark' ? 0.16 : 0.1)
    tokens['--text-on-accent'] = isLightColor(c.accent) ? '#0a0a0a' : '#ffffff'
    // 按钮悬停底色：原本等于强调色的风格（mono / neo，靠位移或边框表达悬停）
    // 保持等于强调色；其余风格按同样幅度压暗，避免换色后悬停色与主色脱节。
    tokens['--btn-hover-bg'] =
      theme.tokens['--btn-hover-bg'] === theme.tokens['--accent']
        ? c.accent
        : darken(c.accent, 0.12)
  }

  // 3) 字体族覆盖
  const stack = FONT_STACKS[c.fontFamily]
  if (stack) {
    tokens['--font-display'] = stack
    tokens['--font-body'] = stack
  }

  // 4) 页面背景图
  const url = normalizeImageUrl(c.backgroundImage)
  tokens['--bg-media'] = url ? `url("${url}")` : 'none'
  const opacity = Number(c.backgroundOpacity)
  tokens['--bg-media-opacity'] = String(
    Number.isFinite(opacity) ? clamp(opacity, 0, 0.8) : DEFAULT_CUSTOM.backgroundOpacity
  )

  return tokens
}

/**
 * 合成结果一定是「键集合与契约完全一致、且没有非字符串值」的令牌表。
 * 供测试与调试使用：任何一处漏配都会在这里直接暴露，而不是等到页面上某块样式塌掉。
 */
export function assertTokenContract(tokens) {
  const missing = TOKEN_NAMES.filter((name) => !(name in tokens))
  const extra = Object.keys(tokens).filter((name) => !TOKEN_NAMES.includes(name))
  const invalid = Object.entries(tokens)
    .filter(([, value]) => typeof value !== 'string' || value.trim() === '')
    .map(([name]) => name)

  const problems = []
  if (missing.length) problems.push(`缺失令牌：${missing.join(', ')}`)
  if (extra.length) problems.push(`多出令牌：${extra.join(', ')}`)
  if (invalid.length) problems.push(`取值非法：${invalid.join(', ')}`)
  return problems
}
