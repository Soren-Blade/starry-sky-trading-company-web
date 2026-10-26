import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, dirname, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const WEB_ROOT = join(__dirname, '..')
const SRC = join(WEB_ROOT, 'src')

/**
 * 「点不到」类缺陷的静态守卫
 *
 * 背景：登录弹窗的 ✕ 曾经**完全失效** —— 点它实际点到的是「注册」页签。
 *
 * 成因是 CSS 层叠顺序而不是事件绑定：关闭按钮与 `.tab-btn` 都是定位元素
 * 且 `z-index: auto`，此时**谁在 DOM 里靠后谁画在上面**。关闭按钮是弹窗的第一个
 * 元素，而页签行（`position: relative` + `flex: 1`，铺满整行）紧跟其后、
 * 起始位置与它完全重叠。
 *
 * 这类缺陷有几个共同点，使它们特别容易漏：
 *   - SSR 渲染测试与产物契约测试**都看不见**（DOM 结构完全正确）；
 *   - 事件绑定也完全正确（点中了别的元素而已）；
 *   - 单元测试更不可能覆盖（需要真实布局）。
 *
 * 因此这里退一步，把**导致它的那几条不变量**用静态检查钉住。
 *
 * 2.0.0 起弹窗改用设计系统的 `.ec-overlay` / `.ec-dialog` / `.ec-drawer`，
 * 本文件同步改为按 EC 类名断言；不变量本身没有放松。
 */

/** 读取全局样式表 */
const globalCss = readFileSync(join(SRC, 'assets', 'styles', 'global.css'), 'utf8')

/** 读取某个源文件的文本 */
function read(relPath) {
  return readFileSync(join(SRC, ...relPath.split('/')), 'utf8')
}

/** 取出某个选择器的规则体（取第一个匹配的顶层规则） */

/** 收集 src 下所有 .vue 文件 */
function collectVueFiles(dir) {
  const out = []
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) out.push(...collectVueFiles(full))
    else if (entry.endsWith('.vue')) out.push(full)
  }
  return out
}

// ── 不再保留旧类名，避免「同名单类选择器互相盖掉」 ─────────

test('回归：global.css 不得再定义 .u-modal* 规则', () => {
  const offenders = []
  for (const m of globalCss.matchAll(/^\s*(\.u-modal[\w-]*)[^{]*\{/gm)) {
    offenders.push(m[1])
  }
  assert.deepEqual(
    offenders,
    [],
    '弹窗已改用 `.ec-overlay` / `.ec-dialog` / `.ec-drawer`，global.css 里不应再有 `.u-modal*` 规则：\n  ' +
      offenders.join('\n  ') +
      '\n两个同名单类选择器并存时，后注入者胜 —— 会表现为「改了没效果」。'
  )
})

// ── 两个弹窗各自用对了 EC 组件 ─────────────────────────────

test('登录弹窗用 Dialog，帮助弹窗用 Drawer（§8.3 决策树）', () => {
  const login = read('components/LoginModal.vue')
  assert.match(login, /class="ec-overlay"/, '登录弹窗根节点应为 `.ec-overlay`')
  assert.match(login, /class="ec-dialog[^"]*"/, '登录弹窗面板应为 `.ec-dialog`')

  const help = read('components/HelpModal.vue')
  assert.match(help, /class="ec-overlay"/, '帮助弹窗根节点应为 `.ec-overlay`')
  assert.match(help, /class="ec-drawer[^"]*"/, '帮助弹窗（长内容、可回看）应为 `.ec-drawer`')
  assert.match(
    help,
    /class="ec-drawer__head"/,
    'Drawer 的标题与关闭键必须放进 `.ec-drawer__head` —— 这是它不压住正文的结构保证'
  )
})

// ── 关闭按钮必须建立自己的层叠层级 ─────────────────────────

test('回归：登录弹窗关闭键必须绝对定位且声明 z-index', () => {
  const login = read('components/LoginModal.vue')

  const panel = login.match(/\.login-dialog\s*\{([^}]*)\}/s)
  assert.ok(panel, 'LoginModal 应有 `.login-dialog` 规则（承载 EC Dialog 的自有内边距）')
  assert.match(
    panel[1],
    /position:\s*relative/,
    '`.login-dialog` 必须 position: relative —— 否则内部绝对定位的关闭键会跑到整个视口去'
  )

  const close = login.match(/\.login-dialog-close\s*\{([^}]*)\}/s)
  assert.ok(close, 'LoginModal 应有 `.login-dialog-close` 规则')

  const zIndex = close[1].match(/z-index:\s*(-?\d+)/)
  assert.ok(
    zIndex,
    '关闭按钮缺少 z-index。它在模板里是弹窗的第一个元素，' +
      '任何紧跟其后、起始位置重叠的定位元素（页签行、标题）都会画在它上面，' +
      '点击会落到那个元素上 —— 表现为「✕ 点了没反应」。'
  )
  assert.ok(Number(zIndex[1]) > 0, `z-index 应为正数，实际 ${zIndex[1]}`)
  assert.match(
    close[1],
    /position:\s*absolute/,
    '关闭按钮必须保持 position: absolute —— 否则 z-index 不生效，上面那条守卫会失去意义'
  )
})

