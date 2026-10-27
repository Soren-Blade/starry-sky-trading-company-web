/**
 * 「我的资产」页（2.3.0 需求 2/2.1/2.2）的契约测试。
 *
 * 这一页承担三件事：数字商品订单项、我的卡密、已激活工具。三者数据来源不同
 * （orders / getUserCards / myEntitlements），任何一处接错都会让用户觉得
 * 「买的东西不见了」，所以断言既看渲染结果，也看数据来源与形态过滤规则。
 */
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { SRC_DIR, WEB_ROOT, createPiniaPlugin, createRenderEnv, renderComponent } from './render.mjs'

const assetsPage = readFileSync(join(SRC_DIR, 'pages/Assets.vue'), 'utf8')
const routerSource = readFileSync(join(SRC_DIR, 'router/index.js'), 'utf8')
const navbarSource = readFileSync(join(SRC_DIR, 'components/Navbar.vue'), 'utf8')
const ordersSource = readFileSync(join(SRC_DIR, 'pages/Orders.vue'), 'utf8')
const kamiSection = readFileSync(join(SRC_DIR, 'components/KamiSection.vue'), 'utf8')
const contentSource = readFileSync(join(SRC_DIR, 'constants/content.js'), 'utf8')
const tradeSql = readFileSync(
  join(WEB_ROOT, '../starry-sky-trading-company-server/src/sql/trade.js'),
  'utf8'
)
const tradeUtils = readFileSync(
  join(WEB_ROOT, '../starry-sky-trading-company-server/src/utils/trade.js'),
  'utf8'
)

/** 渲染一次空态页面：不注入任何数据，只验证骨架与空态文案 */
async function renderEmpty() {
  const { globalComponents, router } = await createRenderEnv()
  // Assets 在 setup 里就用 useUserStore/useKamiStore，必须先把 pinia 装进 app
  const pinia = await createPiniaPlugin()
  return renderComponent('/pages/Assets.vue', {
    plugins: [pinia, router],
    globalComponents,
  })
}

test('路由与入口：/user/assets 需要登录，导航栏下拉有「我的资产」', () => {
  assert.match(routerSource, /path:\s*'\/user\/assets'/, '路由必须存在')
  assert.match(routerSource, /name:\s*'Assets'/)
  assert.match(
    routerSource,
    /path:\s*'\/user\/assets'[\s\S]{0,240}requiresAuth:\s*true/,
    '资产页属于账号数据，必须要求登录'
  )

  assert.match(
    navbarSource,
    /<router-link[^>]*to="\/user\/assets"[\s\S]{0,200}我的资产/,
    '用户下拉要能直接进资产页'
  )
  // 顺序：收藏之后、卡密管理之前（资产是「我买了什么」的总入口）
  const favoritesIndex = navbarSource.indexOf('to="/user/favorites"')
  const assetsIndex = navbarSource.indexOf('to="/user/assets"')
  const kamiIndex = navbarSource.indexOf('to="/user/kami"')
  assert.ok(favoritesIndex > 0 && assetsIndex > favoritesIndex, '「我的资产」排在「我的收藏」之后')
  assert.ok(kamiIndex > assetsIndex, '「我的资产」排在「卡密管理」之前')
})

test('页面骨架：三段资产 + 面包屑 + 页头文案', async () => {
  assert.match(assetsPage, /class="page-shell assets-page"/)
  assert.match(assetsPage, /<PageBreadcrumb :items="breadcrumbItems"/, '资产页需要面包屑')
  assert.match(assetsPage, /PAGES\.assets\.title/)
  assert.match(contentSource, /assets:\s*\{[\s\S]{0,200}我的资产/)

  const html = await renderEmpty()
  for (const title of ['数字商品', '我的卡密', '已激活工具']) {
    assert.ok(html.includes(title), `缺少「${title}」小节`)
  }
  // 三个小节的表头都要在（空态只换 tbody，不隐藏表头）
  for (const head of ['商品', '数量', '金额', '下单时间']) {
    assert.ok(html.includes(head), `数字商品表缺少表头 ${head}`)
  }
  assert.ok(!html.includes('undefined'), '插值事故')
  assert.ok(!html.includes('NaN'), '插值事故')
})

test('数字商品：只收 digital/account/service 三种形态，实物留在订单页', () => {
  assert.match(
    assetsPage,
    /const DIGITAL_TYPES = \[[^\]]*'digital'[\s\S]{0,80}'service'[^\]]*\]/,
    '形态白名单必须显式列出'
  )
  assert.match(assetsPage, /DIGITAL_TYPES\.includes\(/, '按白名单过滤订单项')
  // physical 不在白名单里 —— 这是「正常商品依旧在订单」的落点
  const whitelist = assetsPage.match(/const DIGITAL_TYPES = \[([^\]]*)\]/)[1]
  assert.ok(!whitelist.includes("'physical'"), '实物商品不得进入资产页的数字商品表')

  assert.match(assetsPage, /orderApi\.getOrders\(/, '数据来自订单接口')
  assert.match(assetsPage, /goodsTypeLabel\(item\.goods_type\)/, '形态列用统一文案')
})

test('数据来源：卡密走 kamiStore、授权走 myEntitlements，且互不阻塞', () => {
  assert.match(assetsPage, /kamiStore\.fetchUserKamis\(/, '卡密来自 store 的列表接口')
  assert.match(assetsPage, /api\.getMyEntitlements\(\)/, '已激活工具来自 myEntitlements')

  // 三块各自 loading / error，任何一块挂了另外两块照样能看
  for (const state of ['ordersLoading', 'cardsLoading', 'entitlementsLoading']) {
    assert.match(assetsPage, new RegExp(state), `缺少独立的 ${state}`)
  }
  for (const state of ['ordersError', 'cardsError', 'entitlementsError']) {
    assert.match(assetsPage, new RegExp(state), `缺少独立的 ${state}`)
  }
})

test('已激活工具：来源映射（member → 会员额度）跟着搬到资产页', () => {
  assert.match(
    assetsPage,
    /grant_source === 'member' \? '会员额度' : '卡密'/,
    '授权来源的语义在资产页保留'
  )
  assert.match(assetsPage, /is_valid \? '有效' : '已过期'/)
  assert.match(assetsPage, /is_permanent/, '永久授权要单独处理')
})

test('卡密页与订单页：只留指路，不再各画一遍', () => {
  assert.match(kamiSection, /已激活的工具在「我的资产」查看/)
  assert.match(ordersSource, /class="orders-assets-link"/, '订单页要有指路条')
  assert.match(ordersSource, /<router-link to="\/user\/assets">我的资产<\/router-link>/)
  assert.match(
    ordersSource,
    /实物商品的物流信息仍在本页订单里/,
    '说明实物订单不受影响，避免用户误解'
  )
})

test('服务端：订单项补 goods_type，供资产页按形态分流', () => {
  assert.match(
    tradeSql,
    /LEFT JOIN \$\{TABLES\.products\} p ON p\.id = oi\.product_id/,
    'listOrderItems 要 JOIN products'
  )
  assert.match(tradeSql, /p\.goods_type/, 'SELECT 要带上 goods_type')
  assert.match(
    tradeUtils,
    /goods_type:\s*row\.goods_type === null \|\| row\.goods_type === undefined \? null : row\.goods_type/,
    '映射层要把 null 保留成 null（商品已删），不要猜成 digital'
  )
})
