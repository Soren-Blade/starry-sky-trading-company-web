import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { installStorageStub, installDomStub, resetStorage, loadAppModule } from './setup.js'

installStorageStub()
installDomStub()

const WEB_ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const VARS = path.join(WEB_ROOT, 'src', 'assets', 'styles', 'variables.css')

/**
 * 主题契约测试
 *
 * `designTokens.test.js` 保证「组件只消费已登记的令牌」；
 * 本文件保证**令牌名册与五套主题预设完全对齐**，并且合成逻辑在任何自定义组合下
 * 都不会产出缺失 / 空的令牌 —— 这类缺陷在浏览器里表现为「某块样式静默失效」，
 * 靠肉眼看页面很难发现。
 */

const { THEMES, TOKEN_NAMES, DEFAULT_THEME_ID, CUSTOM_FIELDS, DEFAULT_CUSTOM, getTheme, FONT_STACKS } =
  await loadAppModule('/theme/presets.js')
const { composeTokens, assertTokenContract, normalizeImageUrl, isLightColor } = await loadAppModule(
  '/theme/compose.js'
)
const { parseHex, darken, withAlpha, scalePx } = await loadAppModule('/theme/color.js')

/** 从 variables.css 的 :root 提取令牌名（与 designTokens.test.js 同一套提取规则） */
function registeredTokens() {
  const names = []
  for (const line of fs.readFileSync(VARS, 'utf8').split('\n')) {
    const m = line.match(/^\s*(--[a-z0-9-]+)\s*:/)
    if (m) names.push(m[1])
  }
  return [...new Set(names)]
}

const REGISTERED = registeredTokens()

// ── 名册与预设对齐 ─────────────────────────────────────────────

test('variables.css 登记了足够多的令牌（防止提取器失效导致假通过）', () => {
  assert.ok(REGISTERED.length > 60, `应登记大量令牌，实际 ${REGISTERED.length}`)
})

test('五套主题的令牌键集合必须与 variables.css 登记的名册完全一致', () => {
  const registered = new Set(REGISTERED)
  const problems = []

  for (const theme of THEMES) {
    const keys = Object.keys(theme.tokens)
    const missing = REGISTERED.filter((t) => !keys.includes(t))
    const extra = keys.filter((t) => !registered.has(t))
    if (missing.length) problems.push(`${theme.id} 缺少：${missing.join(', ')}`)
    if (extra.length) problems.push(`${theme.id} 多出：${extra.join(', ')}`)
  }

  assert.deepEqual(
    problems,
    [],
    `主题预设与令牌名册不一致（新增令牌时必须两处都改）：\n  ${problems.join('\n  ')}`
  )
})

test('presets.js 导出的 TOKEN_NAMES 与名册一致', () => {
  assert.deepEqual([...TOKEN_NAMES].sort(), [...REGISTERED].sort())
})

test('五套主题的元数据完整（id/名称/色板/明暗/货币）', () => {
  const ids = THEMES.map((t) => t.id)
  assert.deepEqual(ids, [
    'tech-minimal',
    'liquid-glass',
    'bento-editorial',
    'neo-brutalism',
    'technical-monochrome',
  ])
  assert.equal(DEFAULT_THEME_ID, 'tech-minimal')

  for (const theme of THEMES) {
    assert.ok(theme.name && theme.label && theme.tagline, `${theme.id} 元数据不完整`)
    assert.ok(Array.isArray(theme.swatch) && theme.swatch.length >= 3, `${theme.id} 色板不足`)
    assert.ok(['dark', 'light'].includes(theme.scheme), `${theme.id} scheme 非法`)
    assert.match(theme.price.prefix, /^\S+$/, `${theme.id} 货币前缀非法`)
    assert.ok(Number.isInteger(theme.price.decimals), `${theme.id} 小数位非法`)
  }
})

// ── 合成逻辑 ───────────────────────────────────────────────────

test('composeTokens：五套主题在默认自定义下都能通过契约校验', () => {
  const problems = []
  for (const theme of THEMES) {
    const tokens = composeTokens(theme.id, DEFAULT_CUSTOM)
    const issues = assertTokenContract(tokens)
    if (issues.length) problems.push(`${theme.id}: ${issues.join(' / ')}`)
    // 默认自定义不应改变预设取值
    for (const [name, value] of Object.entries(theme.tokens)) {
      if (tokens[name] !== value) problems.push(`${theme.id}: ${name} 被意外改写为 ${tokens[name]}`)
    }
  }
  assert.deepEqual(problems, [], `合成结果异常：\n  ${problems.join('\n  ')}`)
})

