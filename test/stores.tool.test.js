import test from 'node:test'
import assert from 'node:assert/strict'

import { installStorageStub, installDomStub, loadAppModule } from './setup.js'

installStorageStub()
installDomStub()

const { createPinia, setActivePinia } = await import('pinia')
const { useToolStore } = await loadAppModule('/stores/tool.js')
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
  return useToolStore()
}

const TOOLS = [
  { id: 1, tool_name: 'ChatGPT', tool_class: 'ai', collection_count: 100 },
  { id: 2, tool_name: 'Figma', tool_class: 'design', collection_count: 50 },
  { id: 3, tool_name: 'Midjourney', tool_class: 'ai', collection_count: 200 },
]

// ── state 形状 ─────────────────────────────────────────────

test('state：toolData 是对象且各字段形状固定（原实现初始化为数组却当对象用）', () => {
  const store = freshStore()

  assert.equal(Array.isArray(store.toolData), false, 'toolData 应为对象而不是数组')
  assert.deepEqual(store.toolData.tools, [])
  assert.deepEqual(store.toolData.classes, [])
  assert.deepEqual(store.toolData.classified, {})
  assert.equal(store.toolData.pagination.page, 1)
  assert.deepEqual(store.toolData.filters, {})
})

test('state：appleIds 初始为两个空数组', () => {
  const store = freshStore()
  assert.ok(Array.isArray(store.appleIds.nanoCloud))
  assert.ok(Array.isArray(store.appleIds.fangQiangNan))
})

test('getters：allTools / toolClasses / appleIdCount 均有兜底', () => {
  const store = freshStore()
  assert.deepEqual(store.allTools, [])
  assert.deepEqual(store.toolClasses, [])
  assert.equal(store.appleIdCount, 0)

  store.toolData.tools = TOOLS
  store.toolData.classes = [{ key: 'ai' }]
  store.appleIds = { nanoCloud: [1, 2], fangQiangNan: [3] }
  assert.equal(store.allTools.length, 3)
  assert.equal(store.toolClasses.length, 1)
  assert.equal(store.appleIdCount, 3, '两个来源应相加')
})

// ── fetchTools ─────────────────────────────────────────────

test('fetchTools：写入 tools 并同时产出 classes 与 classified', async () => {
  const store = freshStore()
  const restore = stubApi({
    getTools: async () => ({ success: true, data: { tools: TOOLS }, meta: { total: 3 } }),
  })
  try {
    assert.equal(await store.fetchTools(), true)
    assert.equal(store.toolData.tools.length, 3)
    assert.ok(Array.isArray(store.toolData.classes))
    assert.ok(store.toolData.classes.length > 0, '应至少产出一个分类')
    assert.equal(typeof store.toolData.classified, 'object')
    // classified 是按分类分组的工具
    const grouped = Object.values(store.toolData.classified).flat()
    assert.equal(grouped.length, TOOLS.length, '每个工具都应落入某个分类')
    assert.deepEqual(store.toolData.meta, { total: 3 })
  } finally {
    restore()
  }
})

test('fetchTools：失败时抛出的 message 被记录，且在 finally 里复位 loading', async () => {
  const store = freshStore()
  const restore = stubApi({
    getTools: async () => ({ success: false, message: '工具接口不可用' }),
  })
  try {
    assert.equal(await store.fetchTools(), false)
    assert.equal(store.toolsError, '工具接口不可用')
    assert.equal(store.toolsLoading, false, 'loading 必须在 finally 复位')
  } finally {
    restore()
  }
})

test('fetchTools：网络异常时也复位 loading 并记录错误', async () => {
  const store = freshStore()
  const restore = stubApi({
    getTools: async () => {
      throw new Error('timeout')
    },
  })
  try {
    assert.equal(await store.fetchTools(), false)
    assert.equal(store.toolsError, 'timeout')
    assert.equal(store.toolsLoading, false)
  } finally {
    restore()
  }
})

test('fetchTools：成功后错误状态被清空（不残留上一次的失败）', async () => {
  const store = freshStore()
  store.toolsError = '上一次的错误'
  const restore = stubApi({
    getTools: async () => ({ success: true, data: { tools: [] } }),
  })
  try {
    await store.fetchTools()
    assert.equal(store.toolsError, null)
  } finally {
    restore()
  }
})

test('fetchTools：data.tools 缺失时落到空数组而不是崩溃', async () => {
  const store = freshStore()
  const restore = stubApi({ getTools: async () => ({ success: true, data: {} }) })
  try {
    assert.equal(await store.fetchTools(), true)
    assert.deepEqual(store.toolData.tools, [])
  } finally {
    restore()
  }
})

