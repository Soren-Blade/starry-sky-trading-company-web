import test from 'node:test'
import assert from 'node:assert/strict'

import { installStorageStub, installDomStub, loadAppModule } from './setup.js'

installStorageStub()
installDomStub()

const { createPinia, setActivePinia } = await import('pinia')
const { useCartStore } = await loadAppModule('/stores/cart.js')
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
  return useCartStore()
}

/** 服务端购物车响应体（字段名与 server 的 mapCartRows 一致） */
const PAYLOAD = {
  items: [
    {
      id: 1,
      product_id: 7,
      quantity: 2,
      product_title: '纯棉男士T恤',
      product_image: null,
      unit_price: 89,
      subtotal: 178,
      stock_quantity: 200,
      available: true,
      unavailable_reason: null,
    },
    {
      id: 2,
      product_id: 9,
      quantity: 1,
      product_title: '已下架商品',
      product_image: null,
      unit_price: 10,
      subtotal: 10,
      stock_quantity: 0,
      available: false,
      unavailable_reason: '商品缺货',
    },
  ],
  total_amount: 178,
  total_quantity: 3,
  available_count: 1,
  unavailable_count: 1,
}

/** 服务端对游客请求返回 403 + 这个 code，request.js 会把它包成 Error 抛出 */
const needLoginError = () => {
  const error = new Error('该操作需要登录账号，请先登录或注册')
  error.status = 403
  error.code = 'REGISTERED_ACCOUNT_REQUIRED'
  return error
}

// ── state 形状 ─────────────────────────────────────────────

test('state：初始形状固定', () => {
  const store = freshStore()
  assert.deepEqual(store.items, [])
  assert.equal(store.totalQuantity, 0)
  assert.equal(store.totalAmount, 0)
  assert.equal(store.loading, false)
  assert.equal(store.loaded, false)
  assert.equal(store.count, 0)
  assert.equal(store.isEmpty, true)
})

// ── applyPayload ───────────────────────────────────────────

test('applyPayload：整份覆盖，不做本地累加', () => {
  const store = freshStore()
  store.applyPayload(PAYLOAD)
  assert.equal(store.items.length, 2)
  assert.equal(store.totalQuantity, 3)
  assert.equal(store.totalAmount, 178)
  assert.equal(store.availableCount, 1)
  assert.equal(store.unavailableCount, 1)
  assert.equal(store.hasUnavailable, true)
  assert.equal(store.availableItems.length, 1)

  // 第二次覆盖：旧数据不应残留
  store.applyPayload({ items: [], total_quantity: 0, total_amount: 0 })
  assert.equal(store.items.length, 0)
  assert.equal(store.totalQuantity, 0)
})

test('applyPayload：字段缺失时落到零值而不是 undefined', () => {
  const store = freshStore()
  store.applyPayload({})
  assert.deepEqual(store.items, [])
  assert.equal(store.totalQuantity, 0)
  assert.equal(store.totalAmount, 0)

  store.applyPayload(null)
  assert.deepEqual(store.items, [])
})

// ── fetch ──────────────────────────────────────────────────

test('fetch：成功后写入 state 并标记 loaded', async () => {
  const store = freshStore()
  const restore = stubApi({ getCart: async () => ({ success: true, data: PAYLOAD }) })
  try {
    const result = await store.fetch()
    assert.equal(result.success, true)
    assert.equal(store.loaded, true)
    assert.equal(store.count, 3)
    assert.equal(store.loading, false, 'loading 必须在 finally 里复位')
  } finally {
    restore()
  }
})

test('fetch：silent 时不进入 loading（首屏角标刷新不该闪加载态）', async () => {
  const store = freshStore()
  let sawLoading = null
  const restore = stubApi({
    getCart: async () => {
      sawLoading = store.loading
      return { success: true, data: PAYLOAD }
    },
  })
  try {
    await store.fetch({ silent: true })
    assert.equal(sawLoading, false)
  } finally {
    restore()
  }
})

