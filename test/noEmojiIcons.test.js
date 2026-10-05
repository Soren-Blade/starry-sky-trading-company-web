import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, readdirSync } from 'node:fs'
import { join, relative } from 'node:path'

import { ICONS, EMOJI_TO_ICON, emojiToIconName } from '../src/utils/iconSet.js'

/**
 * emoji 图标守卫
 *
 * ## 为什么需要
 *
 * 项目原先到处用 emoji 当图标（🛍️❤️📞🔧🧰…）。它们有两个硬伤：
 *   1. **颜色不随主题变** —— emoji 由字体渲染成彩色位图，CSS 的 `color` 对它无效，
 *      于是「悬停变色」「五套主题的强调色」在这些位置全部失效；
 *   2. 字形随平台/字体变化，同一个页面在不同系统上观感不一致。
 *
 * 因此统一改造成 `AppIcon` 的线性单色图标（颜色走 currentColor）。
 * 这一类问题**不会报错、测试也不会红**，只能靠约定 + 机械检查，
 * 所以这里把它钉住：新写的界面若又用 emoji 当图标，测试直接失败。
 *
 * ## 判定
 *
 * 剥掉注释后再找「扩展象形字符」。注释里的 emoji 是历史说明（例如
 * 「原先用 ▶ 字符」），不影响渲染，一律放过。
 */

const WEB_ROOT = join(import.meta.dirname, '..')
const SRC = join(WEB_ROOT, 'src')

/** 允许保留的字符：版权符号不是图标，出现在页脚版权声明里 */
const ALLOWED_CHARS = new Set(['©'])

/** 这个文件本身就是 emoji → 图标名的映射表，当然含 emoji */
const EXEMPT_FILES = new Set(['utils/iconSet.js'])

const EMOJI = /(\p{Extended_Pictographic}(?:\uFE0F|\u200D\p{Extended_Pictographic}|[\u{1F3FB}-\u{1F3FF}])*)/gu

/** 去掉 HTML 注释、块注释、行注释 */
function stripComments(text) {
  return text
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:])\/\/[^\n]*/g, '$1')
}

function walk(dir, out = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) walk(full, out)
    else if (/\.(vue|js)$/.test(entry.name)) out.push(full)
  }
  return out
}

test('界面里不得再用 emoji 当图标（一律走 AppIcon 的线性图标）', () => {
  const offenders = []

  for (const file of walk(SRC)) {
    const rel = relative(SRC, file).replace(/\\/g, '/')
    if (EXEMPT_FILES.has(rel)) continue

    const stripped = stripComments(readFileSync(file, 'utf8'))
    for (const hit of stripped.match(EMOJI) || []) {
      if (ALLOWED_CHARS.has(hit)) continue
      offenders.push(`${rel}: ${hit}`)
    }
  }

  assert.deepEqual(
    offenders,
    [],
    `这些位置还在用 emoji 当图标（它不受 CSS color 影响，无法跟随主题变色）：\n  ${offenders.join('\n  ')}\n` +
      '改用 <AppIcon name="..." />；数据库里的 emoji 用 emojiToIconName() 映射后再交给 AppIcon。'
  )
})

test('映射表覆盖数据库里实际存着的 emoji（否则会回退成彩色 emoji）', () => {
  // 这组取值是**从数据库查出来的**（2026-10-05）：
  //   sstc.tools.icon            → 🎬 💻 📝 🖼️
  //   sstc.product_categories.icon_url → 💬
  // 也就是说运营录进去的就是这些；漏一个，那张卡片就会渲染回 emoji。
  // 数据库将来新增了别的 emoji 时，这条用例不会自动失败（它无法连库），
  // 但渲染端的回退逻辑会原样显示 —— 见下面那条「未知 emoji 回退」用例。
  const FROM_DATABASE = ['🎬', '💻', '📝', '🖼️', '💬']

  for (const emoji of FROM_DATABASE) {
    const name = emojiToIconName(emoji)
    assert.notEqual(name, '', `数据库里的 ${emoji} 没有对应图标，会渲染成彩色 emoji`)
    assert.ok(ICONS[name], `映射出的图标名 ${name} 在 ICONS 里不存在（会渲染成空 svg）`)
  }
})

