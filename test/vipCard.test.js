import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { createRenderEnv, renderComponent } from './render.mjs'

/**
 * VipCard（会员身份卡）
 *
 * 这一组测试守四条底线：
 *   1. v1–v8 八个等级都能落到 silver / gold / black 三种非空外观；
 *   2. 未知等级安全回落到 v1，不抛错、不渲染空外观；
 *   3. 未拥有权益只做灰度，不借用危险色；
 *   4. 卡内按钮最多 3 个（即使调用方传了更多）。
 */

const __dirname = dirname(fileURLToPath(import.meta.url))
const VIP_CARD_PATH = join(__dirname, '..', 'src', 'components', 'VipCard.vue')
const SOURCE = readFileSync(VIP_CARD_PATH, 'utf8')
const LEVELS = ['v1', 'v2', 'v3', 'v4', 'v5', 'v6', 'v7', 'v8']
const EXPECTED_APPEARANCES = ['silver', 'silver', 'silver', 'gold', 'gold', 'gold', 'black', 'black']

async function renderVip(props) {
  const { globalComponents, router } = await createRenderEnv()
  return renderComponent('/components/VipCard.vue', {
    props,
    plugins: [router],
    globalComponents,
  })
}

test('v1–v8 八个等级都有非空外观映射，且三档外观全部被使用', async () => {
  const actual = []

  for (const level of LEVELS) {
    const html = await renderVip({ level })
    const match = html.match(/data-appearance="([^"]+)"/)
    assert.ok(match, `${level} 没有渲染 data-appearance`)
    assert.ok(match[1].length > 0, `${level} 的外观映射为空`)
    assert.match(html, new RegExp(`ec-vip--${match[1]}`), `${level} 缺少对应的外观类`)
    actual.push(match[1])
  }

  assert.deepEqual(actual, EXPECTED_APPEARANCES, '等级分档应与映射表一致')
  assert.equal(new Set(actual).size, 3, '三档外观都应至少被一个等级使用')
})

test('非法等级安全回落到 v1（silver），不抛错', async () => {
  for (const level of ['v9', 'v0', 'v10', 'gold', '', 'UNKNOWN']) {
    const html = await renderVip({ level })
    assert.match(html, /data-appearance="silver"/, `${JSON.stringify(level)} 应回落到 v1`)
    assert.match(html, /ec-vip--silver/, `${JSON.stringify(level)} 应使用 silver 外观`)
    assert.match(html, /V1 会员/, `${JSON.stringify(level)} 的名称应回落到 V1`)
  }
})

test('未拥有权益只降透明度并转灰，不带危险色类名', async () => {
  const html = await renderVip({
    level: 'v4',
    name: 'V4 会员',
    benefits: [
      { key: 'discount', name: '消费折扣', icon: 'tag', unlocked: true, valueText: '95 折' },
      { key: 'support', name: '专属客服', icon: 'lock', unlocked: false },
    ],
  })

  assert.match(html, /vip-card__perk is-locked/, '未拥有权益应带 is-locked')
  assert.match(html, /未拥有/, '未拥有权益应有文字状态')
  assert.doesNotMatch(
    html,
    /ec-btn--danger|ec-tag--danger|u-danger|text-danger|is-danger/,
    '未拥有权益不应借用危险色类名'
  )

  const style = SOURCE.slice(SOURCE.indexOf('<style'), SOURCE.indexOf('</style>'))
  assert.match(style, /\.vip-card__perk\.is-locked\s*\{[\s\S]*?opacity:\s*0\.4/, '灰度用 0.4 透明度')
  assert.doesNotMatch(style, /#[0-9a-fA-F]{3,8}\b|rgba?\(|hsla?\(/, '样式里不应出现硬编码色值')
})

test('卡内按钮最多 3 个，多传的动作会被截断', async () => {
  const actions = Array.from({ length: 5 }, (_, index) => ({
    label: `动作${index + 1}`,
    to: `/member/action-${index + 1}`,
    variant: index === 0 ? 'primary' : 'secondary',
  }))

  const html = await renderVip({ level: 'v2', name: 'V2 会员', actions })
  const actionsHtml = html.slice(html.indexOf('vip-card__actions'))
  const links = actionsHtml.match(/<a\b/g) || []

  assert.equal(links.length, 3, '卡内按钮数应被硬截断到 3')
  assert.match(actionsHtml, /动作3/)
  assert.doesNotMatch(actionsHtml, /动作4|动作5/)
})
