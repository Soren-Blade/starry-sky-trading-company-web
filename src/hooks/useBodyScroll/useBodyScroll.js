import { onUnmounted } from 'vue';

/**
 * 禁用/启用页面滚动的 Hook
 * 当模态框打开时禁用滚动，关闭时恢复滚动
 *
 * ## 为什么需要引用计数
 *
 * 滚动锁定是**全局状态**（写在 document.body 上），但可能同时有多个持有者：
 * 例如登录弹窗打开着、又弹出一个抽屉。早期实现没有计数，
 * 任何一个持有者调用 enableScroll() 都会直接解锁 ——
 * 于是「关掉其中一个，页面在另一个还开着的时候就能滚动了」。
 *
 * 现在只有**最后一个**持有者释放时才真正解锁。
 *
 * ## 为什么保存原始内联样式
 *
 * 早期实现解锁时把相关属性一律置为 ''，这会抹掉 body 上原本存在的内联样式
 * （例如别处设置过的 paddingRight）。现在记下首次加锁前的值并原样还原。
 *
 * ## 嵌套/重复加锁
 *
 * 同一个 hook 实例重复调用 disableScroll() 只算一次（内部记 released 标记），
 * 避免 onUnmounted 时多减一次计数。
 */

// ── 模块级共享状态 ──────────────────────────────────────────────
/** 当前加锁的次数 */
let lockCount = 0;
/** 首次加锁前 body 上的原始内联样式（null 表示尚未记录） */
let originalStyles = null;

/** 需要临时覆盖的样式属性 */
const LOCKED_ATTRIBUTES = ['overflow', 'paddingRight', 'touchAction'];

/**
 * 计算滚动条宽度（桌面端通常为 15px 左右，移动端为 0）
 * @returns {number}
 */
function getScrollbarWidth() {
  if (typeof window === 'undefined' || typeof document === 'undefined') return 0;
  const doc = document.documentElement;
  if (!doc) return 0;
  const width = (window.innerWidth || 0) - (doc.clientWidth || 0);
  return Number.isFinite(width) && width > 0 ? width : 0;
}

/** 是否具备可用的 DOM 环境 */
function canTouchBody() {
  return typeof document !== 'undefined' && document.body;
}

/** 真正加锁（仅在计数从 0 变 1 时调用） */
function applyLock() {
  if (!canTouchBody()) return;

  // 记录原始内联样式，便于释放时精确还原
  if (originalStyles === null) {
    originalStyles = {};
    for (const attr of LOCKED_ATTRIBUTES) {
      originalStyles[attr] = document.body.style[attr] || '';
    }
  }

  const scrollbarWidth = getScrollbarWidth();
  document.body.style.overflow = 'hidden';
  document.body.style.touchAction = 'none';
  // 补偿滚动条消失带来的宽度变化，避免页面横向跳动
  if (scrollbarWidth > 0) {
    document.body.style.paddingRight = `${scrollbarWidth}px`;
  }
}

/** 真正解锁（仅在计数归 0 时调用） */
function releaseLock() {
  if (!canTouchBody()) return;

  const restore = originalStyles || {};
  for (const attr of LOCKED_ATTRIBUTES) {
    document.body.style[attr] = restore[attr] || '';
  }
  originalStyles = null;
}

/** 仅用于测试：把共享状态复位 */
export function __resetBodyScrollForTests() {
  lockCount = 0;
  originalStyles = null;
}

/** 仅用于测试：读取共享状态 */
export function __getBodyScrollStateForTests() {
  return { lockCount, hasOriginalStyles: originalStyles !== null };
}

const disableScrollGlobal = () => {
  lockCount += 1;
  if (lockCount === 1) applyLock();
};

const enableScrollGlobal = () => {
  if (lockCount === 0) return; // 未加锁时不得解锁（也不该抹掉别人的样式）
  lockCount -= 1;
  if (lockCount === 0) releaseLock();
};

/**
 * @param {object} [options]
 * @param {(fn: Function) => void} [options.onUnmounted] 生命周期注册函数。
 *   默认使用 Vue 的 onUnmounted；**仅在测试中注入**，用来在不 mount 组件的前提下
 *   验证「卸载时自动释放」这条路径（在 Node 里 mount 组件需要 jsdom）。
 * @returns {{ disableScroll: () => void, enableScroll: () => void, toggle: (shouldDisable: boolean) => void }}
 */
export const useBodyScroll = (options = {}) => {
  const registerUnmounted = options.onUnmounted || onUnmounted;

  // 该实例是否已持有锁，避免重复加锁/重复释放导致计数错乱
  let holding = false;

  const disableScroll = () => {
    if (holding) return;
    holding = true;
    disableScrollGlobal();
  };

  const enableScroll = () => {
    if (!holding) return;
    holding = false;
    enableScrollGlobal();
  };

  const toggle = (shouldDisable) => {
    if (shouldDisable) disableScroll();
    else enableScroll();
  };

  // 组件卸载时自动释放（只释放这个实例持有的那一次）
  registerUnmounted(() => {
    enableScroll();
  });

  return {
    disableScroll,
    enableScroll,
    toggle,
  };
};