test('fetch：未登录（403 REGISTERED_ACCOUNT_REQUIRED）翻译成 needLogin 并清空角标', async () => {
  const store = freshStore()
  store.applyPayload(PAYLOAD)
  const restore = stubApi({
    getCart: async () => {
      throw needLoginError()
    },
  })
  try {
    const result = await store.fetch()
    assert.equal(result.success, false)
    assert.equal(result.needLogin, true)
    assert.equal(store.count, 0, '未登录时角标必须归零，不能留着上一次的数字')
    // needLogin 是「没登录」而不是「出错了」，不该污染 error
    assert.equal(store.error, null)
  } finally {
    restore()
  }
})

test('fetch：接口返回 success:false 时记 error 且不写 state', async () => {
  const store = freshStore()
  const restore = stubApi({ getCart: async () => ({ success: false, message: '炸了' }) })
  try {
    const result = await store.fetch()
    assert.equal(result.success, false)
    assert.equal(store.error, '炸了')
    assert.equal(store.loaded, false)
  } finally {
    restore()
  }
})

// ── add / updateQuantity / remove / clear ──────────────────

test('add：把接口返回的整份购物车写回 state', async () => {
  const store = freshStore()
  let received = null
  const restore = stubApi({
    addItem: async (payload) => {
      received = payload
      return { success: true, message: '已加入购物车', data: PAYLOAD }
    },
  })
  try {
    const result = await store.add(7, 2)
    assert.deepEqual(received, { product_id: 7, quantity: 2 })
    assert.equal(result.success, true)
    assert.equal(store.totalQuantity, 3)
  } finally {
    restore()
  }
})

test('add：未登录返回 needLogin', async () => {
  const store = freshStore()
  const restore = stubApi({
    addItem: async () => {
      throw needLoginError()
    },
  })
  try {
    const result = await store.add(7, 1)
    assert.equal(result.needLogin, true)
  } finally {
    restore()
  }
})

test('add：商品不存在（404）原样透传服务端文案，不当作需要登录', async () => {
  const store = freshStore()
  const notFound = new Error('商品不存在')
  notFound.status = 404
  notFound.code = 'PRODUCT_NOT_FOUND'
  const restore = stubApi({
    addItem: async () => {
      throw notFound
    },
  })
  try {
    const result = await store.add(999999, 1)
    assert.equal(result.success, false)
    assert.equal(result.needLogin, undefined)
    assert.equal(result.message, '商品不存在')
  } finally {
    restore()
  }
})

test('updateQuantity：数量 0 也照常提交（服务端把它当作移除该行）', async () => {
  const store = freshStore()
  let received = null
  const restore = stubApi({
    updateItem: async (payload) => {
      received = payload
      return { success: true, data: { items: [], total_quantity: 0, total_amount: 0 } }
    },
  })
  try {
    await store.updateQuantity(1, 0)
    assert.deepEqual(received, { id: 1, quantity: 0 })
    assert.equal(store.count, 0)
  } finally {
    restore()
  }
})

test('remove / clear：成功后同步 state；失败时不改 state', async () => {
  const store = freshStore()
  store.applyPayload(PAYLOAD)

  const restore = stubApi({
    removeItem: async () => ({ success: true, data: { items: [PAYLOAD.items[1]], total_quantity: 1, total_amount: 0 } }),
    clearCart: async () => ({ success: false, message: '清空失败' }),
  })
  try {
    await store.remove(1)
    assert.equal(store.items.length, 1)

    const result = await store.clear()
    assert.equal(result.success, false)
    assert.equal(store.items.length, 1, '失败时不应清空本地状态')
  } finally {
    restore()
  }
})

// ── reset ──────────────────────────────────────────────────

test('reset：切换账号时清空全部字段（含 loaded）', () => {
  const store = freshStore()
  store.applyPayload(PAYLOAD)
  store.loaded = true
  store.error = 'x'

  store.reset()
  assert.deepEqual(store.items, [])
  assert.equal(store.count, 0)
  assert.equal(store.loaded, false)
  assert.equal(store.error, null)
})
