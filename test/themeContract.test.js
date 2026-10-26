import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { installStorageStub, loadAppModule } from './setup.js'

/**
 * EC 主题契约
 * ============================================================================
 *
 * 本站视觉完全由 EC Design System 提供，主题只有**一维**：明 / 暗 / 跟随系统。
 * 旧版的「五套风格矩阵 + 单项微调」已整体移除（`src/theme/` 目录不再存在）。
 *
 * 这份文件守住五类不变量：
 *   1. 主题状态机 —— 三档、写属性、持久化、auto 跟随系统、脏数据回落；
 *   2. 控件契约 —— ThemeSwitch 的结构必须能被 EC 的行为层（js/ec.js）识别；
 *   3. 令牌唯一来源 —— 页面与组件不得写色值，也不得覆写 `--ec-*`；
 *   4. 暗色覆写完整 —— 六组语义角色必须都有暗色值；
 *   5. 对比度 —— 承字面（按钮底）必须真的能压白字/深字。
 *
 * 第 5 类是本设计系统存在的理由：原稿把品牌渐变直接当按钮底，cyan 端白字
 * 只有 1.81:1。这条缺陷上线不报错，只在弱视用户与截图分享时暴露，
 * 所以必须用可复算的公式钉住，而不是靠肉眼。
 */

const WEB_ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const SRC = path.join(WEB_ROOT, 'src')
const EC = path.join(SRC, 'assets', 'ec')

const read = (p) => fs.readFileSync(p, 'utf8')
const rel = (file) => path.relative(WEB_ROOT, file).replace(/\\/g, '/')
const exists = (p) => fs.existsSync(p)

/** 去掉 CSS 注释，避免注释里的示例值被当成真实声明 */
const stripCss = (text) => text.replace(/\/\*[\s\S]*?\*\//g, '')
/** 去掉 HTML 注释 */
const stripHtml = (text) => text.replace(/<!--[\s\S]*?-->/g, '')

/** 递归列出 src 下的样式相关文件 */
function styleFiles() {
  const out = []
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name)
      if (entry.isDirectory()) walk(full)
      else if (/\.(vue|css)$/.test(entry.name)) out.push(full)
    }
  }
  walk(SRC)
  return out
}

/** 取 .vue 的 <style> 段；纯 css 返回原文 */
function stylePartsOf(file, text) {
  if (file.endsWith('.vue')) {
    return [...text.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)].map((m) => m[1])
  }
  return [text]
}

// ── 主题状态机 ─────────────────────────────────────────────────

/**
 * 自建 DOM 桩（**在原桩上就地增强，不整体替换**）。
 *
 * `test/setup.js` 的 installDomStub 只给 documentElement 一个空 style，
 * 没有 setAttribute —— 而主题 store 的职责就是「往 <html> 写属性」，
 * 用那个桩会让 apply() 静默走「能力检测失败」分支，测试全部假通过。
 *
 * 为什么不 new 一个干净对象：测试进程是共享的（`--test-isolation=none`），
 * 整体替换 `globalThis.document` 会把 setup 里准备好的 body / createElement
 * 一起抹掉，后面所有用例都会在 `document.body.style` 上炸。
 */
function installThemeDom({ prefersDark = false } = {}) {
  const doc = (globalThis.document ??= {})
  const root = (doc.documentElement ??= {})
  const attrs = new Map()

  root.style = root.style || {}
  root.setAttribute = (name, value) => attrs.set(name, String(value))
  root.getAttribute = (name) => (attrs.has(name) ? attrs.get(name) : null)

  const win = (globalThis.window ??= {})
  win.matchMedia = () => ({
    matches: prefersDark,
    addEventListener() {},
    removeEventListener() {},
  })

  return { root, attrs }
}

/** 每次用例都拿一份新的 pinia，避免 store 单例在用例间串状态 */
async function freshStore() {
  const { createPinia, setActivePinia } = await import('pinia')
  setActivePinia(createPinia())
  const { useThemeStore } = await loadAppModule('/stores/theme.js')
  return useThemeStore()
}

