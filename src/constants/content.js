/**
 * 常量与站点文案
 *
 * 两个原则：
 *   1. **不在这里写死任何设计数值** —— 颜色、字号、圆角全部来自设计令牌
 *      （`assets/styles/variables.css` + `theme/presets.js`）。
 *      历史上这里有一份 `COLORS` / `TAG_COLORS` 硬编码色表，既无人使用，
 *      又与令牌形成两份事实来源，已删除。
 *   2. **全站文案集中在此** —— 改文案只碰这一个文件，不用在组件里四处搜。
 *      若文案变动牵动了数据结构（例如价格要带货币前缀），必须同时改数据层：
 *      价格格式化见 `utils/index.js` 的 `formatUtils.formatPrice`，
 *      货币来源见 `theme/presets.js` 每套主题的 `price` 字段。
 */

/** 品牌信息 */
export const SITE = {
  name: '星辰商行',
  nameEn: 'Starry Sky Trading Co.',
  logo: '⭐',
  tagline: '精选商品 · 品质生活',
}

/** 导航菜单 */
export const NAV_MENU = [
  { id: 1, label: '首页', path: '/home' },
  { id: 2, label: '商品分类', path: '/categories' },
  { id: 3, label: '热门推荐', path: '/hot' },
  { id: 4, label: '工具分享', path: '/tool' },
  { id: 5, label: '关于我们', path: '/about' },
]

/** 首页首屏 */
export const HERO = {
  eyebrow: '2026 精选商城',
  title: '探索星辰之美',
  subtitle: '在星辰商行，发现生活的美好时刻。每一件商品都承载着独特的故事与品质。',
  primaryCta: '立即购物',
  secondaryCta: '了解更多',
  features: [
    { icon: '🎁', text: '品质保证' },
    { icon: '⚡', text: '快速配送' },
    { icon: '💳', text: '安全支付' },
  ],
}

/** 区块头文案（供 SectionHeader 使用） */
export const SECTIONS = {
  categories: {
    icon: '🛍️',
    title: '商品分类',
    description: '探索丰富多彩的商品世界，发现适合你的完美选择',
  },
  hot: {
    icon: '🔥',
    title: '热门商品',
    description: '精选热销商品，享受优质生活',
  },
  tools: {
    icon: '🧰',
    title: '工具分享',
    description: '按分类浏览实用工具，收藏常用的那几个',
  },
  kami: {
    icon: '🎴',
    title: '卡密管理',
    description: '查看并激活你的卡密',
  },
}

/**
 * 各页面的开场文案
 *
 * 主页以外的页面**不再使用统一的页头组件**（`PageHeader` 已删除）——
 * 每个页面按自己的信息结构设计开场：索引页用「编号 + 大字标题 + 计数」，
 * 榜单页用「横向标题带」，工作台用「左侧竖排标题」，编辑页用「首行眉标」。
 * 这里只提供文案，版式由各页面自己的 scoped 样式决定。
 *
 * 字段约定：
 *   eyebrow     眉标（短、大写友好，等宽字体呈现）
 *   title       标题
 *   description 一句说明
 *   meta        右侧/次要的计数或提示（可选）
 */
export const PAGES = {
  categories: {
    eyebrow: 'INDEX',
    title: '商品分类',
    description: '浏览所有分类，找到你需要的那一类',
  },
  hot: {
    eyebrow: 'RANKING',
    title: '热卖榜',
    description: '按销量与浏览量排序的精选商品',
  },
  tools: {
    eyebrow: 'WORKSPACE',
    title: '工具工作台',
    description: '按分类筛选、搜索并收藏常用工具',
  },
  appleId: {
    eyebrow: 'DIRECTORY',
    title: '共享苹果 ID',
    description: '按线路整理的账号目录，复制即可使用',
  },
  about: {
    eyebrow: 'ABOUT',
    title: '关于我们',
    description: '星辰商行的由来、做事方式与联系方式',
  },
  kami: {
    eyebrow: 'CONSOLE',
    title: '卡密控制台',
    description: '激活新卡密或查看已有卡密',
  },
  notFound: {
    eyebrow: 'ERROR',
    title: '页面未找到',
    description: '抱歉，您访问的页面不存在或已被删除',
    backHome: '返回首页',
    suggestionsTitle: '您可能想查看',
  },
}

/** 商品网格 */
export const PRODUCT_GRID = {
  loading: '正在加载商品…',
  empty: '暂无商品可展示',
  errorPrefix: '商品加载失败：',
  searchPlaceholder: '搜索商品或分类',
  searchEmpty: (keyword) => `没有找到与「${keyword}」相关的商品`,
  buy: '购买',
  soldOut: '缺货',
  viewsLabel: '浏览',
  salesLabel: '销量',
  stockLabel: '库存',
  defaultSeller: '星辰商行',
}

/** 工具页 */
export const TOOL_PAGE = {
  searchPlaceholder: '搜索工具…',
  loading: '正在加载工具…',
  errorPrefix: '工具加载失败：',
  empty: '该分类下暂无工具',
  favorites: '已收藏',
  openTool: '打开工具',
  addedFavorite: '已收藏',
  removedFavorite: '已取消收藏',
  missingPath: '该工具暂未配置跳转地址',
  invalidPath: '工具地址无效',
  popupBlocked: '浏览器拦截了新窗口，请允许本站弹出窗口',
}

/** 页脚 */
export const FOOTER = {
  about:
    '星辰商行致力于为用户带来精选商品和优质服务。每一件商品都经过严格筛选，确保品质与美学的完美结合。',
  socials: [
    { key: 'wechat', label: '微信', icon: '📱' },
    { key: 'qq', label: 'QQ', icon: '💬' },
    { key: 'weibo', label: '微博', icon: '🌍' },
    { key: 'douyin', label: '抖音', icon: '🎵' },
  ],
  paymentLabel: '安全支付',
  paymentIcons: ['💳', '🏦', '📱'],
  copyright: '© 2024 星辰商行. All rights reserved.',
  legalLinks: [
    { label: '备案号', href: '#' },
    { label: '隐私政策', href: '#' },
  ],
  bottomLinks: [
    { label: '平台规则', href: '#' },
    { label: '诚信声明', href: '#' },
    { label: '法律声明', href: '#' },
  ],
}

/** 样式主题弹窗 */
export const THEME_PANEL = {
  trigger: '样式主题',
  title: '样式主题',
  subtitle: '五套设计风格统一切换，也可以只微调个别样式。选择会保存在本机。',
  presetTab: '整体风格',
  customTab: '单项修改',
  currentBadge: '使用中',
  customizedBadge: '已微调',
  resetField: '还原此项',
  resetCustom: '还原全部微调',
  resetAll: '恢复默认',
  customizedNote: (count) => `已微调 ${count} 项`,
  previewHint: '色板预览',
  close: '关闭',
}
