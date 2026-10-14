/**
 * 消息中心 store 测试
 *
 * 打桩位置刻意选在 **axios 实例**（`src/api/request.js` 的默认导出）而不是
 * `src/api/ask/mail.js`：后者是被具名 import 进 store 的函数，ESM 命名空间
 * 不可写，没法替换；而 `request` 是个对象，替换它的 get/post 就能既覆盖
 * 「store 怎么用返回值」也覆盖「api 层怎么拼 URL / 参数」。
 */
import test from 'node:test'
import assert from 'node:assert/strict'

import { installStorageStub, installDomStub, loadAppModule } from './setup.js'

installStorageStub()
installDomStub()

const { createPinia, setActivePinia } = await import('pinia')
const { useMailStore } = await loadAppModule('/stores/mail.js')
const request = (await loadAppModule('/api/request.js')).default

/** 用一层薄桩替换 request.get / request.post，返回还原函数 */
function stubRequest({ get, post }) {
  const originalGet = request.get
  const originalPost = request.post
  if (get) request.get = get
  if (post) request.post = post
  return () => {
    request.get = originalGet
    request.post = originalPost
  }
}

/** 记录调用并回放固定响应 */
function recorder(routes) {
  const calls = []
  const handler = (method) => async (url, payload) => {
    calls.push({ method, url, payload })
    const key = `${method} ${url}`
    const route = routes[key]
    if (typeof route === 'function') return route(url, payload)
    if (route === undefined) throw new Error(`未打桩的请求：${key}`)
    return { data: route }
  }
  return {
    calls,
    stub: { get: handler('get'), post: handler('post') },
  }
}

function freshStore() {
  setActivePinia(createPinia())
  return useMailStore()
}

const MESSAGES = {
  'get /mailApi/getMessages': {
    list: [
      {
        id: 12,
        type: 'order_completed',
        title: '订单已完成',
        body: '订单 SSTC20261013001 已交付。',
        link: '/user/orders/SSTC20261013001',
        level: 'success',
        is_read: false,
        read_at: null,
        created_at: '2026-10-13T02:11:04.512Z',
      },
      {
        id: 11,
        type: 'points_expiring',
        title: '积分即将过期',
        body: null,
        link: '/points',
        level: 'warning',
        is_read: true,
        read_at: '2026-10-13T01:00:00.000Z',
        created_at: '2026-10-12T02:00:00.000Z',
      },
    ],
    unread: 3,
    pagination: { page: 1, limit: 20, total: 21, total_pages: 2, has_next: true, has_prev: false },
  },
}

// ── 初始状态 ─────────────────────────────────────────────────

test('state：初始形状固定，getter 不炸', () => {
  const mail = freshStore()
  assert.deepEqual(mail.list, [])
  assert.equal(mail.unreadCount, 0)
  assert.equal(mail.page, 1)
  assert.equal(mail.limit, 20)
  assert.equal(mail.total, 0)
  assert.equal(mail.totalPages, 1)
  assert.equal(mail.preferences, null)
  assert.equal(mail.emailConfigured, false)
  assert.equal(mail.emailMasked, '')
  assert.deepEqual(mail.log, [])
  assert.deepEqual(mail.logStats, { queued: 0, sent: 0, failed: 0 })

  assert.equal(mail.hasUnread, false)
  assert.equal(mail.hasMessages, false)
  assert.equal(mail.hasPrev, false)
  assert.equal(mail.hasNext, false)
  assert.equal(mail.hasLogPrev, false)
  assert.equal(mail.hasLogNext, false)
  assert.equal(mail.emailEnabled, false)
  assert.equal(mail.unreadLabel, '0')
})

test('unreadLabel：两位数是原样，超过 99 收敛成 99+', () => {
  const mail = freshStore()
  mail.unreadCount = 7
  assert.equal(mail.unreadLabel, '7')
  mail.unreadCount = 99
  assert.equal(mail.unreadLabel, '99')
  mail.unreadCount = 100
  assert.equal(mail.unreadLabel, '99+')
  mail.unreadCount = 1234
  assert.equal(mail.unreadLabel, '99+')
})

// ── 未读数 ───────────────────────────────────────────────────

