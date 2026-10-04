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
 * ## 为什么写成「矩阵」而不是五份对象
 *
 * 规范给的是**表格**：每一行一个令牌，五列五套取值。照抄成 `[值×5]` 的矩阵
 * 可以逐行与规范对照，且不会出现「某套风格漏了一个令牌」这类靠肉眼才能发现的问题。
 * 五套同值的行放进 `SHARED`，避免同一串数字抄五遍。
 *
 * ## 取值纪律
 *
 * 矩阵里每一行的注释都标注了规范出处。**不要凭手感改数值** ——
 * 规范里有明确数字的先按规范，规范没写的才按体系推导。
 */

/** 列顺序：矩阵每一行的五个值必须按这个顺序排列 */
export const THEME_ORDER = [
  'tech-minimal',
  'liquid-glass',
  'bento-editorial',
  'neo-brutalism',
  'technical-monochrome',
]

/* ══════════════════════════════════════════════════════════════════
 * 字体栈（五套共用一批常量，避免同一串 fallback 抄五遍）
 * ══════════════════════════════════════════════════════════════════ */

const CJK_SANS = "'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', 'Noto Sans SC'"
const CJK_SERIF = "'Songti SC', 'Noto Serif SC', 'SimSun'"
const CJK = `${CJK_SANS}, sans-serif`
const INTER = `'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', ${CJK}`
// 等宽栈也要带 CJK：价格、卡号、关键词计数这些位置会混排中文，
// 缺 CJK 族时浏览器会各自挑一个默认中文字体，同一行里出现两种字形。
const JETBRAINS = `'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, Consolas, ${CJK_SANS}, monospace`
const GEIST_MONO = `'Geist Mono', 'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, ${CJK_SANS}, monospace`
const INSTRUMENT = `'Instrument Sans', ${INTER}`
const PLAYFAIR = `'Playfair Display', ${CJK_SERIF}, Georgia, serif`
// 规范：bento 的价格用 Oxygen（备选 Century Gothic）
const OXYGEN = `'Oxygen', 'Century Gothic', 'Futura', 'Inter', ${CJK}`
const CONDENSED = `'Instrument Sans', 'Archivo Narrow', 'Arial Narrow', ${CJK_SANS}, sans-serif`

/** 「单项修改」里可选的字体族 —— 与主题预设共用同一批常量 */
export const FONT_STACKS = {
  sans: INTER,
  mono: JETBRAINS,
  serif: PLAYFAIR,
  condensed: CONDENSED,
}

/* ══════════════════════════════════════════════════════════════════
 * 五套同值的令牌（规范标注「5 套通用」的部分）
 * ══════════════════════════════════════════════════════════════════ */

const SHARED = {
  /* 语义色：成功 #22C55E / 警告 #F59E0B / 错误 #EF4444 / 信息 #3B82F6（均 10% 底） */
  '--success': '#22c55e',
  '--success-bg': 'rgba(34, 197, 94, 0.1)',
  '--warning': '#f59e0b',
  '--warning-bg': 'rgba(245, 158, 11, 0.1)',
  '--danger': '#ef4444',
  '--danger-bg': 'rgba(239, 68, 68, 0.1)',
  '--info': '#3b82f6',
  '--info-bg': 'rgba(59, 130, 246, 0.1)',

  /* 提示框位置：距顶 24px、距右 24px、堆叠间距 12px */
  '--toast-offset': '24px',
  '--toast-gap': '12px',

  /* 模态框内部节奏：标题下 16px、正文下 24px、底部按钮组间距 12px */
  '--modal-title-gap': '16px',
  '--modal-body-gap': '24px',
  '--modal-footer-gap': '12px',

  /* 下拉选项左右内边距与选中态左侧竖条 */
  '--dropdown-item-padding-x': '16px',
  '--dropdown-active-bar': '2px',

  /* 折扣标签等微型徽标：内边距 2px 6px、圆角 4px */
  '--micro-badge-padding': '2px 6px',
  '--micro-badge-radius': '4px',

  /* 加载圈：24 / 32 / 40 三档，线宽 2px（大号 3px） */
  '--spinner-size-sm': '24px',
  '--spinner-size-md': '32px',
  '--spinner-size-lg': '40px',
  '--spinner-border': '2px',
  '--spinner-border-lg': '3px',
  '--spinner-duration': '0.8s',
  /* 骨架屏 shimmer 循环时长 */
  '--skeleton-duration': '1.5s',

  /* 移动端缩放系数 */
  '--mobile-nav-scale': '0.85',
  '--mobile-control-scale': '0.9',
  '--mobile-padding-scale': '0.8',
  '--mobile-section-scale': '0.6',
  '--mobile-title-scale': '0.7',
  '--mobile-body-scale': '0.95',

  /* 页面内容栅格宽度。
   * 刻意只保留**一个**宽度：导航栏、Hero、各区块、页脚共用同一条装订线，
   * 否则 Logo 左边缘会对不上下方的卡片/表格（此前 1320 与 1280 并存，就是这个问题）。
   * `--container-narrow` 供 2FA / 关于我们这类窄内容列使用。 */
  '--container-max': '1320px',
  '--container-narrow': '1000px',
  '--container-padding': '20px',

  /* 背景层默认值：不覆盖主题自带背景，也不留空转的网格动画 */
  '--bg-media': 'none',
  '--bg-media-opacity': '0.18',
}

