/**
 * 邮件与消息中心的前端常量测试
 *
 * 这一组常量的价值不在于「有个中文名」，而在于它们是**后端枚举在前端的唯一投影**：
 *   - `NOTIFICATION_LEVELS` 的 key 必须等于 `notifications_level_check` 的取值；
 *   - `LOG_STATUS_LABELS` 的 key 必须等于 `mail_outbox_status_check` 的取值；
 *   - `PREFERENCE_KEYS` 必须等于 `notification_preferences` 的六个开关列。
 *
 * 所以这里**直接读服务端迁移文件**做交叉断言，而不是把期望值抄一份在前端 ——
 * 抄一份就等于把「两份事实」的问题从代码搬到了测试里，两边一起改错照样通不过。
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

/** 抽取 `CONSTRAINT <name> CHECK (col IN ('a','b',…))` 里的取值列表 */
function checkValues(constraintName) {
  const re = new RegExp(`CONSTRAINT\\s+${constraintName}\\s+CHECK\\s*\\([^)]*?IN\\s*\\(([^)]*)\\)`, 's')
  const hit = migrationSql.match(re)
  assert.ok(hit, `迁移文件里应能找到 ${constraintName}（改名后请同步本测试）`)
  return [...hit[1].matchAll(/'([^']+)'/g)].map((m) => m[1])
}

/** 抽取 `notification_preferences` 建表语句里的列名 */
function preferenceColumns() {
  const table = migrationSql.match(
    /CREATE TABLE IF NOT EXISTS sstc\.notification_preferences\s*\(([\s\S]*?)\n\);/
  )
  assert.ok(table, '迁移文件里应有 notification_preferences 的建表语句')
  return [...table[1].matchAll(/^\s{4}(\w+)\s+BOOLEAN/gm)].map((m) => m[1])
}

const { MAIL_TABS, NOTIFICATION_LEVELS, PREFERENCE_ITEMS, PREFERENCE_KEYS } = await import(
  '../src/constants/mail.js'
)
const { mailLogStatusLabel, mailLogStatusTag, notificationTypeLabel } = await import(
  '../src/constants/mail.js'
)

// ── 分区 ─────────────────────────────────────────────────────

test('MAIL_TABS：三个分区，值唯一、文案非空，通知在第一位', () => {
  assert.deepEqual(
    MAIL_TABS.map((t) => t.value),
    ['messages', 'preferences', 'log']
  )
  for (const tab of MAIL_TABS) {
    assert.ok(tab.label && tab.label.trim(), `${tab.value} 应有中文名`)
  }
  assert.equal(new Set(MAIL_TABS.map((t) => t.value)).size, MAIL_TABS.length)
})

// ── 通知级别 ─────────────────────────────────────────────────

test('NOTIFICATION_LEVELS：与 notifications_level_check 的取值严格一致', () => {
  const dbLevels = checkValues('notifications_level_check')
  assert.deepEqual(Object.keys(NOTIFICATION_LEVELS).sort(), [...dbLevels].sort())
})

test('NOTIFICATION_LEVELS：每个级别都有文案与 u-tag 变体，且变体在共享样式里有定义', () => {
  const globalCss = readFileSync(join(WEB_ROOT, 'src/assets/styles/global.css'), 'utf8')
  for (const [level, meta] of Object.entries(NOTIFICATION_LEVELS)) {
    assert.ok(meta.label && meta.label.trim(), `${level} 缺中文文案`)
    assert.match(meta.tag, /^u-tag--[a-z]+$/, `${level} 的 tag 必须是 u-tag--* 变体`)
    // 变体不存在时标签会静默退化成基础灰底 —— 那种错没有任何报错，只能靠这里挡
    assert.match(globalCss, new RegExp(`\\${meta.tag}\\s*\\{`), `共享样式里缺 ${meta.tag}`)
  }
})

// ── 通知类型分组名 ───────────────────────────────────────────

