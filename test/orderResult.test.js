import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { SRC_DIR } from './render.mjs'

/**
 * 交易结果页（需求 6 的「购买商品」一侧）。
 *
 * 设计系统的 RedeemResult 不只用于卡密兑换：下单成功、订单不存在同样是交易结果，
 * 必须各自用对应模板，而不是一句「失败」或干脆只弹 Toast。
 *   - 下单成功 → .ec-redeem-result--success，标题「下单成功」+ 订单号 + 回订单列表
 *   - 订单不存在 → .ec-redeem-result--notfound，标题是后端返回的原因 + 两个动作
 *
 * 另外守住「成功回执只消费一次」：created=1 只在首次进入时生效，
 * 页面挂载后要把它从地址栏抹掉，刷新不能重复弹。
 */

const read = (relPath) => readFileSync(join(SRC_DIR, `../${relPath}`), 'utf8')

const ORDER_DETAIL = read('src/pages/OrderDetail.vue')
const CART = read('src/pages/Cart.vue')
const CONTENT = read('src/constants/content.js')

const stripComments = (source) =>
  source.replace(/<!--[\s\S]*?-->/g, '').replace(/\/\*[\s\S]*?\*\//g, '')

const ORDER_DETAIL_NO_COMMENTS = stripComments(ORDER_DETAIL)

test('订单不存在走 notfound 模板，且有回列表与去购物的出口', () => {
  const block = ORDER_DETAIL_NO_COMMENTS.match(
    /<div v-else-if="error"([\s\S]*?)<\/div>\s*<\/div>/,
  )
  assert.ok(block, '错误分支必须渲染一个结果块')

  const html = block[0]
  assert.match(html, /ec-redeem-result--notfound/, '订单不存在应用 notfound 模板')
  assert.match(html, /ec-redeem-result__icon/, '结果块必须有图标容器')
  assert.match(html, /ec-redeem-result__title/, '结果块必须有标题')
  assert.match(html, /ec-redeem-result__desc/, '结果块必须有说明')
  assert.match(html, /ec-redeem-result__actions/, '结果块必须有动作区')

  assert.ok(html.includes('to="/user/orders"'), '必须能回订单列表')
  assert.ok(html.includes('to="/hot"'), '还应给一个继续购物的出口')
  assert.match(html, /ec-btn--primary/, '主操作只应有一个')
  assert.equal(html.match(/ec-btn--primary/g).length, 1, '同一结果块只能有一个主按钮')
  assert.match(html, /ec-btn--outline/, '第二个动作应是次要按钮')

  // 旧写法（page-empty + u-btn-primary）不能残留，否则又回到自建空态
  assert.ok(!html.includes('page-empty-title'), '错误分支不应再用自建空态标题')
  assert.ok(!html.includes('u-btn-primary'), '错误分支不应再用旧的按钮别名')
})

test('下单成功走 success 模板，标题复用 TRADE.checkoutSuccess', () => {
  const block = ORDER_DETAIL_NO_COMMENTS.match(
    /<div v-if="showCreated"([\s\S]*?)<\/div>\s*<\/div>/,
  )
  assert.ok(block, '成功分支必须由 showCreated 控制')

  const html = block[0]
  assert.match(html, /ec-redeem-result--success/, '下单成功应用 success 模板')
  assert.match(html, /ec-redeem-result__icon[\s\S]*check-circle/, '成功模板图标应是 check-circle')
  assert.ok(html.includes('{{ TRADE.checkoutSuccess }}'), '标题应与下单成功的提示同源')
  assert.ok(html.includes('order.order_no'), '说明里要带上订单号')
  assert.match(html, /ec-redeem-result__actions/, '结果块必须有动作区')
  assert.ok(html.includes('to="/user/orders"'), '成功回执应引导去订单列表')

  assert.ok(
    CONTENT.includes("orderViewAll: '查看我的订单'"),
    '「查看我的订单」应登记在 TRADE 常量里',
  )
})

test('created=1 只消费一次：挂载后从地址栏抹掉', () => {
  assert.match(
    ORDER_DETAIL,
    /const showCreated = ref\(route\.query\.created === '1'\)/,
    '成功回执必须由入口 query 初始化',
  )
  assert.match(ORDER_DETAIL, /router\.replace\(\{[\s\S]*created: undefined/, '挂载后应把 created 从地址栏清掉')
  assert.match(
    ORDER_DETAIL,
    /onMounted\(\(\) => \{[\s\S]*showCreated\.value[\s\S]*load\(\)\s*\}\s*\)/,
    '清理要在加载订单之前完成',
  )
  assert.match(ORDER_DETAIL, /import \{ useRoute, useRouter \} from 'vue-router'/, '需要 useRouter')
})

test('购物车下单成功后带上 created=1 跳到订单详情', () => {
  assert.match(
    CART,
    /router\.push\(\{ name: 'OrderDetail', params: \{ orderNo \}, query: \{ created: '1' \} \}\)/,
    '下单成功的跳转必须带 created=1，结果块才有数据来源',
  )
  // 没有订单号时不该带这个标记：订单列表页没有结果块，带了就是孤儿参数
  assert.match(CART, /else router\.push\(\{ name: 'Orders' \}\)/, '无订单号时退回列表且不带标记')
})

test('结果块只补间距，配色与排版交给 .ec-redeem-result', () => {
  const style = ORDER_DETAIL.slice(ORDER_DETAIL.indexOf('<style'))
  const block = style.match(/\.order-result \{([\s\S]*?)\}/)
  assert.ok(block, '需要一个 .order-result 只做页面间距')
  assert.match(block[1], /margin-block: var\(--ec-space-6\)/, '间距用 EC 间距令牌')

  // 页面不得重画结果块内部样式（否则与设计系统脱钩）
  assert.ok(!style.includes('.ec-redeem-result__title'), '页面不应重定义结果块标题样式')
  assert.ok(!style.includes('.ec-redeem-result__actions'), '页面不应重定义结果块动作区样式')
  assert.ok(!/\.order-result \{[^}]*#[0-9a-fA-F]{3,6}/.test(style), '间距类不得写死色值')
  assert.ok(!style.includes('.order-fallback'), '旧的 fallback 样式应已删除')
})