test('界面现在会用到的 emoji 也都在映射表里', () => {
  // 改造前界面上出现过的 emoji：它们现在只应作为**映射表的键**存在
  const FROM_UI = [
    '🛍️', '❤️', '🤍', '📞', '✉️', '🕐', '📍', '👤', '📋', '🔑', '👁️', '🙈',
    '📖', '⚠️', '⚡', '🔄', '🔧', '📦', '⭐', '🔥', '🧰', '🎁', '💳', '🏦',
    '📱', '🎴', '✨', '🎬', '🖼️', '💻', '📝', '🎵', '📄', '⌨️', '✅', '⛔',
    'ℹ️', '▶', '↑', '🛒', '🔍', '🎨', '🔒', '🛠️', '🌟',
  ]

  const missing = FROM_UI.filter((emoji) => !emojiToIconName(emoji))
  assert.deepEqual(missing, [], `这些 emoji 没有映射：${missing.join(' ')}`)
})

test('映射到的每个图标名都必须真实存在（否则渲染成空 svg）', () => {
  const broken = Object.entries(EMOJI_TO_ICON)
    .filter(([, name]) => !ICONS[name])
    .map(([emoji, name]) => `${emoji} → ${name}`)

  assert.deepEqual(broken, [], `映射指向了不存在的图标：\n  ${broken.join('\n  ')}`)
})

test('每个图标都有几何数据（paths / circles / rects 至少一个非空）', () => {
  const empty = Object.entries(ICONS)
    .filter(([, geo]) => {
      const counts = [geo.paths?.length || 0, geo.circles?.length || 0, geo.rects?.length || 0]
      return counts.every((n) => n === 0)
    })
    .map(([name]) => name)

  assert.deepEqual(empty, [], `这些图标没有几何数据，会渲染成空白：${empty.join(', ')}`)
})

test('未知 emoji 返回空串（调用方据此回退成原样显示，不丢数据）', () => {
  // 运营随时可能录一个表里没有的 emoji（🚀）。返回空串让调用方保留它，
  // 比渲染成空白图标或错误图标都好。
  assert.equal(emojiToIconName('🚀'), '')
  assert.equal(emojiToIconName(''), '')
  assert.equal(emojiToIconName(null), '')
  assert.equal(emojiToIconName(undefined), '')
  assert.equal(emojiToIconName(123), '')
  // 原型链属性名不能取到东西（本仓库踩过这个坑，见 utils/safeLookup.js）——
  // 这是这条用例真正抓到的缺陷：EMOJI_TO_ICON['toString'] 会返回那个函数
  assert.equal(emojiToIconName('toString'), '')
  assert.equal(emojiToIconName('constructor'), '')
  assert.equal(emojiToIconName('__proto__'), '')
  assert.equal(emojiToIconName('valueOf'), '')
})

test('模板里写死的图标名都必须存在（否则渲染成空 svg，且不报错）', () => {
  // <AppIcon name="flame2" /> 这种笔误不会报错，只是图标没了 —— 机械地查出来
  const offenders = []

  for (const file of walk(SRC)) {
    if (!file.endsWith('.vue')) continue
    const rel = relative(SRC, file).replace(/\\/g, '/')
    const text = readFileSync(file, 'utf8')

    // 只查**字面量**：`:name="expr"` 是动态的，无法静态判断。
    // 先取出每个 <AppIcon …> 标签，再在标签内找**不带冒号前缀**的 name= ——
    // 否则 `:name="SITE.logo"` 这类绑定会被当成字面量误报。
    for (const tag of text.matchAll(/<AppIcon\b[^>]*>/g)) {
      const literal = tag[0].match(/(?<!:)name="([^"]+)"/)
      if (!literal) continue
      const name = literal[1]
      if (!ICONS[name]) offenders.push(`${rel}: name="${name}"`)
    }
  }

  assert.deepEqual(offenders, [], `这些图标名在 ICONS 里不存在：\n  ${offenders.join('\n  ')}`)
})
