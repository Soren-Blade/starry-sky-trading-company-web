/**
 * 国际化（i18n）唯一入口
 *
 * 方案：vue-i18n 11 + Composition API。
 *
 * 为什么要做一层 `translate()`：站点文案集中在 `constants/content.js`，
 * 96 个页面都在直接读常量对象。把常量包成「按当前 locale 取值」的代理，
 * 就能在不改模板的前提下让整站跟随语言切换（见 `i18n/content.js`）。
 * 代理拿不到英文词条时回退到中文原文，绝不显示 key。
 *
 * locale 规则：
 * 1. `?lang=` 优先（方便分享与调试）；
 * 2. 其次读 localStorage（用户上次选择）；
 * 3. 再看浏览器语言；
 * 4. 最后 zh-CN。
 */
import { createI18n } from 'vue-i18n'
import zhCN from './locales/zh-CN.js'
import enUS from './locales/en-US/index.js'

export const SUPPORTED_LOCALES = [
  { code: 'zh-CN', label: '简体中文', shortLabel: '中文', htmlLang: 'zh-Hans-CN' },
  { code: 'en-US', label: 'English', shortLabel: 'EN', htmlLang: 'en-US' },
]

const STORAGE_KEY = 'sstc.locale'
const DEFAULT_LOCALE = 'zh-CN'

/** 把 `en` / `en_US` / `zh-Hans` 之类的输入收敛到我们支持的两种 locale */
export function normalizeLocale(input) {
  if (!input || typeof input !== 'string') return null
  const value = input.trim().toLowerCase().replace(/_/g, '-')
  if (!value) return null
  if (value === 'zh' || value.startsWith('zh-')) return 'zh-CN'
  if (value === 'en' || value.startsWith('en-')) return 'en-US'
  return null
}

function readStoredLocale() {
  try {
    if (typeof localStorage === 'undefined') return null
    return normalizeLocale(localStorage.getItem(STORAGE_KEY))
  } catch {
    return null
  }
}

function readQueryLocale() {
  try {
    if (typeof window === 'undefined' || !window.location) return null
    const params = new URLSearchParams(window.location.search)
    return normalizeLocale(params.get('lang'))
  } catch {
    return null
  }
}

function readBrowserLocale() {
  try {
    if (typeof navigator === 'undefined') return null
    const candidates = Array.isArray(navigator.languages) && navigator.languages.length
      ? navigator.languages
      : [navigator.language]
    for (const candidate of candidates) {
      const normalized = normalizeLocale(candidate)
      if (normalized) return normalized
    }
    return null
  } catch {
    return null
  }
}

/** 首次加载时的语言：query > 本地存储 > 浏览器 > 中文 */
export function detectLocale() {
  return readQueryLocale() || readStoredLocale() || readBrowserLocale() || DEFAULT_LOCALE
}

export const i18n = createI18n({
  legacy: false,
  globalInjection: true,
  locale: detectLocale(),
  fallbackLocale: DEFAULT_LOCALE,
  messages: {
    'zh-CN': zhCN,
    'en-US': enUS,
  },
  // 缺词条是预期路径（常量代理会回退中文），不要把开发控制台刷满
  missingWarn: false,
  fallbackWarn: false,
})

export function getLocale() {
  return i18n.global.locale.value
}

export function isEnglish() {
  return getLocale() === 'en-US'
}

/** 同步 `<html lang>`（WCAG 3.1.1；语言标记必须在 html 上，而不是 body） */
export function syncDocumentLang() {
  if (typeof document === 'undefined') return
  const meta = SUPPORTED_LOCALES.find((item) => item.code === getLocale())
  document.documentElement.lang = meta ? meta.htmlLang : 'zh-Hans-CN'
  document.documentElement.dir = 'ltr'
}

/**
 * 切换语言
 *
 * 不刷新页面：常量代理、`$t()` 与 `<html lang>` 都会跟着变。
 * 另外派发事件，让路由标题、请求头等非渲染逻辑有机会同步。
 */
export function setLocale(input, { persist = true } = {}) {
  const next = normalizeLocale(input)
  if (!next || next === getLocale()) {
    syncDocumentLang()
    return getLocale()
  }

  i18n.global.locale.value = next
  if (persist) {
    try {
      localStorage.setItem(STORAGE_KEY, next)
    } catch {
      // 隐私模式 / 存储被禁用时忽略：本次会话内仍然生效
    }
  }
  syncDocumentLang()
  try {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('sstc:locale-change', { detail: { locale: next } }))
    }
  } catch {
    // 自定义事件失败不影响语言切换本身
  }
  return next
}

/**
 * 带兜底的翻译
 *
 * @param {string} key 词条 key
 * @param {string} fallback 中文原文（缺词条时原样返回）
 * @param {Record<string, unknown>} [params] 插值参数
 */
export function translate(key, fallback, params) {
  const { t, te } = i18n.global
  let exists = false
  try {
    exists = te(key)
  } catch {
    exists = false
  }
  if (!exists) return fallback
  try {
    return params ? t(key, params) : t(key)
  } catch {
    return fallback
  }
}

/** 当前 locale 的 BCP 47 标签，给 Intl 用 */
export function intlLocale() {
  return getLocale() === 'en-US' ? 'en-US' : 'zh-CN'
}

export function formatNumber(value, options) {
  try {
    return new Intl.NumberFormat(intlLocale(), options).format(value)
  } catch {
    return String(value)
  }
}

export function formatDate(value, options = { dateStyle: 'medium' }) {
  try {
    const date = value instanceof Date ? value : new Date(value)
    if (Number.isNaN(date.getTime())) return String(value ?? '')
    return new Intl.DateTimeFormat(intlLocale(), options).format(date)
  } catch {
    return String(value ?? '')
  }
}

// 模块加载即同步一次，避免首屏 <html lang> 与 locale 不一致
syncDocumentLang()

export default i18n