test('fetchUnreadCount：写入数字并返回；服务端给字符串也要转成数字', async () => {
  const mail = freshStore()
  const { calls, stub } = recorder({ 'get /mailApi/getUnreadCount': { unread: '5' } })
  const restore = stubRequest(stub)
  try {
    const value = await mail.fetchUnreadCount()
    assert.equal(value, 5)
    assert.equal(mail.unreadCount, 5)
    assert.equal(calls.length, 1, '未读数只打一个请求')
  } finally {
    restore()
  }
})

test('fetchUnreadCount：静默失败不清零、不写错误（角标是装饰性信息）', async () => {
  const mail = freshStore()
  mail.unreadCount = 4
  const restore = stubRequest({
    get: async () => {
      throw new Error('网络错误')
    },
  })
  try {
    const value = await mail.fetchUnreadCount()
    assert.equal(value, 4, '失败时应保持旧值')
    assert.equal(mail.unreadCount, 4)
    assert.equal(mail.messagesError, '', '静默模式不写错误')
  } finally {
    restore()
  }
})

test('fetchUnreadCount：显式 silent:false 时才把错误写进 state', async () => {
  const mail = freshStore()
  mail.unreadCount = 4
  const restore = stubRequest({
    get: async () => {
      throw new Error('网关超时')
    },
  })
  try {
    await mail.fetchUnreadCount({ silent: false })
    assert.equal(mail.messagesError, '网关超时')
    assert.equal(mail.unreadCount, 4, '即使报错也不能把数字清成 0')
  } finally {
    restore()
  }
})

test('fetchUnreadCount：data 缺失时落回 0 而不是 NaN', async () => {
  const mail = freshStore()
  mail.unreadCount = 9
  const restore = stubRequest({ get: async () => ({ data: {} }) })
  try {
    assert.equal(await mail.fetchUnreadCount(), 0)
    assert.equal(mail.unreadCount, 0)
  } finally {
    restore()
  }
})

// ── 通知列表 ─────────────────────────────────────────────────

test('fetchMessages：填充列表 / 总数 / 总页数，并用响应里的 unread 刷新角标', async () => {
  const mail = freshStore()
  const { calls, stub } = recorder(MESSAGES)
  const restore = stubRequest(stub)
  try {
    await mail.fetchMessages()
    assert.equal(calls[0].url, '/mailApi/getMessages')
    assert.deepEqual(calls[0].payload, { params: { page: 1, limit: 20 } })

    assert.equal(mail.list.length, 2)
    assert.equal(mail.list[0].title, '订单已完成')
    assert.equal(mail.total, 21)
    assert.equal(mail.totalPages, 2)
    assert.equal(mail.unreadCount, 3, '列表响应里的 unread 是权威值')
    assert.equal(mail.loadingMessages, false)
    assert.equal(mail.hasMessages, true)
    assert.equal(mail.hasNext, true)
    assert.equal(mail.hasPrev, false)
  } finally {
    restore()
  }
})

test('fetchMessages：传 page 时先切页再请求', async () => {
  const mail = freshStore()
  const { calls, stub } = recorder(MESSAGES)
  const restore = stubRequest(stub)
  try {
    await mail.fetchMessages({ page: 2 })
    assert.equal(mail.page, 2)
    assert.deepEqual(calls[0].payload, { params: { page: 2, limit: 20 } })
  } finally {
    restore()
  }
})

test('fetchMessages：list 不是数组时按空列表处理（不让脏响应把页面渲染炸）', async () => {
  const mail = freshStore()
  const restore = stubRequest({ get: async () => ({ data: { list: null, pagination: {} } }) })
  try {
    await mail.fetchMessages()
    assert.deepEqual(mail.list, [])
    assert.equal(mail.total, 0)
    assert.equal(mail.totalPages, 1, 'total_pages 缺失时至少要有 1 页')
  } finally {
    restore()
  }
})

test('fetchMessages：失败清列表但保留页码，错误写进 state 且 loading 复位', async () => {
  const mail = freshStore()
  mail.page = 3
  const restore = stubRequest({
    get: async () => {
      throw new Error('接口 500')
    },
  })
  try {
    await mail.fetchMessages()
    assert.deepEqual(mail.list, [])
    assert.equal(mail.total, 0)
    assert.equal(mail.totalPages, 1)
    assert.equal(mail.page, 3, '失败时把用户弹回第一页更让人困惑')
    assert.equal(mail.messagesError, '接口 500')
    assert.equal(mail.loadingMessages, false, 'loading 必须在 finally 里复位')
  } finally {
    restore()
  }
})

