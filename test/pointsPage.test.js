/**
 * 积分中心页（`/points`）测试
 *
 * 只做源码断言：流水列表的排版全在 CSS 里，SSR 出来的 HTML 完全一样，
 * 横向还是纵向只能在浏览器里看出来，所以用规则断言把它钉住。
 */
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const POINTS_SOURCE = readFileSync(new URL('../src/pages/Points.vue', import.meta.url), 'utf8')

test('源码：流水每条横向排版（类型/时间/说明 一行，右侧 +35 余额 35 一行）', () => {
  // 纵向排版会把每条记录拉到三行高，条数一多就翻不到底。
  for (const selector of ['.history-item-main {', '.history-item-right {']) {
    const at = POINTS_SOURCE.indexOf(selector)
    assert.ok(at > -1, `应有 ${selector} 规则`)
    const body = POINTS_SOURCE.slice(at, POINTS_SOURCE.indexOf('}', at))
    assert.match(body, /flex-direction: row/, `${selector} 应横向排版`)
    assert.match(body, /flex-wrap: wrap/, `${selector} 需要换行，窄屏才不互相挤压`)
  }
})

test('源码：单条记录左右两端对齐（内容在左、金额余额在右）', () => {
  const at = POINTS_SOURCE.indexOf('.history-item {')
  assert.ok(at > -1)
  const body = POINTS_SOURCE.slice(at, POINTS_SOURCE.indexOf('}', at))
  assert.match(body, /justify-content: space-between/)
})

test('源码：极窄屏退回上下两行，避免横向那行被压扁', () => {
  const media = POINTS_SOURCE.slice(POINTS_SOURCE.indexOf('@media (max-width: 575px)'))
  assert.match(media, /\.history-item \{[\s\S]*?flex-direction: column/)
})