test('notificationTypeLabel：精确表命中', () => {
  assert.equal(notificationTypeLabel('order_created'), '订单')
  assert.equal(notificationTypeLabel('order_completed'), '订单')
  assert.equal(notificationTypeLabel('member_activated'), '会员')
  assert.equal(notificationTypeLabel('member_expiring'), '会员')
  assert.equal(notificationTypeLabel('points_expiring'), '积分')
  assert.equal(notificationTypeLabel('points_checkin'), '签到')
  assert.equal(notificationTypeLabel('coupon_expiring'), '优惠券')
  assert.equal(notificationTypeLabel('support_reply'), '客服')
  assert.equal(notificationTypeLabel('feedback_received'), '客服')
  assert.equal(notificationTypeLabel('feedback_reply'), '客服')
})

test('notificationTypeLabel：未登记的类型按前缀兜底，不裸露英文键', () => {
  assert.equal(notificationTypeLabel('order_refunded'), '订单')
  assert.equal(notificationTypeLabel('member_renewed'), '会员')
  assert.equal(notificationTypeLabel('points_granted'), '积分')
  assert.equal(notificationTypeLabel('coupon_issued'), '优惠券')
  assert.equal(notificationTypeLabel('support_closed'), '客服')
})

test('notificationTypeLabel：认不出与空值时给「系统」而不是空串', () => {
  for (const value of ['', null, undefined, 'unknown_thing', 'hero']) {
    assert.equal(notificationTypeLabel(value), '系统')
  }
})

test('分组前缀覆盖后端真正用来判偏好的那几类（order/member/points/coupon/support）', () => {
  // 迁移文件里 enqueue_notification 的邮件闸门是按这几个前缀分流的：
  //   AND (p_type NOT LIKE 'order%' OR v_prefs.order_enabled) …
  // 前端分组名如果漏了某一类，用户就会在列表里看到「系统」而邮件开关是关着的。
  const gate = [...migrationSql.matchAll(/p_type\s+NOT\s+LIKE\s+'(\w+)%'/g)].map((m) => m[1])
  assert.ok(gate.length >= 5, `应能解析出邮件闸门前缀，实际：${gate.join(',')}`)

  for (const prefix of gate) {
    const sample = `${prefix}_something_new`
    assert.notEqual(
      notificationTypeLabel(sample),
      '系统',
      `${prefix}_* 会被后端按 ${prefix} 类分流，前端必须认得这个前缀`
    )
  }
})

// ── 邮件台账状态 ─────────────────────────────────────────────

test('mailLogStatusLabel：取值集合与 mail_outbox_status_check 一致，且都有中文名', () => {
  const dbStatuses = checkValues('mail_outbox_status_check')
  assert.deepEqual([...dbStatuses].sort(), ['canceled', 'failed', 'queued', 'sending', 'sent', 'suppressed'])

  for (const status of dbStatuses) {
    const label = mailLogStatusLabel(status)
    assert.notEqual(label, '未知', `status=${status} 应有中文名`)
  }

  // 反向：中文名表里不能有 DB 不存在的状态（那是无人能产生的死文案）
  for (const status of ['queued', 'sending', 'sent', 'failed', 'suppressed', 'canceled']) {
    assert.ok(dbStatuses.includes(status), `${status} 不在数据库约束里`)
  }

  assert.equal(mailLogStatusLabel('not-a-status'), '未知')
  assert.equal(mailLogStatusLabel(undefined), '未知')
})