test('composeTokens：极端自定义组合下仍不产生缺失/空令牌', () => {
  const combos = [
    { fontScale: 0.85, density: 0.8, radiusScale: 0 },
    { fontScale: 1.3, density: 1.3, radiusScale: 2 },
    { accent: '#ff00aa', fontFamily: 'mono', backgroundImage: 'https://a.example/b.png' },
    { accent: '#fef08a', fontFamily: 'serif', backgroundOpacity: 0.8 },
    { fontScale: Number.NaN, density: -5, radiusScale: 99, backgroundOpacity: 42 },
  ]

  const problems = []
  for (const theme of THEMES) {
    for (const [index, custom] of combos.entries()) {
      const tokens = composeTokens(theme.id, custom)
      const issues = assertTokenContract(tokens)
      if (issues.length) problems.push(`${theme.id} / 组合 ${index}: ${issues.join(' / ')}`)
    }
  }
  assert.deepEqual(problems, [], `合成结果异常：\n  ${problems.join('\n  ')}`)
})

test('composeTokens：非法主题 id 退回默认主题而不是产出空表', () => {
  const tokens = composeTokens('不存在的主题', DEFAULT_CUSTOM)
  assert.deepEqual(assertTokenContract(tokens), [])
  assert.equal(tokens['--bg-page'], getTheme(DEFAULT_THEME_ID).tokens['--bg-page'])
})

// ── 缩放与派生 ─────────────────────────────────────────────────

test('scalePx：只缩放 px 值，胶囊哨兵 9999px 保持不变', () => {
  assert.equal(scalePx('16px', 1.25), '20px')
  assert.equal(scalePx('13px', 1.3), '16.9px')
  assert.equal(scalePx('9999px', 2), '9999px')
  assert.equal(scalePx('0px', 2), '0px')
  assert.equal(scalePx('none', 2), 'none')
  assert.equal(scalePx('rgba(0, 0, 0, 0.5)', 3), 'rgba(0, 0, 0, 0.5)')
  assert.equal(scalePx('16px', 1), '16px')
})

test('fontScale 只影响字号，不影响间距', () => {
  const base = composeTokens('tech-minimal', DEFAULT_CUSTOM)
  const scaled = composeTokens('tech-minimal', { fontScale: 1.25 })
  assert.equal(scaled['--fs-body'], '18.75px')
  assert.equal(scaled['--card-padding'], base['--card-padding'])
})

test('density 只影响间距令牌', () => {
  const scaled = composeTokens('technical-monochrome', { density: 2 })
  assert.equal(scaled['--space-unit'], '8px')
  assert.equal(scaled['--section-gap'], '144px')
  // 字号不受影响
  assert.equal(scaled['--fs-body'], '14px')
})

test('radiusScale 不缩放胶囊圆角', () => {
  const scaled = composeTokens('liquid-glass', { radiusScale: 0 })
  assert.equal(scaled['--radius-card'], '0px')
  assert.equal(scaled['--radius-pill'], '9999px')
  assert.equal(scaled['--radius-input'], '9999px')
})

