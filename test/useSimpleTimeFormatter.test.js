import test from 'node:test'
import assert from 'node:assert/strict'

import {
  formatISOTime,
  parseISOTime,
  getChineseWeekday,
  getRelativeTime,
  convertTimezone,
  isValidISOTime,
  getFriendlyTime,
  toDateTime,
  toDate,
  toTime,
  toChineseDate,
} from '../src/hooks/useSimpleTimeFormatter/index.js'

// 固定输入，避免依赖当前时间
const ISO = '2026-03-15T02:10:10.602Z' // 北京时间 2026-03-15 10:10:10

test('formatISOTime：按 Asia/Shanghai 转成默认格式', () => {
  assert.equal(formatISOTime(ISO), '2026-03-15 10:10:10')
})

test('formatISOTime：支持自定义格式与时区', () => {
  assert.equal(formatISOTime(ISO, 'YYYY/MM/DD', 'Asia/Shanghai'), '2026/03/15')
  assert.equal(formatISOTime(ISO, 'HH:mm', 'UTC'), '02:10')
})

test('formatISOTime：空输入返回空串', () => {
  assert.equal(formatISOTime(''), '')
  assert.equal(formatISOTime(null), '')
  assert.equal(formatISOTime(undefined), '')
})

test('parseISOTime：返回多种格式与时间戳', () => {
  const parsed = parseISOTime(ISO)

  assert.equal(parsed.date, '2026-03-15')
  assert.equal(parsed.dateCN, '2026年03月15日')
  assert.equal(parsed.time, '10:10:10')
  assert.equal(parsed.timeShort, '10:10')
  assert.equal(parsed.weekdayCN, '星期日')
  assert.equal(typeof parsed.timestamp, 'number')
  assert.equal(parsed.timestampSeconds, Math.floor(parsed.timestamp / 1000))
})

test('parseISOTime：空输入返回 null', () => {
  assert.equal(parseISOTime(''), null)
  assert.equal(parseISOTime(null), null)
})

test('parseISOTime：季度计算正确（3/6/9/12 月分别为 1/2/3/4 季度）', () => {
  // 这是一处修复过的缺陷：原式 Math.ceil(month()/3)+1 会整体偏大 1
  const cases = [
    ['2026-01-15T00:00:00Z', 1],
    ['2026-03-15T00:00:00Z', 1],
    ['2026-04-15T00:00:00Z', 2],
    ['2026-06-15T00:00:00Z', 2],
    ['2026-07-15T00:00:00Z', 3],
    ['2026-09-15T00:00:00Z', 3],
    ['2026-10-15T00:00:00Z', 4],
    ['2026-12-15T00:00:00Z', 4],
  ]

  for (const [iso, expected] of cases) {
    assert.equal(parseISOTime(iso).quarter, expected, `季度错误: ${iso}`)
  }
})

test('getRelativeTime：返回相对时间而不是空串（插件已静态注册）', () => {
  // 修复前该函数恒返回 ''，因为动态 import 注册插件后立刻同步调用 fromNow()
  const threeMinutesAgo = new Date(Date.now() - 3 * 60 * 1000).toISOString()
  const result = getRelativeTime(threeMinutesAgo)

  assert.notEqual(result, '', 'getRelativeTime 不应为空串')
  assert.equal(typeof result, 'string')
  assert.match(result, /分钟|秒|前/)
})

test('getRelativeTime：一天前也能给出描述', () => {
  const yesterday = new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString()
  assert.notEqual(getRelativeTime(yesterday), '')
})

test('getRelativeTime：空输入或非法输入返回空串而不抛错', () => {
  assert.equal(getRelativeTime(''), '')
  assert.equal(getRelativeTime('not-a-date'), '')
})

test('getChineseWeekday：索引映射到中文星期', () => {
  assert.equal(getChineseWeekday(0), '星期日')
  assert.equal(getChineseWeekday(1), '星期一')
  assert.equal(getChineseWeekday(6), '星期六')
})

test('convertTimezone：UTC 转北京时间', () => {
  assert.equal(convertTimezone(ISO, 'UTC', 'Asia/Shanghai'), '2026-03-15 10:10:10')
})

test('convertTimezone：空输入返回空串', () => {
  assert.equal(convertTimezone(''), '')
})

test('isValidISOTime：校验 ISO 形字符串', () => {
  assert.equal(isValidISOTime(ISO), true)
  assert.equal(isValidISOTime('2026-03-15'), false)
  assert.equal(isValidISOTime('not-a-date'), false)
  assert.equal(isValidISOTime(''), false)
})

test('getFriendlyTime：今天只显示时间', () => {
  const todayNoon = new Date()
  todayNoon.setHours(12, 0, 0, 0)
  // 用本地时间构造，函数内部同样按本地比较
  assert.equal(getFriendlyTime(todayNoon.toISOString()), '12:00')
})

test('getFriendlyTime：一周以前显示完整日期', () => {
  const old = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
  assert.match(getFriendlyTime(old.toISOString()), /^\d{4}-\d{2}-\d{2}$/)
})

test('getFriendlyTime：空输入返回空串', () => {
  assert.equal(getFriendlyTime(''), '')
})

test('快捷函数：toDateTime / toDate / toTime / toChineseDate', () => {
  assert.equal(toDateTime(ISO), '2026-03-15 10:10:10')
  assert.equal(toDate(ISO), '2026-03-15')
  assert.equal(toTime(ISO), '10:10:10')
  assert.equal(toChineseDate(ISO), '2026年03月15日')
})

test('formatISOTime：Invalid Date 输入返回空串（避免渲染成 NaN）', () => {
  // 卡密表格曾用 new Date() + 手工拼接，Invalid Date 会渲染成 "NaN年NaN月NaN日"
  assert.equal(formatISOTime('not-a-date'), '')
})
