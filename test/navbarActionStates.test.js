import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

/**
 * 4.26.0 手机顶栏的三个状态缺陷
 *
 * ① 明暗切换的滑块与格子错位：`ui-kit-nav.css` 把窄屏的 `.theme-switch` /
 *    `.theme-switch__btn` 写在 §5「响应式」，而基础尺寸在 §10 —— 同特异度下
 *    后者胜出，窄屏规则整段失效。槽内边距仍是 2px、格子仍是 28px，而组件里
 *    那块滑块按 0.9 缩放成 25.2px：滑块比格子窄 2.8px，每往右一格再偏 2.8px。
 * ② 汉堡 → × 的两臂各移 0.53 / 0.52 单位（手调值），与 gap + 线高算出的
 *    0.525 不等，交叉点有一丝错位；顺带身份面板展开时箭头不翻转。
 * ③ 触屏上 `:hover` 会留在被点过的元素上（直到点别处）：点搜索跳到结果页后
 *    放大镜顶着一块底色、「×」收起后按钮仍是高亮态 —— 看起来像「还选中着」。
 *
 * 这三条都用「读源码 + 断言结构」钉住，因为它们的触发条件（真机触摸、
 * 断点下的层叠顺序）在 jsdom 里都复现不出来。
 */
const __dirname = dirname(fileURLToPath(import.meta.url))
const WEB_ROOT = join(__dirname, '..')
const read = (relPath) => readFileSync(join(WEB_ROOT, relPath), 'utf8')

const NAVBAR = read('src/components/Navbar.vue')
const UI_KIT_NAV = read('src/assets/styles/ui-kit-nav.css')

/** 把源码里的空白压平，方便跨行断言 */
const flat = (text) => text.replace(/\s+/g, ' ')

test('明暗切换：窄屏规则用叠类名压过靠后的基础尺寸（层叠顺序）', () => {
  // 这个文件里「§5 响应式」排在「§10 明暗切换」之前：同特异度时后者胜出。
  // 所以窄屏那三条必须提高特异度，否则整段失效（4.25.2 及以前就是这样）。
  assert.match(flat(UI_KIT_NAV), /\.theme-switch\.theme-switch \{ padding: 1px; \}/)
  assert.match(
    flat(UI_KIT_NAV),
    /\.theme-switch \.theme-switch__btn \{ position: relative; width: calc\(var\(--ec-control-h-sm\) \* var\(--mobile-control-scale\)\); height: calc\(var\(--ec-control-h-sm\) \* var\(--mobile-control-scale\)\); \}/,
  )
  assert.match(
    flat(UI_KIT_NAV),
    /\.theme-switch \.theme-switch__btn::after \{ content: ''; position: absolute; inset: -10px -1px; \}/,
  )

  // 同一文件里只允许一个 767 块（designTokens 门禁也这么要求），因此不能靠「再加一段」修
  const blocks = UI_KIT_NAV.match(/^@media \(max-width: 767px\)/gm) || []
  assert.equal(blocks.length, 1, '窄屏块应只有一个，规则要写在里面')
})

test('明暗切换：滑块几何与格子同一套数值（组件里的注释即契约）', () => {
  const THEME_SWITCH = read('src/components/ThemeSwitch.vue')
  // 滑块宽度 = 格子宽度（同一个令牌 × 同一个缩放系数）
  assert.match(
    flat(THEME_SWITCH),
    /width: calc\(var\(--ec-control-h-sm\) \* var\(--mobile-control-scale\)\)/,
  )
  // 内缩与槽内边距同步：桌面 2px / 窄屏 1px
  assert.match(flat(THEME_SWITCH), /\.theme-switch::before \{[\s\S]*?left: 2px;/)
  assert.match(flat(THEME_SWITCH), /left: 1px;/)
})

test('汉堡 → ×：两臂位移由 gap 与线高推出，而不是手调值', () => {
  // 间距 0.75 + 线高 0.3 → 各移 0.525 单位
  assert.match(
    flat(NAVBAR),
    /\.menu-toggle\.active \.menu-toggle-bars i:nth-child\(1\) \{ transform: translateY\(calc\(var\(--space-unit\) \* 0\.525\)\) rotate\(45deg\); \}/,
  )
  assert.match(
    flat(NAVBAR),
    /\.menu-toggle\.active \.menu-toggle-bars i:nth-child\(2\) \{ transform: translateY\(calc\(var\(--space-unit\) \* -0\.525\)\) rotate\(-45deg\); \}/,
  )
  // 旧的手调值不得残留
  assert.doesNotMatch(NAVBAR, /calc\(var\(--space-unit\) \* 0\.53\)/)
  assert.doesNotMatch(NAVBAR, /calc\(var\(--space-unit\) \* -0\.52\)/)
})

test('身份面板展开时下拉箭头翻转（面板开了要有「可收起」的回读）', () => {
  assert.match(NAVBAR, /:aria-expanded="userMenuOpen"/)
  assert.match(flat(NAVBAR), /\.navbar-identity-caret \{[\s\S]*?transition: transform var\(--transition-interactive\); \}/)
  assert.match(
    flat(NAVBAR),
    /\.user-avatar-btn\[aria-expanded='true'\] \.navbar-identity-caret \{ transform: rotate\(180deg\); \}/,
  )
})

test('触屏不留 :hover 残影：悬停底色只在真有悬停的设备上生效', () => {
  // 悬停态被包进能力查询
  assert.match(flat(NAVBAR), /@media \(hover: hover\) and \(pointer: fine\) \{ \.navbar-action\.navbar-action:hover \{/)
  // 粗指针（手机）显式清掉背景与颜色，压过 EC 的 .ec-icon-btn:hover
  assert.match(
    flat(NAVBAR),
    /@media \(hover: none\), \(pointer: coarse\) \{ \.navbar-action\.navbar-action:hover, \.navbar-action\.navbar-action:focus:not\(:focus-visible\) \{ background: transparent; color: var\(--text-secondary\); \}/,
  )
  // 系统高亮块与 300ms 点击延迟一并去掉
  assert.match(NAVBAR, /-webkit-tap-highlight-color: transparent;/)
  assert.match(NAVBAR, /touch-action: manipulation;/)
  // 键盘用户仍要看得见焦点：:focus-visible 独立成组
  assert.match(flat(NAVBAR), /\.navbar-action:focus-visible \{ background: var\(--bg-soft\); color: var\(--text-primary\); \}/)
})