test('fetchMessages：无 message 的错误也有兜底文案', async () => {
  const mail = freshStore()
  const restore = stubRequest({
    get: async () => {
      throw {}
    },
  })
  try {
    await mail.fetchMessages()
    assert.equal(mail.messagesError, '获取通知失败')
  } finally {
    restore()
  }
})

// ── 标记已读 ─────────────────────────────────────────────────

test('markRead：只标指定 id，并在本地同步已读样式（不重新拉列表）', async () => {
  const mail = freshStore()
  const { calls, stub } = recorder({
    ...MESSAGES,
    'post /mailApi/markRead': { updated: 1, unread: 2 },
  })
  const restore = stubRequest(stub)
  try {
    await mail.fetchMessages()
    const updated = await mail.markRead([12])

    assert.equal(updated, 1)
    assert.deepEqual(calls[1].payload, { ids: [12] })
    assert.equal(mail.list.find((item) => item.id === 12).is_read, true)
    assert.equal(mail.list.find((item) => item.id === 11).is_read, true, '没被点到的项保持原样')
    assert.equal(mail.unreadCount, 2)
  } finally {
    restore()
  }
})

test('markRead：省略 ids = 全部已读，请求体是空对象', async () => {
  const mail = freshStore()
  const { calls, stub } = recorder({
    ...MESSAGES,
    'post /mailApi/markRead': { updated: 3, unread: 0 },
  })
  const restore = stubRequest(stub)
  try {
    await mail.fetchMessages()
    await mail.markRead(null)
    assert.deepEqual(calls[1].payload, {})
    assert.equal(mail.list.every((item) => item.is_read), true)
    assert.equal(mail.unreadCount, 0)
    assert.equal(mail.hasUnread, false)
  } finally {
    restore()
  }
})

test('markRead：updated 为 0 时不动本地列表（避免无意义的全量重渲染）', async () => {
  const mail = freshStore()
  const { stub } = recorder({ ...MESSAGES, 'post /mailApi/markRead': { updated: 0, unread: 3 } })
  const restore = stubRequest(stub)
  try {
    await mail.fetchMessages()
    const before = mail.list
    await mail.markRead([12])
    assert.equal(mail.list, before, '引用未变：没有真的更新就整表替换是浪费')
    assert.equal(mail.list[0].is_read, false)
  } finally {
    restore()
  }
})

test('markRead：连点保护 —— 进行中时第二次调用直接返回 null 且不发请求', async () => {
  const mail = freshStore()
  let resolveFirst
  let postCalls = 0
  const restore = stubRequest({
    post: async () => {
      postCalls++
      return new Promise((resolve) => {
        resolveFirst = () => resolve({ data: { updated: 1, unread: 0 } })
      })
    },
  })
  try {
    const first = mail.markRead([12])
    assert.equal(mail.marking, true)
    const second = await mail.markRead([12])
    assert.equal(second, null)
    assert.equal(postCalls, 1, '第二次不应再发请求')

    resolveFirst()
    await first
    assert.equal(mail.marking, false)
  } finally {
    restore()
  }
})

test('markRead：失败返回 null、写错误，marking 必须复位（否则按钮永久禁用）', async () => {
  const mail = freshStore()
  const restore = stubRequest({
    post: async () => {
      throw new Error('标记失败')
    },
  })
  try {
    const result = await mail.markRead([12])
    assert.equal(result, null)
    assert.equal(mail.messagesError, '标记失败')
    assert.equal(mail.marking, false)
  } finally {
    restore()
  }
})

// ── 通知偏好 ─────────────────────────────────────────────────

