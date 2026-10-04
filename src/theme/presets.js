/**
 * 五套设计风格的令牌预设（主题的唯一取值来源）
 * ============================================================================
 *
 * ## 与 variables.css 的分工
 *
 * - `assets/styles/variables.css` —— 令牌**名册** + 默认主题的兜底值；
 * - 本文件 —— 五套风格的**完整取值**，由 `stores/theme.js` 写到 `<html>` 行内样式。
 *
 * 两者的令牌集合必须完全一致，`test/themeContract.test.js` 会强制校验。
 * 新增令牌时的改动顺序：variables.css 登记 → 本文件五套都补 → 组件里真正用上。
 *
 * ## 每套主题的取值依据
 *
 * 取值直接来自设计规范，注释里标了规范条款（颜色/字体/圆角/间距/阴影/动效）。
 * **不要凭手感改数值** —— 规范里有明确数字的先按规范，规范没写的才按体系推导。
 */

/** 中文界面必须显式声明 CJK 字体，否则跨平台观感不一致 */
const CJK_SANS = "'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', 'Noto Sans SC'"
const CJK_SERIF = "'Songti SC', 'Noto Serif SC', 'SimSun'"
const CJK = `${CJK_SANS}, sans-serif`
const INTER = `'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', ${CJK}`
// 等宽栈也要带 CJK：价格、卡号、关键词计数这些位置都会混排中文，
// 缺 CJK 族时浏览器会各自挑一个默认中文字体，同一行里出现两种字形。
const JETBRAINS = `'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, Consolas, ${CJK_SANS}, monospace`
const GEIST_MONO = `'Geist Mono', 'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, ${CJK_SANS}, monospace`
const INSTRUMENT = `'Instrument Sans', ${INTER}`
const PLAYFAIR = `'Playfair Display', ${CJK_SERIF}, Georgia, serif`
const CENTURY = `'Century Gothic', 'Oxygen', 'Futura', 'Inter', ${CJK}`
const CONDENSED = `'Instrument Sans', 'Archivo Narrow', 'Arial Narrow', ${CJK_SANS}, sans-serif`

/**
 * 与风格无关的容器尺寸。
 * 五套风格共用同一套栅格宽度，避免切换主题时页面骨架跳动。
 */
const LAYOUT = {
  '--navbar-height': '64px',
  '--container-max': '1320px',
  '--container-content': '1280px',
  '--container-narrow': '1000px',
  '--container-padding': '20px',
}

/** 背景层的默认值：不覆盖主题自带背景，也不留下空转的网格动画 */
const BACKGROUND_DEFAULTS = {
  '--bg-media': 'none',
  '--bg-media-opacity': '0.18',
  '--mesh-animation': 'none',
}

