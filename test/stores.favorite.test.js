import test from 'node:test'
import assert from 'node:assert/strict'

import { installStorageStub, installDomStub, loadAppModule } from './setup.js'

installStorageStub()
installDomStub()

const { createPinia, setActivePinia } = await import('pinia')
const { useFavoriteStore } = await loadAppModule('/stores/favorite.js')
const { useUserStore } = await loadAppModule('/stores/user.js')
const api = (await loadAppModule('/api/index.js')).default

const TOOL_FAVORITES_KEY = 'SSTC_TOOL_FAVORITES'

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

/** 造一个「已登录」的 user store（isLoggedIn 是 getter，看 user_type） */
function signIn(id = 42) {
  const userStore = useUserStore()
  userStore.userInfo = { id, uuid: `uuid-${id}`, user_type: 'registered' }
  return userStore
}

function signOutAsGuest(id = 7) {
  const userStore = useUserStore()
  userStore.userInfo = { id, uuid: `guest-${id}`, user_type: 'guest' }
  return userStore
}

function freshStores() {
  setActivePinia(createPinia())
  return { favorite: useFavoriteStore(), user: useUserStore() }
}

const PRODUCT_FAVORITES = {
  success: true,
  data: {
    target_type: 'product',
    items: [
      { id: 1, target_type: 'product', target_id: 7, created_at: '2026-10-05T00:00:00Z', target: { id: 7, main_title: 'T恤' } },
    ],
    total: 1,
  },
}

const TOOL_FAVORITES = {
  success: true,
  data: {
    target_type: 'tool',
    items: [
      { id: 2, target_type: 'tool', target_id: 3, created_at: '2026-10-05T00:00:00Z', target: { id: 3, tool_name: '工具' } },
    ],
    total: 1,
  },
}

// ── 初始状态 ───────────────────────────────────────────────

test('state：初始形状固定', () => {
  const { favorite } = freshStores()
  assert.deepEqual(favorite.productIds, [])
  assert.deepEqual(favorite.toolIds, [])
  assert.equal(favorite.productCount, 0)
  assert.equal(favorite.loadedForUserId, null)
})

// ── 游客分支：工具收藏走 localStorage ──────────────────────

test('游客：工具收藏读写 localStorage（沿用改造前的 key，老数据不丢）', async () => {
  const { favorite } = freshStores()
  signOutAsGuest()

  localStorage.setItem(TOOL_FAVORITES_KEY, JSON.stringify([3, 5]))

  const loaded = await favorite.load()
  assert.equal(loaded.success, true)
  assert.deepEqual(favorite.toolIds, [3, 5])
  assert.deepEqual(favorite.productIds, [], '游客没有账号级商品收藏')
})

test('游客：localStorage 里是脏数据时退回空数组而不抛错', async () => {
  const { favorite } = freshStores()
  signOutAsGuest()

  for (const bad of ['not json', '{"a":1}', 'null', '"str"']) {
    localStorage.setItem(TOOL_FAVORITES_KEY, bad)
    const result = await favorite.load(true)
    assert.equal(result.success, true, `${bad} 不应导致失败`)
    assert.deepEqual(favorite.toolIds, [])
  }
})

test('游客：收藏工具写入 localStorage 并可取消', async () => {
  const { favorite } = freshStores()
  signOutAsGuest()

  const added = await favorite.toggleTool(9)
  assert.equal(added.success, true)
  assert.equal(added.favorited, true)
  // 必须真的落盘：刷新后要还在
  assert.deepEqual(JSON.parse(localStorage.getItem(TOOL_FAVORITES_KEY)), [9])
  assert.equal(favorite.isToolFavorited(9), true)

  const removed = await favorite.toggleTool(9)
  assert.equal(removed.favorited, false)
  assert.deepEqual(JSON.parse(localStorage.getItem(TOOL_FAVORITES_KEY)), [])
})

test('游客：收藏商品返回 needLogin，不写任何状态', async () => {
  const { favorite } = freshStores()
  signOutAsGuest()

  const result = await favorite.toggleProduct(7)
  assert.equal(result.success, false)
  assert.equal(result.needLogin, true)
  assert.deepEqual(favorite.productIds, [])
})

// ── 登录分支：服务端 ───────────────────────────────────────

test('登录：load 并行取商品与工具收藏，并同步 id 列表', async () => {
  const { favorite } = freshStores()
  signIn()

  const calls = []
  const restore = stubApi({
    getFavorites: async (params) => {
      calls.push(params.target_type)
      return params.target_type === 'product' ? PRODUCT_FAVORITES : TOOL_FAVORITES
    },
  })
  try {
    const result = await favorite.load()
    assert.equal(result.success, true)
    assert.deepEqual(calls.sort(), ['product', 'tool'])
    assert.deepEqual(favorite.productIds, [7])
    assert.deepEqual(favorite.toolIds, [3])
    assert.equal(favorite.productItems.length, 1)
    assert.equal(favorite.productItems[0].target.main_title, 'T恤')
    assert.equal(favorite.loadedForUserId, 'user:42')
  } finally {
    restore()
  }
})

