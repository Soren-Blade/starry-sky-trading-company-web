/**
 * 首页人格位 store 测试（1.6.0）
 *
 * 守三件事：
 *   1. **空对象是正常结果，不是错误**：游客与非会员都拿到 `{}`（L2：整块缺席
 *      代表「没有这个能力」），因此 `error` 必须保持空、`hasBenefits` 为 false；
 *   2. **不给缺失的键补 0**：`coupons` / `coupon_expiring` 为 0 时服务端不下发，
 *      store 原样透出，页面用「键在不在」判断；
 *   3. **失败保留上一次的速览**：网络抖动不该让面板整块消失。
 */
import test from 'node:test'
import assert from 'node:assert/strict'

import { installStorageStub, installDomStub, loadAppModule } from './setup.js'

installStorageStub()
installDomStub()

const { createPinia, setActivePinia } = await import('pinia')
const { useHeroStore } = await loadAppModule('/stores/hero.js')
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
  return useHeroStore()
}

test('初值：没有速览', () => {
  const store = freshStore()
  assert.equal(store.persona, null)
  assert.equal(store.hasBenefits, false)
  assert.equal(store.benefits, null)
  assert.equal(store.loaded, false)
})

test('游客 / 非会员：{ } 是正常结果，不记错误', async () => {
  const store = freshStore()
  const stub = stubRequest({ get: { 'GET /heroApi/getHeroPersona': {} } })
  try {
    await store.fetchPersona()
    assert.equal(stub.calls[0].url, '/heroApi/getHeroPersona')
    assert.deepEqual(store.persona, {})
    assert.equal(store.hasBenefits, false)
    assert.equal(store.error, '')
    assert.equal(store.loaded, true)
  } finally {
    stub.restore()
  }
})

test('会员：等级名可取，缺的键不补 0', async () => {
  const store = freshStore()
  const stub = stubRequest({
    get: {
      'GET /heroApi/getHeroPersona': {
        benefits: {
          member_level: 'v4',
          member_level_name: 'V4',
          member_days_left: 394,
          points: 65,
          points_value: 0.65,
          coupons: 1,
          checkin_available: true,
          checkin_points: 45,
        },
      },
    },
  })
  try {
    await store.fetchPersona()
    assert.equal(store.hasBenefits, true)
    assert.equal(store.memberLevelName, 'V4')
    assert.equal(store.hasCheckinHint, true)
    // coupon_expiring 为 0 → 服务端不下发 → 这里必须仍是「不存在」而不是 0
    assert.equal('coupon_expiring' in store.benefits, false)
  } finally {
    stub.restore()
  }
})

test('checkin_available 只有 true 才算（不然前端会长出「今天签到可得」）', async () => {
  const store = freshStore()
  const stub = stubRequest({
    get: {
      'GET /heroApi/getHeroPersona': {
        benefits: { member_level: 'v4', points: 10, points_value: 0.1 },
      },
    },
  })
  try {
    await store.fetchPersona()
    assert.equal(store.hasCheckinHint, false)
  } finally {
    stub.restore()
  }
})

test('失败：记错误、保留上一次的速览', async () => {
  const store = freshStore()
  const stub = stubRequest({
    get: {
      'GET /heroApi/getHeroPersona': () => {
        throw { message: '服务不可用', response: { status: 500 } }
      },
    },
  })
  try {
    store.persona = { benefits: { member_level_name: 'V4' } }
    const data = await store.fetchPersona()
    assert.equal(data, null)
    assert.equal(store.error, '服务不可用')
    assert.equal(store.memberLevelName, 'V4')
  } finally {
    stub.restore()
  }
})

test('401 不算错误（未登录时不该在首页留一条红字）', async () => {
  const store = freshStore()
  const stub = stubRequest({
    get: {
      'GET /heroApi/getHeroPersona': () => {
        throw { message: '未授权', response: { status: 401 } }
      },
    },
  })
  try {
    await store.fetchPersona()
    assert.equal(store.error, '')
  } finally {
    stub.restore()
  }
})

test('reset：换账号清掉速览', () => {
  const store = freshStore()
  store.persona = { benefits: { member_level_name: 'V4' } }
  store.loaded = true
  store.reset()
  assert.equal(store.persona, null)
  assert.equal(store.hasBenefits, false)
  assert.equal(store.loaded, false)
})
