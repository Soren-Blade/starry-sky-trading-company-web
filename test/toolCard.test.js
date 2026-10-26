import test from 'node:test'
import assert from 'node:assert/strict'

// 必须先求值：setup.js 注册 `@/` 别名与 .vue 编译钩子，render.mjs 才能加载 SFC
import './setup.js'
import { renderComponent, createPiniaWithState, createRenderEnv } from './render.mjs'
import { TOOL_PAGE } from '../src/constants/index.js'

/**
 * ToolCard 的访问策略契约（ToolRow + 会员策略）
 *
 * 服务端新字段 `tool.access_policy` 有四个取值：
 *   free / card / member_free / member_only
 * 每种取值 × 会员 / 非会员，共 8 种组合。这里用 SSR 把整张卡渲染出来逐条断言：
 *   - 状态点文案（`.ec-status`）
 *   - 操作按钮文案 / 是否存在
 *   - 金色会员 tag 是否出现
 *
 * 会员身份通过 `createPiniaWithState({ member: { overview: { is_member } } })`
 * 注入既有 member store，不 mock 组件内部实现。不引 @vue/test-utils、不造 DOM。
 */

const TOOL_ID = 11

const TOOL_BASE = {
  id: TOOL_ID,
  tool_name: '示例工具',
  description: '用于验证访问策略的桩工具',
  class_name: '开发工具',
  icon: '🔧',
  collection_count: 3,
}

const makeTool = (policy, extra = {}) => ({
  ...TOOL_BASE,
  access_policy: policy,
  // 新契约里 requires_card 只是冗余字段；这里故意保持与服务端回填一致
  requires_card: policy === 'card',
  ...extra,
})

async function renderCard(tool, { isMember = false, isFavorited = false, hasEntitlement = false } = {}) {
  const [pinia, env] = await Promise.all([
    createPiniaWithState({ member: { overview: { is_member: isMember } } }),
    createRenderEnv(),
  ])

  const warnings = []
  const savedWarn = console.warn
  const savedError = console.error
  console.warn = (...args) => warnings.push(args.map(String).join(' '))
  console.error = (...args) => warnings.push(args.map(String).join(' '))
  try {
    const html = await renderComponent('/components/ToolCard.vue', {
      props: { tool, isFavorited, hasEntitlement },
      plugins: [pinia, env.router],
      globalComponents: env.globalComponents,
    })
    return { html, warnings }
  } finally {
    console.warn = savedWarn
    console.error = savedError
  }
}

function actOf(html) {
  const match = html.match(/<div class="ec-tool__act"[^>]*>([\s\S]*?)<\/div>/)
  assert.ok(match, '应渲染 .ec-tool__act 操作区')
  return match[1]
}

function tagsOf(html) {
  const match = html.match(/<div class="ec-tool__tags"[^>]*>([\s\S]*?)<\/div>/)
  assert.ok(match, '应渲染 .ec-tool__tags 标签区')
  return match[1]
}

function assertNoVueWarnings(warnings) {
  assert.deepEqual(
    warnings.filter((w) => w.includes('[Vue warn]')),
    [],
    '渲染期间不应出现 Vue 警告'
  )
}

const CASES = [
  {
    policy: 'free',
    member: false,
    status: 'online',
    statusText: '可用',
    action: 'open',
  },
  {
    policy: 'free',
    member: true,
    status: 'online',
    statusText: '可用',
    action: 'open',
  },
  {
    policy: 'card',
    member: false,
    status: 'expired',
    statusText: TOOL_PAGE.needCardTag,
    action: 'activate',
  },
  {
    // 卡密不看会员身份：会员没有这张卡，同样要激活
    policy: 'card',
    member: true,
    status: 'expired',
    statusText: TOOL_PAGE.needCardTag,
    action: 'activate',
  },
  {
    policy: 'member_free',
    member: false,
    status: 'vip',
    statusText: '需开通会员',
    action: 'acquire',
    goldTag: '会员免费',
  },
  {
    policy: 'member_free',
    member: true,
    status: 'vip',
    statusText: '会员免费',
    action: 'open',
  },
  {
    policy: 'member_only',
    member: false,
    status: 'vip',
    statusText: '会员专属',
    action: 'none',
    goldTag: '会员专属',
  },
  {
    policy: 'member_only',
    member: true,
    status: 'vip',
    statusText: '会员专属',
    action: 'open',
  },
]