test('回归：登录弹窗的页签行必须给关闭按钮让出横向空间', () => {
  const login = read('components/LoginModal.vue')
  assert.match(
    login,
    /\.modal-tabs\s*\{[^}]*padding-right:\s*calc\(/s,
    '登录弹窗没有可见标题，第一个内容块就是页签行，必须由它自己留出右侧空隙 —— ' +
      '否则页签会铺到 ✕ 底下（这正是一开始「点 ✕ 点到注册页签」的成因）'
  )
})

// ── 图标型按钮的无障碍名与点击动作 ─────────────────────────

/** 收集所有带 `.ec-icon-btn` 的 button 开标签 */
function collectIconButtons() {
  const hits = []
  for (const file of collectVueFiles(SRC)) {
    const source = readFileSync(file, 'utf8')
    if (!source.includes('ec-icon-btn')) continue
    for (const m of source.matchAll(/<button[^>]*class="[^"]*\bec-icon-btn\b[^"]*"[^>]*>/g)) {
      hits.push({ file: relative(WEB_ROOT, file).replace(/\\/g, '/'), tag: m[0] })
    }
  }
  return hits
}

test('回归：每个 .ec-icon-btn 都必须有无障碍名', () => {
  const missing = collectIconButtons()
    .filter(({ tag }) => !/(?::|v-bind:)?aria-label=/.test(tag))
    .map(({ file, tag }) => `${file}: ${tag.slice(0, 90)}`)

  assert.deepEqual(missing, [], `以下图标按钮缺少 aria-label（图标型按钮必须有无障碍名）：\n  ${missing.join('\n  ')}`)
})

test('回归：每个可用的 .ec-icon-btn 都绑定了点击动作', () => {
  const missing = collectIconButtons()
    // 修饰符（@click.stop 等）也算绑定；静态 disabled 的按钮本来就不该有动作
    .filter(({ tag }) => !/(?:@|v-on:)click(?:\.\w+)*=/.test(tag))
    .filter(({ tag }) => !/(?:^|\s)disabled(?:\s|$|>)/.test(tag) && !/aria-disabled="true"/.test(tag))
    .map(({ file, tag }) => `${file}: ${tag.slice(0, 90)}`)

  assert.deepEqual(missing, [], `以下图标按钮没有绑定点击动作：\n  ${missing.join('\n  ')}`)
})

// ── 关闭键的图标来自图标集 ─────────────────────────────────

test('两个弹窗的关闭键都用图标集里的 x，而不是 ✕ 字形', () => {
  // 注释里用 ✕ 说明历史缺陷是允许的，这里只看渲染出来的模板
  const stripComments = (src) => src.replace(/<!--[\s\S]*?-->/g, '')

  for (const [label, relPath] of [
    ['登录弹窗', 'components/LoginModal.vue'],
    ['帮助弹窗', 'components/HelpModal.vue']
  ]) {
    const source = stripComments(read(relPath))
    assert.match(source, /<AppIcon\s+name="x"\s*\/>/, `${label}的关闭键应渲染 <AppIcon name="x" />`)
    assert.doesNotMatch(source, /[✕×]/, `${label}不应再用 ✕/× 字形充当图标（字号一变就与按钮尺寸脱钩）`)
  }
})
