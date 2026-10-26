import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

// 必须先求值：setup.js 注册 `@/` 别名与 .vue 编译钩子，render.mjs 才能加载 SFC
import './setup.js'
import { renderComponent, createPiniaWithState, WEB_ROOT } from './render.mjs'

/**
 * ProductCard 的 EC 标记契约。
 *
 * 只断言三件在 SSR 里看得见的事（不引 @vue/test-utils、不造 DOM）：
 *   1. CTA 行里同时存在收藏 / 加入购物车 / 立即购买三个控件，且顺序正确；
 *   2. 售罄态 CTA 降级为 outline，加购按钮不可用；
 *   3. 价格走 `.ec-price--md` 的 sym + int + dec 三段式与原价 `<s>`。
 *
 * 另外补一条源码契约：flex 布局与「收藏位偏离设计系统」的注释必须留在
 * 组件里 —— 这两条是 scoped CSS / HTML 注释，SSR 产物里看不到。
 */

const PRODUCT = {
  id: 7,
  main_title: '深海蓝染 T 恤',
  sub_title: '星辰商行 · 自营',
  price: 99.9,
  original_price: 199,
  has_discount: true,
  discount_percent: 50,
  stock_quantity: 12,
  view_count: 1234,
  sales_count: 5678,
  main_image_url: '',
}

/** 渲染一次商品卡；顺便把 Vue 警告收起来，模板绑定写错时能立刻发现 */
async function renderCard(overrides = {}, state = {}) {
  const pinia = await createPiniaWithState(state)
  const warnings = []
  const savedWarn = console.warn
  const savedError = console.error
  console.warn = (...args) => warnings.push(args.map(String).join(' '))
  console.error = (...args) => warnings.push(args.map(String).join(' '))
  try {
    const html = await renderComponent('/components/ProductCard.vue', {
      props: { product: { ...PRODUCT, ...overrides } },
      plugins: [pinia],
    })
    return { html, warnings }
  } finally {
    console.warn = savedWarn
    console.error = savedError
  }
}

/** 截出 CTA 行；内部只有 button / svg，没有嵌套 div，非贪婪匹配是安全的 */
function ctaOf(html) {
  const match = html.match(/<div class="ec-product__cta"[^>]*>([\s\S]*?)<\/div>/)
  assert.ok(match, '应渲染 .ec-product__cta 行')
  return match[1]
}

function assertNoVueWarnings(warnings) {
  assert.deepEqual(
    warnings.filter((w) => w.includes('[Vue warn]')),
    [],
    '渲染期间不应出现 Vue 警告'
  )
}