/* ══════════════════════════════════════════════════════════════════
 * 令牌矩阵：每行 = 一个令牌，五个值按 THEME_ORDER 排列
 * ══════════════════════════════════════════════════════════════════ */

const MATRIX = {
  /* ── 页面与表面 ───────────────────────────────────────────── */
  '--bg-page': [
    '#0a0a0a',
    'linear-gradient(135deg, #f5f3ff 0%, #eef2ff 50%, #fdf4ff 100%)',
    '#f7f7f5',
    '#ffffff',
    '#0d0d0d',
  ],
  // glass 的多色渐变网格（柔和过渡，非高饱和）
  '--bg-mesh': [
    'none',
    [
      'radial-gradient(circle at 12% 18%, rgba(199, 210, 254, 0.75), transparent 45%)',
      'radial-gradient(circle at 88% 12%, rgba(251, 207, 232, 0.6), transparent 42%)',
      'radial-gradient(circle at 72% 82%, rgba(221, 214, 254, 0.7), transparent 48%)',
      'radial-gradient(circle at 22% 88%, rgba(186, 230, 253, 0.6), transparent 45%)',
    ].join(', '),
    'none',
    'none',
    'none',
  ],
  // 背景网格缓慢流动：20s 循环（关键帧 meshFlow 在 global.css）
  '--mesh-animation': [
    'none',
    'meshFlow 20s ease-in-out infinite',
    'none',
    'none',
    'none',
  ],
  '--bg-surface': [
    '#27272a',
    'rgba(255, 255, 255, 0.55)',
    '#ffffff',
    '#fafafa',
    '#1a1a1a',
  ],
  '--bg-surface-2': [
    '#1f1f22',
    'rgba(255, 255, 255, 0.4)',
    '#f2f2ef',
    '#f2f2f2',
    '#141414',
  ],
  '--bg-nav': [
    '#0a0a0a',
    'rgba(255, 255, 255, 0.55)',
    '#f7f7f5',
    '#ffffff',
    '#0d0d0d',
  ],
  '--bg-elevated': [
    '#18181b',
    'rgba(255, 255, 255, 0.72)',
    '#ffffff',
    '#ffffff',
    '#1a1a1a',
  ],
  // 页脚与页面底色刻意不同，否则页脚区域会完全消失
  '--bg-footer': ['#18181b', 'rgba(255, 255, 255, 0.5)', '#f2f2ef', '#1a1a2e', '#141414'],
  '--bg-soft': [
    'rgba(59, 130, 246, 0.12)',
    'rgba(99, 102, 241, 0.08)',
    'rgba(214, 40, 114, 0.06)',
    'rgba(255, 107, 53, 0.1)',
    'rgba(34, 197, 94, 0.08)',
  ],
  // 模态遮罩
  '--scrim': [
    'rgba(0, 0, 0, 0.7)',
    'rgba(30, 27, 75, 0.3)',
    'rgba(0, 0, 0, 0.5)',
    'rgba(0, 0, 0, 0.6)',
    'rgba(0, 0, 0, 0.8)',
  ],
  // glass 的遮罩额外加 blur(8px)
  '--scrim-backdrop': ['none', 'blur(8px)', 'none', 'none', 'none'],

  /* ── 文字 ─────────────────────────────────────────────────── */
  '--text-primary': ['#fafafa', '#1e1b4b', '#1a1a1a', '#000000', '#e8e8e8'],
  '--text-secondary': ['#a1a1aa', '#6b7280', '#4b4b4b', '#3d3d3d', '#a0a0a0'],
  '--text-muted': ['#71717a', '#9ca3af', '#8a8a8a', '#6b6b6b', '#6b6b6b'],
  '--text-on-accent': ['#ffffff', '#ffffff', '#ffffff', '#000000', '#0d0d0d'],
  '--text-footer': ['#a1a1aa', '#1e1b4b', '#1a1a1a', '#ffffff', '#e8e8e8'],
  '--text-footer-muted': ['#71717a', '#6b7280', '#8a8a8a', '#b8b8c8', '#6b6b6b'],
  // 占位符：规范为每套风格单列的低对比色
  '--placeholder': ['#3f3f46', '#6b7280', '#8a8a8a', '#666666', '#6b6b6b'],

  /* ── 强调色 ───────────────────────────────────────────────── */
  '--accent': ['#3b82f6', '#6366f1', '#d62872', '#ff6b35', '#22c55e'],
  '--accent-strong': ['#2563eb', '#4f46e5', '#b01e5e', '#e8551f', '#16a34a'],
  '--accent-soft': [
    'rgba(59, 130, 246, 0.12)',
    'rgba(99, 102, 241, 0.12)',
    'rgba(214, 40, 114, 0.08)',
    'rgba(255, 107, 53, 0.1)',
    'rgba(34, 197, 94, 0.1)',
  ],

  /* ── 描边与禁用 ───────────────────────────────────────────── */
  '--border': ['#2a2a2d', 'rgba(255, 255, 255, 0.6)', '#ebebeb', '#e5e5e5', '#2a2a2a'],
  // 常规区域描边宽度：只有 neo-brutalism 是 2px
  '--stroke-width': ['1px', '1px', '1px', '2px', '1px'],
  // 输入框 / 次按钮 / 提示框 / 下拉 / 标签的描边色（neo 是纯黑）
  '--stroke-color': [
    '#2a2a2d',
    'rgba(255, 255, 255, 0.6)',
    '#ebebeb',
    '#000000',
    '#2a2a2a',
  ],
  // 悬停态：边框变为 #3F3F46 / #D4D4D4 / #000000 / #22C55E
  '--card-hover-border': ['#3f3f46', 'rgba(99, 102, 241, 0.3)', '#d4d4d4', '#000000', '#22c55e'],
  '--divider': [
    '#232326',
    'rgba(99, 102, 241, 0.12)',
    '#f0f0ee',
    '#ededed',
    '#222222',
  ],
  '--disabled-bg': [
    '#3f3f46',
    'rgba(107, 114, 128, 0.15)',
    '#ededea',
    '#e5e5e5',
    '#2a2a2a',
  ],
  '--disabled-text': ['#71717a', '#9ca3af', '#b0b0b0', '#9a9a9a', '#6b6b6b'],

  /* ── 字体族 ───────────────────────────────────────────────── */
  '--font-display': [INTER, INSTRUMENT, PLAYFAIR, CONDENSED, JETBRAINS],
  '--font-body': [INTER, INTER, INTER, INTER, JETBRAINS],
  '--font-mono': [JETBRAINS, GEIST_MONO, GEIST_MONO, JETBRAINS, JETBRAINS],
  // 价格字体：bento 用 Oxygen，其余用等宽
  '--font-price': [JETBRAINS, GEIST_MONO, OXYGEN, JETBRAINS, JETBRAINS],

  /* ── 字号 ─────────────────────────────────────────────────── */
  '--fs-display': ['72px', '64px', '48px', '96px', '56px'],
  '--fs-h1': ['48px', '40px', '40px', '64px', '48px'],
  '--fs-h2': ['40px', '40px', '40px', '56px', '36px'],
  '--fs-h3': ['20px', '20px', '20px', '22px', '18px'],
  '--fs-body': ['15px', '15px', '14px', '15px', '14px'],
  '--fs-sm': ['14px', '14px', '13px', '14px', '13px'],
  '--fs-label': ['12px', '12px', '12px', '12px', '12px'],
  // 价格：整数部分 20/22/18/20/24
  '--fs-price': ['20px', '22px', '18px', '20px', '24px'],
  // 小数部分「小一号」；无小数的风格取其本身（该分支不渲染）
  '--fs-price-decimals': ['14px', '15px', '18px', '20px', '24px'],
  // 划线原价：比现价小 2px
  '--fs-price-original': ['18px', '20px', '16px', '18px', '22px'],

  /* ── 字重 ─────────────────────────────────────────────────── */
  '--fw-display': ['700', '600', '700', '700', '700'],
  '--fw-heading': ['600', '600', '600', '700', '700'],
  '--fw-body': ['400', '400', '400', '400', '400'],
  '--fw-label': ['500', '500', '500', '700', '500'],
  // 价格：500 / 600 / 700 / 700 / 700
  '--fw-price': ['500', '600', '700', '700', '700'],

  /* ── 排版细节 ─────────────────────────────────────────────── */
  '--tracking-display': ['-0.02em', '-0.03em', '-0.02em', '-0.03em', '-0.04em'],
  '--tracking-label': ['-0.01em', '-0.01em', '0', '0.02em', '0.05em'],
  '--leading-body': ['1.5', '1.55', '1.6', '1.5', '1.6'],
  // 商品标题固定 1.4 行高
  '--leading-title': ['1.4', '1.4', '1.4', '1.4', '1.4'],
  '--heading-transform': ['none', 'none', 'none', 'uppercase', 'none'],
  '--label-transform': ['none', 'none', 'none', 'uppercase', 'uppercase'],

  /* ── 圆角 ─────────────────────────────────────────────────── */
  // 卡片 12 / 20 / 大 20 小 16 / 12 / 4，卡片间距与图片圆角见下
  '--radius-card': ['12px', '20px', '16px', '12px', '4px'],
  '--radius-card-lg': ['12px', '20px', '20px', '12px', '4px'],
  // 面板/模态框 16 / 24 / 20 / 0 / 4
  '--radius-panel': ['16px', '24px', '20px', '0px', '4px'],
  // 输入框 12 / 9999 / 24 / 8 / 6
  '--radius-input': ['12px', '9999px', '24px', '8px', '6px'],
  // 图片容器 8 / 16 / 12 / 8 / 4
  '--radius-media': ['8px', '16px', '12px', '8px', '4px'],
  '--radius-pill': ['9999px', '9999px', '9999px', '9999px', '6px'],
  // 主/次按钮圆角 8 / 14 / 10 / 0 / 6
  '--btn-radius': ['8px', '14px', '10px', '0px', '6px'],

  /* ── 间距与区块 ───────────────────────────────────────────── */
  // 基础单位：mono 用 4px 的更细粒度
  '--space-unit': ['8px', '8px', '8px', '8px', '4px'],
  // 卡片间距 16 / 20 / 14 / 16 / 12
  '--grid-gap': ['16px', '20px', '14px', '16px', '12px'],
  // 区块间距 96 / 100 / 72 / 96 / 72
  '--section-gap': ['96px', '100px', '72px', '96px', '72px'],

  /* ── 导航栏 ───────────────────────────────────────────────── */
  // 高度 64 / 72 / 68 / 72 / 56
  '--navbar-height': ['64px', '72px', '68px', '72px', '56px'],
  // 左右内边距 32 / 40 / 32 / 32 / 24
  '--nav-padding-x': ['32px', '40px', '32px', '32px', '24px'],
  // 底部边框色（宽度取 --stroke-width：neo 为 2px）
  '--nav-border-color': [
    '#2a2a2d',
    'rgba(255, 255, 255, 0.4)',
    '#ebebeb',
    '#000000',
    '#2a2a2a',
  ],
  // Logo 高度 24 / 28 / 26 / 28 / 20
  '--nav-logo-height': ['24px', '28px', '26px', '28px', '20px'],
  // 菜单项间距 28 / 32 / 28 / 32 / 24
  '--nav-menu-gap': ['28px', '32px', '28px', '32px', '24px'],
  // 菜单字号 13 / 14 / 14 / 14 / 12
  '--nav-link-size': ['13px', '14px', '14px', '14px', '12px'],
  // 粘性导航：glass 用 blur(20px) 半透明，其余为实色
  '--nav-backdrop': [
    'none',
    'blur(20px) saturate(180%)',
    'none',
    'none',
    'none',
  ],
  // 滚动后：glass 加强 blur，其余靠阴影或边框
  '--nav-scrolled-backdrop': [
    'none',
    'blur(28px) saturate(180%)',
    'none',
    'none',
    'none',
  ],
  '--nav-scrolled-shadow': [
    'none',
    '0 8px 32px rgba(99, 102, 241, 0.1)',
    '0 1px 3px rgba(0, 0, 0, 0.04)',
    '0 4px 0 #000000',
    'none',
  ],

  /* ── 阴影 ─────────────────────────────────────────────────── */
  // 卡片 无 / 0 8px 32px(0.08) / 0 1px 3px(0.04) / 0 1px 2px(0.05) / 无
  '--shadow-card': [
    'none',
    '0 8px 32px rgba(99, 102, 241, 0.08)',
    '0 1px 3px rgba(0, 0, 0, 0.04)',
    '0 1px 2px rgba(0, 0, 0, 0.05)',
    'none',
  ],
  '--shadow-card-hover': [
    'none',
    '0 8px 32px rgba(99, 102, 241, 0.14)',
    '0 1px 3px rgba(0, 0, 0, 0.04)',
    '0 1px 2px rgba(0, 0, 0, 0.05)',
    'none',
  ],
  // 提示框与下拉菜单共用同一档浮动阴影
  '--shadow-float': [
    '0 8px 24px rgba(0, 0, 0, 0.4)',
    '0 8px 32px rgba(99, 102, 241, 0.12)',
    '0 4px 16px rgba(0, 0, 0, 0.08)',
    '6px 6px 0 #000000',
    'none',
  ],
  // 模态框 0 24px 64px(0.5) / 0 24px 64px(0.16) / 0 16px 48px(0.12) / 8px 8px 0 #000 / 无
  '--modal-shadow': [
    '0 24px 64px rgba(0, 0, 0, 0.5)',
    '0 24px 64px rgba(99, 102, 241, 0.16)',
    '0 16px 48px rgba(0, 0, 0, 0.12)',
    '8px 8px 0 #000000',
    'none',
  ],

  /* ── 毛玻璃 ───────────────────────────────────────────────── */
  '--effect-backdrop': [
    'none',
    'blur(16px) saturate(180%)',
    'none',
    'none',
    'none',
  ],
  '--effect-backdrop-hover': [
    'none',
    'blur(24px) saturate(180%)',
    'none',
    'none',
    'none',
  ],

  /* ── 按钮行为 ─────────────────────────────────────────────── */
  // 高度 40 / 48 / 44 / 52 / 36
  '--btn-height': ['40px', '48px', '44px', '52px', '36px'],
  // 内边距 12 20 / 14 28 / 12 24 / 16 36 / 10 20
  '--btn-padding-y': ['12px', '14px', '12px', '16px', '10px'],
  '--btn-padding-x': ['20px', '28px', '24px', '36px', '20px'],
  // 字号 14 / 15 / 14 / 15 / 13
  '--btn-font-size': ['14px', '15px', '14px', '15px', '13px'],
  // 字重 500 / 600 / 600 / 700 / 700
  '--btn-font-weight': ['500', '600', '600', '700', '700'],
  // mono 的主按钮靠边框变色表达悬停，其余为 0
  '--btn-border-width': ['0', '0', '0', '0', '1px'],
  '--btn-border-color': ['transparent', 'transparent', 'transparent', 'transparent', 'transparent'],
  // 主按钮阴影：仅 glass 有柔和投影、neo 有硬阴影
  '--btn-shadow': [
    'none',
    '0 4px 16px rgba(99, 102, 241, 0.2)',
    'none',
    '6px 6px 0 #000000',
    'none',
  ],
  // 悬停底色：#2563EB / 靛蓝加深 / 品牌玫红加深 10% / 橙不变 / 绿不变
  '--btn-hover-bg': ['#2563eb', '#4f46e5', '#c12467', '#ff6b35', '#22c55e'],
  '--btn-hover-transform': ['none', 'translateY(-2px)', 'none', 'translate(3px, 3px)', 'none'],
  '--btn-hover-shadow': [
    'none',
    '0 4px 16px rgba(99, 102, 241, 0.2)',
    'none',
    '3px 3px 0 #000000',
    'none',
  ],
  '--btn-hover-border': [
    'transparent',
    'transparent',
    'transparent',
    'transparent',
    '#22c55e',
  ],
  '--btn-active-transform': ['none', 'translateY(0)', 'none', 'translate(6px, 6px)', 'none'],
  '--btn-active-shadow': [
    'none',
    '0 2px 8px rgba(99, 102, 241, 0.16)',
    'none',
    '0 0 0 #000000',
    'none',
  ],
  // 次按钮底色：透明 / 半透明白 / 白 / 白 / 透明
  '--btn-secondary-bg': [
    'transparent',
    'rgba(255, 255, 255, 0.3)',
    '#ffffff',
    '#ffffff',
    'transparent',
  ],

  /* ── 卡片行为 ─────────────────────────────────────────────── */
  '--card-hover-transform': ['none', 'translateY(-4px)', 'none', 'none', 'none'],
  // 悬停时图片轻微放大 1.03 / 1.04 / 1.02 / 1.02 / 1（mono 不缩放）
  '--media-hover-scale': ['1.03', '1.04', '1.02', '1.02', '1'],

  /* ── 过渡 ─────────────────────────────────────────────────── */
  '--transition-interactive': [
    '0.2s ease-out',
    '0.2s ease-out',
    '0.2s ease-out',
    '0.1s linear',
    '0.15s ease',
  ],
  '--transition-surface': ['0.3s ease', '0.4s ease', '0.2s ease-out', '0.2s ease', '0.15s ease'],
  '--transition-btn': [
    '0.2s ease-out',
    '0.2s ease-out',
    '0.2s ease-out',
    '0.1s linear',
    '0.15s ease',
  ],
  // 进度条 0.3s / 0.4s / 0.3s / 0.2s linear / 0.15s
  '--transition-progress': [
    '0.3s ease',
    '0.4s ease',
    '0.3s ease',
    '0.2s linear',
    '0.15s ease',
  ],

  /* ── 入场与装饰动效 ───────────────────────────────────────── */
  // 入场位移 12px / 0（缩放）/ 8px / 0 / 0
  '--enter-shift': ['12px', '0px', '8px', '0px', '0px'],
  '--enter-scale': ['1', '0.96', '1', '1', '1'],
  '--enter-duration': ['0.5s', '0.5s', '0.5s', '0.3s', '0.15s'],
  '--enter-ease': [
    'ease-out',
    'cubic-bezier(0.34, 1.56, 0.64, 1)',
    'ease-out',
    'ease-out',
    'ease',
  ],
  '--stagger-step': ['60ms', '80ms', '60ms', '0ms', '0ms'],
  // 装饰性浮动：只有 glass 保留
  '--decor-animation': [
    'none',
    'float 5s ease-in-out infinite',
    'none',
    'none',
    'none',
  ],

  /* ══════════════ B. 组件层（尺寸规范表） ══════════════ */

  /* ── B1. 输入框 / 搜索框 ──────────────────────────────────── */
  // 高度 40 / 48 / 44 / 48 / 36
  '--input-height': ['40px', '48px', '44px', '48px', '36px'],
  // 内边距 12 14 / 14 20 / 12 16 / 14 18 / 10 12
  '--input-padding-y': ['12px', '14px', '12px', '14px', '10px'],
  '--input-padding-x': ['14px', '20px', '16px', '18px', '12px'],
  // 字号 14 / 15 / 14 / 15 / 13
  '--input-font-size': ['14px', '15px', '14px', '15px', '13px'],
  // 图标尺寸 16 / 18 / 16 / 18 / 14
  '--input-icon-size': ['16px', '18px', '16px', '18px', '14px'],
  // 图标间距 10 / 12 / 10 / 12 / 8
  '--input-icon-gap': ['10px', '12px', '10px', '12px', '8px'],
  // 聚焦：边框变强调色 / glass 提到 blur(24px) / bento 无外发光 / neo 硬阴影 / mono 用 outline
  '--input-focus-border': ['#3b82f6', '#6366f1', '#d62872', '#000000', '#22c55e'],
  '--input-focus-shadow': [
    '0 0 0 3px rgba(59, 130, 246, 0.15)',
    'none',
    'none',
    '4px 4px 0 #000000',
    'none',
  ],
  '--input-focus-backdrop': [
    'none',
    'blur(24px) saturate(180%)',
    'none',
    'none',
    'none',
  ],
  '--input-focus-outline': ['none', 'none', 'none', 'none', '2px solid #22c55e'],
  '--input-focus-outline-offset': ['0px', '0px', '0px', '0px', '2px'],

  /* ── B2. 图标按钮 ─────────────────────────────────────────── */
  // 尺寸 40 / 44 / 40 / 44 / 32
  '--icon-btn-size': ['40px', '44px', '40px', '44px', '32px'],
  // 圆角 8 / 9999 / 10 / 0 / 6
  '--icon-btn-radius': ['8px', '9999px', '10px', '0px', '6px'],
  // 图标 18 / 20 / 18 / 20 / 16
  '--icon-btn-icon-size': ['18px', '20px', '18px', '20px', '16px'],

  /* ── B3. 商品卡片 ─────────────────────────────────────────── */
  // 宽度 280 / 300 / 小 280 大 400 / 280 / 260
  '--card-width': ['280px', '300px', '280px', '280px', '260px'],
  '--card-width-lg': ['280px', '300px', '400px', '280px', '260px'],
  // 内边距 20 / 24 / 小 18 大 28 / 24 / 16
  '--card-padding': ['20px', '24px', '18px', '24px', '16px'],
  '--card-padding-lg': ['20px', '24px', '28px', '24px', '16px'],
  // 图片区高度 200 / 220 / 小 180 大 280 / 200 / 180
  '--card-image-height': ['200px', '220px', '180px', '200px', '180px'],
  '--card-image-height-lg': ['200px', '220px', '280px', '200px', '180px'],
  // 标题 14-16px / 副标题 12-13px
  '--card-title-size': ['15px', '16px', '20px', '16px', '14px'],
  '--card-sub-size': ['12px', '13px', '13px', '13px', '12px'],

  /* ── B4. 价格 ─────────────────────────────────────────────── */
  '--price-color': ['#fafafa', '#1e1b4b', '#d62872', '#000000', '#22c55e'],
  // 代码/价格背景：只有 mono 有底色
  '--price-bg': ['transparent', 'transparent', 'transparent', 'transparent', '#141414'],

  /* ── B5. 提示框 Toast ─────────────────────────────────────── */
  // 宽度 360 / 380 / 360 / 380 / 340
  '--toast-width': ['360px', '380px', '360px', '380px', '340px'],
  // 内边距 14 16 / 16 20 / 16 20 / 16 20 / 12 14
  '--toast-padding-y': ['14px', '16px', '16px', '16px', '12px'],
  '--toast-padding-x': ['16px', '20px', '20px', '20px', '14px'],
  // 圆角 12 / 16 / 12 / 0 / 4
  '--toast-radius': ['12px', '16px', '12px', '0px', '4px'],
  // 图标 20 / 20 / 18 / 20 / 16，字号 14 / 14 / 14 / 14 / 13
  '--toast-icon-size': ['20px', '20px', '18px', '20px', '16px'],
  '--toast-font-size': ['14px', '14px', '14px', '14px', '13px'],

  /* ── B6. 模态框 ───────────────────────────────────────────── */
  // 宽度 480 / 520 / 480 / 520 / 440
  '--modal-width': ['480px', '520px', '480px', '520px', '440px'],
  // 内边距 24 / 28 / 28 / 28 / 20
  '--modal-padding': ['24px', '28px', '28px', '28px', '20px'],
  // 关闭按钮 32 / 36 / 32 / 32 / 28
  '--modal-close-size': ['32px', '36px', '32px', '32px', '28px'],
  // 标题 20 / 24 / 20 / 24 / 20，正文 15 / 15 / 14 / 15 / 14
  '--modal-title-size': ['20px', '24px', '20px', '24px', '20px'],
  '--modal-body-size': ['15px', '15px', '14px', '15px', '14px'],

  /* ── B7. 下拉菜单 ─────────────────────────────────────────── */
  // 宽度 200 / 220 / 200 / 220 / 180
  '--dropdown-width': ['200px', '220px', '200px', '220px', '180px'],
  // 上下内边距 6 / 8 / 6 / 8 / 4
  '--dropdown-padding-y': ['6px', '8px', '6px', '8px', '4px'],
  // 圆角 12 / 16 / 12 / 0 / 4
  '--dropdown-radius': ['12px', '16px', '12px', '0px', '4px'],
  // 选项高度 36 / 40 / 38 / 44 / 32
  '--dropdown-item-height': ['36px', '40px', '38px', '44px', '32px'],

  /* ── B8. 标签 Tag / Badge ─────────────────────────────────── */
  // 高度 22 / 26 / 24 / 26 / 20
  '--tag-height': ['22px', '26px', '24px', '26px', '20px'],
  // 内边距 2 8 / 4 12 / 3 10 / 4 12 / 2 6
  '--tag-padding-y': ['2px', '4px', '3px', '4px', '2px'],
  '--tag-padding-x': ['8px', '12px', '10px', '12px', '6px'],
  // 圆角 6 / 9999 / 8 / 0 / 4
  '--tag-radius': ['6px', '9999px', '8px', '0px', '4px'],
  // 字号 11 / 12 / 11 / 12 / 11，字重 500 / 500 / 600 / 700 / 500
  '--tag-font-size': ['11px', '12px', '11px', '12px', '11px'],
  '--tag-font-weight': ['500', '500', '600', '700', '500'],

  /* ── B9. 分页 ─────────────────────────────────────────────── */
  // 按钮 36 / 40 / 38 / 44 / 32
  '--pager-size': ['36px', '40px', '38px', '44px', '32px'],
  // 圆角 8 / 9999 / 10 / 0 / 4
  '--pager-radius': ['8px', '9999px', '10px', '0px', '4px'],
  // 间距 6 / 8 / 6 / 8 / 4，字号 13 / 14 / 13 / 14 / 12
  '--pager-gap': ['6px', '8px', '6px', '8px', '4px'],
  '--pager-font-size': ['13px', '14px', '13px', '14px', '12px'],
  // 当前页：前三套是强调底白字，neo 是黑底白字 + 硬阴影，mono 是描边绿字
  '--pager-active-bg': ['#3b82f6', '#6366f1', '#d62872', '#000000', 'transparent'],
  '--pager-active-color': ['#ffffff', '#ffffff', '#ffffff', '#ffffff', '#22c55e'],
  '--pager-active-border': [
    'transparent',
    'transparent',
    'transparent',
    'transparent',
    '#22c55e',
  ],
  '--pager-active-shadow': [
    'none',
    'none',
    'none',
    '4px 4px 0 #000000',
    'none',
  ],

  /* ── B10. 进度条 / 加载 ───────────────────────────────────── */
  // 高度 4 / 6 / 6 / 8 / 4
  '--progress-height': ['4px', '6px', '6px', '8px', '4px'],
  // 圆角 9999 / 9999 / 9999 / 0 / 2
  '--progress-radius': ['9999px', '9999px', '9999px', '0px', '2px'],
  // 轨道色
  '--progress-track': [
    '#27272a',
    'rgba(255, 255, 255, 0.4)',
    '#ebebeb',
    '#e5e5e5',
    '#2a2a2a',
  ],

  /* ── B11. 头像 ────────────────────────────────────────────── */
  // 产品里只有导航栏一处头像，取规范的中档 32 / 36 / 32 / 36 / 28
  '--avatar-size': ['32px', '36px', '32px', '36px', '28px'],
  // 圆角 9999 / 9999 / 9999 / 9999 / 4
  '--avatar-radius': ['9999px', '9999px', '9999px', '9999px', '4px'],
  // 边框 无 / 2px 半透明白 / 无 / 2px 黑 / 1px
  '--avatar-border-width': ['0', '2px', '0', '2px', '1px'],
  '--avatar-border-color': [
    'transparent',
    'rgba(255, 255, 255, 0.6)',
    'transparent',
    '#000000',
    '#2a2a2a',
  ],

  /* ── B12. 复选框 ──────────────────────────────────────────── */
  // 尺寸 18 / 20 / 18 / 22 / 16
  '--checkbox-size': ['18px', '20px', '18px', '22px', '16px'],
  // 圆角 4 / 6 / 4 / 0 / 2
  '--checkbox-radius': ['4px', '6px', '4px', '0px', '2px'],
  // 勾选图标 12 / 14 / 12 / 14 / 10
  '--checkbox-icon-size': ['12px', '14px', '12px', '14px', '10px'],
}

