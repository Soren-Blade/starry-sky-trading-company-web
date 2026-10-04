import test from 'node:test'
import assert from 'node:assert/strict'

import { installStorageStub, installDomStub, loadAppModule } from './setup.js'

installStorageStub()
installDomStub()

const { createPinia, setActivePinia } = await import('pinia')
const { useKamiStore } = await loadAppModule('/stores/kami.js')
const api = (await loadAppModule('/api/index.js')).default

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

function freshStore() {
  setActivePinia(createPinia())
  return useKamiStore()
}

const CARDS = [
  { id: '1', card_no_display: 'A578****E4DA', status: 'unused', card_type: 'month' },
  { id: '2', card_no_display: 'B123****F5EB', status: 'used', card_type: 'year' },
]

// ── state 形状 ─────────────────────────────────────────────

test('state：初始形状固定（数组与对象分明）', () => {
  const store = freshStore()
  assert.ok(Array.isArray(store.userKamis))
  assert.equal(store.userKamis.length, 0)
  assert.equal(store.ownerUserId, null)
  assert.deepEqual(store.filters, { status: 'all', card_type: 'all', tool_id: null })
  assert.equal(store.pagination.page, 1)
  assert.equal(store.pagination.has_next, false)
  assert.equal(store.loading, false)
  assert.equal(store.error, null)
})

// ── setFilter ──────────────────────────────────────────────

test('setFilter：只接受已知的筛选键', () => {
  const store = freshStore()
  store.setFilter('status', 'unused')
  assert.equal(store.filters.status, 'unused')

  store.setFilter('不存在的键', 'x')
  assert.equal('不存在的键' in store.filters, false, '未知键不应被写入')
})

test('setFilter：tool_id 可以为 null（表示不过滤）', () => {
  const store = freshStore()
  store.setFilter('tool_id', 5)
  assert.equal(store.filters.tool_id, 5)
  store.setFilter('tool_id', null)
  assert.equal(store.filters.tool_id, null)
})

// ── fetchUserKamis：基本 ───────────────────────────────────

test('fetchUserKamis：缺少 userId 时直接失败且不发请求', async () => {
  const store = freshStore()
  let calls = 0
  const restore = stubApi({
    getUserCards: async () => {
      calls += 1
      return { success: true, data: { cards: [] } }
    },
  })
  try {
    assert.equal(await store.fetchUserKamis(null), false)
    assert.equal(await store.fetchUserKamis(0), false)
    assert.equal(await store.fetchUserKamis(''), false)
    assert.equal(calls, 0, '缺少身份不应发起请求')
    assert.equal(store.error, '缺少用户信息')
  } finally {
    restore()
  }
})

test('fetchUserKamis：缺少 userId 的提前返回也必须复位 loading', async () => {
  const store = freshStore()
  // 制造「上一次请求把 loading 留在 true」的状态（例如竞态或异常路径）
  store.loading = true

  assert.equal(await store.fetchUserKamis(null), false)
  assert.equal(store.loading, false, '提前返回路径不能把 loading 永久留在 true，否则加载指示器不消失')
})

test('fetchUserKamis：成功时写入列表与分页', async () => {
  const store = freshStore()
  const restore = stubApi({
    getUserCards: async () => ({
      success: true,
      data: {
        cards: CARDS,
        pagination: { page: 1, limit: 20, total: 2, total_pages: 1, has_next: false, has_prev: false },
      },
    }),
  })
  try {
    assert.equal(await store.fetchUserKamis(7), true)
    assert.equal(store.userKamis.length, 2)
    assert.equal(store.ownerUserId, 7)
    assert.equal(store.pagination.total, 2)
  } finally {
    restore()
  }
})

test('fetchUserKamis：分页与默认值合并（后端只返回部分字段）', async () => {
  const store = freshStore()
  const restore = stubApi({
    getUserCards: async () => ({ success: true, data: { cards: [], pagination: { page: 3, total: 50 } } }),
  })
  try {
    await store.fetchUserKamis(7)
    assert.equal(store.pagination.page, 3)
    assert.equal(store.pagination.total, 50)
    // 后端未返回的字段应保留默认值，而不是变成 undefined
    assert.equal(store.pagination.limit, 20)
    assert.equal(store.pagination.has_next, false)
  } finally {
    restore()
  }
})

