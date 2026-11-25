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

test('移动端是全屏玻璃面板：无快捷入口、无键盘提示，桌面是居中命令面板', () => {
  assert.match(SEARCH, /@media \(max-width: 767px\) \{[\s\S]*?\.gs-panel \{[\s\S]*?height: 100dvh/)
  assert.match(SEARCH, /padding-top: env\(safe-area-inset-top\)/)
  assert.match(SEARCH, /width: min\(680px, 100%\)/)
  // 4.10.0：手机端去掉快捷入口与键盘提示，背景改成 Liquid Glass
  assert.match(SEARCH, /\.gs-group--quick \{\s*display: none;/)
  assert.match(SEARCH, /\.gs-foot \{\s*display: none;/)
  assert.match(SEARCH, /background: var\(--glass-nav-specular\), var\(--glass-nav-bg\);/)
  assert.match(SEARCH, /backdrop-filter: blur\(calc\(var\(--glass-nav-blur\) \* 1\.2\)\) saturate\(var\(--glass-nav-saturate\)\);/)
  assert.match(SEARCH, /background: color-mix\(in srgb, var\(--ec-bg-surface\) 16%, transparent\);/)
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
  ]) {
    assert.match(CONTENT, new RegExp(`${key}:`), `missing zh key ${key}`)
  }
  assert.match(EN, /searchGlobal: \{/)
  assert.match(EN, /viewAll: 'View all results'/)
  assert.match(EN, /navOrders: 'My orders'/)
})
