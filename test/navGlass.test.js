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
test('玻璃的色/光/影三层令牌，且全部从设计令牌派生', () => {
  // 品牌洗染是「图层」而不是裸颜色：background 简写里中间层放颜色会让整条声明作废
  assert.match(
    VARIABLES,
    /--glass-nav-wash:\s*linear-gradient\(\s*color-mix\(in srgb, var\(--accent\) 7%, transparent\),\s*color-mix\(in srgb, var\(--accent\) 7%, transparent\)\s*\)/
  )
  assert.match(
    VARIABLES,
    /--glass-nav-wash-strong:\s*linear-gradient\(\s*color-mix\(in srgb, var\(--accent\) 10%, transparent\),\s*color-mix\(in srgb, var\(--accent\) 10%, transparent\)\s*\)/
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

test('顶栏的玻璃表面：底色与图层分开写，滚动后加深，且有不支持模糊时的实底回退', () => {
  // 4.12.0：background 简写里只有最后一层能放颜色，中间层放颜色会让整条声明作废
  // （4.10–4.11 的玻璃因此一直没有底色）。所以必须 background-color + background-image。
  assert.match(
    NAVBAR,
    /\.navbar::before \{[\s\S]*?background-color: var\(--glass-nav-bg\);[\s\S]*?background-image: var\(--glass-nav-specular\), var\(--glass-nav-wash\);[\s\S]*?box-shadow: var\(--glass-nav-highlight\), var\(--glass-nav-rim\);[\s\S]*?backdrop-filter: blur\(var\(--glass-nav-blur\)\) saturate\(var\(--glass-nav-saturate\)\);/
  )
  assert.match(
    NAVBAR,
    /\.navbar-scrolled::before \{[\s\S]*?background-color: var\(--glass-nav-bg-strong\);[\s\S]*?background-image: var\(--glass-nav-specular\), var\(--glass-nav-wash-strong\);/
  )
  // 洗染是「图层」而不是裸颜色（令牌层的措辞见上一个测试）
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
    /@media \(max-width: 767px\) \{[\s\S]*?\.navbar \{\s*--glass-nav-blur: 18px;\s*--glass-nav-blur-strong: 24px;/
  )
})

test('手机端头像收到 32px，命中区仍由伪元素补到 44', () => {
  assert.match(NAVBAR, /--navbar-avatar-size: 32px;/)
  assert.match(
    NAVBAR,
    /\.user-avatar-btn::before \{\s*content: '';\s*position: absolute;\s*inset: -6px;/
  )
  // 视觉尺寸跟随令牌，状态点按比例收到 5px
  assert.match(NAVBAR, /\.user-avatar-btn \.u-avatar \{[\s\S]*?width: var\(--navbar-avatar-size\);/)
  assert.match(NAVBAR, /\.navbar-avatar-status \{\s*width: 5px;\s*height: 5px;/)
})


test('移动端顶栏不再出现购物车 / 会员，它们交给底部 Tab Bar', () => {
  assert.match(NAVBAR, /class="u-icon-btn navbar-cart hide-below-768"/)
  assert.match(NAVBAR, /class="u-icon-btn navbar-member hide-below-768"/)
  // 消息入口保留：它不在底部 Tab Bar 里
  assert.match(NAVBAR, /class="u-icon-btn navbar-mail"/)
})

test('底部悬浮 Tab Bar 使用同一套 Liquid Glass 令牌与回退', () => {
  // 4.13.0：底色降到 66%（与顶栏常态同档）、模糊换 32px 档、并加一层地板光
  assert.match(
    BOTTOM_NAV,
    /background-color: var\(--glass-nav-bg\);[\s\S]*?background-image: var\(--glass-nav-specular\), var\(--glass-nav-floor\), var\(--glass-nav-wash\);[\s\S]*?border: 1px solid var\(--glass-nav-border\);[\s\S]*?box-shadow: var\(--glass-nav-highlight\), var\(--glass-nav-rim\), var\(--glass-nav-lift-strong\);[\s\S]*?backdrop-filter: blur\(var\(--glass-nav-blur-strong\)\) saturate\(var\(--glass-nav-saturate\)\);/
  )
  assert.match(BOTTOM_NAV, /@supports not \(\(backdrop-filter: blur\(1px\)\) or \(-webkit-backdrop-filter: blur\(1px\)\)\)/)
  assert.match(BOTTOM_NAV, /@media \(prefers-reduced-transparency: reduce\)/)
})

test('地板光是一层渐变图层，标签用二级文字在玻璃上保读', () => {
  assert.match(VARIABLES, /--glass-nav-floor: linear-gradient\([\s\S]*?44%, transparent\)/)
  // 半透明底上不再用三级文字（暗色商品图上只有 2.4:1）
  assert.match(BOTTOM_NAV, /\.bottom-nav-item \{[\s\S]*?color: var\(--text-secondary\);/)
})

test('选中态是一枚共享胶囊：滑动 + 软尾 + 图标上浮', () => {
  // 胶囊按 --nav-index 平移，宽度固定 1/5（格位无间隙才不累积错位）
  assert.match(
    BOTTOM_NAV,
    /\.bottom-nav-thumb \{[\s\S]*?width: calc\(\(100% - 10px\) \/ 5\);[\s\S]*?transform: translateX\(calc\(var\(--nav-index, 0\) \* 100%\)\);[\s\S]*?transition: transform 320ms/
  )
  // 软尾慢 240ms，用更缓的曲线追上来
  assert.match(
    BOTTOM_NAV,
    /\.bottom-nav-flow \{[\s\S]*?filter: blur\(7px\);[\s\S]*?transition: transform 560ms/
  )
  // 指示条跟着胶囊，不再由每项各长一条
  assert.match(BOTTOM_NAV, /\.bottom-nav-thumb::after \{[\s\S]*?background: var\(--accent\);[\s\S]*?transform: translateX\(-50%\);/)
  assert.ok(!BOTTOM_NAV.includes('.bottom-nav-item.is-active::before'))
  assert.ok(!/\.bottom-nav-item\.is-active \{[^}]*background/.test(BOTTOM_NAV))
  // 图标上浮是「位移 + 形状」提示，不只依赖颜色
  assert.match(
    BOTTOM_NAV,
    /\.bottom-nav-item\.is-active \.bottom-nav-icon \{\s*transform: translateY\(-1px\) scale\(1\.06\);/
  )
  // 减弱动效时胶囊一帧到位，软尾直接不画
  assert.match(
    BOTTOM_NAV,
    /@media \(prefers-reduced-motion: reduce\) \{[\s\S]*?\.bottom-nav-thumb,[\s\S]*?transition: none;[\s\S]*?\.bottom-nav-flow \{\s*display: none;/
  )
})

test('我的服务收成一张分组卡，不再四张独立卡片', () => {
  const PROFILE = read('src/pages/Profile.vue')
  assert.match(PROFILE, /class="ui-card profile-services"/)
  assert.ok(!PROFILE.includes('class="ui-card profile-service"'))
  assert.match(PROFILE, /\.profile-service \{[\s\S]*?border-left: 1px solid var\(--divider\)/)
})
