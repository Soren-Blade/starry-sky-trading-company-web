import test from 'node:test'
import assert from 'node:assert/strict'

import {
  installStorageStub,
  installDomStub,
  resetStorage,
  loadAppModule,
  setTestEnv,
} from './setup.js'

// 存储与 DOM 桩都必须在被测模块被导入前装好
installStorageStub()
installDomStub()

const { createPinia, setActivePinia } = await import('pinia')
const { useUserStore } = await loadAppModule('/stores/user.js')
const api = (await loadAppModule('/api/index.js')).default
const { setAccessToken, setRefreshToken, getAccessToken, setTokensFromHeaders } =
  await loadAppModule('/hooks/useToken/index.js')

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

// ── 记住我 ─────────────────────────────────────────────────

const REFRESH_KEY = 'REFRESH_TOKEN'
const REMEMBER_KEY = 'SSTC_REMEMBER_ME'
const IDENTIFIER_KEY = 'SSTC_LAST_IDENTIFIER'

test('login：记住我不发给服务端（纯客户端偏好，不该混进请求体）', async () => {
  const store = freshStore()
  let received = null
  const restore = stubApi({
    login: async (payload) => {
      received = payload
      return { success: true }
    },
    getUserInfo: async () => ({ success: true, data: REGISTERED }),
  })
  try {
    await store.login({
      login_type: 'username',
      username: 'alice',
      password: 'pw',
      rememberMe: true,
    })
    assert.equal('rememberMe' in received, false, `请求体不应含 rememberMe：${JSON.stringify(received)}`)
    assert.equal(received.username, 'alice')
    assert.equal(received.password, 'pw')
  } finally {
    restore()
  }
})

test('login：勾选记住我后，refresh token 被持久化到 localStorage', async () => {
  const store = freshStore()
  const restore = stubApi({
    login: async () => {
      // 模拟响应拦截器：token 通过响应头写入（默认只进 sessionStorage）
      setTokensFromHeaders({ 'access-token': 'a1', 'refresh-token': 'r1' })
      return { success: true }
    },
    getUserInfo: async () => ({ success: true, data: REGISTERED }),
  })
  try {
    await store.login({
      login_type: 'email',
      email: 'alice@example.com',
      password: 'pw',
      rememberMe: true,
    })

    assert.equal(globalThis.sessionStorage.getItem(REFRESH_KEY), 'r1')
    assert.equal(globalThis.localStorage.getItem(REFRESH_KEY), 'r1', '勾选后应持久化')
    assert.equal(globalThis.localStorage.getItem(REMEMBER_KEY), '1')
    assert.equal(globalThis.localStorage.getItem(IDENTIFIER_KEY), 'alice@example.com', '应记住用户填的账号')
  } finally {
    restore()
  }
})

test('login：不勾选记住我时保持会话级', async () => {
  const store = freshStore()
  const restore = stubApi({
    login: async () => {
      setTokensFromHeaders({ 'access-token': 'a1', 'refresh-token': 'r1' })
      return { success: true }
    },
    getUserInfo: async () => ({ success: true, data: REGISTERED }),
  })
  try {
    await store.login({ login_type: 'username', username: 'alice', password: 'pw' })

    assert.equal(globalThis.sessionStorage.getItem(REFRESH_KEY), 'r1')
    assert.equal(globalThis.localStorage.getItem(REFRESH_KEY), null, '默认不应持久化')
    assert.equal(globalThis.localStorage.getItem(REMEMBER_KEY), null)
  } finally {
    restore()
  }
})

test('login：记住我必须生效在 getUserInfo 之前（否则续期会把持久化冲掉）', async () => {
  const store = freshStore()
  const restore = stubApi({
    login: async () => {
      setTokensFromHeaders({ 'access-token': 'a1', 'refresh-token': 'r1' })
      return { success: true }
    },
    // getUserInfo 里模拟一次静默续期：这类请求会带上新的 refresh token
    getUserInfo: async () => {
      setTokensFromHeaders({ 'access-token': 'a2', 'refresh-token': 'r2' })
      return { success: true, data: REGISTERED }
    },
  })
  try {
    await store.login({
      login_type: 'username',
      username: 'alice',
      password: 'pw',
      rememberMe: true,
    })

    // 若 applyRememberMe 排在 getUserInfo 之后，续期时看到的还是
    // 「localStorage 里没有 refresh token」的旧状态，会被写成会话级，
    // r2 就不会出现在 localStorage 里 —— 那正是「勾了记住我却不生效」的成因。
    assert.equal(globalThis.localStorage.getItem(REFRESH_KEY), 'r2')
    assert.equal(globalThis.sessionStorage.getItem(REFRESH_KEY), 'r2')
  } finally {
    restore()
  }
})

