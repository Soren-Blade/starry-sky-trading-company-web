/**
 * 客服中心 store 测试
 *
 * 打桩位置与 `stores.mail.test.js` 一致：选 **axios 实例**（`src/api/request.js`
 * 的默认导出）而不是 `src/api/ask/support.js` —— 后者是被具名 import 进 store
 * 的函数，ESM 命名空间不可写；`request` 是对象，替换它的 get/post 既能覆盖
 * 「store 怎么用返回值」，也能覆盖「api 层怎么拼 URL 与参数」。
 */
import test from 'node:test'
import assert from 'node:assert/strict'

import { installStorageStub, installDomStub, loadAppModule } from './setup.js'

installStorageStub()
installDomStub()

const { createPinia, setActivePinia } = await import('pinia')
const { useSupportStore } = await loadAppModule('/stores/support.js')
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

/** 记录调用并回放固定响应；route 为函数时返回值必须已是 `{ data }` 形状 */
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
  return useSupportStore()
}

const THREADS = {
  list: [
    {
      thread_no: 'FB20261013A1B2C3',
      subject: '订单一直没收到',
      category: 'order',
      status: 'pending',
      message_count: 3,
      unread: 1,
      last_message_at: '2026-10-13T04:00:00.000Z',
      created_at: '2026-10-12T04:00:00.000Z',
    },
    {
      thread_no: 'FB20261013D4E5F6',
      subject: '积分怎么少了',
      category: 'points',
      status: 'open',
      message_count: 1,
      unread: 0,
      last_message_at: '2026-10-12T04:00:00.000Z',
      created_at: '2026-10-12T04:00:00.000Z',
    },
  ],
  unread: 1,
  pagination: { page: 1, limit: 10, total: 12, total_pages: 2, has_next: true, has_prev: false },
}

const THREAD_DETAIL = {
  thread: {
    thread_no: 'FB20261013A1B2C3',
    subject: '订单一直没收到',
    category: 'order',
    status: 'pending',
    contact_email: 'buyer@example.com',
    message_count: 2,
    last_message_at: '2026-10-13T04:00:00.000Z',
    created_at: '2026-10-12T04:00:00.000Z',
  },
  messages: [
    { id: 41, author_type: 'user', body: '订单没收到', source: 'web', created_at: '2026-10-12T04:00:00.000Z' },
    { id: 42, author_type: 'staff', body: '已为你补发', source: 'admin', created_at: '2026-10-13T04:00:00.000Z' },
  ],
}

/** 造一个带 code 的请求错误（真实实现里由 request.js 包装后抛出） */
function requestError(message, code) {
  const error = new Error(message)
  if (code) error.code = code
  return error
}

// ── 初始状态 ─────────────────────────────────────────────────

test('state：初始形状固定，getter 不炸', () => {
  const support = freshStore()
  assert.deepEqual(support.threads, [])
  assert.equal(support.threadsPage, 1)
  assert.equal(support.threadsLimit, 10)
  assert.equal(support.threadsTotal, 0)
  assert.equal(support.threadsTotalPages, 1)
  assert.equal(support.threadsUnread, 0)
  assert.equal(support.loadingThreads, false)
  assert.equal(support.threadsError, '')
  assert.equal(support.currentNo, '')
  assert.equal(support.current, null)
  assert.deepEqual(support.messages, [])
  assert.equal(support.loadingThread, false)
  assert.equal(support.threadError, '')
  assert.equal(support.creating, false)
  assert.equal(support.created, null)
  assert.equal(support.createError, '')
  assert.equal(support.replying, false)
  assert.equal(support.replyError, '')
  assert.equal(support.replySent, false)
})

test('getters：空状态下的每个派生值都有确定答案', () => {
  const support = freshStore()
  assert.equal(support.hasThreads, false)
  assert.equal(support.threadsHasPrev, false)
  assert.equal(support.threadsHasNext, false)
  assert.equal(support.hasThreadsUnread, false)
  assert.equal(support.threadsUnreadLabel, '')
  assert.equal(support.hasCreated, false)
  assert.equal(support.createdThreadNo, '')
  assert.equal(support.hasCurrent, false)
  assert.equal(support.hasMessages, false)
  assert.equal(support.currentStatus, '')
  assert.equal(support.currentEmail, '')
})

