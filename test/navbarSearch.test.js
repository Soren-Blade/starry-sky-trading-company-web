import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

import { renderComponent, createPiniaWithState, createRenderEnv } from './render.mjs'

/**
 * 顶栏搜索收成图标之后的接线，以及工具页版式的两处修正
 *
 * 展开/收起的判定逻辑本身在 hoverDisclosure.test.js 里测（那是容易写错的地方）。
 * 这里测的是**页面上的事实**：搜索框只有一个、图标有可访问名、
 * 抽屉里不再有第二个搜索框、工具页不再把同一个计数显示两遍。
 */

const __dirname = dirname(fileURLToPath(import.meta.url))
const WEB_ROOT = join(__dirname, '..')
const NAVBAR_SOURCE = readFileSync(join(WEB_ROOT, 'src', 'components', 'Navbar.vue'), 'utf8')
const TOOL_SOURCE = readFileSync(join(WEB_ROOT, 'src', 'pages', 'Tool.vue'), 'utf8')

const USER_REGISTERED = {
  id: 42,
  uuid: 'uuid-42',
  user_type: 'registered',
  nickname: '星尘',
  avatar_url: '',
  created_at: '2026-01-01T00:00:00.000Z',
}

async function render(component, storeState = {}) {
  const [pinia, env] = await Promise.all([
    createPiniaWithState({ user: { initialized: true, userInfo: USER_REGISTERED }, ...storeState }),
    createRenderEnv(),
  ])
  return renderComponent(component, {
    plugins: [pinia, env.router],
    globalComponents: env.globalComponents,
  })
}

const countMatches = (html, re) => [...html.matchAll(re)].length

// ── 顶栏搜索 ───────────────────────────────────────────────

test('顶栏只有一个搜索输入框（原来桌面端与移动抽屉各有一个）', async () => {
  const html = await render('/components/Navbar.vue')

  const inputs = countMatches(html, /type="search"/g)
  assert.equal(inputs, 1, `搜索输入框应只有一个，实际 ${inputs} 个`)

  const forms = countMatches(html, /role="search"/g)
  assert.equal(forms, 1, `search landmark 也只应有一个，实际 ${forms} 个`)
})

test('搜索图标是可访问的图标按钮：aria-label + aria-expanded', async () => {
  const html = await render('/components/Navbar.vue')

  assert.match(
    html,
    /<button[^>]*class="u-icon-btn search-toggle"[^>]*aria-label="搜索"[^>]*aria-expanded="false"/,
    '图标按钮必须有 aria-label；初始 aria-expanded 为 false'
  )
})

test('图标在自己的按钮里，不在输入框里（嵌套交互元素是反模式）', async () => {
  const html = await render('/components/Navbar.vue')
  assert.equal(/<button[^>]*>\s*<input/.test(html), false, 'button 里不应嵌 input')
})

test('移动端抽屉里不再有搜索框（搜索已统一到顶栏图标）', () => {
  const drawerAt = NAVBAR_SOURCE.indexOf('class="navbar-drawer"')
  assert.ok(drawerAt > -1)
  const drawer = NAVBAR_SOURCE.slice(drawerAt, NAVBAR_SOURCE.indexOf('</header>', drawerAt))

  assert.equal(drawer.includes('SearchBar'), false, '抽屉里不应再渲染 SearchBar')
  assert.equal(drawer.includes('drawer-search'), false)
})

test('收起态用宽度 0 而不是 visibility: hidden（否则键盘聚焦不了、也就展不开）', () => {
  const popRule = NAVBAR_SOURCE.slice(NAVBAR_SOURCE.indexOf('.search-pop {'))
  const body = popRule.slice(0, popRule.indexOf('}'))

  assert.match(body, /width: 0/)
  assert.equal(
    /visibility:\s*hidden/.test(body),
    false,
    'visibility: hidden 的元素无法聚焦，键盘用户就永远展不开它'
  )
})

