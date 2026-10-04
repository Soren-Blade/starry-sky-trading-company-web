import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

import { renderComponent, createPiniaWithState, createRenderEnv } from './render.mjs'
import { ICONS, ICON_STROKE_WIDTH, EMOJI_TO_ICON, emojiToIconName } from '../src/utils/iconSet.js'

/**
 * 线性单色图标体系
 *
 * 这一组要守住的是三条硬约定（任何一条破了都会在某一套主题里露出马脚）：
 *   1. **颜色只来自 currentColor** —— 图标自己写死颜色就不会随主题变化，
 *      而「颜色随主题变化」正是这次改造的要求
 *   2. 尺寸走 1em —— 跟着所在位置的字号走，而字号本身是按主题缩放的
 *   3. 模板里引用的每个图标名都真实存在 —— 写错名字只会渲染出一个空白 svg，
 *      不报错、不告警，光看代码很难发现
 */

const __dirname = dirname(fileURLToPath(import.meta.url))
const SRC = join(__dirname, '..', 'src')

/** 递归收集 src 下所有 .vue / .js 的路径与内容 */
function collectFiles(dir) {
  const out = []
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) {
      out.push(...collectFiles(full))
    } else if (/\.(vue|js)$/.test(entry)) {
      out.push({ path: full, text: readFileSync(full, 'utf8') })
    }
  }
  return out
}

const FILES = collectFiles(SRC)

// ── 几何数据本身 ───────────────────────────────────────────

test('每个图标都至少有一个绘制图元，且没有空图形', () => {
  for (const [name, icon] of Object.entries(ICONS)) {
    const count =
      (icon.paths?.length || 0) + (icon.circles?.length || 0) + (icon.rects?.length || 0)
    assert.ok(count > 0, `图标 ${name} 没有任何图元`)
    for (const d of icon.paths || []) {
      assert.ok(typeof d === 'string' && d.trim().length > 0, `图标 ${name} 有一条空的 path`)
    }
  }
})

test('图标数据里不含任何颜色（颜色必须来自 currentColor）', () => {
  const dump = JSON.stringify(ICONS)
  assert.equal(/["']#|rgb\(|hsl\(|fill=|stroke=/.test(dump), false, '图标几何里不该出现颜色或填充声明')
})

test('线宽够粗（本站图标落在 16–20px，2 会显得纤细发虚）', () => {
  assert.ok(
    ICON_STROKE_WIDTH >= 2.4 && ICON_STROKE_WIDTH <= 3,
    `线宽应在 2.4~3 之间，实际 ${ICON_STROKE_WIDTH}`
  )
})

test('描边两端与折角都是圆的（「圆滑」靠这两条，不靠线宽）', async () => {
  const [pinia, env] = await Promise.all([createPiniaWithState({}), createRenderEnv()])
  const html = await renderComponent('/components/AppIcon.vue', {
    props: { name: 'shopping-cart' },
    plugins: [pinia, env.router],
    globalComponents: env.globalComponents,
  })

  assert.match(html, /stroke-linecap="round"/, '线端要圆')
  assert.match(html, /stroke-linejoin="round"/, '折角要圆')
})

// ── 组件渲染 ───────────────────────────────────────────────

test('AppIcon 渲染出 svg，且颜色取自 currentColor、不带填充', async () => {
  const [pinia, env] = await Promise.all([createPiniaWithState({}), createRenderEnv()])
  const html = await renderComponent('/components/AppIcon.vue', {
    props: { name: 'search' },
    plugins: [pinia, env.router],
    globalComponents: env.globalComponents,
  })

  assert.match(html, /<svg/)
  assert.match(html, /stroke="currentColor"/, '颜色必须来自 currentColor，否则不随主题变化')
  assert.match(html, /fill="none"/)
  assert.match(html, /viewBox="0 0 24 24"/)
  assert.equal(/fill="(?!none)[^"]*"/.test(html), false, '不应出现非 none 的填充')
  assert.equal(/#[0-9a-fA-F]{3,6}/.test(html), false, '不应出现写死的色值')
})

test('AppIcon 默认对读屏隐藏（图标在这些位置都是装饰）', async () => {
  const [pinia, env] = await Promise.all([createPiniaWithState({}), createRenderEnv()])
  const html = await renderComponent('/components/AppIcon.vue', {
    props: { name: 'heart' },
    plugins: [pinia, env.router],
    globalComponents: env.globalComponents,
  })

  assert.match(html, /aria-hidden="true"/)
})

test('图标名不存在时渲染空 svg 而不是抛错（占位不塌）', async () => {
  const [pinia, env] = await Promise.all([createPiniaWithState({}), createRenderEnv()])
  const html = await renderComponent('/components/AppIcon.vue', {
    props: { name: '这个图标不存在' },
    plugins: [pinia, env.router],
    globalComponents: env.globalComponents,
  })

  assert.match(html, /<svg/)
  assert.equal(html.includes('<path'), false)
})

// ── 模板引用的名字都要存在 ─────────────────────────────────

test('所有模板里引用的图标名都存在于 ICONS（写错名字只会渲染出空白，不报错）', () => {
  const missing = []
  let total = 0

  for (const file of FILES) {
    for (const match of file.text.matchAll(/<AppIcon[^>]*\sname="([^"]+)"/g)) {
      total += 1
      if (!ICONS[match[1]]) missing.push(`${file.path.split(/[\\/]/).pop()} → ${match[1]}`)
    }
    // 动态名字（:name="...")另外统计，提醒它无法在这里校验
  }

  assert.equal(missing.length, 0, `引用了不存在的图标：${missing.join('、')}`)
  assert.ok(total > 0, '至少应有一处使用（否则说明改造被回退了）')
})

test('动态图标名（emoji → 图标）的映射目标都必须存在', () => {
  const missing = Object.entries(EMOJI_TO_ICON)
    .filter(([, name]) => !ICONS[name])
    .map(([emoji, name]) => `${emoji} → ${name}`)

  assert.equal(missing.length, 0, `映射到了不存在的图标：${missing.join('、')}`)
})

test('emojiToIconName：认得的 emoji 有映射，不认得的返回空串（调用方据此回退显示原文）', () => {
  assert.equal(emojiToIconName('🎬'), 'video')
  assert.equal(emojiToIconName(' 📝 '), 'file', '两侧空白要容忍')
  assert.equal(emojiToIconName('🚀'), '', '运营随时可能录一个新 emoji，不能崩')
  assert.equal(emojiToIconName(null), '')
  assert.equal(emojiToIconName(undefined), '')
})
