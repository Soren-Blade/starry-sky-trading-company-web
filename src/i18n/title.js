import { getLocale, translate } from './index.js'

/**
 * 路由标题
 *
 * 路由的 `meta.title` 是中文兜底（形如「购物车 - 星辰商行」）；英文标题按
 * 路由 `name` 查 `titles.<name>`，再补上品牌后缀。用 name 而不是中文原文
 * 做 key，改中文标题时不会把英文词条弄丢。
 */
export function routeTitle(route) {
  const fallback = route?.meta?.title || ''
  const key = route?.meta?.titleKey || (route?.name ? `titles.${String(route.name)}` : '')
  const pageTitle = key ? translate(key, fallback) : fallback
  if (!pageTitle) return ''
  if (getLocale() === 'en-US' && !pageTitle.includes('Starry Sky')) {
    return `${pageTitle} · Starry Sky`
  }
  return pageTitle
}

export function applyRouteTitle(route) {
  if (typeof document === 'undefined') return
  const title = routeTitle(route)
  if (title) document.title = title
}
