/**
 * 积分 store 测试（1.5.0 / M7 新增的商城部分）
 *
 * 这一组守两件事：
 *   1. **余额只认服务端返回的快照**（`applyBalance`）—— 签到、兑换、领奖三处共用，
 *      本地加减会在「别人也在抢库存」时与真实值分叉；
 *   2. **兑换后库存用响应里的 `item` 覆盖**，而不是本地 -1（券是共享库存）。
 *
 * 打桩位置与 `stores.member.test.js` 一致：替换 axios 实例的 `get` / `post`，
 * 既覆盖 store 怎么用返回值，也覆盖 api 层怎么拼 URL 与请求体。
 */
import test from 'node:test'
import assert from 'node:assert/strict'

import { installStorageStub, installDomStub, loadAppModule } from './setup.js'

installStorageStub()
installDomStub()

const { createPinia, setActivePinia } = await import('pinia')
const { usePointsStore } = await loadAppModule('/stores/points.js')
const request = (await loadAppModule('/api/request.js')).default

/** 用一层薄桩替换 request.get / request.post，返回调用记录与还原函数 */
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
  return usePointsStore()
}

/** 一条商城条目：字段名必须与契约 §4.10 一致 */
function mallItem(overrides = {}) {
  return {
    item_id: 'coupon_new_user',
    name: '新人礼券 ¥5',
    desc: '满 ¥50 可用',
    icon: 'ticket',
    cost: 400,
    stock: 10,
    kind: 'coupon',
    ref_id: 'NEW_USER',
    payload: {},
    member_only: false,
    ...overrides,
  }
}

test('商城初值：空清单、未加载、没有正在兑换的条目', () => {
  const store = freshStore()
  assert.deepEqual(store.mallItems, [])
  assert.equal(store.mallLoaded, false)
  assert.equal(store.redeemingId, '')
  assert.equal(store.hasMallItems, false)
})

test('fetchMall：落到 mallItems 并打上已加载标记，URL 与契约一致', async () => {
  const store = freshStore()
  const stub = stubRequest({
    get: { 'GET /pointsApi/getMallItems': { items: [mallItem(), mallItem({ item_id: 'p1', kind: 'product', stock: null })] } },
  })
  try {
    await store.fetchMall()
    assert.equal(stub.calls.length, 1)
    assert.equal(stub.calls[0].method, 'GET')
    assert.equal(stub.calls[0].url, '/pointsApi/getMallItems')
    assert.equal(store.hasMallItems, true)
    assert.equal(store.mallLoaded, true)
    // stock: null 是「不限量」，不能被兜成 0
    assert.equal(store.mallItems[1].stock, null)
  } finally {
    stub.restore()
  }
})

test('fetchMall 失败：记错误但保留已有清单（失败不该把页面清空）', async () => {
  const store = freshStore()
  const stub = stubRequest({
    get: {
      'GET /pointsApi/getMallItems': () => {
        throw { message: '网络错误', response: { status: 500 } }
      },
    },
  })
  try {
    store.mallItems = [mallItem()]
    const data = await store.fetchMall()
    assert.equal(data, null)
    assert.equal(store.error, '网络错误')
    assert.equal(store.mallItems.length, 1)
    assert.equal(store.mallLoaded, false)
  } finally {
    stub.restore()
  }
})

test('redeemItem：余额用服务端快照，库存用响应里的 item 覆盖（不本地 -1）', async () => {
  const store = freshStore()
  store.account = { points: 1000, points_value: 10, multiplier: 1 }
  store.mallItems = [mallItem({ stock: 10 })]

  const stub = stubRequest({
    post: {
      'POST /pointsApi/redeem': {
        points: 600,
        points_value: 6,
        item: mallItem({ stock: 7 }),
        coupon: { coupon_code: 'RDABC', name: '新人礼券 ¥5' },
        order_no: null,
      },
    },
  })
  try {
    const data = await store.redeemItem('coupon_new_user')
    assert.equal(stub.calls.length, 1)
    assert.equal(stub.calls[0].url, '/pointsApi/redeem')
    assert.deepEqual(stub.calls[0].body, { item_id: 'coupon_new_user' })
    assert.equal(data.points, 600)
    assert.equal(store.account.points, 600)
    assert.equal(store.account.points_value, 6)
    // 服务端说剩 7 就是 7（不是 10 - 1 = 9）
    assert.equal(store.mallItems[0].stock, 7)
    assert.equal(store.redeemingId, '')
  } finally {
    stub.restore()
  }
})

test('redeemItem 失败：错误抛给页面，且不残留「兑换中」状态', async () => {
  const store = freshStore()
  store.account = { points: 100, points_value: 1, multiplier: 1 }
  store.mallItems = [mallItem()]

  const failure = { message: '积分不足', response: { status: 409, data: { code: 'POINTS_NOT_ENOUGH' } } }
  const stub = stubRequest({
    post: {
      'POST /pointsApi/redeem': () => {
        throw failure
      },
    },
  })
  try {
    await assert.rejects(() => store.redeemItem('coupon_new_user'), (error) => error === failure)
    assert.equal(store.redeemingId, '')
    assert.equal(store.account.points, 100)
    assert.equal(store.mallItems[0].stock, 10)
  } finally {
    stub.restore()
  }
})

test('applyBalance：没有账户时不崩（未登录时领奖/兑换的返回值不该炸页面）', () => {
  const store = freshStore()
  store.applyBalance({ points: 10, points_value: 0.1 })
  assert.equal(store.account, null)

  store.account = { points: 0, points_value: 0 }
  store.applyBalance(null)
  assert.equal(store.account.points, 0)
})

test('reset：清掉商城清单与加载标记（换账号不该看到上一个账号的库存）', () => {
  const store = freshStore()
  store.mallItems = [mallItem()]
  store.mallLoaded = true
  store.reset()
  assert.deepEqual(store.mallItems, [])
  assert.equal(store.mallLoaded, false)
})