// ── 用户切换时的重置（原实现会串数据） ──────────────────────

test('用户切换时清空列表与分页（避免展示上一个用户的数据）', async () => {
  const store = freshStore()
  let nth = 0
  const restore = stubApi({
    getUserCards: async () => {
      nth += 1
      return {
        success: true,
        data: {
          cards: nth === 1 ? CARDS : [{ id: '9', card_no_display: 'X' }],
          pagination: { page: nth === 1 ? 4 : 1, limit: 20, total: nth === 1 ? 80 : 1 },
        },
      }
    },
  })
  try {
    await store.fetchUserKamis(7)
    assert.equal(store.pagination.page, 4)

    // 换用户：请求发出前应先清空
    let snapshotDuringRequest = null
    const originalGet = api.getUserCards
    api.getUserCards = async (...args) => {
      snapshotDuringRequest = { cards: store.userKamis.length, page: store.pagination.page }
      return originalGet(...args)
    }

    await store.fetchUserKamis(8)
    assert.deepEqual(
      snapshotDuringRequest,
      { cards: 0, page: 1 },
      '发起新用户请求前应已清空上一个用户的列表与分页'
    )
    assert.equal(store.ownerUserId, 8)
    assert.equal(store.userKamis.length, 1)
  } finally {
    restore()
  }
})

test('同一用户再次请求时不重置（保留分页状态）', async () => {
  const store = freshStore()
  const restore = stubApi({
    getUserCards: async () => ({
      success: true,
      data: { cards: CARDS, pagination: { page: 3, limit: 20, total: 60 } },
    }),
  })
  try {
    await store.fetchUserKamis(7)
    await store.fetchUserKamis(7, { page: 3 })
    assert.equal(store.pagination.page, 3)
    assert.equal(store.userKamis.length, 2)
  } finally {
    restore()
  }
})

test('用户 id 数字与字符串混用时视为同一用户', async () => {
  const store = freshStore()
  let resetHappened = false
  const restore = stubApi({
    getUserCards: async () => ({
      success: true,
      data: { cards: CARDS, pagination: { page: 3, limit: 20, total: 60 } },
    }),
  })
  try {
    await store.fetchUserKamis(7)
    const originalGet = api.getUserCards
    api.getUserCards = async (...args) => {
      // 若发生重置，page 会回到 1
      resetHappened = store.pagination.page === 1
      return originalGet(...args)
    }
    await store.fetchUserKamis('7')
    assert.equal(resetHappened, false, '7 与 "7" 应视为同一用户，不触发重置')
  } finally {
    restore()
  }
})

test('首次请求（ownerUserId 为 null）不触发重置', async () => {
  const store = freshStore()
  const restore = stubApi({
    getUserCards: async () => ({ success: true, data: { cards: CARDS } }),
  })
  try {
    await store.fetchUserKamis(7)
    assert.equal(store.ownerUserId, 7)
    assert.equal(store.userKamis.length, 2)
  } finally {
    restore()
  }
})

// ── 筛选参数的传递 ─────────────────────────────────────────

test('默认不传 status / card_type / tool_id（all 表示不过滤）', async () => {
  const store = freshStore()
  let seen = null
  const restore = stubApi({
    getUserCards: async (userId, params) => {
      seen = { userId, params }
      return { success: true, data: { cards: [] } }
    },
  })
  try {
    await store.fetchUserKamis(7)
    assert.equal(seen.userId, 7)
    assert.deepEqual(seen.params, { page: 1, limit: 20 })
  } finally {
    restore()
  }
})

test('setFilter 后请求带上有意义的筛选值', async () => {
  const store = freshStore()
  let seen = null
  const restore = stubApi({
    getUserCards: async (userId, params) => {
      seen = params
      return { success: true, data: { cards: [] } }
    },
  })
  try {
    store.setFilter('status', 'unused')
    store.setFilter('card_type', 'month')
    store.setFilter('tool_id', 12)
    await store.fetchUserKamis(7)
    assert.equal(seen.status, 'unused')
    assert.equal(seen.card_type, 'month')
    assert.equal(seen.tool_id, 12)
  } finally {
    restore()
  }
})

