/**
 * 测试公共设施
 *
 * 设计目标：**不引入 jsdom、vitest、@vue/test-utils**，只用 Node 内置能力，
 * 让 `npm test` 保持零额外依赖。
 *
 * 解决的两个 Vite 专有特性：
 *   1. `@/` 别名与省略扩展名的导入 → 见 ./loaders/alias.mjs
 *   2. `import.meta.env` → 下方 load 钩子注入一个最小实现
 *
 * 用法：
 *   import { installStorageStub, loadAppModule } from './setup.js'
 *   installStorageStub()                 // 在任何 app 模块被导入前调用
 *   const mod = await loadAppModule('/hooks/useToken/index.js')
 */
import './loaders/alias.mjs'
import { registerHooks } from 'node:module'

/** 测试用环境变量：可被具体用例覆盖 */
const TEST_ENV = {
  MODE: 'test',
  DEV: false,
  PROD: false,
  SSR: false,
  BASE_URL: '/',
  VITE_API_BASE_URL: '',
  VITE_API_TARGET: '',
}

// Vite 会在每个模块上注入 import.meta.env，Node 没有。
// 这里补齐它，让源码无需为「可测试」而改写。
//
// **注入的是一个转发用的 Proxy，而不是 `__SSTC_TEST_ENV__` 本身。**
// 原因是踩过一次的真实陷阱：`import.meta.env = globalThis.__SSTC_TEST_ENV__`
// 只复制了**对象引用**，之后任何把 `globalThis.__SSTC_TEST_ENV__` 换成新对象的
// 代码（`setTestEnv()` 与 `request.test.js` 都这么做过）都会让已经加载的模块
// 继续指向旧对象 —— 于是一部分测试改环境变量生效、另一部分不生效，
// 表现为「单独跑通过、全量跑失败」的顺序依赖。
//
// 转发之后，`import.meta.env.VITE_X` 永远读取 `globalThis.__SSTC_TEST_ENV__`
// 的当前值，两种写法（就地改属性 / 整体替换）都成立。
const ENV_PROXY = `globalThis.__SSTC_TEST_ENV__ ??= ${JSON.stringify(TEST_ENV)};\n` +
  `globalThis.__SSTC_TEST_ENV_PROXY__ ??= new Proxy({}, {\n` +
  `  get: (_, key) => globalThis.__SSTC_TEST_ENV__?.[key],\n` +
  `  has: (_, key) => key in (globalThis.__SSTC_TEST_ENV__ || {}),\n` +
  `  ownKeys: () => Reflect.ownKeys(globalThis.__SSTC_TEST_ENV__ || {}),\n` +
  `  getOwnPropertyDescriptor: (_, key) => ({\n` +
  `    value: globalThis.__SSTC_TEST_ENV__?.[key],\n` +
  `    enumerable: true, configurable: true, writable: false,\n` +
  `  }),\n` +
  `});\n` +
  `import.meta.env = globalThis.__SSTC_TEST_ENV_PROXY__;\n`

registerHooks({
  load(url, context, nextLoad) {
    const result = nextLoad(url, context)
    if (
      result.format === 'module' &&
      typeof result.source !== 'undefined' &&
      url.startsWith('file:') &&
      url.includes('/src/')
    ) {
      const text =
        typeof result.source === 'string' ? result.source : Buffer.from(result.source).toString('utf8')

      // 已经自己声明 import.meta.env 的模块不重复注入
      if (!/import\.meta\.env\s*=/.test(text)) {
        return { ...result, source: `${ENV_PROXY}${text}` }
      }
    }
    return result
  },
})

/**
 * 给某个用例临时改环境变量（如 VITE_API_BASE_URL）。
 *
 * **就地改写**而不是替换整个对象：虽然注入的 Proxy 让两种写法都能生效，
 * 但就地改写能保证「同一个 env 对象」这条不变量，
 * 避免再有人写出依赖对象身份的判断。
 */
export function setTestEnv(patch = {}) {
  const target = globalThis.__SSTC_TEST_ENV__
  if (!target) {
    globalThis.__SSTC_TEST_ENV__ = { ...TEST_ENV, ...patch }
    return
  }

  // 先恢复成默认值再叠加 patch，语义与「替换成 {...TEST_ENV, ...patch}」一致
  for (const key of Object.keys(target)) delete target[key]
  Object.assign(target, TEST_ENV, patch)
}

/** 一个最小的 Storage 实现（Map 支撑） */
class MemoryStorage {
  #map = new Map()

  get length() {
    return this.#map.size
  }

