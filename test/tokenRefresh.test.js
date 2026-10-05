import test from 'node:test'
import assert from 'node:assert/strict'
import http from 'node:http'

import { installStorageStub, installDomStub, resetStorage, loadAppModule, setTestEnv } from './setup.js'

installStorageStub()
installDomStub()

const { setAccessToken, setRefreshToken, getAccessToken, decodeTokenPayload, getAccessTokenRemainingMs } =
  await loadAppModule('/hooks/useToken/index.js')

/**
 * access token 的「主动刷新」
 *
 * 背景：刷新原先只在收到 401 时才发生，于是每次过期都要白跑一趟：
 *
 *   请求 → 401 → 刷新 → 重放        3 个请求，第一个纯浪费，且延迟翻倍
 *
 * 现在在请求拦截器里先看 JWT 的 `exp`，快过期就先刷新，于是变成：
 *
 *   刷新 → 请求                    2 个请求，没有一个白跑
 *
 * 这一组用例就是把上面那两个序列钉住。
 */

// ── 造一个 JWT（只需载荷能被解出来，签名随便）─────────────

const b64url = (value) =>
  Buffer.from(JSON.stringify(value), 'utf8').toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')

/** @param {number} secondsFromNow 距过期还有多少秒（负数=已过期） */
const makeJwt = (secondsFromNow) => {
  const exp = Math.floor(Date.now() / 1000) + secondsFromNow
  return `${b64url({ alg: 'HS256', typ: 'JWT' })}.${b64url({ uuid: 'u-1', type: 'access', exp })}.sig`
}

/** 与 request.test.js 同样的后端桩：/protected 只认当前有效 token */
function startStub() {
  const state = {
    requests: [],
    validAccess: 'access-1',
    refreshMode: 'ok', // ok | fail | error
    newAccess: 'access-2',
    /** 登录接口下发的 access token */
    loginAccess: 'access-from-login',
    rejectAllProtected: false,
  }

  const server = http.createServer((req, res) => {
    req.on('data', () => {})
    req.on('end', () => {
      state.requests.push({ url: req.url, auth: req.headers.authorization || null })

      if (req.url.startsWith('/user/refreshToken')) {
        if (state.refreshMode === 'ok') {
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
        return
      }

      if (req.url.startsWith('/protected')) {
        const auth = req.headers.authorization || ''
        if (state.rejectAllProtected || auth !== `Bearer ${state.validAccess}`) {
          res.writeHead(401, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify({ success: false, message: '令牌无效', code: 'UNAUTHORIZED' }))
          return
        }
        res.writeHead(200, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ success: true, data: { got: true } }))
        return
      }

      if (req.url.startsWith('/login')) {
        // 模拟一次成功登录：服务端在响应头里下发全新凭据
        state.validAccess = state.loginAccess
        res.writeHead(200, {
          'Content-Type': 'application/json',
          'Access-Token': state.loginAccess,
          'Refresh-Token': 'refresh-from-login',
        })
        res.end(JSON.stringify({ success: true, message: '登录成功', data: null }))
        return
      }

      res.writeHead(404).end('{}')
    })
  })

  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => resolve({ server, state, port: server.address().port }))
  })
}

/** 全新模块实例：刷新状态是模块级的，用例之间必须隔离 */
async function freshRequestModule(baseURL) {
  const previous = globalThis.__SSTC_TEST_ENV__?.VITE_API_BASE_URL ?? ''
  setTestEnv({ VITE_API_BASE_URL: baseURL })
  try {
    return await loadAppModule(`/api/request.js?t=${Date.now()}-${Math.random()}`)
  } finally {
    setTestEnv({ VITE_API_BASE_URL: previous })
  }
}

// ══════════════════════════════════════════════════════════
// 纯函数：本地解码
// ══════════════════════════════════════════════════════════

test('decodeTokenPayload：解出载荷；任何畸形输入都返回 null 而不是抛错', () => {
  const payload = decodeTokenPayload(makeJwt(120))
  assert.equal(payload.type, 'access')
  assert.equal(typeof payload.exp, 'number')

  // 它会被**每个请求**调用一次，抛错等于整站不可用 —— 因此所有畸形输入都必须安全
  for (const bad of [null, undefined, '', 'a.b', 'a.b.c.d', 'not-a-jwt', 'a.!!!.c', 123, {}]) {
    assert.equal(decodeTokenPayload(bad), null, `输入 ${JSON.stringify(bad)} 应返回 null`)
  }
})

