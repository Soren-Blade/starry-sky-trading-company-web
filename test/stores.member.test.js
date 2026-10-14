/**
 * 会员 store 测试
 *
 * 这个文件首先是 `hasLevels` 的**回归护栏**：`levels` 的初值是 `null`（不是 `[]`），
 * 页面原先写 `if (!memberStore.levels.length) memberStore.fetchPlans()`，
 * 在全新会话首屏会抛 `TypeError: Cannot read properties of null`，
 * 整个 `onMounted` 被打断（后续请求与副作用都不执行）。这类错误
 * lint / build / SSR 渲染都看不见，只有真的挂载组件才会炸，
 * 所以把「有没有」收进 getter，并在 store 层钉住它的语义。
 *
 * 打桩位置与 `stores.mail.test.js` 一致：替换 axios 实例（`src/api/request.js`
 * 的默认导出）的 `get`，这样既覆盖 store 怎么用返回值，也覆盖 api 层怎么拼 URL。
 */
import test from 'node:test'
import assert from 'node:assert/strict'

import { installStorageStub, installDomStub, loadAppModule } from './setup.js'

installStorageStub()
installDomStub()

const { createPinia, setActivePinia } = await import('pinia')
const { useMemberStore } = await loadAppModule('/stores/member.js')
const request = (await loadAppModule('/api/request.js')).default

