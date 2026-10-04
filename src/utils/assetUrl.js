/**
 * 后端静态资源的地址解析
 *
 * 后端把用户上传的文件（目前只有头像）放在自己的 `/uploads/...` 下，
 * 存在 `users.avatar_url` 里的也是这个**相对路径**。
 *
 * 为什么存相对路径而不是完整 URL：
 *   - 域名会变（本地 8080 → Vercel 域名 → 将来自有域名），存绝对地址意味着
 *     每次换域名都要刷一遍历史数据；
 *   - 开发环境走 Vite 代理，本来就是同源相对路径。
 *
 * 但相对路径不能直接丢给 `<img src>`：
 *   - dev 下 `VITE_API_BASE_URL` 为空，`/uploads/x.png` 由 Vite 代理转发到后端 ✓
 *   - 生产下前端在 web 域名、后端在 server 域名，`/uploads/x.png` 会打到 **web**
 *     域名上 → 404。必须补上后端的绝对基地址。
 *
 * 因此统一在这里解析，调用方（store getter、组件）不关心这个区别。
 */

/** 已经自带协议或属于内联数据的一律原样返回 */
const ABSOLUTE_OR_INLINE = /^(?:[a-z][a-z0-9+.-]*:|\/\/)/i;

/**
 * 把后端返回的资源路径解析成浏览器可以直接加载的地址。
 *
 * @param {*} url 后端返回的值（相对路径 / 绝对 URL / data URL / 空值）
 * @returns {string} 可直接用于 src 的地址；输入为空时返回空串
 */
export function resolveAssetUrl(url) {
  if (typeof url !== 'string' || url.trim() === '') return ''

  const value = url.trim()

  // http(s):、data:、blob:、//cdn... 都已经可用，不需要也不应该改写
  if (ABSOLUTE_OR_INLINE.test(value)) return value

  // 只处理以单个 / 开头的站内相对路径；其余（相对片段）交给浏览器
  if (!value.startsWith('/')) return value

  const base = import.meta.env.VITE_API_BASE_URL || ''
  if (!base) return value // dev：走 Vite 代理，保持同源相对路径

  return `${String(base).replace(/\/+$/, '')}${value}`
}

export default resolveAssetUrl
