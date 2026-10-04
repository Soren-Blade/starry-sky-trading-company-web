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

/**
 * 组件尺寸速查总表（规范第十五节）逐格断言。
 *
 * 行 = 令牌，列 = 五套风格。这张表是「组件尺寸规范」的浓缩版；
 * 只要它能对上，输入框/按钮/卡片/导航/分页/进度条的尺寸就不会被手感改坏。
 */
const COMPONENT_TABLE = {
  // 组件               TechMin  LiquidGlass  Bento     NeoBrutal  TechMono
  '--input-height': ['40px', '48px', '44px', '48px', '36px'],
  '--radius-input': ['12px', '9999px', '24px', '8px', '6px'],
  '--btn-height': ['40px', '48px', '44px', '52px', '36px'],
  '--btn-radius': ['8px', '14px', '10px', '0px', '6px'],
  '--icon-btn-size': ['40px', '44px', '40px', '44px', '32px'],
  '--icon-btn-radius': ['8px', '9999px', '10px', '0px', '6px'],
  '--card-width': ['280px', '300px', '280px', '280px', '260px'],
  '--card-width-lg': ['280px', '300px', '400px', '280px', '260px'],
  '--card-padding': ['20px', '24px', '18px', '24px', '16px'],
  '--card-padding-lg': ['20px', '24px', '28px', '24px', '16px'],
  '--radius-card': ['12px', '20px', '16px', '12px', '4px'],
  '--grid-gap': ['16px', '20px', '14px', '16px', '12px'],
  '--card-image-height': ['200px', '220px', '180px', '200px', '180px'],
  '--card-image-height-lg': ['200px', '220px', '280px', '200px', '180px'],
  '--radius-media': ['8px', '16px', '12px', '8px', '4px'],
  '--fs-price': ['20px', '22px', '18px', '20px', '24px'],
  '--toast-width': ['360px', '380px', '360px', '380px', '340px'],
  '--modal-width': ['480px', '520px', '480px', '520px', '440px'],
  '--dropdown-item-height': ['36px', '40px', '38px', '44px', '32px'],
  '--tag-height': ['22px', '26px', '24px', '26px', '20px'],
  '--navbar-height': ['64px', '72px', '68px', '72px', '56px'],
  '--pager-size': ['36px', '40px', '38px', '44px', '32px'],
  '--progress-height': ['4px', '6px', '6px', '8px', '4px'],
  '--checkbox-size': ['18px', '20px', '18px', '22px', '16px'],
  '--space-unit': ['8px', '8px', '8px', '8px', '4px'],
}

test('组件尺寸速查总表：每格都必须与规范一致', () => {
  const problems = []
  for (const [token, column] of Object.entries(COMPONENT_TABLE)) {
    THEMES.forEach((theme, index) => {
      const actual = theme.tokens[token]
      if (actual !== column[index]) {
        problems.push(`${theme.id} / ${token}：期望 ${column[index]}，实际 ${actual}`)
      }
    })
  }
  assert.deepEqual(problems, [], `组件尺寸与规范不符：\n  ${problems.join('\n  ')}`)
})

/**
 * 组件套件速查总表（规范第三批 第二十节）逐格断言。
 *
 * 与上面的 COMPONENT_TABLE 同构，只是换成第三批那 25 行。
 * 这两张表加起来覆盖了规范里所有「逐格给值」的尺寸，改错一个数字就会失败。
 */