test('fetchTools：保留既有 pagination（后端未返回分页时）', async () => {
  const store = freshStore()
  store.toolData.pagination = { page: 5, limit: 10, total: 100, total_pages: 10 }
  const restore = stubApi({ getTools: async () => ({ success: true, data: { tools: [] } }) })
  try {
    await store.fetchTools()
    assert.equal(store.toolData.pagination.page, 5, '未返回 pagination 时应沿用原值')
  } finally {
    restore()
  }
})

test('fetchTools：透传调用方参数', async () => {
  const store = freshStore()
  let seen = null
  const restore = stubApi({
    getTools: async (params) => {
      seen = params
      return { success: true, data: { tools: [] } }
    },
  })
  try {
    await store.fetchTools({ page: 2, tool_class: 'ai' })
    assert.deepEqual(seen, { page: 2, tool_class: 'ai' })
  } finally {
    restore()
  }
})

// ── setActiveCategory / init ───────────────────────────────

test('setActiveCategory：统一入口，避免组件直接改 state', () => {
  const store = freshStore()
  assert.equal(store.activeCategory, 'all')
  store.setActiveCategory('ai')
  assert.equal(store.activeCategory, 'ai')
})

test('init：等价于 fetchTools（不额外请求）', async () => {
  const store = freshStore()
  let calls = 0
  const restore = stubApi({
    getTools: async () => {
      calls += 1
      return { success: true, data: { tools: TOOLS } }
    },
  })
  try {
    assert.equal(await store.init(), true)
    assert.equal(calls, 1)
  } finally {
    restore()
  }
})

// ── fetchAppleIds ──────────────────────────────────────────

test('fetchAppleIds：两个来源分别写入', async () => {
  const store = freshStore()
  const restore = stubApi({
    getAppleIds: async () => ({
      success: true,
      data: { nanoCloud: [{ id: 1 }], fangQiangNan: [{ id: 2 }, { id: 3 }] },
    }),
  })
  try {
    assert.equal(await store.fetchAppleIds(), true)
    assert.equal(store.appleIds.nanoCloud.length, 1)
    assert.equal(store.appleIds.fangQiangNan.length, 2)
    assert.equal(store.appleIdCount, 3)
  } finally {
    restore()
  }
})

test('fetchAppleIds：data 缺失时两个来源都落到空数组', async () => {
  const store = freshStore()
  const restore = stubApi({ getAppleIds: async () => ({ success: true }) })
  try {
    await store.fetchAppleIds()
    assert.deepEqual(store.appleIds, { nanoCloud: [], fangQiangNan: [] })
  } finally {
    restore()
  }
})

test('fetchAppleIds：失败时清空数据并记录错误，loading 复位', async () => {
  const store = freshStore()
  store.appleIds = { nanoCloud: [{ id: 9 }], fangQiangNan: [{ id: 9 }] }
  const restore = stubApi({
    getAppleIds: async () => {
      throw new Error('503 全部数据源不可用')
    },
  })
  try {
    assert.equal(await store.fetchAppleIds(), false)
    assert.deepEqual(store.appleIds, { nanoCloud: [], fangQiangNan: [] }, '失败后不应残留旧数据')
    assert.equal(store.appleIdsError, '503 全部数据源不可用')
    assert.equal(store.appleIdsLoading, false)
  } finally {
    restore()
  }
})

test('fetchAppleIds：业务失败（success=false）也走清空分支', async () => {
  const store = freshStore()
  const restore = stubApi({
    getAppleIds: async () => ({ success: false, message: '两个数据源都不可用' }),
  })
  try {
    assert.equal(await store.fetchAppleIds(), false)
    assert.equal(store.appleIdsError, '两个数据源都不可用')
    assert.deepEqual(store.appleIds, { nanoCloud: [], fangQiangNan: [] })
  } finally {
    restore()
  }
})

test('两个 loading 互不影响', async () => {
  const store = freshStore()
  const restore = stubApi({
    getTools: async () => {
      await new Promise((r) => { setTimeout(r, 10) })
      return { success: true, data: { tools: [] } }
    },
    getAppleIds: async () => ({ success: true, data: {} }),
  })
  try {
    const promise = store.fetchTools()
    assert.equal(store.toolsLoading, true)
    assert.equal(store.appleIdsLoading, false, '工具加载不应影响 Apple ID 的 loading')
    await promise
    await store.fetchAppleIds()
    assert.equal(store.toolsLoading, false)
    assert.equal(store.appleIdsLoading, false)
  } finally {
    restore()
  }
})
