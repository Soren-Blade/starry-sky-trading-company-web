import test from 'node:test'
import assert from 'node:assert/strict'
import http from 'node:http'

import { installStorageStub, installDomStub, resetStorage, loadAppModule } from './setup.js'

installStorageStub()
installDomStub()

const { setAccessToken, setRefreshToken, getAccessToken, getRefreshToken, clearTokens } =
  await loadAppModule('/hooks/useToken/index.js')

/**
 * 起一个可控的后端桩：
 *   GET  /protected   带有效 access -> 200；否则 401
 *   POST /user/refreshToken -> 按 scenario 决定成功或失败
 *
 * 同时记录收到的请求，用于断言「刷新只发了一次」等行为。
 */
function startStub() {
  const state = {
    requests: [],
    /** 当前有效的 access token */
    validAccess: 'access-1',
    /** 刷新接口返回什么 */
    refreshMode: 'ok', // ok | fail | error
    refreshDelayMs: 0,
    newAccess: 'access-2',
    failNextProtected: 0,
    /** true 时 /protected 拒绝任何 token（含刷新后拿到的），用于验证防死循环 */
    rejectAllProtected: false,
  }

  const server = http.createServer((req, res) => {
    let body = ''
    req.on('data', (c) => (body += c))
    req.on('end', () => {
      state.requests.push({ method: req.method, url: req.url, auth: req.headers.authorization || null })

      if (req.url.startsWith('/user/refreshToken')) {
        const respond = () => {
          if (state.refreshMode === 'ok') {
            // 关键：刷新成功后必须把「当前有效 access token」更新为新值。
            // 否则重放请求带的是新 token，而桩仍只认旧值 —— 会误判实现有 bug。
            state.validAccess = state.newAccess
            res.writeHead(200, {
              'Content-Type': 'application/json',
              'Access-Token': state.newAccess,
              'Refresh-Token': 'refresh-2',
            })
            res.end(JSON.stringify({ success: true, message: '刷新成功', data: null }))
          } else if (state.refreshMode === 'fail') {
            res.writeHead(401, { 'Content-Type': 'application/json' })
            res.end(JSON.stringify({ success: false, message: '刷新凭据无效', code: 'UNAUTHORIZED' }))
          } else {
            res.writeHead(500, { 'Content-Type': 'application/json' })
            res.end(JSON.stringify({ success: false, message: '服务异常' }))
          }
        }
        if (state.refreshDelayMs) setTimeout(respond, state.refreshDelayMs)
        else respond()
        return
      }

      if (req.url.startsWith('/protected')) {
        if (state.rejectAllProtected) {
          res.writeHead(401, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify({ success: false, message: '令牌无效', code: 'UNAUTHORIZED' }))
          return
        }
        if (state.failNextProtected > 0) {
          state.failNextProtected -= 1
          res.writeHead(500, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify({ success: false, message: '临时故障' }))
          return
        }
        const auth = req.headers.authorization || ''
        if (auth === `Bearer ${state.validAccess}`) {
          res.writeHead(200, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify({ success: true, message: 'ok', data: { got: true } }))
        } else {
          res.writeHead(401, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify({ success: false, message: '令牌无效', code: 'UNAUTHORIZED' }))
        }
        return
      }

      res.writeHead(404, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ success: false, message: 'not found' }))
    })
  })

  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => {
      resolve({ server, state, port: server.address().port })
    })
  })
}

/**
 * 取一份全新的 request 模块实例。
 *
 * 为什么必须「全新」：单飞刷新状态（inflight）与 `onAuthExpired` 都是模块级的，
 * 而所有用例在同一进程里运行。用查询串作为 Node 模块缓存的键，
 * 可以既复用同一份源码、又拿到彼此隔离的实例
 * （依赖 test/loaders/alias.mjs 里保留查询串的解析逻辑）。
 */
async function freshRequestModule(baseURL) {
  // setup.js 的 load 钩子会把 import.meta.env 设成 __SSTC_TEST_ENV__
  globalThis.__SSTC_TEST_ENV__ = { ...(globalThis.__SSTC_TEST_ENV__ || {}), VITE_API_BASE_URL: baseURL }
  return loadAppModule(`/api/request.js?t=${Date.now()}-${Math.random()}`)
}

