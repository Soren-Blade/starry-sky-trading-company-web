/**
 * 客服中心页（`/support`）测试
 *
 * 两层：
 * 1. **SSR 渲染**（`renderComponent`）—— 页面初始态永远停在「提交反馈」页签，
 *    SSR 不跑 `onMounted`、也没有交互能力，切不过去。「我的会话」面板因此靠
 *    第 2 层的源码断言 + `stores.support.test.js` 的数据分支覆盖。
 * 2. **源码断言**（照 `navbarMember.test.js` 的做法读 SFC 文本）—— 钉住那些
 *    「只能在浏览器里点到」的结构（列表 / 详情 / 追问 / 分页 / 深链）。
 */
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

import { renderComponent, createPiniaWithState, createRenderEnv } from './render.mjs'

const SUPPORT_SOURCE = readFileSync(new URL('../src/pages/Support.vue', import.meta.url), 'utf8')
const ROUTER_SOURCE = readFileSync(new URL('../src/router/index.js', import.meta.url), 'utf8')

const REGISTERED = {
  userInfo: {
    id: 7,
    user_type: 'registered',
    nickname: '测试用户',
    email: 'buyer@example.com',
  },
}

const REGISTERED_NO_EMAIL = {
  userInfo: { id: 8, user_type: 'registered', nickname: '没填邮箱', email: '' },
}

const GUEST = {
  userInfo: { id: 99, user_type: 'guest', nickname: '游客' },
}

