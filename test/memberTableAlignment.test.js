/**
 * 2.6.0 · 会员两张表的「表头与数值列同向」
 *
 * 用户反馈：会员权益对照表 / 等级阶梯两张表里，表头与内容对不齐。
 * 根因是 `.u-table th` 默认左对齐，而数值单元格是右对齐（`.u-mm-ladder-num`）
 * 或居中（`.u-mm-matrix-cell`），表头没有跟着走 —— 所以每列都错开。
 *
 * 这里用源码契约钉住三件事：
 *   1. 两张表的数值列表头必须带与单元格相同的类；
 *   2. 样式里必须有「表头 + 类」的对齐规则，且方向与单元格一致；
 *   3. `.u-mm-benefit-next` 不得再用 `margin-top: auto`（会把单行附注顶到卡片底部）。
 */
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const read = (relative) => readFileSync(join(ROOT, relative), 'utf8')

const LADDER = read('src/components/MemberLevelLadder.vue')
const BENEFITS = read('src/pages/MemberBenefits.vue')
const MEMBER_CSS = read('src/assets/styles/ui-kit-member.css')

test('等级阶梯：数值列表头带 u-mm-ladder-num 类', () => {
  const headers = LADDER.match(/<th[^>]*scope="col"[^>]*>/g) || []
  assert.ok(headers.length >= 2, '应至少有 等级 + 成长值门槛 两列表头')

  const numericHeaders = headers.filter((tag) => tag.includes('u-mm-ladder-num'))
  assert.ok(numericHeaders.length >= 1, '成长值门槛表头必须带 u-mm-ladder-num')

  // 门槛、折扣、倍率三列都是数值列
  assert.match(LADDER, /<th scope="col" class="u-mm-ladder-num">成长值门槛<\/th>/)
  const cells = LADDER.match(/<td[^>]*class="u-mm-ladder-num"/g) || []
  assert.ok(cells.length >= 1, '数值单元格仍需 u-mm-ladder-num')
})

test('权益矩阵：数值列表头带 u-mm-matrix-cell 类', () => {
  assert.match(BENEFITS, /<th scope="col" class="u-mm-ladder-num">成长值门槛<\/th>/)
  assert.match(BENEFITS, /class="u-mm-matrix-cell"/)

  // 矩阵的列头与单元格必须用同一个类，否则两边的 text-align 会分叉
  const headerBlock = BENEFITS.slice(
    BENEFITS.indexOf('八档会员等级与八项权益对照表'),
    BENEFITS.indexOf('</thead>')
  )
  assert.ok(headerBlock.includes('u-mm-matrix-cell'), '矩阵表头必须带 u-mm-matrix-cell')
})

test('样式：表头与单元格对齐方向一致', () => {
  // 数值单元格
  assert.match(MEMBER_CSS, /\.u-mm-ladder-num \{[^}]*text-align: right;/s)
  assert.match(MEMBER_CSS, /\.u-mm-matrix-cell \{[^}]*text-align: center;/s)

  // 表头：必须存在「th + 类」的规则，且方向与单元格相同
  assert.match(
    MEMBER_CSS,
    /\.u-mm-ladder th\.u-mm-ladder-num,[\s\S]*?\.u-mm-matrix-table th\.u-mm-ladder-num \{\s*text-align: right;/,
    '两张表的数值列表头都应右对齐'
  )
  assert.match(
    MEMBER_CSS,
    /\.u-mm-matrix-table th\.u-mm-matrix-cell \{\s*text-align: center;/,
    '矩阵表头应居中'
  )
})

test('附注不再被 margin-top: auto 顶到底部', () => {
  // 先剥注释：规则体上方的说明里就写着「原先 margin-top: auto …」，不剥会自己撞自己
  const stripped = MEMBER_CSS.replace(/\/\*[\s\S]*?\*\//g, '')
  const rule = stripped.match(/\.u-mm-benefit-next \{[^}]*\}/s)
  assert.ok(rule, '应存在 .u-mm-benefit-next 规则')
  assert.ok(!/margin-top:\s*auto/.test(rule[0]), '不得再使用 margin-top: auto')
  assert.match(rule[0], /margin-top: 0/)
})
