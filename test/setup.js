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

      // 已经自己声明了 import.meta.env 的模块不重复注入
      if (!/import\.meta\.env\s*=/.test(text)) {
        return {
          ...result,
          source: `globalThis.__SSTC_TEST_ENV__ ??= ${JSON.stringify(TEST_ENV)};\n` +
            `import.meta.env = globalThis.__SSTC_TEST_ENV__;\n${text}`,
        }
      }
    }
    return result
  },
})

/** 给某个用例临时改环境变量（如 VITE_API_BASE_URL） */
export function setTestEnv(patch) {
  globalThis.__SSTC_TEST_ENV__ = { ...TEST_ENV, ...patch }
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
 * 需要的只有两处：
 *   1. axios 的浏览器平台探测会读 `window.location.href`
 *   2. 源码里若干 `typeof window !== "undefined"` 分支
 *
 * **这不是 jsdom 替代品。** 曾经为了跑通 ant-design-vue 的 message 而在这里一路补
 * `createElementNS` / `createComment` / `getComputedStyle`…… 那是用桩去追一个 UI 库，
 * 缺口补不完。现在 ant-design-vue 已在解析层被替换为测试替身
 * （见 ./loaders/alias.mjs），这里因此可以保持极小。
 *
 * 若将来确需渲染组件，应引入 jsdom，而不是继续往这里加 API。
 */
export function installDomStub() {
  if (globalThis.window) return false

  const noop = () => {}

  globalThis.window = {
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

  // axios 会检查 window.document 是否存在来决定平台
  globalThis.window.document = {
    body: { style: {} },
    documentElement: { style: {} },
    createElement: () => ({ style: {}, setAttribute: noop, appendChild: noop }),
    addEventListener: noop,
    removeEventListener: noop,
  }

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
