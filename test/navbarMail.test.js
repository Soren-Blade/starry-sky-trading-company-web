import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

import { renderComponent, createPiniaWithState, createRenderEnv } from './render.mjs'
import { ICONS } from '../src/utils/iconSet.js'
import { FOOTER } from '../src/constants/content.js'

/**
 * 消息入口（顶栏信封）与客服入口（页脚 + 帮助弹窗）
 *
 * 这一组断言钉的是**两个入口的身份边界**：
 *   - `/mail` 只给注册用户 —— 游客的站内通知永远是空的（服务端
 *     `enqueue_notification` 对非注册用户直接返回 false），给他一个信封
 *     等于给一个点进去什么都没有的入口；
 *   - `/support` 相反，**必须让游客摸得到**（顶栏看不到信封时，页脚与
 *     帮助弹窗是他唯一的求助通道），所以它既没有 requiresAuth，入口也
 *     不挂任何身份判断。
 */

const WEB_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const read = (relative) => readFileSync(join(WEB_ROOT, relative), 'utf8')

const NAVBAR_SOURCE = read('src/components/Navbar.vue')
const FOOTER_SOURCE = read('src/components/Footer.vue')
const HELP_MODAL_SOURCE = read('src/components/HelpModal.vue')
const LOGIN_MODAL_SOURCE = read('src/components/LoginModal.vue')
const ROUTER_SOURCE = read('src/router/index.js')

const REGISTERED = {
  id: 42,
  uuid: 'uuid-42',
  user_type: 'registered',
  nickname: '星尘',
  avatar_url: '',
  created_at: '2026-01-01T00:00:00.000Z',
}

const GUEST = { ...REGISTERED, id: 7, uuid: 'uuid-7', user_type: 'guest', nickname: '游客' }

async function renderNavbar(userInfo, mail = {}) {
  const [pinia, env] = await Promise.all([
    createPiniaWithState({
      user: { initialized: true, userInfo },
      mail: { unreadCount: 0, ...mail },
    }),
    createRenderEnv(),
  ])

  return renderComponent('/components/Navbar.vue', {
    plugins: [pinia, env.router],
    globalComponents: env.globalComponents,
  })
}

/** 消息入口这个 `<a>` 的开标签（渲染结果里按 class 定位） */
const mailEntry = (html) => html.match(/<a[^>]*class="[^"]*navbar-mail[^"]*"[^>]*>/)

test('信封图标已登记进图标集（写错名字只会渲染出空白 svg，不报错）', () => {
  assert.ok(ICONS.mail, '图标集里缺少 mail')
  assert.ok((ICONS.mail.rects || []).length + (ICONS.mail.paths || []).length >= 2)
})

test('注册用户：顶栏渲染信封入口，指向 /mail，无未读时角标不出现', async () => {
  const html = await renderNavbar(REGISTERED)
  const entry = mailEntry(html)

  assert.ok(entry, '未渲染消息入口')
  assert.match(entry[0], /href="\/mail"/)
  assert.match(entry[0], /aria-label="消息中心"/)
  assert.equal(html.includes('navbar-mail-badge'), false, '未读为 0 时不该渲染角标')
})

test('游客：看不到信封入口（但会员/购物车入口照旧，规则不同）', async () => {
  const html = await renderNavbar(GUEST)

  assert.equal(mailEntry(html), null, '游客不该看到消息入口')
  assert.match(html, /navbar-member/, '会员入口是「有身份就显示」，与消息入口不同')
})

test('没有身份时也不渲染信封入口', async () => {
  const html = await renderNavbar(null)
  assert.equal(mailEntry(html), null)
})

test('未读角标：数字与 99+ 收敛都写进 aria-label，角标本身是装饰', async () => {
  const three = await renderNavbar(REGISTERED, { unreadCount: 3 })
  const badge = three.match(
    /<span[^>]*class="[^"]*navbar-mail-badge[^"]*"[^>]*>([\s\S]*?)<\/span>/
  )
  assert.ok(badge, '有未读时应渲染角标')
  assert.equal(badge[1].trim(), '3')
  assert.match(badge[0], /aria-hidden="true"/, '数字已在 aria-label 里读过，角标是装饰')
  assert.match(three, /aria-label="消息中心，3 条未读"/)

  const many = await renderNavbar(REGISTERED, { unreadCount: 128 })
  assert.match(many, /navbar-mail-badge[^>]*>\s*99\+\s*</)
  assert.match(many, /aria-label="消息中心，128 条未读"/, 'aria-label 读真实条数，不读 99+')
})