test('fetchPreferences：写入偏好 / 是否已填邮箱 / 脱敏值，emailEnabled 跟随 email_enabled', async () => {
  const mail = freshStore()
  const { stub } = recorder({
    'get /mailApi/getPreferences': {
      preferences: {
        email_enabled: false,
        order_enabled: true,
        member_enabled: true,
        points_enabled: true,
        coupon_enabled: true,
        support_enabled: true,
        updated_at: '2026-10-13T01:20:00.000Z',
      },
      email_configured: true,
      email_masked: 'z***i@email.com',
    },
  })
  const restore = stubRequest(stub)
  try {
    await mail.fetchPreferences()
    assert.equal(mail.preferences.order_enabled, true)
    assert.equal(mail.emailEnabled, false)
    assert.equal(mail.emailConfigured, true)
    assert.equal(mail.emailMasked, 'z***i@email.com')
    assert.equal(mail.loadingPreferences, false)
    assert.equal(mail.preferencesError, '')
  } finally {
    restore()
  }
})

test('fetchPreferences：响应缺少 preferences 时置空，而不是留上一份', async () => {
  const mail = freshStore()
  mail.preferences = { email_enabled: true }
  const restore = stubRequest({ get: async () => ({ data: {} }) })
  try {
    await mail.fetchPreferences()
    assert.equal(mail.preferences, null)
    assert.equal(mail.emailEnabled, false)
  } finally {
    restore()
  }
})

test('fetchPreferences：失败清偏好、写错误、loading 复位', async () => {
  const mail = freshStore()
  mail.preferences = { email_enabled: true }
  const restore = stubRequest({
    get: async () => {
      throw new Error('403')
    },
  })
  try {
    await mail.fetchPreferences()
    assert.equal(mail.preferences, null, '拉不到就不能继续展示旧开关状态')
    assert.equal(mail.preferencesError, '403')
    assert.equal(mail.loadingPreferences, false)
  } finally {
    restore()
  }
})

test('savePreferences：只提交差异项，成功后以服务端返回值覆盖本地', async () => {
  const mail = freshStore()
  const { calls, stub } = recorder({
    'post /mailApi/updatePreferences': {
      preferences: { email_enabled: true, order_enabled: false, member_enabled: true, points_enabled: true, coupon_enabled: true, support_enabled: true },
    },
  })
  const restore = stubRequest(stub)
  try {
    const ok = await mail.savePreferences({ order_enabled: false })
    assert.equal(ok, true)
    assert.deepEqual(calls[0].payload, { order_enabled: false }, '只发改动项')
    assert.equal(mail.preferences.order_enabled, false)
    assert.equal(mail.preferencesSaved, true)
    assert.equal(mail.savingPreferences, false)
  } finally {
    restore()
  }
})

test('savePreferences：服务端没回 preferences 时保留本地已有值', async () => {
  const mail = freshStore()
  mail.preferences = { email_enabled: true, order_enabled: true }
  const restore = stubRequest({ post: async () => ({ data: {} }) })
  try {
    assert.equal(await mail.savePreferences({ order_enabled: false }), true)
    assert.equal(mail.preferences.order_enabled, true, '服务端没给新值就以本地为准')
  } finally {
    restore()
  }
})

test('savePreferences：失败返回 false、写错误、saving 复位', async () => {
  const mail = freshStore()
  const restore = stubRequest({
    post: async () => {
      throw new Error('400 没有要更新的项')
    },
  })
  try {
    assert.equal(await mail.savePreferences({}), false)
    assert.equal(mail.preferencesError, '400 没有要更新的项')
    assert.equal(mail.savingPreferences, false)
    assert.equal(mail.preferencesSaved, false)
  } finally {
    restore()
  }
})

test('savePreferences：保存进行中再次调用直接返回 false 且不发请求', async () => {
  const mail = freshStore()
  let postCalls = 0
  let release
  const restore = stubRequest({
    post: async () => {
      postCalls++
      return new Promise((resolve) => {
        release = () => resolve({ data: { preferences: {} } })
      })
    },
  })
  try {
    const first = mail.savePreferences({ order_enabled: false })
    assert.equal(await mail.savePreferences({ member_enabled: false }), false)
    assert.equal(postCalls, 1)
    release()
    await first
  } finally {
    restore()
  }
})

// ── 邮件台账 ─────────────────────────────────────────────────

