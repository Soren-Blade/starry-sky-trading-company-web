/**
 * 积分中心页（`/points`）测试
 *
 * 只做源码断言：列表排版全在 CSS 里，SSR 出来的 HTML 完全一样，
 * 横向还是纵向只能在浏览器里看出来，所以用规则断言把它钉住。
 *
 * 2026-10-16 起这些排版不再写在页面里：流水行 / 任务条目 / 余额块 / 分页壳 /
 * 商城条目统一由 `src/assets/styles/ui-kit-member.css` §15 / §16 / §17 / §4 / §18
 * 提供（575px 单列走 §26），页面只剩「分片没覆盖的两处同行排版」。
 * 因此断言分两半：**分片必须保留这些规则**，**页面不得再长出同名私有规则**
 * （否则「改一处忘另一处」的老问题会原地复活）。
 */
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const POINTS_SOURCE = readFileSync(new URL('../src/pages/Points.vue', import.meta.url), 'utf8')
const KIT_SOURCE = readFileSync(
  new URL('../src/assets/styles/ui-kit-member.css', import.meta.url),
  'utf8',
)

/** 取某条规则的规则体（第一条 `}` 为界，够用且不依赖嵌套） */
function ruleBody(source, selector) {
  const normalized = source.replace(/\r\n/g, '\n')
  const at = normalized.indexOf(selector)
  assert.ok(at > -1, `应有 ${selector} 规则`)
  return normalized.slice(at, normalized.indexOf('}', at))
}

test('分片：流水行两端对齐（内容在左、金额与余额在右）', () => {
  // 纵向排版会把每条记录拉到三行高，条数一多就翻不到底。
  const row = ruleBody(KIT_SOURCE, '.u-mm-ledger-row {')
  assert.match(row, /display: grid/, '流水行应是网格')
  assert.match(row, /grid-template-columns: minmax\(0, 1fr\) auto/, '左内容右金额两列')

  const right = ruleBody(KIT_SOURCE, '.u-mm-ledger-right {')
  assert.match(right, /align-items: flex-end/, '金额与余额靠右对齐')
})

test('分片：任务条目与余额块仍提供条目级排版', () => {
  assert.match(ruleBody(KIT_SOURCE, '.u-mm-task {'), /display: grid/, '任务条目应是网格')
  assert.match(ruleBody(KIT_SOURCE, '.u-mm-task-list {'), /flex-direction: column/)
  assert.match(ruleBody(KIT_SOURCE, '.u-mm-balance {'), /flex-direction: column/)
})

test('页面：流水 / 任务 / 余额不再保留各自的私有排版', () => {
  // 这四套类名是迁移前的历史写法，回来一个就意味着「第二个真相源」复活。
  for (const selector of ['.history-item', '.history-list', '.history-pager', '.points-balance', '.task-item', '.tasks-list']) {
    assert.ok(
      !POINTS_SOURCE.includes(selector),
      `${selector} 已并入 ui-kit-member.css，页面不应再定义`,
    )
  }
})

test('页面：流水行 / 分页 / 任务 / 余额确实用了分片的类', () => {
  for (const className of [
    'u-mm-ledger',
    'u-mm-ledger-row',
    'u-mm-ledger-delta--earn',
    'u-mm-pager',
    'u-mm-task-list',
    'u-mm-task',
    'u-mm-balance',
  ]) {
    assert.ok(POINTS_SOURCE.includes(className), `模板应使用 ${className}`)
  }
})

test('分片：商城条目是「文字列 + 按钮」两列，按钮与整块文字相互居中', () => {
  // 按钮必须是 .u-mm-mall 的**直接子元素**才算右列；塞回文字列里，
  // 居中的基准就退回「积分那一行」（批次 15 的结论）。
  const mall = ruleBody(KIT_SOURCE, '.u-mm-mall {')
  assert.match(mall, /align-items: center/, '两列相互垂直居中')
  assert.match(ruleBody(KIT_SOURCE, '.u-mm-mall-main {'), /flex-direction: column/)

  const cost = ruleBody(KIT_SOURCE, '.u-mm-mall-cost {')
  assert.match(cost, /margin-top: auto/, '成本行钉在文字列底部')
  assert.match(
    ruleBody(KIT_SOURCE, '.u-mm-mall-cost-unit {'),
    /white-space: nowrap/,
    '「积分」是一个语义单元，不许被拆行',
  )
})

test('页面：分片没覆盖的两处「同行排版」仍由页面提供', () => {
  // 分片的 .u-mm-task-main 是纯纵向堆叠；「名称 + 周期」与「进度条 + 进度 + 奖励」
  // 这两行需要页面自己横过来，否则会各自占一行、条目高度翻倍。
  for (const selector of ['.task-name-row {', '.task-progress-row {']) {
    const body = ruleBody(POINTS_SOURCE, selector)
    assert.match(body, /display: flex/)
    assert.match(body, /flex-wrap: wrap/, '窄屏才不互相挤压')
  }
})

test('页面：进度条宽度由页面给（分片只管外观）', () => {
  // 分片的 .u-mm-task-bar 只有高度与轨道，不给宽度时在 flex 行里会被压成 0。
  const body = ruleBody(POINTS_SOURCE, '.task-progress-row .u-mm-task-bar {')
  assert.match(body, /width: calc\(var\(--space-unit\) \* \d+\)/)
})

test('分片：767px 下商城列表收成一列（页面不再自带极窄屏规则）', () => {
  const media = KIT_SOURCE.slice(KIT_SOURCE.indexOf('@media (max-width: 767px)'))
  assert.match(
    media,
    /\.u-mm-plan-grid,\r?\n\s*\.u-mm-mall-list \{\r?\n\s*grid-template-columns: minmax\(0, 1fr\)/,
    '窄屏由分片收成单列',
  )
  assert.ok(
    !POINTS_SOURCE.includes('@media (max-width: 575px)'),
    '商城的极窄屏规则已并入 §26，页面不应再留一份',
  )
})