test('getters：有数据时的派生值（含未读数 99+ 收敛）', () => {
  const support = freshStore()
  support.threads = THREADS.list
  support.threadsPage = 1
  support.threadsTotalPages = 2
  support.threadsUnread = 12
  support.created = { thread_no: 'FB20261013A1B2C3', message_id: 41, status: 'open' }
  support.currentNo = 'FB20261013A1B2C3'
  support.current = { status: 'pending', contact_email: 'buyer@example.com' }
  support.messages = THREAD_DETAIL.messages

  assert.equal(support.hasThreads, true)
  assert.equal(support.threadsHasPrev, false)
  assert.equal(support.threadsHasNext, true)
  assert.equal(support.threadsUnreadLabel, '12')
  assert.equal(support.hasCreated, true)
  assert.equal(support.createdThreadNo, 'FB20261013A1B2C3')
  assert.equal(support.hasCurrent, true)
  assert.equal(support.hasMessages, true)
  assert.equal(support.currentStatus, 'pending')
  assert.equal(support.currentEmail, 'buyer@example.com')

  support.threadsUnread = 100
  assert.equal(support.threadsUnreadLabel, '99+')
})

// ── 提交反馈 ─────────────────────────────────────────────────

test('createThread：成功后记下回执号，并把它当作当前会话', async () => {
  const support = freshStore()
  const { calls, stub } = recorder({
    'post /supportApi/createThread': { thread_no: 'FB20261013A1B2C3', message_id: 41, status: 'open' },
  })
  const restore = stubRequest(stub)
  try {
    const no = await support.createThread({
      category: 'order',
      subject: '订单没收到',
      body: '订单号 SSTC…',
      contact_email: 'buyer@example.com',
    })
    assert.equal(no, 'FB20261013A1B2C3')
    assert.deepEqual(support.created, {
      thread_no: 'FB20261013A1B2C3',
      message_id: 41,
      status: 'open',
    })
    assert.equal(support.currentNo, 'FB20261013A1B2C3')
    assert.equal(support.hasCreated, true)
    assert.equal(support.createError, '')
    assert.equal(support.creating, false)
    assert.equal(calls.length, 1)
    assert.equal(calls[0].url, '/supportApi/createThread')
    assert.equal(calls[0].payload.contact_email, 'buyer@example.com')
  } finally {
    restore()
  }
})

test('createThread：服务端没给 data 时不算成功（返回 null，也不写错误）', async () => {
  const support = freshStore()
  const { stub } = recorder({ 'post /supportApi/createThread': null })
  const restore = stubRequest(stub)
  try {
    const no = await support.createThread({ subject: 'x', body: 'y' })
    assert.equal(no, null)
    assert.equal(support.hasCreated, false)
    assert.equal(support.currentNo, '')
    assert.equal(support.createError, '')
  } finally {
    restore()
  }
})

test('createThread：429 的服务端文案原样进 createError（页面直接展示）', async () => {
  const support = freshStore()
  const message = '提交太频繁了，24 小时内最多提交 5 次，请稍后再试'
  const { stub } = recorder({
    'post /supportApi/createThread': () => {
      throw requestError(message, 'RATE_LIMITED')
    },
  })
  const restore = stubRequest(stub)
  try {
    const no = await support.createThread({ subject: 'x', body: 'y' })
    assert.equal(no, null)
    assert.equal(support.createError, message)
    assert.equal(support.creating, false)
  } finally {
    restore()
  }
})

test('createThread：失败会清掉上一次的回执号（不能让人看着旧回执号以为成功）', async () => {
  const support = freshStore()
  support.created = { thread_no: 'FB20261013000000' }
  support.currentNo = 'FB20261013000000'
  const { stub } = recorder({
    'post /supportApi/createThread': () => {
      throw requestError('提交失败', 'CREATE_THREAD_ERROR')
    },
  })
  const restore = stubRequest(stub)
  try {
    await support.createThread({ subject: 'x', body: 'y' })
    assert.equal(support.created, null)
    assert.equal(support.createError, '提交失败')
  } finally {
    restore()
  }
})