test('CTA 行：收藏、加入购物车、立即购买三个控件同排，收藏不再在封面', async () => {
  const { html, warnings } = await renderCard()
  assertNoVueWarnings(warnings)

  const cta = ctaOf(html)
  assert.equal((cta.match(/<button/g) || []).length, 3, 'CTA 行应恰好三个控件')
  assert.equal((cta.match(/class="ec-icon-btn/g) || []).length, 2, '应有两个图标按钮')

  const fav = cta.match(/<button[^>]*aria-pressed="false"[^>]*>/)?.[0]
  assert.ok(fav, '收藏按钮必须保留 aria-pressed')
  assert.match(fav, /class="ec-icon-btn[^"]*"/, '收藏按钮用 EC 图标按钮视觉')

  const cart = cta.match(/<button[^>]*aria-label="加入购物车"[^>]*>/)?.[0]
  assert.ok(cart, '应有「加入购物车」图标按钮')
  assert.match(cart, /class="ec-icon-btn[^"]*"/)

  assert.match(cta, /ec-btn--primary/, '主按钮应为主色')
  assert.match(cta, /ec-btn--block/, '主按钮应占满剩余宽度')
  assert.match(cta, /立即购买/)

  const favAt = cta.indexOf('aria-pressed')
  const cartAt = cta.indexOf('aria-label="加入购物车"')
  const buyAt = cta.indexOf('ec-btn--primary')
  assert.ok(favAt < cartAt && cartAt < buyAt, '顺序应为 收藏 → 购物车 → 主按钮')

  assert.doesNotMatch(html, /class="[^"]*ec-product__fav/, '不应再使用封面右上角的 EC 收藏位')
  const cover = html.match(/<div class="ec-product__cover"[^>]*>([\s\S]*?)<\/div>/)?.[1] || ''
  assert.doesNotMatch(cover, /aria-pressed/, '收藏按钮不应留在封面里')
})

test('售罄态：is-soldout + CTA 降级 outline「到货提醒」，加购不可用', async () => {
  const { html, warnings } = await renderCard({
    stock_quantity: 0,
    is_in_stock: false,
    discount_percent: 0,
  })
  assertNoVueWarnings(warnings)

  assert.match(html, /class="[^"]*\bis-soldout\b[^"]*"/, '根节点应带 is-soldout')
  const cta = ctaOf(html)
  assert.match(cta, /ec-btn--outline/, '售罄 CTA 应为 outline')
  assert.match(cta, /ec-btn--block/, '售罄 CTA 应为 block')
  assert.match(cta, /到货提醒/)
  assert.doesNotMatch(cta, /ec-btn--primary/, '售罄态不应再有主色 CTA')
  assert.doesNotMatch(cta, /立即购买/, '售罄态不应再显示立即购买')

  const cart = cta.match(/<button[^>]*aria-label="已售罄[^"]*"[^>]*>/)?.[0]
  assert.ok(cart, '售罄态应保留购物车按钮并给出不可用原因（本实现选择禁用而非隐藏）')
  assert.match(cart, /\sdisabled(\s|>)/, '售罄时购物车按钮必须禁用')

  assert.equal((cta.match(/<button/g) || []).length, 3, '售罄态仍是三个控件，布局不塌')
})

test('价格：.ec-price--md 三段式 + 原价 <s class="ec-price__origin">', async () => {
  const { html, warnings } = await renderCard()
  assertNoVueWarnings(warnings)

  assert.match(html, /class="ec-price ec-price--md"/, '价格必须走 EC 三段式标记')
  assert.match(html, /class="ec-price__sym"[^>]*>¥<\/span>/, '符号单独成节点')
  assert.match(html, /class="ec-price__int"[^>]*>99<\/span>/, '整数部分单独成节点')
  assert.match(html, /class="ec-price__dec"[^>]*>\.90<\/span>/, '小数部分单独成节点')

  assert.match(
    html,
    /<s class="ec-price__origin"[^>]*>¥199\.00<\/s>/,
    '原价用 <s> 打击穿线'
  )
  assert.doesNotMatch(html, /u-price/, '不应残留旧的 u-price 标记')
})

test('收藏态：aria-pressed=true、图标实心，且仍在 CTA 行首', async () => {
  const { html, warnings } = await renderCard({}, { favorite: { productIds: [PRODUCT.id] } })
  assertNoVueWarnings(warnings)

  const cta = ctaOf(html)
  const fav = cta.match(/<button[^>]*aria-pressed="true"[^>]*>/)?.[0]
  assert.ok(fav, '已收藏时 aria-pressed 应为 true')
  assert.match(fav, /is-active/, '已收藏时应带 EC 的 is-active 态')
  assert.match(html, /fill="currentColor"/, '实心 heart 图标应使用 currentColor 填充')

  const firstButton = cta.match(/<button[^>]*>/)?.[0]
  assert.match(firstButton, /aria-pressed="true"/, '收藏按钮应仍在 CTA 行最左边')
})

test('源码契约：CTA 行组件内 flex、主按钮 flex:1，并写明收藏位是对设计系统的刻意偏离', () => {
  const source = fs.readFileSync(path.join(WEB_ROOT, 'src', 'components', 'ProductCard.vue'), 'utf8')

  assert.match(source, /\.ec-product__cta\s*\{[^}]*display:\s*flex/s, 'CTA 行应在组件内声明 flex')
  assert.match(source, /\.product-card__buy\s*\{[^}]*flex:\s*1/s, '主按钮应 flex:1')
  assert.match(source, /刻意偏离/, '必须就地注释说明收藏位偏离设计系统')
  assert.doesNotMatch(source, /#[0-9a-fA-F]{3,8}\b/, '组件样式不得出现 hex 色值')
  assert.doesNotMatch(source, /rgba?\(/, '组件样式不得出现 rgb/rgba 色值')
})
