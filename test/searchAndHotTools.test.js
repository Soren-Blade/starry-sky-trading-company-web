import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

import { renderComponent, createRenderEnv, createPiniaWithState } from './render.mjs'
import { SEARCH_PAGE, SECTIONS } from '../src/constants/content.js'

/**
 * 搜索（商品 + 工具）与热门工具
 *
 * ## 覆盖策略
 *
 * 搜索页与热门工具区块的数据都在 `onMounted` 里取，而 **SSR 不执行 onMounted** ——
 * 因此渲染断言只能覆盖「首屏就能确定」的部分（无关键词的引导态、区块头、加载态）。
 * 数据驱动的分支用**源码契约**兜住：那些断言盯的是「接线有没有被改坏」，
 * 不是「结果对不对」。真正的结果正确性由真实 HTTP 验证覆盖（见下方注释里的说明）。
 */

const __dirname = dirname(fileURLToPath(import.meta.url))
const WEB_ROOT = join(__dirname, '..')

const read = (rel) => readFileSync(join(WEB_ROOT, rel), 'utf8')

const SEARCH_SOURCE = read('src/pages/SearchResults.vue')
const HOT_TOOLS_SOURCE = read('src/components/HotToolsSection.vue')
const NAVBAR_SOURCE = read('src/components/Navbar.vue')
const ROUTER_SOURCE = read('src/router/index.js')
const HOME_SOURCE = read('src/pages/Home.vue')
const HOT_SOURCE = read('src/pages/Hot.vue')

/** 带 router + pinia 的渲染环境（页面用 store 与 RouterLink，两者都必须装） */
const renderPage = async (moduleSpec, options = {}) => {
  const { globalComponents, router } = await createRenderEnv()
  const pinia = await createPiniaWithState()
  if (options.path) {
    await router.push(options.path)
    await router.isReady()
  }
  return renderComponent(moduleSpec, { ...options, plugins: [router, pinia], globalComponents })
}

// ══════════════════════════════════════════════════════════
// 路由
// ══════════════════════════════════════════════════════════

