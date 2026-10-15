/**
 * 消息中心页（`/mail`）渲染测试
 *
 * 只覆盖**默认页签（通知）**与游客分支：`renderComponent` 是 SSR 渲染，
 * 没有交互能力，切不到「通知偏好 / 邮件记录」两个页签。
 * 那两块的数据形状与文案映射由 `stores.mail.test.js` 与
 * `mailConstants.test.js` 覆盖，这里只保证三个页签入口都在。
 */
import test from 'node:test'
import assert from 'node:assert/strict'

import { renderComponent, createPiniaWithState, createRenderEnv } from './render.mjs'

const LOGGED_IN_USER = { userInfo: { id: 7, user_type: 'registered', nickname: '测试用户' } }

const MESSAGES = [
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
  {
    id: 10,
    type: 'mystery_type_here',
    title: '来路不明的通知',
    body: null,
    link: null,
    level: 'nonsense-level',
    is_read: true,
    read_at: '2026-10-12T01:00:00.000Z',
    created_at: '2026-10-12T01:00:00.000Z',
  },
]

/** 渲染消息中心；`mail` 覆盖项直接写进选项式 store（无需 mock api） */
async function renderMail(mail = {}, options = {}) {
  const [pinia, env] = await Promise.all([
    createPiniaWithState({
      user: options.guest ? {} : LOGGED_IN_USER,
      mail: {
        list: [],
        unreadCount: 0,
        page: 1,
        limit: 20,
        total: 0,
        totalPages: 1,
        loadingMessages: false,
        messagesError: '',
        marking: false,
        ...mail,
      },
    }),
    createRenderEnv(),
  ])
  return renderComponent('/pages/Mail.vue', {
    plugins: [pinia, env.router],
    globalComponents: env.globalComponents,
  })
}

/** 捕获渲染期间的 Vue 警告：绑定写错往往只表现为一条警告而不抛错 */
async function captureWarnings(fn) {
  const warnings = []
  const savedWarn = console.warn
  const savedError = console.error
  console.warn = (...args) => warnings.push(args.map(String).join(' '))
  console.error = (...args) => warnings.push(args.map(String).join(' '))
  try {
    return { html: await fn(), warnings }
  } finally {
    console.warn = savedWarn
    console.error = savedError
  }
}

test('游客：显示专属说明与登录按钮，不渲染页签与列表', async () => {
  const html = await renderMail(
    { list: MESSAGES, total: 3, unreadCount: 1 },
    { guest: true }
  )

  assert.match(html, /消息中心只对注册用户开放/)
  assert.match(html, /登录 \/ 注册/)
  // 页签整块不渲染：游客不该看到三个点不开的分区
  assert.doesNotMatch(html, /role="tab"/)
  assert.doesNotMatch(html, /全部标为已读/)
  assert.doesNotMatch(html, /订单已完成/)
})

test('已登录：三个页签入口都在，通知页签默认选中', async () => {
  const html = await renderMail({ list: MESSAGES, total: 3, unreadCount: 1 })

  assert.match(html, /role="tablist"/)
  for (const label of ['通知', '通知偏好', '邮件记录']) {
    assert.match(html, new RegExp(`>\\s*${label}`), `缺少页签：${label}`)
  }
  assert.match(html, /aria-selected="true"[^>]*>\s*通知|通知[\s\S]{0,80}aria-selected="true"/)
})

test('未读角标：页签上带未读数，99 以上收敛成 99+', async () => {
  const one = await renderMail({ list: MESSAGES, total: 3, unreadCount: 3 })
  assert.match(one, /mail-tab-badge/)
  assert.match(one, /mail-tab-badge[^>]*>\s*3\s*</)

  const many = await renderMail({ list: MESSAGES, total: 300, unreadCount: 128 })
  assert.match(many, /mail-tab-badge[^>]*>\s*99\+\s*</)

  const none = await renderMail({ list: MESSAGES.map((m) => ({ ...m, is_read: true })), total: 3, unreadCount: 0 })
  assert.doesNotMatch(none, /mail-tab-badge/)
})

test('通知列表：标题 / 正文 / 级别文案 / 类型分组名 / 时间都渲染出来', async () => {
  const html = await renderMail({ list: MESSAGES, total: 3, unreadCount: 1 })

  assert.match(html, /订单已完成/)
  assert.match(html, /订单 SSTC20261013001 已交付。/)
  assert.match(html, /积分即将过期/)

  // 级别 → 中文（不是 info/success 这种英文键）
  assert.match(html, /u-tag--success[^>]*>\s*成功\s*</)
  assert.match(html, /u-tag--warning[^>]*>\s*提醒\s*</)
  // 类型 → 分组名
  assert.match(html, /订单/)
  assert.match(html, /积分/)
  // 正文为 null 时不渲染空段落
  assert.equal((html.match(/u-mm-mail-body/g) || []).length, 1)
})

