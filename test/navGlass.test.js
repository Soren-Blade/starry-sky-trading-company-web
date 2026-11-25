import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

/**
 * 4.8.0 导航玻璃 + 移动端去重契约
 *
 * 两件事都不能靠肉眼：「玻璃」必须真的落在常驻导航上（顶栏 / 底部 Tab Bar），
 * 且要有不支持 backdrop-filter 时的实底回退；移动端顶栏必须与底部 Tab Bar
 * 去重 —— 购物车、会员已经由底部承担，不能两边各出现一次。
 */

const __dirname = dirname(fileURLToPath(import.meta.url))
const WEB_ROOT = join(__dirname, '..')

const read = (relPath) =>
  readFileSync(join(WEB_ROOT, relPath), 'utf8').replace(/\r\n/g, '\n')

const VARIABLES = read('src/assets/styles/variables.css')
const NAVBAR = read('src/components/Navbar.vue')
const BOTTOM_NAV = read('src/components/BottomNav.vue')

test('玻璃令牌只在导航层定义，且带模糊、饱和与顶部 specular', () => {
  assert.match(VARIABLES, /--glass-nav-bg:\s*color-mix\(in srgb, var\(--ec-bg-surface\) 66%, transparent\)/)
  assert.match(VARIABLES, /--glass-nav-bg-strong:\s*color-mix\(in srgb, var\(--ec-bg-surface\) 84%, transparent\)/)
  assert.match(VARIABLES, /--glass-nav-specular:\s*linear-gradient\(/)
  assert.match(VARIABLES, /--glass-nav-highlight:\s*inset 0 1px 0\s*color-mix\(in srgb, var\(--ec-bg-surface\) 82%, transparent\)/)
  assert.match(VARIABLES, /--glass-nav-border:\s*color-mix\(in srgb, var\(--ec-border-subtle\) 70%, transparent\)/)
  assert.match(VARIABLES, /--glass-nav-blur:\s*24px/)
  assert.match(VARIABLES, /--glass-nav-saturate:\s*190%/)
})

/**
 * 4.11.0 Liquid Glass 光学四件套
 *
 * 4.10 的玻璃只有「半透明底色 + 模糊」，在白底页面上等于一块白。这一版补的是
 * 光（specular + rim）、深（lift）、色（tint）三样，并让滚动时三者一起变化。
 * 这里锁住「三样都在、且都不是随手写的十六进制」——令牌必须从 --ec-* 派生，
 * 换明暗主题时才不会跳出第二套颜色。
 */
test('玻璃新增色/光/影三层令牌，且全部从设计令牌派生', () => {
  assert.match(
    VARIABLES,
    /--glass-nav-tint:\s*color-mix\(in srgb, var\(--accent\) 7%, transparent\)/
  )
  assert.match(
    VARIABLES,
    /--glass-nav-tint-strong:\s*color-mix\(in srgb, var\(--accent\) 10%, transparent\)/
  )
  assert.match(
    VARIABLES,
    /--glass-nav-rim:\s*inset 0 0 0 1px color-mix\(in srgb, var\(--ec-bg-surface\) 32%, transparent\)/
  )
  assert.match(VARIABLES, /--glass-nav-lift:\s*var\(--ec-shadow-lg\)/)
  assert.match(VARIABLES, /--glass-nav-lift-strong:\s*var\(--ec-shadow-xl\)/)
  assert.match(VARIABLES, /--glass-nav-blur-strong:\s*32px/)
  // 滚动后的投影改用玻璃专用投影，不再复用通用 --ec-shadow-sm
  assert.match(VARIABLES, /--nav-scrolled-shadow:\s*var\(--glass-nav-lift\)/)
})

test('顶栏是三层玻璃表面，滚动后加深，且有不支持模糊时的实底回退', () => {
  assert.match(
    NAVBAR,
    /\.navbar::before \{[\s\S]*?background: var\(--glass-nav-specular\), var\(--glass-nav-tint\), var\(--glass-nav-bg\);[\s\S]*?box-shadow: var\(--glass-nav-highlight\), var\(--glass-nav-rim\);[\s\S]*?-webkit-backdrop-filter: blur\(var\(--glass-nav-blur\)\) saturate\(var\(--glass-nav-saturate\)\);[\s\S]*?backdrop-filter: blur\(var\(--glass-nav-blur\)\) saturate\(var\(--glass-nav-saturate\)\);/
  )
  assert.match(
    NAVBAR,
    /\.navbar-scrolled::before \{[\s\S]*?background: var\(--glass-nav-specular\), var\(--glass-nav-tint-strong\), var\(--glass-nav-bg-strong\);[\s\S]?/
  )
  // 滚动态同时加深模糊：三件事一起变，用户读到的是「玻璃变厚」
  assert.match(
    NAVBAR,
    /\.navbar-scrolled::before \{[\s\S]*?blur\(var\(--glass-nav-blur-strong\)\)/
  )
  assert.match(NAVBAR, /@supports not \(\(backdrop-filter: blur\(1px\)\) or \(-webkit-backdrop-filter: blur\(1px\)\)\)/)
  assert.match(NAVBAR, /@media \(prefers-reduced-transparency: reduce\)/)
})

test('手机端玻璃把模糊收一档换帧率，且用令牌覆盖而不是复制规则', () => {
  assert.match(
    NAVBAR,
    /@media \(max-width: 767px\) \{[\s\S]*?\.navbar \{\s*--glass-nav-blur: 18px;\s*--glass-nav-blur-strong: 24px;\s*\}/
  )
})


test('移动端顶栏不再出现购物车 / 会员，它们交给底部 Tab Bar', () => {
  assert.match(NAVBAR, /class="u-icon-btn navbar-cart hide-below-768"/)
  assert.match(NAVBAR, /class="u-icon-btn navbar-member hide-below-768"/)
  // 消息入口保留：它不在底部 Tab Bar 里
  assert.match(NAVBAR, /class="u-icon-btn navbar-mail"/)
})

test('底部悬浮 Tab Bar 使用同一套 Liquid Glass 令牌与回退', () => {
  assert.match(
    BOTTOM_NAV,
    /background: var\(--glass-nav-specular\), var\(--glass-nav-tint\), var\(--glass-nav-bg-strong\);[\s\S]*?border: 1px solid var\(--glass-nav-border\);[\s\S]*?box-shadow: var\(--glass-nav-highlight\), var\(--glass-nav-rim\), var\(--glass-nav-lift-strong\);[\s\S]*?backdrop-filter: blur\(var\(--glass-nav-blur\)\) saturate\(var\(--glass-nav-saturate\)\);/
  )
  assert.match(BOTTOM_NAV, /@supports not \(\(backdrop-filter: blur\(1px\)\) or \(-webkit-backdrop-filter: blur\(1px\)\)\)/)
  assert.match(BOTTOM_NAV, /@media \(prefers-reduced-transparency: reduce\)/)
})

test('选中项是玻璃上的一枚凸起：上缘补一道内高光', () => {
  assert.match(
    BOTTOM_NAV,
    /\.bottom-nav-item\.is-active \{[\s\S]*?box-shadow: inset 0 1px 0 color-mix\(in srgb, var\(--ec-bg-surface\) 72%, transparent\);/
  )
})

test('我的服务收成一张分组卡，不再四张独立卡片', () => {
  const PROFILE = read('src/pages/Profile.vue')
  assert.match(PROFILE, /class="ui-card profile-services"/)
  assert.ok(!PROFILE.includes('class="ui-card profile-service"'))
  assert.match(PROFILE, /\.profile-service \{[\s\S]*?border-left: 1px solid var\(--divider\)/)
})