export const THEMES = [
  /* ──────────────────────────────────────────────────────────────
   * 风格一：Tech Minimal（暗色科技极简）
   * 参考 Vercel / Linear / Reflect。安静的未来主义，视觉重量由排版与间距承担。
   * ────────────────────────────────────────────────────────────── */
  {
    id: 'tech-minimal',
    name: 'Tech Minimal',
    label: '暗色科技极简',
    tagline: '安静的未来主义，内容成为主角',
    scheme: 'dark',
    swatch: ['#0a0a0a', '#27272a', '#3b82f6', '#fafafa'],
    price: { prefix: '¥', decimals: 2 },
    tokens: {
      ...LAYOUT,
      ...BACKGROUND_DEFAULTS,
      // 颜色：深色基底 + 单一高饱和强调色
      '--bg-page': '#0a0a0a',
      '--bg-mesh': 'none',
      '--bg-surface': '#27272a',
      '--bg-surface-2': '#1f1f22',
      '--bg-nav': '#0a0a0a',
      '--bg-elevated': '#18181b',
      // 页脚与页面底色刻意不同：规范没有定义页脚，但 #0A0A0A 的页面配 #0A0A0A 的页脚
      // 会让页脚区域完全消失。取 elevated 一档的抬升色，克制且可辨。
      '--bg-footer': '#18181b',
      '--bg-soft': 'rgba(59, 130, 246, 0.12)',
      '--scrim': 'rgba(0, 0, 0, 0.7)',
      '--text-primary': '#fafafa',
      '--text-secondary': '#a1a1aa',
      '--text-muted': '#71717a',
      '--text-on-accent': '#ffffff',
      '--text-footer': '#a1a1aa',
      '--text-footer-muted': '#71717a',
      '--accent': '#3b82f6',
      '--accent-strong': '#2563eb',
      '--accent-soft': 'rgba(59, 130, 246, 0.12)',
      '--border': '#2a2a2d',
      '--border-strong': '#3f3f46',
      // 悬停态：边框变为 #3F3F46
      '--divider': '#232326',
      '--disabled-bg': '#3f3f46',
      '--disabled-text': '#71717a',
      '--danger': '#f87171',
      '--danger-bg': 'rgba(248, 113, 113, 0.12)',
      '--success': '#4ade80',
      '--success-bg': 'rgba(74, 222, 128, 0.12)',
      '--price-color': '#fafafa',
      '--price-bg': 'transparent',
      // 字体：标题/正文 Inter，价格 JetBrains Mono 强化数据感
      '--font-display': INTER,
      '--font-body': INTER,
      '--font-mono': JETBRAINS,
      '--font-price': JETBRAINS,
      // 字号：标题 48-72px，正文 14-16px，标签 11-13px，价格 18-24px
      '--fs-display': '72px',
      '--fs-h1': '48px',
      '--fs-h2': '40px',
      '--fs-h3': '20px',
      '--fs-body': '15px',
      '--fs-sm': '14px',
      '--fs-label': '12px',
      '--fs-price': '22px',
      '--fw-display': '700',
      '--fw-heading': '600',
      '--fw-body': '400',
      '--fw-label': '500',
      '--fw-price': '500',
      '--tracking-display': '-0.02em',
      '--tracking-label': '-0.01em',
      '--leading-body': '1.5',
      '--heading-transform': 'none',
      '--label-transform': 'none',
      // 圆角：卡片 12px，按钮 8px，搜索框 12px，图片容器 12px
      '--radius-card': '12px',
      '--radius-panel': '12px',
      '--radius-btn': '8px',
      '--radius-cta': '8px',
      '--radius-input': '12px',
      '--radius-media': '12px',
      '--radius-chip': '6px',
      '--radius-pill': '9999px',
      // 间距：基础单位 8px，卡片内边距 20px，卡片间距 16px，区块间距 80-120px
      '--space-unit': '8px',
      '--card-padding': '20px',
      '--card-gap': '16px',
      '--grid-gap': '16px',
      '--section-gap': '96px',
      '--panel-padding': '24px',
      // 阴影：卡片无阴影，用 1px 边框区分层级；无 backdrop-filter
      '--shadow-card': 'none',
      '--shadow-card-hover': 'none',
      '--shadow-elevated': '0 16px 40px rgba(0, 0, 0, 0.5)',
      '--shadow-cta': 'none',
      '--shadow-cta-hover': 'none',
      '--shadow-cta-active': 'none',
      '--card-hover-transform': 'none',
      '--card-hover-border': '#3f3f46',
      // 悬停：卡片内图片轻微放大 scale 1.03
      '--media-hover-scale': '1.03',
      '--cta-hover-transform': 'none',
      '--cta-active-transform': 'none',
      '--cta-border-width': '0',
      '--cta-border-color': 'transparent',
      '--effect-backdrop': 'none',
      '--effect-backdrop-hover': 'none',
      '--nav-backdrop': 'none',
      // 悬停：所有交互元素 transition 0.2s ease-out；图片放大 0.3s ease
      '--transition-interactive': '0.2s ease-out',
      '--transition-surface': '0.3s ease',
      '--transition-cta': '0.2s ease-out',
      // 入场：opacity 0→1 + translateY 12px→0，每块延迟 60ms 递增
      '--enter-shift': '12px',
      '--enter-scale': '1',
      '--enter-duration': '0.5s',
      '--enter-ease': 'ease-out',
      '--stagger-step': '60ms',
      '--decor-animation': 'none',
    },
  },

  /* ──────────────────────────────────────────────────────────────
   * 风格二：Liquid Glass Commerce（液态玻璃·电商版）
   * 磨砂玻璃作为深度层使用，而非装饰糖衣。
   * ────────────────────────────────────────────────────────────── */
  {
    id: 'liquid-glass',
    name: 'Liquid Glass',
    label: '液态玻璃·电商',
    tagline: '通透、轻盈、有层次的玻璃面板',
    scheme: 'light',
    swatch: ['#f5f3ff', '#ffffff', '#6366f1', '#1e1b4b'],
    price: { prefix: '¥', decimals: 2 },
    tokens: {
      ...LAYOUT,
      ...BACKGROUND_DEFAULTS,
      // 颜色：多色渐变网格底（#F5F3FF → #EEF2FF → #FDF4FF 的柔和过渡）
      '--bg-page': 'linear-gradient(135deg, #f5f3ff 0%, #eef2ff 50%, #fdf4ff 100%)',
      '--bg-mesh': [
        'radial-gradient(circle at 12% 18%, rgba(199, 210, 254, 0.75), transparent 45%)',
        'radial-gradient(circle at 88% 12%, rgba(251, 207, 232, 0.6), transparent 42%)',
        'radial-gradient(circle at 72% 82%, rgba(221, 214, 254, 0.7), transparent 48%)',
        'radial-gradient(circle at 22% 88%, rgba(186, 230, 253, 0.6), transparent 45%)',
      ].join(', '),
      // 背景渐变网格缓慢流动：20s 循环（关键帧 meshFlow 定义在 global.css）
      '--mesh-animation': 'meshFlow 20s ease-in-out infinite',
      // 玻璃表面：rgba(255,255,255,0.55) + backdrop-filter
      '--bg-surface': 'rgba(255, 255, 255, 0.55)',
      '--bg-surface-2': 'rgba(255, 255, 255, 0.4)',
      '--bg-nav': 'rgba(255, 255, 255, 0.55)',
      '--bg-elevated': 'rgba(255, 255, 255, 0.72)',
      '--bg-footer': 'rgba(255, 255, 255, 0.5)',
      '--bg-soft': 'rgba(99, 102, 241, 0.08)',
      '--scrim': 'rgba(30, 27, 75, 0.28)',
      '--text-primary': '#1e1b4b',
      '--text-secondary': '#6b7280',
      '--text-muted': '#9ca3af',
      '--text-on-accent': '#ffffff',
      '--text-footer': '#1e1b4b',
      '--text-footer-muted': '#6b7280',
      '--accent': '#6366f1',
      '--accent-strong': '#4f46e5',
      '--accent-soft': 'rgba(99, 102, 241, 0.12)',
      // 玻璃边框：rgba(255,255,255,0.6)，1px
      '--border': 'rgba(255, 255, 255, 0.6)',
      '--border-strong': 'rgba(99, 102, 241, 0.25)',
      '--divider': 'rgba(99, 102, 241, 0.12)',
      '--disabled-bg': 'rgba(107, 114, 128, 0.15)',
      '--disabled-text': '#9ca3af',
      '--danger': '#dc2626',
      '--danger-bg': 'rgba(220, 38, 38, 0.08)',
      '--success': '#059669',
      '--success-bg': 'rgba(5, 150, 105, 0.08)',
      '--price-color': '#1e1b4b',
      '--price-bg': 'transparent',
      // 字体：标题 Instrument Sans，正文 Inter，价格 Geist Mono
      '--font-display': INSTRUMENT,
      '--font-body': INTER,
      '--font-mono': GEIST_MONO,
      '--font-price': GEIST_MONO,
      '--fs-display': '64px',
      '--fs-h1': '40px',
      '--fs-h2': '40px',
      '--fs-h3': '20px',
      '--fs-body': '15px',
      '--fs-sm': '14px',
      '--fs-label': '12px',
      '--fs-price': '20px',
      '--fw-display': '600',
      '--fw-heading': '600',
      '--fw-body': '400',
      '--fw-label': '500',
      '--fw-price': '500',
      '--tracking-display': '-0.03em',
      '--tracking-label': '-0.01em',
      '--leading-body': '1.55',
      '--heading-transform': 'none',
      '--label-transform': 'none',
      // 圆角：卡片 20px，玻璃面板 24px，按钮 14px，搜索栏全胶囊，图片 16px
      '--radius-card': '20px',
      '--radius-panel': '24px',
      '--radius-btn': '14px',
      '--radius-cta': '14px',
      '--radius-input': '9999px',
      '--radius-media': '16px',
      '--radius-chip': '9999px',
      '--radius-pill': '9999px',
      // 间距：卡片内边距 24px，卡片间距 20px，区块间距 100px
      '--space-unit': '8px',
      '--card-padding': '24px',
      '--card-gap': '20px',
      '--grid-gap': '20px',
      '--section-gap': '100px',
      '--panel-padding': '24px',
      // 阴影：玻璃卡片 0 8px 32px rgba(99,102,241,0.08)，悬停加深至 0.14 并上浮 4px
      '--shadow-card': '0 8px 32px rgba(99, 102, 241, 0.08)',
      '--shadow-card-hover': '0 8px 32px rgba(99, 102, 241, 0.14)',
      '--shadow-elevated': '0 12px 40px rgba(99, 102, 241, 0.16)',
      '--shadow-cta': '0 8px 24px rgba(99, 102, 241, 0.24)',
      '--shadow-cta-hover': '0 12px 32px rgba(99, 102, 241, 0.32)',
      '--shadow-cta-active': '0 4px 12px rgba(99, 102, 241, 0.2)',
      '--card-hover-transform': 'translateY(-4px)',
      '--card-hover-border': 'rgba(99, 102, 241, 0.3)',
      '--media-hover-scale': '1.04',
      '--cta-hover-transform': 'translateY(-2px)',
      '--cta-active-transform': 'translateY(0)',
      '--cta-border-width': '0',
      '--cta-border-color': 'transparent',
      // 玻璃：surface blur 16px → 悬停 24px；粘性导航 blur 20px
      '--effect-backdrop': 'blur(16px) saturate(180%)',
      '--effect-backdrop-hover': 'blur(24px) saturate(180%)',
      '--nav-backdrop': 'blur(20px) saturate(180%)',
      '--transition-interactive': '0.2s ease-out',
      // 悬停：backdrop-filter 参数过渡 0.4s
      '--transition-surface': '0.4s ease',
      '--transition-cta': '0.2s ease-out',
      // 入场：scale 0.96→1 + opacity，带轻微弹性
      '--enter-shift': '0px',
      '--enter-scale': '0.96',
      '--enter-duration': '0.5s',
      '--enter-ease': 'cubic-bezier(0.34, 1.56, 0.64, 1)',
      '--stagger-step': '80ms',
      '--decor-animation': 'float 5s ease-in-out infinite',
    },
  },

  /* ──────────────────────────────────────────────────────────────
   * 风格三：Bento Editorial（便当盒编辑风）
   * 不对称模块化网格 + 编辑杂志的排版纪律。边框驱动而非阴影驱动。
   * ────────────────────────────────────────────────────────────── */
  {
    id: 'bento-editorial',
    name: 'Bento Editorial',
    label: '便当盒编辑风',
    tagline: '结构化但不僵硬的不对称网格',
    scheme: 'light',
    swatch: ['#f7f7f5', '#ffffff', '#d62872', '#1a1a1a'],
    price: { prefix: '¥', decimals: 2 },
    tokens: {
      ...LAYOUT,
      ...BACKGROUND_DEFAULTS,
      // 颜色：暖灰白底（避免临床感），强调色仅用于 CTA 与价格标签
      '--bg-page': '#f7f7f5',
      '--bg-mesh': 'none',
      '--bg-surface': '#ffffff',
      '--bg-surface-2': '#f2f2ef',
      '--bg-nav': '#f7f7f5',
      '--bg-elevated': '#ffffff',
      // 比页面底色 #F7F7F5 再深半档，页脚才不会与正文区糊成一片
      '--bg-footer': '#f2f2ef',
      '--bg-soft': 'rgba(214, 40, 114, 0.06)',
      '--scrim': 'rgba(26, 26, 26, 0.4)',
      '--text-primary': '#1a1a1a',
      '--text-secondary': '#4b4b4b',
      '--text-muted': '#8a8a8a',
      '--text-on-accent': '#ffffff',
      '--text-footer': '#1a1a1a',
      '--text-footer-muted': '#8a8a8a',
      '--accent': '#d62872',
      '--accent-strong': '#b01e5e',
      '--accent-soft': 'rgba(214, 40, 114, 0.08)',
      // 边框：#EBEBEB 定义边界，悬停变 #D4D4D4
      '--border': '#ebebeb',
      '--border-strong': '#d4d4d4',
      '--divider': '#f0f0ee',
      '--disabled-bg': '#ededea',
      '--disabled-text': '#b0b0b0',
      '--danger': '#c0392b',
      '--danger-bg': '#fdf2f2',
      '--success': '#15803d',
      '--success-bg': '#f0fdf4',
      // 强调色仅用于 CTA 和价格标签
      '--price-color': '#d62872',
      '--price-bg': 'transparent',
      // 字体：大卡片标题 Playfair Display 衬线，价格 Century Gothic
      '--font-display': PLAYFAIR,
      '--font-body': INTER,
      '--font-mono': GEIST_MONO,
      '--font-price': CENTURY,
      // 字号：大卡片标题 32-48px，小卡片 18-22px，正文 13-15px，价格 16-20px
      '--fs-display': '48px',
      '--fs-h1': '40px',
      '--fs-h2': '40px',
      '--fs-h3': '20px',
      '--fs-body': '14px',
      '--fs-sm': '13px',
      '--fs-label': '12px',
      '--fs-price': '18px',
      '--fw-display': '700',
      '--fw-heading': '600',
      '--fw-body': '400',
      '--fw-label': '500',
      '--fw-price': '700',
      '--tracking-display': '-0.02em',
      '--tracking-label': '0',
      '--leading-body': '1.6',
      '--heading-transform': 'none',
      '--label-transform': 'none',
      // 圆角：大卡片 20px，小卡片 16px，按钮 10px，图片 12px，搜索框 24px
      '--radius-card': '20px',
      '--radius-panel': '16px',
      '--radius-btn': '10px',
      '--radius-cta': '9999px',
      '--radius-input': '24px',
      '--radius-media': '12px',
      '--radius-chip': '9999px',
      '--radius-pill': '9999px',
      // 间距：网格 gap 12-16px，大卡片内边距 28px，小卡片 16-20px，区块间距 64-80px
      '--space-unit': '8px',
      '--card-padding': '28px',
      '--card-gap': '14px',
      '--grid-gap': '14px',
      '--section-gap': '72px',
      '--panel-padding': '20px',
      // 阴影：极轻阴影 + 边框驱动
      '--shadow-card': '0 1px 3px rgba(0, 0, 0, 0.04)',
      '--shadow-card-hover': '0 1px 3px rgba(0, 0, 0, 0.04)',
      '--shadow-elevated': '0 8px 24px rgba(0, 0, 0, 0.08)',
      '--shadow-cta': 'none',
      '--shadow-cta-hover': 'none',
      '--shadow-cta-active': 'none',
      // 悬停：只换边框与图片微缩放，不改变卡片尺寸
      '--card-hover-transform': 'none',
      '--card-hover-border': '#d4d4d4',
      '--media-hover-scale': '1.02',
      '--cta-hover-transform': 'none',
      '--cta-active-transform': 'none',
      '--cta-border-width': '0',
      '--cta-border-color': 'transparent',
      '--effect-backdrop': 'none',
      '--effect-backdrop-hover': 'none',
      '--nav-backdrop': 'none',
      '--transition-interactive': '0.2s ease-out',
      '--transition-surface': '0.2s ease-out',
      '--transition-cta': '0.2s ease-out',
      // 入场：fade-in + translateY 8px→0
      '--enter-shift': '8px',
      '--enter-scale': '1',
      '--enter-duration': '0.5s',
      '--enter-ease': 'ease-out',
      '--stagger-step': '60ms',
      '--decor-animation': 'none',
    },
  },

  /* ──────────────────────────────────────────────────────────────
   * 风格四：Neo-Brutalism Accent（新粗野主义·点缀版）
   * 克制基底 + 关键转化点的粗野主义强 CTA：粗边框、零模糊硬阴影、按压悬停。
   * ────────────────────────────────────────────────────────────── */
  {
    id: 'neo-brutalism',
    name: 'Neo-Brutalism',
    label: '新粗野主义·点缀',
    tagline: '克制的基底，关键转化点释放张力',
    scheme: 'light',
    swatch: ['#ffffff', '#fafafa', '#ff6b35', '#1a1a2e'],
    price: { prefix: '¥', decimals: 2 },
    tokens: {
      ...LAYOUT,
      ...BACKGROUND_DEFAULTS,
      '--bg-page': '#ffffff',
      '--bg-mesh': 'none',
      '--bg-surface': '#fafafa',
      '--bg-surface-2': '#f2f2f2',
      '--bg-nav': '#ffffff',
      '--bg-elevated': '#ffffff',
      // 辅助强调色 #1A1A2E 用于区块底色，页脚即承载它的「重块」
      '--bg-footer': '#1a1a2e',
      '--bg-soft': 'rgba(255, 107, 53, 0.1)',
      '--scrim': 'rgba(0, 0, 0, 0.55)',
      '--text-primary': '#000000',
      '--text-secondary': '#3d3d3d',
      '--text-muted': '#6b6b6b',
      '--text-on-accent': '#000000',
      '--text-footer': '#ffffff',
      '--text-footer-muted': '#b8b8c8',
      '--accent': '#ff6b35',
      '--accent-strong': '#e8551f',
      '--accent-soft': 'rgba(255, 107, 53, 0.1)',
      // 常规区域边框 #E5E5E5 1px；粗野主义区域 #000000 3px（见 --cta-border-width）
      '--border': '#e5e5e5',
      '--border-strong': '#000000',
      '--divider': '#ededed',
      '--disabled-bg': '#e5e5e5',
      '--disabled-text': '#9a9a9a',
      '--danger': '#d92d20',
      '--danger-bg': '#fef3f2',
      '--success': '#067647',
      '--success-bg': '#ecfdf3',
      '--price-color': '#000000',
      '--price-bg': '#fafafa',
      // 标题：压缩大写，字间距 -0.03em；价格 JetBrains Mono 700
      '--font-display': CONDENSED,
      '--font-body': INTER,
      '--font-mono': JETBRAINS,
      '--font-price': JETBRAINS,
      '--fs-display': '96px',
      '--fs-h1': '64px',
      '--fs-h2': '56px',
      '--fs-h3': '22px',
      '--fs-body': '15px',
      '--fs-sm': '14px',
      '--fs-label': '12px',
      '--fs-price': '20px',
      '--fw-display': '700',
      '--fw-heading': '700',
      '--fw-body': '400',
      '--fw-label': '700',
      '--fw-price': '700',
      '--tracking-display': '-0.03em',
      // CTA 文字大写 + 0.02em 字距
      '--tracking-label': '0.02em',
      '--leading-body': '1.5',
      '--heading-transform': 'uppercase',
      '--label-transform': 'uppercase',
      // 圆角：常规卡片 12px，常规按钮 8px，图片 8px，粗野主义 CTA 0px
      '--radius-card': '12px',
      '--radius-panel': '12px',
      '--radius-btn': '8px',
      '--radius-cta': '0px',
      '--radius-input': '12px',
      '--radius-media': '8px',
      '--radius-chip': '4px',
      '--radius-pill': '9999px',
      // 间距：粗野主义 CTA 内边距 20px 40px，卡片内边距 24px，区块间距 96px
      '--space-unit': '8px',
      '--card-padding': '24px',
      '--card-gap': '16px',
      '--grid-gap': '16px',
      '--section-gap': '96px',
      '--panel-padding': '24px',
      // 常规卡片 0 1px 2px；粗野主义 CTA 6px 6px 0 #000000
      '--shadow-card': '0 1px 2px rgba(0, 0, 0, 0.05)',
      '--shadow-card-hover': '0 1px 2px rgba(0, 0, 0, 0.05)',
      '--shadow-elevated': '0 8px 24px rgba(0, 0, 0, 0.12)',
      '--shadow-cta': '6px 6px 0 #000000',
      // 悬停 3px 3px 0，激活 0 0 0
      '--shadow-cta-hover': '3px 3px 0 #000000',
      '--shadow-cta-active': '0 0 0 #000000',
      '--card-hover-transform': 'none',
      '--card-hover-border': '#000000',
      '--media-hover-scale': '1.02',
      // 按压感：hove 平移 3px，激活平移 6px
      '--cta-hover-transform': 'translate(3px, 3px)',
      '--cta-active-transform': 'translate(6px, 6px)',
      '--cta-border-width': '3px',
      '--cta-border-color': '#000000',
      '--effect-backdrop': 'none',
      '--effect-backdrop-hover': 'none',
      '--nav-backdrop': 'none',
      // 其余元素 0.2s ease；粗野主义 CTA 用即时 transition
      '--transition-interactive': '0.2s ease',
      '--transition-surface': '0.2s ease',
      '--transition-cta': '0.1s linear',
      // 页面加载：常规区块轻量 fade-in，粗野主义 CTA 无入场动画
      '--enter-shift': '0px',
      '--enter-scale': '1',
      '--enter-duration': '0.3s',
      '--enter-ease': 'ease-out',
      '--stagger-step': '0ms',
      '--decor-animation': 'none',
    },
  },

  /* ──────────────────────────────────────────────────────────────
   * 风格五：Technical Monochrome（技术单色·等宽叙事）
   * 等宽字体贯穿所有层级，像在读一份高质量技术文档，同时具备转化效率。
   * ────────────────────────────────────────────────────────────── */
  {
    id: 'technical-monochrome',
    name: 'Technical Mono',
    label: '技术单色·等宽',
    tagline: '紧凑、精确、无废话的终端叙事',
    scheme: 'dark',
    swatch: ['#0d0d0d', '#1a1a1a', '#22c55e', '#e8e8e8'],
    price: { prefix: '$', decimals: 2 },
    tokens: {
      ...LAYOUT,
      ...BACKGROUND_DEFAULTS,
      '--bg-page': '#0d0d0d',
      '--bg-mesh': 'none',
      '--bg-surface': '#1a1a1a',
      // 代码/价格背景 #141414
      '--bg-surface-2': '#141414',
      '--bg-nav': '#0d0d0d',
      '--bg-elevated': '#1a1a1a',
      '--bg-footer': '#141414',
      '--bg-soft': 'rgba(34, 197, 94, 0.08)',
      '--scrim': 'rgba(0, 0, 0, 0.75)',
      '--text-primary': '#e8e8e8',
      '--text-secondary': '#a0a0a0',
      '--text-muted': '#6b6b6b',
      '--text-on-accent': '#0d0d0d',
      '--text-footer': '#e8e8e8',
      '--text-footer-muted': '#6b6b6b',
      '--accent': '#22c55e',
      '--accent-strong': '#16a34a',
      '--accent-soft': 'rgba(34, 197, 94, 0.1)',
      '--border': '#2a2a2a',
      '--border-strong': '#3a3a3a',
      // 悬停：边框变为 #22C55E（绿色边框闪烁感）
      '--divider': '#222222',
      '--disabled-bg': '#2a2a2a',
      '--disabled-text': '#6b6b6b',
      '--danger': '#f87171',
      '--danger-bg': 'rgba(248, 113, 113, 0.1)',
      '--success': '#22c55e',
      '--success-bg': 'rgba(34, 197, 94, 0.1)',
      '--price-color': '#22c55e',
      '--price-bg': '#141414',
      // 全部字体等宽
      '--font-display': JETBRAINS,
      '--font-body': JETBRAINS,
      '--font-mono': JETBRAINS,
      '--font-price': JETBRAINS,
      // 标题 36-56px 字距 -0.04em；正文 13-15px 行高 1.6；标签 11-12px 大写
      '--fs-display': '56px',
      '--fs-h1': '48px',
      '--fs-h2': '36px',
      '--fs-h3': '18px',
      '--fs-body': '14px',
      '--fs-sm': '13px',
      '--fs-label': '12px',
      '--fs-price': '24px',
      '--fw-display': '700',
      '--fw-heading': '700',
      '--fw-body': '400',
      '--fw-label': '500',
      '--fw-price': '700',
      '--tracking-display': '-0.04em',
      '--tracking-label': '0.05em',
      // 行间距宽松，1.6 倍
      '--leading-body': '1.6',
      '--heading-transform': 'none',
      '--label-transform': 'uppercase',
      // 所有元素 4px，按钮/图片/输入框 6px
      '--radius-card': '4px',
      '--radius-panel': '6px',
      '--radius-btn': '6px',
      '--radius-cta': '6px',
      '--radius-input': '6px',
      '--radius-media': '6px',
      '--radius-chip': '2px',
      '--radius-pill': '6px',
      // 间距：基础单位 4px，卡片内边距 16px，卡片间距 12px，区块间距 72px
      '--space-unit': '4px',
      '--card-padding': '16px',
      '--card-gap': '12px',
      '--grid-gap': '12px',
      '--section-gap': '72px',
      '--panel-padding': '16px',
      // 无阴影：所有层级通过边框和背景色差区分
      '--shadow-card': 'none',
      '--shadow-card-hover': 'none',
      '--shadow-elevated': '0 16px 40px rgba(0, 0, 0, 0.6)',
      '--shadow-cta': 'none',
      '--shadow-cta-hover': 'none',
      '--shadow-cta-active': 'none',
      // 无位移、无缩放、无弹性曲线
      '--card-hover-transform': 'none',
      '--card-hover-border': '#22c55e',
      '--media-hover-scale': '1',
      '--cta-hover-transform': 'none',
      '--cta-active-transform': 'none',
      '--cta-border-width': '0',
      '--cta-border-color': 'transparent',
      '--effect-backdrop': 'none',
      '--effect-backdrop-hover': 'none',
      '--nav-backdrop': 'none',
      // 极简：仅 opacity 过渡 0.15s，边框颜色过渡 0.15s
      '--transition-interactive': '0.15s ease',
      '--transition-surface': '0.15s ease',
      '--transition-cta': '0.15s ease',
      // 整块 fade-in
      '--enter-shift': '0px',
      '--enter-scale': '1',
      '--enter-duration': '0.15s',
      '--enter-ease': 'ease',
      '--stagger-step': '0ms',
      '--decor-animation': 'none',
    },
  },
]