/** 用一层薄桩替换 request.get，返回调用记录与还原函数 */
function stubGet(routes) {
  const originalGet = request.get
  const calls = []
  request.get = async (url, config) => {
    calls.push({ url, config })
    const route = routes[`GET ${url}`]
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

/** 每个用例一份干净的 pinia，避免用例之间互相污染 */
function freshStore() {
  setActivePinia(createPinia())
  return useMemberStore()
}

/** 一档等级对照项：字段名必须与 `getPlans` 的 `levels[]` 一致 */
function level(overrides = {}) {
  return {
    level: 'v1',
    name: '见习商人',
    growth_threshold: 0,
    discount_rate: 0.95,
    points_multiplier: 2.0,
    coupon_pack_value: 10,
    points_deduct_cap: 0.3,
    free_tool_quota: 1,
    birthday_value: 0,
    support_tier: 'standard',
    identity_tier: 'none',
    ...overrides,
  }
}

test('levels 初值是 null，hasLevels 为 false（页面据此走 fetchPlans 分支而不是取 .length）', () => {
  const store = freshStore()
  assert.equal(store.levels, null)
  assert.equal(store.hasLevels, false)
  // 守卫写法本身不能抛错 —— 这正是修复前的故障点
  assert.doesNotThrow(() => {
    if (!store.hasLevels) return 'need-fetch'
    return 'cached'
  })
})

test('hasLevels：空数组是 false，有一档才是 true，脏值也不会抛', () => {
  const store = freshStore()

  store.levels = []
  assert.equal(store.hasLevels, false)

  store.levels = [level()]
  assert.equal(store.hasLevels, true)

  // 非数组（后端异常/被别处写坏）时按「没有」处理，不能崩
  for (const dirty of [undefined, null, 'v1', 0, {}]) {
    store.levels = dirty
    assert.equal(store.hasLevels, false, `levels=${JSON.stringify(dirty)} 应为 false`)
  }
})

test('benefits 缺 overview 时是空数组，有 overview 时逐项透传 value', () => {
  const store = freshStore()
  assert.deepEqual(store.benefits, [])

  store.overview = {
    is_member: true,
    level: 'v4',
    level_name: '星系商人',
    benefits: [
      { key: 'discount', unlocked: true, required_level: 'v1', value: { type: 'rate', current: 0.93 } },
      { key: 'birthday', unlocked: false, required_level: 'v4' },
    ],
  }

  assert.equal(store.benefits.length, 2)
  assert.deepEqual(store.benefits[0].value, { type: 'rate', current: 0.93 })
  // 未解锁项**不带 value**：页面判的是「键在不在」，不是「是不是 0」
  assert.equal(Object.hasOwn(store.benefits[1], 'value'), false)
})

test('level / levelName / isMember 的默认值：非会员是 none / 空串 / false', () => {
  const store = freshStore()
  assert.equal(store.level, 'none')
  assert.equal(store.levelName, '')
  assert.equal(store.isMember, false)
  assert.equal(store.hasExpiringTodo, false)

  store.overview = { is_member: false, level: 'none', todos: [] }
  assert.equal(store.level, 'none')

  store.overview = { is_member: true, level: 'v2', level_name: '行商', todos: [{ type: 'member_expiring' }] }
  assert.equal(store.isMember, true)
  assert.equal(store.level, 'v2')
  assert.equal(store.levelName, '行商')
  assert.equal(store.hasExpiringTodo, true)
})

test('fetchPlans：一次响应同时落 plans 与 levels，六列数值原样保留', async () => {
  const store = freshStore()
  const stub = stubGet({
    'GET /memberApi/getPlans': {
      plans: [{ plan_id: 'star_1m', name: '星享月卡' }],
      levels: [level(), level({ level: 'v4', growth_threshold: 3000, free_tool_quota: 3, support_tier: 'priority' })],
      payment_notice: '支付通道尚未接入客服代开',
      refund_notice: '未使用可按比例退款',
    },
  })
  try {
    const data = await store.fetchPlans()

    assert.equal(stub.calls.length, 1)
    assert.equal(stub.calls[0].url, '/memberApi/getPlans')
    assert.equal(data.plans.length, 1)
    assert.equal(store.plans.length, 1)
    assert.equal(store.levels.length, 2)
    assert.equal(store.hasLevels, true)
    assert.equal(store.levels[1].free_tool_quota, 3)
    assert.equal(store.levels[1].support_tier, 'priority')
    assert.equal(store.paymentNotice, '支付通道尚未接入客服代开')
    assert.equal(store.refundNotice, '未使用可按比例退款')
    assert.equal(store.loadingPlans, false)
  } finally {
    stub.restore()
  }
})

test('fetchPlans 失败：plans/levels 归 null、hasLevels 回 false、错误落进 error', async () => {
  const store = freshStore()
  store.levels = [level()]
  const stub = stubGet({
    'GET /memberApi/getPlans': () => {
      throw new Error('获取套餐失败')
    },
  })
  try {
    const data = await store.fetchPlans()

    assert.equal(data, null)
    assert.equal(store.plans, null)
    assert.equal(store.levels, null)
    assert.equal(store.hasLevels, false)
    assert.match(store.error, /获取套餐失败/)
  } finally {
    stub.restore()
  }
})

test('fetchOverview：401 不算错误（显示登录引导而不是一片红）', async () => {
  const store = freshStore()
  const stub = stubGet({
    'GET /memberApi/getOverview': () => {
      const error = new Error('Request failed with status code 401')
      error.response = { status: 401 }
      throw error
    },
  })
  try {
    const data = await store.fetchOverview()

    assert.equal(data, null)
    assert.equal(store.overview, null)
    assert.equal(store.error, '')
    assert.equal(store.isMember, false)
    assert.equal(store.loadingOverview, false)
  } finally {
    stub.restore()
  }
})

test('fetchOverview 成功：overview 落库，八项权益与逐档数值都读得到', async () => {
  const store = freshStore()
  const stub = stubGet({
    'GET /memberApi/getOverview': {
      is_member: true,
      level: 'v3',
      level_name: '商队首领',
      points: 12800,
      benefits: [
        { key: 'discount', unlocked: true, required_level: 'v1', value: { type: 'rate', current: 0.94 } },
      ],
    },
  })
  try {
    await store.fetchOverview()

    assert.equal(store.isMember, true)
    assert.equal(store.levelName, '商队首领')
    assert.equal(store.points, 12800)
    assert.equal(store.benefits.length, 1)
    assert.equal(store.benefits[0].value.current, 0.94)
  } finally {
    stub.restore()
  }
})
