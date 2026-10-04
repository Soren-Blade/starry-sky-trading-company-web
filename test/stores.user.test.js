import test from 'node:test'
import assert from 'node:assert/strict'

import { installStorageStub, installDomStub, resetStorage, loadAppModule } from './setup.js'

// 存储与 DOM 桩都必须在被测模块被导入前装好
installStorageStub()
installDomStub()

const { createPinia, setActivePinia } = await import('pinia')
const { useUserStore } = await loadAppModule('/stores/user.js')
const api = (await loadAppModule('/api/index.js')).default
const { setAccessToken, setRefreshToken, getAccessToken } = await loadAppModule(
  '/hooks/useToken/index.js'
)

/** 用 stub 替换 api 上的方法，返回恢复函数 */
function stubApi(methods) {
  const originals = {}
  for (const [name, fn] of Object.entries(methods)) {
    originals[name] = api[name]
    api[name] = fn
  }
  return () => {
    for (const [name, fn] of Object.entries(originals)) api[name] = fn
  }
}

/** 每次测试拿到干净的 store */
function freshStore() {
  resetStorage()
  setActivePinia(createPinia())
  return useUserStore()
}

const GUEST = { id: 7, uuid: 'uuid-guest', user_type: 'guest', nickname: '访客' }
const REGISTERED = {
  id: 42,
  uuid: 'uuid-reg',
  user_type: 'registered',
  nickname: '张三',
  avatar_url: 'https://example.invalid/a.png',
}

// ── getters ────────────────────────────────────────────────

test('isLoggedIn：只有 user_type === "registered" 才算已登录', () => {
  const store = freshStore()

  store.userInfo = GUEST
  assert.equal(store.isLoggedIn, false, '游客不算已登录（否则登录入口会消失）')
  assert.equal(store.isGuest, true)

  store.userInfo = REGISTERED
  assert.equal(store.isLoggedIn, true)
  assert.equal(store.isGuest, false)
})

test('isLoggedIn：空 userInfo 时为 false', () => {
  const store = freshStore()
  assert.equal(store.isLoggedIn, false)
  assert.equal(store.isGuest, false)
})

test('userId / nickname / avatarUrl：有默认值兜底', () => {
  const store = freshStore()
  assert.equal(store.userId, null)
  assert.equal(store.nickname, '')
  assert.equal(store.avatarUrl, '')

  store.userInfo = REGISTERED
  assert.equal(store.userId, 42)
  assert.equal(store.nickname, '张三')
  assert.equal(store.avatarUrl, 'https://example.invalid/a.png')
})

test('nickname：空字符串回退为默认（而非 undefined）', () => {
  const store = freshStore()
  store.userInfo = { id: 1, user_type: 'registered', nickname: '' }
  assert.equal(store.nickname, '')
})

// ── getUserInfo ────────────────────────────────────────────

test('getUserInfo：成功时写入 userInfo 并返回 true', async () => {
  const store = freshStore()
  const restore = stubApi({ getUserInfo: async () => ({ success: true, data: REGISTERED }) })
  try {
    assert.equal(await store.getUserInfo(), true)
    assert.deepEqual(store.userInfo, REGISTERED)
  } finally {
    restore()
  }
})

test('getUserInfo：success 但无 data 时返回 false 且不污染状态', async () => {
  const store = freshStore()
  const restore = stubApi({ getUserInfo: async () => ({ success: true }) })
  try {
    assert.equal(await store.getUserInfo(), false)
    assert.deepEqual(store.userInfo, {})
  } finally {
    restore()
  }
})

test('getUserInfo：抛错时返回 false 且不抛出（首屏不应因后端不可用而崩）', async () => {
  const store = freshStore()
  const restore = stubApi({
    getUserInfo: async () => {
      throw new Error('网络错误')
    },
  })
  try {
    assert.equal(await store.getUserInfo(), false)
  } finally {
    restore()
  }
})

// ── login ──────────────────────────────────────────────────