test('展开宽度按主题的输入框高度换算，且不超过视口', () => {
  const openRule = NAVBAR_SOURCE.slice(
    NAVBAR_SOURCE.indexOf('.navbar-search.search-open .search-pop {')
  )
  const body = openRule.slice(0, openRule.indexOf('}'))

  assert.match(body, /width: min\(calc\(var\(--input-height\)/, '五套主题的输入框高度不同')
  assert.match(
    body,
    /100vw - var\(--space-unit\)/,
    '必须有视口上限：320px 的浮层在手机上会把顶栏顶出屏幕'
  )
})

test('展开的输入框是浮层，不参与文档流（否则 1024px 与手机上总宽会溢出）', () => {
  const popRule = NAVBAR_SOURCE.slice(NAVBAR_SOURCE.indexOf('.search-pop {'))
  const body = popRule.slice(0, popRule.indexOf('}'))

  assert.match(body, /position: absolute/)
  assert.equal(
    /flex: 1 1 auto/.test(body),
    false,
    '参与布局的展开区会把主导航挤变形'
  )
})

test('提交与 Escape 之后收起：closeSearch 同时释放状态与焦点', () => {
  // 只改状态不清焦点的话，界面已收起但键盘输入仍打进看不见的框里
  const closeAt = NAVBAR_SOURCE.indexOf('const closeSearch = () => {')
  assert.ok(closeAt > -1)
  const body = NAVBAR_SOURCE.slice(closeAt, NAVBAR_SOURCE.indexOf('}', closeAt))

  assert.match(body, /releaseSearch\(\)/)
  assert.match(body, /searchBarRef\.value\?\.blur\(\)/, '必须把焦点也移走')
})

// ── 工具页版式 ─────────────────────────────────────────────

test('工具页的计数只显示一次（原来开场与工具条各有一个同样的数字）', async () => {
  const html = await render('/pages/Tool.vue', {
    tool: { toolData: [], toolsLoading: false, toolsError: '', activeCategory: 'all' },
  })

  const withCount = countMatches(html, /个工具/g)
  assert.equal(withCount, 1, `同一个计数应只出现一次，实际 ${withCount} 次`)
  assert.equal(html.includes('workspace-count'), false, '开场里的计数标签应已移除')
})

test('分类轨道的滚动上限按条目高度表达，不随主题密度漂移', () => {
  const railListAt = TOOL_SOURCE.indexOf('.rail-list {')
  const body = TOOL_SOURCE.slice(railListAt, TOOL_SOURCE.indexOf('}', railListAt))

  assert.match(body, /max-height: calc\(var\(--dropdown-item-height\) \* \d+\)/)
  assert.equal(
    /max-height: calc\(var\(--space-unit\)/.test(body),
    false,
    '--space-unit 在「技术单色」主题是 4px，同样的倍数只有一半高度，分类会莫名开始内部滚动'
  )
})

test('单栏区间（≤991）用换行而不是隐藏滚动条，且不再有重复规则', () => {
  const at991 = TOOL_SOURCE.indexOf('@media (max-width: 991px) {')
  const at767 = TOOL_SOURCE.indexOf('@media (max-width: 767px) {')
  // 去掉注释再断言：说明文字里会自然地提到「原来是 overflow-x: auto」，
  // 直接匹配源码会把注释也算进去（本用例第一次就是这么误报的）
  const stripComments = (css) => css.replace(/\/\*[\s\S]*?\*\//g, '')
  const block991 = stripComments(TOOL_SOURCE.slice(at991, at767))
  const block767 = stripComments(TOOL_SOURCE.slice(at767))

  assert.match(block991, /\.rail-list \{[\s\S]*?flex-wrap: wrap/, '991 档应换行')
  assert.equal(
    /overflow-x:\s*auto/.test(block991),
    false,
    '隐藏滚动条的横滚条会把最后一个分类从中间裁断，且用户看不出还能滑'
  )
  assert.match(block991, /overflow: visible/, '换行后不需要横向滚动')

  // 换行后这两条已在 991 档统一处理，767 档不应再重复一遍
  assert.equal(/\.rail-favorites \{\s*width: 100%/.test(block767), false, '767 档不应重复')
  assert.equal(/\.rail-group \{/.test(block767), false, '767 档不应重复')
})
