import { defineStore } from 'pinia'
import {
  CUSTOM_FIELDS,
  DEFAULT_CUSTOM,
  DEFAULT_THEME_ID,
  THEMES,
  getTheme,
} from '@/theme/presets.js'
import { composeTokens } from '@/theme/compose.js'

/** 主题偏好的存储键（与工具收藏等本地偏好同级，互不干扰） */
export const THEME_STORAGE_KEY = 'SSTC_THEME_PREF'

/** 读本地偏好：隐私模式 / 脏数据都不应让首屏崩掉 */
function readPreference() {
  if (typeof localStorage === 'undefined') return null
  try {
    const raw = localStorage.getItem(THEME_STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object') return null
    return parsed
  } catch {
    return null
  }
}

function writePreference(payload) {
  if (typeof localStorage === 'undefined') return
  try {
    localStorage.setItem(THEME_STORAGE_KEY, JSON.stringify(payload))
  } catch {
    /* 隐私模式下不可写，忽略：主题仅在本次会话内生效 */
  }
}

/**
 * 设计风格主题
 *
 * 职责边界：
 *   - 取值来源只有 `theme/presets.js`（不在这里写任何设计数值）；
 *   - 合成逻辑在 `theme/compose.js`（纯函数，可单测）；
 *   - 这里只做三件事 —— 记住用户选择、把令牌写到 `<html>`、持久化。
 */
export const useThemeStore = defineStore('theme', {
  state: () => ({
    /** 当前风格 id */
    themeId: DEFAULT_THEME_ID,
    /** 单项自定义值 */
    custom: { ...DEFAULT_CUSTOM },
    /** init() 是否已执行（避免重复写 DOM） */
    initialized: false,
    /** 弹窗开关放在 store 里，导航栏按钮与弹窗跨组件共享同一状态 */
    panelOpen: false,
  }),

  getters: {
    /** 当前主题的元数据（含中文名、色板、货币前缀） */
    theme: (state) => getTheme(state.themeId),

    /** 全部可选风格，供弹窗渲染 */
    themeList: () => THEMES,

    /** 明暗，用于同步 color-scheme（原生表单控件/滚动条） */
    scheme: (state) => getTheme(state.themeId).scheme,

    /** 价格货币前缀：technical-monochrome 用 "$"，其余用 "¥" */
    pricePrefix: (state) => getTheme(state.themeId).price.prefix,

    priceDecimals: (state) => getTheme(state.themeId).price.decimals,

    /** 合成后的完整令牌表 */
    tokens: (state) => composeTokens(state.themeId, state.custom),

    /** 有哪些单项被改过（用于弹窗上的「已改 N 项」提示与逐项还原） */
    customizedKeys: (state) =>
      CUSTOM_FIELDS.filter((field) => state.custom[field.key] !== DEFAULT_CUSTOM[field.key]).map(
        (field) => field.key
      ),

    isCustomized() {
      return this.customizedKeys.length > 0
    },
  },

  actions: {
    /** 从本地偏好恢复；在 app.mount 之前调用，保证首屏就是用户选的风格 */
    init() {
      const saved = readPreference()
      if (saved) {
        if (typeof saved.themeId === 'string') this.themeId = saved.themeId
        if (saved.custom && typeof saved.custom === 'object') {
          // 只接受已知字段，避免历史版本残留的键污染 state
          for (const field of CUSTOM_FIELDS) {
            if (field.key in saved.custom) this.custom[field.key] = saved.custom[field.key]
          }
        }
      }
      this.apply()
      this.initialized = true
    },

    /** 统一切换风格：保留单项自定义，符合「先选风格再微调」的使用顺序 */
    setTheme(themeId) {
      this.themeId = getTheme(themeId).id
      this.apply()
      this.persist()
    },

    /** 修改单项（字号、强调色、背景图……） */
    setCustom(key, value) {
      if (!(key in DEFAULT_CUSTOM)) return
      this.custom[key] = value
      this.apply()
      this.persist()
    },

    /** 还原单项 */
    resetCustomField(key) {
      if (!(key in DEFAULT_CUSTOM)) return
      this.custom[key] = DEFAULT_CUSTOM[key]
      this.apply()
      this.persist()
    },

    /** 还原全部单项（保留当前风格） */
    resetCustom() {
      this.custom = { ...DEFAULT_CUSTOM }
      this.apply()
      this.persist()
    },

    /** 恢复默认：默认风格 + 清空单项 */
    resetAll() {
      this.themeId = DEFAULT_THEME_ID
      this.custom = { ...DEFAULT_CUSTOM }
      this.apply()
      this.persist()
    },

    openPanel() {
      this.panelOpen = true
    },

    closePanel() {
      this.panelOpen = false
    },

    togglePanel() {
      this.panelOpen = !this.panelOpen
    },

    /**
     * 把合成后的令牌写到 `<html>` 的行内样式。
     *
     * 为什么走行内样式而不是切 class：
     *   单项自定义的取值来自用户输入（任意强调色、任意字号），无法预先穷举成 CSS 类；
     *   行内自定义属性的优先级也天然高于 variables.css 的 `:root` 兜底值。
     */
    apply() {
      // SSR / 单测环境没有可写样式的 document：静默跳过，不改变任何状态。
      // 能力检测（而不是 `typeof document === 'undefined'`）是必要的：
      // 测试桩里的 documentElement 存在但没有 style.setProperty。
      if (typeof document === 'undefined') return
      const root = document.documentElement
      if (!root || !root.style || typeof root.style.setProperty !== 'function') return

      const tokens = this.tokens

      for (const [name, value] of Object.entries(tokens)) {
        root.style.setProperty(name, value)
      }

      // 供主题相关的选择器（如背景网格动画）与调试使用
      if (root.dataset) root.dataset.theme = this.themeId
      root.style.colorScheme = this.scheme
    },

    persist() {
      writePreference({ themeId: this.themeId, custom: { ...this.custom } })
    },
  },
})
