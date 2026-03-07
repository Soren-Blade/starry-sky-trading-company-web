import { onMounted, onUnmounted } from 'vue';

/**
 * 禁用/启用页面滚动的 Hook
 * 当模态框打开时禁用滚动，关闭时恢复滚动
 * 
 * @param {boolean} disabled - 是否禁用滚动 (默认 false)
 * 
 * @example
 * const { disableScroll, enableScroll } = useBodyScroll();
 * 
 * // 禁用滚动
 * disableScroll();
 * 
 * // 恢复滚动
 * enableScroll();
 */
export const useBodyScroll = () => {
  const disableScroll = () => {
    // 获取当前滚动条宽度
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    
    // 禁用滚动
    document.body.style.overflow = 'hidden';
    document.body.style.paddingRight = `${scrollbarWidth}px`;
    
    // 禁用触摸滚动（移动设备）
    document.body.style.touchAction = 'none';
  };

  const enableScroll = () => {
    // 恢复滚动
    document.body.style.overflow = '';
    document.body.style.paddingRight = '';
    document.body.style.touchAction = '';
  };

  const toggle = (shouldDisable) => {
    if (shouldDisable) {
      disableScroll();
    } else {
      enableScroll();
    }
  };

  // 组件卸载时自动恢复滚动
  onUnmounted(() => {
    enableScroll();
  });

  return {
    disableScroll,
    enableScroll,
    toggle,
  };
};