/** 默认主题（规范里的「2026 年最主流」） */
export const DEFAULT_THEME_ID = 'tech-minimal'

/**
 * 「单项修改」里可选的字体族。
 * 与主题预设共用同一批字体栈常量，避免两处各写一份衬线/等宽 fallback。
 */
export const FONT_STACKS = {
  sans: INTER,
  mono: JETBRAINS,
  serif: PLAYFAIR,
  condensed: CONDENSED,
}

/** 令牌名册：以默认主题的键集合为准 */
export const TOKEN_NAMES = Object.keys(THEMES[0].tokens)

export const THEME_BY_ID = THEMES.reduce((acc, theme) => {
  acc[theme.id] = theme
  return acc
}, {})

/** 兜底取值：id 非法时退回默认主题，避免出现「无令牌可用」 */
export function getTheme(themeId) {
  return THEME_BY_ID[themeId] || THEME_BY_ID[DEFAULT_THEME_ID]
}

/* ──────────────────────────────────────────────────────────────
 * 单项自定义
 * 弹窗「单项修改」页签据此渲染，不需要在组件里硬编码每个控件。
 * `kind` 决定 apply 时如何落到令牌上（见 stores/theme.js）。
 * ────────────────────────────────────────────────────────────── */
export const CUSTOM_FIELDS = [
  {
    key: 'fontScale',
    kind: 'scale',
    label: '全局字号',
    hint: '按比例缩放全部 --fs-* 字号（不影响间距）',
    type: 'range',
    min: 0.85,
    max: 1.3,
    step: 0.01,
    format: (v) => `${Math.round(v * 100)}%`,
  },
  {
    key: 'density',
    kind: 'scale',
    label: '间距密度',
    hint: '按比例缩放卡片内边距、网格与区块间距',
    type: 'range',
    min: 0.8,
    max: 1.3,
    step: 0.01,
    format: (v) => `${Math.round(v * 100)}%`,
  },
  {
    key: 'radiusScale',
    kind: 'scale',
    label: '圆角缩放',
    hint: '统一缩放卡片/按钮/输入框/图片圆角，胶囊形不受影响',
    type: 'range',
    min: 0,
    max: 2,
    step: 0.05,
    format: (v) => `${Math.round(v * 100)}%`,
  },
  {
    key: 'accent',
    kind: 'accent',
    label: '强调色',
    hint: '同时派生悬停色与柔和底色，留空表示跟随主题',
    type: 'color',
  },
  {
    key: 'fontFamily',
    kind: 'font',
    label: '字体族',
    hint: '覆盖标题与正文字体',
    type: 'select',
    options: [
      { value: 'theme', label: '跟随主题' },
      { value: 'sans', label: '无衬线 Inter' },
      { value: 'mono', label: '等宽 JetBrains Mono' },
      { value: 'serif', label: '衬线 Playfair Display' },
    ],
  },
  {
    key: 'backgroundImage',
    kind: 'media',
    label: '页面背景图',
    hint: '支持图片 URL，留空表示使用主题自带背景',
    type: 'text',
    placeholder: 'https://example.com/bg.jpg',
  },
  {
    key: 'backgroundOpacity',
    kind: 'media',
    label: '背景图不透明度',
    hint: '仅在设置了背景图时生效，避免影响前景可读性',
    type: 'range',
    min: 0,
    max: 0.8,
    step: 0.02,
    format: (v) => `${Math.round(v * 100)}%`,
  },
]

/** 自定义项的默认值（与主题预设无关，跨主题保留） */
export const DEFAULT_CUSTOM = {
  fontScale: 1,
  density: 1,
  radiusScale: 1,
  accent: '',
  fontFamily: 'theme',
  backgroundImage: '',
  backgroundOpacity: 0.18,
}

/** 会被 fontScale / density / radiusScale 缩放的令牌分组 */
export const SCALE_TARGETS = {
  fontScale: [
    '--fs-display',
    '--fs-h1',
    '--fs-h2',
    '--fs-h3',
    '--fs-body',
    '--fs-sm',
    '--fs-label',
    '--fs-price',
  ],
  density: [
    '--space-unit',
    '--card-padding',
    '--card-gap',
    '--grid-gap',
    '--section-gap',
    '--panel-padding',
  ],
  radiusScale: [
    '--radius-card',
    '--radius-panel',
    '--radius-btn',
    '--radius-cta',
    '--radius-input',
    '--radius-media',
    '--radius-chip',
  ],
}