test('darken / withAlpha / parseHex：非法输入原样返回，不产出 undefined', () => {
  assert.deepEqual(parseHex('#fff'), { r: 255, g: 255, b: 255 })
  assert.deepEqual(parseHex('3b82f6'), { r: 59, g: 130, b: 246 })
  assert.equal(parseHex('not-a-color'), null)
  assert.equal(darken('not-a-color', 0.2), 'not-a-color')
  assert.equal(withAlpha('not-a-color', 0.5), 'not-a-color')
  assert.match(darken('#3b82f6', 0.2), /^#[0-9a-f]{6}$/)
  assert.equal(withAlpha('#3b82f6', 0.5), 'rgba(59, 130, 246, 0.5)')
})

test('自定义强调色会同时派生悬停色、柔和底色与「强调色之上的文字色」', () => {
  const dark = composeTokens('tech-minimal', { accent: '#111827' })
  assert.equal(dark['--accent'], '#111827')
  assert.notEqual(dark['--accent-strong'], '#111827')
  assert.match(dark['--accent-soft'], /^rgba\(/)
  assert.equal(dark['--text-on-accent'], '#ffffff', '深色强调色之上应是白字')

  const light = composeTokens('tech-minimal', { accent: '#fde68a' })
  assert.equal(light['--text-on-accent'], '#0a0a0a', '浅色强调色之上应是深字')
  assert.equal(isLightColor('#fde68a'), true)
})

test('normalizeImageUrl：只放行 http(s)、data:image 与站内路径，并剔除会逃逸 url() 的字符', () => {
  assert.equal(normalizeImageUrl(''), '')
  assert.equal(normalizeImageUrl('   '), '')
  assert.equal(normalizeImageUrl('https://a.example/b.png'), 'https://a.example/b.png')
  assert.equal(normalizeImageUrl('/img/bg.png'), '/img/bg.png')
  assert.equal(normalizeImageUrl('data:image/png;base64,AAA'), 'data:image/png;base64,AAA')
  // 危险协议一律丢弃
  assert.equal(normalizeImageUrl('javascript:alert(1)'), '')
  assert.equal(normalizeImageUrl('vbscript:x'), '')
  // 引号/反斜杠/换行会逃出 url("...")，必须剔除
  assert.equal(normalizeImageUrl('https://a.example/a".png'), 'https://a.example/a.png')
  assert.equal(normalizeImageUrl('https://a.example/a\n).png'), 'https://a.example/a).png')
})

test('backgroundImage 会被包进 url("...")，留空时为 none', () => {
  assert.equal(composeTokens('tech-minimal', {})['--bg-media'], 'none')
  assert.equal(
    composeTokens('tech-minimal', { backgroundImage: 'https://a.example/b.png' })['--bg-media'],
    'url("https://a.example/b.png")'
  )
  // 危险协议不会进入 CSS
  assert.equal(
    composeTokens('tech-minimal', { backgroundImage: 'javascript:alert(1)' })['--bg-media'],
    'none'
  )
})

test('backgroundOpacity 被夹在 0..0.8', () => {
  assert.equal(composeTokens('tech-minimal', { backgroundOpacity: 5 })['--bg-media-opacity'], '0.8')
  assert.equal(
    composeTokens('tech-minimal', { backgroundOpacity: -3 })['--bg-media-opacity'],
    '0'
  )
})

test('fontFamily 覆盖只改标题与正文字体，不动等宽/价格字体', () => {
  const tokens = composeTokens('tech-minimal', { fontFamily: 'serif' })
  assert.equal(tokens['--font-display'], FONT_STACKS.serif)
  assert.equal(tokens['--font-body'], FONT_STACKS.serif)
  assert.equal(tokens['--font-mono'], getTheme('tech-minimal').tokens['--font-mono'])
})

// ── 规范数值守卫（防止「凭手感改数值」） ───────────────────────

test('规范里的关键数值必须原样落地', () => {
  const t = (id) => getTheme(id).tokens

  // 风格一 Tech Minimal
  assert.equal(t('tech-minimal')['--bg-page'], '#0a0a0a')
  assert.equal(t('tech-minimal')['--text-primary'], '#fafafa')
  assert.equal(t('tech-minimal')['--accent'], '#3b82f6')
  assert.equal(t('tech-minimal')['--bg-surface'], '#27272a')
  assert.equal(t('tech-minimal')['--border'], '#2a2a2d')
  assert.equal(t('tech-minimal')['--disabled-bg'], '#3f3f46')
  assert.equal(t('tech-minimal')['--radius-card'], '12px')
  assert.equal(t('tech-minimal')['--radius-btn'], '8px')
  assert.equal(t('tech-minimal')['--card-padding'], '20px')
  assert.equal(t('tech-minimal')['--navbar-height'], '64px')
  assert.equal(t('tech-minimal')['--shadow-card'], 'none')
  assert.equal(t('tech-minimal')['--effect-backdrop'], 'none')
  assert.equal(t('tech-minimal')['--media-hover-scale'], '1.03')
  assert.equal(t('tech-minimal')['--stagger-step'], '60ms')
  assert.equal(t('tech-minimal')['--enter-shift'], '12px')

  // 风格二 Liquid Glass
  assert.equal(t('liquid-glass')['--text-primary'], '#1e1b4b')
  assert.equal(t('liquid-glass')['--accent'], '#6366f1')
  assert.equal(t('liquid-glass')['--bg-surface'], 'rgba(255, 255, 255, 0.55)')
  assert.equal(t('liquid-glass')['--border'], 'rgba(255, 255, 255, 0.6)')
  assert.equal(t('liquid-glass')['--radius-card'], '20px')
  assert.equal(t('liquid-glass')['--radius-panel'], '24px')
  assert.equal(t('liquid-glass')['--radius-btn'], '14px')
  assert.equal(t('liquid-glass')['--radius-input'], '9999px')
  assert.equal(t('liquid-glass')['--radius-media'], '16px')
  assert.equal(t('liquid-glass')['--card-padding'], '24px')
  assert.equal(t('liquid-glass')['--grid-gap'], '20px')
  assert.equal(t('liquid-glass')['--section-gap'], '100px')
  assert.equal(t('liquid-glass')['--shadow-card'], '0 8px 32px rgba(99, 102, 241, 0.08)')
  assert.match(t('liquid-glass')['--effect-backdrop'], /blur\(16px\) saturate\(180%\)/)
  assert.match(t('liquid-glass')['--effect-backdrop-hover'], /blur\(24px\)/)
  assert.match(t('liquid-glass')['--nav-backdrop'], /blur\(20px\) saturate\(180%\)/)
  assert.match(t('liquid-glass')['--enter-ease'], /cubic-bezier\(0\.34, 1\.56, 0\.64, 1\)/)
  assert.match(t('liquid-glass')['--mesh-animation'], /20s/)

  // 风格三 Bento Editorial
  assert.equal(t('bento-editorial')['--bg-page'], '#f7f7f5')
  assert.equal(t('bento-editorial')['--text-primary'], '#1a1a1a')
  assert.equal(t('bento-editorial')['--accent'], '#d62872')
  assert.equal(t('bento-editorial')['--bg-surface'], '#ffffff')
  assert.equal(t('bento-editorial')['--border'], '#ebebeb')
  assert.equal(t('bento-editorial')['--text-muted'], '#8a8a8a')
  assert.equal(t('bento-editorial')['--price-color'], '#d62872')
  assert.equal(t('bento-editorial')['--radius-card'], '20px')
  assert.equal(t('bento-editorial')['--radius-panel'], '16px')
  assert.equal(t('bento-editorial')['--radius-btn'], '10px')
  assert.equal(t('bento-editorial')['--radius-input'], '24px')
  assert.equal(t('bento-editorial')['--radius-media'], '12px')
  assert.equal(t('bento-editorial')['--shadow-card'], '0 1px 3px rgba(0, 0, 0, 0.04)')
  assert.equal(t('bento-editorial')['--card-hover-border'], '#d4d4d4')
  assert.equal(t('bento-editorial')['--media-hover-scale'], '1.02')
  assert.equal(t('bento-editorial')['--grid-gap'], '14px')
  assert.equal(t('bento-editorial')['--enter-shift'], '8px')
  assert.match(t('bento-editorial')['--font-display'], /Playfair Display/)

  // 风格四 Neo-Brutalism
  assert.equal(t('neo-brutalism')['--bg-page'], '#ffffff')
  assert.equal(t('neo-brutalism')['--text-primary'], '#000000')
  assert.equal(t('neo-brutalism')['--accent'], '#ff6b35')
  assert.equal(t('neo-brutalism')['--bg-footer'], '#1a1a2e')
  assert.equal(t('neo-brutalism')['--radius-card'], '12px')
  assert.equal(t('neo-brutalism')['--radius-cta'], '0px')
  assert.equal(t('neo-brutalism')['--cta-border-width'], '3px')
  assert.equal(t('neo-brutalism')['--shadow-cta'], '6px 6px 0 #000000')
  assert.equal(t('neo-brutalism')['--shadow-cta-hover'], '3px 3px 0 #000000')
  assert.equal(t('neo-brutalism')['--shadow-cta-active'], '0 0 0 #000000')
  assert.equal(t('neo-brutalism')['--cta-hover-transform'], 'translate(3px, 3px)')
  assert.equal(t('neo-brutalism')['--cta-active-transform'], 'translate(6px, 6px)')
  assert.equal(t('neo-brutalism')['--transition-cta'], '0.1s linear')
  assert.equal(t('neo-brutalism')['--heading-transform'], 'uppercase')
  assert.equal(t('neo-brutalism')['--label-transform'], 'uppercase')

  // 风格五 Technical Monochrome
  assert.equal(t('technical-monochrome')['--bg-page'], '#0d0d0d')
  assert.equal(t('technical-monochrome')['--text-primary'], '#e8e8e8')
  assert.equal(t('technical-monochrome')['--accent'], '#22c55e')
  assert.equal(t('technical-monochrome')['--bg-surface'], '#1a1a1a')
  assert.equal(t('technical-monochrome')['--border'], '#2a2a2a')
  assert.equal(t('technical-monochrome')['--bg-surface-2'], '#141414')
  assert.equal(t('technical-monochrome')['--text-muted'], '#6b6b6b')
  assert.equal(t('technical-monochrome')['--radius-card'], '4px')
  assert.equal(t('technical-monochrome')['--radius-btn'], '6px')
  assert.equal(t('technical-monochrome')['--radius-input'], '6px')
  assert.equal(t('technical-monochrome')['--radius-media'], '6px')
  assert.equal(t('technical-monochrome')['--space-unit'], '4px')
  assert.equal(t('technical-monochrome')['--card-padding'], '16px')
  assert.equal(t('technical-monochrome')['--grid-gap'], '12px')
  assert.equal(t('technical-monochrome')['--section-gap'], '72px')
  assert.equal(t('technical-monochrome')['--shadow-card'], 'none')
  assert.equal(t('technical-monochrome')['--card-hover-border'], '#22c55e')
  assert.equal(t('technical-monochrome')['--media-hover-scale'], '1')
  assert.equal(t('technical-monochrome')['--leading-body'], '1.6')
  assert.equal(t('technical-monochrome')['--label-transform'], 'uppercase')
  assert.equal(getTheme('technical-monochrome').price.prefix, '$')
})

test('五套主题的字体族全部带 CJK 兜底（中文不会掉到浏览器默认字体）', () => {
  // 只要求「栈里显式声明了 CJK 族」，不限定具体是哪一款：
  // 衬线标题用宋体系（Songti/Noto Serif SC）比黑体系更协调。
  const CJK_FAMILIES =
    /PingFang SC|Hiragino Sans GB|Microsoft YaHei|Noto Sans SC|Songti SC|Noto Serif SC|SimSun/
  const problems = []
  for (const theme of THEMES) {
    for (const key of ['--font-display', '--font-body', '--font-mono', '--font-price']) {
      const value = theme.tokens[key]
      if (!CJK_FAMILIES.test(value)) problems.push(`${theme.id} / ${key}`)
    }
  }
  assert.deepEqual(problems, [], `以下字体令牌缺少 CJK 兜底：\n  ${problems.join('\n  ')}`)
})

test('CUSTOM_FIELDS 与 DEFAULT_CUSTOM 一一对应，且默认值都能被合成消费', () => {
  const keys = CUSTOM_FIELDS.map((f) => f.key)
  assert.deepEqual([...keys].sort(), Object.keys(DEFAULT_CUSTOM).sort())
  for (const field of CUSTOM_FIELDS) {
    assert.ok(field.label && field.hint, `${field.key} 缺少文案`)
    assert.ok(['range', 'color', 'select', 'text'].includes(field.type), `${field.key} 类型非法`)
  }
})

// ── store 行为 ─────────────────────────────────────────────────

const { useThemeStore, THEME_STORAGE_KEY } = await loadAppModule('/stores/theme.js')

/** 造一个可记录写入的 document，用于断言 apply() 真的把令牌写到了 :root 上 */
function withRecordingDocument(run) {
  const saved = globalThis.document
  const written = {}
  globalThis.document = {
    documentElement: {
      style: {
        setProperty: (name, value) => {
          written[name] = value
        },
      },
      dataset: {},
    },
  }
  try {
    run()
  } finally {
    if (saved === undefined) delete globalThis.document
    else globalThis.document = saved
  }
  return written
}

async function freshStore() {
  resetStorage()
  const { createPinia, setActivePinia } = await import('pinia')
  setActivePinia(createPinia())
  return useThemeStore()
}

test('默认状态：使用 tech-minimal、无自定义、弹窗关闭', async () => {
  const store = await freshStore()
  assert.equal(store.themeId, 'tech-minimal')
  assert.equal(store.isCustomized, false)
  assert.deepEqual(store.customizedKeys, [])
  assert.equal(store.panelOpen, false)
  assert.equal(store.pricePrefix, '¥')
})

test('setTheme：切换后 getter 与持久化同步更新', async () => {
  const store = await freshStore()
  store.setTheme('technical-monochrome')

  assert.equal(store.themeId, 'technical-monochrome')
  assert.equal(store.pricePrefix, '$')
  assert.equal(store.scheme, 'dark')

  const saved = JSON.parse(localStorage.getItem(THEME_STORAGE_KEY))
  assert.equal(saved.themeId, 'technical-monochrome')
})

test('setTheme：非法 id 退回默认主题（不会把 store 置成空主题）', async () => {
  const store = await freshStore()
  store.setTheme('不存在的主题')
  assert.equal(store.themeId, 'tech-minimal')
})

test('setCustom / resetCustomField / resetCustom：逐项与整体还原', async () => {
  const store = await freshStore()

  store.setCustom('fontScale', 1.2)
  store.setCustom('accent', '#ff00aa')
  assert.deepEqual([...store.customizedKeys].sort(), ['accent', 'fontScale'])

  store.resetCustomField('fontScale')
  assert.deepEqual(store.customizedKeys, ['accent'])

  store.resetCustom()
  assert.equal(store.isCustomized, false)
  assert.equal(store.tokens['--accent'], getTheme('tech-minimal').tokens['--accent'])
})

test('setCustom：未知键被忽略（防止外部写入污染 state）', async () => {
  const store = await freshStore()
  store.setCustom('不存在的字段', 1)
  assert.equal('不存在的字段' in store.custom, false)
})

test('resetAll：同时恢复默认主题并清空自定义', async () => {
  const store = await freshStore()
  store.setTheme('neo-brutalism')
  store.setCustom('density', 1.2)
  store.resetAll()

  assert.equal(store.themeId, 'tech-minimal')
  assert.equal(store.isCustomized, false)
})

test('init：从本地偏好恢复主题与自定义', async () => {
  const store = await freshStore()
  localStorage.setItem(
    THEME_STORAGE_KEY,
    JSON.stringify({ themeId: 'bento-editorial', custom: { fontScale: 1.1, 脏键: 1 } })
  )

  store.init()

  assert.equal(store.themeId, 'bento-editorial')
  assert.equal(store.custom.fontScale, 1.1)
  assert.equal('脏键' in store.custom, false, '历史残留的键不应进入 state')
})

test('init：本地偏好是脏数据时不抛错，退回默认主题', async () => {
  const store = await freshStore()
  localStorage.setItem(THEME_STORAGE_KEY, '{ 这不是 JSON')

  assert.doesNotThrow(() => store.init())
  assert.equal(store.themeId, 'tech-minimal')
})

test('apply：把全部令牌写到 documentElement 的行内样式上', async () => {
  const store = await freshStore()
  store.setTheme('liquid-glass')
  const written = withRecordingDocument(() => store.apply())

  assert.deepEqual(assertTokenContract(written), [])
  assert.equal(written['--accent'], '#6366f1')
  assert.equal(written['--bg-page'], getTheme('liquid-glass').tokens['--bg-page'])
})

test('apply：documentElement 不可写时静默跳过（SSR / 测试桩）', async () => {
  const store = await freshStore()
  const saved = globalThis.document
  globalThis.document = { documentElement: { style: {} } }
  try {
    assert.doesNotThrow(() => store.apply())
  } finally {
    globalThis.document = saved
  }
})

test('togglePanel / openPanel / closePanel：弹窗状态由 store 集中管理', async () => {
  const store = await freshStore()
  store.togglePanel()
  assert.equal(store.panelOpen, true)
  store.closePanel()
  assert.equal(store.panelOpen, false)
  store.openPanel()
  assert.equal(store.panelOpen, true)
})
