import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, readdirSync } from 'node:fs'
import { join, dirname, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

import { createPinia, setActivePinia } from 'pinia'

import { renderComponent, createPiniaWithState, createRenderEnv } from './render.mjs'
import {
  useThemeStore,
  THEME_MODES,
  THEME_SWITCH_CLASS,
  THEME_SWITCH_MS,
} from '../src/stores/theme.js'

/**
 * 导航栏 + 主题切换的「观感」契约
 *
 * 这一组用例守的是三件很容易被后续改动悄悄弄丢的事：
 *
 *   1. 头像右下角那颗在线呼吸灯 —— 它以前根本不存在，现在存在了，
 *      但「只在有身份时出现」「不撑动布局」「关掉动效时停住」都是易碎条件；
 *   2. 下拉里那行「账号资产」分组标题 —— 可见形态已经按设计删掉，
 *      不能因为某次「顺手恢复」又长回来；
 *   3. 换肤的过渡 —— 它必须是「瞬时类 + 只过渡颜色属性」，
 *      一旦有人图省事写成 `transition: all`，hover、展开、滚动收缩
 *      会一起被拖成动画，切换反而更慢（这正是本次要修的毛病）。
 *
 * 前四条用源码契约 + SSR 渲染断言，中间两条直接跑 store 的行为，
 * 最后几条读 CSS 声明块 —— 都是 `node:test` 与 `node:fs`，不引新依赖。
 */

const __dirname = dirname(fileURLToPath(import.meta.url))
const WEB_ROOT = join(__dirname, '..')
const SRC_DIR = join(WEB_ROOT, 'src')

// 统一成 LF 再比较：仓库里是 CRLF，按 `\n}\n` 切声明块会切不到
const read = (relPath) =>
  readFileSync(join(WEB_ROOT, relPath), 'utf8').replace(/\r\n/g, '\n')

const NAVBAR = read('src/components/Navbar.vue')
const THEME_SWITCH_VUE = read('src/components/ThemeSwitch.vue')
const THEME_STORE = read('src/stores/theme.js')
const GLOBAL_CSS = read('src/assets/styles/global.css')

/**
 * 本次改动触及的四个文件。
 *
 * `transition: all` 的全局禁令只施加在这四个文件上：`src/pages/tools/ShapeKit.vue`
 * 里还有一条作用在单个预览块上的 `transition: all 0.2s`，那是工具页的既有写法、
 * 不在本次授权范围内，也不在换肤链路上。
 */
const POLISHED_FILES = {
  'Navbar.vue': NAVBAR,
  'ThemeSwitch.vue': THEME_SWITCH_VUE,
  'theme.js': THEME_STORE,
  'global.css': GLOBAL_CSS,
}

/** 取 `startMark` 之后、`endMark` 之前的一段源码（找不到 endMark 时取到结尾） */
function between(text, startMark, endMark) {
  const start = text.indexOf(startMark)
  if (start < 0) return ''
  const end = text.indexOf(endMark, start + startMark.length)
  return text.slice(start, end < 0 ? undefined : end)
}

/** 在 src 下递归查找仍引用某个标记的文本文件（返回相对仓库根的路径） */
function scanSrc(pattern) {
  const hits = []
  const walk = (dir) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name)
      if (entry.isDirectory()) {
        walk(full)
        continue
      }
      if (!/\.(vue|css|js|mjs|html)$/.test(entry.name)) continue
      if (pattern.test(readFileSync(full, 'utf8'))) hits.push(relative(WEB_ROOT, full))
    }
  }
  walk(SRC_DIR)
  return hits
}