test('login：登录失败时不写入任何记忆（不能把失败当成功记住）', async () => {
  const store = freshStore()
  const restore = stubApi({
    login: async () => ({ success: false, message: '用户名或密码错误' }),
  })
  try {
    const result = await store.login({
      login_type: 'username',
      username: 'alice',
      password: 'bad',
      rememberMe: true,
    })

    assert.equal(result.success, false)
    assert.equal(globalThis.localStorage.getItem(REFRESH_KEY), null)
    assert.equal(globalThis.localStorage.getItem(REMEMBER_KEY), null)
    assert.equal(globalThis.localStorage.getItem(IDENTIFIER_KEY), null)
  } finally {
    restore()
  }
})

// ── 「记住我」的真实验收：模拟浏览器重启 ────────────────────
//
// 关掉浏览器 = sessionStorage 清空 + localStorage 保留。
// 这两条用例用 `init()` 的实际分支来证明「记住我」真的改变了结果 ——
// 单元测试里断言几个键当然也能证明写入正确，但证明不了
// 「下次打开会发生什么」，而后者才是用户报的那个问题。

/** 造一次「重启后的新页面」：新 pinia + 新 store，但**不清存储** */
const reopenedPage = async () => {
  setActivePinia(createPinia())
  return useUserStore()
}

test('记住我（勾选）：浏览器重启后仍是登录态，而不是降级成游客', async () => {
  // 第一次访问：勾选「记住我」登录
  const first = freshStore()
  const restoreLogin = stubApi({
    login: async () => {
      setTokensFromHeaders({ 'access-token': 'a1', 'refresh-token': 'r1' })
      return { success: true }
    },
    getUserInfo: async () => ({ success: true, data: REGISTERED }),
  })
  await first.login({
    login_type: 'username',
    username: 'alice',
    password: 'pw',
    rememberMe: true,
  })
  restoreLogin()

  // 关掉浏览器：sessionStorage 随之消失，localStorage 留着
  globalThis.sessionStorage.clear()
  assert.equal(globalThis.localStorage.getItem(REFRESH_KEY), 'r1', '持久化的那份应还在')

  // 重新打开页面
  const second = await reopenedPage()
  const visited = []
  const restoreInit = stubApi({
    getUserInfo: async () => {
      visited.push('getUserInfo')
      return { success: true, data: REGISTERED }
    },
    visitorLogin: async () => {
      visited.push('visitorLogin')
      return { success: true, data: { is_new_user: false } }
    },
  })
  try {
    await second.init()

    assert.deepEqual(visited, ['getUserInfo'], '应走「复用已有身份」的分支，而不是重新做游客登录')
    assert.equal(second.isLoggedIn, true, '重启后仍应是登录态')
  } finally {
    restoreInit()
  }
})

test('记住我（不勾选）：浏览器重启后降级为游客 —— 这才是「不记住」的含义', async () => {
  const first = freshStore()
  const restoreLogin = stubApi({
    login: async () => {
      setTokensFromHeaders({ 'access-token': 'a1', 'refresh-token': 'r1' })
      return { success: true }
    },
    getUserInfo: async () => ({ success: true, data: REGISTERED }),
  })
  await first.login({
    login_type: 'username',
    username: 'alice',
    password: 'pw',
    rememberMe: false,
  })
  restoreLogin()

  // 关掉浏览器
  globalThis.sessionStorage.clear()

  const second = await reopenedPage()
  const visited = []
  const restoreInit = stubApi({
    // 重启后拿到的是**新建的游客身份**，因此这里必须回游客行；
    // 回 REGISTERED 会让用例自欺（isLoggedIn 会变成 true，与真实行为不符）
    getUserInfo: async () => {
      visited.push('getUserInfo')
      return { success: true, data: GUEST }
    },
    visitorLogin: async () => {
      visited.push('visitorLogin')
      return { success: true, data: { is_new_user: true } }
    },
  })
  try {
    await second.init()

    // init() 在游客登录成功后还会再拉一次用户信息，因此两个都会出现；
    // 关键是**第一个**是 visitorLogin —— 说明走的是「重新建档」而不是「复用身份」。
    assert.equal(visited[0], 'visitorLogin', '没有长效凭据时应重新以游客身份初始化')
    assert.ok(visited.includes('visitorLogin'))
    assert.equal(second.isLoggedIn, false, '不勾选就不该在重启后仍是登录态')
    assert.equal(second.isGuest, true)
  } finally {
    restoreInit()
  }
})

