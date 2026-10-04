/**
 * 前后端接口契约测试
 *
 * 目的：任何一侧单独改路由都不会被发现，直到运行时才 404。
 * 这里通过静态解析两端的源码，断言：
 *   1. 前端 api/ask/*.js 里调用的每个「方法 + 路径」在后端都有对应路由
 *   2. 需要鉴权的后端路由，前端调用时不会漏（反向提示）
 *   3. 后端是否存在前端从未调用、也非管理后台的路由（仅报告，不失败）
 *
 * 解析方式刻意保持简单（正则），不做完整 AST 分析；
 * 但一旦解析结果为空会直接失败，避免「测试假通过」。
 */
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, readdirSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const WEB_ROOT = join(__dirname, '..')
const SERVER_ROOT = join(WEB_ROOT, '..', 'starry-sky-trading-company-server')

const read = (p) => readFileSync(p, 'utf8')

/**
 * 归一化路径，便于两端比较：
 *   - 前端模板串里的 ${var} → :param
 *   - 后端 Express 的动态段 :user_id / :idOrSlug → :param
 *   - 去掉结尾斜杠
 */
const normalize = (p) => {
  const normalized = p
    .replace(/\$\{[^}]+\}/g, ':param')
    .replace(/:[A-Za-z_][A-Za-z0-9_]*/g, ':param')
    .replace(/\/$/, '')
  // 根路径去掉尾斜杠后会变成空串，这里还原成 '/'
  return normalized === '' ? '/' : normalized
}

/**
 * 解析前端 src/api/ask/*.js
 * 形如：const baseURL = '/userApi'  +  request.get(`${baseURL}/getUserInfo`)
 *       const classBaseURL = '/class' + request.get(`${classBaseURL}/getCategories`, ...)
 * @returns {Array<{method: string, path: string, file: string}>}
 */
