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

/**
 * 切换瞬间挂在 `<html>` 上的瞬时类。
 *
 * global.css 用它给常用容器开一组「只过渡颜色」的 transition：
 * 类在的时候颜色是插值过去的，类一摘就恢复平时的硬切 —— 常驻过渡会把
 * hover、展开、滚动时的一切颜色变化都拖成动画 —— 也就是「所有属性一起过渡」
 * 的老问题，也是主题切换「有的地方快、有的地方慢」的来源。
 */
export const THEME_SWITCH_CLASS = 'is-theme-switching'

/**
 * 瞬时类的存活时长。
 *
 * 必须略长于 CSS 里的过渡时长（global.css 用 200ms）：类先撤、过渡还没跑完，
 * 最后一段会由元素自己的 transition 接管，观感就是「快到头了又慢半拍」。
 * 260ms 留 60ms 余量，人眼察觉不到多出来的这一小段。
 */
export const THEME_SWITCH_MS = 260

/**
 * 上一次切换的收尾定时器。
 *
 * 放模块作用域而不是 state：state 里的值会被 Vue 变成响应式代理，
 * Node 环境下 `setTimeout` 返回的是 Timeout 对象，包成 Proxy 之后再
 * `clearTimeout` 就不一定认得它了。定时器本来也不需要参与渲染。
 */
let themeSwitchTimer = null

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
      // 先开过渡、再写属性：两条在同一帧内完成，浏览器会用上一帧的
      // 旧颜色作为起点插值，于是切换是「渐变」而不是「啪」。
      this.startColorTransition()
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
     * 主题切换的颜色过渡：给 `<html>` 加瞬时类，约 260ms 后摘掉。
     *
     * 为什么不是常驻 transition：颜色过渡本该只发生在「换主题」这一瞬间。
     * 常驻的话，每次 hover、每次滚动收缩、每个展开动画都会被顺手拖慢，
     * 用户看到的反而是「有的元素慢半拍」。
     *
     * 快速连点：先清掉上一个定时器再重挂。否则上一次的收尾会在新一次
     * 切换进行到一半时把类摘走，后半程又变回硬切。
     */
    startColorTransition() {
      if (themeSwitchTimer) {
        clearTimeout(themeSwitchTimer)
        themeSwitchTimer = null
      }

      if (typeof document === 'undefined') return
      const root = document.documentElement
      if (!root || !root.classList) return

      // 系统开了「减弱动态效果」就干脆不插值：颜色一步到位，别制造晕眩
      if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
      }

      root.classList.add(THEME_SWITCH_CLASS)
      themeSwitchTimer = setTimeout(() => {
        root.classList.remove(THEME_SWITCH_CLASS)
        themeSwitchTimer = null
      }, THEME_SWITCH_MS)
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
        if (this.mode !== 'auto') return
        // 系统换色也是一次主题切换，同样走渐变（否则 auto 档是唯一硬切的路径）
        this.startColorTransition()
        this.apply()
      })
    },
  },
})