// ── ① 在线状态圆点：结构与渲染条件 ──────────────────────────
test('在线圆点挂在头像按钮上，条件来自身份而不是「已登录」', () => {
  const avatarAt = NAVBAR.indexOf('class="user-avatar-btn"')
  const dotAt = NAVBAR.indexOf('class="navbar-avatar-status"')
  const menuAt = NAVBAR.indexOf('id="user-menu"')

  assert.ok(avatarAt > -1, '顶栏应该有头像按钮（.user-avatar-btn）')
  assert.ok(dotAt > avatarAt, '圆点必须挂在头像按钮内部 —— 挂进 .u-avatar 会被 overflow:hidden 裁掉')
  assert.ok(menuAt > dotAt, '圆点属于头像，不该跑到下拉面板里')

  const dotTagStart = NAVBAR.lastIndexOf('<span', dotAt)
  assert.ok(dotTagStart > avatarAt, '圆点必须是 .user-avatar-btn 内部的 <span>')
  const dotTag = NAVBAR.slice(dotTagStart, NAVBAR.indexOf('></span>', dotAt))
  assert.match(dotTag, /v-if="hasIdentity"/, '渲染条件应是 hasIdentity（游客也算有身份）')
  assert.match(dotTag, /aria-hidden="true"/, '圆点是纯装饰，必须对读屏隐藏')
  assert.match(
    dotTag,
    /'navbar-avatar-status--guest': isGuest/,
    '游客的「游」徽标占着右下角，圆点要带让位修饰',
  )

  // 为什么不能用 userStore.isLoggedIn：它判的是 user_type === 'registered'，
  // 游客会被当成「未登录」。这条注释是给后来改代码的人看的，也一起守住。
  const dotNote = NAVBAR.slice(Math.max(0, dotAt - 900), dotAt)
  assert.match(dotNote, /isLoggedIn/, '圆点上方应说明为什么不直接用 isLoggedIn')

  assert.match(
    NAVBAR,
    /const hasIdentity = computed\(\(\) => Boolean\(userStore\.userId\)\)/,
    'hasIdentity 的定义变了，圆点的渲染条件也会跟着错',
  )
})