const KIT_TABLE = {
  // 组件             TechMin  LiquidGlass  Bento     NeoBrutal  TechMono
  '--input-height': ['40px', '48px', '44px', '48px', '36px'], // 下拉触发器高（复用输入框令牌）
  '--dropdown-radius': ['12px', '16px', '12px', '0px', '4px'], // 下拉面板圆角
  '--dropdown-item-height': ['36px', '40px', '38px', '44px', '32px'],
  '--checkbox-size': ['18px', '20px', '18px', '22px', '16px'],
  '--checkbox-radius': ['4px', '6px', '4px', '0px', '2px'],
  '--radio-size': ['18px', '20px', '18px', '22px', '16px'],
  '--switch-track-w': ['40px', '44px', '42px', '48px', '36px'],
  '--switch-track-h': ['22px', '24px', '24px', '26px', '20px'],
  '--switch-thumb-size': ['18px', '20px', '20px', '22px', '16px'],
  '--slider-track-h': ['4px', '6px', '6px', '8px', '4px'],
  '--slider-thumb-size': ['18px', '20px', '20px', '24px', '16px'],
  '--step-dot-size': ['28px', '32px', '30px', '36px', '24px'],
  '--accordion-item-height': ['56px', '64px', '60px', '64px', '48px'],
  '--tab-height': ['40px', '44px', '42px', '48px', '36px'],
  '--breadcrumb-height': ['24px', '28px', '26px', '28px', '22px'],
  '--table-row-height': ['48px', '56px', '52px', '56px', '40px'],
  '--datepicker-width': ['280px', '320px', '300px', '320px', '260px'],
  '--datepicker-cell-size': ['36px', '40px', '38px', '44px', '32px'],
  '--upload-height': ['160px', '180px', '160px', '180px', '140px'],
  '--rating-star-size': ['16px', '18px', '16px', '20px', '14px'],
  '--tooltip-padding-y': ['6px', '8px', '8px', '8px', '6px'],
  '--tooltip-padding-x': ['10px', '14px', '12px', '12px', '10px'],
  '--tooltip-radius': ['6px', '10px', '8px', '0px', '4px'],
  '--drawer-width': ['400px', '440px', '420px', '440px', '380px'],
  '--badge-height': ['18px', '20px', '18px', '22px', '16px'],
  '--scrollbar-width': ['8px', '10px', '8px', '12px', '6px'],
  // 骨架圆角规范写「同组件」，因此不登记令牌 —— 由使用点 inherit / --radius-card 决定
}

test('组件套件速查总表（第三批 §20）：每格都必须与规范一致', () => {
  const problems = []
  for (const [token, column] of Object.entries(KIT_TABLE)) {
    THEMES.forEach((theme, index) => {
      const actual = theme.tokens[token]
      if (actual !== column[index]) {
        problems.push(`${theme.id} / ${token}：期望 ${column[index]}，实际 ${actual}`)
      }
    })
  }
  assert.deepEqual(problems, [], `组件套件尺寸与规范不符：\n  ${problems.join('\n  ')}`)
})

test('第三批 §16：骨架屏在 neo 用脉冲、其余用 shimmer（动画名逐风格不同）', () => {
  assert.equal(getTheme('tech-minimal').tokens['--skeleton-animation-name'], 'skeleton-shimmer')
  assert.equal(getTheme('liquid-glass').tokens['--skeleton-animation-name'], 'skeleton-shimmer')
  assert.equal(getTheme('bento-editorial').tokens['--skeleton-animation-name'], 'skeleton-shimmer')
  assert.equal(getTheme('neo-brutalism').tokens['--skeleton-animation-name'], 'skeleton-pulse')
  assert.equal(getTheme('technical-monochrome').tokens['--skeleton-animation-name'], 'skeleton-shimmer')
  // 时长逐风格：1.5 / 1.8 / 1.5 / 1 / 1.2
  assert.deepEqual(
    THEMES.map((t) => t.tokens['--skeleton-duration']),
    ['1.5s', '1.8s', '1.5s', '1s', '1.2s']
  )
})

test('第三批 §1：下拉面板阴影与 --shadow-float 逐套同值（因此不另立令牌）', () => {
  // §1 面板阴影列 = tech 0 8px 24px rgba(0,0,0,.4) / glass 0 8px 32px rgba(99,102,241,.12)
  //                  / bento 0 4px 16px rgba(0,0,0,.08) / neo 6px 6px 0 #000000 / mono 无
  // 与第二批为提示框登记的 --shadow-float 五套逐值相同 —— 于是共用同一个令牌，
  // 不新增 --dropdown-shadow（这条断言就是防止有人日后又把它拆成两个）。
  assert.deepEqual(
    THEMES.map((t) => t.tokens['--shadow-float']),
    [
      '0 8px 24px rgba(0, 0, 0, 0.4)',
      '0 8px 32px rgba(99, 102, 241, 0.12)',
      '0 4px 16px rgba(0, 0, 0, 0.08)',
      '6px 6px 0 #000000',
      'none',
    ]
  )
  assert.equal(
    THEMES.some((t) => '--dropdown-shadow' in t.tokens),
    false,
    '下拉面板阴影必须复用 --shadow-float，不得另立 --dropdown-shadow'
  )
})