  getItem(key) {
    const value = this.#map.get(String(key))
    return value === undefined ? null : value
  }

  setItem(key, value) {
    this.#map.set(String(key), String(value))
  }

  removeItem(key) {
    this.#map.delete(String(key))
  }

  clear() {
    this.#map.clear()
  }

  key(index) {
    return [...this.#map.keys()][index] ?? null
  }
}

/**
 * 安装 localStorage / sessionStorage 桩，并返回它们便于断言。
 * @param {{ failWrites?: boolean }} [options] failWrites=true 时模拟隐私模式（写入抛错）
 */
export function installStorageStub(options = {}) {
  const { failWrites = false } = options

  const local = new MemoryStorage()
  const session = new MemoryStorage()

  if (failWrites) {
    for (const storage of [local, session]) {
      storage.setItem = () => {
        throw new DOMExceptionLike('写入被拒绝')
      }
      storage.removeItem = () => {
        throw new DOMExceptionLike('写入被拒绝')
      }
    }
  }

  globalThis.localStorage = local
  globalThis.sessionStorage = session

  return { local, session }
}

/** 模拟浏览器在隐私模式下抛出的错误 */
class DOMExceptionLike extends Error {
  constructor(message) {
    super(message)
    this.name = 'QuotaExceededError'
  }
}

/**
 * 安装浏览器全局桩，仅覆盖被测模块真正触及的部分。
 *
 * 需要的是：
 *   1. axios 的浏览器平台探测会读 `window.location.href`
 *   2. 源码里若干 `typeof window !== "undefined"` 分支
 *   3. 直接写 `document.xxx` 的模块（如 useBodyScroll）
 *
 * 因此 `globalThis.document` 与 `globalThis.window.document` 是**同一个对象** ——
 * 早期只挂 `window.document`，导致裸 `document` 引用报 ReferenceError。
 *
 * **这不是 jsdom 替代品。** 曾经为了跑通 ant-design-vue 的 message 而在这里一路补
 * `createElementNS` / `createComment` / `getComputedStyle`…… 那是用桩去追一个 UI 库，
 * 缺口补不完。现在 ant-design-vue 已在解析层被替换为测试替身
 * （见 ./loaders/alias.mjs），这里因此可以保持较小。
 *
 * 若将来确需**渲染组件**，应引入 jsdom，而不是继续往这里加 API
 * （实测仅补 DOM 桩会在 Vue 的 `SVGElement is not defined` 处失败）。
 */
export function installDomStub() {
  if (globalThis.window) return false

  const noop = () => {}

  globalThis.window = {
    innerWidth: 1024,
    location: {
      href: "http://localhost:5173/",
      origin: "http://localhost:5173",
      protocol: "http:",
      host: "localhost:5173",
      pathname: "/",
      search: "",
      hash: "",
    },
    navigator: { userAgent: "node-test" },
    addEventListener: noop,
    removeEventListener: noop,
    matchMedia: () => ({ matches: false, addEventListener: noop, removeEventListener: noop }),
    getComputedStyle: () => ({ getPropertyValue: () => "" }),
    requestAnimationFrame: (cb) => setTimeout(cb, 0),
    cancelAnimationFrame: (id) => clearTimeout(id),
    scrollTo: noop,
  }

  // axios 会检查 window.document 是否存在来决定平台；
  // 同时把同一个对象挂到 globalThis.document，供直接使用裸 `document` 的模块
  const documentStub = {
    body: { style: {} },
    documentElement: { style: {}, clientWidth: 1024 },
    createElement: () => ({ style: {}, setAttribute: noop, appendChild: noop }),
    createElementNS: () => ({ style: {}, appendChild: noop }),
    createComment: () => ({ textContent: "" }),
    createTextNode: (text) => ({ textContent: text }),
    querySelector: () => null,
    querySelectorAll: () => [],
    getElementsByTagName: () => [],
    getElementById: () => null,
    addEventListener: noop,
    removeEventListener: noop,
  }

  globalThis.window.document = documentStub
  globalThis.document = documentStub

  return true
}

/** 清空两个存储 */
export function resetStorage() {
  globalThis.localStorage?.clear()
  globalThis.sessionStorage?.clear()
}

/**
 * 动态导入某个 app 模块（每次返回同一份模块实例，ESM 会缓存）
 * @param {string} pathFromSrc 形如 '/hooks/useToken/index.js'
 */
export function loadAppModule(pathFromSrc) {
  const url = new URL(`../src${pathFromSrc}`, import.meta.url).href
  return import(url)
}
