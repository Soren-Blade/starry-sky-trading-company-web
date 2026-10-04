/**
 * Node 模块解析钩子：模拟 Vite 的解析行为，并替换掉不适合在 Node 下加载的依赖
 *
 * 解决三件事：
 *   1. `@/x` → `<src>/x`
 *   2. 省略扩展名与目录 index：`./ask/user` → `./ask/user.js`，
 *      `@/hooks/useToken` → `<src>/hooks/useToken/index.js`
 *   3. `ant-design-vue` → 测试替身（见下）
 *
 * 用 `module.registerHooks`（Node 20.6+，无需 --experimental-loader 子进程）注册，
 * 测试因此不依赖 jsdom、vitest 或任何打包器。
 *
 * ## 为什么替换 ant-design-vue
 *
 * 它的 `message` 在**模块加载期**就会访问 `document`（`getElementsByTagName`），
 * 并在展示时通过 Vue 渲染真实 DOM 节点。要让它跑通，就得一路补
 * `createElementNS`、`createComment`、`getComputedStyle`……
 * 那是「用桩去追一个 UI 库」，而不是在测试被测逻辑 —— 而且会不断有新的缺口。
 *
 * 被测代码只需要 `message.success()` 这类调用不抛错。因此这里直接给一个替身，
 * 并把调用记录下来供断言使用。组件渲染类测试若确有必要，应引入 jsdom 而不是扩桩。
 *
 * 用法见 test/setup.js。
 */
import { registerHooks } from 'node:module'
import { existsSync, statSync } from 'node:fs'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { dirname, resolve as resolvePath } from 'node:path'

const SRC_DIR = resolvePath(dirname(fileURLToPath(import.meta.url)), '..', '..', 'src')

/** ant-design-vue 替身的调用记录，供用例断言（见 setup.js 的 messageCalls） */
const messageCalls = []
globalThis.__SSTC_MESSAGE_CALLS__ = messageCalls

const ANTD_STUB_SOURCE = `
const calls = globalThis.__SSTC_MESSAGE_CALLS__ || (globalThis.__SSTC_MESSAGE_CALLS__ = []);
const record = (type) => (content, ...rest) => {
  calls.push({ type, content, rest });
  return () => {};
};
const api = {
  success: record('success'),
  error: record('error'),
  warning: record('warning'),
  info: record('info'),
  loading: record('loading'),
  open: record('open'),
  destroy: () => {},
  config: () => {},
};
export const message = api;
export const notification = api;
export const Modal = { confirm: record('confirm'), info: record('info') };
export default { message: api, notification: api, Modal };
`

const ANTD_STUB_URL = 'sstc-test:ant-design-vue-stub'

/** 在 base 上尝试补扩展名与目录 index，返回存在的文件路径 */
function resolveLoose(base) {
  // base 可能带查询串（测试用它做缓存破坏），先剥掉再判断文件是否存在
  const clean = base.replace(/\?.*$/, '')
  const candidates = [
    clean,
    `${clean}.js`,
    `${clean}.mjs`,
    `${clean}.cjs`,
    `${clean}.json`,
    resolvePath(clean, 'index.js'),
    resolvePath(clean, 'index.mjs'),
  ]

  for (const candidate of candidates) {
    if (existsSync(candidate) && statSync(candidate).isFile()) return candidate
  }
  return null
}

/**
 * 把解析到的文件路径转成 URL，并**保留原 specifier 上的查询串**。
 *
 * 为什么重要：测试用 `loadAppModule('/api/request.js?t=...')` 强制重新加载模块
 * （该模块有模块级状态，如单飞 promise）。若解析时把 `?t=` 丢掉，
 * Node 认为与先前导入是同一模块而直接返回缓存，强制重载失效 ——
 * 症状是「单独跑通过、整套跑失败」。这里以「路径 + 查询串」为缓存键，
 * 既复用同一份源码文件，又能拿到全新实例。
 */
function fileUrlFor(targetPath, specifier) {
  const baseUrl = pathToFileURL(targetPath).href
  const qIndex = specifier.indexOf('?')
  return qIndex === -1 ? baseUrl : `${baseUrl}${specifier.slice(qIndex)}`
}

function resolveRelative(specifier, parentURL) {
  if (!parentURL?.startsWith('file:')) return null
  const base = resolvePath(dirname(fileURLToPath(parentURL)), specifier)
  const found = resolveLoose(base)
  return found ? fileUrlFor(found, specifier) : null
}

registerHooks({
  resolve(specifier, context, nextResolve) {
    // 3) ant-design-vue 替身（含子路径，如 ant-design-vue/es/message）
    if (specifier === 'ant-design-vue' || specifier.startsWith('ant-design-vue/')) {
      return { url: ANTD_STUB_URL, shortCircuit: true }
    }

    // 3b) （已移除）vue 替身：曾尝试在加载层把 vue 换成只含 onUnmounted 的替身，
    // 但因为 --test-isolation=none 让所有测试文件共享进程，这会切断其他文件
    // 对真实 vue 的使用（pinia store 等），造成跨文件污染。
    // 现在的做法是给 useBodyScroll 注入 onUnmounted，见 test/useBodyScroll.test.js。

    // 1) @/ 别名
    if (specifier.startsWith('@/')) {
      const found = resolveLoose(resolvePath(SRC_DIR, specifier.slice(2)))
      if (found) return { url: fileUrlFor(found, specifier), shortCircuit: true }
    }

    // 2) 省略扩展名 / 目录 index 的相对导入
    if (/^\.{1,2}\//.test(specifier)) {
      const url = resolveRelative(specifier, context.parentURL)
      if (url) return { url, shortCircuit: true }
    }

    return nextResolve(specifier, context)
  },

  load(url, context, nextLoad) {
    if (url === ANTD_STUB_URL) {
      return { format: 'module', source: ANTD_STUB_SOURCE, shortCircuit: true }
    }
    return nextLoad(url, context)
  },
})