test('fetchMailLog：填充台账 / 统计 / 分页；stats 缺字段落回 0', async () => {
  const mail = freshStore()
  const { calls, stub } = recorder({
    'get /mailApi/getMailLog': {
      list: [
        { id: 9, template_code: 'order_completed', template_name: '订单完成通知', category: 'order', status: 'sent', attempts: 1, created_at: '2026-10-13T02:11:04.512Z', sent_at: '2026-10-13T02:11:31.004Z' },
      ],
      stats: { queued: 0, sent: '8', failed: 1 },
      pagination: { page: 1, limit: 20, total: 9, total_pages: 1 },
    },
  })
  const restore = stubRequest(stub)
  try {
    await mail.fetchMailLog()
    assert.equal(calls[0].url, '/mailApi/getMailLog')
    assert.deepEqual(calls[0].payload, { params: { page: 1, limit: 20 } })
    assert.equal(mail.log.length, 1)
    assert.equal(mail.log[0].template_name, '订单完成通知')
    assert.deepEqual(mail.logStats, { queued: 0, sent: 8, failed: 1 }, 'Neon 会给字符串，必须转数字')
    assert.equal(mail.logTotal, 9)
    assert.equal(mail.logTotalPages, 1)
    assert.equal(mail.loadingLog, false)
  } finally {
    restore()
  }
})

test('fetchMailLog：传 page 时先切页再请求，hasLogNext 跟随总页数', async () => {
  const mail = freshStore()
  const { calls, stub } = recorder({
    'get /mailApi/getMailLog': { list: [], stats: {}, pagination: { total: 40, total_pages: 2 } },
  })
  const restore = stubRequest(stub)
  try {
    await mail.fetchMailLog({ page: 2 })
    assert.equal(mail.logPage, 2)
    assert.deepEqual(calls[0].payload, { params: { page: 2, limit: 20 } })
    assert.equal(mail.hasLogPrev, true)
    assert.equal(mail.hasLogNext, false)
  } finally {
    restore()
  }
})

test('fetchMailLog：失败清零并写错误，loading 复位', async () => {
  const mail = freshStore()
  mail.logPage = 2
  const restore = stubRequest({
    get: async () => {
      throw new Error('台账炸了')
    },
  })
  try {
    await mail.fetchMailLog()
    assert.deepEqual(mail.log, [])
    assert.deepEqual(mail.logStats, { queued: 0, sent: 0, failed: 0 })
    assert.equal(mail.logTotal, 0)
    assert.equal(mail.logTotalPages, 1)
    assert.equal(mail.logPage, 2, '页码同样保留')
    assert.equal(mail.logError, '台账炸了')
    assert.equal(mail.loadingLog, false)
  } finally {
    restore()
  }
})

// ── reset ────────────────────────────────────────────────────

test('reset：清空三条数据线（换号/登出时不能把上一个账号的角标留给下一个人）', async () => {
  const mail = freshStore()
  const { stub } = recorder({
    ...MESSAGES,
    'get /mailApi/getPreferences': {
      preferences: { email_enabled: true },
      email_configured: true,
      email_masked: 'a***b@c.com',
    },
    'get /mailApi/getMailLog': { list: [{ id: 1 }], stats: { queued: 1, sent: 2, failed: 3 }, pagination: { total: 6, total_pages: 2 } },
  })
  const restore = stubRequest(stub)
  try {
    await mail.fetchMessages()
    await mail.fetchPreferences()
    await mail.fetchMailLog()
    assert.equal(mail.unreadCount, 3)
    assert.equal(mail.log.length, 1)

    mail.reset()

    assert.deepEqual(mail.list, [])
    assert.equal(mail.unreadCount, 0)
    assert.equal(mail.page, 1)
    assert.equal(mail.total, 0)
    assert.equal(mail.totalPages, 1)
    assert.equal(mail.messagesError, '')
    assert.equal(mail.marking, false)
    assert.equal(mail.preferences, null)
    assert.equal(mail.emailConfigured, false)
    assert.equal(mail.emailMasked, '')
    assert.equal(mail.preferencesError, '')
    assert.equal(mail.preferencesSaved, false)
    assert.deepEqual(mail.log, [])
    assert.deepEqual(mail.logStats, { queued: 0, sent: 0, failed: 0 })
    assert.equal(mail.logPage, 1)
    assert.equal(mail.logTotalPages, 1)
    assert.equal(mail.logError, '')
  } finally {
    restore()
  }
})

test('reset：保留 limit（它是常量而非账号数据）', () => {
  const mail = freshStore()
  mail.limit = 50
  mail.reset()
  assert.equal(mail.limit, 50)
})
