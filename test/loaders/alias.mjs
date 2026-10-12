/**
 * Node 模块解析钩子：模拟 Vite 的解析行为
 *
 * 解决两件事：
 *   1. `@/x` → `<src>/x`
 *   2. 省略扩展名与目录 index：`./ask/user` → `./ask/user.js`，
 *      `@/hooks/useToken` → `<src>/hooks/useToken/index.js`
 *
 * 用 `module.registerHooks`（Node 20.6+，无需 --experimental-loader 子进程）注册，
 * 测试因此不依赖 jsdom、vitest 或任何打包器。
 *
 * ## 历史：这里曾有一个 ant-design-vue 替身
 *
 * 从前模板里用着 `<a-table>` 等组件库标签，而它的 `message` 在模块加载期就会
 * 访问 `document`，于是不得不在解析层把整个库换成一个只记录调用的替身。
 * 项目改为全量使用自有的 `.u-*` 组件体系后，这条规则连同替身本身一并删除 ——
 * 「为了一个不再需要的依赖去维护一套桩」本身就是应当避免的负担。
 *
 * 用法见 test/setup.js。
 */
import { registerHooks } from 'node:module'
import { existsSync, statSync, readFileSync } from 'node:fs'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { dirname, resolve as resolvePath } from 'node:path'
import { createRequire } from 'node:module'

const SRC_DIR = resolvePath(dirname(fileURLToPath(import.meta.url)), '..', '..', 'src')

/**
 * 把 .vue 单文件组件编译成 ESM（供 SSR 渲染测试使用）。
 *
 * 用 createRequire 同步加载 @vue/compiler-sfc：load 钩子必须是同步的，
 * 无法 await 动态 import。
 */
const requireCjs = createRequire(import.meta.url)
let sfcCompiler = null
function compileVueSfc(filename) {
  if (!sfcCompiler) {
    const { parse, compileScript } = requireCjs('@vue/compiler-sfc')
    sfcCompiler = { parse, compileScript }
  }
  const { parse, compileScript } = sfcCompiler
  const source = readFileSync(filename, 'utf8')
  const { descriptor, errors } = parse(source, { filename })
  if (errors && errors.length) throw new Error(`SFC 解析失败（${filename}）：${errors[0].message}`)

  const id = Buffer.from(filename).toString('hex').slice(0, 12)
  // inlineTemplate：把模板内联进 render，避免生成对 ?vue&type=template 的二次请求
  const compiled = compileScript(descriptor, { id, inlineTemplate: true })
  return compiled.content
}

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
    // （已移除）ant-design-vue 替身：项目不再依赖该组件库，
    // 模板里的 <a-*> 标签已全部换成原生标签 / 项目自有 .u-* 类，因此
    // 「在解析层把库换成替身」这条规则连同它的 load 分支一并删除。
    // 提示框改走自建的 hooks/useToast（见 stores/toast.js），与组件库无关。

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
    // 4) .vue 单文件组件：编译成 ESM。
    //    必须在**本文件**注册（而不是在某个测试文件里再 registerHooks）——
    //    本文件是最早被 import 的钩子模块，而后续的 registerHooks 会晚于
    //    静态 import 的解析，导致 "Unknown file extension .vue"。
    //
    //    注意 URL 可能带查询串（强制重新加载用的缓存破坏标记），
    //    因此不能只判断 endsWith('.vue')。
    if (url.startsWith('file:')) {
      const withoutQuery = url.split('?')[0]
      if (withoutQuery.endsWith('.vue')) {
        const filename = fileURLToPath(withoutQuery)
        if (existsSync(filename)) {
          return { format: 'module', source: compileVueSfc(filename), shortCircuit: true }
        }
      }
    }
    return nextLoad(url, context)
  },
})