test('createThread：连点保护 —— 进行中再点不会真的多开一条会话', async () => {
  const support = freshStore()
  let resolveRequest = null
  const { calls, stub } = recorder({
    'post /supportApi/createThread': () =>
      new Promise((resolve) => {
        resolveRequest = () => resolve({ data: { thread_no: 'FB20261013A1B2C3', message_id: 41, status: 'open' } })
      }),
  })
  const restore = stubRequest(stub)
  try {
    const first = support.createThread({ subject: 'x', body: 'y' })
    assert.equal(support.creating, true)
    const second = await support.createThread({ subject: 'x', body: 'y' })
    assert.equal(second, null)
    assert.equal(calls.length, 1, '进行中的第二次提交不应发出请求')
    resolveRequest()
    assert.equal(await first, 'FB20261013A1B2C3')
    assert.equal(support.creating, false)
  } finally {
    restore()
  }
})

// ── 会话列表 ─────────────────────────────────────────────────

test('fetchThreads：默认第一页 10 条，并写入列表与分页', async () => {
  const support = freshStore()
  const { calls, stub } = recorder({ 'get /supportApi/getThreads': THREADS })
  const restore = stubRequest(stub)
  try {
    await support.fetchThreads()
    assert.equal(calls[0].payload.params.page, 1)
    assert.equal(calls[0].payload.params.limit, 10)
    assert.equal(support.threads.length, 2)
    assert.equal(support.threadsUnread, 1)
    assert.equal(support.threadsTotal, 12)
    assert.equal(support.threadsTotalPages, 2)
    assert.equal(support.threadsError, '')
    assert.equal(support.loadingThreads, false)
  } finally {
    restore()
  }
})

test('fetchThreads：翻页会带上页码，失败时保留页码（把用户弹回第一页更困惑）', async () => {
  const support = freshStore()
  const { calls, stub } = recorder({
    'get /supportApi/getThreads': (url, payload) =>
      payload.params.page === 2
        ? { data: { list: [], unread: 0, pagination: { page: 2, limit: 10, total: 12, total_pages: 2 } } }
        : { data: THREADS },
  })
  const restore = stubRequest(stub)
  try {
    await support.fetchThreads({ page: 2 })
    assert.equal(calls[0].payload.params.page, 2)
    assert.equal(support.threadsPage, 2)
  } finally {
    restore()
  }

  const failing = recorder({
    'get /supportApi/getThreads': () => {
      throw requestError('网络错误', 'NETWORK')
    },
  })
  const restoreFailing = stubRequest(failing.stub)
  try {
    await support.fetchThreads({ page: 2 })
    assert.equal(support.threadsPage, 2, '页码要留着')
    assert.deepEqual(support.threads, [])
    assert.equal(support.threadsTotal, 0)
    assert.equal(support.threadsTotalPages, 1)
    assert.equal(support.threadsError, '网络错误')
  } finally {
    restoreFailing()
  }
})

test('fetchThreads：服务端缺字段时兜底成空列表 / 单页，而不是 undefined', async () => {
  const support = freshStore()
  const { stub } = recorder({ 'get /supportApi/getThreads': {} })
  const restore = stubRequest(stub)
  try {
    await support.fetchThreads()
    assert.deepEqual(support.threads, [])
    assert.equal(support.threadsUnread, 0)
    assert.equal(support.threadsTotal, 0)
    assert.equal(support.threadsTotalPages, 1)
  } finally {
    restore()
  }
})

test('fetchThreads：失败文案兜底（服务端没给 message 时不能显示 undefined）', async () => {
  const support = freshStore()
  const { stub } = recorder({
    'get /supportApi/getThreads': () => {
      throw new Error('')
    },
  })
  const restore = stubRequest(stub)
  try {
    await support.fetchThreads()
    assert.equal(support.threadsError, '获取会话列表失败')
  } finally {
    restore()
  }
})

// ── 会话详情 ─────────────────────────────────────────────────

test('fetchThread：按回执号打开详情（含全部消息）', async () => {
  const support = freshStore()
  const { calls, stub } = recorder({ 'get /supportApi/getThread': THREAD_DETAIL })
  const restore = stubRequest(stub)
  try {
    const ok = await support.fetchThread('FB20261013A1B2C3')
    assert.equal(ok, true)
    assert.equal(calls[0].payload.params.thread_no, 'FB20261013A1B2C3')
    assert.equal(support.currentNo, 'FB20261013A1B2C3')
    assert.equal(support.current.subject, '订单一直没收到')
    assert.equal(support.currentEmail, 'buyer@example.com')
    assert.equal(support.messages.length, 2)
    assert.equal(support.threadError, '')
  } finally {
    restore()
  }
})

