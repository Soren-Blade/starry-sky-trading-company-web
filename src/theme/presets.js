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

  /* 下拉选中态左侧竖条宽度（选项内边距已改为逐风格，见下） */
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

  /* ── B14. 下拉 / 选择器（§1） ─────────────────────────────── */
  /* 搜索型下拉：搜索框与列表的间距 */
  '--dropdown-search-gap': '8px',
  /* 无结果提示的上下内边距 */
  '--dropdown-empty-padding': '24px',
  /* 无结果提示字号 */
  '--dropdown-empty-font-size': '13px',

  /* ── B15. 复选框（§2） ─────────────────────────────── */
  /* 整行可点击，最小高度 */
  '--checkbox-row-min-height': '32px',

  /* ── B16. 单选框（§3） ─────────────────────────────── */
  /* 选中态边框宽度（5 套通用） */
  '--radio-checked-border-width': '2px',
  /* 单选组垂直排列间距 */
  '--radio-group-gap-y': '12px',
  /* 单选组水平排列间距 */
  '--radio-group-gap-x': '20px',
  /* 组标签字号 */
  '--radio-group-label-size': '14px',
  /* 组标签字重 */
  '--radio-group-label-weight': '500',
  /* 组标签下边距 */
  '--radio-group-label-gap': '10px',

  /* ── B17. 开关（§4） ─────────────────────────────── */
  /* 滑块内边距 */
  '--switch-thumb-inset': '2px',
  /* 标签与轨道的间距 */
  '--switch-label-gap': '10px',

  /* ── B18. 滑块（§5） ─────────────────────────────── */
  /* 刻度标签字号（规范 11–12px） */
  '--slider-tick-size': '12px',
  /* 刻度标签与轨道的间距 */
  '--slider-tick-gap': '8px',
  /* 当前值气泡高度 */
  '--slider-bubble-h': '24px',
  /* 气泡内边距 */
  '--slider-bubble-padding': '4px 8px',
  /* 气泡圆角 */
  '--slider-bubble-radius': '6px',
  /* 气泡字号 */
  '--slider-bubble-size': '12px',
  /* 气泡文字色（底色取 --accent） */
  '--slider-bubble-color': '#FFFFFF',

  /* ── B19. 步骤条（§6） ─────────────────────────────── */
  /* 垂直排列步骤间距 */
  '--step-gap-y': '24px',
  /* 水平排列步骤间距 */
  '--step-gap-x': '40px',
  /* 圆点内数字/图标字号（规范 12–14px） */
  '--step-num-size': '13px',
  /* 圆点内数字字重 */
  '--step-num-weight': '600',

  /* ── B20. 手风琴（§7） ─────────────────────────────── */
  /* 内容区内边距 */
  '--accordion-body-padding': '0 20px 16px',
  /* 内容区字号 */
  '--accordion-body-size': '14px',
  /* 内容区行高 */
  '--accordion-body-leading': '1.6',

  /* ── B21. 选项卡（§8） ─────────────────────────────── */
  /* 内容区上边距（规范 16–24px） */
  '--tab-content-gap': '20px',

  /* ── B22. 面包屑（§9） ─────────────────────────────── */
  /* 首页图标尺寸（规范 14–16px） */
  '--breadcrumb-icon-size': '15px',
  /* 图标与文字间距 */
  '--breadcrumb-icon-gap': '6px',

  /* ── B23. 表格（§10） ─────────────────────────────── */
  /* 排序图标尺寸（规范 12–14px） */
  '--table-sort-icon-size': '13px',
  /* 排序图标与文字间距 */
  '--table-sort-gap': '4px',
  /* 选择列宽 */
  '--table-select-col-width': '48px',
  /* 操作列宽（右对齐） */
  '--table-action-col-width': '120px',

  /* ── B24. 日期选择器（§11） ─────────────────────────────── */
  /* 月份导航箭头尺寸（规范 24–28px） */
  '--datepicker-nav-size': '26px',
  /* 月份标题字号（规范 14–16px） */
  '--datepicker-title-size': '15px',
  /* 星期行字号（规范 11–12px） */
  '--datepicker-weekday-size': '12px',
  /* 星期行高度 */
  '--datepicker-weekday-height': '32px',
  /* 非本月日期的不透明度 */
  '--datepicker-other-opacity': '0.5',

  /* ── B25. 文件上传（§12） ─────────────────────────────── */
  /* 文件列表项高度 */
  '--upload-file-height': '48px',
  /* 文件列表项内边距 */
  '--upload-file-padding': '8px 12px',
  /* 文件图标尺寸 */
  '--upload-file-icon': '20px',
  /* 删除按钮尺寸 */
  '--upload-file-remove': '24px',

  /* ── B26. 评分（§13） ─────────────────────────────── */
  /* 悬停放大倍数 */
  '--rating-hover-scale': '1.15',
  /* 悬停过渡时长 */
  '--rating-hover-duration': '0.15s',

  /* ── B27. 气泡提示（§14） ─────────────────────────────── */
  /* 与触发元素的间距 */
  '--tooltip-offset': '8px',

  /* ── B28. 抽屉（§15） ─────────────────────────────── */
  /* 滑入时长 */
  '--drawer-duration': '0.3s',
  /* 滑入缓动 */
  '--drawer-ease': 'cubic-bezier(0.32, 0.72, 0, 1)',



  /* ── B31. 通知徽标（§18） ─────────────────────────────── */
  /* 与背景同色的分离描边（叠在头像上时用） */
  '--badge-ring-width': '2px',
  /* 相对父元素右上角的水平偏移 */
  '--badge-offset-x': '-4px',
  /* 相对父元素右上角的垂直偏移 */
  '--badge-offset-y': '-4px',


  /* ── B33. 通用状态与交互（§21） ─────────────────────────────── */
  /* 聚焦外环的 offset */
  '--focus-ring-offset': '2px',
  /* 激活态缩放（规范 0.97–0.99；按钮另有 --btn-active-transform） */
  '--active-scale': '0.98',
  /* 禁用态不透明度（规范 0.4–0.5） */
  '--state-disabled-opacity': '0.45',
  /* 按钮内联加载圈尺寸 */
  '--loading-spinner-size': '16px',
  /* 加载中文字保留但降低不透明度 */
  '--loading-text-opacity': '0.6',
  /* 字段错误文字字号 */
  '--field-error-size': '12px',
  /* 错误文字与控件的间距 */
  '--field-error-gap': '6px',
  /* 成功态右侧勾图标尺寸 */
  '--field-success-icon': '16px',
  '--bg-media-opacity': '0.18',

  /* ══════════════════════════════════════════════════════════════
   * 尺寸统一组：以下令牌**五套取值完全相同**。
   *
   * 这是「切换主题只改字体 / 颜色 / 风格」的实现方式 —— 凡是会改变盒子几何的量
   * （高 / 宽 / 内边距 / 间距 / 字号 / 行高 / 密度基准 / 控件与轨道尺寸）都不再逐主题取值，
   * 于是切换主题时布局不会跳动，用户不会觉得「窗口变大或变小」。
   * 取值统一以默认主题 tech-minimal 为基准（它同时是 variables.css 的回退值）。
   *
   * 按风格保留逐主题的是：颜色、字体族、字重/字距/大小写、圆角、阴影、滤镜、
   * 过渡动效，以及描边粗细（1–2px，属于风格签名而非尺寸）。
   * ══════════════════════════════════════════════════════════════ */

  /* ── 尺寸统一 · leading（行高决定文本块高度，必须逐套同值）─────
   *
   * body 的行高走的正是 --leading-body；它逐风格是 1.5 / 1.55 / 1.6 时，
   * **每一行文本的高度都不同**，整页高度会因此差十几像素 —— 真机实测：
   * hero-content 336→341、footer-content 165→170、navbar-drawer 294→301。
   * 把行高统一成比值后，行盒高度 = 行高 × 字号，字号也已统一，于是文本块高度
   * 不再受字体族度量影响（不同字体的 ascent/descent 会经由 line-height: normal 泄漏进布局）。 */
  // leading-body
  '--leading-body': '1.5',
  // leading-title（商品标题固定 1.4，本来就是五套同值）
  '--leading-title': '1.4',

  /* ── 尺寸统一 · fs（切主题不改变几何，取 tech-minimal 基准）───── */
  // fs-display
  '--fs-display': '72px',
  // fs-h1
  '--fs-h1': '48px',
  // fs-h2
  '--fs-h2': '40px',
  // fs-h3
  '--fs-h3': '20px',
  // fs-body
  '--fs-body': '15px',
  // fs-sm
  '--fs-sm': '14px',
  // fs-label
  '--fs-label': '12px',
  // fs-price
  '--fs-price': '20px',
  // fs-price-decimals
  '--fs-price-decimals': '14px',
  // fs-price-original
  '--fs-price-original': '18px',

  /* ── 尺寸统一 · space（切主题不改变几何，取 tech-minimal 基准）───── */
  // space-unit
  '--space-unit': '8px',

  /* ── 尺寸统一 · grid（切主题不改变几何，取 tech-minimal 基准）───── */
  // grid-gap
  '--grid-gap': '16px',

  /* ── 尺寸统一 · section（切主题不改变几何，取 tech-minimal 基准）───── */
  // section-gap
  '--section-gap': '96px',

  /* ── 尺寸统一 · navbar（切主题不改变几何，取 tech-minimal 基准）───── */
  // navbar-height
  '--navbar-height': '64px',

  /* ── 尺寸统一 · nav（切主题不改变几何，取 tech-minimal 基准）───── */
  // nav-padding-x
  '--nav-padding-x': '32px',
  // nav-logo-height
  '--nav-logo-height': '24px',
  // nav-menu-gap
  '--nav-menu-gap': '28px',
  // nav-link-size
  '--nav-link-size': '13px',

  /* ── 尺寸统一 · btn（切主题不改变几何，取 tech-minimal 基准）───── */
  // btn-height
  '--btn-height': '40px',
  // btn-padding-y
  '--btn-padding-y': '12px',
  // btn-padding-x
  '--btn-padding-x': '20px',
  // btn-font-size
  '--btn-font-size': '14px',

  /* ── 尺寸统一 · input（切主题不改变几何，取 tech-minimal 基准）───── */
  // input-height
  '--input-height': '40px',
  // input-padding-y
  '--input-padding-y': '12px',
  // input-padding-x
  '--input-padding-x': '14px',
  // input-font-size
  '--input-font-size': '14px',
  // input-icon-size
  '--input-icon-size': '16px',
  // input-icon-gap
  '--input-icon-gap': '10px',

  /* ── 尺寸统一 · icon（切主题不改变几何，取 tech-minimal 基准）───── */
  // icon-btn-size
  '--icon-btn-size': '40px',
  // icon-btn-icon-size
  '--icon-btn-icon-size': '18px',

  /* ── 尺寸统一 · card（切主题不改变几何，取 tech-minimal 基准）───── */
  // card-width
  '--card-width': '280px',
  // card-width-lg
  '--card-width-lg': '280px',
  // card-padding
  '--card-padding': '20px',
  // card-padding-lg
  '--card-padding-lg': '20px',
  // card-image-height
  '--card-image-height': '200px',
  // card-image-height-lg
  '--card-image-height-lg': '200px',
  // card-title-size
  '--card-title-size': '15px',
  // card-sub-size
  '--card-sub-size': '12px',

  /* ── 尺寸统一 · toast（切主题不改变几何，取 tech-minimal 基准）───── */
  // toast-width
  '--toast-width': '360px',
  // toast-padding-y
  '--toast-padding-y': '14px',
  // toast-padding-x
  '--toast-padding-x': '16px',
  // toast-icon-size
  '--toast-icon-size': '20px',
  // toast-font-size
  '--toast-font-size': '14px',

  /* ── 尺寸统一 · modal（切主题不改变几何，取 tech-minimal 基准）───── */
  // modal-width
  '--modal-width': '480px',
  // modal-padding
  '--modal-padding': '24px',
  // modal-close-size
  '--modal-close-size': '32px',
  // modal-title-size
  '--modal-title-size': '20px',
  // modal-body-size
  '--modal-body-size': '15px',

  /* ── 尺寸统一 · dropdown（切主题不改变几何，取 tech-minimal 基准）───── */
  // dropdown-width
  '--dropdown-width': '200px',
  // dropdown-padding-y
  '--dropdown-padding-y': '6px',
  // dropdown-item-height
  '--dropdown-item-height': '36px',
  // dropdown-max-height
  '--dropdown-max-height': '280px',
  // dropdown-offset
  '--dropdown-offset': '6px',
  // dropdown-item-padding-x
  '--dropdown-item-padding-x': '14px',
  // dropdown-item-font-size
  '--dropdown-item-font-size': '13px',
  // dropdown-check-size
  '--dropdown-check-size': '14px',
  // dropdown-group-height
  '--dropdown-group-height': '28px',
  // dropdown-group-font-size
  '--dropdown-group-font-size': '11px',
  // dropdown-group-gap
  '--dropdown-group-gap': '6px',

  /* ── 尺寸统一 · tag（切主题不改变几何，取 tech-minimal 基准）───── */
  // tag-height
  '--tag-height': '22px',
  // tag-padding-y
  '--tag-padding-y': '2px',
  // tag-padding-x
  '--tag-padding-x': '8px',
  // tag-font-size
  '--tag-font-size': '11px',

  /* ── 尺寸统一 · pager（切主题不改变几何，取 tech-minimal 基准）───── */
  // pager-size
  '--pager-size': '36px',
  // pager-gap
  '--pager-gap': '6px',
  // pager-font-size
  '--pager-font-size': '13px',

  /* ── 尺寸统一 · progress（切主题不改变几何，取 tech-minimal 基准）───── */
  // progress-height
  '--progress-height': '4px',

  /* ── 尺寸统一 · avatar（切主题不改变几何，取 tech-minimal 基准）───── */
  // avatar-size
  '--avatar-size': '32px',

  /* ── 尺寸统一 · checkbox（切主题不改变几何，取 tech-minimal 基准）───── */
  // checkbox-size
  '--checkbox-size': '18px',
  // checkbox-label-gap
  '--checkbox-label-gap': '10px',
  // checkbox-label-size
  '--checkbox-label-size': '14px',
  // checkbox-indeterminate-width
  '--checkbox-indeterminate-width': '8px',
  // checkbox-icon-size
  '--checkbox-icon-size': '12px',

  /* ── 尺寸统一 · select（切主题不改变几何，取 tech-minimal 基准）───── */
  // select-arrow-size
  '--select-arrow-size': '16px',

  /* ── 尺寸统一 · radio（切主题不改变几何，取 tech-minimal 基准）───── */
  // radio-size
  '--radio-size': '18px',
  // radio-dot-size
  '--radio-dot-size': '8px',
  // radio-label-gap
  '--radio-label-gap': '10px',

  /* ── 尺寸统一 · switch（切主题不改变几何，取 tech-minimal 基准）───── */
  // switch-track-w
  '--switch-track-w': '40px',
  // switch-track-h
  '--switch-track-h': '22px',
  // switch-thumb-size
  '--switch-thumb-size': '18px',

  /* ── 尺寸统一 · slider（切主题不改变几何，取 tech-minimal 基准）───── */
  // slider-track-h
  '--slider-track-h': '4px',
  // slider-thumb-size
  '--slider-thumb-size': '18px',

  /* ── 尺寸统一 · step（切主题不改变几何，取 tech-minimal 基准）───── */
  // step-dot-size
  '--step-dot-size': '28px',
  // step-label-size
  '--step-label-size': '13px',

  /* ── 尺寸统一 · accordion（切主题不改变几何，取 tech-minimal 基准）───── */
  // accordion-item-height
  '--accordion-item-height': '56px',
  // accordion-padding-y
  '--accordion-padding-y': '16px',
  // accordion-padding-x
  '--accordion-padding-x': '20px',
  // accordion-title-size
  '--accordion-title-size': '15px',
  // accordion-icon-size
  '--accordion-icon-size': '16px',

  /* ── 尺寸统一 · tab（切主题不改变几何，取 tech-minimal 基准）───── */
  // tab-height
  '--tab-height': '40px',
  // tab-padding-y
  '--tab-padding-y': '10px',
  // tab-padding-x
  '--tab-padding-x': '16px',
  // tab-font-size
  '--tab-font-size': '14px',
  // tab-indicator-height
  '--tab-indicator-height': '2px',
  // tab-gap
  '--tab-gap': '24px',

  /* ── 尺寸统一 · breadcrumb（切主题不改变几何，取 tech-minimal 基准）───── */
  // breadcrumb-height
  '--breadcrumb-height': '24px',
  // breadcrumb-font-size
  '--breadcrumb-font-size': '13px',
  // breadcrumb-gap
  '--breadcrumb-gap': '8px',

  /* ── 尺寸统一 · table（切主题不改变几何，取 tech-minimal 基准）───── */
  // table-row-height
  '--table-row-height': '48px',
  // table-head-height
  '--table-head-height': '40px',
  // table-cell-padding-y
  '--table-cell-padding-y': '12px',
  // table-cell-padding-x
  '--table-cell-padding-x': '16px',
  // table-font-size
  '--table-font-size': '13px',
  // table-head-font-size
  '--table-head-font-size': '12px',

  /* ── 尺寸统一 · datepicker（切主题不改变几何，取 tech-minimal 基准）───── */
  // datepicker-width
  '--datepicker-width': '280px',
  // datepicker-padding
  '--datepicker-padding': '16px',
  // datepicker-cell-size
  '--datepicker-cell-size': '36px',
  // datepicker-font-size
  '--datepicker-font-size': '13px',

  /* ── 尺寸统一 · upload（切主题不改变几何，取 tech-minimal 基准）───── */
  // upload-height
  '--upload-height': '160px',
  // upload-padding
  '--upload-padding': '24px',
  // upload-icon-size
  '--upload-icon-size': '32px',
  // upload-title-size
  '--upload-title-size': '14px',
  // upload-sub-size
  '--upload-sub-size': '12px',

  /* ── 尺寸统一 · rating（切主题不改变几何，取 tech-minimal 基准）───── */
  // rating-star-size
  '--rating-star-size': '16px',
  // rating-star-gap
  '--rating-star-gap': '4px',
  // rating-number-size
  '--rating-number-size': '13px',

  /* ── 尺寸统一 · tooltip（切主题不改变几何，取 tech-minimal 基准）───── */
  // tooltip-padding-y
  '--tooltip-padding-y': '6px',
  // tooltip-padding-x
  '--tooltip-padding-x': '10px',
  // tooltip-font-size
  '--tooltip-font-size': '12px',
  // tooltip-arrow-size
  '--tooltip-arrow-size': '6px',
  // tooltip-max-width
  '--tooltip-max-width': '240px',

  /* ── 尺寸统一 · drawer（切主题不改变几何，取 tech-minimal 基准）───── */
  // drawer-width
  '--drawer-width': '400px',
  // drawer-padding
  '--drawer-padding': '24px',
  // drawer-head-height
  '--drawer-head-height': '64px',
  // drawer-foot-height
  '--drawer-foot-height': '72px',

  /* ── 尺寸统一 · skeleton（切主题不改变几何，取 tech-minimal 基准）───── */
  // skeleton-line-height
  '--skeleton-line-height': '16px',
  // skeleton-line-gap
  '--skeleton-line-gap': '8px',

  /* ── 尺寸统一 · empty（切主题不改变几何，取 tech-minimal 基准）───── */
  // empty-icon-size
  '--empty-icon-size': '64px',
  // empty-title-size
  '--empty-title-size': '18px',
  // empty-desc-size
  '--empty-desc-size': '14px',
  // empty-btn-gap
  '--empty-btn-gap': '24px',
  // empty-padding-top
  '--empty-padding-top': '80px',

  /* ── 尺寸统一 · badge（切主题不改变几何，取 tech-minimal 基准）───── */
  // badge-height
  '--badge-height': '18px',
  // badge-padding-x
  '--badge-padding-x': '5px',
  // badge-font-size
  '--badge-font-size': '11px',
  // badge-min-width
  '--badge-min-width': '18px',
  // badge-dot-size
  '--badge-dot-size': '8px',

  /* ── 尺寸统一 · scrollbar（切主题不改变几何，取 tech-minimal 基准）───── */
  // scrollbar-width
  '--scrollbar-width': '8px',
  // scrollbar-padding
  '--scrollbar-padding': '2px',
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
  // --leading-body 已移入「尺寸统一」组：它逐风格是 1.5 / 1.55 / 1.6，
  // 而 body 的行高正是走这个令牌 —— 于是**每一行文本的高度都不同**，
  // 整页会因此差十几像素（真机实测 hero 336→341、footer 165→170）。
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




  /* ── 导航栏 ───────────────────────────────────────────────── */


  // 底部边框色（宽度取 --stroke-width：neo 为 2px）
  '--nav-border-color': [
    '#2a2a2d',
    'rgba(255, 255, 255, 0.4)',
    '#ebebeb',
    '#000000',
    '#2a2a2a',
  ],



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
  /*
   * 卡片阴影。第四列是 neo-brutalism：
   *
   * 尺寸统一之后（按钮 52px→40px、输入框 48px→40px），这套风格原本靠「又大又厚」
   * 表达的重量感没了，只能由**样式**补回来 —— 而它此前在卡片上恰恰没体现签名：
   * 只给了 0 1px 2px(0.05) 这种软阴影，hover 还与常态一模一样（等于没有反馈）。
   * 现在改为与自己 --shadow-float 同一套语言的**硬投影**（无模糊、纯黑、位移），
   * 悬停时位移加大，brutalism 的「块面感」才真正落到卡片上。
   */
  // 卡片 无 / 0 8px 32px(0.08) / 0 1px 3px(0.04) / 4px 4px 0 纯黑硬投影 / 无
  '--shadow-card': [
    'none',
    '0 8px 32px rgba(99, 102, 241, 0.08)',
    '0 1px 3px rgba(0, 0, 0, 0.04)',
    '4px 4px 0 #000000',
    'none',
  ],
  // 悬停：glass 加深、bento 保持、neo 位移加大到 8px（硬投影只能靠位移表达层次）
  '--shadow-card-hover': [
    'none',
    '0 8px 32px rgba(99, 102, 241, 0.14)',
    '0 1px 3px rgba(0, 0, 0, 0.04)',
    '8px 8px 0 #000000',
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

  // 圆角 8 / 9999 / 10 / 0 / 6
  '--icon-btn-radius': ['8px', '9999px', '10px', '0px', '6px'],


  /* ── B3. 商品卡片 ─────────────────────────────────────────── */









  /* ── B4. 价格 ─────────────────────────────────────────────── */
  '--price-color': ['#fafafa', '#1e1b4b', '#d62872', '#000000', '#22c55e'],
  // 代码/价格背景：只有 mono 有底色
  '--price-bg': ['transparent', 'transparent', 'transparent', 'transparent', '#141414'],

  /* ── B5. 提示框 Toast ─────────────────────────────────────── */



  // 圆角 12 / 16 / 12 / 0 / 4
  '--toast-radius': ['12px', '16px', '12px', '0px', '4px'],



  /* ── B6. 模态框 ───────────────────────────────────────────── */






  /* ── B7. 下拉菜单 ─────────────────────────────────────────── */


  // 圆角 12 / 16 / 12 / 0 / 4
  '--dropdown-radius': ['12px', '16px', '12px', '0px', '4px'],


  /* ── B8. 标签 Tag / Badge ─────────────────────────────────── */



  // 圆角 6 / 9999 / 8 / 0 / 4
  '--tag-radius': ['6px', '9999px', '8px', '0px', '4px'],

  '--tag-font-weight': ['500', '500', '600', '700', '500'],

  /* ── B9. 分页 ─────────────────────────────────────────────── */

  // 圆角 8 / 9999 / 10 / 0 / 4
  '--pager-radius': ['8px', '9999px', '10px', '0px', '4px'],


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

  // 圆角 4 / 6 / 4 / 0 / 2
  '--checkbox-radius': ['4px', '6px', '4px', '0px', '2px'],
  // 勾选图标 12 / 14 / 12 / 14 / 10

  /* ── B14. 下拉 / 选择器（§1） ──────────────────────────── */

  // 箭头颜色
  '--select-arrow-color': ['#3F3F46', '#6B7280', '#8A8A8A', '#000000', '#6B6B6B'],
  // 面板阴影不单独登记：第三批 §1 的面板阴影与既有 --shadow-float 五套逐值相同




  // 选项悬停底色
  '--dropdown-item-hover-bg': ['#27272A', 'rgba(255, 255, 255, 0.4)', '#F7F7F5', '#FAFAFA', '#141414'],
  // 选项选中底色（neo 是纯色而非淡色叠加，无法复用 --accent-soft）
  '--dropdown-item-active-bg': ['rgba(59, 130, 246, 0.12)', 'rgba(99, 102, 241, 0.12)', 'rgba(214, 40, 114, 0.08)', '#FF6B35', 'rgba(34, 197, 94, 0.12)'],
  // 选项选中文字色
  '--dropdown-item-active-color': ['#FAFAFA', '#1E1B4B', '#1A1A1A', '#FFFFFF', '#E8E8E8'],
  // 选项禁用文字色
  '--dropdown-item-disabled-color': ['#3F3F46', '#6B7280', '#8A8A8A', '#999999', '#6B6B6B'],

  // 选中勾颜色
  '--dropdown-check-color': ['#3B82F6', '#6366F1', '#D62872', '#FFFFFF', 'transparent'],


  // 分组标题字重
  '--dropdown-group-weight': ['600', '600', '600', '700', '500'],
  // 分组标题颜色
  '--dropdown-group-color': ['#3F3F46', '#6B7280', '#8A8A8A', '#000000', '#6B6B6B'],

  // 搜索命中文字高亮底（accent 20%，不加粗）
  '--dropdown-hit-bg': ['rgba(59, 130, 246, 0.2)', 'rgba(99, 102, 241, 0.2)', 'rgba(214, 40, 114, 0.2)', 'rgba(255, 107, 53, 0.2)', 'rgba(34, 197, 94, 0.2)'],

  /* ── B15. 复选框（§2） ──────────────────────────── */
  // 悬停边框色（默认边框复用 --stroke-width / --stroke-color）
  '--checkbox-hover-border': ['#3F3F46', '#6366F1', '#D62872', '#FF6B35', '#22C55E'],
  // 选中背景
  '--checkbox-checked-bg': ['#3B82F6', '#6366F1', '#D62872', '#FF6B35', '#22C55E'],




  /* ── B16. 单选框（§3） ──────────────────────────── */


  // 选中边框与内圆的颜色
  '--radio-checked-color': ['#3B82F6', '#6366F1', '#D62872', '#FF6B35', '#22C55E'],


  /* ── B17. 开关（§4） ──────────────────────────── */


  // 轨道圆角
  '--switch-track-radius': ['9999px', '9999px', '9999px', '0px', '4px'],

  // 滑块圆角
  '--switch-thumb-radius': ['9999px', '9999px', '9999px', '0px', '2px'],
  // 关闭态轨道背景
  '--switch-off-bg': ['#27272A', 'rgba(255, 255, 255, 0.4)', '#EBEBEB', '#E5E5E5', '#2A2A2A'],
  // 开启态轨道背景
  '--switch-on-bg': ['#3B82F6', '#6366F1', '#D62872', '#FF6B35', '#22C55E'],
  // 滑块过渡（连缓动一起给，故为组合值）
  '--switch-transition': ['0.2s ease', '0.25s ease', '0.2s ease', '0.15s linear', '0.15s ease'],

  /* ── B18. 滑块（§5） ──────────────────────────── */

  // 轨道圆角
  '--slider-track-radius': ['9999px', '9999px', '9999px', '0px', '2px'],
  // 已选段颜色
  '--slider-fill': ['#3B82F6', '#6366F1', '#D62872', '#FF6B35', '#22C55E'],
  // 未选段颜色
  '--slider-track': ['#27272A', 'rgba(255, 255, 255, 0.4)', '#EBEBEB', '#E5E5E5', '#2A2A2A'],

  // 手柄圆角
  '--slider-thumb-radius': ['9999px', '9999px', '9999px', '0px', '2px'],
  // 手柄边框（组合值）
  '--slider-thumb-border': ['2px solid #0A0A0A', '2px solid #FFFFFF', '2px solid #FFFFFF', '2px solid #000000', '1px solid #0D0D0D'],
  // 手柄阴影
  '--slider-thumb-shadow': ['0 2px 8px rgba(0, 0, 0, 0.4)', '0 2px 12px rgba(99, 102, 241, 0.2)', '0 2px 8px rgba(0, 0, 0, 0.12)', '4px 4px 0 #000000', 'none'],

  /* ── B19. 步骤条（§6） ──────────────────────────── */

  // 圆点圆角
  '--step-dot-radius': ['9999px', '9999px', '9999px', '0px', '4px'],
  // 连接线高度
  '--step-line-h': ['2px', '2px', '2px', '3px', '2px'],
  // 连接线颜色
  '--step-line-color': ['#2A2A2D', 'rgba(255, 255, 255, 0.4)', '#EBEBEB', '#000000', '#2A2A2A'],
  // 当前步骤色（规范里「完成色」五套与它同值，故合并为一个令牌）
  '--step-current-color': ['#3B82F6', '#6366F1', '#D62872', '#FF6B35', '#22C55E'],
  // 未完成色
  '--step-todo-color': ['#27272A', 'rgba(255, 255, 255, 0.4)', '#EBEBEB', '#E5E5E5', '#2A2A2A'],


  /* ── B20. 手风琴（§7） ──────────────────────────── */



  // 圆角
  '--accordion-radius': ['12px', '16px', '12px', '0px', '4px'],

  // 标题字重
  '--accordion-title-weight': ['500', '500', '600', '700', '500'],

  // 展开动画（图标旋转与标题同步）
  '--accordion-transition': ['0.25s ease', '0.3s ease', '0.25s ease', '0.15s linear', '0.15s ease'],

  /* ── B21. 选项卡（§8） ──────────────────────────── */




  // 字重
  '--tab-font-weight': ['500', '500', '600', '700', '500'],
  // 未选中文字色
  '--tab-color': ['#6B7280', '#6B7280', '#8A8A8A', '#666666', '#6B6B6B'],
  // 选中文字色
  '--tab-active-color': ['#FAFAFA', '#1E1B4B', '#1A1A1A', '#000000', '#E8E8E8'],

  // 指示条颜色
  '--tab-indicator-color': ['#3B82F6', '#6366F1', '#D62872', '#FF6B35', '#22C55E'],


  /* ── B22. 面包屑（§9） ──────────────────────────── */


  // 分隔符内容（带引号，直接给 content: 用）
  '--breadcrumb-separator': ['"/"', '"›"', '"/"', '"→"', '">"'],
  // 分隔符颜色
  '--breadcrumb-separator-color': ['#3F3F46', '#6B7280', '#8A8A8A', '#000000', '#6B6B6B'],
  // 链接色
  '--breadcrumb-link-color': ['#6B7280', '#6B7280', '#8A8A8A', '#000000', '#6B6B6B'],
  // 当前页色
  '--breadcrumb-current-color': ['#FAFAFA', '#1E1B4B', '#1A1A1A', '#FF6B35', '#22C55E'],


  /* ── B23. 表格（§10） ──────────────────────────── */






  // 表头字重
  '--table-head-weight': ['600', '600', '600', '700', '500'],
  // 描边宽度（只画底边，neo 2px）
  '--table-border-width': ['1px', '1px', '1px', '2px', '1px'],
  // 描边颜色
  '--table-border-color': ['#2A2A2D', 'rgba(255, 255, 255, 0.4)', '#EBEBEB', '#000000', '#2A2A2A'],
  // 斑马纹底色（tech / glass / neo 无斑马纹）
  '--table-zebra-bg': ['transparent', 'transparent', '#FAFAFA', 'transparent', '#141414'],
  // 行悬停背景
  '--table-row-hover-bg': ['#27272A', 'rgba(255, 255, 255, 0.3)', '#F7F7F5', '#FAFAFA', '#1A1A1A'],
  // 表头是否大写（第三批给出了逐风格差异，故不能复用全局 --label-transform）
  '--table-head-transform': ['uppercase', 'none', 'uppercase', 'uppercase', 'uppercase'],

  /* ── B24. 日期选择器（§11） ──────────────────────────── */


  // 面板圆角
  '--datepicker-radius': ['12px', '16px', '12px', '0px', '4px'],

  // 单元格圆角
  '--datepicker-cell-radius': ['8px', '9999px', '8px', '0px', '4px'],
  // 选中背景
  '--datepicker-selected-bg': ['#3B82F6', '#6366F1', '#D62872', '#FF6B35', '#22C55E'],
  // 今天标记颜色
  '--datepicker-today-color': ['#3B82F6', '#6366F1', '#D62872', '#000000', '#22C55E'],
  // 今天标记：底部 2px 下划线 / 全框描边两种做法，统一用 box-shadow 表达（配色上面的 --datepicker-today-color + currentColor）
  '--datepicker-today-marker': ['inset 0 -2px 0 0 currentColor', '0 0 0 1px currentColor', 'inset 0 -2px 0 0 currentColor', '0 0 0 2px currentColor', 'inset 0 -2px 0 0 currentColor'],


  /* ── B25. 文件上传（§12） ──────────────────────────── */


  // 圆角
  '--upload-radius': ['12px', '16px', '12px', '0px', '4px'],



  // 拖拽激活态背景（accent 5%，边框同时变 --accent）
  '--upload-drag-bg': ['rgba(59, 130, 246, 0.05)', 'rgba(99, 102, 241, 0.05)', 'rgba(214, 40, 114, 0.05)', 'rgba(255, 107, 53, 0.05)', 'rgba(34, 197, 94, 0.05)'],

  /* ── B26. 评分（§13） ──────────────────────────── */


  // 填充色
  '--rating-fill': ['#F59E0B', '#F59E0B', '#F59E0B', '#FF6B35', '#22C55E'],
  // 空星色
  '--rating-empty': ['#3F3F46', '#D1D5DB', '#EBEBEB', '#E5E5E5', '#2A2A2A'],


  /* ── B27. 气泡提示（§14） ──────────────────────────── */


  // 圆角
  '--tooltip-radius': ['6px', '10px', '8px', '0px', '4px'],
  // 背景
  '--tooltip-bg': ['#27272A', 'rgba(30, 27, 75, 0.9)', '#1A1A1A', '#000000', '#1A1A1A'],
  // 文字色
  '--tooltip-color': ['#FAFAFA', '#FFFFFF', '#FFFFFF', '#FFFFFF', '#E8E8E8'],



  // 出现延迟（neo 无延迟）
  '--tooltip-delay': ['200ms', '200ms', '200ms', '0ms', '200ms'],
  // 阴影（neo 用硬阴影）
  '--tooltip-shadow': ['0 4px 12px rgba(0, 0, 0, 0.2)', '0 4px 12px rgba(0, 0, 0, 0.2)', '0 4px 12px rgba(0, 0, 0, 0.2)', '4px 4px 0 #000000', '0 4px 12px rgba(0, 0, 0, 0.2)'],

  /* ── B28. 抽屉（§15） ──────────────────────────── */


  // 圆角：抽屉从右侧滑入，圆的必须是可见的左边缘两角（四值顺序 左上 右上 右下 左下）
  '--drawer-radius': ['16px 0 0 16px', '24px 0 0 24px', '20px 0 0 20px', '0px', '4px 0 0 4px'],
  // 阴影
  '--drawer-shadow': ['-8px 0 32px rgba(0, 0, 0, 0.4)', '-8px 0 40px rgba(99, 102, 241, 0.16)', '-8px 0 32px rgba(0, 0, 0, 0.12)', '-8px 0 0 #000000', 'none'],
  // 遮罩色
  '--drawer-scrim': ['rgba(0, 0, 0, 0.7)', 'rgba(30, 27, 75, 0.3)', 'rgba(0, 0, 0, 0.5)', 'rgba(0, 0, 0, 0.6)', 'rgba(0, 0, 0, 0.8)'],
  // 遮罩模糊（只有 glass 有）
  '--drawer-scrim-backdrop': ['none', 'blur(8px)', 'none', 'none', 'none'],



  /* ── B29. 骨架屏（§16） ──────────────────────────── */
  // 循环时长（原为 5 套同值 1.5s，第三批改为逐风格）
  '--skeleton-duration': ['1.5s', '1.8s', '1.5s', '1s', '1.2s'],
  // 动画名：neo 用脉冲而不是 shimmer（规范明确要求）
  '--skeleton-animation-name': ['skeleton-shimmer', 'skeleton-shimmer', 'skeleton-shimmer', 'skeleton-pulse', 'skeleton-shimmer'],
  // 动画缓动
  '--skeleton-easing': ['linear', 'linear', 'linear', 'ease-in-out', 'linear'],
  // 底色
  '--skeleton-bg': ['#27272A', 'rgba(255, 255, 255, 0.4)', '#EBEBEB', '#E5E5E5', '#1A1A1A'],
  // 高亮色
  '--skeleton-highlight': ['#3F3F46', 'rgba(255, 255, 255, 0.7)', '#F7F7F5', '#FAFAFA', '#2A2A2A'],



  /* ── B30. 空状态（§17） ──────────────────────────── */

  // 图标颜色
  '--empty-icon-color': ['#3F3F46', '#6B7280', '#8A8A8A', '#000000', '#6B6B6B'],

  // 标题字重
  '--empty-title-weight': ['600', '600', '600', '700', '500'],

  // 描述颜色
  '--empty-desc-color': ['#6B7280', '#6B7280', '#8A8A8A', '#666666', '#6B6B6B'],



  /* ── B31. 通知徽标（§18） ──────────────────────────── */


  // 圆角
  '--badge-radius': ['9999px', '9999px', '9999px', '0px', '4px'],
  // 背景
  '--badge-bg': ['#EF4444', '#EF4444', '#D62872', '#FF6B35', '#22C55E'],
  // 文字色（mono 是深字配绿底）
  '--badge-color': ['#FFFFFF', '#FFFFFF', '#FFFFFF', '#FFFFFF', '#0D0D0D'],




  /* ── B32. 滚动条（§19） ──────────────────────────── */

  // 轨道色（glass 透明）
  '--scrollbar-track': ['#0A0A0A', 'transparent', '#F7F7F5', '#E5E5E5', '#0D0D0D'],
  // 滑块色
  '--scrollbar-thumb': ['#27272A', 'rgba(99, 102, 241, 0.3)', '#D4D4D4', '#000000', '#2A2A2A'],
  // 滑块圆角
  '--scrollbar-thumb-radius': ['9999px', '9999px', '9999px', '0px', '2px'],
  // 滑块悬停色
  '--scrollbar-thumb-hover': ['#3F3F46', 'rgba(99, 102, 241, 0.5)', '#8A8A8A', '#FF6B35', '#22C55E'],


  /* ── B33. 通用状态与交互（§21） ──────────────────────────── */
  // 所有控件的聚焦外环（输入框继续用自己的 --input-focus-shadow，当前两者同值）
  '--focus-ring': ['0 0 0 3px rgba(59, 130, 246, 0.15)', '0 0 0 3px rgba(99, 102, 241, 0.15)', '0 0 0 3px rgba(214, 40, 114, 0.15)', '0 0 0 3px rgba(255, 107, 53, 0.15)', '0 0 0 3px rgba(34, 197, 94, 0.15)'],

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
