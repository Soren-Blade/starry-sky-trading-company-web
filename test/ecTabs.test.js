import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

/**
 * 分区页签已切到设计系统的 `.ec-tabs`
 *
 * 背景：`.u-tabs` 是 1.x 自研套件里的页签，靠 `u-tab--active` 类名 + 自绘下划线
 * 表达选中态；设计系统的 `.ec-tabs__item` 只用 `aria-selected="true"` 一条来源。
 * 两者同时存在时，「选中」会有两个真相（类名与 ARIA 可能不一致），因此这里
 * 把转换过的页面钉住：既要有 EC 类名，也不许再留 `u-tab` 分支。
 *
 * 例外：`Profile.vue` 的导出时间范围是胶囊式分段选择器（`.u-tabs--pill`），
 * 设计系统没有对应变体，继续留在自研套件里 —— 它不是页签。
 */

const __dirname = dirname(fileURLToPath(import.meta.url))
const SRC = join(__dirname, '..', 'src')
const CONVERTED = ['Mail.vue', 'Points.vue', 'Support.vue']

const readPage = (page) => readFileSync(join(SRC, 'pages', page), 'utf8')

/** 注释里提到旧类名不算残留 —— 上一轮就是被自己写的说明文字误伤过 */
const stripComments = (src) => src.replace(/<!--[\s\S]*?-->/g, '').replace(/\/\*[\s\S]*?\*\//g, '')

test('转换过的页面使用 .ec-tabs / .ec-tabs__item', () => {
  for (const page of CONVERTED) {
    const src = readPage(page)

    assert.match(src, /class="ec-tabs[^"]*"[^>]*role="tablist"/, `${page} 缺少 .ec-tabs + role=tablist`)
    assert.match(src, /class="ec-tabs__(?:item)[^"]*"/, `${page} 的页签按钮缺少 .ec-tabs__item`)
    assert.match(src, /role="tab"/, `${page} 的页签按钮缺少 role=tab`)
  }
})

test('选中态只有 ARIA 一条来源，不再有 u-tab--active 类名分支', () => {
  for (const page of CONVERTED) {
    const src = stripComments(readPage(page))

    assert.doesNotMatch(src, /u-tab--active/, `${page} 仍依赖 u-tab--active 类名`)
    assert.doesNotMatch(src, /class="u-tab\b/, `${page} 仍有 .u-tab 旧类名`)
    assert.match(src, /:aria-selected="tab === item\.value \? 'true' : 'false'"/,
      `${page} 的 aria-selected 应显式为字符串，避免渲染出 false 布尔值`)
  }
})

test('Profile 的胶囊分段选择器保留（设计系统没有该变体）', () => {
  const src = readPage('Profile.vue')

  assert.match(src, /u-tabs--pill/, 'Profile 的范围选择器仍是自研胶囊变体')
  assert.doesNotMatch(src, /class="ec-tabs/, 'Profile 未切到 .ec-tabs —— 它不是页签')
})

test('EC 页签的选中指示条由设计系统提供，页面不重复画下划线', () => {
  const ecCss = readFileSync(join(SRC, 'assets', 'ec', 'ec.css'), 'utf8')

  assert.match(ecCss, /\.ec-tabs__item\[aria-selected="true"\]::after/, '设计系统应自带选中指示条')

  for (const page of CONVERTED) {
    const src = readPage(page)
    const styleAt = src.indexOf('<style')
    assert.ok(styleAt > 0, `${page} 应有 scoped 样式块`)

    const style = src.slice(styleAt)
    assert.doesNotMatch(style, /\.ec-tabs__item::after|\.ec-tabs__item\[aria-selected/,
      `${page} 不应重画 EC 页签的指示条`)
  }
})