test('getAccessTokenRemainingMs：默认读 localStorage 里的 access token', () => {
  resetStorage()
  assert.equal(getAccessTokenRemainingMs(), null, '没有 token 时返回 null（调用方按「不知道」处理）')

  setAccessToken(makeJwt(120))
  const remaining = getAccessTokenRemainingMs()
  assert.ok(remaining > 110_000 && remaining <= 120_000, `应在 120 秒附近，实际 ${remaining}`)

  // 已过期的 token：返回负数，而不是 null —— null 表示「不知道」，负数表示「确定过期了」
  setAccessToken(makeJwt(-10))
  assert.ok(getAccessTokenRemainingMs() < 0)
})

test('getAccessTokenRemainingMs：无 exp 的载荷返回 null', () => {
  resetStorage()
  setAccessToken(`${b64url({ alg: 'HS256' })}.${b64url({ uuid: 'u-1' })}.sig`)
  assert.equal(getAccessTokenRemainingMs(), null)
})

// ══════════════════════════════════════════════════════════
// 主动刷新：请求序列
// ══════════════════════════════════════════════════════════

test('即将过期：先刷新再发请求 —— 不再有白跑的 401', async () => {
  const { server, state, port } = await startStub()
  try {
    resetStorage()
    // 5 秒后过期，落在 30 秒的提前量里
    setAccessToken(makeJwt(5))
    setRefreshToken('refresh-1')

    const { default: requests } = await freshRequestModule(`http://127.0.0.1:${port}`)
    const result = await requests.get('/protected')

    assert.equal(result.success, true, `应直接成功，实际 ${JSON.stringify(result)}`)

    const urls = state.requests.map((r) => r.url)
    // 关键断言：**没有**那次 401。旧行为是 ['/protected', '/user/refreshToken', '/protected']
    assert.deepEqual(
      urls,
      ['/user/refreshToken', '/protected'],
      `请求序列应为「先刷新再请求」，实际：${urls.join(' -> ')}`
    )
    assert.equal(state.requests[1].auth, 'Bearer access-2', '实际请求要带刷新后的新 token')
    assert.equal(getAccessToken(), 'access-2', '新 token 应已落库')
  } finally {
    server.close()
  }
})

test('还有很久才过期：不刷新，只发一次请求', async () => {
  const { server, state, port } = await startStub()
  try {
    resetStorage()
    // 10 分钟后过期，远离 30 秒提前量
    const longLived = makeJwt(600)
    setAccessToken(longLived)
    setRefreshToken('refresh-1')

    const { default: requests } = await freshRequestModule(`http://127.0.0.1:${port}`)
    // 桩认的是 access-1，这里换成自己的长寿命 token，改成让桩接受它
    state.validAccess = longLived

    const result = await requests.get('/protected')
    assert.equal(result.success, true)

    const urls = state.requests.map((r) => r.url)
    assert.deepEqual(urls, ['/protected'], `不该有刷新请求，实际：${urls.join(' -> ')}`)
  } finally {
    server.close()
  }
})

test('没有 refresh token：不尝试刷新（否则只是白跑一趟）', async () => {
  const { server, state, port } = await startStub()
  try {
    resetStorage()
    setAccessToken(makeJwt(5))
    // 故意不设 refresh token

    const { default: requests } = await freshRequestModule(`http://127.0.0.1:${port}`)
    await requests.get('/protected').catch(() => {})

    const urls = state.requests.map((r) => r.url)
    assert.equal(urls.includes('/user/refreshToken'), false, `不该发刷新请求，实际：${urls.join(' -> ')}`)
  } finally {
    server.close()
  }
})

test('主动刷新失败：请求照常发出，且**不会**紧接着再刷一次（短路 + 冷却）', async () => {
  const { server, state, port } = await startStub()
  try {
    resetStorage()
    setAccessToken(makeJwt(5))
    setRefreshToken('refresh-1')
    state.refreshMode = 'fail'

    const { default: requests } = await freshRequestModule(`http://127.0.0.1:${port}`)
    await requests.get('/protected').catch(() => {})

    const refreshCount = state.requests.filter((r) => r.url.startsWith('/user/refreshToken')).length
    // 旧行为会「主动刷新失败 → 401 → 再刷新」共 2 次刷新；冷却期把它压成 1 次
    assert.equal(refreshCount, 1, `刷新只应发生一次，实际 ${refreshCount} 次：${state.requests.map((r) => r.url).join(' -> ')}`)

    // 而且请求确实发出去了（主动刷新只是优化，不能变成新的失败点）
    const protectedCount = state.requests.filter((r) => r.url.startsWith('/protected')).length
    assert.equal(protectedCount, 1, '原请求仍应发出')
  } finally {
    server.close()
  }
})