test('第三批 §15/§19：抽屉遮罩模糊与滚动条只在 glass 有模糊、neo 无圆角', () => {
  assert.equal(getTheme('liquid-glass').tokens['--drawer-scrim-backdrop'], 'blur(8px)')
  assert.equal(getTheme('tech-minimal').tokens['--drawer-scrim-backdrop'], 'none')
  assert.equal(getTheme('neo-brutalism').tokens['--scrollbar-thumb-radius'], '0px')
  assert.equal(getTheme('technical-monochrome').tokens['--scrollbar-width'], '6px')
})

test('聚焦态：五套风格各自的做法必须原样落地', () => {
  const t = (id) => getTheme(id).tokens

  // Tech Minimal：边框变 #3B82F6 + 外发光 0 0 0 3px rgba(59,130,246,0.15)
  assert.equal(t('tech-minimal')['--input-focus-border'], '#3b82f6')
  assert.equal(t('tech-minimal')['--input-focus-shadow'], '0 0 0 3px rgba(59, 130, 246, 0.15)')

  // Liquid Glass：blur 增至 24px、边框变 #6366F1
  assert.equal(t('liquid-glass')['--input-focus-border'], '#6366f1')
  assert.match(t('liquid-glass')['--input-focus-backdrop'], /blur\(24px\)/)

  // Bento：边框变 #D62872、无外发光
  assert.equal(t('bento-editorial')['--input-focus-border'], '#d62872')
  assert.equal(t('bento-editorial')['--input-focus-shadow'], 'none')

  // Neo-Brutalism：边框保持 2px #000000、阴影 4px 4px 0 #000000
  assert.equal(t('neo-brutalism')['--stroke-width'], '2px')
  assert.equal(t('neo-brutalism')['--stroke-color'], '#000000')
  assert.equal(t('neo-brutalism')['--input-focus-shadow'], '4px 4px 0 #000000')

  // Technical Mono：outline 2px solid #22C55E、offset 2px
  assert.equal(t('technical-monochrome')['--input-focus-outline'], '2px solid #22c55e')
  assert.equal(t('technical-monochrome')['--input-focus-outline-offset'], '2px')
})

test('主按钮悬停态：五套风格各自的做法必须原样落地', () => {
  const t = (id) => getTheme(id).tokens

  assert.equal(t('tech-minimal')['--btn-hover-bg'], '#2563eb')
  assert.equal(t('tech-minimal')['--btn-hover-transform'], 'none')

  assert.equal(t('liquid-glass')['--btn-hover-transform'], 'translateY(-2px)')
  assert.equal(t('liquid-glass')['--btn-shadow'], '0 4px 16px rgba(99, 102, 241, 0.2)')

  // bento：背景变深 10%（#D62872 → #C12467）
  assert.equal(t('bento-editorial')['--btn-hover-bg'], '#c12467')

  // neo：translate(3px,3px) + 阴影 3px 3px 0 #000
  assert.equal(t('neo-brutalism')['--btn-shadow'], '6px 6px 0 #000000')
  assert.equal(t('neo-brutalism')['--btn-hover-shadow'], '3px 3px 0 #000000')
  assert.equal(t('neo-brutalism')['--btn-hover-transform'], 'translate(3px, 3px)')
  assert.equal(t('neo-brutalism')['--btn-active-transform'], 'translate(6px, 6px)')
  assert.equal(t('neo-brutalism')['--transition-btn'], '0.1s linear')

  // mono：悬停只换边框色
  assert.equal(t('technical-monochrome')['--btn-hover-border'], '#22c55e')
  assert.equal(t('technical-monochrome')['--btn-border-width'], '1px')
})

