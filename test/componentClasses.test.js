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

/** 递归列出 src 下的 .vue / .css / .js（.js 用于核对动态拼出的类名字面量） */
function walk(dir, out = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) walk(full, out)
    else if (/\.(vue|css|js|mjs)$/.test(entry.name)) out.push(full)
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

/**
 * 设计系统前缀（`u-` / `ui-`）的类名必须真的存在。
 *
 * 上面的守卫只挡「定义在**别的组件**里」，对「任何地方都没有定义」是放过的
 * （本项目有一批纯语义类名，如 `.cart-page` —— 它们本来就不产生样式）。
 * 但 `u-` / `ui-` 是设计系统的保留前缀，这个前缀的类名**只会**来自共享样式：
 * 模板里写了一个不存在的 `u-` 类，几乎一定是拼错或改名漏改。
 *
 * 曾经就是如此：`.u-card` 与 `.u-btn` 两个字面量在 5 个会员 / 积分页面里
 * 从未有过定义，卡片与按钮的整套外观（底色、圆角、阴影、内边距）静默失效
 * —— 不报错、不留痕、grep 还能搜到，只有真机能看出来。
 */
test('设计系统前缀 u- / ui- 的类名必须在共享样式或本组件样式里存在', () => {
  const { files, shared, own } = collect()
  const offenders = []

  for (const file of files) {
    if (!file.endsWith('.vue')) continue
    const text = readFileSync(file, 'utf8')
    const tpl = text.match(/<template>([\s\S]*)<\/template>/)
    if (!tpl) continue

    const rel = relative(SRC, file).replace(/\\/g, '/')
    const mine = own.get(file) || new Set()

    for (const name of classesUsedInTemplate(tpl[1])) {
      if (!/^ui?-/.test(name)) continue
      if (shared.has(name) || mine.has(name)) continue
      offenders.push(`${rel} -> .${name}`)
    }
  }

  assert.deepEqual(
    offenders,
    [],
    `这些设计系统类名在任何 CSS 里都没有定义，在本组件里等于零样式：\n  ${offenders.join('\n  ')}\n` +
      '修法二选一：在共享样式里补上它（若它确实是设计系统的一部分），或改用已存在的类名。'
  )
})

/**
 * JS 里映射出来的标签变体同样要有定义。
 *
 * 模板扫描看不到 `u-tag--${variant}` 这种动态类名 —— `.u-tag--muted` 正是这样
 * 漏掉的：`STATUS_VARIANT.disabled = 'muted'`，而 global.css 的标签族里只有
 * accent / success / warning / danger / info，于是「已禁用」状态静默退化成
 * 中性标签。当时的测试还精确断言了这个不存在的类名，形成假绿。
 */
test('状态标签变体映射里的每个变体都有 CSS 定义', () => {
  const { shared } = collect()
  const source = readFileSync(join(SRC, 'hooks/useKamiDisplay/index.js'), 'utf8')
  const block = source.match(/STATUS_VARIANT\s*=\s*\{([\s\S]*?)\}/)

  assert.ok(block, '应当能读到 STATUS_VARIANT 的定义（它改名后请同步本测试）')

  const missing = []
  for (const m of block[1].matchAll(/:\s*'([a-z][a-z-]*)'/g)) {
    const cls = `u-tag--${m[1]}`
    if (!shared.has(cls)) missing.push(cls)
  }

  assert.deepEqual(
    missing,
    [],
    `这些标签变体在共享样式里没有定义，落到页面上会静默退化成基础 .u-tag：${missing.join(', ')}`
  )
})

/**
 * 窄页族（会员 / 积分）的宽度契约。
 *
 * 这一族是「一条主叙事 + 若干信息块」的阅读型版式，宽度**只能**由
 * `.page-shell--narrow` 消费一条令牌（`--container-page-narrow`）决定。
 * 页面自己再写一个 `max-width`，同族页面在宽屏上就会各走各的比例 ——
 * 2026-10-12 之前的状态正是如此：六个页面都写着 `.page-shell--narrow`，
 * 但该修饰类在任何 CSS 里都没有定义，于是它们按 `--container-max`（1320）
 * 全宽渲染，与设计意图不符且不报任何错。
 *
 * 另外两处相邻的坑，这个用例一并挡住：
 *   - 令牌被换成固定值（失去「随视口收敛」的比例语义）；
 *   - 有人把 `--container-narrow` 直接改成流体值 —— 它同时是 2FA / Hero /
 *     KamiSection / NotFound 里 6 处 `calc(var(--container-narrow) * N)` 的
 *     **固定基准**，改掉会让那些派生宽度随视口漂移。
 */
const NARROW_PAGE_FAMILY = [
  'pages/Member.vue',
  'pages/MemberPlans.vue',
  // 会员中心的详情子页与枢纽同一族：同一套「一条主叙事 + 若干信息块」版式
  'pages/MemberBenefits.vue',
  'pages/MemberGrowth.vue',
  'pages/Points.vue',
  // 签到移到个人中心（`/user/checkin`），权限归属变了，版式仍属这一族
  'pages/UserCheckin.vue',
  'pages/Coupons.vue',
  // 消息中心与上面几页同一族：一条主叙事（通知流）+ 若干信息块（偏好 / 邮件台账），
  // 宽度同样只能来自 .page-shell--narrow
  'pages/Mail.vue',
  // 客服中心：提交表单 + 会话流 + 详情，同族；页面本身**对游客开放**，
  // 与上面几个必须登录的页面在权限上不同族，但版式上仍是窄页
  'pages/Support.vue',
]

test('窄页族宽度契约：用 page-shell--narrow，且不得自设 max-width', () => {
  const globalCss = readFileSync(join(SRC, 'assets/styles/global.css'), 'utf8')
  const variablesCss = readFileSync(join(SRC, 'assets/styles/variables.css'), 'utf8')

  assert.match(
    variablesCss,
    /--container-page-narrow:\s*clamp\(/,
    'variables.css 应定义 --container-page-narrow，且必须是 clamp() 流体值'
  )
  assert.match(
    globalCss,
    /\.page-shell--narrow\s*\{\s*max-width:\s*var\(--container-page-narrow\)/,
    '.page-shell--narrow 必须消费 --container-page-narrow（唯一宽度出口）'
  )

  const missing = []
  const offenders = []

  for (const rel of NARROW_PAGE_FAMILY) {
    const full = join(SRC, rel)
    assert.ok(existsSync(full), `${rel} 应存在`)

    const text = readFileSync(full, 'utf8')
    const tpl = text.match(/<template>([\s\S]*)<\/template>/)?.[1] || ''
    if (!/class="[^"]*\bpage-shell--narrow\b/.test(tpl)) missing.push(rel)

    for (const block of [...text.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)].map((m) => m[1])) {
      // 先去掉注释（说明里提到 max-width 不算），再去掉媒体查询（断点覆写允许）
      const base = stripMediaQueries(block.replace(/\/\*[\s\S]*?\*\//g, ''))
      for (const m of base.matchAll(/max-width:\s*([^;]+);/g)) {
        offenders.push(`${rel} -> max-width: ${m[1].trim()}`)
      }
    }
  }

  assert.deepEqual(
    missing,
    [],
    `这些页面必须带 page-shell--narrow（整族宽度的唯一出口）：${missing.join(', ')}`
  )
  assert.deepEqual(
    offenders,
    [],
    `窄页族的基础规则里不得自设 max-width，宽度只能来自 .page-shell--narrow：\n  ${offenders.join('\n  ')}`
  )
})
