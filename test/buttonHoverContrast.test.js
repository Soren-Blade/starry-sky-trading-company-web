/**
 * 2.6.0 · 主按钮 hover 态必须是「可读且可感知」的
 *
 * 用户反馈：会员卡的 `ec-btn ec-btn--sm ec-btn--primary` 悬停时字与底几乎同色，
 * 浅色、深色主题都有；深色主题下的 `.u-btn-primary` 同样。
 *
 * 根因：hover 只有 `filter: brightness(1.06)`，而深色主题的主按钮底色本身就是浅色渐变，
 * 提亮后与文字撞车；主题里也没有「hover 背景」令牌可按主题取值。
 *
 * 现方案：hover 换成 EC 的明暗反相令牌对 `--ec-bg-inverse` / `--ec-text-inverse`。
 * 本用例把「两套主题下的对比度 ≥ 4.5:1」算出来，避免以后有人改令牌时悄悄退化。
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

const WHITE = hexOf(PRIMITIVE, '--ec-white')
const INK_900 = hexOf(PRIMITIVE, '--ec-ink-900')
const INK_100 = hexOf(PRIMITIVE, '--ec-ink-100')
const NEUTRAL_800 = hexOf(PRIMITIVE, '--ec-neutral-800')
const NEUTRAL_0 = hexOf(PRIMITIVE, '--ec-neutral-0')

test('语义层：--ec-bg-inverse / --ec-text-inverse 指向反相色对', () => {
  // 浅色：深底 + 白字；深色：浅底 + 深字
  assert.match(SEMANTIC, /--ec-bg-inverse:\s+var\(--ec-neutral-800\)/)
  assert.match(SEMANTIC, /--ec-text-inverse:\s+var\(--ec-neutral-0\)/)
  assert.match(DARK, /--ec-bg-inverse:\s+var\(--ec-ink-100\)/)
  assert.match(DARK, /--ec-text-inverse:\s+var\(--ec-ink-900\)/)

  assert.ok(INK_100 && NEUTRAL_800 && NEUTRAL_0 && WHITE && INK_900)
})

test('两套主题的 hover 组合对比度都 ≥ 4.5:1', () => {
  const lightPair = contrast(NEUTRAL_800, NEUTRAL_0)
  const darkPair = contrast(INK_100, INK_900)

  assert.ok(lightPair >= 4.5, `浅色主题 hover 对比度 ${lightPair.toFixed(2)} 应 ≥ 4.5`)
  assert.ok(darkPair >= 4.5, `深色主题 hover 对比度 ${darkPair.toFixed(2)} 应 ≥ 4.5`)
})

test('hover 规则：换反相底/字，且不再靠 brightness 提亮', () => {
  const stripped = GLOBAL_CSS.replace(/\/\*[\s\S]*?\*\//g, '')
  const rule = stripped.match(
    /\.u-btn-primary:hover:not\(:disabled\),\s*\.ec-btn--primary:hover:not\(:disabled\) \{([^}]*)\}/
  )
  assert.ok(rule, '应存在覆盖 .u-btn-primary 与 .ec-btn--primary 的 hover 规则')

  const body = rule[1]
  assert.match(body, /color:\s*var\(--ec-text-inverse\)/)
  assert.match(body, /background:\s*var\(--ec-bg-inverse\)/)
  assert.match(body, /filter:\s*none/)
  assert.ok(!/brightness\(1\.06\)/.test(stripped), 'hover 不应再用 brightness(1.06) 提亮')
})

test('hover 时关掉渐变内高光（::before）', () => {
  const stripped = GLOBAL_CSS.replace(/\/\*[\s\S]*?\*\//g, '')
  assert.match(
    stripped,
    /\.u-btn-primary:hover:not\(:disabled\)::before,\s*\.ec-btn--primary:hover:not\(:disabled\)::before \{\s*opacity: 0;/,
    '反相实底上必须关掉 sheen，否则浮一层灰膜'
  )
})
