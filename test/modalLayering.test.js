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
 * 成因是 CSS 层叠顺序而不是事件绑定：`.u-modal-close` 与 `.tab-btn` 都是定位元素
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
 */

/** 读取全局样式表 */
const globalCss = readFileSync(join(SRC, 'assets', 'styles', 'global.css'), 'utf8')

/** 取出某个选择器的规则体（取第一个匹配的顶层规则） */
function cssRuleBody(css, selector) {
  const start = css.indexOf(`${selector} {`)
  if (start === -1) return null
  const open = css.indexOf('{', start)
  const close = css.indexOf('}', open)
  if (open === -1 || close === -1) return null
  return css.slice(open + 1, close)
}

// ── 关闭按钮必须建立自己的层叠层级 ─────────────────────────

test('回归：.u-modal-close 必须声明 z-index（否则会被后面的定位元素盖住）', () => {
  const body = cssRuleBody(globalCss, '.u-modal-close')
  assert.ok(body, 'global.css 里应存在 .u-modal-close 规则')

  const match = body.match(/z-index:\s*(-?\d+)/)
  assert.ok(
    match,
    '关闭按钮缺少 z-index。它在模板里是弹窗的第一个元素，' +
      '任何紧跟其后、起始位置重叠的定位元素（页签行、标题）都会画在它上面，' +
      '点击会落到那个元素上 —— 表现为「✕ 点了没反应」。'
  )
  assert.ok(Number(match[1]) > 0, `z-index 应为正数，实际 ${match[1]}`)
})

test('回归：关闭按钮是绝对定位的（z-index 只在定位元素上生效）', () => {
  const body = cssRuleBody(globalCss, '.u-modal-close')
  assert.ok(
    /position:\s*absolute/.test(body),
    '关闭按钮必须保持 position: absolute —— 否则 z-index 不生效，上面那条守卫会失去意义'
  )
})

// ── 所有用到关闭按钮的弹窗都要给内容让位 ───────────────────

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

test('回归：用了 .u-modal-close 的弹窗，重叠内容必须给按钮留出横向空间', () => {
  const offenders = []

  for (const file of collectVueFiles(SRC)) {
    const source = readFileSync(file, 'utf8')
    if (!source.includes('u-modal-close')) continue

    // 两种既有做法都算「让位」：
    //   1. 渲染带 .u-modal-title 的可见标题（该共享类自带 padding-right）；
    //   2. 自己声明右侧留白（登录弹窗的 .modal-tabs 就是这么做的）。
    const usesSharedTitle = /class="[^"]*\bu-modal-title\b/.test(source)
    const declaresOwnGutter = /padding-right:\s*calc\(\s*var\(--modal-close-size\)/.test(source)

    if (!usesSharedTitle && !declaresOwnGutter) {
      offenders.push(relative(WEB_ROOT, file).replace(/\\/g, '/'))
    }
  }

  assert.deepEqual(
    offenders,
    [],
    '以下弹窗用了 .u-modal-close，但重叠的内容既没走 .u-modal-title、' +
      `也没自己留出右侧空隙，文字或控件会钻到按钮底下：\n  ${offenders.join('\n  ')}`
  )
})

test('主题弹窗与登录弹窗都通过 padding-right 为关闭按钮让位', () => {
  // 主题弹窗与帮助弹窗用共享的 .u-modal-title（它自己带 padding-right）
  const titleBody = cssRuleBody(globalCss, '.u-modal-title')
  assert.ok(
    /padding-right:\s*calc\(\s*var\(--modal-close-size\)/.test(titleBody),
    '.u-modal-title 必须给关闭按钮让位（主题弹窗的标题走的就是这条规则）'
  )

  // 登录弹窗没有可见标题，第一个内容块是页签行，因此由它自己让位
  const loginModal = readFileSync(join(SRC, 'components', 'LoginModal.vue'), 'utf8')
  assert.match(
    loginModal,
    /\.modal-tabs\s*\{[^}]*padding-right:\s*calc\(\s*var\(--modal-close-size\)/s,
    '登录弹窗的 .modal-tabs 必须给关闭按钮让位 —— 页签行与 ✕ 处在同一条垂直带上'
  )
})

// ── 关闭按钮的可访问名 ─────────────────────────────────────

test('回归：每个 .u-modal-close 都必须有 aria-label', () => {
  const missing = []

  for (const file of collectVueFiles(SRC)) {
    const source = readFileSync(file, 'utf8')
    if (!source.includes('u-modal-close')) continue

    // 找到带该 class 的标签，检查同一标签内是否有 aria-label
    for (const m of source.matchAll(/<button[^>]*class="[^"]*u-modal-close[^"]*"[^>]*>/g)) {
      if (!/aria-label=/.test(m[0])) {
        missing.push(`${relative(WEB_ROOT, file).replace(/\\/g, '/')}: ${m[0].slice(0, 80)}`)
      }
    }
  }

  assert.deepEqual(missing, [], `以下关闭按钮缺少 aria-label（图标型按钮必须有无障碍名）：\n  ${missing.join('\n  ')}`)
})

test('回归：每个 .u-modal-close 都绑定了关闭动作', () => {
  const missing = []

  for (const file of collectVueFiles(SRC)) {
    const source = readFileSync(file, 'utf8')
    if (!source.includes('u-modal-close')) continue

    for (const m of source.matchAll(/<button[^>]*class="[^"]*u-modal-close[^"]*"[^>]*>/g)) {
      // @click="$emit('close')" 或 @click="close" 都算
      if (!/@click=/.test(m[0])) {
        missing.push(`${relative(WEB_ROOT, file).replace(/\\/g, '/')}: ${m[0].slice(0, 80)}`)
      }
    }
  }

  assert.deepEqual(missing, [], `以下关闭按钮没有绑定点击动作：\n  ${missing.join('\n  ')}`)
})
