/**
 * 邀请中心 store 测试（1.6.0）
 *
 * 守四件事：
 *   1. **邀请码与链接用服务端返回值**：前端不拼域名（服务端按站点基址拼；
 *      没配基址时是相对路径 `/?invite=CODE`）；
 *   2. **进度百分比由 current/target 算**，目标为 0 时给 0 而不是 NaN；
 *   3. **`invitee_label` 原样展示**（已脱敏），不做二次加工；
 *   4. **失败保留旧数据**：网络抖动不该把已经渲染出来的邀请码与记录清空。
 */
import test from 'node:test'
import assert from 'node:assert/strict'

import { installStorageStub, installDomStub, loadAppModule } from './setup.js'

installStorageStub()
installDomStub()

const { createPinia, setActivePinia } = await import('pinia')
const { useInviteStore } = await loadAppModule('/stores/invite.js')
const request = (await loadAppModule('/api/request.js')).default

function stubRequest({ get = {} } = {}) {
  const originalGet = request.get
  const calls = []

  request.get = async (url, config) => {
    calls.push({ method: 'GET', url, config })
    const route = get[`GET ${url}`]
    if (route === undefined) throw new Error(`未打桩的请求：GET ${url}`)
    if (typeof route === 'function') return route(url, config)
    return { data: route }
  }

  return {
    calls,
    restore: () => {
      request.get = originalGet
    },
  }
}

function freshStore() {
  setActivePinia(createPinia())
  return useInviteStore()
}

/** 一份概况：字段名必须与契约 §4.18 一致 */
function summary(overrides = {}) {
  return {
    invite_code: 'C2B248F1',
    invite_link: '/?invite=C2B248F1',
    counts: { registered: 2, first_order: 1, expired: 0 },
    reward: { inviter_points: 500, invitee_points: 200 },
    progress: { current: 1, target: 3, bonus_points: 500 },
    ranking: [{ rank: 1, label: '星***', count: 1 }],
    ...overrides,
  }
}

/** 一条记录：字段名必须与契约 §4.19 一致（标签已脱敏） */
function record(overrides = {}) {
  return {
    invitee_label: '温***',
    status: 'first_order',
    status_text: '已完成首单',
    rewarded: true,
    created_at: '2026-10-15T01:27:00.000Z',
    ...overrides,
  }
}

test('初值：没有概况、没有记录', () => {
  const store = freshStore()
  assert.equal(store.summary, null)
  assert.equal(store.hasSummary, false)
  assert.equal(store.inviteCode, '')
  assert.equal(store.inviteLink, '')
  assert.deepEqual(store.records, [])
  assert.equal(store.hasRecords, false)
  assert.equal(store.progressPercent, 0)
})

test('fetchSummary：码、链接、计数、奖励与榜单都落库，URL 与契约一致', async () => {
  const store = freshStore()
  const stub = stubRequest({ get: { 'GET /inviteApi/getSummary': summary() } })
  try {
    await store.fetchSummary()
    assert.equal(stub.calls.length, 1)
    assert.equal(stub.calls[0].url, '/inviteApi/getSummary')
    assert.equal(store.hasSummary, true)
    assert.equal(store.inviteCode, 'C2B248F1')
    // 链接原样用服务端给的（本地未配基址 → 相对路径）
    assert.equal(store.inviteLink, '/?invite=C2B248F1')
    assert.equal(store.counts.first_order, 1)
    assert.equal(store.reward.inviter_points, 500)
    assert.equal(store.ranking.length, 1)
    assert.equal(store.progressPercent, 33)
  } finally {
    stub.restore()
  }
})

test('fetchSummary 失败：记错误且不清掉已有的码', async () => {
  const store = freshStore()
  const stub = stubRequest({
    get: {
      'GET /inviteApi/getSummary': () => {
        throw { message: '服务不可用', response: { status: 500 } }
      },
    },
  })
  try {
    store.summary = summary()
    const data = await store.fetchSummary()
    assert.equal(data, null)
    assert.equal(store.error, '服务不可用')
    assert.equal(store.inviteCode, 'C2B248F1')
  } finally {
    stub.restore()
  }
})

test('fetchRecords：脱敏标签原样落库，分页来自服务端', async () => {
  const store = freshStore()
  const stub = stubRequest({
    get: {
      'GET /inviteApi/getRecords': {
        list: [record(), record({ invitee_label: '飞***', status: 'registered', status_text: '已注册', rewarded: false })],
        pagination: { page: 1, limit: 10, total: 12, total_pages: 2, has_next: true, has_prev: false },
      },
    },
  })
  try {
    await store.fetchRecords()
    assert.equal(stub.calls[0].url, '/inviteApi/getRecords')
    assert.deepEqual(stub.calls[0].config.params, { page: 1, limit: 10 })
    assert.equal(store.records.length, 2)
    assert.equal(store.records[0].invitee_label, '温***')
    assert.equal(store.total, 12)
    assert.equal(store.totalPages, 2)
    assert.equal(store.hasNext, true)
    assert.equal(store.hasPrev, false)
  } finally {
    stub.restore()
  }
})

test('fetchRecords 失败：清空列表并记错误（分页回落到 1 页）', async () => {
  const store = freshStore()
  const stub = stubRequest({
    get: {
      'GET /inviteApi/getRecords': () => {
        throw { message: '服务不可用', response: { status: 500 } }
      },
    },
  })
  try {
    store.records = [record()]
    await store.fetchRecords()
    assert.deepEqual(store.records, [])
    assert.equal(store.totalPages, 1)
    assert.equal(store.error, '服务不可用')
  } finally {
    stub.restore()
  }
})

test('reset：换账号时清掉码与记录（不能把 A 的邀请码给 B）', () => {
  const store = freshStore()
  store.summary = summary()
  store.records = [record()]
  store.total = 1
  store.error = '旧错误'
  store.reset()
  assert.equal(store.summary, null)
  assert.deepEqual(store.records, [])
  assert.equal(store.total, 0)
  assert.equal(store.error, '')
})