test('显式 opts 覆盖 store 里的筛选条件', async () => {
  const store = freshStore()
  let seen = null
  const restore = stubApi({
    getUserCards: async (userId, params) => {
      seen = params
      return { success: true, data: { cards: [] } }
    },
  })
  try {
    store.setFilter('status', 'unused')
    await store.fetchUserKamis(7, { status: 'used', page: 2, limit: 5 })
    assert.equal(seen.status, 'used')
    assert.equal(seen.page, 2)
    assert.equal(seen.limit, 5)
  } finally {
    restore()
  }
})

test('tool_id 为 0 或 null 时不传该参数', async () => {
  const store = freshStore()
  const seen = []
  const restore = stubApi({
    getUserCards: async (userId, params) => {
      seen.push(params)
      return { success: true, data: { cards: [] } }
    },
  })
  try {
    await store.fetchUserKamis(7, { tool_id: null })
    await store.fetchUserKamis(7, { tool_id: 0 })
    assert.equal('tool_id' in seen[0], false)
    assert.equal('tool_id' in seen[1], false)
  } finally {
    restore()
  }
})

// ── 失败与 reset ───────────────────────────────────────────

test('fetchUserKamis：失败时清空列表、记录错误、复位 loading', async () => {
  const store = freshStore()
  store.userKamis = CARDS
  const restore = stubApi({
    getUserCards: async () => {
      throw new Error('403 无权操作其他用户的卡密')
    },
  })
  try {
    assert.equal(await store.fetchUserKamis(7), false)
    assert.deepEqual(store.userKamis, [], '失败后不应残留旧数据')
    assert.equal(store.error, '403 无权操作其他用户的卡密')
    assert.equal(store.loading, false)
  } finally {
    restore()
  }
})

test('fetchUserKamis：业务失败（success=false）取服务端 message', async () => {
  const store = freshStore()
  const restore = stubApi({
    getUserCards: async () => ({ success: false, message: '缺少用户信息' }),
  })
  try {
    assert.equal(await store.fetchUserKamis(7), false)
    assert.equal(store.error, '缺少用户信息')
  } finally {
    restore()
  }
})

test('fetchUserKamis：业务失败且无 message 时有兜底文案', async () => {
  const store = freshStore()
  const restore = stubApi({ getUserCards: async () => ({ success: false }) })
  try {
    await store.fetchUserKamis(7)
    assert.equal(store.error, '获取卡密列表失败')
  } finally {
    restore()
  }
})

test('fetchUserKamis：成功后清空上一次的错误', async () => {
  const store = freshStore()
  store.error = '上一次的错误'
  const restore = stubApi({ getUserCards: async () => ({ success: true, data: { cards: [] } }) })
  try {
    await store.fetchUserKamis(7)
    assert.equal(store.error, null)
  } finally {
    restore()
  }
})

test('reset：清空归属用户、列表、分页与错误', async () => {
  const store = freshStore()
  const restore = stubApi({
    getUserCards: async () => ({
      success: true,
      data: { cards: CARDS, pagination: { page: 5, limit: 20, total: 100 } },
    }),
  })
  try {
    await store.fetchUserKamis(7)
    store.reset()

    assert.equal(store.ownerUserId, null)
    assert.deepEqual(store.userKamis, [])
    assert.equal(store.pagination.page, 1)
    assert.equal(store.pagination.total, 0)
    assert.equal(store.error, null)
  } finally {
    restore()
  }
})

test('reset 后再次取同一用户不会被误判为「同一用户」而跳过清空', async () => {
  const store = freshStore()
  const restore = stubApi({
    getUserCards: async () => ({
      success: true,
      data: { cards: CARDS, pagination: { page: 5, limit: 20, total: 100 } },
    }),
  })
  try {
    await store.fetchUserKamis(7)
    store.reset()
    // ownerUserId 已归 null，因此这次属于「首次请求」，不会再读到旧分页
    await store.fetchUserKamis(7)
    assert.equal(store.ownerUserId, 7)
  } finally {
    restore()
  }
})
