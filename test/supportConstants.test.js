/**
 * 客服中心的前端常量测试
 *
 * 与 `mailConstants.test.js` 同一套路：这些常量的价值不在于「有个中文名」，
 * 而在于它们是**服务端枚举在前端的唯一投影**。分类、状态、作者、来源四组取值
 * 在数据库里都有 CHECK 约束，前端一旦多一个或少一个，症状是「页面上写着别的页
 * 找不到的状态」或者「用户提交的分类被静默改成 other」—— 两种都不报错。
 *
 * 所以这里直接读服务端的迁移文件与 `src/utils/notification.js` 做交叉断言，
 * 而不是把期望值抄一份到前端测试里：抄一份只是把「两份事实」从代码搬进测试，
 * 两边一起改错照样通不过。
 */
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const WEB_ROOT = join(__dirname, '..')
const SERVER_ROOT = join(WEB_ROOT, '..', 'starry-sky-trading-company-server')
const MIGRATION = join(SERVER_ROOT, 'docs', 'migrations', '2026-10-13-add-mail-support.sql')

const migrationSql = readFileSync(MIGRATION, 'utf8')
const serverNotification = readFileSync(
  join(SERVER_ROOT, 'src', 'utils', 'notification.js'),
  'utf8'
)
const globalCss = readFileSync(join(WEB_ROOT, 'src/assets/styles/global.css'), 'utf8')

/** 抽取 `CONSTRAINT <name> CHECK (col IN ('a','b',…))` 里的取值列表 */
function checkValues(constraintName) {
  const re = new RegExp(`CONSTRAINT\\s+${constraintName}\\s+CHECK\\s*\\([^)]*?IN\\s*\\(([^)]*)\\)`, 's')
  const hit = migrationSql.match(re)
  assert.ok(hit, `迁移文件里应能找到 ${constraintName}（改名后请同步本测试）`)
  return [...hit[1].matchAll(/'([^']+)'/g)].map((m) => m[1])
}

/** 抽取服务端 `const NAME = 123;` 这类数字常量 */
function serverNumber(name) {
  const hit = serverNotification.match(new RegExp(`const\\s+${name}\\s*=\\s*(\\d+)`))
  assert.ok(hit, `服务端应定义 ${name}（改名后请同步本测试）`)
  return Number(hit[1])
}

const {
  SUPPORT_AUTHOR_LABELS,
  SUPPORT_AUTHOR_VALUES,
  SUPPORT_CATEGORIES,
  SUPPORT_CATEGORY_FALLBACK,
  SUPPORT_CATEGORY_VALUES,
  SUPPORT_LIMITS,
  SUPPORT_SOURCE_LABELS,
  SUPPORT_SOURCE_VALUES,
  SUPPORT_STATUSES,
  SUPPORT_STATUS_VALUES,
  SUPPORT_TABS,
  supportAuthorLabel,
  supportCategoryLabel,
  supportSourceLabel,
  supportStatusLabel,
  supportStatusTag,
  supportUnreadLabel,
} = await import('../src/constants/support.js')

const { ICONS } = await import('../src/utils/iconSet.js')

const sorted = (list) => [...list].sort()

// ── 页签 ─────────────────────────────────────────────────────

test('SUPPORT_TABS：两个页签（提交在前），取值唯一、文案非空', () => {
  assert.deepEqual(
    SUPPORT_TABS.map((tab) => tab.value),
    ['submit', 'threads']
  )
  assert.equal(new Set(SUPPORT_TABS.map((tab) => tab.value)).size, SUPPORT_TABS.length)
  for (const tab of SUPPORT_TABS) {
    assert.ok(tab.label && tab.label.trim(), `${tab.value} 缺中文名`)
  }
})

// ── 分类 ─────────────────────────────────────────────────────

test('SUPPORT_CATEGORIES：取值与 support_threads_category_check 严格一致', () => {
  assert.deepEqual(sorted(SUPPORT_CATEGORY_VALUES), sorted(checkValues('support_threads_category_check')))
})

test('SUPPORT_CATEGORIES：取值与服务端 SUPPORT_CATEGORIES 严格一致', () => {
  const hit = serverNotification.match(/const\s+SUPPORT_CATEGORIES\s*=\s*\[([^\]]*)\]/)
  assert.ok(hit, '服务端应定义 SUPPORT_CATEGORIES')
  const serverCategories = [...hit[1].matchAll(/'([^']+)'/g)].map((m) => m[1])
  assert.deepEqual(sorted(SUPPORT_CATEGORY_VALUES), sorted(serverCategories))
})

test('SUPPORT_CATEGORIES：每项都有中文名与真实存在的图标', () => {
  const labels = SUPPORT_CATEGORIES.map((item) => item.label)
  for (const item of SUPPORT_CATEGORIES) {
    assert.ok(item.label && item.label.trim(), `${item.value} 缺中文名`)
    // 图标名写错不会报错，只会渲染一个空 svg —— 只能在这里挡
    assert.ok(ICONS[item.icon], `${item.value} 的图标 ${item.icon} 不在 iconSet 里`)
  }
  assert.equal(new Set(labels).size, labels.length, '分类中文名不应重复')
  // 标签里出现英文键说明翻译表漏了一项
  for (const label of labels) {
    assert.doesNotMatch(label, /^[a-z_]+$/, '分类名不应是英文键')
  }
})

test('SUPPORT_CATEGORY_FALLBACK：等于 other 分类的中文名', () => {
  const other = SUPPORT_CATEGORIES.find((item) => item.value === 'other')
  assert.equal(SUPPORT_CATEGORY_FALLBACK, other.label)
})

