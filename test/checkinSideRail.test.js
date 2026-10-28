/**
 * 2.6.3 · 签到页右侧栏补齐（今日档位进度 / 连签里程碑 / 本月账本）
 *
 * 用户反馈：「右侧内容 checkin-cal-body 上下比较空」。
 * 结论是不加高卡片（高度由 7×64px 的日历格决定，加高只会让留白更大），
 * 而是把右栏做成三段有节奏的侧栏，填充**本来就有**的真实数据。
 *
 * 这里钉住两件事：
 *   1. 进度条的基准点（streak = 0 时不能是满条 —— 实测踩到过）；
 *   2. 右栏三段的模板结构，避免以后又退回「只有一块档位」。
 */
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

import { checkinTierProgress } from '../src/utils/checkinDisplay.js'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const read = (relative) => readFileSync(join(ROOT, relative), 'utf8')

const PAGE = read('src/pages/UserCheckin.vue')

const TIERS = [
  { days: 1, points: 10 },
  { days: 3, points: 15 },
  { days: 7, points: 20 },
]

test('连签进度：streak 为 0 时从 0% 起（不能满条）', () => {
  const { percent, next, reachedDays } = checkinTierProgress(0, TIERS)
  assert.equal(percent, 0, '新用户一进来应该是空条，不是满条')
  assert.equal(next.days, 1, '下一档是第 1 档')
  assert.equal(reachedDays, 0, '没有任何档位达成时基准点是 0')
})

test('连签进度：段内按比例增长，跨档瞬间归零', () => {
  assert.equal(checkinTierProgress(1, TIERS).percent, 0, '刚到第 1 档，离 3 天还差 2 天')
  assert.equal(checkinTierProgress(2, TIERS).percent, 50, '第 1→3 天这一段走了一半')
  assert.equal(checkinTierProgress(3, TIERS).percent, 0, '刚到第 3 档，离 7 天还差 4 天')
  assert.equal(checkinTierProgress(5, TIERS).percent, 50, '第 3→7 天这一段走了一半')
})

test('连签进度：最高档固定 100%，负数与非法输入按 0 处理', () => {
  assert.deepEqual(checkinTierProgress(7, TIERS), { percent: 100, next: null, reachedDays: 7 })
  assert.equal(checkinTierProgress(20, TIERS).percent, 100)
  assert.equal(checkinTierProgress(-3, TIERS).percent, 0)
  assert.equal(checkinTierProgress(undefined, TIERS).percent, 0)
  // 空档位表不该抛错（服务端改配置时前端先崩就难查了）
  assert.equal(checkinTierProgress(3, []).percent, 100)
})

test('右栏由三段组成：今日档位 / 连签里程碑 / 本月账本', () => {
  const aside = PAGE.slice(PAGE.indexOf('<aside class="checkin-cal-side"'))
  const blocks = aside.match(/class="checkin-side-block/g) || []
  assert.equal(blocks.length, 3, '三段：今日档位、连签里程碑、本月账本')

  assert.match(aside, /id="checkin-tiers-title"/)
  assert.match(aside, /连签里程碑/)
  assert.match(aside, /已签天数[\s\S]*最长连签[\s\S]*剩余补签/)

  // 进度条必须由纯函数算出，且带可读的 aria-label
  assert.match(PAGE, /checkinTierProgress\(pointsStore\.streak \|\| 0, TIERS\)/)
  assert.match(aside, /class="checkin-side-progress-bar"[^>]*width/)
  assert.match(aside, /:aria-label="tierProgressLabel"/)
})

test('本月账本的三项数据都来自已有的日历快照，不额外发请求', () => {
  assert.match(PAGE, /const monthLongestStreak = computed\(/)
  assert.match(PAGE, /for \(const day of calendar\.value\?\.days \|\| \[\]\)/)
  assert.match(PAGE, /const replenishLeft = computed\(\(\) => calendar\.value\?\.replenish_left \?\? 0\)/)
  assert.match(PAGE, /\{\{ monthCount \}\}/)
  assert.match(PAGE, /\{\{ monthLongestStreak \}\}/)
  assert.match(PAGE, /\{\{ replenishLeft \}\}/)
})

test('规则入口展开下方 details 并滚过去', () => {
  assert.match(PAGE, /<details ref="rulesRef"/)
  const start = PAGE.indexOf('function openRules')
  const body = PAGE.slice(start, PAGE.indexOf('\n}', start))
  assert.match(body, /el\.open = true/, '必须先展开，否则滚过去是个折着的空壳')
  assert.match(body, /scrollIntoView/)
  assert.match(PAGE, /class="checkin-side-rule-link"[^>]*@click="openRules"/)
})

test('右栏宽度定死 320px，窄屏转单列（不跟着 1fr 无限拉伸）', () => {
  assert.match(PAGE, /grid-template-columns: minmax\(0, auto\) minmax\(0, calc\(var\(--space-unit\) \* 40\)\)/)
  assert.match(PAGE, /@media \(max-width: 767px\)[\s\S]*?\.checkin-cal-body \{\s*grid-template-columns: minmax\(0, 1fr\)/)
})
