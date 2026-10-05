import test from 'node:test'
import assert from 'node:assert/strict'

import { installStorageStub, installDomStub, loadAppModule } from './setup.js'

installStorageStub()
installDomStub()

const { createPinia, setActivePinia } = await import('pinia')
const { useShopStore } = await loadAppModule('/stores/shop.js')
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
  return useShopStore()
}

const CATEGORIES = [
  { id: 1, class_name: '社交', icon_url: '💬', children: [] },
  { id: 2, class_name: '数码', icon_url: '📱', children: [] },
]

// ── state 形状（这是本 store 最重要的不变量） ────────────────

test('state：shopClass 与 shopInfo 初始即为数组（不是对象）', () => {
  const store = freshStore()
  assert.ok(Array.isArray(store.shopClass), 'shopClass 必须是数组')
  assert.ok(Array.isArray(store.shopInfo), 'shopInfo 必须是数组')
  assert.equal(store.shopClass.length, 0)
  assert.equal(store.shopInfo.length, 0)
})

test('getCategories：赋值为数组后 length 正确（原 reactive({}) 实现会丢失 length）', async () => {
  const store = freshStore()
  const restore = stubApi({ getCategories: async () => ({ success: true, data: CATEGORIES }) })
  try {
    assert.equal(await store.getCategories(), true)
    assert.ok(Array.isArray(store.shopClass))
    assert.equal(store.shopClass.length, 2, '数组长度必须保留')
    assert.equal(store.shopClass[0].class_name, '社交')
    // 不能退化成下标对象（Pinia 会把元素包成响应式代理，故用 deepEqual 比较）
    assert.deepEqual(store.shopClass[0], CATEGORIES[0])
  } finally {
    restore()
  }
})

test('getCategories：data 不是数组时兜底为空数组而不是崩溃', async () => {
  const store = freshStore()
  const restore = stubApi({ getCategories: async () => ({ success: true, data: { a: 1 } }) })
  try {
    await store.getCategories()
    assert.ok(Array.isArray(store.shopClass))
    assert.equal(store.shopClass.length, 0)
  } finally {
    restore()
  }
})

test('getCategories：请求参数带 tree=true', async () => {
  const store = freshStore()
  let seen = null
  const restore = stubApi({
    getCategories: async (params) => {
      seen = params
      return { success: true, data: [] }
    },
  })
  try {
    await store.getCategories()
    assert.deepEqual(seen, { tree: true })
  } finally {
    restore()
  }
})

// ── getProducts ────────────────────────────────────────────

test('getProducts：写入 products 与 pagination', async () => {
  const store = freshStore()
  const pagination = { page: 2, limit: 20, total: 45, total_pages: 3, has_next: true, has_prev: true }
  const restore = stubApi({
    getProducts: async () => ({
      success: true,
      data: { products: [{ id: 1, name: 'x' }], pagination },
    }),
  })
  try {
    assert.equal(await store.getProducts(), true)
    assert.equal(store.shopInfo.length, 1)
    assert.deepEqual(store.pagination, pagination)
  } finally {
    restore()
  }
})

test('getProducts：默认带 in_stock=all 与 limit=100，且可被 extraParams 覆盖', async () => {
  const store = freshStore()
  const seen = []
  const restore = stubApi({
    getProducts: async (params) => {
      seen.push(params)
      return { success: true, data: { products: [] } }
    },
  })
  try {
    await store.getProducts()
    await store.getProducts({ in_stock: 'true', page: 3 })
    // limit 取服务端上限：首页/热卖榜展示的就是这一份列表。
    // （搜索不在这里做 —— 走 /search 页的服务端 keyword 查询。）
    assert.deepEqual(seen[0], { in_stock: 'all', limit: 100 })
    assert.deepEqual(seen[1], { in_stock: 'true', limit: 100, page: 3 })
  } finally {
    restore()
  }
})

test('getProducts：data.products 缺失时落到空数组', async () => {
  const store = freshStore()
  const restore = stubApi({ getProducts: async () => ({ success: true, data: {} }) })
  try {
    await store.getProducts()
    assert.deepEqual(store.shopInfo, [])
  } finally {
    restore()
  }
})

test('getProducts：失败时清空列表并记录 error', async () => {
  const store = freshStore()
  store.shopInfo = [{ id: 99 }]
  const restore = stubApi({
    getProducts: async () => {
      throw new Error('数据库连接失败')
    },
  })
  try {
    assert.equal(await store.getProducts(), false)
    assert.deepEqual(store.shopInfo, [], '失败后不应残留旧数据')
    assert.equal(store.error, '数据库连接失败')
  } finally {
    restore()
  }
})

test('getProducts：业务失败（success=false）时不写入数据', async () => {
  const store = freshStore()
  const restore = stubApi({
    getProducts: async () => ({ success: false, message: '参数错误' }),
  })
  try {
    assert.equal(await store.getProducts(), false)
    assert.equal(store.error, '参数错误')
    assert.deepEqual(store.shopInfo, [])
  } finally {
    restore()
  }
})

test('getProducts：业务失败且无 message 时有兜底文案', async () => {
  const store = freshStore()
  const restore = stubApi({ getProducts: async () => ({ success: false }) })
  try {
    await store.getProducts()
    assert.equal(store.error, '获取商品失败')
  } finally {
    restore()
  }
})

// ── init ───────────────────────────────────────────────────

test('init：并行拉取分类与商品，并管理 loading 状态', async () => {
  const store = freshStore()
  const order = []
  const restore = stubApi({
    getCategories: async () => {
      order.push('categories')
      await new Promise((r) => { setTimeout(r, 10) })
      return { success: true, data: CATEGORIES }
    },
    getProducts: async () => {
      order.push('products')
      return { success: true, data: { products: [{ id: 1 }] } }
    },
  })
  try {
    const promise = store.init()
    assert.equal(store.loading, true, 'init 期间应为 loading')
    await promise
    assert.equal(store.loading, false)
    assert.deepEqual(order, ['categories', 'products'], '两个请求应并行发出')
    assert.equal(store.shopClass.length, 2)
    assert.equal(store.shopInfo.length, 1)
  } finally {
    restore()
  }
})

test('init：单个请求失败不应让另一个也失败，loading 必须归位', async () => {
  const store = freshStore()
  const restore = stubApi({
    getCategories: async () => ({ success: true, data: CATEGORIES }),
    getProducts: async () => {
      throw new Error('超时')
    },
  })
  try {
    await store.init()
    assert.equal(store.loading, false, 'finally 必须把 loading 复位')
    assert.equal(store.shopClass.length, 2, '分类仍应成功')
    assert.deepEqual(store.shopInfo, [])
    assert.equal(store.error, '超时')
  } finally {
    restore()
  }
})

test('init：重置上一次的 error', async () => {
  const store = freshStore()
  store.error = '上次的旧错误'
  const restore = stubApi({
    getCategories: async () => ({ success: true, data: [] }),
    getProducts: async () => ({ success: true, data: { products: [] } }),
  })
  try {
    await store.init()
    assert.equal(store.error, null)
  } finally {
    restore()
  }
})