/** 渲染客服中心；`support` 覆盖项直接写进选项式 store（无需 mock api） */
async function renderSupport(support = {}, options = {}) {
  const [pinia, env] = await Promise.all([
    createPiniaWithState({
      user: options.user ?? REGISTERED,
      support: {
        threads: [],
        threadsPage: 1,
        threadsLimit: 10,
        threadsTotal: 0,
        threadsTotalPages: 1,
        threadsUnread: 0,
        loadingThreads: false,
        threadsError: '',
        currentNo: '',
        current: null,
        messages: [],
        loadingThread: false,
        threadError: '',
        creating: false,
        created: null,
        createError: '',
        replying: false,
        replyError: '',
        replySent: false,
        ...support,
      },
    }),
    createRenderEnv(),
  ])
  return renderComponent('/pages/Support.vue', {
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

// ── 页头与页签 ───────────────────────────────────────────────

test('页头与页签：两个页签入口都在，默认选中「提交反馈」', async () => {
  const html = await renderSupport()

  assert.match(html, /page-shell--narrow/)
  assert.match(html, /客服中心/)
  assert.match(html, /游客也可以提问/)
  assert.match(html, /role="tablist"/)
  for (const label of ['提交反馈', '我的会话']) {
    assert.match(html, new RegExp(`>\\s*${label}`), `缺少页签：${label}`)
  }
})

test('未读角标：会话有未读时页签上带数字，99 以上收敛成 99+，0 时不渲染', async () => {
  const three = await renderSupport({ threadsUnread: 3 })
  assert.match(three, /support-tab-badge/)
  assert.match(three, /support-tab-badge[^>]*>\s*3\s*</)

  const many = await renderSupport({ threadsUnread: 128 })
  assert.match(many, /support-tab-badge[^>]*>\s*99\+\s*</)

  const none = await renderSupport({ threadsUnread: 0 })
  assert.doesNotMatch(none, /support-tab-badge/)
})

// ── 游客 / 注册用户的差别 ────────────────────────────────────

test('游客：顶部给出身份说明，邮箱提示是「必填」那一句', async () => {
  const html = await renderSupport({}, { user: GUEST })

  assert.match(html, /support-guest-note/)
  assert.match(html, /游客身份/)
  assert.match(html, /回执与客服回复只会发到你填写的那一个邮箱/)
  assert.match(html, /这是游客唯一的收信地址/)
  assert.doesNotMatch(html, /已按账号邮箱预填/)
  // 游客同样能填表（这是他们唯一的通道）
  assert.match(html, /support-form/)
  assert.match(html, /提交反馈/)
})

test('注册用户：不显示游客说明；有账号邮箱时提示「已预填」', async () => {
  const html = await renderSupport({}, { user: REGISTERED })

  assert.doesNotMatch(html, /support-guest-note/)
  assert.match(html, /已按账号邮箱预填，可以改成别的/)
  assert.doesNotMatch(html, /这是游客唯一的收信地址/)
})

test('注册用户但账号没邮箱：提示改成「请手动填一个」', async () => {
  const html = await renderSupport({}, { user: REGISTERED_NO_EMAIL })

  assert.match(html, /账号还没有填邮箱，请手动填一个/)
  assert.doesNotMatch(html, /已按账号邮箱预填/)
})

// ── 提交表单 ─────────────────────────────────────────────────

test('表单：四个字段齐全，长度上限与服务端一致，默认分类有中文名', async () => {
  const html = await renderSupport()

  assert.match(html, /id="support-category"/)
  assert.match(html, /id="support-subject"/)
  assert.match(html, /id="support-body"/)
  assert.match(html, /id="support-email"/)

  assert.match(html, /maxlength="120"/)
  assert.match(html, /maxlength="5000"/)
  assert.match(html, /maxlength="255"/)
  assert.match(html, /rows="7"/)

  // 字符计数用真实上限，不是写死的数字
  assert.match(html, /0 \/ 120/)
  assert.match(html, /0 \/ 5000/)

  // SelectField 关闭时只渲染当前值：默认是分类表里的第一项
  assert.match(html, /u-select-trigger/)
  assert.match(html, /订单问题/)
})

test('表单：提交按钮与底部说明（频次上限写在页面上，不是只藏在服务端）', async () => {
  const html = await renderSupport()

  assert.match(html, /同一身份 24 小时内最多提交 5 次/)
  assert.match(html, /support-submit/)
  assert.match(html, /提交反馈/)
  assert.doesNotMatch(html, /正在提交…/)
})

test('提交中：按钮换文案并禁用，防重复提交', async () => {
  const html = await renderSupport({ creating: true })

  assert.match(html, /正在提交…/)
  assert.match(html, /disabled/)
})

test('服务端报错（例如 429）：原样展示在表单里', async () => {
  const message = '提交太频繁了，24 小时内最多提交 5 次，请稍后再试'
  const html = await renderSupport({ createError: message })

  assert.match(html, /role="alert"/)
  assert.match(html, /提交太频繁了/)
})

// ── 回执卡 ───────────────────────────────────────────────────

test('提交成功：回执卡取代表单，回执号摆在最显眼处', async () => {
  const html = await renderSupport({
    created: { thread_no: 'FB20261013A1B2C3', message_id: 41, status: 'open' },
    currentNo: 'FB20261013A1B2C3',
  })

  assert.match(html, /已受理，请记下回执号/)
  assert.match(html, /FB20261013A1B2C3/)
  assert.match(html, /复制回执号/)
  assert.match(html, /查看这条会话/)
  assert.match(html, /再提一条/)
  assert.match(html, /回执已经发往你填写的邮箱/)
  assert.match(html, /消息中心/)
  // 表单整块让位给回执卡：否则用户会以为还要再提交一次
  assert.doesNotMatch(html, /support-form/)
})

test('回执卡：复制失败时如实说失败，不假装已复制', async () => {
  const html = await renderSupport({
    created: { thread_no: 'FB20261013A1B2C3', message_id: 41, status: 'open' },
  })

  // SSR 下 navigator.clipboard 不存在，但复制是点击后才发生，初始文案应是「复制回执号」
  assert.match(html, /复制回执号/)
  assert.doesNotMatch(html, /复制失败，请手动选中回执号/)
})

// ── 渲染健康度 ───────────────────────────────────────────────

test('渲染期间没有 Vue 警告（绑定写错往往只表现为一条警告）', async () => {
  const { warnings } = await captureWarnings(() => renderSupport({ threadsUnread: 2 }))
  const vueWarnings = warnings.filter((w) => w.includes('[Vue warn]'))
  assert.deepEqual(vueWarnings, [])
})

// ── 源码断言：「我的会话」面板与深链（SSR 到不了） ────────────

test('源码：列表区分「空态 / 列表 / 分页」，且空态里有去提交的出口', () => {
  assert.match(SUPPORT_SOURCE, /class="u-empty support-empty"/)
  assert.match(SUPPORT_SOURCE, /u-empty-actions/)
  assert.match(SUPPORT_SOURCE, /switchTab\('submit'\)/)
  assert.match(SUPPORT_SOURCE, /ul class="support-list"/)
  assert.match(SUPPORT_SOURCE, /SUPPORT\.messageCount\(item\.message_count \|\| 0\)/)
  assert.match(SUPPORT_SOURCE, /v-if="supportStore\.threadsTotalPages > 1"/)
  assert.match(SUPPORT_SOURCE, /support-pager-info/)
})

test('源码：详情面板含消息记录与追问表单，作者用中文名+来源区分', () => {
  assert.match(SUPPORT_SOURCE, /ol v-if="supportStore\.hasMessages" class="support-messages"/)
  assert.match(SUPPORT_SOURCE, /supportAuthorLabel\(item\.author_type\)/)
  assert.match(SUPPORT_SOURCE, /'support-message--staff'/)
  assert.match(SUPPORT_SOURCE, /'support-message--system'/)
  assert.match(SUPPORT_SOURCE, /form class="ui-card support-reply"/)
  assert.match(SUPPORT_SOURCE, /SUPPORT\.replyNote/)
  assert.match(SUPPORT_SOURCE, /supportStatusTag\(supportStore\.current\.status\)/)
})

test('源码：回执号深链 —— 通知里的 /support?thread=FB… 能直接打开会话', () => {
  assert.match(SUPPORT_SOURCE, /route\.query\.thread/)
  assert.match(SUPPORT_SOURCE, /router\.replace\(\{ name: 'Support', query: \{ thread: no \} \}\)/)
  assert.match(SUPPORT_SOURCE, /SUPPORT\.threadNotFoundHint/)
})

test('路由：/support 游客可进（无 requiresAuth），/mail 仍要登录', () => {
  const support = ROUTER_SOURCE.slice(ROUTER_SOURCE.indexOf("path: '/support'"))
  const supportEntry = support.slice(0, support.indexOf('},') + 2)
  assert.match(supportEntry, /component: \(\) => import\('@\/pages\/Support\.vue'\)/)
  assert.doesNotMatch(supportEntry, /requiresAuth/)

  const mail = ROUTER_SOURCE.slice(ROUTER_SOURCE.indexOf("path: '/mail'"))
  const mailEntry = mail.slice(0, mail.indexOf('},') + 2)
  assert.match(mailEntry, /requiresAuth: true/)
})

// ── 源码断言：文本域的高度与圆角（textarea 吃掉单行框令牌会变胶囊） ──

test('源码：两处文本域都用 .support-textarea，且高度固定、圆角固定', () => {
  // --radius-input 是「单行输入框」的令牌，五套主题各一档（液态玻璃下是
  // 9999px 全胶囊）。单行框用胶囊很好看，但文本域高度一大，四角就变成夸张的
  // 尖胶囊 —— 高度越大越明显。所以文本域自己锁定卡片档圆角，并把高度固定住。
  const at = SUPPORT_SOURCE.indexOf('.support-textarea {')
  assert.ok(at > -1, '应有 .support-textarea 规则')
  const body = SUPPORT_SOURCE.slice(at, SUPPORT_SOURCE.indexOf('}', at))

  assert.equal(/height:\s*auto/.test(body), false, '不能是 height:auto（高度随内容涨，圆角跟着变形）')
  assert.match(body, /height: calc\(var\(--space-unit\) \* 18\)/)
  assert.match(body, /border-radius: var\(--radius-card\)/)
  assert.equal(/border-radius: var\(--radius-input\)/.test(body), false)
  assert.match(body, /resize: vertical/, '仍是「可竖直拖拽」的普通文本域')

  // 新建会话与追问两处都要挂这个类，漏一处就白改
  const textareas = SUPPORT_SOURCE.match(/<textarea[\s\S]*?>/g) || []
  assert.equal(textareas.length, 2, '客服中心共两处文本域')
  for (const tag of textareas) {
    assert.match(tag, /class="u-input support-textarea"/)
  }
})