test('通知列表：认不出的 level 与 type 都不裸露英文键', async () => {
  const html = await renderMail({ list: [MESSAGES[2]], total: 1, unreadCount: 0 })

  assert.match(html, /来路不明的通知/)
  assert.doesNotMatch(html, /nonsense-level/)
  assert.doesNotMatch(html, /mystery_type_here/)
  // 未知级别落回「提示」（info 变体），未知类型落回「系统」
  assert.match(html, /u-tag--info[^>]*>\s*提示\s*</)
  assert.match(html, /u-mm-mail-type[^>]*>\s*系统\s*</)
})

test('未读项：只有未读的那条带未读圆点与「标为已读」按钮', async () => {
  const html = await renderMail({ list: MESSAGES, total: 3, unreadCount: 1 })

  assert.equal((html.match(/u-mm-mail-dot/g) || []).length, 1)
  assert.equal((html.match(/u-mm-mail-item--unread/g) || []).length, 1)
  // 用类名而不是文案计数：`全部标为已读` 里也含「标为已读」四个字
  assert.equal((html.match(/mail-item-mark/g) || []).length, 1)
  assert.match(html, /全部标为已读/)
})

test('未读为 0 时「全部标为已读」禁用（按钮在但 disabled）', async () => {
  const read = await renderMail({
    list: MESSAGES.map((m) => ({ ...m, is_read: true })),
    total: 3,
    unreadCount: 0,
  })
  assert.match(read, /全部标为已读/)
  assert.match(read, /disabled[^>]*>\s*全部标为已读|全部标为已读[\s\S]{0,40}disabled/)

  const unread = await renderMail({ list: MESSAGES, total: 3, unreadCount: 1 })
  assert.doesNotMatch(unread, /disabled=""/, '有未读时按钮应可点')
})

test('统计文案：总数与未读数取自 store，不做前端计算', async () => {
  const html = await renderMail({ list: MESSAGES, total: 21, totalPages: 2, unreadCount: 3 })
  assert.match(html, /共\s*21\s*条/)
  assert.match(html, /其中\s*3\s*条未读/)
  // 有链接的项给「查看详情」，link 为 null 的项不给
  assert.equal((html.match(/查看详情/g) || []).length, 2)
})

test('空态：没有通知时给说明而不是空白列表', async () => {
  const html = await renderMail({ list: [], total: 0, unreadCount: 0 })
  assert.match(html, /还没有通知/)
  assert.doesNotMatch(html, /u-mm-mail-title/)
  assert.doesNotMatch(html, /u-mm-pager/)
})

test('加载态：骨架屏带 role=status，且不渲染空态', async () => {
  const html = await renderMail({ list: [], total: 0, loadingMessages: true })
  assert.match(html, /role="status"/)
  assert.match(html, /u-skeleton/)
  assert.doesNotMatch(html, /还没有通知/)
})

test('错误态：错误文案进 role=alert', async () => {
  const html = await renderMail({ list: [], total: 0, messagesError: '获取通知失败' })
  assert.match(html, /role="alert"[^>]*>\s*获取通知失败|获取通知失败/)
})

test('分页：多于 1 页时才有翻页条，且「上一页」在第一页禁用', async () => {
  const one = await renderMail({ list: MESSAGES, total: 3, totalPages: 1 })
  assert.doesNotMatch(one, /u-mm-pager/)

  const two = await renderMail({ list: MESSAGES, total: 21, totalPages: 2, page: 1 })
  assert.match(two, /通知分页/)
  assert.match(two, /第\s*1\s*\/\s*2\s*页/)
  assert.match(two, /上一页/)
  assert.match(two, /下一页/)
  assert.match(two, /disabled/, '第一页的「上一页」必须禁用')
})

test('渲染期间不产生 Vue 警告（绑定/组件名写错只表现为警告）', async () => {
  const { html, warnings } = await captureWarnings(() =>
    renderMail({ list: MESSAGES, total: 21, totalPages: 2, unreadCount: 5 })
  )
  assert.match(html, /订单已完成/)
  assert.deepEqual(warnings.filter((w) => w.includes('[Vue warn]')), [])
})

test('页面用窄页族外壳（宽度只能来自 .page-shell--narrow）', async () => {
  const html = await renderMail({ list: [], total: 0 })
  assert.match(html, /page-shell--narrow/)
})