test('价格：字号/字重/字体/颜色/小数处理按规范', () => {
  const t = (id) => getTheme(id).tokens

  assert.equal(t('tech-minimal')['--fw-price'], '500')
  assert.match(t('tech-minimal')['--font-price'], /JetBrains Mono/)
  assert.equal(t('tech-minimal')['--fs-price-decimals'], '14px', '小数小一号')
  assert.equal(t('tech-minimal')['--fs-price-original'], '18px', '原价小 2px')
  assert.equal(getTheme('tech-minimal').price.decimals, 2)

  assert.equal(t('liquid-glass')['--fw-price'], '600')
  assert.match(t('liquid-glass')['--font-price'], /Geist Mono/)
  assert.equal(t('liquid-glass')['--fs-price-decimals'], '15px')

  assert.equal(t('bento-editorial')['--price-color'], '#d62872')
  assert.match(t('bento-editorial')['--font-price'], /Oxygen/)
  assert.equal(getTheme('bento-editorial').price.decimals, 0, 'bento 无小数')

  assert.equal(t('neo-brutalism')['--price-color'], '#000000')
  assert.equal(getTheme('neo-brutalism').price.decimals, 0, 'neo 无小数')

  assert.equal(t('technical-monochrome')['--price-color'], '#22c55e')
  assert.equal(t('technical-monochrome')['--price-bg'], '#141414')
  assert.equal(getTheme('technical-monochrome').price.prefix, '$')
  assert.equal(getTheme('technical-monochrome').price.decimals, 0, 'mono 无小数')
})

test('语义色与提示框位置：规范标注的「5 套通用」部分必须五套一致', () => {
  for (const theme of THEMES) {
    const t = theme.tokens
    assert.equal(t['--success'], '#22c55e', `${theme.id} 成功色`)
    assert.equal(t['--warning'], '#f59e0b', `${theme.id} 警告色`)
    assert.equal(t['--danger'], '#ef4444', `${theme.id} 错误色`)
    assert.equal(t['--info'], '#3b82f6', `${theme.id} 信息色`)
    assert.equal(t['--toast-offset'], '24px', `${theme.id} 提示框距边`)
    assert.equal(t['--toast-gap'], '12px', `${theme.id} 提示框堆叠间距`)
    assert.equal(t['--modal-title-gap'], '16px')
    assert.equal(t['--modal-body-gap'], '24px')
    assert.equal(t['--modal-footer-gap'], '12px')
    // 注意：--dropdown-item-padding-x 与 --skeleton-duration 原本在「5 套通用」清单里，
    // 第三批规范（§1 选项内边距 14/18/16/18/12、§16 骨架屏时长 1.5/1.8/1.5/1/1.2 且 neo 用脉冲）
    // 把它们改成了逐风格取值 —— 于是从本清单移出，改由「组件尺寸速查总表」逐格断言。
    assert.equal(t['--dropdown-active-bar'], '2px')
    assert.equal(t['--micro-badge-radius'], '4px')
    assert.equal(t['--mobile-nav-scale'], '0.85')
    assert.equal(t['--mobile-control-scale'], '0.9')
    assert.equal(t['--mobile-padding-scale'], '0.8')
    assert.equal(t['--mobile-section-scale'], '0.6')
    assert.equal(t['--mobile-title-scale'], '0.7')
    assert.equal(t['--mobile-body-scale'], '0.95')
  }
})