// ── ① 在线状态圆点：样式与呼吸动效 ──────────────────────────
test('在线圆点：9px 绿点 + 表面色描边，呼吸只动阴影与透明度', () => {
  const dotCss = between(NAVBAR, '.navbar-avatar-status {', '\n@keyframes')
  assert.ok(dotCss.length > 0, '找不到 .navbar-avatar-status 的样式规则')

  assert.match(dotCss, /width: 9px;/)
  assert.match(dotCss, /height: 9px;/)
  assert.match(dotCss, /background: var\(--ec-success\);/)
  assert.match(
    dotCss,
    /box-shadow: 0 0 0 2px var\(--ec-bg-surface\);/,
    '2px 表面色描边负责把圆点从头像上分离出来',
  )
  assert.match(dotCss, /position: absolute;/)
  assert.match(dotCss, /pointer-events: none;/, '圆点不能挡住头像的点击')
  assert.equal(/#[0-9a-fA-F]{3,8}\b/.test(dotCss), false, '组件样式只能用 --ec-* 令牌')
  assert.equal(/rgba?\(/.test(dotCss), false, '组件样式只能用 --ec-* 令牌')

  assert.match(dotCss, /animation: navbar-avatar-pulse 2s var\(--ec-ease-out\) infinite;/)

  const keyframes = between(NAVBAR, '@keyframes navbar-avatar-pulse', '\n}\n')
  assert.ok(keyframes.length > 0, '缺少 @keyframes navbar-avatar-pulse')
  assert.match(keyframes, /box-shadow:/)
  assert.match(keyframes, /opacity:/)
  assert.equal(
    /transform/.test(keyframes),
    false,
    '呼吸不能靠 transform: scale —— 那会把圆点算进布局、挤动导航栏',
  )

  // 关掉动效的兜底必须写在同一段样式里，否则「呼吸」会无视系统设置
  assert.match(
    NAVBAR,
    /@media \(prefers-reduced-motion: reduce\) \{\s*\.navbar-avatar-status::after \{\s*animation: none;/,
    '缺少 prefers-reduced-motion 的动画兜底',
  )
})

// ── ① 在线状态圆点：真实渲染（游客 / 注册 / 无身份） ──────────
const GUEST = {
  id: 9,
  uuid: 'uuid-guest',
  user_type: 'guest',
  nickname: '路过的访客',
  avatar_url: 'https://cdn.example.com/guest.png',
  created_at: '2026-10-01T00:00:00.000Z',
}

const REGISTERED = {
  id: 42,
  uuid: 'uuid-reg',
  user_type: 'registered',
  nickname: '星尘',
  avatar_url: '/uploads/avatars/u42-x.webp',
  created_at: '2026-01-01T00:00:00.000Z',
}

async function renderNavbar(userInfo) {
  const [pinia, env] = await Promise.all([
    createPiniaWithState({ user: { initialized: true, userInfo } }),
    createRenderEnv(),
  ])
  return renderComponent('/components/Navbar.vue', {
    plugins: [pinia, env.router],
    globalComponents: env.globalComponents,
  })
}

test('游客也显示在线圆点（isLoggedIn 会把游客判成未登录）', async () => {
  const html = await renderNavbar(GUEST)
  assert.match(html, /class="navbar-avatar-status navbar-avatar-status--guest"/)
  assert.ok(
    html.indexOf('class="navbar-avatar-status') > html.indexOf('class="user-avatar-btn"'),
    '渲染顺序上圆点应在头像按钮之后（参与绝对定位的基准是按钮）',
  )
})

test('注册用户显示在线圆点', async () => {
  const html = await renderNavbar(REGISTERED)
  assert.match(html, /class="navbar-avatar-status"/)
  assert.equal(html.includes('navbar-avatar-status--guest'), false, '注册用户没有「游」徽标，不需要让位修饰')
})

test('没有身份（登录按钮态）时不渲染在线圆点', async () => {
  const html = await renderNavbar({})
  assert.equal(html.includes('navbar-avatar-status'), false)
})

// ── ② 下拉分组标题 ────────────────────────────────────────
test('个人中心下拉：可见的分组标题已删除，组名只留给读屏', () => {
  assert.equal(
    NAVBAR.includes('dropdown-group-label'),
    false,
    'Navbar.vue 里不应再出现 dropdown-group-label',
  )
  assert.deepEqual(scanSrc(/dropdown-group-label/), [], 'src 里还有别处在用这个 class')

  // 分组标题删了，但 role="menu" 仍需要分组上下文：组名以视觉隐藏的形式保留
  assert.match(NAVBAR, /<p class="visually-hidden">账号资产<\/p>/)

  // 原来那行标题自带 12px 上内边距 + 4px 下内边距，删掉后首项不能直接贴线
  assert.match(NAVBAR, /class="u-dropdown-item user-menu-first-item"/)
  assert.match(
    NAVBAR,
    /\.user-menu-first-item \{\s*margin-top: calc\(var\(--space-unit\) \* 2\);/,
    '首项需要一个补回呼吸感的上间距',
  )
})

// ── ③ 主题切换：瞬时过渡类 ─────────────────────────────────
/**
 * 造一个足够 store 用的假 `<html>`。
 *
 * theme store 在 Node 里只碰三样东西：documentElement 的 classList、style、
 * setAttribute —— 不需要 jsdom；顺便把 matchMedia 固定成「未开启减弱动效」，
 * 让「挂类」这条路径必然被执行。
 */
function installFakeDom() {
  const classes = new Set()
  const attrs = new Map()

  const root = {
    classList: {
      add: (name) => classes.add(name),
      remove: (name) => classes.delete(name),
      contains: (name) => classes.has(name),
    },
    style: {},
    setAttribute(name, value) {
      attrs.set(name, value)
    },
    getAttribute(name) {
      return attrs.has(name) ? attrs.get(name) : null
    },
  }

  const previousDocument = Object.getOwnPropertyDescriptor(globalThis, 'document')
  const previousWindow = Object.getOwnPropertyDescriptor(globalThis, 'window')

  globalThis.document = { documentElement: root }
  globalThis.window = {
    matchMedia: () => ({ matches: false, addEventListener() {}, removeEventListener() {} }),
  }

  return {
    root,
    classes,
    attrs,
    restore() {
      if (previousDocument) Object.defineProperty(globalThis, 'document', previousDocument)
      else delete globalThis.document
      if (previousWindow) Object.defineProperty(globalThis, 'window', previousWindow)
      else delete globalThis.window
    },
  }
}

const wait = (ms) =>
  new Promise((resolve) => {
    setTimeout(resolve, ms)
  })

test('切主题：给 <html> 挂上瞬时类，约 260ms 后摘掉', async () => {
  const dom = installFakeDom()
  try {
    setActivePinia(createPinia())
    const store = useThemeStore()

    store.setMode('dark')
    assert.equal(dom.classes.has(THEME_SWITCH_CLASS), true, '切换瞬间必须有过渡类')
    assert.equal(dom.root.getAttribute('data-theme'), 'dark', '属性仍要写下去（过渡靠属性选择器生效）')
    assert.equal(dom.root.getAttribute('data-theme-mode'), 'dark')

    await wait(THEME_SWITCH_MS + 80)
    assert.equal(dom.classes.has(THEME_SWITCH_CLASS), false, '过渡结束后必须摘掉，否则整站都被拖慢')
    assert.equal(dom.root.getAttribute('data-theme'), 'dark', '摘类不能把主题一起摘掉')
  } finally {
    dom.restore()
  }
})

test('切主题：快速连点重置收尾定时器，不会半程硬切', async () => {
  const dom = installFakeDom()
  try {
    setActivePinia(createPinia())
    const store = useThemeStore()

    store.setMode('dark')
    await wait(150)
    store.setMode('auto')
    await wait(120) // 距第一次 270ms：旧定时器若没被清掉，这一刻类已经被摘走
    assert.equal(dom.classes.has(THEME_SWITCH_CLASS), true, '第二次切换应重新计时')

    await wait(THEME_SWITCH_MS)
    assert.equal(dom.classes.has(THEME_SWITCH_CLASS), false)
  } finally {
    dom.restore()
  }
})

test('瞬时类只过渡颜色相关属性，且四个文件都不写 transition: all', () => {
  const block = between(GLOBAL_CSS, 'html.is-theme-switching body *::after {', '}')
  assert.ok(block.length > 0, 'global.css 里找不到瞬时类的声明块')

  const properties = block.match(/transition-property:\s*([^;]+);/)
  assert.ok(properties, '瞬时类必须显式声明 transition-property')
  const list = properties[1].split(',').map((item) => item.trim())
  assert.deepEqual(list, ['background-color', 'border-color', 'color', 'fill', 'stroke'])
  assert.equal(list.includes('all'), false, 'transition-property 不能是 all')
  assert.equal(list.includes('box-shadow'), false, 'box-shadow 过渡正是「切换慢半拍」的来源')
  assert.equal(list.includes('transform'), false, 'transform 过渡会让滑块/抽屉抢跑')

  assert.match(block, /transition-duration: 200ms;/)
  assert.match(block, /transition-timing-function: var\(--ec-ease-out\);/)

  for (const [name, text] of Object.entries(POLISHED_FILES)) {
    assert.equal(/transition:\s*all/.test(text), false, `${name} 里不应出现 transition: all`)
  }

  // 系统开了「减弱动态效果」：颜色一步到位
  const reduced = between(GLOBAL_CSS, '@media (prefers-reduced-motion: reduce)', '\n}\n')
  assert.match(reduced, /html\.is-theme-switching body \*::after\s*\{\s*transition: none;/)

  // 挂/摘类只能来自 store 这一处，否则两个地方抢着摘会互相打架
  assert.match(THEME_STORE, /classList\.add\(THEME_SWITCH_CLASS\)/)
  assert.match(THEME_STORE, /classList\.remove\(THEME_SWITCH_CLASS\)/)
  assert.match(THEME_STORE, /setTimeout\(\(\) => \{[\s\S]{0,160}THEME_SWITCH_MS\)/)
})

// ── ③ theme-switch：三档 + 无障碍 + 滑块 ────────────────────
test('theme-switch：三档、aria-pressed 语义与 180ms 滑块都在', () => {
  assert.deepEqual(THEME_MODES, ['light', 'dark', 'auto'])

  assert.match(THEME_SWITCH_VUE, /class="theme-switch"/)
  assert.match(THEME_SWITCH_VUE, /role="group"/)
  assert.match(THEME_SWITCH_VUE, /v-for="item in THEME_SWITCH\.modes"/)
  assert.match(THEME_SWITCH_VUE, /:data-set-theme="item\.mode"/)
  assert.match(THEME_SWITCH_VUE, /:aria-pressed="themeStore\.mode === item\.mode"/)
  assert.match(THEME_SWITCH_VUE, /:aria-label="item\.label"/)
  assert.match(THEME_SWITCH_VUE, /:title="item\.label"/)
  assert.match(THEME_SWITCH_VUE, /@click="themeStore\.setMode\(item\.mode\)"/)
  assert.equal(/<select/.test(THEME_SWITCH_VUE), false, '三档控件不能退化成下拉框')

  // 滑块：位移 150–200ms，且不接管颜色（颜色由瞬时类统一管）
  const slider = between(THEME_SWITCH_VUE, '.theme-switch::before {', '}')
  assert.ok(slider.length > 0, '找不到滑块样式')
  assert.match(slider, /transition: transform 180ms var\(--ec-ease-out\);/)
  assert.equal(/background-color|color\b/.test(slider.replace(/background: var\(--ec-bg-surface\)/, '')), false)

  assert.match(
    THEME_SWITCH_VUE,
    /html\[data-theme-mode='dark'\] \.theme-switch::before \{\s*transform: translateX\(calc\(100% \+ 2px\)\);/,
  )
  assert.match(
    THEME_SWITCH_VUE,
    /html\[data-theme-mode='auto'\] \.theme-switch::before \{\s*transform: translateX\(calc\(200% \+ 4px\)\);/,
  )
  assert.match(THEME_SWITCH_VUE, /@media \(prefers-reduced-motion: reduce\) \{\s*\.theme-switch::before \{\s*transition: none;/)

  const styleBlock = between(THEME_SWITCH_VUE, '<style scoped>', '</style>')
  assert.equal(/#[0-9a-fA-F]{3,8}\b/.test(styleBlock), false, '组件样式只能用 --ec-* 令牌')
  assert.equal(/rgba?\(/.test(styleBlock), false, '组件样式只能用 --ec-* 令牌')
})