test('搜索结果页有独立路由，关键词走 query（可分享、可收藏）', () => {
  assert.match(ROUTER_SOURCE, /path: '\/search'/, '要有 /search 路由')
  assert.match(ROUTER_SOURCE, /name: 'SearchResults'/)
  assert.match(ROUTER_SOURCE, /import\('@\/pages\/SearchResults\.vue'\)/)

  // 不用 /search/:q —— 路径段里的中文与特殊字符会带来额外的编码问题
  assert.equal(/path: '\/search\/:/.test(ROUTER_SOURCE), false, '关键词不该放进路径段')
  assert.match(SEARCH_SOURCE, /route\.query\.q/, '页面从 query 读关键词')
})

test('导航提交改为跳搜索结果页，且空关键词不跳', () => {
  const at = NAVBAR_SOURCE.indexOf('const handleSearchSubmit = () => {')
  assert.ok(at > -1)
  const body = NAVBAR_SOURCE.slice(at, NAVBAR_SOURCE.indexOf('\n}', at))

  assert.match(body, /name: 'SearchResults'/, '提交应打开结果页')
  assert.match(body, /query: \{ q: keyword \}/, '关键词要带过去')
  // 空关键词跳过去只会把用户从一个空输入框送到另一个空页面
  assert.match(body, /if \(!keyword\) return/)
  assert.equal(/name: 'Hot'/.test(body), false, '旧的「跳热卖榜」应已移除')
})

test('搜索占位文案改为「搜索商品或工具」', () => {
  // 原文案是「搜索商品或分类」：既漏了工具，「或分类」也与实际搜索字段（标题）不符
  assert.match(NAVBAR_SOURCE, /PRODUCT_GRID\.searchPlaceholder/)
  assert.match(read('src/constants/content.js'), /searchPlaceholder: '搜索商品或工具'/)
})

// ══════════════════════════════════════════════════════════
// 搜索页：首屏可确定的部分
// ══════════════════════════════════════════════════════════

test('没有关键词：给出引导，而不是发请求或显示空白', async () => {
  const html = await renderPage('pages/SearchResults.vue', { path: '/search' })

  assert.ok(html.includes(SEARCH_PAGE.emptyKeywordTitle), '要有引导标题')
  assert.ok(html.includes(SEARCH_PAGE.emptyKeywordHint), '要有引导说明')
  assert.ok(html.includes(SEARCH_PAGE.goHot), '要给出可走的入口')
  // 分区用 id 判断，不用「商品」这个词 —— 引导文案里本来就有「商品和工具会一起搜」
  assert.equal(html.includes('search-products-head'), false, '无关键词时不该渲染商品分区')
  assert.equal(html.includes('search-tools-head'), false, '无关键词时不该渲染工具分区')
})

test('有关键词：标题回显关键词', async () => {
  const html = await renderPage('pages/SearchResults.vue', { path: '/search?q=iPhone' })

  assert.ok(html.includes('iPhone'), '标题里要回显关键词')
  assert.equal(html.includes(SEARCH_PAGE.emptyKeywordTitle), false, '有关键词时不该出现引导态')
})

// ══════════════════════════════════════════════════════════
// 搜索页：两个分区的接线
// ══════════════════════════════════════════════════════════

test('两个分区各查各的接口，且都用 keyword（服务端搜索，不拉全量）', () => {
  const at = SEARCH_SOURCE.indexOf('const loadProducts = async (text) => {')
  const products = SEARCH_SOURCE.slice(at, SEARCH_SOURCE.indexOf('const loadTools', at))
  const toolsAt = SEARCH_SOURCE.indexOf('const loadTools = async (text) => {')
  const tools = SEARCH_SOURCE.slice(toolsAt, SEARCH_SOURCE.indexOf('const load = async', toolsAt))

  assert.match(products, /api\.getProducts\(\{[\s\S]*?keyword: text/)
  assert.match(tools, /api\.getTools\(\{ keyword: text/)
  // 商品搜索保留「缺货也返回」：搜索要回答「有没有这件东西」，由卡片自己标注缺货
  assert.match(products, /in_stock: 'all'/)
  assert.match(products, /status: 'all'/)
})

test('两个分区互不拖累：用 allSettled，且各自 try/catch', () => {
  const at = SEARCH_SOURCE.indexOf('const load = async (text) => {')
  const body = SEARCH_SOURCE.slice(at, SEARCH_SOURCE.indexOf('// 同一页面内再次搜索', at))

  assert.match(body, /Promise\.allSettled\(/, '一个分区失败不能让另一个也消失')
  assert.equal(/Promise\.all\(/.test(body), false, '不能用 all')

  // 各自把异常转成自己的 error 状态，因此 allSettled 里不会有 rejected
  assert.match(SEARCH_SOURCE, /productsError\.value = error\?\.message/)
  assert.match(SEARCH_SOURCE, /toolsError\.value = error\?\.message/)
})

test('空关键词不请求（只清空并返回）', () => {
  const at = SEARCH_SOURCE.indexOf('const load = async (text) => {')
  const body = SEARCH_SOURCE.slice(at, SEARCH_SOURCE.indexOf('// 同一页面内再次搜索', at))
  assert.match(body, /if \(!text\) \{[\s\S]*?return/)
})

test('同一页内再次搜索：监听 query，而不是只靠 onMounted', () => {
  // 只改 query 不会重新挂载组件，因此必须 watch
  assert.match(SEARCH_SOURCE, /watch\(keyword, \(text\) => \{\s*load\(text\)/)
  assert.match(SEARCH_SOURCE, /onMounted\(\(\) => \{\s*load\(keyword\.value\)/)
})

test('每类最多展示多少条来自 constants，不在页面里另写一个数字', () => {
  assert.match(SEARCH_SOURCE, /const LIMIT = SEARCH_PAGE\.limit/)
  assert.equal(typeof SEARCH_PAGE.limit, 'number')
})

test('两个分区各有自己的加载 / 错误 / 空态', () => {
  for (const marker of [
    'productsLoading',
    'productsError',
    'SEARCH_PAGE.productEmpty(keyword)',
    'toolsLoading',
    'toolsError',
    'SEARCH_PAGE.toolEmpty(keyword)',
  ]) {
    assert.ok(SEARCH_SOURCE.includes(marker), `搜索页应包含 ${marker}`)
  }
})

test('工具搜索必须先有身份：无身份给登录引导，而不是发一个必然 401 的请求', () => {
  // 实测：/toolApi/getTools 无 token 返回 401。访客由 App.vue 的 init 自动创建，
  // 因此只有「刚退出登录」这一种情况没有身份 —— 那时若不判断，
  // 用户看到的是「工具加载失败：token已失效或已过期」，像是页面坏了
  const at = SEARCH_SOURCE.indexOf('const loadTools = async (text) => {')
  const body = SEARCH_SOURCE.slice(at, SEARCH_SOURCE.indexOf('const load = async', at))

  const guardAt = body.indexOf('if (!userStore.userId)')
  const requestAt = body.indexOf('api.getTools(')
  assert.ok(guardAt > -1, '必须有身份判断')
  assert.ok(guardAt < requestAt, '身份判断必须在发请求之前')
  assert.match(body, /toolsNeedIdentity\.value = true/)
  assert.match(SEARCH_SOURCE, /SEARCH_PAGE\.toolNeedIdentity/)
})

test('身份就绪后补一次工具搜索（在结果页登录后不该一直停在引导态）', () => {
  assert.match(SEARCH_SOURCE, /watch\(\s*\(\) => userStore\.userId,[\s\S]*?loadTools\(keyword\.value\)/)
})

test('热门工具同样必须先有身份（首页可能在建出游客身份前就挂载）', () => {
  const at = HOT_TOOLS_SOURCE.indexOf('async function loadTools() {')
  assert.ok(at > -1)
  const body = HOT_TOOLS_SOURCE.slice(at, HOT_TOOLS_SOURCE.indexOf('const result = await api.getTools'))

  assert.match(body, /if \(!userStore\.userId\)/, '没有身份就不该发请求')
  assert.match(HOT_TOOLS_SOURCE, /watch\(\s*\(\) => userStore\.userId/)
})

test('工具卡片带上授权状态（需卡密的工具在搜索结果里也要显示「立即激活」）', () => {
  assert.match(SEARCH_SOURCE, /:has-entitlement="hasEntitlement\(tool\)"/)
  assert.match(SEARCH_SOURCE, /const hasEntitlement = \(tool\) => \{/)
  // 与工具页同一套判断：免费工具永远算可用
  assert.match(SEARCH_SOURCE, /if \(tool\.requires_card !== true\) return true/)
})

// ══════════════════════════════════════════════════════════
// 热门工具
// ══════════════════════════════════════════════════════════

test('热门工具按收藏数排序（用后端的 sort_by，不在前端重排）', () => {
  assert.match(HOT_TOOLS_SOURCE, /sort_by: 'collection_count'/)
  assert.match(HOT_TOOLS_SOURCE, /sort_order: 'desc'/)
  assert.equal(/\.sort\(/.test(HOT_TOOLS_SOURCE), false, '不该在前端再排一次')
})

test('首页与热卖榜都挂上了热门工具', () => {
  assert.match(HOME_SOURCE, /<HotToolsSection \/>/)
  assert.match(HOT_SOURCE, /<HotToolsSection variant="board" \/>/)
})

test('取不到工具就整块不渲染，不留空壳', () => {
  assert.match(HOT_TOOLS_SOURCE, /const shouldRender = computed/)
  assert.match(HOT_TOOLS_SOURCE, /v-if="shouldRender"/)

  // 取数失败必须静默：热门工具是补充内容，首页不该为它弹错误。
  // 只看**取数那段** catch —— 收藏失败另说（那是用户主动操作，必须给反馈）
  const at = HOT_TOOLS_SOURCE.indexOf('const result = await api.getTools(')
  assert.ok(at > -1)
  const fetchBlock = HOT_TOOLS_SOURCE.slice(at, HOT_TOOLS_SOURCE.indexOf('} finally', at))
  assert.match(fetchBlock, /failed\.value = true/)
  assert.equal(/notify\.error/.test(fetchBlock), false, '取数失败不该弹错误提示')
})

test('工具区块始终带自己的区块头（榜单页的页头只讲商品）', () => {
  assert.match(HOT_TOOLS_SOURCE, /<SectionHeader v-bind="SECTIONS\.hotTools" \/>/)
  assert.equal(/v-if="!isBoard"/.test(HOT_TOOLS_SOURCE), false, '不该按变体隐藏区块头')
  assert.equal(typeof SECTIONS.hotTools?.title, 'string')
})

test('热卖榜页头的计数仍然只数商品（页头文案说的就是商品）', () => {
  const at = HOT_SOURCE.indexOf('const hitCount = computed')
  assert.ok(at > -1)
  assert.match(HOT_SOURCE.slice(at, at + 120), /filteredProducts\.value\.length/)
})

test('热门工具是首屏就存在的区块（SSR 能渲染出区块头与加载态）', async () => {
  const html = await renderPage('components/HotToolsSection.vue', {})

  assert.ok(html.includes(SECTIONS.hotTools.title), `应渲染区块头「${SECTIONS.hotTools.title}」`)
  assert.ok(html.includes('class="u-spinner"') || html.includes('u-spinner'), '首屏是加载态')
})
