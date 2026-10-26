import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { createRenderEnv, renderComponent } from './render.mjs'

/**
 * PageBreadcrumb（面包屑）
 *
 * 守四条底线：
 *   1. 结构与无障碍：`nav` + `aria-label`、分隔符不进无障碍树、末项 `aria-current="page"` 且不可点；
 *   2. 配色只有一处来源：组件自己不准写颜色，全部交给设计系统的 `.ec-breadcrumb`；
 *   3. 空数组不渲染（详情页在数据到位前会先渲染一次）；
 *   4. 各页面接线到位，且旧的 `.product-crumb` 自建面包屑已无残留。
 */

const __dirname = dirname(fileURLToPath(import.meta.url))
const SRC = join(__dirname, '..', 'src')
const COMPONENT_PATH = join(SRC, 'components', 'PageBreadcrumb.vue')
const SOURCE = readFileSync(COMPONENT_PATH, 'utf8')

const ITEMS = [
  { label: '首页', to: '/home' },
  { label: '商品分类', to: '/categories' },
  { label: '星尘礼盒' },
]

async function renderCrumb(props) {
  const { globalComponents, router } = await createRenderEnv()
  return renderComponent('/components/PageBreadcrumb.vue', {
    props,
    plugins: [router],
    globalComponents,
  })
}

test('渲染设计系统的面包屑结构：nav + aria-label + 末页 aria-current', async () => {
  const html = await renderCrumb({ items: ITEMS })

  assert.match(html, /<nav[^>]*class="[^"]*ec-breadcrumb/, '必须使用 .ec-breadcrumb（设计与配色都来自那里）')
  assert.match(html, /aria-label="面包屑"/, '导航区必须有可读名称')

  // 末项是当前页：不可点，且带 aria-current
  assert.match(html, /<span aria-current="page">星尘礼盒<\/span>/, '末项应为 span + aria-current="page"')
  assert.doesNotMatch(html, /href="[^"]*"[^>]*>星尘礼盒</, '末项不应该还是链接')

  // 前两项可点，且 href 指向对应路由
  assert.match(html, /href="\/home"[^>]*>首页</, '首页应渲染成链接')
  assert.match(html, /href="\/categories"[^>]*>商品分类</, '中间层应渲染成链接')
})

test('分隔符只做视觉分隔，不进无障碍树', async () => {
  const html = await renderCrumb({ items: ITEMS })
  const seps = html.match(/<span class="ec-breadcrumb__sep"[^>]*>/g) || []

  // 首段前不画分隔符（`v-if="index > 0"`），所以 n 段只有 n-1 个
  assert.equal(seps.length, ITEMS.length - 1, '除首段外每段前一个分隔符')
  for (const sep of seps) {
    assert.match(sep, /aria-hidden="true"/, '分隔符必须 aria-hidden，否则读屏会念出斜杠')
  }
  assert.doesNotMatch(html, /^<nav[^>]*><span class="ec-breadcrumb__sep"/, '首段前不应出现分隔符')
})

test('空列表不渲染任何节点', async () => {
  const html = await renderCrumb({ items: [] })
  assert.doesNotMatch(html, /ec-breadcrumb/, 'items 为空时整块不渲染')
})

test('单段也成立：只有当前页时仍保留语义（详情页标题兜底场景）', async () => {
  const html = await renderCrumb({ items: [{ label: '我的订单' }] })
  assert.match(html, /<span aria-current="page">我的订单<\/span>/)
})

test('组件样式不写颜色：配色只能来自 .ec-breadcrumb', async () => {
  const styleBlock = SOURCE.slice(SOURCE.indexOf('<style'))
  const declarations = styleBlock.match(/^\s*[a-z-]+\s*:/gm) || []
  const props = declarations.map((d) => d.trim().replace(':', ''))

  for (const prop of props) {
    assert.ok(
      ['margin', 'margin-block-end', 'margin-block-start', 'padding', 'display'].includes(prop),
      `PageBreadcrumb 不应自行声明 ${prop} —— 布局与配色交给 .ec-breadcrumb`,
    )
  }
  assert.doesNotMatch(styleBlock, /#[0-9a-fA-F]{3,8}\b/, '样式里不允许出现十六进制色值')
  assert.doesNotMatch(styleBlock, /rgba?\(/, '样式里不允许出现 rgb()/rgba()')
})

test('面包屑已接到 7 个页面，且每处至少两段（含回首页的路）', async () => {
  const pages = [
    'ProductDetail.vue',
    'CategoryDetail.vue',
    'Orders.vue',
    'OrderDetail.vue',
    'MemberPlans.vue',
    'MemberBenefits.vue',
    'MemberGrowth.vue',
  ]

  for (const page of pages) {
    const src = readFileSync(join(SRC, 'pages', page), 'utf8')

    assert.match(src, /import PageBreadcrumb from '@\/components\/PageBreadcrumb\.vue'/,
      `${page} 缺少 PageBreadcrumb 的 import`)
    assert.match(src, /<PageBreadcrumb\s+:items="breadcrumbItems"/,
      `${page} 模板里没有渲染面包屑`)
    // 两种写法并存：常量数组（Orders/Member*）与 computed（ProductDetail/CategoryDetail 要等数据）
    const defAt = src.search(/const breadcrumbItems = (?:computed\(\(\) => )?[[{]/)
    assert.ok(defAt >= 0, `${page} 缺少 breadcrumbItems 定义`)

    const body = src.slice(defAt, defAt + 700)
    const entries = body.match(/\{ label:/g) || []
    assert.ok(entries.length >= 2, `${page} 的面包屑至少要有「首页 + 当前页」两段`)
  }
})

test('详情页的面包屑在加载/错误分支之外，兜底也有回列表的路', async () => {
  const src = readFileSync(join(SRC, 'pages', 'OrderDetail.vue'), 'utf8')
  const crumbAt = src.indexOf('<PageBreadcrumb')
  const loadingAt = src.indexOf('v-if="loading"')

  assert.ok(crumbAt > 0, 'OrderDetail 必须渲染面包屑')
  assert.ok(crumbAt < loadingAt, '面包屑要放在加载分支之前，否则失败态没有返回入口')
})

test('旧的自建面包屑已无残留', async () => {
  const detail = readFileSync(join(SRC, 'pages', 'ProductDetail.vue'), 'utf8')
  assert.doesNotMatch(detail, /product-crumb/, 'ProductDetail 的 .product-crumb 已被 PageBreadcrumb 取代')
  assert.doesNotMatch(detail, /class="[^"]*crumb[^"]*"/, '不应再有自建 crumb 容器')

  const growth = readFileSync(join(SRC, 'pages', 'MemberGrowth.vue'), 'utf8')
  assert.doesNotMatch(growth, /growth-back/, 'MemberGrowth 的「会员中心」回链已由面包屑取代')
})
