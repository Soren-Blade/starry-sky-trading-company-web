import test from 'node:test'
import assert from 'node:assert/strict'

// 必须先求值：setup.js 注册 `@/` 别名与 .vue 编译钩子，render.mjs 才能加载 SFC
import './setup.js'
import { renderComponent, createPiniaWithState, createRenderEnv } from './render.mjs'
import { TOOL_PAGE } from '../src/constants/index.js'
import { MAX_TOOL_TAGS, toolTagsOf } from '../src/constants/toolTags.js'

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

/** 把标签区里的 span 按 DOM 顺序拆出来，附带 class 列表与文本 */
function tagSpansOf(html) {
  const tags = tagsOf(html)
  return [...tags.matchAll(/<span\b([^>]*)>([\s\S]*?)<\/span>/g)]
    .map((match) => {
      const classMatch = match[1].match(/\bclass="([^"]*)"/)
      return {
        classes: classMatch ? classMatch[1].split(/\s+/).filter(Boolean) : [],
        text: match[2].trim(),
      }
    })
    .filter((tag) => tag.classes.includes('ec-tag') && tag.text)
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
    // 状态点不再重复标签上的「会员专属」（同一行两个一样的方块），改说「未解锁」
    statusText: '未解锁',
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
  // 状态点已经是「维护中」，按钮再写同样的字会并排出现两个「维护中」
  assert.ok(!/<button[^>]*>\s*维护中\s*<\/button>/.test(act), '维护中按钮文案不应与状态点重复')
  assert.ok(act.includes('暂不可用'))
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

// ── 派生标签（需求 7 后半）────────────────────────────────────────

/** 用真实目录里的名称 / 描述 / 分类造一条工具，避免测试数据脱离线上文案 */
const realTool = (tool_name, description, class_name) => ({
  ...TOOL_BASE,
  tool_name,
  description,
  class_name,
  access_policy: 'free',
  requires_card: false,
})

test('toolTagsOf：按真实工具描述派生 1–3 个短标签', () => {
  assert.deepEqual(
    toolTagsOf(realTool('视频下载工具', '粘贴短视频分享链接即可解析下载（功能开发中，敬请期待）。', '视频工具')),
    ['解析下载', '视频处理']
  )
  assert.deepEqual(
    toolTagsOf(realTool('加解密工具箱', 'Base64、URL、Hex 编解码，AES 加解密。', '开发工具')),
    ['加解密', '编码解码']
  )
  assert.deepEqual(
    toolTagsOf(realTool('单位换算工具', '长度、重量、面积、体积、温度等单位换算。', '转换工具')),
    ['单位换算']
  )
  assert.deepEqual(
    toolTagsOf(realTool('时间日期工具箱', '时间戳转换、日期计算、倒计时等。', '转换工具')),
    ['时间戳', '日期计算', '倒计时']
  )
})

test('toolTagsOf：无描述不产生空标签，所有标签均为 2–4 个汉字', () => {
  assert.deepEqual(toolTagsOf({ tool_name: '无描述工具', class_name: '其他工具' }), [])
  assert.deepEqual(toolTagsOf({ tool_name: '', description: '   ' }), [])
  assert.deepEqual(toolTagsOf(null), [])
  assert.deepEqual(toolTagsOf(undefined), [])

  const samples = [
    ['图片工具箱', '图片压缩、格式转换、Base64 编码等。'],
    ['音视频工具箱', '音视频格式转换、信息查看等。'],
    ['二维码工具箱', '生成和识别二维码。'],
    ['日常生活工具箱', 'BMI、倒计时、星座生肖等生活小工具。'],
    ['文档转换工具', 'Word、Excel、PDF 等文档格式互转。'],
    ['短链与分享工具', 'URL 净化、短链生成、OG 预览。'],
    ['2FA密钥验证', '校验 TOTP 动态口令，或按密钥生成当前验证码。'],
    ['哈希与校验工具', 'MD5、SHA-1、SHA-256 等哈希计算。'],
  ]
  const all = samples.flatMap(([tool_name, description]) => toolTagsOf({ tool_name, description }))
  assert.ok(all.length > 0, '样例应至少命中一个标签')
  for (const tag of all) {
    assert.match(tag, /^[\u4e00-\u9fa5]{2,4}$/, `标签「${tag}」应为 2–4 个汉字`)
  }
})

