import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

/**
 * 4.21.0 抽屉里的语言控件
 *
 * 形态从「左标签 + 右分段」再改成「左标签 + 右单选下拉」：
 * - 分段把选项摊在行里，两门语言刚好，第三门就开始挤；下拉只占一个触发器宽度；
 * - 面板 `role="listbox"` + `role="option"` + `aria-selected`，当前项带勾（不只靠颜色）；
 * - 选完收起并把焦点还给触发器；点面板外也收起。
 * - 反馈出口仍在抽屉脚注，链接带 `?topic=language&from=<locale>`。
 */
const __dirname = dirname(fileURLToPath(import.meta.url))
const WEB_ROOT = join(__dirname, '..')
const read = (relPath) => readFileSync(join(WEB_ROOT, relPath), 'utf8')

const SWITCH = read('src/components/LanguageSwitch.vue')
const NAVBAR = read('src/components/Navbar.vue')

test('抽屉版语言控件是单选下拉：触发器 + listbox + option', () => {
  assert.match(SWITCH, /class="lang-select-trigger"/)
  assert.match(SWITCH, /aria-haspopup="listbox"/)
  assert.match(SWITCH, /:aria-expanded="open"/)
  // 触发器显示当前语言的全名，箭头说明「可以展开」
  assert.match(SWITCH, /\{\{ currentLabel \}\}/)
  assert.match(SWITCH, /class="lang-select-caret"/)
  assert.match(SWITCH, /class="lang-picker"[\s\S]*?role="listbox"/)
  assert.match(SWITCH, /role="option"/)
  assert.match(SWITCH, /:aria-selected="current === item\.code"/)
  // 当前项有勾，不靠颜色单独表达
  assert.match(SWITCH, /name="check-circle"/)
})

test('分段控件彻底退役，不会与下拉并存', () => {
  assert.doesNotMatch(SWITCH, /class="lang-segments"/)
  assert.doesNotMatch(SWITCH, /\.lang-segment\b/)
  assert.doesNotMatch(SWITCH, /\{\{ item\.short \}\}/)
  assert.doesNotMatch(SWITCH, /class="lang-rows"/)
  assert.doesNotMatch(SWITCH, /lang-row-check/)
})

test('触发器与同面板的三档外观开关同高同圆角', () => {
  assert.match(
    SWITCH,
    /\.lang-select-trigger \{[\s\S]*?height: var\(--ec-control-h-sm\);/
  )
  assert.match(SWITCH, /\.lang-select-trigger \{[\s\S]*?border-radius: var\(--radius-pill\);/)
  // 面板贴触发器下方右对齐，语言增加时向下生长
  assert.match(SWITCH, /\.lang-picker \{[\s\S]*?position: absolute;/)
  assert.match(SWITCH, /\.lang-picker \{[\s\S]*?right: 0;/)
})

test('键盘与焦点：↑↓/Home/End 移动，选完焦点回到触发器', () => {
  assert.match(SWITCH, /@keydown\.down\.prevent="moveActive\(1\)"/)
  assert.match(SWITCH, /@keydown\.up\.prevent="moveActive\(-1\)"/)
  assert.match(SWITCH, /@keydown\.home\.prevent="focusItem\(0\)"/)
  assert.match(SWITCH, /@keydown\.end\.prevent="focusItem\(-1\)"/)
  assert.match(SWITCH, /function choose\(code\) \{[\s\S]*?closeMenu\(true\)/)
})

test('语言反馈出口在抽屉脚注，并带上当前界面语言', () => {
  assert.match(NAVBAR, /class="drawer-note"/)
  assert.match(
    NAVBAR,
    /:to="\{ path: '\/support', query: \{ topic: 'language', from: locale \} \}"/
  )
  assert.match(NAVBAR, /t\('language\.feedbackTitle'\)/)
  assert.match(NAVBAR, /t\('language\.feedbackCta'\)/)
  // 组件自己不再画那张反馈卡，抽屉只有一条脚注
  assert.doesNotMatch(SWITCH, /class="lang-feedback"/)
})