function parseFrontendCalls() {
  const dir = join(WEB_ROOT, 'src', 'api', 'ask')
  const calls = []

  for (const file of readdirSync(dir).filter((f) => f.endsWith('.js'))) {
    const source = read(join(dir, file))

    // 收集该文件内所有 baseURL 变量
    const bases = {}
    for (const m of source.matchAll(/const\s+(\w+)\s*=\s*['"]([^'"]+)['"]/g)) {
      bases[m[1]] = m[2]
    }

    // request.<method>(`${base}/path`, ...) 或 request.<method>('/literal/path', ...)
    const callRe = /request\.(get|post|put|patch|delete)\s*\(\s*(`[^`]*`|'[^']*'|"[^"]*")/g
    for (const m of source.matchAll(callRe)) {
      const method = m[1].toUpperCase()
      let raw = m[2].slice(1, -1) // 去掉引号/反引号

      // 把 ${var} 替换成对应 baseURL 的字面量
      raw = raw.replace(/\$\{(\w+)\}/g, (_, name) => (name in bases ? bases[name] : ':param'))

      calls.push({ method, path: normalize(raw), file })
    }
  }

  return calls
}

/**
 * 解析后端路由：汇总 app.use(prefix, router) 与各 router 文件里的 router.<method>('path')
 * @returns {Array<{method: string, path: string}>}
 */
function parseBackendRoutes() {
  const indexSource = read(join(SERVER_ROOT, 'src', 'index.js'))

  // variable -> 路由文件
  const routerVars = {}
  for (const m of indexSource.matchAll(/const\s+(\w+)\s*=\s*require\(['"]\.\/router\/([^'"]+)['"]\)/g)) {
    routerVars[m[1]] = m[2]
  }

  // prefix -> 路由文件
  const prefixToFile = {}
  // 注意：挂载形式有两种，第二种带鉴权中间件且存在嵌套括号：
  //   app.use('/user', userRouter)
  //   app.use('/userApi', jwt(jwtOptios), userApiRouter)
  // 因此按「整行」匹配，不试图用括号配对解析。
  const useLineRe = /^\s*app\.use\(\s*['"]([^'"]+)['"]\s*,\s*(.+?)\)\s*(?:\/\/.*)?$/gm
  for (const m of indexSource.matchAll(useLineRe)) {
    const prefix = m[1]
    const rest = m[2]
    // 取该行最后一个 *Router 标识符
    const routerNames = [...rest.matchAll(/(\w+Router)\b/g)].map((x) => x[1])
    const routerName = routerNames[routerNames.length - 1]
    if (routerName && routerVars[routerName]) {
      prefixToFile[prefix] = routerVars[routerName]
    }
  }

  const routes = []
  for (const [prefix, file] of Object.entries(prefixToFile)) {
    const filePath = join(SERVER_ROOT, 'src', 'router', `${file}.js`)
    if (!existsSync(filePath)) continue
    const source = read(filePath)

    const routeRe = /router\.(get|post|put|patch|delete)\s*\(\s*['"]([^'"]+)['"]/g
    for (const m of source.matchAll(routeRe)) {
      routes.push({
        method: m[1].toUpperCase(),
        path: normalize(`${prefix}${m[2]}`),
      })
    }
  }

  // index.js 里直接定义的路由
  const directRe = /app\.(get|post|put|patch|delete)\s*\(\s*['"]([^'"]+)['"]/g
  for (const m of indexSource.matchAll(directRe)) {
    routes.push({ method: m[1].toUpperCase(), path: normalize(m[2]) })
  }

  return routes
}

const frontendCalls = parseFrontendCalls()
const backendRoutes = parseBackendRoutes()

test('解析器自检：两端都应解析出内容（防止测试假通过）', () => {
  assert.ok(frontendCalls.length >= 10, `前端只解析出 ${frontendCalls.length} 个调用，解析器可能失效`)
  assert.ok(backendRoutes.length >= 15, `后端只解析出 ${backendRoutes.length} 个路由，解析器可能失效`)
})

test('前端调用的每个接口在后端都存在（含动态段）', () => {
  const missing = []
  for (const call of frontendCalls) {
    const hit = backendRoutes.some((r) => r.method === call.method && r.path === call.path)
    if (!hit) missing.push(`${call.method} ${call.path}  (来自 api/ask/${call.file})`)
  }

  assert.deepEqual(missing, [], `以下前端调用在后端找不到对应路由：\n  ${missing.join('\n  ')}`)
})

test('后端不应存在前端调用的同名路径但方法不一致的情况', () => {
  const methodMismatch = []
  for (const call of frontendCalls) {
    const samePath = backendRoutes.filter((r) => r.path === call.path)
    if (samePath.length > 0 && !samePath.some((r) => r.method === call.method)) {
      const methods = samePath.map((r) => r.method).join('/')
      methodMismatch.push(`${call.method} ${call.path}（后端只有 ${methods}）`)
    }
  }

  assert.deepEqual(methodMismatch, [], `方法不匹配：\n  ${methodMismatch.join('\n  ')}`)
})

test('关键契约：token 相关接口必须存在且方法正确', () => {
  const required = [
    ['POST', '/user/visitorLogin'],
    ['POST', '/user/login'],
    ['POST', '/user/register'],
    ['POST', '/user/refreshToken'],
    ['GET', '/userApi/getUserInfo'],
    ['PUT', '/userApi/profile'],
    ['POST', '/userApi/avatar'],
    ['GET', '/shop/getProducts'],
    ['GET', '/shop/getProduct/:param'],
    ['GET', '/class/getCategories'],
    ['GET', '/toolApi/getTools'],
    ['GET', '/kamiApi/getUserCards/:param'],
    ['POST', '/kamiApi/activateCard'],
    ['POST', '/kamiApi/verifyCard'],
    // 交易闭环：购物车 → 下单 → 订单管理 → 收藏
    ['GET', '/cartApi/getCart'],
    ['POST', '/cartApi/addItem'],
    ['POST', '/cartApi/updateItem'],
    ['POST', '/cartApi/removeItem'],
    ['POST', '/cartApi/clear'],
    ['POST', '/orderApi/createOrder'],
    ['GET', '/orderApi/getOrders'],
    ['GET', '/orderApi/getOrder/:param'],
    ['POST', '/orderApi/cancelOrder'],
    ['POST', '/orderApi/completeOrder'],
    ['GET', '/favoriteApi/getFavorites'],
    ['POST', '/favoriteApi/addFavorite'],
    ['POST', '/favoriteApi/removeFavorite'],
    ['GET', '/health'],
  ]

  for (const [method, path] of required) {
    assert.ok(
      backendRoutes.some((r) => r.method === method && r.path === path),
      `后端缺少约定接口：${method} ${path}`
    )
  }
})

test('前端不应遗漏后端已提供的业务接口（仅列出，防止悄悄失联）', () => {
  const frontendPaths = new Set(frontendCalls.map((c) => `${c.method} ${c.path}`))

  // 管理后台与探活接口前端本来就不调用
  const excluded = new Set(['GET /userBackend', 'GET /'])

  const unused = backendRoutes
    .filter((r) => !excluded.has(`${r.method} ${r.path}`))
    .filter((r) => !frontendPaths.has(`${r.method} ${r.path}`))
    .map((r) => `${r.method} ${r.path}`)

  // 这条只做提示，不视为失败
  if (unused.length > 0) {
    console.log(`\n  ℹ️ 后端已提供但前端未调用的接口（${unused.length} 个）：\n     ${unused.join('\n     ')}`)
  }
  assert.ok(true)
})