test('主题只有三档：light / dark / auto，顺序即控件顺序', async () => {
  installThemeDom()
  installStorageStub()
  const mod = await loadAppModule('/stores/theme.js')
  assert.deepEqual(mod.THEME_MODES, ['light', 'dark', 'auto'])
})

test('默认浅色：init() 后 <html> 上同时有 data-theme 与 data-theme-mode', async () => {
  installThemeDom()
  installStorageStub()
  const store = await freshStore()
  store.init()
  assert.equal(document.documentElement.getAttribute('data-theme'), 'light')
  assert.equal(document.documentElement.getAttribute('data-theme-mode'), 'light')
  assert.equal(store.mode, 'light')
  assert.equal(store.isDark, false)
})

test('切到深色：写 data-theme=dark 并持久化到 ec-theme', async () => {
  installThemeDom()
  const { local } = installStorageStub()
  const store = await freshStore()
  store.init()
  store.setMode('dark')

  assert.equal(document.documentElement.getAttribute('data-theme'), 'dark')
  assert.equal(document.documentElement.getAttribute('data-theme-mode'), 'dark')
  assert.equal(store.isDark, true)
  assert.equal(local.getItem('ec-theme'), 'dark')
})

test('auto 档跟随系统：系统深色时 data-theme 为 dark，但 mode 仍是 auto', async () => {
  installThemeDom({ prefersDark: true })
  installStorageStub()
  const store = await freshStore()
  store.setMode('auto')

  // 这一条是 auto 档的核心：属性里必须能看出「用户选的是跟随系统」，
  // 否则刷新后无法还原用户意图（只能看到一个既成事实的 light/dark）。
  assert.equal(document.documentElement.getAttribute('data-theme'), 'dark')
  assert.equal(document.documentElement.getAttribute('data-theme-mode'), 'auto')
  assert.equal(store.mode, 'auto')
})

test('非法取值回落到浅色（脏 localStorage 不能让首屏停在 undefined）', async () => {
  installThemeDom()
  const { local } = installStorageStub()
  local.setItem('ec-theme', 'neo-brutalism')
  const store = await freshStore()
  store.init()
  assert.equal(store.mode, 'light')

  store.setMode('rainbow')
  assert.equal(store.mode, 'light')
})

test('初始化时清掉旧版五套主题的存储键（否则遗留数据会让人以为换肤失败）', async () => {
  installThemeDom()
  const { local } = installStorageStub()
  local.setItem('SSTC_THEME_PREF', JSON.stringify({ themeId: 'liquid-glass' }))
  const store = await freshStore()
  store.init()
  store.setMode('dark')
  assert.equal(local.getItem('SSTC_THEME_PREF'), null, '旧键必须被清理')
})

test('货币口径唯一：¥ + 两位小数（不再随主题变化）', async () => {
  installThemeDom()
  installStorageStub()
  const store = await freshStore()
  assert.equal(store.pricePrefix, '¥')
  assert.equal(store.priceDecimals, 2)
})

// ── 控件契约 ───────────────────────────────────────────────────

test('ThemeSwitch 使用 EC theme-switch 结构（data-set-theme / aria-pressed / role=group）', () => {
  const file = path.join(SRC, 'components', 'ThemeSwitch.vue')
  assert.ok(exists(file), 'ThemeSwitch.vue 必须存在')
  const text = stripHtml(read(file))

  assert.match(text, /class="theme-switch"/, '容器必须用 EC 的 .theme-switch')
  assert.match(text, /role="group"/, '容器必须声明 role=group（EC 的 setTheme 依赖它定位按钮组）')
  assert.match(text, /:data-set-theme="item\.mode"/, '按钮必须带 data-set-theme')
  assert.match(text, /:aria-pressed="themeStore\.mode === item\.mode"/, '当前档必须 aria-pressed=true')
  assert.match(text, /@click="themeStore\.setMode\(item\.mode\)"/, '点击必须走 setMode')
  assert.doesNotMatch(text, /<select/, '不得使用原生 select')
})