test('login：成功后返回 success 并接着拉取用户信息', async () => {
  const store = freshStore()
  let called = 0
  const restore = stubApi({
    login: async () => ({ success: true, message: '登录成功' }),
    getUserInfo: async () => {
      called += 1
      return { success: true, data: REGISTERED }
    },
  })
  try {
    const result = await store.login({ login_type: 'username', username: 'a', password: 'b' })
    assert.deepEqual(result, { success: true, message: '登录成功' })
    assert.equal(called, 1, '登录后应拉一次用户信息')
    assert.equal(store.isLoggedIn, true)
  } finally {
    restore()
  }
})

test('login：业务失败时返回服务端 message', async () => {
  const store = freshStore()
  const restore = stubApi({
    login: async () => ({ success: false, message: '用户名或密码错误' }),
  })
  try {
    const result = await store.login({ login_type: 'username', username: 'a', password: 'x' })
    assert.deepEqual(result, { success: false, message: '用户名或密码错误' })
    assert.equal(store.isLoggedIn, false)
  } finally {
    restore()
  }
})

test('login：网络异常时返回兜底文案而不是抛错', async () => {
  const store = freshStore()
  const restore = stubApi({
    login: async () => {
      throw new Error('timeout of 15000ms exceeded')
    },
  })
  try {
    const result = await store.login({ login_type: 'username', username: 'a', password: 'x' })
    assert.equal(result.success, false)
    assert.equal(result.message, 'timeout of 15000ms exceeded')
  } finally {
    restore()
  }
})

test('login：异常且无 message 时有兜底文案', async () => {
  const store = freshStore()
  const restore = stubApi({
    login: async () => {
      throw {}
    },
  })
  try {
    const result = await store.login({ login_type: 'username', username: 'a', password: 'x' })
    assert.equal(result.success, false)
    assert.equal(result.message, '登录失败，请稍后重试')
  } finally {
    restore()
  }
})

// ── register ───────────────────────────────────────────────

test('register：成功时不自动登录（只返回结果）', async () => {
  const store = freshStore()
  let infoCalls = 0
  const restore = stubApi({
    register: async () => ({ success: true, message: '用户注册成功 - 请登录' }),
    getUserInfo: async () => {
      infoCalls += 1
      return { success: true, data: REGISTERED }
    },
  })
  try {
    const result = await store.register({ username: 'a', email: 'a@b.com', password: 'x' })
    assert.equal(result.success, true)
    assert.equal(result.message, '用户注册成功 - 请登录')
    assert.equal(infoCalls, 0, '注册后不应自动拉用户信息')
    assert.equal(store.isLoggedIn, false)
  } finally {
    restore()
  }
})

test('register：失败时返回服务端 message', async () => {
  const store = freshStore()
  const restore = stubApi({
    register: async () => ({ success: false, message: '用户名已被占用，请更换后重试' }),
  })
  try {
    const result = await store.register({ username: 'a', password: 'x' })
    assert.equal(result.message, '用户名已被占用，请更换后重试')
  } finally {
    restore()
  }
})

// ── init ───────────────────────────────────────────────────

test('init：本地有 token 且 getUserInfo 成功时，不再调 visitorLogin', async () => {
  const store = freshStore()
  setAccessToken('a')
  setRefreshToken('r')

  let visitorCalls = 0
  const restore = stubApi({
    getUserInfo: async () => ({ success: true, data: REGISTERED }),
    visitorLogin: async () => {
      visitorCalls += 1
      return { success: true }
    },
  })
  try {
    await store.init()
    assert.equal(visitorCalls, 0)
    assert.equal(store.isLoggedIn, true)
    assert.equal(store.initialized, true)
    assert.equal(store.initializing, false)
  } finally {
    restore()
  }
})

test('init：token 失效时清理凭据并回退到游客登录', async () => {
  const store = freshStore()
  setAccessToken('stale-a')
  setRefreshToken('stale-r')

  // 第一次 getUserInfo（拿旧 token）失败；清理凭据后游客登录，第二次成功
  let infoCalls = 0
  let visitorCalls = 0
  const restore = stubApi({
    getUserInfo: async () => {
      infoCalls += 1
      if (infoCalls === 1) throw new Error('401 Unauthorized')
      return { success: true, data: GUEST }
    },
    visitorLogin: async () => {
      visitorCalls += 1
      return { success: true }
    },
  })
  try {
    await store.init()
    assert.equal(infoCalls, 2, '第一次失败后应清理 token，再以游客身份重试')
    assert.equal(visitorCalls, 1)
    assert.equal(store.isGuest, true)
    assert.equal(store.isLoggedIn, false)
  } finally {
    restore()
  }
})

