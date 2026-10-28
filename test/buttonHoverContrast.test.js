/**
 * 2.6.1 · 主按钮 hover 态：**底色不换**，但字与底必须读得清
 *
 * 历史：2.6.0 把 hover 改成「换一对反相底/字」（`--ec-bg-inverse` + `--ec-text-inverse`），
 * 被用户否掉 —— 他要的是「文字与背景不要糊在一起」，不是「悬停时换一个底色」。
 * 2.6.1 回退成「底色恒为 `--ec-button-primary-bg`」，只用 `filter: brightness(1.06)` 提亮，
 * 对比度由**字色**兜底（`--ec-text-on-action`，主题保证它与渐变面配套）。
 *
 * 本用例守住四件事：
 *   1. hover 规则里不得出现 `background`（回退的核心，防止有人又把底色改回去）；
 *   2. hover 字色取 `--ec-text-on-action`，而不是随手写死的某个色值；
 *   3. 两套主题「渐变最亮的那个端点 + 该主题字色」的对比度都 ≥ 4.5:1；
 *   4. `::before` 的内高光恢复（底色没换，就不该关 sheen）。
 */
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const read = (relative) => readFileSync(join(ROOT, relative), 'utf8')

const GLOBAL_CSS = read('src/assets/styles/global.css')
const PRIMITIVE = read('src/assets/ec/tokens/primitive.css')
const SEMANTIC = read('src/assets/ec/tokens/semantic.css')
const DARK = read('src/assets/ec/tokens/theme-dark.css')

/** 从 CSS 文本里取 `--name: #RRGGBB;` */
function hexOf(css, name) {
  const match = css.match(new RegExp(`${name}:\\s*(#[0-9A-Fa-f]{6})`))
  assert.ok(match, `${name} 应是可直接解析的十六进制色值`)
  return match[1]
}

function luminance(hex) {
  const channels = [1, 3, 5].map((offset) => {
    const value = parseInt(hex.slice(offset, offset + 2), 16) / 255
    return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4
  })
  const [r, g, b] = channels
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

function contrast(bgHex, fgHex) {
  const a = luminance(bgHex)
  const b = luminance(fgHex)
  const [light, dark] = a > b ? [a, b] : [b, a]
  return (light + 0.05) / (dark + 0.05)
}

/** `filter: brightness(1.06)` 会把底色整体提亮：按同一公式推一遍，取更保守的那个端点 */
function brighten(hex, factor) {
  return [1, 3, 5]
    .map((offset) => {
      const value = Math.min(255, Math.round(parseInt(hex.slice(offset, offset + 2), 16) * factor))
      return value.toString(16).padStart(2, '0')
    })
    .reduce((acc, chunk) => acc + chunk, '#')
}

const WHITE = hexOf(PRIMITIVE, '--ec-white')
const INK_900 = hexOf(PRIMITIVE, '--ec-ink-900')
const BLUE_600 = hexOf(PRIMITIVE, '--ec-blue-600')
const BLUE_300 = hexOf(PRIMITIVE, '--ec-blue-300')
const VIOLET_3 = (PRIMITIVE.match(/--ec-violet-300:\s*(#[0-9A-Fa-f]{6})/) || [])[1]

test('语义层：--ec-text-on-action 在亮色是白字、暗色是深墨', () => {
  assert.match(SEMANTIC, /--ec-text-on-action:\s+var\(--ec-white\)/)
  assert.match(DARK, /--ec-text-on-action:\s+var\(--ec-ink-900\)/)
  assert.ok(WHITE && INK_900)
})

test('两套主题「渐变最亮端点（提亮 1.06 后）+ 字色」对比度 ≥ 4.5:1', () => {
  // 亮色：深蓝 → 紫 → 蓝，最亮端点是 blue-600；字色为白
  const lightWorst = brighten(BLUE_600, 1.06)
  const lightPair = contrast(lightWorst, WHITE)
  assert.ok(lightPair >= 4.5, `浅色主题 hover 最差对比度 ${lightPair.toFixed(2)} 应 ≥ 4.5`)

  // 暗色：浅紫 → 浅青，最亮端点是 blue-300；字色为 ink-900
  const darkWorst = brighten(BLUE_300, 1.06)
  const darkPair = contrast(darkWorst, INK_900)
  assert.ok(darkPair >= 4.5, `深色主题 hover 最差对比度 ${darkPair.toFixed(2)} 应 ≥ 4.5`)

  if (VIOLET_3) {
    const violetPair = contrast(brighten(VIOLET_3, 1.06), INK_900)
    assert.ok(violetPair >= 4.5, `深色主题紫端对比度 ${violetPair.toFixed(2)} 应 ≥ 4.5`)
  }
})

test('hover 规则：不换底色，只提亮 + 加投影 + 钉住行动面字色', () => {
  const stripped = GLOBAL_CSS.replace(/\/\*[\s\S]*?\*\//g, '')
  const rule = stripped.match(
    /\.u-btn-primary:hover:not\(:disabled\),\s*\.ec-btn--primary:hover:not\(:disabled\) \{([^}]*)\}/
  )
  assert.ok(rule, '应存在覆盖 .u-btn-primary 与 .ec-btn--primary 的 hover 规则')

  const body = rule[1]
  assert.ok(!/background/.test(body), 'hover 不得改底色（2.6.0 的换底色方案已被用户否掉）')
  assert.match(body, /color:\s*var\(--ec-text-on-action\)/)
  assert.match(body, /filter:\s*brightness\(1\.06\)/)
  assert.match(body, /box-shadow:\s*var\(--ec-button-primary-hover-shadow\)/)
})

test('hover 不再关掉渐变内高光（底色没换，sheen 应当保留）', () => {
  const stripped = GLOBAL_CSS.replace(/\/\*[\s\S]*?\*\//g, '')
  assert.ok(
    !/\.u-btn-primary:hover:not\(:disabled\)::before/.test(stripped),
    'hover 的 ::before 关闭规则属于「换底色」方案，回退后不应残留'
  )
})

test('按下态与键盘焦点仍在（覆盖 .ec-btn--primary）', () => {
  const stripped = GLOBAL_CSS.replace(/\/\*[\s\S]*?\*\//g, '')
  assert.match(
    stripped,
    /\.u-btn-primary:active:not\(:disabled\),\s*\.ec-btn--primary:active:not\(:disabled\) \{/
  )
  assert.match(
    stripped,
    /\.u-btn-primary:focus-visible,\s*\.ec-btn--primary:focus-visible \{/
  )
})