test('基础层的风格语言（颜色/字体/阴影/动效）按规范', () => {
  const t = (id) => getTheme(id).tokens

  // 风格一 Tech Minimal
  assert.equal(t('tech-minimal')['--bg-page'], '#0a0a0a')
  assert.equal(t('tech-minimal')['--text-primary'], '#fafafa')
  assert.equal(t('tech-minimal')['--accent'], '#3b82f6')
  assert.equal(t('tech-minimal')['--bg-surface'], '#27272a')
  assert.equal(t('tech-minimal')['--border'], '#2a2a2d')
  assert.equal(t('tech-minimal')['--placeholder'], '#3f3f46')
  assert.equal(t('tech-minimal')['--shadow-card'], 'none')
  assert.equal(t('tech-minimal')['--effect-backdrop'], 'none')
  assert.equal(t('tech-minimal')['--media-hover-scale'], '1.03')
  assert.equal(t('tech-minimal')['--stagger-step'], '60ms')
  assert.equal(t('tech-minimal')['--enter-shift'], '12px')
  assert.equal(t('tech-minimal')['--transition-interactive'], '0.2s ease-out')

  // 风格二 Liquid Glass
  assert.equal(t('liquid-glass')['--text-primary'], '#1e1b4b')
  assert.equal(t('liquid-glass')['--accent'], '#6366f1')
  assert.equal(t('liquid-glass')['--bg-surface'], 'rgba(255, 255, 255, 0.55)')
  assert.equal(t('liquid-glass')['--border'], 'rgba(255, 255, 255, 0.6)')
  assert.equal(t('liquid-glass')['--placeholder'], '#6b7280')
  assert.equal(t('liquid-glass')['--shadow-card'], '0 8px 32px rgba(99, 102, 241, 0.08)')
  assert.equal(t('liquid-glass')['--shadow-card-hover'], '0 8px 32px rgba(99, 102, 241, 0.14)')
  assert.match(t('liquid-glass')['--effect-backdrop'], /blur\(16px\) saturate\(180%\)/)
  assert.match(t('liquid-glass')['--nav-backdrop'], /blur\(20px\) saturate\(180%\)/)
  assert.equal(t('liquid-glass')['--card-hover-transform'], 'translateY(-4px)')
  assert.match(t('liquid-glass')['--enter-ease'], /cubic-bezier\(0\.34, 1\.56, 0\.64, 1\)/)
  assert.match(t('liquid-glass')['--mesh-animation'], /20s/)
  assert.match(t('liquid-glass')['--font-display'], /Instrument Sans/)

  // 风格三 Bento Editorial
  assert.equal(t('bento-editorial')['--bg-page'], '#f7f7f5')
  assert.equal(t('bento-editorial')['--text-primary'], '#1a1a1a')
  assert.equal(t('bento-editorial')['--accent'], '#d62872')
  assert.equal(t('bento-editorial')['--border'], '#ebebeb')
  assert.equal(t('bento-editorial')['--text-muted'], '#8a8a8a')
  assert.equal(t('bento-editorial')['--placeholder'], '#8a8a8a')
  assert.equal(t('bento-editorial')['--shadow-card'], '0 1px 3px rgba(0, 0, 0, 0.04)')
  assert.equal(t('bento-editorial')['--card-hover-border'], '#d4d4d4')
  assert.equal(t('bento-editorial')['--media-hover-scale'], '1.02')
  assert.equal(t('bento-editorial')['--enter-shift'], '8px')
  assert.match(t('bento-editorial')['--font-display'], /Playfair Display/)

  // 风格四 Neo-Brutalism
  assert.equal(t('neo-brutalism')['--bg-page'], '#ffffff')
  assert.equal(t('neo-brutalism')['--text-primary'], '#000000')
  assert.equal(t('neo-brutalism')['--accent'], '#ff6b35')
  assert.equal(t('neo-brutalism')['--bg-footer'], '#1a1a2e')
  assert.equal(t('neo-brutalism')['--placeholder'], '#666666')
  assert.equal(t('neo-brutalism')['--modal-shadow'], '8px 8px 0 #000000')
  assert.equal(t('neo-brutalism')['--shadow-float'], '6px 6px 0 #000000')
  assert.equal(t('neo-brutalism')['--heading-transform'], 'uppercase')
  assert.equal(t('neo-brutalism')['--label-transform'], 'uppercase')

  // 风格五 Technical Monochrome
  assert.equal(t('technical-monochrome')['--bg-page'], '#0d0d0d')
  assert.equal(t('technical-monochrome')['--text-primary'], '#e8e8e8')
  assert.equal(t('technical-monochrome')['--accent'], '#22c55e')
  assert.equal(t('technical-monochrome')['--border'], '#2a2a2a')
  assert.equal(t('technical-monochrome')['--bg-surface-2'], '#141414')
  assert.equal(t('technical-monochrome')['--text-muted'], '#6b6b6b')
  assert.equal(t('technical-monochrome')['--shadow-card'], 'none')
  assert.equal(t('technical-monochrome')['--shadow-float'], 'none')
  assert.equal(t('technical-monochrome')['--modal-shadow'], 'none')
  assert.equal(t('technical-monochrome')['--media-hover-scale'], '1')
  assert.equal(t('technical-monochrome')['--leading-body'], '1.6')
  assert.equal(t('technical-monochrome')['--transition-interactive'], '0.15s ease')
  assert.match(t('technical-monochrome')['--font-display'], /JetBrains Mono/)
  assert.match(t('technical-monochrome')['--font-mono'], /JetBrains Mono/)
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

/**
 * 取出某个选择器的规则块（这些分片里没有嵌套规则，取到第一个 `}` 即可）。
 * @param {string} css
 * @param {string} selector
 * @returns {string|null}
 */
function ruleBlock(css, selector) {
  const at = css.indexOf(`${selector} {`)
  if (at < 0) return null
  const end = css.indexOf('}', at)
  return css.slice(at, end)
}

test('浮层面板必须带毛玻璃：只有 liquid-glass 的半透明底色会因此露馅', () => {
  /*
   * 真机排查出来的缺陷（用户反馈「只有液态玻璃有这个毛病」）：
   *
   * 五套里**只有 liquid-glass** 的 `--effect-backdrop` 不是 none，也**只有它**的
   * `--bg-elevated` 是半透明（rgba(255,255,255,0.72)）。半透明的底色必须配一层
   * backdrop-filter 才成立；缺了它，「半透明」就等于「透明」—— 面板背后的表单文字
   * 会直接透上来，与日期数字叠在一起，表现就是「文字太拥挤」。
   *
   * `.ui-card` / `.u-modal` / `.u-toast` / `.u-dropdown` 一直都有这一层，
   * 第三批新增的四个浮层面板漏了 —— 这条断言就是钉住它们。
   */
  const glass = getTheme('liquid-glass').tokens
  assert.notEqual(glass['--effect-backdrop'], 'none', '前提：glass 确实有毛玻璃令牌')
  assert.match(glass['--bg-elevated'], /^rgba\(/, '前提：glass 的浮层底色确实是半透明的')

  const targets = [
    ['ui-kit-form.css', '.u-select-panel'],
    ['ui-kit-data.css', '.u-datepicker'],
    ['ui-kit-feedback.css', '.u-tooltip'],
    ['ui-kit-feedback.css', '.u-drawer'],
  ]

  const missing = []
  for (const [file, selector] of targets) {
    const css = fs.readFileSync(path.join(WEB_ROOT, 'src', 'assets', 'styles', file), 'utf8')
    const block = ruleBlock(css, selector)
    if (!block) {
      missing.push(`${file} 里找不到 ${selector}`)
      continue
    }
    if (!/backdrop-filter:\s*var\(--effect-backdrop\)/.test(block)) {
      missing.push(`${file} 的 ${selector} 未应用 --effect-backdrop`)
    }
  }

  assert.deepEqual(missing, [], `以下浮层缺毛玻璃，glass 下会透出背后的文字：\n  ${missing.join('\n  ')}`)
})

test('浮层面板的宽度上限取视口而不是字段（字段常比设计宽度窄）', () => {
  /*
   * 真机实测：Profile 的生日字段是两列栅格里的一格，1440px 下只有 263px 宽。
   * 面板原写 `max-width: 100%`，于是被压到 263px —— 7 列各 31px、13px 的数字
   * 几乎顶到格边。面板是**浮层**，没有理由跟着字段一起变窄，上限应当按视口收口，
   * 只在视口本身就窄时才继续收缩。
   */
  const css = fs.readFileSync(
    path.join(WEB_ROOT, 'src', 'components', 'DatePickerField.vue'),
    'utf8'
  )
  const block = ruleBlock(css, '.datepicker-panel')
  assert.ok(block, '应能找到 .datepicker-panel 规则')
  // 先剥注释：这段的说明文字里恰好引用了 `max-width: 100%` 这个反面写法，
  // 不剥掉的话 doesNotMatch 会把注释当成实现（同 `<select` 那次的坑）。
  const decls = block.replace(/\/\*[\s\S]*?\*\//g, '')
  assert.match(decls, /max-width:\s*calc\(100vw -/, 'max-width 应按视口收口')
  assert.doesNotMatch(decls, /max-width:\s*100%/, '不要再退回「跟着字段变窄」')
  assert.match(decls, /max-height:\s*calc\(100dvh -/, '还要有视口高度上限')
  assert.match(decls, /overflow:\s*auto/, '超高时改为面板内滚动')
})