test('主动刷新失败后的下一次请求：仍不发刷新（冷却期内）', async () => {
  const { server, state, port } = await startStub()
  try {
    resetStorage()
    setAccessToken(makeJwt(5))
    setRefreshToken('refresh-1')
    state.refreshMode = 'fail'

    const { default: requests } = await freshRequestModule(`http://127.0.0.1:${port}`)
    await requests.get('/protected').catch(() => {})
    const afterFirst = state.requests.length

    await requests.get('/protected').catch(() => {})

    const refreshAfter = state.requests
      .slice(afterFirst)
      .filter((r) => r.url.startsWith('/user/refreshToken')).length
    assert.equal(refreshAfter, 0, '冷却期内不该再发刷新请求')
  } finally {
    server.close()
  }
})

test('主动刷新：单飞 —— 并发请求只触发一次刷新', async () => {
  const { server, state, port } = await startStub()
  try {
    resetStorage()
    setAccessToken(makeJwt(5))
    setRefreshToken('refresh-1')

    const { default: requests } = await freshRequestModule(`http://127.0.0.1:${port}`)
    await Promise.all([
      requests.get('/protected'),
      requests.get('/protected'),
      requests.get('/protected'),
    ])

    const refreshCount = state.requests.filter((r) => r.url.startsWith('/user/refreshToken')).length
    assert.equal(refreshCount, 1, `并发时应只刷新一次，实际 ${refreshCount} 次`)
  } finally {
    server.close()
  }
})

test('主动刷新**不是**新的失败点：刷新请求自身不会递归刷新', async () => {
  const { server, state, port } = await startStub()
  try {
    resetStorage()
    setAccessToken(makeJwt(5))
    setRefreshToken('refresh-1')

    const { default: requests } = await freshRequestModule(`http://127.0.0.1:${port}`)
    await requests.get('/protected')

    // 刷新请求带的是 Authorization，因此拦截器第一步（alreadySet）就返回了，
    // 不会进入主动刷新分支 —— 这里断言它确实只发生了一次
    const refreshCount = state.requests.filter((r) => r.url.startsWith('/user/refreshToken')).length
    assert.equal(refreshCount, 1)
  } finally {
    server.close()
  }
})

test('401 兜底路径仍然可用：主动刷新判断不到时（时钟偏差/服务端提前失效）照旧恢复', async () => {
  const { server, state, port } = await startStub()
  try {
    resetStorage()
    // 本地看「还有很久才过期」，但服务端已经拒绝它 —— 主动刷新不会触发
    setAccessToken(makeJwt(600))
    setRefreshToken('refresh-1')
    state.validAccess = 'something-else'

    const { default: requests } = await freshRequestModule(`http://127.0.0.1:${port}`)
    const result = await requests.get('/protected')

    assert.equal(result.success, true, `应靠 401 兜底恢复，实际 ${JSON.stringify(result)}`)

    const urls = state.requests.map((r) => r.url)
    assert.deepEqual(
      urls,
      ['/protected', '/user/refreshToken', '/protected'],
      `兜底序列应保持原样，实际：${urls.join(' -> ')}`
    )
  } finally {
    server.close()
  }
})

test('登录后清掉刷新失败记录：冷却期不该挡住一次新的登录会话', async () => {
  const { server, state, port } = await startStub()
  try {
    resetStorage()
    setAccessToken(makeJwt(5))
    setRefreshToken('refresh-1')
    state.refreshMode = 'fail'

    const { default: requests } = await freshRequestModule(`http://127.0.0.1:${port}`)
    await requests.get('/protected').catch(() => {}) // 让冷却期生效

    // 重新登录：响应头里带上全新的 Access-Token，拦截器应据此清掉失败记录
    state.refreshMode = 'ok'
    await requests.post('/login')
    assert.equal(getAccessToken(), 'access-from-login', '登录下发的新 token 应已落库')

    // 换成「即将过期」的 token 再发一次请求：这次应该允许刷新
    const before = state.requests.length
    setAccessToken(makeJwt(5))
    await requests.get('/protected').catch(() => {})

    const retried = state.requests.slice(before).filter((r) => r.url.startsWith('/user/refreshToken')).length
    assert.equal(retried, 1, '拿到新凭据后应重新允许刷新，不该仍被冷却期挡住')
  } finally {
    server.close()
  }
})
