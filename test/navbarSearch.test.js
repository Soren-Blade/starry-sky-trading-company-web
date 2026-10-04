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

test('收起态是「只有图标那么大、且底与描边透明」，不是 visibility: hidden', () => {
  const fieldRule = NAVBAR_SOURCE.slice(NAVBAR_SOURCE.indexOf('.search-field {'))
  const body = fieldRule.slice(0, fieldRule.indexOf('}'))

  assert.match(body, /width: var\(--icon-btn-size\)/, '收起时宽度应正好是一个图标格')
  assert.match(body, /background: transparent/)
  assert.match(body, /border: var\(--stroke-width\) solid transparent/)
  assert.equal(
    /visibility:\s*hidden/.test(body),
    false,
    'visibility: hidden 的元素无法聚焦，键盘用户就永远展不开它'
  )
})

test('展开宽度按主题的输入框高度换算，且不超过视口', () => {
  const openRule = NAVBAR_SOURCE.slice(
    NAVBAR_SOURCE.indexOf('.navbar-search.search-open .search-field {')
  )
  const body = openRule.slice(0, openRule.indexOf('}'))

  assert.match(body, /width: min\(calc\(var\(--input-height\)/, '五套主题的输入框高度不同')
  assert.match(
    body,
    /100vw - var\(--space-unit\)/,
    '必须有视口上限：展开的框在手机上会把顶栏顶出屏幕'
  )
})

test('展开的框是绝对定位，不参与文档流（否则 1024px 与手机上总宽会溢出）', () => {
  const fieldRule = NAVBAR_SOURCE.slice(NAVBAR_SOURCE.indexOf('.search-field {'))
  const body = fieldRule.slice(0, fieldRule.indexOf('}'))

  assert.match(body, /position: absolute/)
  assert.match(body, /right: 0/, '右边与图标格对齐并向左生长，才不会顶出屏幕右边')
})

test('占位格始终占住图标宽度，展开瞬间后面的图标不会跳', () => {
  assert.match(NAVBAR_SOURCE, /\.search-slot \{[\s\S]*?width: var\(--icon-btn-size\)/)
  // 占位格在模板里必须真的渲染出来（没有被 v-if 之类条件化）
  assert.match(NAVBAR_SOURCE, /<span class="search-slot" aria-hidden="true"><\/span>/)
})

test('放大镜内嵌进搜索框：同一个按钮，展开后落在输入框左侧', () => {
  // 按钮与输入框必须在同一个 .search-field 里 —— 分开就变成
  // 「按钮 + 旁边另一个框」，而不是「内嵌」
  const fieldAt = NAVBAR_SOURCE.indexOf('<div class="search-field">')
  const fieldEnd = NAVBAR_SOURCE.indexOf('</div>', NAVBAR_SOURCE.indexOf('<SearchBar', fieldAt))
  const inner = NAVBAR_SOURCE.slice(fieldAt, fieldEnd)

  assert.ok(fieldAt > -1)
  assert.match(inner, /class="u-icon-btn search-toggle"/, '放大镜按钮应在 .search-field 内')
  assert.match(inner, /<SearchBar/, '输入框也应在同一个 .search-field 内')
  assert.ok(
    inner.indexOf('search-toggle') < inner.indexOf('<SearchBar'),
    '放大镜要排输入框之前 —— 它在左侧当前缀'
  )
})

test('展开后按钮自身的外观让位给外框（否则框里还有一个方按钮）', () => {
  const openAt = NAVBAR_SOURCE.indexOf('.navbar-search.search-open .search-toggle {')
  assert.ok(openAt > -1, '应有展开态的按钮规则')
  const body = NAVBAR_SOURCE.slice(openAt, NAVBAR_SOURCE.indexOf('}', openAt))
  assert.match(body, /background: transparent/)
  assert.match(body, /border-color: transparent/)

  // 悬停态必须单独覆盖：否则鼠标停在按钮上时 .u-icon-btn:hover 又会画出一个方底
  const hoverAt = NAVBAR_SOURCE.indexOf('.navbar-search.search-open .search-toggle:hover {')
  assert.ok(hoverAt > -1, '展开态必须连 :hover 一起盖住')
  const hoverBody = NAVBAR_SOURCE.slice(hoverAt, NAVBAR_SOURCE.indexOf('}', hoverAt))
  assert.match(hoverBody, /background: transparent/)
})

test('提交与 Escape 之后收起：closeSearch 同时释放状态与焦点', () => {
  // 只改状态不清焦点的话，界面已收起但键盘输入仍打进看不见的框里
  const closeAt = NAVBAR_SOURCE.indexOf('const closeSearch = () => {')
  assert.ok(closeAt > -1)
  const body = NAVBAR_SOURCE.slice(closeAt, NAVBAR_SOURCE.indexOf('\n}', closeAt))

  assert.match(body, /searchOpen\.value = false/)
  assert.match(body, /searchBarRef\.value\?\.blur\(\)/, '必须把焦点也移走')
})

// ── 交互方式：点击展开，悬停不展开 ─────────────────────────

test('悬停**不再**展开：模板里没有任何 mouseenter / mouseleave', () => {
  const searchBlock = NAVBAR_SOURCE.slice(
    NAVBAR_SOURCE.indexOf('class="navbar-search"') - 200,
    NAVBAR_SOURCE.indexOf('</div>', NAVBAR_SOURCE.indexOf('<SearchBar'))
  )

  assert.equal(/@mouseenter/.test(searchBlock), false, '悬停展开已按要求去掉')
  assert.equal(/@mouseleave/.test(searchBlock), false)
  // 整个文件里都不该残留（避免别处又挂上）
  assert.equal(/@mouseenter/.test(NAVBAR_SOURCE), false)
})

test('点击图标切换展开与收起', () => {
  assert.match(NAVBAR_SOURCE, /@click="toggleSearch"/, '图标按钮应绑定切换')

  const toggleAt = NAVBAR_SOURCE.indexOf('const toggleSearch = async () => {')
  assert.ok(toggleAt > -1)
  const body = NAVBAR_SOURCE.slice(toggleAt, NAVBAR_SOURCE.indexOf('\n}', toggleAt))

  assert.match(body, /if \(searchOpen\.value\) \{[\s\S]*?closeSearch\(\)/, '已展开时应收起')
  assert.match(body, /searchOpen\.value = true/, '收起时应展开')
  assert.match(body, /searchBarRef\.value\?\.focus\(\)/, '展开时把光标送进输入框')
})

test('键盘 Tab 进来也展开（收起态宽度为 0，不展开就是往看不见的框里打字）', () => {
  assert.match(NAVBAR_SOURCE, /@focusin="handleSearchFocusIn"/)
  const at = NAVBAR_SOURCE.indexOf('const handleSearchFocusIn = () => {')
  const body = NAVBAR_SOURCE.slice(at, NAVBAR_SOURCE.indexOf('\n}', at))
  assert.match(body, /searchOpen\.value = true/)
})

test('焦点只在这块**之内**移动时不收起（否则「再点一次收起」会被 focusout 抢先关掉）', () => {
  const at = NAVBAR_SOURCE.indexOf('const handleSearchFocusOut = (event) => {')
  assert.ok(at > -1)
  const body = NAVBAR_SOURCE.slice(at, NAVBAR_SOURCE.indexOf('\n}', at))

  assert.match(body, /searchRoot\.value\?\.contains\(event\.relatedTarget\)/, '必须判断新焦点是否仍在这块内')
  assert.match(body, /!event\.relatedTarget/, 'relatedTarget 为 null（点了页面空白）也要收起')
})

test('聚焦高亮画在外框上（内层输入框的描边已抹掉，否则看不见聚焦态）', () => {
  assert.match(
    NAVBAR_SOURCE,
    /\.navbar-search\.search-open \.search-field:focus-within \{[\s\S]*?border-color: var\(--input-focus-border\)/
  )
})

test('不要「搜索」提交按钮：图标已内嵌，框里再塞按钮会挤掉输入区', async () => {
  const html = await render('/components/Navbar.vue')

  assert.equal(/class="[^"]*search-submit/.test(html), false, '顶栏的搜索不应渲染提交按钮')
  assert.match(NAVBAR_SOURCE, /:show-submit="false"/)
  // 但 SearchBar 默认仍然带提交按钮，其它地方不受影响
  const searchBarSource = readFileSync(join(WEB_ROOT, 'src', 'components', 'SearchBar.vue'), 'utf8')
  assert.match(searchBarSource, /showSubmit: \{ type: Boolean, default: true \}/)
})

test('顶栏只画一个放大镜（SearchBar 自带的那个要让位）', async () => {
  const html = await render('/components/Navbar.vue')

  assert.match(NAVBAR_SOURCE, /:show-icon="false"/)
  const magnifiers = countMatches(html, /🔍/g)
  assert.equal(magnifiers, 1, `放大镜应只有一个，实际 ${magnifiers} 个`)
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
