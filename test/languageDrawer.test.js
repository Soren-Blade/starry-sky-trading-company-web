import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

/**
 * 4.19.0 抽屉里的语言选择
 *
 * 语言只会增加、不会减少，所以形态必须是「一列可加的行」，不是「一排平分宽度的胶囊」：
 * 两枚胶囊在第三种语言出现时就会掉行，行式列表只增加行数、不改版式。
 * 选中态除颜色外必须有第二个标记（WCAG 1.4.1），这里右侧的勾就是那个标记。
 * 底部还要有一个出口：没有我的语言 / 翻译读着别扭 → /support?topic=language。
 */

const __dirname = dirname(fileURLToPath(import.meta.url))
const WEB_ROOT = join(__dirname, '..')
const read = (relPath) => readFileSync(join(WEB_ROOT, relPath), 'utf8')

const SWITCH = read('src/components/LanguageSwitch.vue')

test('抽屉版是语言行列表：radiogroup + 每行 radio + 右侧勾', () => {
  assert.match(SWITCH, /class="lang-rows" role="radiogroup"/)
  assert.match(SWITCH, /v-for="item in options"[\s\S]*?role="radio"/)
  assert.match(SWITCH, /:aria-checked="current === item\.code"/)
  assert.match(SWITCH, /name="check-circle"/)
  // 旧的分段胶囊必须彻底退役，否则两套语言控件会同时存在
  assert.doesNotMatch(SWITCH, /lang-segments/)
  assert.doesNotMatch(SWITCH, /lang-segment\b/)
})

test('行式列表可以继续加语言：行高 44、只增行数不改版式', () => {
  assert.match(SWITCH, /\.lang-rows \{[\s\S]*?flex-direction: column;/)
  assert.match(SWITCH, /\.lang-row \{[\s\S]*?min-height: var\(--ec-control-h-md\);/)
  assert.match(SWITCH, /\.lang-row\.is-active \{[\s\S]*?background: var\(--accent-soft\);/)
})

test('抽屉底部有一个语言反馈出口，落到客服中心的语言模式', () => {
  assert.match(SWITCH, /class="lang-feedback"/)
  assert.match(SWITCH, /:to="\{ path: '\/support', query: \{ topic: 'language' \} \}"/)
  assert.match(SWITCH, /t\('language\.feedbackTitle'\)/)
  assert.match(SWITCH, /t\('language\.feedbackCta'\)/)
})
