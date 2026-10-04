import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

import { renderComponent, createPiniaWithState, createRenderEnv } from './render.mjs'
import { AUTH } from '../src/constants/content.js'

/**
 * 顶栏的「身份」呈现
 *
 * 这一组用例对应四条要求：
 *   1. 游客状态要正常显示头像等信息（而不是被当成「未登录」）
 *   2. 游客可以正常退出
 *   3. 退出之后要显示登录按钮
 *   4. 不退出的话，用户信息栏要标注游客身份并给出提醒
 *
 * 说明：下拉面板默认是收起的（`userMenuOpen` 是组件内 ref，SSR 拿不到），
 * 因此面板**内部**的徽标与提醒文案无法靠渲染断言覆盖 ——
 * 那一部分由本文件末尾的静态守卫兜住（面板结构被删掉时会失败）。
 * 头像上的「游」标记与登录按钮都在收起状态下就可见，可以直接断言。
 */

const __dirname = dirname(fileURLToPath(import.meta.url))
const WEB_ROOT = join(__dirname, '..')
const NAVBAR_SOURCE = readFileSync(join(WEB_ROOT, 'src', 'components', 'Navbar.vue'), 'utf8')

const GUEST = {
  id: 9,
  uuid: 'uuid-guest',
  user_type: 'guest',
  nickname: '路过的访客',
  avatar_url: 'https://cdn.example.com/guest.png',
  created_at: '2026-10-01T00:00:00.000Z',
}

const REGISTERED = {
  id: 42,
  uuid: 'uuid-reg',
  user_type: 'registered',
  nickname: '星尘',
  avatar_url: '/uploads/avatars/u42-x.webp',
  created_at: '2026-01-01T00:00:00.000Z',
}

/** 无身份：退出之后的状态（userInfo 为空，但身份**已经**解析过了） */
const ANONYMOUS = {}

/**
 * 渲染顶栏。
 *
 * `initialized` 必须显式给出 —— 它区分的是「身份还没解析出来」与
 * 「解析完了，确实没有身份」这两件完全不同的事（前者显示骨架，后者显示登录按钮）。
 * 默认 true 表示「已经解析完」，与页面加载完成后的稳定状态一致。
 */
async function renderNavbar(userInfo, storeState = {}) {
  const [pinia, env] = await Promise.all([
    createPiniaWithState({ user: { initialized: true, userInfo, ...storeState } }),
    createRenderEnv(),
  ])
  return renderComponent('/components/Navbar.vue', {
    plugins: [pinia, env.router],
    globalComponents: env.globalComponents,
  })
}

/** 页面里可见的「登录 / 注册」按钮（顶栏那一颗，不是下拉面板里的） */
const hasTopLoginButton = (html) =>
  new RegExp(`<button[^>]*class="u-btn-primary"[^>]*>\\s*${AUTH.loginCta}\\s*</button>`).test(html)

// ── 身份尚未解析：占位骨架 ─────────────────────────────────
//
// 这是「刷新时顶栏先闪一下登录按钮、再变成头像」的直接修复。
// 刷新后应用要先拿到身份才知道该显示什么，Vercel 上这段有几百毫秒到几秒；
// 期间显示登录按钮是**错的**（用户可能已经登录），而且会立刻跳变成头像。

test('身份未解析：显示占位骨架，绝不显示登录按钮', async () => {
  const html = await renderNavbar({}, { initialized: false })

  assert.match(html, /u-skeleton u-skeleton--avatar/, '应显示与头像等尺寸的骨架')
  assert.equal(hasTopLoginButton(html), false, '身份未知时显示登录按钮会在拿到身份后跳变')
  assert.equal(html.includes('user-avatar-btn'), false, '身份未知时也还不能渲染头像按钮')
})

test('身份未解析：骨架带可访问名，读屏用户知道正在确认登录状态', async () => {
  const html = await renderNavbar({}, { initialized: false })
  assert.match(html, /role="status"[^>]*aria-label="正在确认登录状态"/)
})

test('身份已解析且无身份：骨架换成登录按钮（骨架必须消失）', async () => {
  const html = await renderNavbar(ANONYMOUS)

  assert.equal(hasTopLoginButton(html), true)
  assert.equal(html.includes('u-skeleton--avatar'), false, '解析完成后不该还留着骨架')
})