test('ThemeSwitch 三档来自 THEME_SWITCH 常量，且图标齐备', () => {
  const content = read(path.join(SRC, 'constants', 'content.js'))
  assert.match(content, /export const THEME_SWITCH = \{/)
  for (const mode of ['light', 'dark', 'auto']) {
    assert.match(content, new RegExp(`mode: '${mode}'`), `缺少 ${mode} 档`)
  }
  // 图标必须真的存在于图标集，否则按钮会渲染成空白方块
  const icons = read(path.join(SRC, 'utils', 'iconSet.js'))
  for (const icon of ['sun', 'moon', 'monitor']) {
    assert.match(icons, new RegExp(`^\\s{4}${icon}: \\{`, 'm'), `iconSet 缺少 ${icon}`)
  }
})

test('导航栏用的是 ThemeSwitch，旧的 ThemeSwitcher 已彻底移除', () => {
  const navbar = read(path.join(SRC, 'components', 'Navbar.vue'))
  assert.match(navbar, /import ThemeSwitch from '\.\/ThemeSwitch\.vue'/)
  assert.match(navbar, /<ThemeSwitch \/>/)
  assert.doesNotMatch(navbar, /ThemeSwitcher/)

  assert.equal(exists(path.join(SRC, 'components', 'ThemeSwitcher.vue')), false)
  assert.equal(exists(path.join(SRC, 'theme', 'presets.js')), false, '五套主题矩阵必须删除')
  assert.equal(exists(path.join(SRC, 'theme', 'compose.js')), false)
  assert.equal(exists(path.join(SRC, 'theme', 'color.js')), false)
})

test('首屏防闪脚本与 store 使用同一个存储键与同一套判定', () => {
  const html = read(path.join(WEB_ROOT, 'index.html'))
  assert.match(html, /localStorage\.getItem\('ec-theme'\)/, 'index.html 必须读 ec-theme')
  assert.match(html, /setAttribute\('data-theme'/, 'index.html 必须写 data-theme')
  assert.match(html, /setAttribute\('data-theme-mode'/, 'index.html 必须写 data-theme-mode')
  assert.match(html, /prefers-color-scheme: dark/, 'auto 档必须问系统')

  const store = read(path.join(SRC, 'stores', 'theme.js'))
  assert.match(store, /THEME_STORAGE_KEY = 'ec-theme'/, 'store 的键必须与首屏脚本一致')
})

// ── 令牌唯一来源 ───────────────────────────────────────────────

/**
 * 允许出现色值字面量的文件：EC 的**令牌层**（`assets/ec/tokens/`）。
 *
 * 这是 EC 自己的规则：色值只能在令牌层出现，组件层（`ec.css` / `ec-business.css`）
 * 一律走 `var(--ec-*)`。因此这份名单只放 tokens 目录，组件库仍然要被扫描 ——
 * 那正是「有没有人偷偷在组件里写死颜色」的信号所在。
 */
const COLOR_LITERAL_ALLOWED_PREFIX = ['src/assets/ec/tokens/']

/**
 * 允许出现色值字面量的组件（工具类页面）。
 *
 * 这些值不是「界面配色」而是**用户数据**：取色器的色板、二维码的前景色、
 * 幻灯片导出的白纸。它们必须能取到任意色值，否则工具本身就是错的。
 */
const COLOR_LITERAL_ALLOWED_COMPONENTS = [
  'src/pages/tools/ColorKit.vue',
  'src/pages/tools/ShapeKit.vue',
  'src/pages/tools/SlidesKit.vue',
  'src/pages/tools/QrcodeKit.vue',
  'src/pages/tools/CalcKit.vue',
]

const HEX_RE = /#[0-9a-fA-F]{3,8}\b/
const RGBA_RE = /\brgba?\(/

test('除 EC 的 Primitive / 暗色层外，任何样式都不写色值（EC L-01）', () => {
  const problems = []
  for (const file of styleFiles()) {
    const relPath = rel(file)
    if (COLOR_LITERAL_ALLOWED_PREFIX.some((p) => relPath.startsWith(p))) continue
    if (COLOR_LITERAL_ALLOWED_COMPONENTS.includes(relPath)) continue

    const text = read(file)
    for (const part of stylePartsOf(file, text)) {
      const css = stripCss(part)
      for (const line of css.split('\n')) {
        if (HEX_RE.test(line) || RGBA_RE.test(line)) {
          problems.push(`${relPath}: ${line.trim().slice(0, 72)}`)
        }
      }
    }
  }
  assert.deepEqual(problems, [], `以下样式写了色值，应改为 EC 语义令牌：\n  ${problems.join('\n  ')}`)
})

test('桥接层不覆写 --ec-* 令牌（覆写会让 EC 的暗色层失效）', () => {
  const vars = read(path.join(SRC, 'assets', 'styles', 'variables.css'))
  const overrides = [...stripCss(vars).matchAll(/^\s*(--ec-[a-z0-9-]+)\s*:/gm)].map((m) => m[1])
  assert.deepEqual(
    overrides,
    [],
    `variables.css 只能把旧名指向 --ec-*，不能重定义它们：\n  ${overrides.join('\n  ')}`
  )
})

test('桥接层引用的每个 --ec-* 都在 EC 令牌层里有定义', () => {
  const tokenFiles = fs.readdirSync(path.join(EC, 'tokens')).filter((f) => f.endsWith('.css'))
  const defined = new Set()
  for (const f of tokenFiles) {
    const text = stripCss(read(path.join(EC, 'tokens', f)))
    for (const m of text.matchAll(/(--ec-[a-z0-9-]+)\s*:/g)) defined.add(m[1])
  }
  assert.ok(defined.size > 200, `应能解析出大量 EC 令牌，实际 ${defined.size}`)

  const problems = []
  for (const file of styleFiles()) {
    const relPath = rel(file)
    if (relPath.startsWith('src/assets/ec/tokens/')) continue
    for (const part of stylePartsOf(file, read(file))) {
      for (const m of stripCss(part).matchAll(/var\(\s*(--ec-[a-z0-9-]+)/g)) {
        if (!defined.has(m[1])) problems.push(`${relPath}: ${m[1]}`)
      }
    }
  }
  assert.deepEqual(problems, [], `引用了 EC 令牌层里不存在的令牌：\n  ${problems.join('\n  ')}`)
})

// ── 暗色覆写完整性 ─────────────────────────────────────────────

test('暗色层覆写了六组语义角色（背景 / 文字 / 描边 / 行动 / 功能 / 渐变）', () => {
  const dark = stripCss(read(path.join(EC, 'tokens', 'theme-dark.css')))
  const groups = {
    背景: ['--ec-bg-base', '--ec-bg-surface', '--ec-bg-raised', '--ec-bg-sunken'],
    文字: ['--ec-text-primary', '--ec-text-secondary', '--ec-text-tertiary'],
    描边: ['--ec-border-subtle', '--ec-border-default', '--ec-border-focus'],
    行动: ['--ec-action-primary', '--ec-action-primary-hover'],
    功能: ['--ec-success', '--ec-warning', '--ec-danger'],
    渐变: ['--ec-grad-action', '--ec-grad-brand'],
  }
  const missing = []
  for (const [group, tokens] of Object.entries(groups)) {
    for (const token of tokens) {
      if (!new RegExp(`${token}\\s*:`).test(dark)) missing.push(`${group} / ${token}`)
    }
  }
  assert.deepEqual(missing, [], `暗色层缺少覆写：\n  ${missing.join('\n  ')}`)
})

test('暗色下主按钮改用「亮面 + 深字」，前景色有独立令牌', () => {
  const dark = stripCss(read(path.join(EC, 'tokens', 'theme-dark.css')))
  assert.match(
    dark,
    /--ec-button-primary-fg:\s*var\(--ec-ink-900\)/,
    '暗色主按钮必须用深字：白字压在 #A5AEFF 上只有 2.08:1'
  )
  assert.match(
    dark,
    /--ec-text-on-action:\s*var\(--ec-ink-900\)/,
    '暗色下所有实色面都被提亮，压在上面的文字必须反相为深字'
  )
})

// ── 对比度（可复算，不靠肉眼） ─────────────────────────────────

/** WCAG 2.1 相对亮度 */
function luminance(hex) {
  const clean = hex.replace('#', '')
  const full = clean.length === 3 ? clean.split('').map((c) => c + c).join('') : clean
  const channels = [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16) / 255)
  const [r, g, b] = channels.map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4))
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

function contrast(a, b) {
  const [l1, l2] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (l1 + 0.05) / (l2 + 0.05)
}

test('承字面：主按钮渐变三段压白字全部 ≥ 4.5:1', () => {
  // --ec-grad-action = blue-700 → violet-600 → blue-600
  const stops = { 'blue-700': '#3B45BF', 'violet-600': '#6D4AE0', 'blue-600': '#4A57E6' }
  for (const [name, hex] of Object.entries(stops)) {
    const ratio = contrast('#FFFFFF', hex)
    assert.ok(ratio >= 4.5, `${name} 上白字只有 ${ratio.toFixed(2)}:1，不足 4.5`)
  }
})

test('装饰面不可承字：品牌渐变最亮的 cyan 端白字不足 4.5:1（这就是拆两个渐变的原因）', () => {
  const ratio = contrast('#FFFFFF', '#22D3EE')
  assert.ok(ratio < 4.5, `cyan 端白字实测 ${ratio.toFixed(2)}:1`)
  // 渐变令牌必须分成两条：装饰面 brand / 承字面 action
  const semantic = stripCss(read(path.join(EC, 'tokens', 'semantic.css')))
  assert.match(semantic, /--ec-grad-brand:/)
  assert.match(semantic, /--ec-grad-action:/)
  assert.doesNotMatch(
    stripCss(read(path.join(EC, 'ec.css'))),
    /\.ec-btn--primary\s*\{[^}]*background:\s*var\(--ec-grad-brand\)/,
    '主按钮不得使用装饰渐变'
  )
})

test('暗色主按钮：深字压在亮面上 ≥ 4.5:1', () => {
  for (const hex of ['#A5AEFF', '#C3B4FF', '#8FE6F5']) {
    const ratio = contrast('#0B0E14', hex)
    assert.ok(ratio >= 4.5, `ink-900 压在 ${hex} 上只有 ${ratio.toFixed(2)}:1`)
  }
})

test('三级文字在各自底色上 ≥ 4.5:1（EC 修掉的四处之一）', () => {
  // 亮色：text-tertiary #5F6878 on bg-base #FBFCFE
  assert.ok(contrast('#5F6878', '#FBFCFE') >= 4.5)
  // 暗色：ink-400 #858FA2 on raised #1A1F2B
  assert.ok(contrast('#858FA2', '#1A1F2B') >= 4.5)
  // 危险文字：red-700 on red-50
  assert.ok(contrast('#C42618', '#FEF2F2') >= 4.5)
})

test('检查器自检：对比度公式能复算出设计系统文档里的已知值', () => {
  // 文档 §11 的两个基准值：text-primary on bg-base = 15.12；cyan 端白字 = 1.81
  assert.ok(Math.abs(contrast('#1F2430', '#FBFCFE') - 15.12) < 0.05)
  assert.ok(Math.abs(contrast('#FFFFFF', '#22D3EE') - 1.81) < 0.02)
})