// ── 头像：URL 解析与上传 ────────────────────────────────────

test('avatarUrl getter：外部绝对地址原样返回', () => {
  const store = freshStore()
  store.userInfo = REGISTERED
  assert.equal(store.avatarUrl, 'https://example.invalid/a.png')
})

test('avatarUrl getter：空值返回空串（不渲染出 src="undefined"）', () => {
  const store = freshStore()
  store.userInfo = { id: 1, user_type: 'registered' }
  assert.equal(store.avatarUrl, '')
  store.userInfo = { id: 1, user_type: 'registered', avatar_url: null }
  assert.equal(store.avatarUrl, '')
})

test('avatarUrl getter：dev（base 为空）下站内相对路径保持同源，交给 Vite 代理', () => {
  const store = freshStore()
  store.userInfo = { id: 1, user_type: 'registered', avatar_url: '/uploads/avatars/u1-x.webp' }
  assert.equal(store.avatarUrl, '/uploads/avatars/u1-x.webp')
})

test('avatarUrl getter：生产（base 有值）下补上后端基地址，否则会打到 web 域名 404', () => {
  const previous = globalThis.__SSTC_TEST_ENV__.VITE_API_BASE_URL
  setTestEnv({ VITE_API_BASE_URL: 'https://api.example.com' })

  try {
    const store = freshStore()
    store.userInfo = { id: 1, user_type: 'registered', avatar_url: '/uploads/avatars/u1-x.webp' }
    assert.equal(store.avatarUrl, 'https://api.example.com/uploads/avatars/u1-x.webp')
  } finally {
    setTestEnv({ VITE_API_BASE_URL: previous })
  }
})

test('uploadAvatar：成功后把服务端回写的相对路径并入 userInfo', async () => {
  const store = freshStore()
  store.userInfo = { ...REGISTERED, avatar_url: '/uploads/avatars/u42-old.png' }

  let received = null
  const restore = stubApi({
    uploadAvatar: async (payload) => {
      received = payload
      return {
        success: true,
        message: '头像已更新',
        data: { avatar_url: '/uploads/avatars/u42-new.webp' },
      }
    },
  })
  try {
    const result = await store.uploadAvatar('data:image/webp;base64,AAAA')
    assert.equal(result.success, true)
    assert.equal(result.avatarUrl, '/uploads/avatars/u42-new.webp')
    assert.deepEqual(received, { image: 'data:image/webp;base64,AAAA' })
    // 存的是**相对路径**（不是解析后的绝对地址）—— 换域名不该需要刷历史数据
    assert.equal(store.userInfo.avatar_url, '/uploads/avatars/u42-new.webp')
    assert.equal(store.avatarUrl, '/uploads/avatars/u42-new.webp', 'dev 下应可直接加载')
  } finally {
    restore()
  }
})

test('uploadAvatar：服务端返回失败时保留原头像，不改本地状态', async () => {
  const store = freshStore()
  store.userInfo = { ...REGISTERED, avatar_url: '/uploads/avatars/u42-old.png' }

  const restore = stubApi({
    uploadAvatar: async () => ({ success: false, message: '只支持 JPG / PNG / WebP 格式的图片' }),
  })
  try {
    const result = await store.uploadAvatar('data:image/gif;base64,AAAA')
    assert.equal(result.success, false)
    assert.match(result.message, /JPG/)
    assert.equal(store.userInfo.avatar_url, '/uploads/avatars/u42-old.png', '失败不应清掉原头像')
  } finally {
    restore()
  }
})

test('uploadAvatar：请求抛异常时返回失败而不是抛出', async () => {
  const store = freshStore()
  store.userInfo = { ...REGISTERED }

  const restore = stubApi({
    uploadAvatar: async () => {
      const error = new Error('图片超过 512 KB，请压缩后再上传')
      error.status = 400
      throw error
    },
  })
  try {
    const result = await store.uploadAvatar('data:image/png;base64,AAAA')
    assert.equal(result.success, false)
    assert.match(result.message, /512 KB/)
  } finally {
    restore()
  }
})

test('uploadAvatar：响应缺少 avatar_url 时按失败处理（不能写入 undefined）', async () => {
  const store = freshStore()
  store.userInfo = { ...REGISTERED, avatar_url: '/uploads/avatars/u42-old.png' }

  const restore = stubApi({
    uploadAvatar: async () => ({ success: true, data: {} }),
  })
  try {
    const result = await store.uploadAvatar('data:image/png;base64,AAAA')
    assert.equal(result.success, false)
    assert.equal(store.userInfo.avatar_url, '/uploads/avatars/u42-old.png')
  } finally {
    restore()
  }
})