test('登录：同一用户重复 load 直接返回（不重复请求）', async () => {
  const { favorite } = freshStores()
  signIn()

  let calls = 0
  const restore = stubApi({
    getFavorites: async (params) => {
      calls++
      return params.target_type === 'product' ? PRODUCT_FAVORITES : TOOL_FAVORITES
    },
  })
  try {
    await favorite.load()
    await favorite.load()
    assert.equal(calls, 2, '第二次应命中缓存，不该再发两个请求')

    await favorite.load(true)
    assert.equal(calls, 4, 'force 时必须强制重取')
  } finally {
    restore()
  }
})

test('登录：换账号后 load 会重新取（不会把上一个人的收藏显示给新账号）', async () => {
  const { favorite, user } = freshStores()
  signIn(42)

  let calls = 0
  const restore = stubApi({
    getFavorites: async (params) => {
      calls++
      return params.target_type === 'product' ? PRODUCT_FAVORITES : TOOL_FAVORITES
    },
  })
  try {
    await favorite.load()
    assert.equal(calls, 2)

    // 切到另一个账号
    user.userInfo = { id: 43, uuid: 'uuid-43', user_type: 'registered' }
    await favorite.load()
    assert.equal(calls, 4, '账号变了必须重新取，缓存键按 userId 区分')
  } finally {
    restore()
  }
})

test('登录：收藏商品走服务端并更新 id 列表', async () => {
  const { favorite } = freshStores()
  signIn()

  const received = []
  const restore = stubApi({
    addFavorite: async (payload) => {
      received.push(['add', payload])
      return { success: true, data: { favorited: true } }
    },
    removeFavorite: async (payload) => {
      received.push(['remove', payload])
      return { success: true, data: { favorited: false } }
    },
  })
  try {
    const added = await favorite.toggleProduct(11)
    assert.equal(added.favorited, true)
    assert.deepEqual(received[0], ['add', { target_type: 'product', target_id: 11 }])
    assert.equal(favorite.isProductFavorited(11), true)

    const removed = await favorite.toggleProduct(11)
    assert.equal(removed.favorited, false)
    assert.deepEqual(received[1], ['remove', { target_type: 'product', target_id: 11 }])
    assert.equal(favorite.isProductFavorited(11), false)
  } finally {
    restore()
  }
})

test('登录：服务端返回 success:false 时不动本地状态', async () => {
  const { favorite } = freshStores()
  signIn()
  favorite.productIds = [7]

  // 已收藏 → toggleProduct 会走 remove 分支，因此要打桩的是 removeFavorite
  const restore = stubApi({
    removeFavorite: async () => ({ success: false, message: '收藏失败' }),
  })
  try {
    const result = await favorite.toggleProduct(7)
    assert.equal(result.success, false)
    assert.equal(result.message, '收藏失败')
    assert.deepEqual(favorite.productIds, [7], '失败时不应把 id 从列表里删掉')
  } finally {
    restore()
  }
})

test('登录：请求抛异常时返回失败而不是抛出', async () => {
  const { favorite } = freshStores()
  signIn()

  const restore = stubApi({
    addFavorite: async () => {
      throw new Error('网络错误')
    },
  })
  try {
    const result = await favorite.toggleTool(1)
    assert.equal(result.success, false)
    assert.equal(result.message, '网络错误')
  } finally {
    restore()
  }
})

test('登录：工具收藏改走服务端，不再写 localStorage', async () => {
  const { favorite } = freshStores()
  signIn()

  const restore = stubApi({
    addFavorite: async () => ({ success: true, data: { favorited: true } }),
  })
  try {
    await favorite.toggleTool(5)
    assert.equal(favorite.isToolFavorited(5), true)
    assert.equal(localStorage.getItem(TOOL_FAVORITES_KEY), null, '登录态不应再写本机 key')
  } finally {
    restore()
  }
})

// ── toggle 分发与 reset ────────────────────────────────────

test('toggle：按类型分发，非法类型直接失败', async () => {
  const { favorite } = freshStores()
  signOutAsGuest()

  const other = await favorite.toggle('order', 1)
  assert.equal(other.success, false)

  const bad = await favorite.toggle('tool', 'abc')
  assert.equal(bad.success, false)
})

test('load：接口抛错时返回失败并记 error', async () => {
  const { favorite } = freshStores()
  signIn()

  const restore = stubApi({
    getFavorites: async () => {
      throw new Error('炸了')
    },
  })
  try {
    const result = await favorite.load()
    assert.equal(result.success, false)
    assert.equal(favorite.error, '炸了')
    assert.equal(favorite.loading, false, 'loading 必须在 finally 里复位')
  } finally {
    restore()
  }
})

test('reset：清空全部字段，使下次 load 一定重新取', async () => {
  const { favorite } = freshStores()
  signIn()
  favorite.productIds = [1]
  favorite.toolIds = [2]
  favorite.loadedForUserId = 'user:42'

  favorite.reset()
  assert.deepEqual(favorite.productIds, [])
  assert.deepEqual(favorite.toolIds, [])
  assert.equal(favorite.loadedForUserId, null)
})
