/**
 * 让集中式文案常量跟随语言切换
 *
 * `constants/content.js` 里的对象是整站文案的唯一出处，页面直接读字段
 * （`HERO.title`、`PAGES.cart.title`…）。如果为了 i18n 把 96 个页面全改成
 * `$t('hero.title')`，改动面大、还容易漏。
 *
 * 这里把常量包成「惰性对象」：
 * - 字符串字段在**读取时**按 `root.key.subkey` 去 i18n 词条里查；
 * - 查不到就回退中文原文（缺翻译时页面仍然可读，不会露出 key）；
 * - 对象/数组结构只构建一次，字符串 getter 每次读取都会重新查词条，
 *   因此切换语言后模板重新渲染即可生效，不需要刷新页面。
 *
 * 注意：不要在模块顶层做 `{ ...HERO }` 这种展开 —— 那会在构建时把 getter
 * 求值成中文并定死。需要拷贝时请在函数/模板里展开。
 */

import { translate } from './index.js'

const wrappedCache = new WeakMap()

function wrapObject(raw, path) {
  const cached = wrappedCache.get(raw)
  if (cached && cached.path === path) return cached.value

  const out = Array.isArray(raw) ? [] : {}

  for (const key of Object.keys(raw)) {
    const child = raw[key]
    const childPath = `${path}.${key}`

    Object.defineProperty(out, key, {
      enumerable: true,
      configurable: true,
      get() {
        if (typeof child === 'string') return translate(childPath, child)
        if (child && typeof child === 'object') return wrapObject(child, childPath)
        // 数字、布尔、函数（带参数的文案函数由 content.js 自己处理 locale）
        return child
      },
    })
  }

  wrappedCache.set(raw, { path, value: out })
  return out
}

/**
 * @param {string} rootKey 词条根命名空间，如 `hero` / `pages`
 * @param {object|Array} raw 原始常量
 */
export function localizeNamespace(rootKey, raw) {
  if (!raw || typeof raw !== 'object') return raw
  return wrapObject(raw, rootKey)
}
