/**
 * 工具页留痕接线门禁
 *
 * 目的：工具页的操作绝大多数**纯前端完成**，不产生任何 HTTP 请求，
 * 运营因此看不到「哪个工具真的有人用、失败多不多」。P1 加了一条极轻的
 * 使用上报（`POST /toolApi/usage`），但它必须**每一页都接上**才有意义 ——
 * 漏一页就等于那一页在数据里根本不存在，而且不会报错、不会有人发现。
 *
 * 这里静态解析路由表与页面源码，断言三件事：
 *   1. 每个工具页都调用了 `useToolUsage('<路由路径>')`，且路径与路由完全一致
 *      （路径既是留痕主键、也是 TOOL_PAGES 的键，写错就等于记到别的工具头上）。
 *   2. 每个工具页至少有一次 `usage.record(` —— 只引入不调用等于没接。
 *   3. 失败上报必须带稳定的错误码（大写下划线），否则服务端的
 *      `ok OR error_code IS NOT NULL` 约束会拒掉这条记录、错误原因也无从统计。
 *
 * 刻意用正则而不是 AST：与 `test/api-contract.test.js` 同一个路子，
 * 解析结果为空就直接失败，避免「测试假通过」。
 */
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const WEB_ROOT = join(__dirname, '..')
const SRC = join(WEB_ROOT, 'src')

/** 三个「历史遗留」工具页不在 pages/tools/ 下，但同样是工具页 */
const LEGACY_TOOL_PAGES = new Set(['ImageCompressor', 'JsonFormatter', 'VideoTool'])

function read(path) {
  return readFileSync(path, 'utf8')
}

/**
 * 从路由表里找出所有工具页：`component: () => import('@/pages/tools/X.vue')`
 * 或指向那三个历史遗留页面。
 *
 * @returns {Array<{ path: string, component: string, file: string }>}
 */
function collectToolRoutes() {
  const routerSource = read(join(SRC, 'router', 'index.js'))

  // 路由块里 `{` 与 `path:` 之间经常夹着注释（历史路由都这么写），
  // 所以不按「块」匹配，而是把 path 与它**后面最近的** component 配对。
  const pathPattern = /path:\s*'([^']+)'/g
  const componentPattern = /component:\s*\(\)\s*=>\s*import\('@\/(pages\/[\w/-]+\.vue)'\)/g
  const components = []

  let componentMatch = componentPattern.exec(routerSource)
  while (componentMatch) {
    components.push({ index: componentMatch.index, file: componentMatch[1] })
    componentMatch = componentPattern.exec(routerSource)
  }

  const routes = []
  let pathMatch = pathPattern.exec(routerSource)
  while (pathMatch) {
    const routePath = pathMatch[1]
    const next = components.find((item) => item.index > pathMatch.index)
    if (next) {
      const name = next.file.replace(/^pages\//, '').replace(/\.vue$/, '')
      const isToolPage = name.startsWith('tools/') || LEGACY_TOOL_PAGES.has(name)
      if (isToolPage) {
        routes.push({ path: routePath, component: name, file: join(SRC, ...next.file.split('/')) })
      }
    }
    pathMatch = pathPattern.exec(routerSource)
  }

  return routes
}

const TOOL_ROUTES = collectToolRoutes()

test('解析器自检：工具页路由应解析出足够多的页面（防止测试假通过）', () => {
  assert.ok(
    TOOL_ROUTES.length >= 30,
    `只解析出 ${TOOL_ROUTES.length} 个工具页路由，路由表格式可能变了`,
  )
  const missing = TOOL_ROUTES.filter((route) => !existsSync(route.file))
  assert.deepEqual(missing.map((route) => route.file), [], '路由指向的页面文件必须存在')
})

test('每个工具页都用 useToolUsage 绑定自己的路由路径', () => {
  const offenders = []

  for (const route of TOOL_ROUTES) {
    const source = read(route.file)
    // 允许 import 时写成 index.js 或省略，只认调用处的字面量；
    // 第二个参数（`{ mode: 'C' }` 之类）可选，所以只要求路径字面量紧跟左括号。
    const callPattern = new RegExp(
      `useToolUsage\\(\\s*'${route.path.replace(/[/.-]/g, '\\$&')}'\\s*(?:,|\\))`,
    )
    if (!callPattern.test(source)) {
      offenders.push(`${route.component}: 缺少 useToolUsage('${route.path}')`)
    }
  }

  assert.deepEqual(offenders, [], `以下工具页没有绑定留痕路径：\n${offenders.join('\n')}`)
})

test('每个工具页至少上报一次操作', () => {
  const offenders = TOOL_ROUTES.filter((route) => !/usage\.record\(/.test(read(route.file))).map(
    (route) => route.component,
  )

  assert.deepEqual(offenders, [], `以下工具页引入了留痕却从未上报：\n${offenders.join('\n')}`)
})

test('失败上报一律带稳定的错误码（大写下划线）', () => {
  const offenders = []

  for (const route of TOOL_ROUTES) {
    const source = read(route.file)

    // 失败分支：`ok: false` 之后必须出现 errorCode
    if (/ok:\s*false/.test(source) && !/errorCode:/.test(source)) {
      offenders.push(`${route.component}: 有失败上报但没有 errorCode`)
    }

    // 错误码字面量必须符合服务端约束 ^[A-Z][A-Z0-9_]{0,63}$
    for (const found of source.matchAll(/errorCode:\s*'([^']*)'/g)) {
      if (!/^[A-Z][A-Z0-9_]{0,63}$/.test(found[1])) {
        offenders.push(`${route.component}: 错误码 "${found[1]}" 不合法`)
      }
    }
  }

  assert.deepEqual(offenders, [], `留痕错误码不符合约束：\n${offenders.join('\n')}`)
})

test('留痕上报不允许 await（不能拖慢工具本身）', () => {
  const offenders = []

  for (const route of TOOL_ROUTES) {
    const source = read(route.file)
    if (/await\s+usage\.record\(/.test(source)) {
      offenders.push(`${route.component}: 出现了 await usage.record(...)`)
    }
  }

  assert.deepEqual(offenders, [], `留痕是旁路，不得 await：\n${offenders.join('\n')}`)
})