for (const item of CASES) {
  test(`策略 ${item.policy} × ${item.member ? '会员' : '非会员'}`, async () => {
    const { html, warnings } = await renderCard(makeTool(item.policy), {
      isMember: item.member,
      hasEntitlement: false,
    })
    assertNoVueWarnings(warnings)

    const act = actOf(html)
    assert.match(act, new RegExp(`ec-status--${item.status}`), '状态点变体应与策略一致')
    assert.ok(act.includes(item.statusText), `状态点应显示「${item.statusText}」`)

    const tags = tagsOf(html)
    if (item.goldTag) {
      assert.match(tags, /ec-tag--gold/, '会员策略应显示金色 tag')
      assert.ok(tags.includes(item.goldTag), `标签区应显示「${item.goldTag}」`)
    } else {
      assert.doesNotMatch(tags, /ec-tag--gold/, '非会员策略不应出现金色 tag')
    }

    if (item.action === 'open') {
      assert.ok(act.includes(TOOL_PAGE.openTool), '可用态按钮应为「打开工具」')
      assert.ok(!act.includes(TOOL_PAGE.activateNow), '可用态不应出现「立即激活」')
      assert.ok(!act.includes('获取'), '可用态不应出现「获取」')
      assert.ok(!html.includes('/user/kami'), '可用态不应再跳卡密页')
    }

    if (item.action === 'activate') {
      assert.ok(act.includes(TOOL_PAGE.activateNow), '需卡密时应给出「立即激活」')
      assert.ok(act.includes(`/user/kami?tool_id=${TOOL_ID}`), '激活入口必须带工具 id')
      assert.ok(!act.includes(TOOL_PAGE.openTool), '未激活时不应出现「打开工具」')
      assert.ok(!act.includes('获取'), '需卡密时按钮文案不应是「获取」')
    }

    if (item.action === 'acquire') {
      assert.ok(act.includes('获取'), '会员免费但非会员时按钮应为「获取」')
      assert.ok(act.includes(`/user/kami?tool_id=${TOOL_ID}`), '「获取」必须跳卡密页并带工具 id')
      assert.match(act, /ec-btn--gold/, '「获取」应使用金色 CTA')
      assert.ok(!act.includes(TOOL_PAGE.openTool), '非会员不能直接打开工具')
    }

    if (item.action === 'none') {
      assert.doesNotMatch(act, /<button/, '会员专属且非会员时不应渲染按钮')
      assert.doesNotMatch(act, /<a /, '会员专属且非会员时不应渲染链接')
      assert.ok(!html.includes(TOOL_PAGE.openTool), '不应出现「打开工具」')
      assert.ok(!html.includes(TOOL_PAGE.activateNow), '不应出现「立即激活」')
      assert.ok(!html.includes('获取'), '不应出现「获取」')
      assert.ok(!html.includes('tool-row__favorite'), '不应渲染收藏按钮')
    } else {
      assert.match(tags, /tool-row__favorite/, '有操作时保留收藏入口')
    }
  })
}

test('access_policy 缺失时回退：requires_card=true → card，否则 free', async () => {
  const paid = { ...TOOL_BASE, requires_card: true }
  const { html: paidHtml, warnings: paidWarnings } = await renderCard(paid)
  assertNoVueWarnings(paidWarnings)
  assert.ok(actOf(paidHtml).includes(TOOL_PAGE.activateNow), '缺字段的收费工具应按 card 处理')
  assert.ok(actOf(paidHtml).includes('/user/kami?tool_id=11'), '回退后仍要带工具 id')

  const free = { ...TOOL_BASE, requires_card: false }
  const { html: freeHtml } = await renderCard(free)
  assert.ok(actOf(freeHtml).includes(TOOL_PAGE.openTool), '缺字段的免费工具应按 free 处理')

  const untagged = { ...TOOL_BASE }
  const { html: untaggedHtml } = await renderCard(untagged)
  assert.ok(actOf(untaggedHtml).includes(TOOL_PAGE.openTool), 'requires_card 也缺失时按 free 处理')
})

test('非法 access_policy 同样回退到 requires_card 判定', async () => {
  const { html } = await renderCard({ ...TOOL_BASE, access_policy: 'vip', requires_card: true })
  assert.ok(actOf(html).includes(TOOL_PAGE.activateNow), '非法策略值不能绕过收费判定')
})

test('card + 已拥有权益：状态「已拥有」，按钮「打开工具」，不再跳卡密页', async () => {
  const { html, warnings } = await renderCard(makeTool('card'), { hasEntitlement: true })
  assertNoVueWarnings(warnings)

  const act = actOf(html)
  assert.match(act, /ec-status--owned/)
  assert.ok(act.includes('已拥有'))
  assert.ok(act.includes(TOOL_PAGE.openTool))
  assert.ok(!html.includes('/user/kami'))
  assert.ok(tagsOf(html).includes(TOOL_PAGE.activatedTag), '已激活工具应带「已激活」标记')
})

test('维护中：整行 is-maintain + 橙点「维护中」，按钮置灰不可点', async () => {
  const { html, warnings } = await renderCard(makeTool('free', { is_maintain: true }))
  assertNoVueWarnings(warnings)

  assert.match(html, /class="[^"]*\bis-maintain\b/)
  const act = actOf(html)
  assert.match(act, /ec-status--maintain/)
  assert.ok(act.includes('维护中'))
  assert.match(act, /<button[^>]*disabled/, '维护中按钮必须 disabled')
  assert.ok(!html.includes(TOOL_PAGE.openTool), '维护中不能出现「打开工具」')
})

test('已下架：整行 is-offline + 灰点「已下架」，无任何操作按钮', async () => {
  const { html, warnings } = await renderCard(makeTool('free', { status: 'offline' }))
  assertNoVueWarnings(warnings)

  assert.match(html, /class="[^"]*\bis-offline\b/)
  const act = actOf(html)
  assert.match(act, /ec-status--offline/)
  assert.ok(act.includes('已下架'))
  assert.doesNotMatch(act, /<button|<a /, '下架工具不应有操作入口')
  assert.ok(!html.includes('tool-row__favorite'), '下架工具也不应保留收藏按钮')
})

test('下架优先级高于维护中与访问策略', async () => {
  const { html } = await renderCard(
    makeTool('card', { status: 'offline', is_maintain: true }),
    { hasEntitlement: false }
  )
  const act = actOf(html)
  assert.match(act, /ec-status--offline/)
  assert.ok(!act.includes('需卡密激活'))
  assert.doesNotMatch(act, /<button|<a /)
})

test('ToolRow 使用设计系统标记，不再沿用旧卡片的媒体区', async () => {
  const { html } = await renderCard(makeTool('free'))
  assert.match(html, /class="[^"]*\btool-row\b[^"]*\bec-tool\b/)
  assert.match(html, /class="ec-tool__main"/)
  assert.ok(!html.includes('ui-card-media'), '应移除旧卡片封面区')
  assert.ok(!html.includes('tool-access'), '应移除旧的 requires_card 标注块')
})
