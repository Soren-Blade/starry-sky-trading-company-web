import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

/**
 * 4.19.0 语言反馈模式
 *
 * 从语言抽屉的「反馈语言问题」进来时带 `?topic=language`。
 * 约束：反馈分类由服务端 CHECK 钉死（order/member/points/coupon/account/other），
 * 前端**不能**为语言问题新增取值，因此预设只负责把标题与正文骨架填好，
 * 分类统一落到 other —— 这条边界写在这里，避免以后有人顺手加 `language` 分类。
 */

const __dirname = dirname(fileURLToPath(import.meta.url))
const WEB_ROOT = join(__dirname, '..')
const read = (relPath) => readFileSync(join(WEB_ROOT, relPath), 'utf8')

const SUPPORT_PAGE = read('src/pages/Support.vue')
const CONTENT = read('src/constants/content.js')
const SUPPORT_CONSTANTS = read('src/constants/support.js')
const EN_TOOLS = read('src/i18n/locales/en-US/tools.js')

test('语言问题不新增反馈分类：预设统一落到 other', () => {
  assert.doesNotMatch(SUPPORT_CONSTANTS, /value: 'language'/)
  assert.match(SUPPORT_PAGE, /function applyLanguagePreset\(key\) \{[\s\S]*?form\.category = 'other'/)
})

test('?topic=language 才出现预设：三个意图 + 选中态', () => {
  assert.match(SUPPORT_PAGE, /const languageTopic = computed\(\(\) => route\.query\.topic === 'language'\)/)
  assert.match(SUPPORT_PAGE, /<div v-if="languageTopic" class="u-field support-field support-presets">/)
  assert.match(SUPPORT_PAGE, /v-for="preset in LANGUAGE_PRESETS"/)
  assert.match(SUPPORT_PAGE, /:aria-pressed="activePreset === preset\.key"/)
  for (const key of ['missing', 'wrong', 'layout']) {
    assert.match(CONTENT, new RegExp(`${key}: '`), `缺少预设 ${key}`)
  }
})

test('预设把标题与正文骨架填好，用户只补细节', () => {
  assert.match(SUPPORT_PAGE, /form\.subject = SUPPORT\.languageSubjects\[key\] \|\| ''/)
  assert.match(SUPPORT_PAGE, /form\.body = SUPPORT\.languageBodies\[key\] \|\| ''/)
  assert.match(CONTENT, /languageSubjects: \{/)
  assert.match(CONTENT, /languageBodies: \{/)
  // 英文版必须跟着有，否则切到 EN 会回退中文
  assert.match(EN_TOOLS, /languageSubjects: \{/)
  assert.match(EN_TOOLS, /languageBodies: \{/)
})
