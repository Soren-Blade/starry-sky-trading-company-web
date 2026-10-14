/**
 * 结算试算 store 测试（1.5.0 / M7）
 *
 * 这一组守四件事：
 *   1. **券列表与试算都按当前选中的商品走**（`amount` 判门槛、`product_ids` 判范围）；
 *   2. **提交用试算结果里的 `points_used`**（`effectivePoints`）—— 服务端会把积分
 *      下调到上限，发输入框里的原值会让用户以为「说好的抵扣没生效」；
 *   3. **券被服务端拒绝时自动取消选择**并留说明，否则用户会一直撞同一个 409；
 *   4. **失败不吞掉 `code` / `details`**（下单接口共用同一套错误码）。
 *
 * 打桩位置与 `stores.points.test.js` 一致：替换 axios 实例的 get / post。
 */
import test from 'node:test'
import assert from 'node:assert/strict'

import { installStorageStub, installDomStub, loadAppModule } from './setup.js'

installStorageStub()
installDomStub()

const { createPinia, setActivePinia } = await import('pinia')
const { useCheckoutStore } = await loadAppModule('/stores/checkout.js')
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

/** 服务端的 axios 错误形状（request 拦截器把响应原样挂在 error.response 上） */
function serverError(status, data) {
  const error = new Error(data?.message || '请求失败')
  error.response = { status, data }
  return error
}

function freshStore() {
  setActivePinia(createPinia())
  return useCheckoutStore()
}

const ITEMS = [{ product_id: 7, quantity: 2 }]

function quote(overrides = {}) {
  return {
    original_amount: 178,
    member_discount: 0,
    coupon_discount: 5,
    points_used: 100,
    points_discount: 1,
    payable_amount: 172,
    limits: { max_total_discount: 89, max_points_discount: 53.4, points_step: 100 },
    warnings: [],
    ...overrides,
  }
}

test('初值：没有券、没有积分、没有试算结果', () => {
  const store = freshStore()
  assert.deepEqual(store.coupons, [])
  assert.equal(store.couponCode, '')
  assert.equal(store.usePoints, 0)
  assert.equal(store.quote, null)
  assert.equal(store.hasQuote, false)
  assert.equal(store.effectivePoints, 0)
})

test('fetchCoupons：带上原价与商品 id（product_ids 逗号分隔）', async () => {
  const stub = stubRequest({
    get: {
      'GET /couponApi/getAvailable': { list: [{ coupon_code: 'C1', amount: '5.00', threshold: '50.00', selectable: true }] },
    },
  })
  try {
    const store = freshStore()
    await store.fetchCoupons({ amount: 178, productIds: '7,9' })
    const call = stub.calls.find((row) => row.url === '/couponApi/getAvailable')
    assert.deepEqual(call.config.params, { amount: 178, product_ids: '7,9' })
    assert.equal(store.coupons.length, 1)
    assert.equal(store.selectableCoupons.length, 1)
  } finally {
    stub.restore()
  }
})

test('fetchCoupons：接口失败时清空列表并留一句说明（不阻塞下单）', async () => {
  const stub = stubRequest({
    get: { 'GET /couponApi/getAvailable': () => { throw serverError(500, { message: '服务异常' }) } },
  })
  try {
    const store = freshStore()
    await store.fetchCoupons({ amount: 178 })
    assert.deepEqual(store.coupons, [])
    assert.equal(store.couponError, '服务异常')
  } finally {
    stub.restore()
  }
})

test('refreshQuote：把券与积分一起发给服务端，金额原样落库', async () => {
  const stub = stubRequest({
    post: { 'POST /couponApi/previewUse': quote() },
  })
  try {
    const store = freshStore()
    store.setCoupon('C1')
    store.setPoints(100)
    const data = await store.refreshQuote({ items: ITEMS })

    const call = stub.calls.find((row) => row.url === '/couponApi/previewUse')
    assert.deepEqual(call.body, { items: ITEMS, coupon_code: 'C1', use_points: 100 })
    assert.equal(data.payable_amount, 172)
    assert.equal(store.quote.payable_amount, 172)
    assert.equal(store.quoting, false)
  } finally {
    stub.restore()
  }
})

