/**
 * 极短的「合并同一次请求」缓存（前端）。
 *
 * 为什么需要（2026-10-28，2.4.0）：
 *   实测一次页面加载会对同一个接口发 3–10 次相同 GET —— 导航栏、页面组件、
 *   store 初始化各自在 mount 时调一次，而它们几乎同时发生。服务端每次都要
 *   走一遍远程数据库（单次往返约 220 ms），于是「一次页面加载 = 十次往返」，
 *   这才是「页面跳转很慢」的主因之一。
 *
 * 两件事一起做：
 *   1. **单飞**：同一 key 的请求正在飞，后来者直接复用同一个 Promise（不重复发）；
 *   2. **短 TTL**：成功后 8 秒内的同 key 调用直接返回上次结果，不再发请求。
 *
 * 边界：
 *   · 只用于**读**接口；写操作完成后调用 `invalidate(key)` 或 `clear()`；
 *   · TTL 刻意很短（默认 8 s），避免用户点了收藏却看到 10 秒前的列表；
 *   · 失败不进缓存（一次抖动不该被记住 8 秒）；
 *   · `now` 可注入，测试不依赖真实等待。
 */

/**
 * @param {{ ttlMs?: number, now?: () => number }} [options]
 */
export function createShortCache(options = {}) {
  const ttlMs = Number.isFinite(options.ttlMs) ? Math.max(0, options.ttlMs) : 8000
  const now = typeof options.now === 'function' ? options.now : Date.now

  /** @type {Map<string, { at: number, value: any }>} */
  const store = new Map()
  /** @type {Map<string, Promise<any>>} */
  const inflight = new Map()

  /**
   * 走缓存执行一次读请求。
   * @template T
   * @param {string} key
   * @param {() => Promise<T>} loader
   * @returns {Promise<T>}
   */
  function run(key, loader) {
    const hit = store.get(key)
    if (hit && now() - hit.at < ttlMs) {
      return Promise.resolve(hit.value)
    }

    const pending = inflight.get(key)
    if (pending) return pending

    const task = loader()
      .then((value) => {
        store.set(key, { at: now(), value })
        return value
      })
      .finally(() => {
        inflight.delete(key)
      })

    inflight.set(key, task)
    return task
  }

  /** 写操作后失效单个 key（不存在也无妨） */
  function invalidate(key) {
    store.delete(key)
  }

  /** 登出、切换账号、批量写操作后整体清空 */
  function clear() {
    store.clear()
    inflight.clear()
  }

  return { run, invalidate, clear }
}

/** 全局共享一个实例：所有 store 的读缓存都放这里，方便整体清空 */
export const shortCache = createShortCache()