// ── 会话状态 ─────────────────────────────────────────────────

test('SUPPORT_STATUSES：取值与 support_threads_status_check 严格一致', () => {
  assert.deepEqual(sorted(SUPPORT_STATUS_VALUES), sorted(checkValues('support_threads_status_check')))
})

test('SUPPORT_STATUSES：每个状态都有中文名与真实存在的 u-tag 变体', () => {
  for (const [status, meta] of Object.entries(SUPPORT_STATUSES)) {
    assert.ok(meta.label && meta.label.trim(), `${status} 缺中文名`)
    assert.match(meta.tag, /^u-tag--[a-z]+$/, `${status} 的 tag 必须是 u-tag--* 变体`)
    // 变体不存在时标签会静默退化成基础灰底，没有报错
    assert.match(globalCss, new RegExp(`\\${meta.tag}\\s*\\{`), `共享样式里缺 ${meta.tag}`)
  }
})

// ── 消息作者与来源 ───────────────────────────────────────────

test('SUPPORT_AUTHOR_LABELS：取值与 support_messages_author_check 严格一致', () => {
  assert.deepEqual(sorted(SUPPORT_AUTHOR_VALUES), sorted(checkValues('support_messages_author_check')))
})

test('SUPPORT_SOURCE_LABELS：取值与 support_messages_source_check 严格一致', () => {
  assert.deepEqual(sorted(SUPPORT_SOURCE_VALUES), sorted(checkValues('support_messages_source_check')))
})

test('作者与来源：每项中文名非空且不重复', () => {
  for (const table of [SUPPORT_AUTHOR_LABELS, SUPPORT_SOURCE_LABELS]) {
    const labels = Object.values(table)
    for (const label of labels) assert.ok(label && label.trim(), '中文名不应为空')
    assert.equal(new Set(labels).size, labels.length, '中文名不应重复')
  }
})

// ── 字段上限 ─────────────────────────────────────────────────

test('SUPPORT_LIMITS：三个文本上限与服务端常量逐一对齐', () => {
  assert.equal(SUPPORT_LIMITS.subject, serverNumber('MAX_SUBJECT_LENGTH'))
  assert.equal(SUPPORT_LIMITS.body, serverNumber('MAX_BODY_LENGTH'))
  assert.equal(SUPPORT_LIMITS.message, serverNumber('MAX_MESSAGE_LENGTH'))
})

test('SUPPORT_LIMITS：subject 上限同时等于 support_threads.subject 的列宽', () => {
  const hit = migrationSql.match(/support_threads\s*\(([\s\S]*?)\n\);/)
  assert.ok(hit, '迁移文件里应有 support_threads 建表语句')
  const columnWidth = (name) => {
    const m = hit[1].match(new RegExp(`${name}\\s+VARCHAR\\((\\d+)\\)`))
    assert.ok(m, `support_threads 应有 ${name} 列`)
    return Number(m[1])
  }
  assert.equal(SUPPORT_LIMITS.subject, columnWidth('subject'))
  assert.equal(SUPPORT_LIMITS.email, columnWidth('contact_email'))
})

// ── 邮箱校验口径 ─────────────────────────────────────────────

test('邮箱正则：页面里的校验与服务端 EMAIL_PATTERN 同源', () => {
  const serverPattern = serverNotification.match(/const\s+EMAIL_PATTERN\s*=\s*(\/.*?\/);/)?.[1]
  assert.ok(serverPattern, '服务端应定义 EMAIL_PATTERN')

  const page = readFileSync(join(WEB_ROOT, 'src/pages/Support.vue'), 'utf8')
  assert.ok(
    page.includes(`const EMAIL_PATTERN = ${serverPattern}`),
    `Support.vue 的邮箱正则应与服务端一致：${serverPattern}\n` +
      '（前端只做「明显打错」的第一道拦截，口径不一致时放行/误拦的都是用户）'
  )
})

// ── 兜底与角标 ───────────────────────────────────────────────

test('兜底：认不出的取值一律给中文，不裸露英文键', () => {
  assert.equal(supportCategoryLabel('mystery'), SUPPORT_CATEGORY_FALLBACK)
  assert.equal(supportCategoryLabel(undefined), SUPPORT_CATEGORY_FALLBACK)
  assert.equal(supportStatusLabel('mystery'), SUPPORT_STATUSES.closed.label)
  assert.equal(supportStatusLabel(null), SUPPORT_STATUSES.closed.label)
  assert.equal(supportStatusTag('mystery'), 'u-tag--muted')
  assert.equal(supportAuthorLabel('mystery'), SUPPORT_AUTHOR_LABELS.system)
  assert.equal(supportSourceLabel('mystery'), SUPPORT_SOURCE_LABELS.system)
})

test('已知取值：翻译走精确表，不被兜底吞掉', () => {
  assert.equal(supportCategoryLabel('order'), '订单问题')
  assert.equal(supportStatusLabel('open'), '待客服回复')
  assert.equal(supportStatusTag('open'), 'u-tag--warning')
  assert.equal(supportAuthorLabel('staff'), '客服')
  assert.equal(supportSourceLabel('admin'), '运营后台')
})

test('supportUnreadLabel：0 与负数不显示，超过 99 收敛成 99+', () => {
  assert.equal(supportUnreadLabel(0), '')
  assert.equal(supportUnreadLabel(-3), '')
  assert.equal(supportUnreadLabel(1), '1')
  assert.equal(supportUnreadLabel(99), '99')
  assert.equal(supportUnreadLabel(100), '99+')
  assert.equal(supportUnreadLabel('12'), '12')
})