/* ══════════════════════════════════════════════════════════════════
 * 主题元数据
 * ══════════════════════════════════════════════════════════════════ */

const THEME_META = {
  'tech-minimal': {
    name: 'Tech Minimal',
    label: '暗色科技极简',
    tagline: '安静的未来主义，内容成为主角',
    scheme: 'dark',
    swatch: ['#0a0a0a', '#27272a', '#3b82f6', '#fafafa'],
    // 价格：¥ + 两位小数，小数部分小一号
    price: { prefix: '¥', decimals: 2 },
  },
  'liquid-glass': {
    name: 'Liquid Glass',
    label: '液态玻璃·电商',
    tagline: '通透、轻盈、有层次的玻璃面板',
    scheme: 'light',
    swatch: ['#f5f3ff', '#ffffff', '#6366f1', '#1e1b4b'],
    price: { prefix: '¥', decimals: 2 },
  },
  'bento-editorial': {
    name: 'Bento Editorial',
    label: '便当盒编辑风',
    tagline: '结构化但不僵硬的不对称网格',
    scheme: 'light',
    swatch: ['#f7f7f5', '#ffffff', '#d62872', '#1a1a1a'],
    // 规范：无小数
    price: { prefix: '¥', decimals: 0 },
  },
  'neo-brutalism': {
    name: 'Neo-Brutalism',
    label: '新粗野主义·点缀',
    tagline: '克制的基底，关键转化点释放张力',
    scheme: 'light',
    swatch: ['#ffffff', '#fafafa', '#ff6b35', '#1a1a2e'],
    price: { prefix: '¥', decimals: 0 },
  },
  'technical-monochrome': {
    name: 'Technical Mono',
    label: '技术单色·等宽',
    tagline: '紧凑、精确、无废话的终端叙事',
    scheme: 'dark',
    swatch: ['#0d0d0d', '#1a1a1a', '#22c55e', '#e8e8e8'],
    // 规范：前缀 $、无小数
    price: { prefix: '$', decimals: 0 },
  },
}

