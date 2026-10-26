import { defineStore } from 'pinia'

/**
 * 明暗主题
 * ============================================================================
 *
 * 本站的视觉语言来自 EC Design System（`src/assets/ec/`），它只认一件事：
 *
 *     <html data-theme="light|dark" data-theme-mode="light|dark|auto">
 *
 * 所有颜色都是 `--ec-*` 语义令牌，暗色由 `tokens/theme-dark.css` 在同一批
 * 令牌上覆写 —— **组件层零改动**。因此这个 store 不需要合成任何取值，
 * 也不该知道任何色值：它只负责「记住用户选的三档、把属性写到 <html> 上」。
 *
 * 与旧实现（五套风格矩阵 + 单项微调）的差别：
 *   旧实现把几百个令牌逐条写进 `<html>` 的行内样式，`theme/presets.js` 有 1732 行。
 *   EC 用属性选择器覆写，行内样式反而会盖掉暗色覆写 —— 所以这里**必须**写属性，
 *   不能写行内样式。
 */

/** 主题偏好的存储键。与 EC 文档站一致，方便两处共用同一份偏好。 */
export const THEME_STORAGE_KEY = 'ec-theme'

/** 旧版五套风格系统的存储键：初始化时清掉，避免遗留数据把用户锁在旧状态 */
const LEGACY_STORAGE_KEY = 'SSTC_THEME_PREF'

/** 三档：浅色 / 深色 / 跟随系统（顺序即 EC theme-switch 的按钮顺序） */
export const THEME_MODES = ['light', 'dark', 'auto']

const isMode = (value) => THEME_MODES.includes(value)

/** 读本地偏好：隐私模式 / 脏数据都不应让首屏崩掉 */
function readMode() {
  if (typeof localStorage === 'undefined') return null
  try {
    const raw = localStorage.getItem(THEME_STORAGE_KEY)
    return isMode(raw) ? raw : null
  } catch {
    return null
  }
}

function writeMode(mode) {
  if (typeof localStorage === 'undefined') return
  try {
    localStorage.setItem(THEME_STORAGE_KEY, mode)
    localStorage.removeItem(LEGACY_STORAGE_KEY)
  } catch {
    /* 隐私模式下不可写，忽略：主题仅在本次会话内生效 */
  }
}

/** 系统是否偏好深色（能力检测：SSR / 单测环境没有 matchMedia） */
function systemPrefersDark() {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false
  return window.matchMedia('(prefers-color-scheme: dark)').matches
}

export const useThemeStore = defineStore('theme', {
  state: () => ({
    /** 用户选择的三档之一 */
    mode: 'light',
    /** init() 是否已执行（避免重复写 DOM） */
    initialized: false,
  }),

  getters: {
    /** 当前是否深色（auto 时看系统） */
    isDark: (state) => (state.mode === 'auto' ? systemPrefersDark() : state.mode === 'dark'),

    /** 实际生效的明暗，写到 data-theme 上的值 */
    theme: (state) => {
      if (state.mode === 'auto') return systemPrefersDark() ? 'dark' : 'light'
      return state.mode
    },

    /** 原生控件（滚动条 / 表单）的配色方案 */
    scheme() {
      return this.theme
    },

    /**
     * 货币前缀与小数位。
     *
     * 旧版由五套主题各自决定（mono 用 `$`、bento/neo 无小数），EC 只保留
     * 一套人民币口径：¥ + 两位小数。价格的三段式排版由 `.ec-price` 承担，
     * 数据层不再需要「按主题切换货币」这层抽象。
     */
    pricePrefix: () => '¥',
    priceDecimals: () => 2,
  },

  actions: {
    /**
     * 从本地偏好恢复并写入 DOM。
     *
     * 必须在 app.mount() 之前调用：主题属性晚一步写入，用户就会先看到
     * 浅色再闪一下切深色（FOUC）。index.html 里还有一段同步脚本兜底，
     * 那段负责「JS 包下载完之前」的那段时间。
     */
    init() {
      const saved = readMode()
      if (saved) this.mode = saved
      this.apply()
      this.initialized = true
      this.watchSystem()
    },

    /** 切换三档（theme-switch 的唯一入口） */
    setMode(mode) {
      this.mode = isMode(mode) ? mode : 'light'
      this.apply()
      writeMode(this.mode)
    },

    /** 把属性写到 <html>：EC 的暗色覆写靠属性选择器，不能用行内样式 */
    apply() {
      if (typeof document === 'undefined') return
      const root = document.documentElement
      if (!root || typeof root.setAttribute !== 'function') return

      root.setAttribute('data-theme', this.theme)
      root.setAttribute('data-theme-mode', this.mode)
      // color-scheme 让原生滚动条与表单控件跟着换配色
      if (root.style) root.style.colorScheme = this.scheme
    },

    /**
     * auto 档跟随系统：只监听一次，且只在 auto 时生效。
     * 监听器挂在 window 上而不是 store 里存句柄 —— 这个 store 是单例，
     * 重复 init() 的代价只是多一个监听，比维护句柄的生命周期更简单。
     */
    watchSystem() {
      if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return
      if (this._systemWatcher) return
      this._systemWatcher = true
      window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
        if (this.mode === 'auto') this.apply()
      })
    },
  },
})
