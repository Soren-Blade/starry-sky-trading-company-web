import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

/**
 * 4.20.0 抽屉里的语言控件
 *
 * 形态从「一列语言行」改成「左标签 + 右分段」的偏好行：
 * - 与同面板的「外观」一行同构（都是 [ 标签 ][ 控件 ]），两行左边缘对齐；
 * - 分段只放短码（中文 / EN），右半区约 150px，全名在第三种语言时就会换行；
 * - 反馈出口搬去抽屉脚注，并带上当前语言 `?topic=language&from=<locale>`。
 */
const __dirname = dirname(fileURLToPath(import.meta.url))
const WEB_ROOT = join(__dirname, '..')
const read = (relPath) => readFileSync(join(WEB_ROOT, relPath), 'utf8')

const SWITCH = read('src/components/LanguageSwitch.vue')
const NAVBAR = read('src/components/Navbar.vue')

test('抽屉版语言控件是分段单选：radiogroup + 每枚 radio + 短码', () => {
  assert.match(SWITCH, /class="lang-segments" role="radiogroup"/)
  assert.match(SWITCH, /v-for="item in options"[\s\S]*?role="radio"/)
  assert.match(SWITCH, /:aria-checked="current === item\.code"/)
  // 屏幕上是短码，全名走 aria-label（不靠颜色、也不靠长文案区分）
  assert.match(SWITCH, /\{\{ item\.short \}\}/)
  assert.match(SWITCH, /:aria-label="item\.label"/)
})

test('旧的整列语言行彻底退役，不会与分段控件并存', () => {
  assert.doesNotMatch(SWITCH, /class="lang-rows"/)
  assert.doesNotMatch(SWITCH, /\.lang-row\b/)
  assert.doesNotMatch(SWITCH, /lang-row-check/)
})

test('分段控件与同面板的三档外观开关同高同圆角', () => {
  assert.match(SWITCH, /\.lang-segments \{[\s\S]*?border-radius: var\(--radius-pill\);/)
  assert.match(
    SWITCH,
    /\.lang-segment \{[\s\S]*?height: calc\(var\(--ec-control-h-sm\) - 4px\);/
  )
})

test('语言反馈出口在抽屉脚注，并带上当前界面语言', () => {
  assert.match(NAVBAR, /class="drawer-note"/)
  assert.match(
    NAVBAR,
    /:to="\{ path: '\/support', query: \{ topic: 'language', from: locale \} \}"/
  )
  assert.match(NAVBAR, /t\('language\.feedbackTitle'\)/)
  assert.match(NAVBAR, /t\('language\.feedbackCta'\)/)
  // 组件自己不再画那张反馈卡，抽屉只有一条脚注
  assert.doesNotMatch(SWITCH, /class="lang-feedback"/)
})