/** 组装：五套主题 = 矩阵的对应列 + SHARED 的公共取值 */
export const THEMES = THEME_ORDER.map((id, index) => {
  const tokens = { ...SHARED }
  for (const [token, column] of Object.entries(MATRIX)) {
    tokens[token] = column[index]
  }
  return { id, ...THEME_META[id], tokens }
})

/** 默认主题（规范里的「2026 年最主流」） */
export const DEFAULT_THEME_ID = 'tech-minimal'

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

/* ══════════════════════════════════════════════════════════════════
 * 单项自定义
 * 弹窗「单项修改」页签据此渲染，不需要在组件里硬编码每个控件。
 * `kind` 决定 apply 时如何落到令牌上（见 theme/compose.js）。
 * ══════════════════════════════════════════════════════════════════ */

export const CUSTOM_FIELDS = [
  {
    key: 'fontScale',
    kind: 'scale',
    label: '全局字号',
    hint: '按比例缩放全部字号令牌（不影响尺寸与间距）',
    type: 'range',
    min: 0.85,
    max: 1.3,
    step: 0.01,
    format: (v) => `${Math.round(v * 100)}%`,
  },
  {
    key: 'density',
    kind: 'scale',
    label: '间距与控件密度',
    hint: '按比例缩放内边距、间距、控件高度与卡片尺寸',
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
    hint: '同时派生悬停色、柔和底色、按钮悬停底色与反白文字色；留空表示跟随主题',
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
      { value: 'condensed', label: '压缩 Instrument Sans' },
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

/**
 * 会被 fontScale / density / radiusScale 缩放的令牌分组。
 *
 * 只列**单值 px** 的令牌：`scalePx` 不解析 `2px 6px` 这类简写，
 * 与其静默跳过，不如不列进来（简写里含的是文字侧尺寸，不该随密度走）。
 */
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
    '--fs-price-decimals',
    '--fs-price-original',
    '--card-title-size',
    '--card-sub-size',
    '--input-font-size',
    '--btn-font-size',
    '--modal-title-size',
    '--modal-body-size',
    '--toast-font-size',
    '--tag-font-size',
    '--pager-font-size',
    '--nav-link-size',
  ],
  density: [
    '--space-unit',
    '--grid-gap',
    '--section-gap',
    '--container-padding',
    '--card-width',
    '--card-width-lg',
    '--card-padding',
    '--card-padding-lg',
    '--card-image-height',
    '--card-image-height-lg',
    '--input-height',
    '--input-padding-y',
    '--input-padding-x',
    '--input-icon-size',
    '--input-icon-gap',
    '--btn-height',
    '--btn-padding-y',
    '--btn-padding-x',
    '--icon-btn-size',
    '--icon-btn-icon-size',
    '--tag-height',
    '--tag-padding-y',
    '--tag-padding-x',
    '--pager-size',
    '--pager-gap',
    '--avatar-size',
    '--checkbox-size',
    '--checkbox-icon-size',
    '--progress-height',
    '--toast-width',
    '--toast-padding-y',
    '--toast-padding-x',
    '--toast-icon-size',
    '--modal-width',
    '--modal-padding',
    '--modal-close-size',
    '--dropdown-width',
    '--dropdown-padding-y',
    '--dropdown-item-height',
    '--nav-padding-x',
    '--nav-menu-gap',
    '--nav-logo-height',
  ],
  radiusScale: [
    '--radius-card',
    '--radius-card-lg',
    '--radius-panel',
    '--radius-input',
    '--radius-media',
    '--btn-radius',
    '--icon-btn-radius',
    '--toast-radius',
    '--dropdown-radius',
    '--tag-radius',
    '--micro-badge-radius',
    '--pager-radius',
    '--progress-radius',
    '--avatar-radius',
    '--checkbox-radius',
  ],
}