test('401 触发刷新：刷新成功后自动重放原请求并返回结果', async () => {
  const { server, state, port } = await startStub()
  try {
    resetStorage()
    setAccessToken('expired-access')
    setRefreshToken('refresh-1')

    const { default: requests } = await freshRequestModule(`http://127.0.0.1:${port}`)
    const result = await requests.get('/protected')

    assert.equal(result.success, true, `应重放成功，实际 ${JSON.stringify(result)}`)
    assert.equal(result.data.got, true)

    const urls = state.requests.map((r) => r.url)
    assert.deepEqual(urls, ['/protected', '/user/refreshToken', '/protected'], `实际请求序列：${urls.join(' -> ')}`)

    // 重放时必须使用新 token
    const replay = state.requests[2]
    assert.equal(replay.auth, 'Bearer access-2', `重放应带新 token，实际 ${replay.auth}`)
    assert.equal(getAccessToken(), 'access-2', '新 access token 应已落库')
    assert.equal(getRefreshToken(), 'refresh-2', '新 refresh token 应已落库')
  } finally {
    server.close()
  }
})

test('401 刷新：刷新接口必须带 refresh token（而不是 access token）', async () => {
  const { server, state, port } = await startStub()
  try {
    resetStorage()
    setAccessToken('expired-access')
    setRefreshToken('refresh-abc')

    const { default: requests } = await freshRequestModule(`http://127.0.0.1:${port}`)
    await requests.get('/protected')

    const refreshReq = state.requests.find((r) => r.url.startsWith('/user/refreshToken'))
    assert.ok(refreshReq, '应发出刷新请求')
    assert.equal(refreshReq.method, 'POST')
    // 这条断言很关键：请求拦截器曾经无条件覆盖 Authorization，
    // 导致刷新请求带的是 access token，刷新必然失败。
    assert.equal(
      refreshReq.auth,
      'Bearer refresh-abc',
      `刷新请求必须用 refresh token，实际 ${refreshReq.auth}`
    )
  } finally {
    server.close()
  }
})

test('401 刷新失败（401）：清理凭据、不无限重试、把错误抛给调用方', async () => {
  const { server, state, port } = await startStub()
  try {
    resetStorage()
    setAccessToken('expired')
    setRefreshToken('bad-refresh')
    state.refreshMode = 'fail'

    const { default: requests } = await freshRequestModule(`http://127.0.0.1:${port}`)

    let thrown = null
    try {
      await requests.get('/protected')
    } catch (e) {
      thrown = e
    }

    assert.ok(thrown, '刷新失败时应 reject，而不是静默返回')
    assert.equal(thrown.status, 401, `应透传 HTTP 状态，实际 ${thrown.status}`)
    assert.equal(thrown.code, 'UNAUTHORIZED')

    const protectedCalls = state.requests.filter((r) => r.url === '/protected').length
    assert.equal(protectedCalls, 1, `不应重放（否则会无限循环），实际调用 ${protectedCalls} 次`)

    assert.equal(getAccessToken(), null, '刷新失败后应清理 access token')
    assert.equal(getRefreshToken(), null, '刷新失败后应清理 refresh token')
  } finally {
    server.close()
  }
})

test('401 刷新失败（500 服务异常）：同样清理凭据并 reject', async () => {
  const { server, state, port } = await startStub()
  try {
    resetStorage()
    setAccessToken('expired')
    setRefreshToken('r')
    state.refreshMode = 'error'

    const { default: requests } = await freshRequestModule(`http://127.0.0.1:${port}`)

    await assert.rejects(() => requests.get('/protected'))
    assert.equal(getAccessToken(), null)
    assert.equal(getRefreshToken(), null)
  } finally {
    server.close()
  }
})

test('刷新失败时调用注入的 onAuthExpired 回调', async () => {
  const { server, state, port } = await startStub()
  try {
    resetStorage()
    setAccessToken('expired')
    setRefreshToken('r')
    state.refreshMode = 'fail'

    const { default: requests, setAuthExpiredHandler } = await freshRequestModule(
      `http://127.0.0.1:${port}`
    )

    let called = 0
    setAuthExpiredHandler(() => {
      called += 1
    })

    await assert.rejects(() => requests.get('/protected'))
    assert.equal(called, 1, `onAuthExpired 应被调用一次，实际 ${called}`)
  } finally {
    server.close()
  }
})