test('refreshQuote：不使用券与积分时不发这两个字段', async () => {
  const stub = stubRequest({ post: { 'POST /couponApi/previewUse': quote({ coupon_discount: 0, points_used: 0, points_discount: 0 }) } })
  try {
    const store = freshStore()
    await store.refreshQuote({ items: ITEMS })
    const call = stub.calls.find((row) => row.url === '/couponApi/previewUse')
    assert.deepEqual(call.body, { items: ITEMS })
  } finally {
    stub.restore()
  }
})

test('refreshQuote：没有选中商品时清空结果，不发注定 400 的请求', async () => {
  const stub = stubRequest({})
  try {
    const store = freshStore()
    store.quote = quote()
    const result = await store.refreshQuote({ items: [] })
    assert.equal(result, null)
    assert.equal(store.quote, null)
    assert.equal(stub.calls.length, 0)
  } finally {
    stub.restore()
  }
})

test('refreshQuote：积分被服务端下调时，提交用下调后的值', async () => {
  const stub = stubRequest({
    post: { 'POST /couponApi/previewUse': quote({ points_used: 100, points_discount: 1, warnings: ['积分抵扣已按上限 ¥0.53 计'] }) },
  })
  try {
    const store = freshStore()
    store.setPoints(999900)
    await store.refreshQuote({ items: ITEMS })
    assert.equal(store.effectivePoints, 100, '输入 999900，实际只能扣 100')
    assert.equal(store.warnings.length, 1)
  } finally {
    stub.restore()
  }
})

test('refreshQuote：券不可用时自动取消选择，并说明原因', async () => {
  const stub = stubRequest({
    post: {
      'POST /couponApi/previewUse': () => {
        throw serverError(409, { message: '券已过期', code: 'COUPON_NOT_AVAILABLE', details: { coupon_code: 'C1', status: 'expired' } })
      },
    },
  })
  try {
    const store = freshStore()
    store.setCoupon('C1')
    const result = await store.refreshQuote({ items: ITEMS })

    assert.equal(store.couponCode, '', '不能留着这张用不了的券')
    assert.match(store.couponNotice, /已取消使用该券：券已过期/)
    assert.equal(store.quote, null)
    assert.equal(store.quoteError, '券已过期')
    assert.equal(result.error.code, 'COUPON_NOT_AVAILABLE')
    assert.deepEqual(result.error.details, { coupon_code: 'C1', status: 'expired' })
  } finally {
    stub.restore()
  }
})

test('refreshQuote：商品不可售（INVALID_PARAMS）时不清券，只报错', async () => {
  const stub = stubRequest({
    post: {
      'POST /couponApi/previewUse': () => {
        throw serverError(400, { message: '商品「男士休闲夹克」库存不足或不可售', code: 'INVALID_PARAMS', details: { product_title: '男士休闲夹克' } })
      },
    },
  })
  try {
    const store = freshStore()
    store.setCoupon('C1')
    await store.refreshQuote({ items: ITEMS })
    assert.equal(store.couponCode, 'C1', '商品的问题不该迁怒于券')
    assert.equal(store.couponNotice, '')
    assert.match(store.quoteError, /库存不足/)
  } finally {
    stub.restore()
  }
})

test('reset：换账号后券与试算结果都不留', async () => {
  const stub = stubRequest({
    get: { 'GET /couponApi/getAvailable': { list: [{ coupon_code: 'C1', selectable: true }] } },
    post: { 'POST /couponApi/previewUse': quote() },
  })
  try {
    const store = freshStore()
    await store.fetchCoupons({ amount: 178 })
    store.setCoupon('C1')
    store.setPoints(100)
    await store.refreshQuote({ items: ITEMS })

    store.reset()
    assert.deepEqual(store.coupons, [])
    assert.equal(store.couponCode, '')
    assert.equal(store.usePoints, 0)
    assert.equal(store.quote, null)
    assert.equal(store.quoteError, '')
    assert.equal(store.couponNotice, '')
  } finally {
    stub.restore()
  }
})
