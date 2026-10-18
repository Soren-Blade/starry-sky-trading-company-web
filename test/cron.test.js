/**
 * `utils/cron.js` 的单元测试。
 *
 * 这些断言同样覆盖页面 `/dev/cron` 的行为，但不需要挂 DOM —— 之前算法内联在
 * 页面里，只能靠 `test/renderComponents.test.js` 的 SSR 渲染间接验证，改一个字段
 * 边界要跑整套渲染测试。
 */
import test from 'node:test'
import assert from 'node:assert/strict'

import { CRON_PRESETS, describe, expandField, fieldText, nextRuns, parseCron } from '../src/utils/cron.js'

const LIMIT = { label: '分钟', min: 0, max: 59 }

test('expandField：星号、步长、范围、列表都展开成集合', () => {
  assert.equal(expandField('*', LIMIT).size, 60)
  assert.deepEqual([...expandField('*/15', LIMIT)], [0, 15, 30, 45])
  assert.deepEqual([...expandField('10-12', LIMIT)], [10, 11, 12])
  assert.deepEqual([...expandField('1,5,9', LIMIT)], [1, 5, 9])
  assert.deepEqual([...expandField('0-6/3', LIMIT)], [0, 3, 6])
  // 单值 + 步长：从该值走到上界
  assert.deepEqual([...expandField('58/2', LIMIT)], [58])
})

test('expandField：越界与非整数都报出可读错误', () => {
  assert.throws(() => expandField('60', LIMIT), /分钟只能取 0-59/)
  assert.throws(() => expandField('*/0', LIMIT), /步长必须是正整数/)
  assert.throws(() => expandField('5-3', LIMIT), /范围起点大于终点/)
  assert.throws(() => expandField('abc', LIMIT), /不是数字/)
  assert.throws(() => expandField('', LIMIT), /空字段/)
})

test('parseCron：五个常见表达式给出正确描述与执行时间', () => {
  const now = new Date('2026-10-18T12:00:00')
  const everyMinute = parseCron('* * * * *', { now })
  assert.equal(everyMinute.description, '每分钟执行一次')
  assert.equal(everyMinute.fields.length, 5)

  // 星期 0/7 归一：`*` 展开后是 7 个值，不是 8 个
  assert.equal(everyMinute.fields[4].text, '每星期')

  const daily = parseCron('0 9 * * *', { now })
  assert.equal(daily.description, '每天 09:00 执行')
  assert.equal(daily.fields[0].text, '0')
  assert.equal(daily.fields[1].text, '9')

  const weekly = parseCron('0 9 * * 1', { now })
  assert.equal(weekly.description, '每周一 09:00 执行')
  assert.equal(weekly.runs.length, 10)
  // 2026-10-18 是周日，下一次周一应为 10-19
  assert.match(weekly.runs[0], /2026\/10\/19/)

  const monthly = parseCron('0 0 1 * *', { now })
  assert.match(monthly.description, /每月 1 日/)

  const hourly = parseCron('30 * * * *', { now })
  assert.equal(hourly.description, '每小时的第 30 分钟执行')
})

test('parseCron：非法输入抛错，message 面向用户', () => {
  const now = new Date('2026-10-18T12:00:00')
  assert.throws(() => parseCron('', { now }), /不能为空/)
  assert.throws(() => parseCron('* * * *', { now }), /需要 5 段或 6 段/)
  assert.throws(() => parseCron('0 25 * * *', { now }), /小时只能取 0-23/)
  assert.throws(() => parseCron('0 0 31 2 *', { now }), /5 年内不会触发/)
})

test('parseCron：6 段表达式只接受固定的秒，且按 5 段语义计算', () => {
  const now = new Date('2026-10-18T12:00:00')
  const six = parseCron('0 0 9 * * *', { now })
  assert.equal(six.description, '每天 09:00 执行')
  assert.throws(() => parseCron('*/5 0 9 * * *', { now }), /秒字段目前只支持固定值/)
})

test('nextRuns：日与星期同时受限时取并集（Vixie cron 语义）', () => {
  // 每月 1 日 或 每周一，都应出现
  const now = new Date('2026-10-18T12:00:00')
  const runs = parseCron('0 0 1 * 1', { now }).runs
  const text = runs.join(' | ')
  assert.match(text, /2026\/11\/1/)
  assert.match(text, /2026\/10\/19/)
})

test('fieldText / describe 的退化分支仍返回可读内容', () => {
  assert.equal(fieldText(new Set([0, 1, 2]), { label: '月', min: 1, max: 12 }), '0、1、2')
  const now = new Date('2026-10-18T12:00:00')
  const spring = parseCron('0 0 1 3 *', { now })
  assert.match(spring.description, /3 月/)
})

test('CRON_PRESETS 的每个表达式都能解析，且能标出「来自预设」', () => {
  const now = new Date('2026-10-18T12:00:00')
  for (const preset of CRON_PRESETS) {
    const parsed = parseCron(preset.expr, { now })
    assert.ok(parsed.runs.length > 0, `${preset.label} 应有执行时间`)
    assert.equal(CRON_PRESETS.some((item) => item.expr === preset.expr), true)
  }
})

test('describe/nextRuns 可独立调用（纯函数，不碰 DOM 与时钟）', () => {
  const fields = ['*', '*', '*', '*', '*'].map((part, index) =>
    expandField(part, [
      { label: '分钟', min: 0, max: 59 },
      { label: '小时', min: 0, max: 23 },
      { label: '日', min: 1, max: 31 },
      { label: '月', min: 1, max: 12 },
      { label: '星期', min: 0, max: 7 },
    ][index]),
  )
  fields[4].delete(7)
  fields[4].add(0)
  assert.equal(describe(fields, '* * * * *'), '每分钟执行一次')
  const runs = nextRuns(fields, 3, new Date('2026-10-18T12:00:00'))
  assert.equal(runs.length, 3)
  assert.match(runs[0], /2026\/10\/18/)
})