test('并发 401 只触发一次刷新请求（单飞）', async () => {
  const { server, state, port } = await startStub()
  try {
    resetStorage()
    setAccessToken('expired')
    setRefreshToken('refresh-1')
    state.refreshDelayMs = 60

    const { default: requests } = await freshRequestModule(`http://127.0.0.1:${port}`)

    const results = await Promise.all([
      requests.get('/protected'),
      requests.get('/protected'),
      requests.get('/protected'),
    ])

    const refreshCalls = state.requests.filter((r) => r.url.startsWith('/user/refreshToken')).length
    assert.equal(refreshCalls, 1, `并发 401 应只刷新一次，实际 ${refreshCalls} 次`)
    assert.ok(results.every((r) => r.success === true), '三个请求都应最终成功')
  } finally {
    server.close()
  }
})

test('缺少 refresh token 时不发刷新请求，直接失败', async () => {
  const { server, state, port } = await startStub()
  try {
    resetStorage()
    setAccessToken('expired')
    // 不设置 refresh token

    const { default: requests } = await freshRequestModule(`http://127.0.0.1:${port}`)
    await assert.rejects(() => requests.get('/protected'))

    const refreshCalls = state.requests.filter((r) => r.url.startsWith('/user/refreshToken')).length
    assert.equal(refreshCalls, 0, '没有 refresh token 时不应发刷新请求')
  } finally {
    server.close()
  }
})

test('非 401 错误（500）不触发刷新，直接透传', async () => {
  const { server, state, port } = await startStub()
  try {
    resetStorage()
    setAccessToken('access-1')
    setRefreshToken('r')
    state.failNextProtected = 1

    const { default: requests } = await freshRequestModule(`http://127.0.0.1:${port}`)

    let thrown = null
    try {
      await requests.get('/protected')
    } catch (e) {
      thrown = e
    }

    assert.ok(thrown)
    assert.equal(thrown.status, 500)
    const refreshCalls = state.requests.filter((r) => r.url.startsWith('/user/refreshToken')).length
    assert.equal(refreshCalls, 0, '500 不应触发 token 刷新')
  } finally {
    server.close()
  }
})

test('未登录（无 access token）时 401 仍尝试刷新', async () => {
  const { server, port } = await startStub()
  try {
    resetStorage()
    setRefreshToken('refresh-1')
    // 不设置 access token

    const { default: requests } = await freshRequestModule(`http://127.0.0.1:${port}`)
    const result = await requests.get('/protected')

    assert.equal(result.success, true, '有 refresh token 时应能恢复')
    assert.equal(getAccessToken(), 'access-2')
  } finally {
    server.close()
  }
})

test('clearTokens 后不会残留可用的 refresh token', async () => {
  const { server, state, port } = await startStub()
  try {
    resetStorage()
    setAccessToken('a')
    setRefreshToken('r')
    clearTokens()

    const { default: requests } = await freshRequestModule(`http://127.0.0.1:${port}`)
    await assert.rejects(() => requests.get('/protected'))

    const refreshCalls = state.requests.filter((r) => r.url.startsWith('/user/refreshToken')).length
    assert.equal(refreshCalls, 0)
  } finally {
    server.close()
  }
})

test('刷新成功但服务端仍返回 401：不得无限重试（防死循环）', async () => {
  const { server, state, port } = await startStub()
  try {
    resetStorage()
    setAccessToken('expired')
    setRefreshToken('refresh-1')
    // 让 /protected 拒绝**任何** token（包括刷新后拿到的新 token），
    // 同时刷新接口保持成功 —— 这是最容易写出死循环的组合。
    state.rejectAllProtected = true

    const { default: requests } = await freshRequestModule(`http://127.0.0.1:${port}`)

    await assert.rejects(() => requests.get('/protected'), '应最终失败而不是一直重试')

    const protectedCalls = state.requests.filter((r) => r.url === '/protected').length
    assert.equal(protectedCalls, 2, `应为「原始 + 重放一次」，实际 ${protectedCalls} 次`)
    const refreshCalls = state.requests.filter((r) => r.url.startsWith('/user/refreshToken')).length
    assert.equal(refreshCalls, 1, `只应刷新一次，实际 ${refreshCalls} 次`)
  } finally {
    server.close()
  }
})