// ── 要求 1：游客也显示头像与信息 ────────────────────────────

test('游客：顶栏渲染头像，而不是把游客当成未登录', async () => {
  const html = await renderNavbar(GUEST)

  assert.match(html, /<img[^>]*src="https:\/\/cdn\.example\.com\/guest\.png"/, '应显示游客的头像')
  assert.match(html, /class="user-avatar-btn"/, '应渲染头像按钮（可展开用户菜单）')
  assert.match(html, /class="guest-mark"/, '头像上应有游客标记')
  assert.equal(hasTopLoginButton(html), false, '已识别为游客时不再显示顶栏登录按钮')
})

test('游客：没有头像地址时退化为字形，而不是渲染空 src', async () => {
  const html = await renderNavbar({ ...GUEST, avatar_url: '' })

  assert.equal(/src=""/.test(html), false, '空 src 会被浏览器当作「请求当前页面」再发一次请求')
  assert.match(html, /class="avatar-fallback"/)
})

test('游客：无障碍名里带上「游客」，读屏用户同样能知道身份', async () => {
  const html = await renderNavbar(GUEST)
  assert.match(html, /aria-label="打开用户菜单（路过的访客，游客）"/)
})

// ── 要求 3：退出之后显示登录按钮 ───────────────────────────

test('无身份（刚退出）：显示登录按钮，且不再有头像与游客标记', async () => {
  const html = await renderNavbar(ANONYMOUS)

  assert.equal(hasTopLoginButton(html), true, '退出后必须出现「登录 / 注册」按钮')
  assert.equal(html.includes('user-avatar-btn'), false, '退出后不该还留着头像按钮')
  assert.equal(html.includes('guest-mark'), false)
})

// ── 注册用户：不显示游客标记 ───────────────────────────────

test('注册用户：正常显示头像，且不带游客标记', async () => {
  const html = await renderNavbar(REGISTERED)

  assert.match(html, /class="user-avatar-btn"/)
  assert.equal(html.includes('guest-mark'), false, '注册用户不该被标成游客')
  assert.equal(hasTopLoginButton(html), false)
})

// ── 要求 2 与 4：下拉面板的内容（静态守卫）──────────────────
//
// 面板默认收起，SSR 渲染不出来，因此这里检查模板本身：
// 少了任何一项都说明「标注游客身份并提醒」或「可退出」被删掉了。

test('游客面板：模板里有游客徽标、提醒文案与退出入口', async () => {
  assert.match(
    NAVBAR_SOURCE,
    /v-if="isGuest"[\s\S]{0,120}class="u-tag u-tag--warning user-badge"/,
    '下拉面板里必须有「游客」徽标'
  )
  assert.match(
    NAVBAR_SOURCE,
    /v-if="isGuest"[\s\S]{0,200}class="guest-note"/,
    '下拉面板里必须有游客提醒段落'
  )
  assert.match(
    NAVBAR_SOURCE,
    /isGuest \? AUTH\.guestLogout : AUTH\.logout/,
    '退出项必须按身份切换文案（游客是「退出游客身份」）'
  )
  assert.match(
    NAVBAR_SOURCE,
    /v-if="isGuest"[\s\S]{0,400}@click="openLoginModal"/,
    '游客面板里必须有登录入口'
  )
})

test('游客提醒的文案与真实能力一致（不能承诺游客做不到的事）', () => {
  assert.ok(AUTH.guestNote.length > 0)
  // 游客只能浏览公开内容：下单 / 卡密 / 收藏都要正式账号
  assert.match(AUTH.guestNote, /浏览/)
  assert.match(AUTH.guestNote, /登录/)
  assert.equal(AUTH.guestBadge, '游客')
  assert.notEqual(AUTH.guestLogout, AUTH.logout, '游客与注册用户的退出文案应可区分')
})

test('退出动作在需要登录的页面上会把人送回首页', () => {
  // 退出后停在订单页/卡密页只会看到空数据或反复失败
  assert.match(
    NAVBAR_SOURCE,
    /route\.meta\?\.requiresAuth \|\| route\.name === 'Cart'/,
    '退出后应把「需要身份」的页面送回首页'
  )
})
