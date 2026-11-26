import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

import { renderComponent, createPiniaWithState, createRenderEnv } from './render.mjs'
import { ICONS } from '../src/utils/iconSet.js'

/**
 * 头像下拉菜单本身（`Navbar.vue` 里的 `.u-dropdown.user-dropdown`）
 *
 * 这一组断言钉的是三件**容易在后续改动里被悄悄破坏**的事：
 *   1. 去重：下拉里不得再出现顶栏已有的入口（会员中心 / 消息中心），
 *      会员权益整组（会员套餐 / 积分中心 / 成长值 / 优惠券）也已经下线。
 *      这是本次优化的硬约束 —— 同一个目标两个入口，用户会开始怀疑哪个才是「真的」。
 *   2. 可达性：`aria-haspopup` / `role="menu"` / `menuitem` / ↑↓ 与 Esc 必须成对存在。
 *      只加 `role="menu"` 而不处理键盘，比不加更容易误导读屏用户。
 *   3. 视觉契约：桌面端不限高（只剩 6 项）、宽度下限、窄屏触控高度、180ms 展开动画。
 *
 * 面板默认收起（`v-if`），渲染结果里只有触发器 —— 结构断言因此读源码，
 * 渲染断言的只是触发器身上那三个属性。这与 `renderIdentity.test.js` 的结论一致。
 */

const WEB_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const read = (relative) => readFileSync(join(WEB_ROOT, relative), 'utf8')

const NAVBAR_SOURCE = read('src/components/Navbar.vue')