test('刷新请求自身返回 401 时不会再触发新一轮刷新（__isRefreshToken 标记）', async () => {
  const { server, state, port } = await startStub()
  try {
    resetStorage()
    setAccessToken('expired')
    setRefreshToken('bad')
    state.refreshMode = 'fail'

    const { default: requests } = await freshRequestModule(`http://127.0.0.1:${port}`)
    await assert.rejects(() => requests.get('/protected'))

    // refreshToken 接口只应被调用一次 —— 说明没有递归
    const refreshCalls = state.requests.filter((r) => r.url.startsWith('/user/refreshToken')).length
    assert.equal(refreshCalls, 1, `刷新接口应只调用一次，实际 ${refreshCalls}`)
  } finally {
    server.close()
  }
})

// ── 刷新地址必须带前导斜杠（baseURL 为空时是相对地址）──────────────
//
// 真实回归：dev 下把 VITE_API_BASE_URL 改成空（走 Vite 代理）之后，
// 刷新请求写的 `'user/refreshToken'` 会被 axios 原样透传，
// 浏览器按**当前文档路径**解析 —— 在 /user/kami 上变成
// /user/user/refreshToken，不命中任何代理规则，刷新必然失败 → 静默登出（已修）。
test('源码断言：request.js 里的请求地址必须带前导斜杠', async () => {
  const { readFileSync } = await import('node:fs')
  const { fileURLToPath } = await import('node:url')
  const { dirname, join } = await import('node:path')

  const srcPath = join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'api', 'request.js')
  const src = readFileSync(srcPath, 'utf8')

  const matches = [...src.matchAll(/url:\s*(['"`])([^'"`]+)\1/g)]
  assert.ok(matches.length > 0, '应在 request.js 中找到请求 url 字面量')

  for (const [, , url] of matches) {
    assert.ok(
      url.startsWith('/'),
      `绝对路径必须带前导斜杠，否则 baseURL 为空时会按当前文档路径解析：${JSON.stringify(url)}`
    )
  }

  const urls = matches.map((m) => m[2])
  assert.ok(
    urls.includes('/user/refreshToken'),
    `刷新地址应为 /user/refreshToken，实际找到 ${JSON.stringify(urls)}`
  )
})

test('axios 相对地址的解析：空 baseURL 下地址原样透传（回归成因）', async () => {
  const { default: axios } = await import('axios')

  const empty = axios.create({ baseURL: '' })
  const absolute = axios.create({ baseURL: 'http://127.0.0.1:9' })

  // 对照组：这正是回归的成因 —— 不带前导斜杠时得到相对地址，
  // 浏览器会拿它和当前页面路径拼接（/user/kami → /user/user/refreshToken）
  assert.equal(empty.getUri({ url: 'user/refreshToken' }), 'user/refreshToken')
  assert.equal(empty.getUri({ url: '/user/refreshToken' }), '/user/refreshToken')

  // baseURL 非空时两种写法都指向同一个后端路径（所以改造前不会暴露该缺陷）
  assert.equal(absolute.getUri({ url: 'user/refreshToken' }), 'http://127.0.0.1:9/user/refreshToken')
  assert.equal(absolute.getUri({ url: '/user/refreshToken' }), 'http://127.0.0.1:9/user/refreshToken')
})

// 注：这里**不能**再补一条「空 baseURL 下刷新请求真的发到了 /user/refreshToken」的集成用例 ——
// Node 里的 axios 没有 document base，相对地址根本无法解析（实测请求根本不发出、
// 直接落到错误处理器）。也就是说该缺陷只在浏览器里成立，而这恰恰是它当初能溜过
// 378 个用例的原因。上面两条（源码字面量 + axios 解析语义）是 Node 环境下能给出的
// 最强守卫；真实浏览器侧的保障由 `npm run verify:dev` 的代理转发断言承担。