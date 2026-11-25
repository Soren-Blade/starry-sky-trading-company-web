import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

/**
 * 4.9.0 全站搜索契约
 *
 * 顶栏的旧搜索（展开式输入框 + SearchBar）已经整块删除；搜索现在是
 * GlobalSearch 这一块命令面板：Ctrl / Cmd + K 打开、页面 / 商品 / 工具
 * 同屏、键盘可走完、移动端全屏。这里锁住四件事，避免以后又被拆回两套：
 *   1. 顶栏只剩触发按钮，旧实现（含样式）不再存在；
 *   2. 面板具备 dialog / combobox / listbox 语义与焦点管理；
 *   3. 商品与工具复用结果页的同一组接口，且只取前几条；
 *   4. 中英文案齐备。
 */

const __dirname = dirname(fileURLToPath(import.meta.url))
const WEB_ROOT = join(__dirname, '..')

const read = (relPath) =>
  readFileSync(join(WEB_ROOT, relPath), 'utf8').replace(/\r\n/g, '\n')

const NAVBAR = read('src/components/Navbar.vue')
const SEARCH = read('src/components/GlobalSearch.vue')
const CONTENT = read('src/constants/content.js')
const EN = read('src/i18n/locales/en-US/common.js')

test('顶栏搜索只剩触发按钮，旧展开式实现与样式全部删除', () => {
  assert.match(NAVBAR, /class="ec-icon-btn navbar-search-trigger"/)
  assert.match(NAVBAR, /:aria-label="PAGES\.searchGlobal\.title"/)
  assert.match(NAVBAR, /@click="openGlobalSearch"/)
  assert.match(NAVBAR, /<GlobalSearch ref="globalSearchRef" \/>/)

  assert.doesNotMatch(NAVBAR, /SearchBar/)
  assert.doesNotMatch(NAVBAR, /search-slot|search-field|search-toggle/)
  assert.doesNotMatch(NAVBAR, /const keyword = ref\(/)
  assert.doesNotMatch(NAVBAR, /handleSearchSubmit|toggleSearch|closeSearch/)
})

test('命令面板：dialog + combobox + listbox，焦点交给 useModalA11y', () => {
  assert.match(SEARCH, /<Teleport to="body">/)
  assert.match(SEARCH, /role="dialog"/)
  assert.match(SEARCH, /aria-modal="true"/)
  assert.match(SEARCH, /useModalA11y\(\{[\s\S]*?initialFocus: '#global-search-input'/)
  assert.match(SEARCH, /role="combobox"/)
  assert.match(SEARCH, /aria-controls="gs-results"/)
  assert.match(SEARCH, /:aria-activedescendant="activeId"/)
  assert.match(SEARCH, /role="listbox"/)
  assert.match(SEARCH, /role="option"/)
  assert.match(SEARCH, /ref="modalRef"/)
})

test('Ctrl / Cmd + K 打开，Esc / 路由变化关闭', () => {
  assert.match(SEARCH, /\(event\.metaKey \|\| event\.ctrlKey\) && !event\.altKey && event\.key\.toLowerCase\(\) === 'k'/)
  assert.match(SEARCH, /if \(open\.value\) close\(\)\n {4}else openSearch\(\)/)
  assert.match(SEARCH, /watch\(\n {2}\(\) => route\.fullPath,[\s\S]*?if \(open\.value\) close\(\)/)
  assert.match(SEARCH, /window\.addEventListener\('keydown', onGlobalKeydown\)/)
})

test('结果来自同一组接口：页面本地匹配、商品/工具各取前几条', () => {
  assert.match(SEARCH, /api\.getProducts\(\{ keyword: text, status: 'all', in_stock: 'all', limit: RESULT_LIMIT \}\)/)
  assert.match(SEARCH, /api\.getTools\(\{ keyword: text, limit: RESULT_LIMIT \}\)/)
  assert.match(SEARCH, /const RESULT_LIMIT = 5/)
  assert.match(SEARCH, /const SEARCH_DEBOUNCE_MS = 220/)
  assert.match(SEARCH, /PAGE_LINKS = \[/)
  assert.match(SEARCH, /path: '\/user\/orders'/)
  assert.match(SEARCH, /path: '\/coupons'/)
  assert.match(SEARCH, /to="\{\s*path: '\/search', query: \{ q: trimmed \}/)
})

test('键盘 ↑↓ 在结果上移动，Enter 打开当前项', () => {
  assert.match(SEARCH, /event\.key === 'ArrowDown'/)
  assert.match(SEARCH, /event\.key === 'ArrowUp'/)
  assert.match(SEARCH, /event\.key === 'Enter'/)
  assert.match(SEARCH, /activateEntry\(entries\.value\[activeIndex\.value\]\)/)
  assert.match(SEARCH, /scrollIntoView\(\{ block: 'nearest' \}\)/)
})

test('移动端是顶部玻璃抽屉：无快捷入口、无键盘提示，桌面是居中命令面板', () => {
  // 4.11.0：面板不再铺满 100dvh —— 铺满会把遮罩压死，唯一退出口只剩右上角 ×
  assert.match(SEARCH, /max-height: min\(82dvh, 720px\)/)
  assert.match(SEARCH, /border-radius: 0 0 var\(--ec-radius-2xl\) var\(--ec-radius-2xl\)/)
  assert.match(SEARCH, /padding-top: env\(safe-area-inset-top\)/)
  assert.match(SEARCH, /width: min\(680px, 100%\)/)
  // 手机端去掉快捷入口与键盘提示，背景改成 Liquid Glass（与导航同一档），
  // 最上层再压一段不透明帽盖住顶栏那一行（4.12.0）
  assert.match(SEARCH, /\.gs-group--quick \{\s*display: none;/)
  assert.match(SEARCH, /\.gs-foot \{\s*display: none;/)
  assert.match(SEARCH, /background-color: var\(--glass-nav-bg-strong\);/)
  assert.match(SEARCH, /var\(--glass-nav-specular\),\s*var\(--glass-nav-wash\);/)
  assert.match(
    SEARCH,
    /backdrop-filter: blur\(calc\(var\(--glass-nav-blur\) \* 0\.9\)\) saturate\(var\(--glass-nav-saturate\)\);/
  )
})

/**
 * 4.11.0 手机搜索的三个退出口
 *
 * 「点 × 才能关」是上一版最刺眼的一处：面板铺满整屏，遮罩被压在下面，
 * 手指要横跨屏幕去够右上角。这一版要求三个退出口同时存在，且都不是装饰：
 *   ① 顶部抓握条（pointer 手势，拖过阈值或甩出速度即收起）；
 *   ② 头部「取消」文字按钮（拇指自然落点）；
 *   ③ 面板下方留出的页面本身是遮罩（@pointerdown.self）。
 */
test('手机端三个退出口：抓握条手势、取消按钮、面板外点击', () => {
  assert.match(SEARCH, /class="gs-grab"/)
  assert.match(SEARCH, /@pointerdown="onDragStart"/)
  assert.match(SEARCH, /@pointermove="onDragMove"/)
  assert.match(SEARCH, /@pointerup="onDragEnd"/)
  assert.match(SEARCH, /const DRAG_CLOSE_PX = 72/)
  assert.match(SEARCH, /const DRAG_CLOSE_VELOCITY = 0\.6/)
  assert.match(SEARCH, /if \(distance > DRAG_CLOSE_PX \|\| distance \/ elapsed > DRAG_CLOSE_VELOCITY\) close\(\)/)
  assert.match(SEARCH, /class="gs-cancel"/)
  assert.match(SEARCH, /@pointerdown\.self="close"/)
  // 手指拖动时不能有过渡，否则跟手感变成「橡皮筋」
  assert.match(SEARCH, /\.gs-panel\.is-dragging \{\s*transition: none;/)
})

test('最近搜索：只在空态出现，只在真的用关键词走掉时记录', () => {
  assert.match(SEARCH, /const RECENT_KEY = 'sstc\.search\.recent'/)
  assert.match(SEARCH, /const RECENT_LIMIT = 6/)
  assert.match(SEARCH, /function rememberRecent\(text\)/)
  assert.match(SEARCH, /function clearRecent\(\)/)
  assert.match(SEARCH, /v-if="!trimmed && recent\.length"/)
  // 有最近搜索时不再叠用法说明：空态只留一样东西
  assert.match(SEARCH, /v-if="!trimmed && !recent\.length"/)
  assert.match(SEARCH, /class="gs-chip"/)
  // 打字不记录、点开结果才记录
  assert.match(SEARCH, /function activateEntry\(entry\) \{\s*if \(!entry\) return[\s\S]*?rememberRecent\(query\.value\)/)
  assert.match(SEARCH, /@click="rememberRecent\(trimmed\); close\(\)"/)
})

test('输入框有独立的清空键：清关键词 ≠ 关面板', () => {
  assert.match(SEARCH, /class="gs-clear"/)
  assert.match(SEARCH, /:aria-label="PAGES\.searchGlobal\.clearInput"/)
  assert.match(SEARCH, /@click="clearQuery"/)
  assert.match(SEARCH, /function clearQuery\(\) \{\s*query\.value = ''/)
})

/**
 * 手机抽屉与顶栏的关系：抽屉盖住顶栏那一行，但顶栏本身不动。
 *
 * 4.11.0 曾让顶栏退场（html.gs-open + opacity 0）。抽屉背后确实干净了，
 * 但顶栏是页面的固定结构：关抽屉时它要淡入 180ms，读起来是「背景突然出现」。
 * 4.12.0 改为顶栏始终保持原样，由抽屉自己用不透明帽盖住那一行。
 */
test('手机搜索不再让顶栏退场：没有 gs-open，抽屉自己盖实顶部', () => {
  assert.ok(!SEARCH.includes("classList.add('gs-open')"))
  assert.ok(!SEARCH.includes("classList.remove('gs-open')"))

  const NAV = readFileSync(new URL('../src/components/Navbar.vue', import.meta.url), 'utf8')
  assert.ok(!NAV.includes(':global(html.gs-open .navbar)'))
  assert.ok(!NAV.includes('opacity 0.18s'))

  // 抽屉顶部的不透明帽：两层不透明停靠点到 96px 渐隐（作为 background-image 的第一层）
  assert.match(
    SEARCH,
    /background-image:\s*linear-gradient\(\s*to bottom,\s*var\(--ec-bg-surface\) 0,\s*var\(--ec-bg-surface\) 74px,\s*transparent 96px\s*\),/
  )
})


test('中英文案齐备：pages.searchGlobal.*', () => {
  for (const key of [
    'title',
    'placeholder',
    'hint',
    'empty',
    'pages',
    'products',
    'tools',
    'quick',
    'viewAll',
    'loading',
    'failed',
    'retry',
    'navHome',
    'navOrders',
    'navProfile',
    'arrowHint',
    'enterHint',
    'escHint',
    'cancel',
    'clearInput',
    'recent',
    'clearRecent',
  ]) {
    assert.match(CONTENT, new RegExp(`${key}:`), `missing zh key ${key}`)
  }
  assert.match(EN, /searchGlobal: \{/)
  assert.match(EN, /viewAll: 'View all results'/)
  assert.match(EN, /navOrders: 'My orders'/)
  assert.match(EN, /cancel: 'Cancel'/)
  assert.match(EN, /recent: 'Recent searches'/)
})