/** 下拉主体：从面板的 id 切到移动端抽屉按钮的 class 之前（id 在 class 之前，所以锚在 id 上） */
const DROPDOWN = NAVBAR_SOURCE.slice(
  NAVBAR_SOURCE.indexOf('id="user-menu"'),
  NAVBAR_SOURCE.indexOf('class="u-icon-btn menu-toggle')
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

async function renderNavbar(userInfo) {
  const [pinia, env] = await Promise.all([
    createPiniaWithState({ user: { initialized: true, userInfo } }),
    createRenderEnv(),
  ])

  return renderComponent('/components/Navbar.vue', {
    plugins: [pinia, env.router],
    globalComponents: env.globalComponents,
  })
}

test('面板本体是 role=menu 且能被键盘导航取到（ref 是必需的，查询挂在它上面）', () => {
  assert.ok(DROPDOWN.length > 0, '源码里找不到用户下拉主体')
  assert.match(DROPDOWN, /ref="userMenuPanel"/)
  assert.match(DROPDOWN, /role="menu"/)
  assert.match(DROPDOWN, /:aria-label="t\('navbar\.accountMenu'\)"/)
  assert.match(read('src/i18n/locales/zh-CN.js'), /accountMenu:\s*'账号菜单'/, '中文词条丢失')
  assert.match(DROPDOWN, /@keydown="onMenuKeydown"/)
})

test('触发器三件套齐全：aria-haspopup / aria-controls / aria-expanded，且 id 与面板对齐', () => {
  assert.match(NAVBAR_SOURCE, /id="user-menu-trigger"/)
  assert.match(NAVBAR_SOURCE, /aria-haspopup="menu"/)
  assert.match(NAVBAR_SOURCE, /aria-controls="user-menu"/)
  assert.match(NAVBAR_SOURCE, /:aria-expanded="userMenuOpen"/)
  assert.match(DROPDOWN, /id="user-menu"/)
})

test('默认收起：渲染结果里只有触发器，面板不进 DOM（也就没有隐藏的重复节点）', async () => {
  const html = await renderNavbar(REGISTERED)

  assert.match(html, /aria-haspopup="menu"/)
  assert.match(html, /aria-controls="user-menu"/)
  assert.match(html, /aria-expanded="false"/)
  assert.equal(html.includes('id="user-menu"'), false, '收起时不该渲染面板')
})

test('去重：会员与消息的入口只在顶栏，下拉里连会员子页也不出现', () => {
  // 顶栏那两处入口是唯一的（会员中心=皇冠，消息中心=信封）；
  // 4.8.0 起会员入口在移动端交给底部 Tab Bar，所以允许额外的 hide-below-768。
  assert.match(NAVBAR_SOURCE, /class="u-icon-btn navbar-member[^"]*"/)
  // 4.18.0 起消息入口在窄屏交给抽屉，因此这里同样只钉类名前缀
  assert.match(NAVBAR_SOURCE, /class="u-icon-btn navbar-mail[^"]*"/)

  assert.doesNotMatch(DROPDOWN, /to="\/member"/, '会员中心的唯一入口是顶栏皇冠')
  assert.doesNotMatch(DROPDOWN, /to="\/mail"/, '消息中心的唯一入口是顶栏信封')

  // 「会员权益」整组已下线：会员子页 / 积分 / 优惠券都不再出现在下拉里
  assert.doesNotMatch(DROPDOWN, /会员权益/, '会员权益组应已移除')
  ;['/member/plans', '/member/growth', '/points', '/coupons'].forEach((path) => {
    assert.doesNotMatch(DROPDOWN, new RegExp(`to="${path}"`), `${path} 不该再出现在下拉里`)
  })
})

test('分组与排序：只保留「账号资产」一组，退出登录独立收尾', () => {
  // 组名现在是 i18n 词条：断言绑定 + 中文词条，而不是源码里的写死文本
  const accountLabelAt = DROPDOWN.indexOf("t('navbar.assetsGroup')")
  assert.ok(accountLabelAt > -1, '缺少「账号资产」组标题')
  assert.match(read('src/i18n/locales/zh-CN.js'), /assetsGroup:\s*'账号资产'/, '中文词条丢失')
  assert.equal(DROPDOWN.indexOf('>会员权益<'), -1, '会员权益组标题必须已移除')

  const paths = ['/user/profile', '/user/orders', '/user/favorites', '/user/kami', '/user/checkin']
  const positions = paths.map((path) => DROPDOWN.indexOf(`to="${path}"`))
  positions.forEach((at, index) => assert.ok(at > -1, `下拉里缺少 ${paths[index]}`))
  positions.forEach((at, index) => {
    if (!index) return
    assert.ok(at > positions[index - 1], `${paths[index]} 的位置应在 ${paths[index - 1]} 之后`)
  })

  assert.ok(positions[0] > accountLabelAt, '组标题必须在自己的条目之前')

  // 退出登录排在所有跳转条目之后，且前面有分隔线（它不属于「账号资产」）
  const logoutAt = DROPDOWN.indexOf('class="u-dropdown-item logout"')
  assert.ok(logoutAt > positions[positions.length - 1], '退出登录必须排在最后')
  assert.ok(
    DROPDOWN.lastIndexOf('u-dropdown-divider', logoutAt) > positions[positions.length - 1],
    '退出登录前必须有分隔线'
  )
})

test('图标：每个条目的图标位数量一致、全部 aria-hidden、图标名都在图标集里', () => {
  const itemCount = [...DROPDOWN.matchAll(/class="u-dropdown-item[^"]*"/g)].length
  const iconCount = [...DROPDOWN.matchAll(/class="dropdown-item-icon" aria-hidden="true"/g)].length

  assert.ok(itemCount > 0, '下拉里一个条目都没有')
  assert.equal(iconCount, itemCount, '条目与图标位数量必须一致，否则会出现没有图标的一行')

  // 图标是纯装饰：无障碍名由条目文本承担，读屏不必多读一遍「用户图标」
  const names = [...DROPDOWN.matchAll(/<AppIcon name="([^"]+)" \/>/g)].map((match) => match[1])
  assert.ok(names.length >= itemCount, '有图标位没有对应图标')
  names.forEach((name) => assert.ok(ICONS[name], `图标集里缺少 ${name}`))

  assert.ok(ICONS['log-in'], '图标集缺少 log-in（游客的登录条目）')
  assert.ok(ICONS['log-out'], '图标集缺少 log-out（退出登录条目）')
})

test('键盘：↑/↓ 循环、Home/End 到首尾、Esc 关闭并把焦点还给触发器', () => {
  assert.match(NAVBAR_SOURCE, /const onMenuKeydown = \(event\) => \{/)
  ;['Escape', 'ArrowDown', 'ArrowUp', 'Home', 'End'].forEach((key) => {
    assert.match(NAVBAR_SOURCE, new RegExp(`'${key}'`), `onMenuKeydown 没有处理 ${key}`)
  })

  assert.match(NAVBAR_SOURCE, /@keydown\.down\.prevent="openUserMenu\(true\)"/)
  assert.match(NAVBAR_SOURCE, /@keydown\.esc="closeUserMenu\(true\)"/)
  assert.match(
    NAVBAR_SOURCE,
    /document\.getElementById\('user-menu-trigger'\)\?\.focus\(\)/,
    'Esc 关闭后必须把焦点还回头像按钮'
  )
  // 焦点只落在真正的条目上：禁用项与分隔线不该被选中
  assert.match(NAVBAR_SOURCE, /querySelectorAll\('\.u-dropdown-item:not\(:disabled\)'\)/)
})

test('尺寸与动效：桌面端不限高、宽度下限消费共享令牌、展开动画收紧到 180ms', () => {
  const at = NAVBAR_SOURCE.indexOf('.user-dropdown {')
  assert.ok(at > -1, '找不到 .user-dropdown 规则')
  const block = NAVBAR_SOURCE.slice(at, NAVBAR_SOURCE.indexOf('}', at))

  // 桌面端面板只剩 6 项，任何视口都放得下：加高度上限只会把「退出登录」压进滚动区
  assert.doesNotMatch(block, /max-height/, '桌面端不该限制面板高度')
  assert.doesNotMatch(block, /overflow-y: auto/, '桌面端不该出现滚动轴')
  assert.match(block, /overflow: visible/)
  assert.match(block, /width: max\(var\(--dropdown-width\)/, '200px 宽度放不下带图标的长条目')
  assert.match(block, /animation: enterUp 180ms var\(--enter-ease\)/, '展开动画必须落在 150–200ms')
})

test('窄屏触控：767 断点下身份面板改成整宽卡片 + 两列入口', () => {
  const mobileAt = NAVBAR_SOURCE.indexOf('@media (max-width: 767px)')
  assert.ok(mobileAt > -1, '找不到 767 断点')
  const block = NAVBAR_SOURCE.slice(
    mobileAt,
    NAVBAR_SOURCE.indexOf('@media (max-width: 575px)', mobileAt)
  )

  // 4.18.0：桌面那版 224px 的右侧小下拉在 390px 上够不到，窄屏改为与抽屉同一张卡片
  assert.match(block, /\.user-dropdown \{[\s\S]*?position: fixed/)
  assert.match(block, /\.user-dropdown \{[\s\S]*?left: calc\(var\(--space-unit\) \* 2\)/)
  assert.match(block, /\.user-dropdown \{[\s\S]*?width: auto/)
  assert.match(block, /\.user-dropdown \{[\s\S]*?max-height: calc\(\s*100dvh/)
  assert.match(block, /\.user-dropdown \{[\s\S]*?overflow-y: auto/)
  // 4.19.0：六格方格墙改成 2 列横条，44px 一行 —— 面板更矮，读起来像菜单而不是仪表盘
  assert.match(block, /\.user-menu-grid \{[\s\S]*?grid-template-columns: repeat\(2, minmax\(0, 1fr\)\)/)
  assert.match(block, /\.user-menu-grid \.u-dropdown-item \{[\s\S]*?min-height: var\(--ec-control-h-md\)/)
})

test('短屏浮层不钻底部 Tab Bar：抽屉与身份面板都扣掉底栏高度', () => {
  const mobileAt = NAVBAR_SOURCE.indexOf('@media (max-width: 767px)')
  const block = NAVBAR_SOURCE.slice(
    mobileAt,
    NAVBAR_SOURCE.indexOf('@media (max-width: 575px)', mobileAt)
  )

  // 320×568 实测：只扣顶栏时面板会压到底栏下面，语言反馈一行点不到
  assert.match(block, /\.navbar-drawer \{[\s\S]*?var\(--bottom-nav-height\)/)
  assert.match(block, /\.user-dropdown \{[\s\S]*?var\(--bottom-nav-height\)/)
})

test('身份卡抬头：头像 + 昵称/徽标 + 创建时间，底色是品牌色洗染', () => {  assert.match(NAVBAR_SOURCE, /class="u-avatar user-card-avatar"/)
  assert.match(NAVBAR_SOURCE, /class="user-card-body"/)
  assert.match(NAVBAR_SOURCE, /\.user-info \{[\s\S]*?display: flex;/)
  assert.match(NAVBAR_SOURCE, /\.user-info \{[\s\S]*?linear-gradient\(\s*135deg,/)
  assert.match(NAVBAR_SOURCE, /\.user-card-avatar \{[\s\S]*?width: calc\(var\(--space-unit\) \* 5\);/)
})

test('头像与长昵称：失败回退成图标占位，昵称溢出用省略号而不是撑破面板', () => {
  assert.match(NAVBAR_SOURCE, /fallback-icon="user"/)
  assert.match(NAVBAR_SOURCE, /v-else class="avatar-fallback"/)

  const at = NAVBAR_SOURCE.indexOf('.user-name-text {')
  assert.ok(at > -1, '找不到 .user-name-text 规则')
  const block = NAVBAR_SOURCE.slice(at, NAVBAR_SOURCE.indexOf('}', at))
  assert.match(block, /overflow: hidden/)
  assert.match(block, /text-overflow: ellipsis/)
  assert.match(block, /min-width: 0/, 'flex 子项不加 min-width:0 就不会被压缩')
})

test('游客与用户共用同一个面板：登录条目只在游客身份下出现，退出文案按身份分叉', async () => {
  assert.match(DROPDOWN, /v-if="isGuest"[\s\S]{0,120}guest-login/)
  assert.match(DROPDOWN, /\{\{ isGuest \? AUTH\.guestLogout : AUTH\.logout \}\}/)

  // 两次渲染必须串行：`createPiniaWithState` 会切换 activePinia，
  // 并发建两个 pinia 会互相踩（表现为「store user 未在 pinia 中注册 state」）
  const guestHtml = await renderNavbar(GUEST)
  const userHtml = await renderNavbar(REGISTERED)
  assert.match(guestHtml, /aria-haspopup="menu"/)
  assert.match(userHtml, /aria-haspopup="menu"/)
})

test('抽屉在路由变化后自己收起：站内链接点完不会盖住新页面', () => {
  assert.match(NAVBAR_SOURCE, /watch\(\s*\(\) => route\.fullPath,/)
  const watcher = NAVBAR_SOURCE.slice(NAVBAR_SOURCE.indexOf('() => route.fullPath'))
  assert.match(watcher.slice(0, 260), /menuOpen\.value = false/)
  assert.match(watcher.slice(0, 260), /userMenuOpen\.value = false/)
})