test('fetchThread：空回执号直接返回 false，不发请求', async () => {
  const support = freshStore()
  const { calls, stub } = recorder({})
  const restore = stubRequest(stub)
  try {
    assert.equal(await support.fetchThread('   '), false)
    assert.equal(await support.fetchThread(null), false)
    assert.equal(calls.length, 0)
  } finally {
    restore()
  }
})

test('fetchThread：404 统一说「没找到这条会话」（不区分不存在与不是你的）', async () => {
  const support = freshStore()
  const { stub } = recorder({
    'get /supportApi/getThread': () => {
      throw requestError('会话不存在', 'THREAD_NOT_FOUND')
    },
  })
  const restore = stubRequest(stub)
  try {
    const ok = await support.fetchThread('FB20261013999999')
    assert.equal(ok, false)
    assert.equal(support.threadError, '没找到这条会话，请检查回执号是否正确')
    assert.equal(support.current, null)
    assert.deepEqual(support.messages, [])
    assert.equal(support.loadingThread, false)
  } finally {
    restore()
  }
})

test('fetchThread：其它错误用服务端文案，缺文案时兜底', async () => {
  const support = freshStore()
  const { stub } = recorder({
    'get /supportApi/getThread': () => {
      throw requestError('服务开小差了', 'SERVER_ERROR')
    },
  })
  const restore = stubRequest(stub)
  try {
    await support.fetchThread('FB20261013A1B2C3')
    assert.equal(support.threadError, '服务开小差了')
  } finally {
    restore()
  }
})

// ── 追问 ─────────────────────────────────────────────────────

test('reply：没有打开的会话时不发请求', async () => {
  const support = freshStore()
  const { calls, stub } = recorder({})
  const restore = stubRequest(stub)
  try {
    assert.equal(await support.reply('再问一句'), false)
    assert.equal(calls.length, 0)
  } finally {
    restore()
  }
})

test('reply：成功后重新拉详情（服务端会改状态与计数，本地拼一条会对不上）', async () => {
  const support = freshStore()
  support.currentNo = 'FB20261013A1B2C3'
  let replied = false
  const detailAfterReply = {
    thread: { ...THREAD_DETAIL.thread, status: 'open', message_count: 3 },
    messages: [
      ...THREAD_DETAIL.messages,
      { id: 43, author_type: 'user', body: '再问一句', source: 'web', created_at: '2026-10-13T05:00:00.000Z' },
    ],
  }
  const { calls, stub } = recorder({
    'post /supportApi/reply': () => {
      replied = true
      return { data: { message_id: 43, status: 'open' } }
    },
    'get /supportApi/getThread': () => ({ data: replied ? detailAfterReply : THREAD_DETAIL }),
  })
  const restore = stubRequest(stub)
  try {
    const ok = await support.reply('再问一句')
    assert.equal(ok, true)
    assert.equal(support.replySent, true)
    assert.equal(support.replying, false)
    assert.equal(support.replyError, '')
    assert.deepEqual(calls[0].payload, { thread_no: 'FB20261013A1B2C3', body: '再问一句' })
    assert.equal(calls.length, 2, '追问之后要重新拉一次详情')
    assert.equal(support.messages.length, 3)
    assert.equal(support.currentStatus, 'open')
  } finally {
    restore()
  }
})

test('reply：失败写 replyError 且不谎报已发送', async () => {
  const support = freshStore()
  support.currentNo = 'FB20261013A1B2C3'
  const { stub } = recorder({
    'post /supportApi/reply': () => {
      throw requestError('内容不能超过 5000 个字符', 'INVALID_PARAMS')
    },
  })
  const restore = stubRequest(stub)
  try {
    const ok = await support.reply('x')
    assert.equal(ok, false)
    assert.equal(support.replyError, '内容不能超过 5000 个字符')
    assert.equal(support.replySent, false)
    assert.equal(support.replying, false)
  } finally {
    restore()
  }
})

