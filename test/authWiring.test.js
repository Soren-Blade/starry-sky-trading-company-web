import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const WEB_ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const SRC = path.join(WEB_ROOT, 'src')

const read = (rel) => fs.readFileSync(path.join(WEB_ROOT, rel), 'utf8')

/**
 * 遍历 src 下的源码文件（排除测试目录）
 */
function sourceFiles() {
  const out = []
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name)
      if (entry.isDirectory()) walk(full)
      else if (/\.(js|vue|mjs)$/.test(entry.name)) out.push(full)
    }
  }
  walk(SRC)
  return out
}

const rel = (full) => path.relative(WEB_ROOT, full).replace(/\\/g, '/')

test('setAuthExpiredHandler 必须被实际注册（否则登录态失效时用户得不到任何反馈）', () => {
  // 这类缺陷很难在单元测试里发现：函数定义存在、类型正确、也有测试覆盖，
  // 但**生产代码从未调用它**。实测中 onAuthExpired 因此恒为 null，
  // 刷新失败只是静默清空凭据，用户既看不到提示也不会跳转登录。
  const callers = sourceFiles().filter((f) => {
    const text = fs.readFileSync(f, 'utf8')
    // 只统计「调用」，排除定义与 export
    return /setAuthExpiredHandler\s*\(/.test(text) && !/export\s+function\s+setAuthExpiredHandler/.test(text)
  })

  assert.ok(
    callers.length > 0,
    'src/ 下没有任何地方注册 setAuthExpiredHandler —— 登录态失效时会静默失败'
  )
  assert.ok(
    callers.some((f) => rel(f) === 'src/main.js'),
    `应在应用入口 main.js 注册，实际调用方：${callers.map(rel).join(', ')}`
  )
})

test('main.js 注册的回调会提示用户并跳转首页', () => {
  const main = read('src/main.js')

  assert.match(main, /setAuthExpiredHandler\(/, 'main.js 应注册失效回调')
  assert.match(main, /message\.\w+\(/, '回调里应给出用户可见的提示')
  assert.match(main, /router\.(replace|push)\(/, '回调里应把用户带离需要登录的页面')
})

test('main.js 跳转使用的路由名确实存在', () => {
  const main = read('src/main.js')
  const routerSource = read('src/router/index.js')

  // 取出 main.js 里 replace({ name: 'XXX' }) 的名字
  const match = main.match(/name:\s*['"]([^'"]+)['"]/)
  assert.ok(match, 'main.js 应通过具名路由跳转')

  const routeName = match[1]
  assert.ok(
    new RegExp(`name:\\s*['"]${routeName}['"]`).test(routerSource),
    `main.js 跳转到路由名 '${routeName}'，但 router/index.js 里没有该名称`
  )
})

test('请求拦截器里显式设置的 Authorization 不会被覆盖（刷新请求前提）', () => {
  // 刷新 token 的请求需要带 refresh token；若拦截器无条件覆盖 Authorization，
  // 它会变成 access token，刷新必然失败。
  const request = read('src/api/request.js')

  assert.match(
    request,
    /interceptors\.request\.use/,
    'request.js 应有请求拦截器'
  )
  assert.match(
    request,
    /Authorization|authorization/,
    '拦截器应处理 Authorization'
  )
  // 必须存在「已有 Authorization 时提前返回」的分支
  assert.match(
    request,
    /if\s*\(\s*alreadySet\s*\)\s*return\s+config/,
    '拦截器必须在 Authorization 已设置时提前返回，否则刷新请求会带错令牌'
  )
})

test('401 的重试逻辑必须位于错误处理器内（axios 会 reject 4xx）', () => {
  const request = read('src/api/request.js')

  // 找到错误处理器的起始位置，确认 status === 401 的判断在其之后
  const errorHandlerAt = request.indexOf('(error) =>')
  assert.ok(errorHandlerAt > -1, 'request.js 应有错误处理器')

  const afterErrorHandler = request.slice(errorHandlerAt)
  assert.match(
    afterErrorHandler,
    /status\s*===\s*401/,
    '401 的刷新重试必须在错误处理器内 —— 写进成功回调的分支永远不可达'
  )
})

test('重放请求不得无限重试（必须存在 __isRetry 标记）', () => {
  const request = read('src/api/request.js')

  assert.match(request, /__isRetry/, '应有重放标记，否则 401 会形成死循环')
  assert.match(
    request,
    /!originalConfig\.__isRetry|__isRetry\)\s*return\s+null/,
    '错误处理器应据 __isRetry 阻止二次重放'
  )
})

test('刷新逻辑与 request 实例同模块（避免循环依赖）', () => {
  const request = read('src/api/request.js')
  const hook = read('src/hooks/useRefreshToken/index.js')

  // 实现应内联在 request.js
  assert.match(request, /export function refreshToken\s*\(/, 'request.js 应导出 refreshToken')

  // hook 只做再导出，不得从 request 实例化新的 axios 或反向 import 造成循环
  assert.equal(
    /import\s+request\s+from/.test(hook),
    false,
    'useRefreshToken 不应再直接 import request 实例（会形成循环依赖）'
  )
})
