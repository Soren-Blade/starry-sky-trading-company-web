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

test('收起态就是一枚普通图标按钮：与左右邻居逐值相同的尺寸与外观', () => {
  const fieldRule = NAVBAR_SOURCE.slice(NAVBAR_SOURCE.indexOf('.search-field {'))
  const body = fieldRule.slice(0, fieldRule.indexOf('}'))

  assert.match(body, /width: var\(--icon-btn-size\)/)
  assert.match(body, /height: var\(--icon-btn-size\)/, '高度必须锚在图标格上，不是 --input-height')
  assert.match(body, /background: var\(--bg-surface\)/, '与 .u-icon-btn 同底')
  assert.match(body, /border: var\(--stroke-width\) solid var\(--stroke-color\)/)
  assert.match(body, /border-radius: var\(--icon-btn-radius\)/)
  assert.match(body, /color: var\(--text-secondary\)/)
  assert.equal(
    /visibility:\s*hidden/.test(body),
    false,
    'visibility: hidden 的元素无法聚焦，键盘用户就永远展不开它'
  )
})

test('**展开态除宽度外不改任何外观**（这就是「点击前后明显差异」的根因）', () => {
  // 踩过的坑：收起态用 --icon-btn-size / --icon-btn-radius / --bg-surface，
  // 展开态用 --input-height / --radius-input / --bg-surface-2。
  // 这两组值在五套主题里并不相等 —— 高度在玻璃(44→48)、便当(40→44)、
  // 粗野(44→48)、单色(32→36)四套里都不同，圆角在便当(10→24)、粗野(0→8)也不同。
  // 于是点击时盒子会明显长大、变方。因此展开规则里**只允许出现 width**。
  const selectorAt = NAVBAR_SOURCE.indexOf('.navbar-search.search-open .search-field {')
  const bodyStart = NAVBAR_SOURCE.indexOf('{', selectorAt) + 1
  const body = NAVBAR_SOURCE.slice(bodyStart, NAVBAR_SOURCE.indexOf('}', bodyStart))
  const declarations = body
    .split(';')
    .map((line) => line.replace(/\/\*[\s\S]*?\*\//g, '').trim())
    .filter(Boolean)

  const properties = declarations.map((line) => line.split(':')[0].trim())
  assert.deepEqual(
    [...new Set(properties)],
    ['width'],
    `展开态只应改宽度，实际改了：${properties.join(', ')}`
  )
})

test('展开宽度按图标格换算，不掺 --input-height / --space-unit 的倍数', () => {
  const openRule = NAVBAR_SOURCE.slice(
    NAVBAR_SOURCE.indexOf('.navbar-search.search-open .search-field {')
  )
  const widthLine = openRule.slice(0, openRule.indexOf('}')).match(/width: min\([^;]*;/)?.[0]

  assert.ok(widthLine, '展开宽度应是一句 min(...)')
  assert.match(widthLine, /var\(--icon-btn-size\) \* \d+/, '缩放基准应是图标格')
  assert.equal(
    /var\(--input-height\)/.test(widthLine),
    false,
    '混用 --input-height 会让盒子在点击时变高'
  )
  assert.equal(
    /var\(--space-unit\) \* \d+\),/.test(widthLine),
    false,
    '--space-unit 在「技术单色」主题是 4px，拿它当缩放基准会把框压得很窄'
  )
  assert.match(
    widthLine,
    /100vw - var\(--space-unit\)/,
    '视口上限里用 --space-unit 只作边距，不参与缩放，这是允许的'
  )
})

test('点击不会被 focusin 抢先展开再收起（点一下只走 click 的切换）', () => {
  // 浏览器在 mousedown 就给按钮焦点，focusin 冒泡到 wrapper 时 click 还没发生。
  // 若 focusin 无条件置 true，点一下会变成「mousedown 展开 → click 收起」，
  // 净效果是闪一下又没了。因此 focusin 必须忽略来自放大镜按钮自身的焦点。
  const at = NAVBAR_SOURCE.indexOf('const handleSearchFocusIn = (event) => {')
  assert.ok(at > -1)
  const body = NAVBAR_SOURCE.slice(at, NAVBAR_SOURCE.indexOf('\n}', at))

  assert.match(body, /event\.target === searchToggleRef\.value/, '必须忽略按钮自身触发的 focusin')
  assert.match(body, /searchOpen\.value = true/, '来自输入框的焦点仍要展开')

  // 按钮上要有 ref，否则上面那句永远不成立
  assert.match(NAVBAR_SOURCE, /ref="searchToggleRef"/)
})

test('聚焦环整体淡入：box-shadow 必须与 border-color 一起过渡', () => {
  // 只过渡 border-color 的话外发光会瞬间出现、描边在淡入，
  // 一个硬切一个渐变，看起来就是一次莫名的闪动。
  const fieldRule = NAVBAR_SOURCE.slice(NAVBAR_SOURCE.indexOf('.search-field {'))
  const body = fieldRule.slice(0, fieldRule.indexOf('}'))
  assert.match(body, /box-shadow var\(--transition-interactive\)/)
})

test('放大镜绝对定位贴框右缘：位置与宽度动画**数学上无关**', () => {
  // 用户报「点一下图标闪一下，然后展开」。按钮此前是框的 flex 子元素，
  // 它的位置与尺寸取决于框**正在变化的宽度** —— 任何一帧的排版细节
  // （首帧溢出、被裁、重排）都会表现在按钮上。
  // 拿出来绝对定位之后，框的右缘固定、按钮贴右缘，宽度怎么变它都不动。
  const at = NAVBAR_SOURCE.indexOf('.navbar-search .search-field .search-toggle {')
  assert.ok(at > -1)
  const body = NAVBAR_SOURCE.slice(at, NAVBAR_SOURCE.indexOf('}', at))

  assert.match(body, /position: absolute/, '按钮必须脱离文档流')
  assert.match(body, /right: 0/, '贴右缘才能与宽度动画无关')
  assert.match(body, /top: 50%/)
  assert.match(body, /transform: translateY\(-50%\)/, '垂直居中不能丢')
  assert.equal(/flex-shrink/.test(body), false, '已经脱离文档流，不再需要 flex 属性')
})

test('框里不设 gap、也不用 flex 排版（任何按状态切换的间距都会在首帧溢出）', () => {
  const fieldRule = NAVBAR_SOURCE.slice(NAVBAR_SOURCE.indexOf('.search-field {'))
  const body = fieldRule.slice(0, fieldRule.indexOf('}')).replace(/\/\*[\s\S]*?\*\//g, '')

  assert.equal(/(^|\s)gap:/.test(body), false, '不能有 gap')
  assert.equal(
    /display: flex/.test(body),
    false,
    '按钮已脱离文档流，框里只剩输入区一个流内元素，不需要 flex',
  )
  assert.equal(
    /\.navbar-search:not\(\.search-open\) \.search-field/.test(NAVBAR_SOURCE),
    false,
    '不应再有「按状态切换间距」这类规则'
  )

  // 间距改由输入区右侧内边距提供，文字不会钻到放大镜底下
  const formAt = NAVBAR_SOURCE.indexOf('.search-field :deep(.u-search) {')
  const formBody = NAVBAR_SOURCE.slice(formAt, NAVBAR_SOURCE.indexOf('}', formAt))
  assert.match(formBody, /padding-right: calc\(var\(--icon-btn-size\) - var\(--stroke-width\) \* 2\)/)
})

test('框用 overflow: clip 而不是 hidden（hidden 仍可被程序滚动，聚焦会横向位移）', () => {
  const fieldRule = NAVBAR_SOURCE.slice(NAVBAR_SOURCE.indexOf('.search-field {'))
  const body = fieldRule.slice(0, fieldRule.indexOf('}'))

  assert.match(body, /overflow: clip/)
  assert.equal(/overflow: hidden/.test(body), false)
})

test('输入框 min-width 归零：否则它会撑到浏览器默认宽度、盖在放大镜上', () => {
  const at = NAVBAR_SOURCE.indexOf('.search-field :deep(.u-input) {')
  assert.ok(at > -1)
  const body = NAVBAR_SOURCE.slice(at, NAVBAR_SOURCE.indexOf('}', at))
  assert.match(body, /min-width: 0/)
})

test('展开后按钮自身的外观让位给外框（否则框里还有一个方按钮）', () => {
  const at = NAVBAR_SOURCE.indexOf('.navbar-search .search-field .search-toggle {')
  assert.ok(at > -1, '应有按钮的中性化规则')
  const body = NAVBAR_SOURCE.slice(at, NAVBAR_SOURCE.indexOf('}', at))

  assert.match(body, /background: transparent/)
  assert.match(body, /border-color: transparent/)
  assert.match(body, /color: inherit/, '字形颜色要跟着外框走，悬停才会一起变色')
  assert.match(body, /width: calc\(var\(--icon-btn-size\) - var\(--stroke-width\) \* 2\)/)
  assert.match(body, /height: calc\(var\(--icon-btn-size\) - var\(--stroke-width\) \* 2\)/)
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

test('放大镜内嵌进搜索框：同一个按钮，展开后落在输入框右端', () => {
  // 按钮与输入框必须在同一个 .search-field 里 —— 分开就变成
  // 「按钮 + 旁边另一个框」，而不是「内嵌」
  const fieldAt = NAVBAR_SOURCE.indexOf('<div class="search-field">')
  const fieldEnd = NAVBAR_SOURCE.indexOf('</div>', NAVBAR_SOURCE.indexOf('</button>', fieldAt))
  const inner = NAVBAR_SOURCE.slice(fieldAt, fieldEnd)

  assert.ok(fieldAt > -1)
  assert.match(inner, /class="u-icon-btn search-toggle"/, '放大镜按钮应在 .search-field 内')
  assert.match(inner, /<SearchBar/, '输入框也应在同一个 .search-field 内')
  assert.ok(
    inner.indexOf('<SearchBar') < inner.indexOf('search-toggle'),
    '放大镜要排在输入框**之后** —— 它是框的最后一个子元素，右贴框缘才不会随展开移动'
  )
})

test('**展开前后放大镜位置不变**', () => {
  // 位置不变的机制是两条，缺一不可：
  //   1. 框右缘固定（right: 0），向左生长
  //   2. 放大镜是框的最后一个子元素，贴住固定不动的右缘
  const fieldRule = NAVBAR_SOURCE.slice(NAVBAR_SOURCE.indexOf('.search-field {'))
  const body = fieldRule.slice(0, fieldRule.indexOf('}'))
  assert.match(body, /right: 0/, '框的右缘必须固定')

  // 展开态不能有任何会把按钮往左推的右侧留白
  const openRule = NAVBAR_SOURCE.slice(
    NAVBAR_SOURCE.indexOf('.navbar-search.search-open .search-field {')
  )
  const openBody = openRule.slice(0, openRule.indexOf('}'))
  assert.equal(
    /padding-right/.test(openBody),
    false,
    '展开态加右内边距会把放大镜往左推，「位置不变」就破了'
  )
  assert.equal(/border-right-width/.test(openBody), false)
})

test('聚焦高亮画在外框上（内层输入框的描边已抹掉，否则看不见聚焦态）', () => {
  assert.match(
    NAVBAR_SOURCE,
    /\.navbar-search\.search-open \.search-field:focus-within \{[\s\S]*?border-color: var\(--input-focus-border\)/
  )
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

test('键盘路径也能展开：Tab 到输入框时展开（收起态宽度为 0，不展开就是往看不见的框里打字）', () => {
  assert.match(NAVBAR_SOURCE, /@focusin="handleSearchFocusIn"/)
  const at = NAVBAR_SOURCE.indexOf('const handleSearchFocusIn = (event) => {')
  const body = NAVBAR_SOURCE.slice(at, NAVBAR_SOURCE.indexOf('\n}', at))
  assert.match(body, /searchOpen\.value = true/)

  // 放大镜按钮是展开/收起的开关，键盘聚焦它本身不应该展开
  // （否则 Tab 一下就把框撑开，且会与 click 的切换打架）
  assert.match(body, /if \(event\.target === searchToggleRef\.value\) return/)
})

test('焦点只在这块**之内**移动时不收起（否则「再点一次收起」会被 focusout 抢先关掉）', () => {
  const at = NAVBAR_SOURCE.indexOf('const handleSearchFocusOut = (event) => {')
  assert.ok(at > -1)
  const body = NAVBAR_SOURCE.slice(at, NAVBAR_SOURCE.indexOf('\n}', at))

  assert.match(body, /searchRoot\.value\?\.contains\(event\.relatedTarget\)/, '必须判断新焦点是否仍在这块内')
  assert.match(body, /!event\.relatedTarget/, 'relatedTarget 为 null（点了页面空白）也要收起')
})

test('不要「搜索」提交按钮：图标已内嵌，框里再塞按钮会挤掉输入区', async () => {
  const html = await render('/components/Navbar.vue')

  assert.equal(/class="[^"]*search-submit/.test(html), false, '顶栏的搜索不应渲染提交按钮')
  assert.match(NAVBAR_SOURCE, /:show-submit="false"/)
  // 但 SearchBar 默认仍然带提交按钮，其它地方不受影响
  const searchBarSource = readFileSync(join(WEB_ROOT, 'src', 'components', 'SearchBar.vue'), 'utf8')
  assert.match(searchBarSource, /showSubmit: \{ type: Boolean, default: true \}/)
})

test('顶栏的搜索只有一个放大镜（SearchBar 自带的那个要让位）', async () => {
  const html = await render('/components/Navbar.vue')

  assert.match(NAVBAR_SOURCE, /:show-icon="false"/, 'SearchBar 自带的放大镜要关掉')

  // 放大镜现在是线性 SVG 而不是 emoji，因此按 app-icon 数量断言
  const toggleAt = html.indexOf('search-toggle')
  const toggleEnd = html.indexOf('</button>', toggleAt)
  const insideToggle = html.slice(toggleAt, toggleEnd)

  assert.equal(
    countMatches(insideToggle, /class="app-icon"/g),
    1,
    '放大镜按钮里应恰好一个图标'
  )
  assert.equal(html.includes('u-search-icon'), false, '搜索框里不应再画第二个放大镜')
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