test('toolTagsOf：最多 3 个、不重复，且不与 class_name 重复', () => {
  assert.equal(MAX_TOOL_TAGS, 3)

  const imageTags = toolTagsOf(realTool('图片工具箱', '图片压缩、格式转换、Base64 编码等。', '媒体工具'))
  assert.equal(imageTags.length, MAX_TOOL_TAGS)
  assert.deepEqual(imageTags, ['图像处理', '编码解码', '格式转换'])

  const longTags = toolTagsOf({
    tool_name: '全命中工具',
    description:
      '解析下载 图片 视频 音频 加解密 编码 单位换算 进制 时间戳 日期 倒计时 二维码 颜色 格式转换 生成 文档 表格 数据 正则 代码 哈希 JWT Cron SQL 2FA 网络 短链 阴影 布局 苹果ID 骰子 文本 计算 生活',
  })
  assert.equal(longTags.length, MAX_TOOL_TAGS, '命中再多的关键词也只能保留 3 个')
  assert.equal(new Set(longTags).size, longTags.length, '标签不能重复')

  const dailyTags = toolTagsOf(
    realTool('日常生活工具箱', 'BMI、倒计时、星座生肖等生活小工具。', '生活工具')
  )
  assert.deepEqual(dailyTags, ['倒计时', '计算器'])
  assert.ok(!dailyTags.includes('生活工具'), '派生标签不能与分类标签重复')
})

test('ToolCard：分类标签在首位，派生标签排其后且总数不超过 3 个', async () => {
  const { html, warnings } = await renderCard(
    realTool('图片工具箱', '图片压缩、格式转换、Base64 编码等。', '媒体工具')
  )
  assertNoVueWarnings(warnings)

  const spans = tagSpansOf(html)
  assert.equal(spans[0].text, '媒体工具', '分类标签必须第一个')
  assert.ok(spans[0].classes.includes('ec-tag--outline'), '分类标签样式保持不变')
  assert.deepEqual(
    spans.filter((tag) => tag.classes.includes('tool-row__tag')).map((tag) => tag.text),
    ['图像处理', '编码解码'],
    '分类标签占一个名额，派生标签最多补满 3 个'
  )
  assert.equal(spans.length, MAX_TOOL_TAGS, '标签区最多 3 个分类 / 派生标签')
  assert.doesNotMatch(tagsOf(html), /\+\d/, '不得出现「+N」半成品')
})

test('ToolCard：无描述时不渲染任何派生空标签', async () => {
  const { html } = await renderCard(realTool('无描述工具', '', '其他工具'))
  const spans = tagSpansOf(html)
  assert.deepEqual(spans.map((tag) => tag.text), ['其他工具'])
  assert.equal(
    spans.filter((tag) => tag.classes.includes('tool-row__tag')).length,
    0,
    '没有描述时不应出现派生标签'
  )
})

test('ToolCard：派生标签不与分类标签重复（同一行文案不重复）', async () => {
  const { html, warnings } = await renderCard(
    realTool('日常生活工具箱', 'BMI、倒计时、星座生肖等生活小工具。', '生活工具')
  )
  assertNoVueWarnings(warnings)

  const spans = tagSpansOf(html)
  const texts = spans.map((tag) => tag.text)
  assert.equal(new Set(texts).size, texts.length, '标签区不应出现重复文案')
  assert.deepEqual(
    spans.filter((tag) => tag.classes.includes('tool-row__tag')).map((tag) => tag.text),
    ['倒计时', '计算器']
  )
})
