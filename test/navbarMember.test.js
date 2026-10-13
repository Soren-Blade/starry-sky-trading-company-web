import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

import { renderComponent, createPiniaWithState, createRenderEnv } from './render.mjs'
import { ICONS } from '../src/utils/iconSet.js'

/**
 * 顶栏的会员入口（皇冠图标 + 等级徽标）
 *
 * 三条容易写错、写错了也不报错的约定：
 *   1. 入口**有身份就显示**（注册用户与游客一样）。会员中心原先只能从
 *      用户下拉的「会员权益」组进去，且要展开才看得到 —— 未开通的人根本
 *      找不到它，会员体系就没有转化入口。等级徽标才是会员专属。
 *   2. 徽标文案是**等级名**（V1–V8），不是数字门槛、不是成长值。
 *   3. 未开通（`level_name` 为空）时徽标整块不渲染：不留空位、也不写
 *      「未开通」三个字占地方。
 */

const NAVBAR_SOURCE = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'components', 'Navbar.vue'),
  'utf8'
)

const REGISTERED = {
  id: 42,
  uuid: 'uuid-42',
  user_type: 'registered',
  nickname: '星尘',
  avatar_url: '',
  created_at: '2026-01-01T00:00:00.000Z',
}

const GUEST = { ...REGISTERED, id: 7, uuid: 'uuid-7', user_type: 'guest', nickname: '游客' }

async function render(userInfo, memberOverview) {
  const [pinia, env] = await Promise.all([
    createPiniaWithState({
      user: { initialized: true, userInfo },
      ...(memberOverview ? { member: { overview: memberOverview } } : {}),
    }),
    createRenderEnv(),
  ])

  return renderComponent('/components/Navbar.vue', {
    plugins: [pinia, env.router],
    globalComponents: env.globalComponents,
  })
}

/** 会员入口这个 `<a>` 的开标签（渲染结果里按 class 定位） */
const memberEntry = (html) => html.match(/<a[^>]*class="[^"]*navbar-member[^"]*"[^>]*>/)

test('皇冠图标已登记进图标集（写错名字只会渲染出空白 svg，不报错）', () => {
  assert.ok(ICONS.crown, '图标集里缺少 crown')
  // 冠带 + 冠体：只有一条路径说明画漏了
  assert.ok((ICONS.crown.paths || []).length >= 2, '皇冠应由冠带与冠体两条路径组成')
})

test('注册用户能看到会员入口，且未开通时不渲染等级徽标', async () => {
  const html = await render(REGISTERED)
  const entry = memberEntry(html)

  assert.ok(entry, '未渲染会员入口')
  assert.match(entry[0], /href="\/member"/)
  assert.match(entry[0], /aria-label="会员中心"/)
  assert.equal(html.includes('navbar-member-badge'), false, '未开通不该出现等级徽标')
})

test('游客也显示会员入口（与购物车同一条「有身份就显示」规则）', async () => {
  const html = await render(GUEST)
  assert.ok(memberEntry(html), '游客也应有会员入口')
})

test('没有身份时入口整个不渲染（不留空位）', async () => {
  const html = await render(null)
  assert.equal(memberEntry(html), null)
})

test('会员的徽标显示等级名，并把等级读进无障碍名', async () => {
  const html = await render(REGISTERED, { level: 'v5', level_name: 'V5', is_member: true })

  const badge = html.match(
    /<span[^>]*class="[^"]*navbar-member-badge[^"]*"[^>]*>([\s\S]*?)<\/span>/
  )
  assert.ok(badge, '会员应渲染等级徽标')
  assert.equal(badge[1].trim(), 'V5', '徽标文案应是等级名')
  assert.match(badge[0], /aria-hidden="true"/, '等级已在 aria-label 里读过了，徽标是装饰')
  assert.match(html, /aria-label="会员中心，当前等级 V5"/)
})

test('入口本体是 router-link，不是「button 里包 router-link」（顶栏踩过的坑）', () => {
  const at = NAVBAR_SOURCE.indexOf('class="u-icon-btn navbar-member"')
  assert.ok(at > -1, '源码里找不到会员入口')
  const tagStart = NAVBAR_SOURCE.lastIndexOf('<', at)
  assert.match(
    NAVBAR_SOURCE.slice(tagStart, tagStart + 20),
    /^<router-link[\s>]/,
    '入口应直接是 router-link'
  )
})
