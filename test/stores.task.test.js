/**
 * 任务中心 store 测试（1.5.0 / M5 端点 + M7 接线）
 *
 * 这一组守三件事：
 *   1. **领奖后就地重拉清单**：`claim` 只回被领的那一条，可领合计与顺序都由服务端重排，
 *      本地改一条会留下不一致；
 *   2. **签到任务不可领**（`claimable=false`）但仍要出现在 `claimableCount` 之外 ——
 *      它只展示状态，不能因为「领不了」就被过滤掉；
 *   3. 失败不吞：四种失败码各有各的提示语，交给页面处理。
 */
import test from 'node:test'
import assert from 'node:assert/strict'

import { installStorageStub, installDomStub, loadAppModule } from './setup.js'

installStorageStub()
installDomStub()

const { createPinia, setActivePinia } = await import('pinia')
const { useTaskStore } = await loadAppModule('/stores/task.js')
const request = (await loadAppModule('/api/request.js')).default

function stubRequest({ get = {}, post = {} } = {}) {
  const originalGet = request.get
  const originalPost = request.post
  const calls = []

  request.get = async (url, config) => {
    calls.push({ method: 'GET', url, config })
    const route = get[`GET ${url}`]
    if (route === undefined) throw new Error(`未打桩的请求：GET ${url}`)
    if (typeof route === 'function') return route(url, config)
    return { data: route }
  }
  request.post = async (url, body, config) => {
    calls.push({ method: 'POST', url, body, config })
    const route = post[`POST ${url}`]
    if (route === undefined) throw new Error(`未打桩的请求：POST ${url}`)
    if (typeof route === 'function') return route(url, body, config)
    return { data: route }
  }

  return {
    calls,
    restore: () => {
      request.get = originalGet
      request.post = originalPost
    },
  }
}

function freshStore() {
  setActivePinia(createPinia())
  return useTaskStore()
}

/** 一条任务：字段名必须与契约 §4.16 一致 */
function task(overrides = {}) {
  return {
    task_id: 'daily_order',
    name: '每日下单',
    desc: '完成 1 笔订单',
    icon: 'package',
    period: 'daily',
    progress: 1,
    target: 1,
    reward_points: 20,
    claimed: false,
    claimable: true,
    reset_at: '2026-10-16T16:00:00.000Z',
    ...overrides,
  }
}

test('任务初值：空清单、合计 0、未加载', () => {
  const store = freshStore()
  assert.deepEqual(store.tasks, [])
  assert.equal(store.claimablePoints, 0)
  assert.equal(store.loaded, false)
  assert.equal(store.hasTasks, false)
  assert.equal(store.claimableCount, 0)
})

test('fetchTasks：任务与可领合计都落库，URL 与契约一致', async () => {
  const store = freshStore()
  const stub = stubRequest({
    get: {
      'GET /taskApi/getTasks': {
        tasks: [task(), task({ task_id: 'daily_checkin', reward_points: 0, claimable: false, claimed: false })],
        claimable_points: 20,
      },
    },
  })
  try {
    await store.fetchTasks()
    assert.equal(stub.calls.length, 1)
    assert.equal(stub.calls[0].url, '/taskApi/getTasks')
    assert.equal(store.tasks.length, 2)
    assert.equal(store.claimablePoints, 20)
    assert.equal(store.loaded, true)
    // 签到任务领不了，但仍在列表里（只展示状态）
    assert.equal(store.claimableCount, 1)
  } finally {
    stub.restore()
  }
})

test('fetchTasks 失败：记错误，保留旧清单', async () => {
  const store = freshStore()
  const stub = stubRequest({
    get: {
      'GET /taskApi/getTasks': () => {
        throw { message: '服务不可用', response: { status: 500 } }
      },
    },
  })
  try {
    store.tasks = [task()]
    const data = await store.fetchTasks()
    assert.equal(data, null)
    assert.equal(store.error, '服务不可用')
    assert.equal(store.tasks.length, 1)
  } finally {
    stub.restore()
  }
})

test('claimTask：领奖后重拉清单（合计由服务端重排，不本地减）', async () => {
  const store = freshStore()
  const stub = stubRequest({
    get: {
      'GET /taskApi/getTasks': {
        tasks: [task({ claimed: true })],
        claimable_points: 0,
      },
    },
    post: {
      'POST /taskApi/claim': { points: 30, points_value: 0.3, awarded: 20, task: task({ claimed: true }) },
    },
  })
  try {
    const data = await store.claimTask('daily_order')
    assert.equal(data.awarded, 20)
    assert.deepEqual(stub.calls.map((call) => `${call.method} ${call.url}`), [
      'POST /taskApi/claim',
      'GET /taskApi/getTasks',
    ])
    assert.deepEqual(stub.calls[0].body, { task_id: 'daily_order' })
    assert.equal(store.claimablePoints, 0)
    assert.equal(store.tasks[0].claimed, true)
    assert.equal(store.claimingId, '')
  } finally {
    stub.restore()
  }
})

test('claimTask 失败：错误抛给页面，且不残留「领取中」状态', async () => {
  const store = freshStore()
  const failure = { message: '还没完成', response: { status: 409, data: { code: 'NOT_COMPLETED' } } }
  const stub = stubRequest({
    post: {
      'POST /taskApi/claim': () => {
        throw failure
      },
    },
  })
  try {
    await assert.rejects(() => store.claimTask('daily_order'), (error) => error === failure)
    assert.equal(store.claimingId, '')
  } finally {
    stub.restore()
  }
})

test('reset：清掉任务与合计（换账号不显示上一个账号的进度）', () => {
  const store = freshStore()
  store.tasks = [task()]
  store.claimablePoints = 20
  store.loaded = true
  store.reset()
  assert.deepEqual(store.tasks, [])
  assert.equal(store.claimablePoints, 0)
  assert.equal(store.loaded, false)
})
