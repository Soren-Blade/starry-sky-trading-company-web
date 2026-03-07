/**
 * 常量定义
 */

// 色彩常量
export const COLORS = {
  PRIMARY: '#8A6DFF',
  PRIMARY_DARK: '#6C5CE7',
  SECONDARY: '#FD79A8',
  ACCENT: '#FFEAA7',
  LIGHT: '#F8F9FA',
  DARK: '#2D3436',
};

// 导航菜单
export const NAV_MENU = [
  {
    id: 1,
    label: '首页',
    path: '/',
  },
  {
    id: 2,
    label: '商品分类',
    path: '/categories',
  },
  {
    id: 3,
    label: '热门推荐',
    path: '/hot',
  },
  {
    id: 4,
    label: '工具分享',
    path: '/tool',
  },
  {
    id: 5,
    label: '关于我们',
    path: '/about',
  },
];

// 响应式断点
export const BREAKPOINTS = {
  xs: 0,
  sm: 576,
  md: 768,
  lg: 992,
  xl: 1200,
  xxl: 1400,
};

// 动画时长
export const ANIMATION_DURATIONS = {
  FAST: 0.2,
  BASE: 0.3,
  SLOW: 0.4,
  SLOWER: 0.6,
};

// 标签颜色映射
export const TAG_COLORS = {
  热销: '#FF6B6B',
  新品: '#4ECDC4',
  折扣: '#FFE66D',
  推荐: '#95E1D3',
};

// 标签背景映射
export const TAG_BG_COLORS = {
  热销: '#FFE5E5',
  新品: '#E5F9F7',
  折扣: '#FFFBE5',
  推荐: '#E5F7F5',
};