test('init：token 失效回退时确实清理了本地凭据', async () => {
  const store = freshStore()
  setAccessToken('stale-a')
  setRefreshToken('stale-r')

  let visitorCalls = 0
  const restore = stubApi({
    getUserInfo: async () => {
      // 旧 token 已失效：只有本地凭据被清掉之后才允许成功
      if (getAccessToken()) throw new Error('401 Unauthorized')
      return { success: true, data: GUEST }
    },
    visitorLogin: async () => {
      visitorCalls += 1
      return { success: true }
    },
  })
  try {
    await store.init()
    assert.equal(visitorCalls, 1, '应走游客登录')
    assert.equal(getAccessToken(), null, '旧 token 应被清理')
  } finally {
    restore()
  }
})

test('init：无 token 时直接走游客登录', async () => {
  const store = freshStore()
  let visitorCalls = 0
  const restore = stubApi({
    getUserInfo: async () => ({ success: true, data: GUEST }),
    visitorLogin: async () => {
      visitorCalls += 1
      return { success: true }
    },
  })
  try {
    await store.init()
    assert.equal(visitorCalls, 1)
    assert.equal(store.isGuest, true)
  } finally {
    restore()
  }
})

test('init：visitorLogin 失败时不抛错，状态标记为已初始化', async () => {
  const store = freshStore()
  const restore = stubApi({
    visitorLogin: async () => {
      throw new Error('后端不可用')
    },
  })
  try {
    await assert.doesNotReject(() => store.init())
    assert.equal(store.initializing, false)
    assert.equal(store.initialized, true)
    assert.equal(store.isLoggedIn, false)
  } finally {
    restore()
  }
})

test('init：初始化的失败不应把 initialized 卡在 false', async () => {
  const store = freshStore()
  const restore = stubApi({
    visitorLogin: async () => {
      throw new Error('boom')
    },
  })
  try {
    await store.init()
    // finally 块必须执行
    assert.equal(store.initialized, true)
    assert.equal(store.initializing, false)
  } finally {
    restore()
  }
})

test('init：重复调用时第二次立即返回（initializing 守卫）', async () => {
  const store = freshStore()
  let visitorCalls = 0
  const restore = stubApi({
    getUserInfo: async () => ({ success: true, data: GUEST }),
    visitorLogin: async () => {
      visitorCalls += 1
      await new Promise((r) => { setTimeout(r, 10) })
      return { success: true }
    },
  })
  try {
    // 注意：该守卫只在初始化尚未完成时生效；完成后仍会重新走一遍，
    // 因此这里断言的是「并发调用被合并」而不是「永远只调一次」。
    await Promise.all([store.init(), store.init()])
    assert.equal(visitorCalls, 1, '并发初始化应被合并为一次')
  } finally {
    restore()
  }
})

// ── logout ─────────────────────────────────────────────────

test('logout：清理凭据与用户状态，并回到游客身份', async () => {
  const store = freshStore()
  setAccessToken('a')
  setRefreshToken('r')
  store.userInfo = REGISTERED

  const restore = stubApi({
    getUserInfo: async () => ({ success: true, data: GUEST }),
    visitorLogin: async () => ({ success: true }),
  })
  try {
    await store.logout()
    assert.equal(getAccessToken(), null, 'access token 应被清空')
    assert.equal(store.isGuest, true, '退出后应回到游客身份')
    assert.equal(store.isLoggedIn, false)
  } finally {
    restore()
  }
})

test('logout：清空 userInfo 后才重新 init', async () => {
  const store = freshStore()
  store.userInfo = REGISTERED

  const seen = []
  const restore = stubApi({
    getUserInfo: async () => {
      seen.push(JSON.stringify(store.userInfo))
      return { success: true, data: GUEST }
    },
    visitorLogin: async () => ({ success: true }),
  })
  try {
    await store.logout()
    // 第一次 getUserInfo 针对的是清空后的状态
    assert.equal(seen[0], '{}')
  } finally {
    restore()
  }
})
