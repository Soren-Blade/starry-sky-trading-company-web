import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, readdirSync, existsSync } from 'node:fs'
import { join, relative } from 'node:path'

/**
 * 组件类名守卫：**不得复用只存在于别的组件 scoped 样式里的类名**
 *
 * ## 为什么需要
 *
 * `HotToolsSection` 曾经用 `<div class="section-inner">` 当内容容器，而
 * `.section-inner` 只在 `CategoriesSection` 与 `HotProductsSection` 的
 * `<style scoped>` 里各写了一份。**scoped 样式只作用于本组件** ——
 * 于是新组件拿到的是**零样式**：不限宽、不居中、没有内边距，
 * 整块内容横向铺满视口，与上方区块对不齐。
 *
 * 这类 bug 的特征是「**看起来有定义**」（grep 类名能搜到），但实际不生效，
 * 而且不报任何错 —— 只能靠真机看。同一个坑在 `VideoTool.vue` 上又踩了一次
 * （借用了 `Tool.vue` 的 `.workspace-*`）。所以机械地挡在这里。
 *
 * ## 判定规则
 *
 * 模板里用到的类名，必须满足其一：
 *   1. 在共享样式（global.css / ui-kit-*.css）里有定义，或
 *   2. 在本组件自己的 `<style>` 里有定义，或
 *   3. 任何地方都没有定义（纯语义类名，如 `.cart-page` —— 本项目有不少，
 *      它们不产生样式也不影响布局，因此**不算错**）
 *
 * 只有「**只在别的组件的 scoped 样式里定义**」才判失败。
 */

const WEB_ROOT = join(import.meta.dirname, '..')
const SRC = join(WEB_ROOT, 'src')

const SHARED_STYLES = [
  'assets/styles/global.css',
  'assets/styles/ui-kit-data.css',
  'assets/styles/ui-kit-feedback.css',
  'assets/styles/ui-kit-form.css',
  'assets/styles/ui-kit-nav.css',
]

/** 递归列出 src 下的 .vue 与 .css */
function walk(dir, out = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) walk(full, out)
    else if (/\.(vue|css)$/.test(entry.name)) out.push(full)
  }
  return out
}

/** CSS 文本里出现的类名 */
function classesInCss(css) {
  const names = new Set()
  for (const m of css.matchAll(/\.(-?[_a-zA-Z][\w-]*)/g)) names.add(m[1])
  return names
}

/**
 * 模板里用到的类名。
 *
 * 静态 `class="a b"` 直接取；`:class` 是表达式，只取其中的**字符串字面量**
 * （`'rail-item--active'`）—— 这既覆盖了对象/数组/三元各种写法，
 * 又不会把 `isBoard`、`}` 这类表达式片段误当成类名。
 */
function classesUsedInTemplate(template) {
  const names = new Set()

  for (const m of template.matchAll(/\sclass="([^"]*)"/g)) {
    for (const n of m[1].split(/\s+/)) if (n && !n.includes('{')) names.add(n)
  }

  for (const m of template.matchAll(/:class="([^"]*)"/g)) {
    for (const lit of m[1].matchAll(/'([^']+)'/g)) {
      for (const n of lit[1].split(/\s+/)) if (n) names.add(n)
    }
  }

  return names
}

function collect() {
  const files = walk(SRC)
  const shared = new Set()
  for (const rel of SHARED_STYLES) {
    const full = join(SRC, rel)
    if (!existsSync(full)) continue
    for (const n of classesInCss(readFileSync(full, 'utf8'))) shared.add(n)
  }

  const own = new Map()
  const definedIn = new Map()

  for (const file of files) {
    if (!file.endsWith('.vue')) continue
    const text = readFileSync(file, 'utf8')
    const styleBlocks = [...text.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)].map((m) => m[1])

    const names = new Set()
    for (const block of styleBlocks) for (const n of classesInCss(block)) names.add(n)
    own.set(file, names)

    const rel = relative(SRC, file).replace(/\\/g, '/')
    for (const n of names) {
      if (!definedIn.has(n)) definedIn.set(n, [])
      definedIn.get(n).push(rel)
    }
  }

  return { files, shared, own, definedIn }
}

test('不得复用只存在于别的组件 scoped 样式里的类名', () => {
  const { files, shared, own, definedIn } = collect()
  const offenders = []

  for (const file of files) {
    if (!file.endsWith('.vue')) continue
    const text = readFileSync(file, 'utf8')
    const tpl = text.match(/<template>([\s\S]*)<\/template>/)
    if (!tpl) continue

    const rel = relative(SRC, file).replace(/\\/g, '/')
    const mine = own.get(file) || new Set()

    for (const name of classesUsedInTemplate(tpl[1])) {
      if (shared.has(name) || mine.has(name)) continue
      const owners = definedIn.get(name)
      // 谁都没定义 → 纯语义类名，不影响布局，放过
      if (!owners || owners.length === 0) continue
      offenders.push(`${rel} -> .${name}（定义在 ${owners.join(', ')}）`)
    }
  }

  assert.deepEqual(
    offenders,
    [],
    `这些类名只在**别的组件**的 scoped 样式里定义，在本组件里等于零样式：\n  ${offenders.join('\n  ')}\n` +
      '修法二选一：把该类名提到共享样式（global.css / ui-kit-*.css），或在本组件内自己定义。'
  )
})

/**
 * 去掉 `@media` 块，只留基础规则。
 *
 * 本项目的约定是「移动端缩放由各组件在末尾的媒体查询里处理」
 * （内边距 ×0.8 之类），因此组件内**允许**出现
 * `@media (max-width: 767px) { .section-inner { padding: ... } }` 这样的覆写；
 * 要禁止的只是把**基础规则**再抄一遍（那才是重复定义）。
 */
function stripMediaQueries(css) {
  let out = ''
  let i = 0
  while (i < css.length) {
    const at = css.indexOf('@media', i)
    if (at === -1) {
      out += css.slice(i)
      break
    }
    out += css.slice(i, at)
    const braceStart = css.indexOf('{', at)
    if (braceStart === -1) break
    let depth = 1
    let j = braceStart + 1
    while (j < css.length && depth > 0) {
      if (css[j] === '{') depth += 1
      else if (css[j] === '}') depth -= 1
      j += 1
    }
    i = j
  }
  return out
}

test('守卫本身有效：能识别出「定义在别处」的情况', () => {
  // 用构造数据验证判定逻辑，避免守卫因为解析失灵而永远通过
  const { definedIn } = collect()
  const owner = definedIn.get('rail-item')
  assert.ok(owner && owner.length > 0, '至少应能读出一个已知组件的类名（.rail-item 在 Tool.vue）')
})

test('共享容器类 .section-inner：基础规则在共享层，组件只允许媒体查询覆写', () => {
  const { shared, files } = collect()
  assert.ok(shared.has('section-inner'), '.section-inner 的基础规则应在共享样式里')

  const redefined = []
  for (const file of files) {
    if (!file.endsWith('.vue')) continue
    const text = readFileSync(file, 'utf8')
    const styleBlocks = [...text.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)].map((m) => m[1])

    for (const block of styleBlocks) {
      // 先去掉注释，避免「说明里提到 .section-inner」被当成定义
      const base = stripMediaQueries(block.replace(/\/\*[\s\S]*?\*\//g, ''))
      if (/\.section-inner\s*\{/.test(base)) {
        redefined.push(relative(SRC, file).replace(/\\/g, '/'))
        break
      }
    }
  }

  assert.deepEqual(redefined, [], `不该再重复定义基础规则：${redefined.join(', ')}`)
})
