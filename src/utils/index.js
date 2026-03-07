/**
 * 动画工具函数
 */

export const animationUtils = {
  // 创建交错延迟的动画
  staggerDelay: (index, baseDelay = 0.1) => {
    return `${index * baseDelay}s`;
  },

  // 创建随机延迟
  randomDelay: (min = 0, max = 1) => {
    return `${Math.random() * (max - min) + min}s`;
  },

  // 获取动画类名
  getAnimationClass: (type = 'fadeInUp', index = 0, stagger = true) => {
    const classes = ['animate-in'];
    classes.push(`animate-${type}`);
    if (stagger) {
      classes.push(`stagger-${index}`);
    }
    return classes.join(' ');
  },
};

/**
 * 样式工具函数
 */
export const styleUtils = {
  // 生成渐变背景
  getGradient: (colorStart = '#8A6DFF', colorEnd = '#6C5CE7', angle = 135) => {
    return `linear-gradient(${angle}deg, ${colorStart} 0%, ${colorEnd} 100%)`;
  },

  // 获取阴影
  getShadow: (intensity = 'md') => {
    const shadows = {
      sm: '0 2px 8px rgba(0, 0, 0, 0.08)',
      md: '0 4px 16px rgba(0, 0, 0, 0.12)',
      lg: '0 8px 24px rgba(0, 0, 0, 0.15)',
      xl: '0 12px 32px rgba(0, 0, 0, 0.2)',
      glass: '0 8px 32px rgba(31, 38, 135, 0.17)',
    };
    return shadows[intensity] || shadows.md;
  },

  // 生成过渡样式
  getTransition: (properties = 'all', duration = 0.3, timing = 'ease-in-out') => {
    if (Array.isArray(properties)) {
      return properties
        .map((prop) => `${prop} ${duration}s ${timing}`)
        .join(', ');
    }
    return `${properties} ${duration}s ${timing}`;
  },
};

/**
 * 响应式工具函数
 */
export const responsiveUtils = {
  // 获取列数
  getColumns: (windowWidth) => {
    if (windowWidth >= 1200) return 4;
    if (windowWidth >= 992) return 3;
    if (windowWidth >= 768) return 2;
    return 1;
  },

  // 检查是否是移动端
  isMobile: () => {
    return window.innerWidth < 768;
  },

  // 检查是否是平板
  isTablet: () => {
    return window.innerWidth >= 768 && window.innerWidth < 1200;
  },

  // 检查是否是桌面端
  isDesktop: () => {
    return window.innerWidth >= 1200;
  },
};

/**
 * DOM工具函数
 */
export const domUtils = {
  // 平滑滚动
  smoothScroll: (target) => {
    if (typeof target === 'string') {
      const element = document.querySelector(target);
      element?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  },

  // 检查元素是否在视口中
  isInViewport: (element) => {
    const rect = element.getBoundingClientRect();
    return (
      rect.top >= 0 &&
      rect.left >= 0 &&
      rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
      rect.right <= (window.innerWidth || document.documentElement.clientWidth)
    );
  },

  // 获取滚动百分比
  getScrollPercent: () => {
    const scrollTop = window.scrollY;
    const docHeight = document.documentElement.scrollHeight - window.innerHeight;
    return docHeight === 0 ? 0 : (scrollTop / docHeight) * 100;
  },
};

/**
 * 格式化工具函数
 */
export const formatUtils = {
  // 格式化价格
  formatPrice: (price) => {
    return `¥${price.toFixed(2)}`;
  },

  // 格式化评分
  formatRating: (rating) => {
    return rating.toFixed(1);
  },

  // 格式化评论数
  formatReviewCount: (count) => {
    if (count >= 10000) {
      return `${(count / 10000).toFixed(1)}万`;
    }
    if (count >= 1000) {
      return `${(count / 1000).toFixed(1)}k`;
    }
    return count.toString();
  },
};

/**
 * 动画应用工具
 */
export const applyAnimationStyle = (element, animation, duration = 0.4) => {
  element.style.animation = `${animation} ${duration}s ease-in-out forwards`;
};

/**
 * 生成随机ID
 */
export const generateId = () => {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

/**
 * 防抖函数
 */
export const debounce = (func, wait) => {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

/**
 * 节流函数
 */
export const throttle = (func, limit) => {
  let inThrottle;
  return function (...args) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
};
