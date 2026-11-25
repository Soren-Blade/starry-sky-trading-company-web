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
const SEMANTIC = read('src/assets/ec/tokens/semantic.css')
const THEME_DARK = read('src/assets/ec/tokens/theme-dark.css')
// 多行声明的断言先压平空白，省得为换行位置维护正则
const flat = (text) => text.replace(/\s+/g, ' ')

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

test('手机端三个落点共用一个动作盒：36/40 视觉盒 + 44 命中，头像缩成胶囊里的 24', () => {
  // 4.20.0：搜索 / 身份 / 菜单改成同一个 .navbar-action 语法
  assert.match(NAVBAR, /\.navbar-action \{[\s\S]*?width: 36px;[\s\S]*?height: 36px;/)
  assert.match(NAVBAR, /\.navbar-action::after \{\s*content: '';[\s\S]*?inset: -4px;/)
  assert.match(NAVBAR, /\.navbar-action \{[\s\S]*?width: 40px;[\s\S]*?height: 40px;/)
  // 三个按钮都挂了同一个类
  assert.match(NAVBAR, /class="ec-icon-btn navbar-search-trigger navbar-action"/)
  assert.match(NAVBAR, /class="user-avatar-btn navbar-action navbar-identity"/)
  assert.match(NAVBAR, /class="u-icon-btn menu-toggle show-mobile navbar-action"/)
  // 头像不再是一枚裸圆，而是「头像 + 箭头」的胶囊
  assert.match(NAVBAR, /class="navbar-identity-caret"/)
  assert.match(NAVBAR, /--navbar-avatar-size: 24px;/)
  assert.match(
    NAVBAR,
    /\.user-avatar-btn \.u-avatar \{[\s\S]*?box-shadow: 0 0 0 1\.5px var\(--ec-bg-surface\);/
  )
  assert.match(NAVBAR, /\.navbar-avatar-status \{\s*right: -1px;\s*bottom: -1px;\s*width: 7px;\s*height: 7px;/)
})


test('移动端顶栏不再出现购物车 / 会员，它们交给底部 Tab Bar', () => {
  assert.match(NAVBAR, /class="u-icon-btn navbar-cart hide-below-768"/)
  assert.match(NAVBAR, /class="u-icon-btn navbar-member hide-below-768"/)
  // 消息入口保留在顶栏（桌面），4.18.0 起窄屏由抽屉接管，故只钉前缀
  assert.match(NAVBAR, /class="u-icon-btn navbar-mail[^"]*"/)
})

test('手机顶栏三个落点命中区同高 44：汉堡按钮补齐，不再只有 32', () => {
  assert.match(NAVBAR, /\.menu-toggle \{[\s\S]*?min-width: var\(--ec-control-h-md\);[\s\S]*?min-height: var\(--ec-control-h-md\);/)
})

test('底部悬浮 Tab Bar 使用同一套 Liquid Glass 令牌与回退', () => {
  // 4.17.0：单独一档底色（比顶栏薄）、冠光 + specular + 地板光 + 洗染四层、
  // 模糊换更轻的浮空档 20px（32px 会把后面的内容糊成色块）
  assert.match(
    flat(BOTTOM_NAV),
    /background-color: var\(--glass-nav-bg-float\);[\s\S]*?background-image: var\(--glass-nav-sheen\), var\(--glass-nav-specular\), var\(--glass-nav-floor\), var\(--glass-nav-wash\);[\s\S]*?box-shadow: var\(--glass-nav-highlight\), var\(--glass-nav-rim\), var\(--glass-nav-lift-strong\), var\(--glass-nav-glow\);[\s\S]*?backdrop-filter: blur\(var\(--glass-nav-blur-float\)\) saturate\(var\(--glass-nav-saturate\)\);/
  )
  assert.match(BOTTOM_NAV, /@supports not \(\(backdrop-filter: blur\(1px\)\) or \(-webkit-backdrop-filter: blur\(1px\)\)\)/)
  assert.match(BOTTOM_NAV, /@media \(prefers-reduced-transparency: reduce\)/)
})

test('玻璃要有光：冠光 + 外发光，且浮空块用更轻的模糊', () => {
  // 冠光是面状高光（径向），specular 只是棱线：两者叠起来才像「在发光」
  assert.match(
    flat(VARIABLES),
    /--glass-nav-sheen: radial-gradient\( 130% 140% at 50% -35%, color-mix\(in srgb, var\(--ec-highlight-soft\) 72%, transparent\) 0%, transparent 62% \)/
  )
  // 外发光用品牌色：白在黑底像雾、黑在白底像脏，只有品牌色两端都成立
  assert.match(VARIABLES, /--glass-nav-glow:[\s\S]*?color-mix\(in srgb, var\(--accent\) 34%, transparent\)/)
  assert.match(VARIABLES, /--glass-nav-blur-float: 20px/)
})

test('地板光用会随主题翻转的高光膜，标签用一级文字在玻璃上保读', () => {
  // 暗色下 --ec-bg-surface 是深色，地板光若用它就会变成一道暗边
  assert.match(VARIABLES, /--glass-nav-floor: linear-gradient\(0deg, var\(--ec-highlight-soft\) 0%, transparent 62%\)/)
  assert.match(SEMANTIC, /--ec-highlight-soft: rgba\(255, 255, 255, \.55\)/)
  assert.match(THEME_DARK, /--ec-highlight-soft: rgba\(255, 255, 255, \.09\)/)
  // 半透明底上不再用三级/二级文字
  assert.match(BOTTOM_NAV, /\.bottom-nav-item \{[\s\S]*?color: var\(--text-primary\);/)
  // 悬浮栏比顶栏更薄：单独一档底色令牌
  assert.match(VARIABLES, /--glass-nav-bg-float: color-mix\(in srgb, var\(--ec-bg-surface\) 56%, transparent\)/)
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