test('mailLogStatusTag：成功/失败/未发送/进行中的色板分配', () => {
  assert.equal(mailLogStatusTag('sent'), 'u-tag--success')
  assert.equal(mailLogStatusTag('failed'), 'u-tag--danger')
  assert.equal(mailLogStatusTag('suppressed'), 'u-tag--muted')
  assert.equal(mailLogStatusTag('canceled'), 'u-tag--muted')
  assert.equal(mailLogStatusTag('queued'), 'u-tag--info')
  assert.equal(mailLogStatusTag('sending'), 'u-tag--info')
  // 未知状态给中性色，免得出现「认不出却标红」的假警报
  assert.equal(mailLogStatusTag('weird'), 'u-tag--info')

  const globalCss = readFileSync(join(WEB_ROOT, 'src/assets/styles/global.css'), 'utf8')
  for (const tag of ['u-tag--success', 'u-tag--danger', 'u-tag--muted', 'u-tag--info']) {
    assert.match(globalCss, new RegExp(`\\.${tag}\\s*\\{`), `共享样式里缺 .${tag}`)
  }
})

// ── 通知偏好开关 ─────────────────────────────────────────────

test('PREFERENCE_ITEMS：六个开关与 notification_preferences 的列一一对应且顺序一致', () => {
  assert.deepEqual(PREFERENCE_KEYS, preferenceColumns())
  assert.deepEqual(
    PREFERENCE_KEYS,
    ['email_enabled', 'order_enabled', 'member_enabled', 'points_enabled', 'coupon_enabled', 'support_enabled']
  )
})

test('PREFERENCE_ITEMS：每项都有文案与说明，且只有 email_enabled 是总开关', () => {
  assert.equal(PREFERENCE_ITEMS.length, 6)
  for (const item of PREFERENCE_ITEMS) {
    assert.ok(item.label && item.label.trim(), `${item.key} 缺中文名`)
    assert.ok(item.desc && item.desc.trim(), `${item.key} 缺说明（用户看不懂开关边界）`)
  }
  const masters = PREFERENCE_ITEMS.filter((item) => item.master).map((item) => item.key)
  assert.deepEqual(masters, ['email_enabled'], '总开关只能有一个，且必须是 email_enabled')
})

test('总开关的说明必须写明「站内通知不受影响」这类边界', () => {
  // 后端 enqueue_notification 是 email_enabled AND 分项：总开关关掉后邮件全停、
  // 站内照落。界面上不写清楚，用户会把它当成「关掉消息」。
  const master = PREFERENCE_ITEMS.find((item) => item.key === 'email_enabled')
  assert.match(master.desc, /站内通知/)
  assert.match(master.desc, /总开关/)
})

test('分项开关的前缀都能在迁移文件里找到对应的邮件闸门', () => {
  const gate = new Set([...migrationSql.matchAll(/p_type\s+NOT\s+LIKE\s+'(\w+)%'/g)].map((m) => m[1]))
  for (const key of PREFERENCE_KEYS) {
    if (key === 'email_enabled') continue
    const prefix = key.replace(/_enabled$/, '')
    assert.ok(gate.has(prefix), `开关 ${key} 在服务端没有对应的闸门（${prefix}%），它就是装饰品`)
  }
})

/**
 * 页面草稿的键必须来自常量（1.6.0）
 *
 * `Mail.vue` 原先把六个键在 `reactive({...})` 里又抄了一遍。常量加了第七个开关时，
 * 草稿里没有它 → 那个开关既读不到已保存值、也存不下去，而**没有任何报错**。
 * 现在草稿由 `PREFERENCE_KEYS` 生成，这里静态复核源码里不再出现第二份键清单。
 */
test('Mail.vue 的偏好草稿由 PREFERENCE_KEYS 生成，源码里不再硬编码六个键', () => {
  const source = readFileSync(join(WEB_ROOT, 'src/pages/Mail.vue'), 'utf8')

  assert.match(
    source,
    /Object\.fromEntries\(PREFERENCE_KEYS\.map/,
    'Mail.vue 应使用 Object.fromEntries(PREFERENCE_KEYS.map(...)) 初始化草稿'
  )

  // 草稿初始化块里不允许再出现 `xxx_enabled: false` 这种字面量键
  const literal = source.match(/^\s{2}\w+_enabled:\s*false,?$/gm) || []
  assert.deepEqual(literal, [], `Mail.vue 里仍有硬编码的开关键：\n${literal.join('\n')}`)
})