test('reply：失败后可以再试（replying 必须复位）', async () => {
  const support = freshStore()
  support.currentNo = 'FB20261013A1B2C3'
  let attempt = 0
  const { calls, stub } = recorder({
    'post /supportApi/reply': () => {
      attempt += 1
      if (attempt === 1) throw requestError('网络错误', 'NETWORK')
      return { data: { message_id: 43, status: 'open' } }
    },
    'get /supportApi/getThread': THREAD_DETAIL,
  })
  const restore = stubRequest(stub)
  try {
    assert.equal(await support.reply('第一次'), false)
    assert.equal(await support.reply('第二次'), true)
    assert.equal(calls.filter((c) => c.method === 'post').length, 2)
    assert.equal(support.replyError, '')
    assert.equal(support.replySent, true)
  } finally {
    restore()
  }
})

test('reply：连点保护（相同正文不会重复提交）', async () => {
  const support = freshStore()
  support.currentNo = 'FB20261013A1B2C3'
  let release = null
  const { calls, stub } = recorder({
    'post /supportApi/reply': () =>
      new Promise((resolve) => {
        release = () => resolve({ data: { message_id: 43, status: 'open' } })
      }),
    'get /supportApi/getThread': THREAD_DETAIL,
  })
  const restore = stubRequest(stub)
  try {
    const first = support.reply('追问')
    assert.equal(support.replying, true)
    assert.equal(await support.reply('追问'), false)
    assert.equal(calls.filter((c) => c.method === 'post').length, 1)
    release()
    assert.equal(await first, true)
    assert.equal(support.replying, false)
  } finally {
    restore()
  }
})

// ── 收尾动作 ─────────────────────────────────────────────────

test('closeThread：清掉详情但保留列表（返回列表不该触发重新请求）', () => {
  const support = freshStore()
  support.threads = THREADS.list
  support.currentNo = 'FB20261013A1B2C3'
  support.current = THREAD_DETAIL.thread
  support.messages = THREAD_DETAIL.messages
  support.replySent = true
  support.replyError = '旧错误'
  support.threadError = '旧错误'

  support.closeThread()

  assert.equal(support.currentNo, '')
  assert.equal(support.current, null)
  assert.deepEqual(support.messages, [])
  assert.equal(support.threadError, '')
  assert.equal(support.replyError, '')
  assert.equal(support.replySent, false)
  assert.equal(support.threads.length, 2)
})

test('clearCreated：「再提一条」只清提交结果，不动列表', () => {
  const support = freshStore()
  support.threads = THREADS.list
  support.created = { thread_no: 'FB20261013A1B2C3' }
  support.currentNo = 'FB20261013A1B2C3'
  support.createError = '旧错误'

  support.clearCreated()

  assert.equal(support.created, null)
  assert.equal(support.currentNo, '')
  assert.equal(support.createError, '')
  assert.equal(support.threads.length, 2)
})

test('reset：换号 / 登出后全量恢复初值（否则上个身份的回执号会留在页面上）', () => {
  const support = freshStore()
  support.threads = THREADS.list
  support.threadsPage = 3
  support.threadsTotal = 12
  support.threadsTotalPages = 2
  support.threadsUnread = 5
  support.loadingThreads = true
  support.threadsError = '旧错误'
  support.currentNo = 'FB20261013A1B2C3'
  support.current = THREAD_DETAIL.thread
  support.messages = THREAD_DETAIL.messages
  support.loadingThread = true
  support.threadError = '旧错误'
  support.creating = true
  support.created = { thread_no: 'FB20261013A1B2C3' }
  support.createError = '旧错误'
  support.replying = true
  support.replyError = '旧错误'
  support.replySent = true

  support.reset()

  assert.deepEqual(support.threads, [])
  assert.equal(support.threadsPage, 1)
  assert.equal(support.threadsTotal, 0)
  assert.equal(support.threadsTotalPages, 1)
  assert.equal(support.threadsUnread, 0)
  assert.equal(support.loadingThreads, false)
  assert.equal(support.threadsError, '')
  assert.equal(support.currentNo, '')
  assert.equal(support.current, null)
  assert.deepEqual(support.messages, [])
  assert.equal(support.loadingThread, false)
  assert.equal(support.threadError, '')
  assert.equal(support.creating, false)
  assert.equal(support.created, null)
  assert.equal(support.createError, '')
  assert.equal(support.replying, false)
  assert.equal(support.replyError, '')
  assert.equal(support.replySent, false)
  assert.equal(support.threadsLimit, 10, 'limit 是配置而不是数据，reset 保留它')
})