test('入口本体是 router-link，不是「button 里包 router-link」（顶栏踩过的坑）', () => {
  const at = NAVBAR_SOURCE.indexOf('class="u-icon-btn navbar-mail"')
  assert.ok(at > -1, '源码里找不到消息入口')
  const tagStart = NAVBAR_SOURCE.lastIndexOf('<', at)
  assert.match(NAVBAR_SOURCE.slice(tagStart, tagStart + 20), /^<router-link[\s>]/)
})

test('入口守卫是 isLoggedIn，游客的 userId 不能让它显形', () => {
  const at = NAVBAR_SOURCE.indexOf('class="u-icon-btn navbar-mail"')
  const block = NAVBAR_SOURCE.slice(NAVBAR_SOURCE.lastIndexOf('<!--', at), at)
  assert.match(block, /v-if="userStore\.isLoggedIn"/)
  assert.doesNotMatch(block, /v-if="userStore\.userId"/)
})

test('用户下拉里也有一项「消息中心」，并带未读条数（展开即知有没有新东西）', () => {
  const at = NAVBAR_SOURCE.indexOf('to="/mail"', NAVBAR_SOURCE.indexOf('u-dropdown-item'))
  assert.ok(at > -1, '下拉里没有消息中心项')
  const block = NAVBAR_SOURCE.slice(NAVBAR_SOURCE.lastIndexOf('<', at), NAVBAR_SOURCE.indexOf('</router-link>', at))
  assert.match(block, /^<router-link/)
  assert.match(block, /v-if="userStore\.isLoggedIn"/)
  assert.match(block, /mailStore\.hasUnread/)
  assert.match(block, /u-tag u-tag--danger user-badge/)
})

test('页脚：底部链接里有指向 /support 的「客服中心」（游客也看得见）', async () => {
  const [pinia, env] = await Promise.all([createPiniaWithState({}), createRenderEnv()])
  const html = await renderComponent('/components/Footer.vue', {
    plugins: [pinia, env.router],
    globalComponents: env.globalComponents,
  })

  assert.match(html, /href="\/support"/)
  assert.match(html, /客服中心/)
  // 文案只有一个来源：页脚直接渲染 FOOTER.bottomLinks
  const link = FOOTER.bottomLinks.find((item) => item.to === '/support')
  assert.ok(link, 'FOOTER.bottomLinks 里缺少 /support')
  assert.equal(link.label, '客服中心')
  assert.doesNotMatch(FOOTER_SOURCE, /userStore\.isLoggedIn/, '客服入口不该按身份分叉')
})

test('帮助弹窗：默认带「去提交反馈」，指向 /support', async () => {
  const [pinia, env] = await Promise.all([createPiniaWithState({}), createRenderEnv()])
  const html = await renderComponent('/components/HelpModal.vue', {
    props: { title: '桩标题' },
    plugins: [pinia, env.router],
    globalComponents: env.globalComponents,
  })

  assert.match(html, /href="\/support"/)
  assert.match(html, /去提交反馈/)

  // 关掉时才不渲染：属性默认值必须是 true，调用方不必逐个显式打开
  const htmlWithout = await renderComponent('/components/HelpModal.vue', {
    props: { title: '桩标题', feedback: false },
    plugins: [pinia, env.router],
    globalComponents: env.globalComponents,
  })
  assert.doesNotMatch(htmlWithout, /去提交反馈/)
  assert.match(HELP_MODAL_SOURCE, /feedback: \{ type: Boolean, default: true \}/)
})

test('登录弹窗的帮助模式没有关掉这个入口（忘记密码的人最需要找到人）', () => {
  assert.match(LOGIN_MODAL_SOURCE, /<HelpModal/)
  assert.doesNotMatch(LOGIN_MODAL_SOURCE, /:feedback="false"/)
})

test('路由表：/support 在 /mail 之后，且只有 /mail 要登录', () => {
  const supportAt = ROUTER_SOURCE.indexOf("path: '/support'")
  const mailAt = ROUTER_SOURCE.indexOf("path: '/mail'")
  assert.ok(supportAt > mailAt, '/support 应排在 /mail 之后（同一批账号页）')

  const supportEntry = ROUTER_SOURCE.slice(supportAt, ROUTER_SOURCE.indexOf('}', supportAt))
  assert.doesNotMatch(supportEntry, /requiresAuth/)
  assert.match(supportEntry, /title: '客服中心 - 星辰商行'/)
})
