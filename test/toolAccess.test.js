import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

import { renderComponent, createRenderEnv, expectIncludes } from './render.mjs'
import { TOOL_PAGE, VIDEO_TOOL } from '../src/constants/content.js'

/**
 * 工具页的「使用方式」两个分类
 *
 * 需求：工具页要有「需要卡密激活」与「免费工具」两个分类；
 * 需要卡密的工具要**标注出来**提醒用户，按钮写「立即激活」并携带参数跳到卡密激活页。
 *
 * SSR 能覆盖的：卡片在两种状态下的标注与按钮文案（props 驱动，可直接渲染）。
 * SSR 覆盖不到的：路由跳转后的预选结果、左轨筛选（都要真实交互）——
 * 那两部分由文件末尾的源码级与纯函数断言兜住。
 */

const __dirname = dirname(fileURLToPath(import.meta.url))
const WEB_ROOT = join(__dirname, '..')

const TOOL_CARD_SOURCE = readFileSync(join(WEB_ROOT, 'src', 'components', 'ToolCard.vue'), 'utf8')
const TOOL_PAGE_SOURCE = readFileSync(join(WEB_ROOT, 'src', 'pages', 'Tool.vue'), 'utf8')
const KAMI_SOURCE = readFileSync(join(WEB_ROOT, 'src', 'components', 'KamiSection.vue'), 'utf8')

/** 一件需要卡密的工具（对应数据库里 id=1 的视频下载工具） */
const PAID_TOOL = {
  id: 1,
  class: 'video',
  class_name: '视频工具',
  tool_name: '视频下载工具',
  description: '粘贴短视频分享链接即可解析下载。',
  tool_path: '/video/downloader',
  icon: '🎬',
  collection_count: 7,
  requires_card: true,
}

/** 一件免费工具 */
const FREE_TOOL = {
  id: 3,
  class: 'dev',
  class_name: '开发工具',
  tool_name: 'JSON格式化工具',
  description: '格式化与压缩 JSON。',
  tool_path: '/dev/json-formatter',
  icon: '🧰',
  collection_count: 12,
  requires_card: false,
}

const renderCard = async (props) => {
  // 必须把真实 router 插件一起装上：只传 globalComponents 时 `<RouterLink>`
  // 不会被解析（render.mjs 里注册的是 kebab 名），会原样输出成未知元素 ——
  // 那样「跳转是否带 tool_id」这条断言就什么都没测到
  const { globalComponents, router } = await createRenderEnv()
  return renderComponent('components/ToolCard.vue', {
    props: { tool: PAID_TOOL, isFavorited: false, ...props },
    plugins: [router],
    globalComponents,
  })
}

// ══════════════════════════════════════════════════════════
// 卡片：需要卡密 + 未激活
// ══════════════════════════════════════════════════════════

test('需要卡密且未激活：标注提醒 + 按钮是「立即激活」', async () => {
  const html = await renderCard({ tool: PAID_TOOL, hasEntitlement: false })

  assert.ok(html.includes(TOOL_PAGE.needCardTag), '卡片上要有「需卡密激活」标注')
  assert.ok(html.includes(TOOL_PAGE.needCardHint), '还要有一句提醒')
  assert.ok(html.includes(TOOL_PAGE.activateNow), '按钮文案应是「立即激活」')
  assert.equal(html.includes(TOOL_PAGE.openTool), false, '未激活时不该出现「打开工具」')
  assert.equal(html.includes(TOOL_PAGE.activatedTag), false, '未激活时不该出现「已激活」')
})

test('「立即激活」必须携带工具 id 跳到卡密激活页', async () => {
  const html = await renderCard({ tool: PAID_TOOL, hasEntitlement: false })

  // 直接取锚点，失败时把真实标签打出来 —— 比「未找到」有用得多
  const at = html.indexOf(TOOL_PAGE.activateNow)
  const around = at > -1 ? html.slice(Math.max(0, at - 300), at + 40) : '(没有这段文字)'
  assert.ok(at > -1, `渲染结果里应有「立即激活」，附近内容：${around}`)

  assert.match(html, /href="\/user\/kami\?tool_id=1"/, `链接必须带上工具 id，附近内容：${around}`)
})

test('需要卡密但已激活：标注变「已激活」，按钮回到「打开工具」', async () => {
  const html = await renderCard({ tool: PAID_TOOL, hasEntitlement: true })

  assert.ok(html.includes(TOOL_PAGE.activatedTag), '已激活要如实标注')
  assert.ok(html.includes(TOOL_PAGE.activatedHint), '并说明可以直接用')
  assert.ok(html.includes(TOOL_PAGE.openTool), '按钮应回到「打开工具」')
  assert.equal(html.includes(TOOL_PAGE.activateNow), false, '已激活不该再出现「立即激活」')
  assert.equal(html.includes('/user/kami'), false, '已激活不该再引导去激活页')
})

test('免费工具：不出现任何卡密相关的标注或入口', async () => {
  const html = await renderCard({ tool: FREE_TOOL, hasEntitlement: false })

  assert.ok(html.includes(TOOL_PAGE.openTool), '免费工具直接可打开')
  assert.equal(html.includes(TOOL_PAGE.needCardTag), false, '免费工具不该被标注为需要卡密')
  assert.equal(html.includes(TOOL_PAGE.activateNow), false, '免费工具不该出现「立即激活」')
  assert.equal(html.includes('/user/kami'), false, '免费工具不该引导去激活页')
})

// ══════════════════════════════════════════════════════════
// 卡片：SSR 之外的分支靠源码契约兜底
// ══════════════════════════════════════════════════════════

test('卡片不自己请求授权：一张卡一个请求会把列表打成 N+1', () => {
  assert.equal(
    /api\.|fetch\(|request\./.test(TOOL_CARD_SOURCE),
    false,
    'ToolCard 必须是纯展示，由父组件把 hasEntitlement 传进来'
  )
  assert.match(TOOL_CARD_SOURCE, /hasEntitlement: \{ type: Boolean, default: false \}/)
})

test('免费工具不应依赖授权状态（requires_card 为假时永远可用）', () => {
  // 模板里两处判断都带 tool.requires_card 前置条件：
  // 若写成只看 hasEntitlement，免费工具在授权未取到时会被误标成需要卡密
  const matches = TOOL_CARD_SOURCE.match(/tool\.requires_card/g) || []
  assert.ok(matches.length >= 2, `模板里应有至少 2 处 requires_card 判断，实际 ${matches.length}`)
})

// ══════════════════════════════════════════════════════════
// 左轨：两个分类入口
// ══════════════════════════════════════════════════════════

test('左轨有两个「使用方式」入口，且与主题分类分开成组', () => {
  assert.match(TOOL_PAGE_SOURCE, /使用方式/, '要有「使用方式」这一组')
  assert.match(TOOL_PAGE_SOURCE, /TOOL_PAGE\.accessCard/)
  assert.match(TOOL_PAGE_SOURCE, /TOOL_PAGE\.accessFree/)
  // 两个入口与分类入口共用同一个 activeCategory（单选），不引入第二套筛选状态
  assert.match(TOOL_PAGE_SOURCE, /toolStore\.setActiveCategory\(entry\.key\)/)
})

test('两个伪分类键不会与后端真实 class 相撞', () => {
  const keys = [...TOOL_PAGE_SOURCE.matchAll(/const (ACCESS_CARD|ACCESS_FREE) = '([^']+)'/g)].map((m) => m[2])
  assert.equal(keys.length, 2, '两个键都要定义')
  for (const key of keys) {
    assert.match(key, /^__.+__$/, `伪分类键必须用双下划线包住，实际 ${key}`)
  }
})

test('筛选：两个入口各自筛 requires_card，且三者互斥（不会叠加成「视频+免费」）', () => {
  const block = TOOL_PAGE_SOURCE.slice(
    TOOL_PAGE_SOURCE.indexOf('const filteredTools = computed'),
    TOOL_PAGE_SOURCE.indexOf('const toggleFavorites')
  )

  assert.match(block, /activeCategory\.value === ACCESS_CARD[\s\S]*?list\.filter\(requiresCard\)/)
  assert.match(block, /activeCategory\.value === ACCESS_FREE[\s\S]*?list\.filter\(\(tool\) => !requiresCard\(tool\)\)/)
  // 关键：分类过滤必须是 else if，否则两个条件会叠加。
  // 负向断言要带行首缩进 —— `} else if (` 里也含 `if (`，不带锚点会误判。
  assert.equal(
    /\n\s*if \(activeCategory\.value !== 'all'\)/.test(block),
    false,
    '不能写成独立 if：那样选「需要卡密」时还会再按 class 过滤，得到空列表'
  )
})

test('requires_card 缺字段时按「免费」处理（与数据库默认值 false 一致）', () => {
  assert.match(TOOL_PAGE_SOURCE, /tool\.requires_card === true/, '必须严格判 true')
})

// ══════════════════════════════════════════════════════════
// 激活状态的三重条件
// ══════════════════════════════════════════════════════════

test('已激活判断必须同时要求：需要卡密、有身份、授权已查到', () => {
  const at = TOOL_PAGE_SOURCE.indexOf('const hasEntitlement = (tool) => {')
  assert.ok(at > -1)
  const body = TOOL_PAGE_SOURCE.slice(at, TOOL_PAGE_SOURCE.indexOf('\n}', at))

  assert.match(body, /if \(!requiresCard\(tool\)\) return true/, '免费工具永远算可用')
  assert.match(body, /if \(!hasIdentity\.value\) return false/, '退出登录后不能沿用上一个账号的授权')
  assert.match(body, /Array\.isArray\(ids\) && ids\.includes/, '授权未查到（null）时按未激活呈现')
})

test('授权查询失败时保留 null，而不是当成「没有授权」', () => {
  const store = readFileSync(join(WEB_ROOT, 'src', 'stores', 'tool.js'), 'utf8')
  const at = store.indexOf('async fetchEntitlements()')
  const body = store.slice(at, store.indexOf('clearEntitlements', at))

  // catch 分支必须是 null：空数组会被界面理解成「确定没有」，
  // 从而把一个已付费但查询失败的用户引导回激活页
  assert.match(body, /catch[\s\S]*?this\.validToolIds = null/)
  assert.equal(/catch[\s\S]*?this\.validToolIds = \[\]/.test(body), false, '不能把失败写成空数组')
})

test('身份变化要重取授权：同一标签页换账号不能沿用上一个人的授权', () => {
  assert.match(TOOL_PAGE_SOURCE, /watch\(\s*\(\) => userStore\.userId/)
  assert.match(TOOL_PAGE_SOURCE, /toolStore\.clearEntitlements\(\)/, '退出登录要清空')
  assert.match(TOOL_PAGE_SOURCE, /toolStore\.fetchEntitlements\(\)/, '换账号要重取')
})

// ══════════════════════════════════════════════════════════
// 激活页的深链预选
// ══════════════════════════════════════════════════════════

test('激活页从 query 预选工具，且只接受真实存在的 id', () => {
  const at = KAMI_SOURCE.indexOf('function applyToolFromQuery()')
  assert.ok(at > -1, '激活页要有预选函数')
  const body = KAMI_SOURCE.slice(at, KAMI_SOURCE.indexOf('\n}', at))

  assert.match(body, /route\.query\.tool_id/, '读 tool_id')
  assert.match(body, /toolOptions\.value\.some/, '必须校验该 id 真实存在于选项里')
  assert.match(body, /return false/, '不存在时忽略而不是报错')
  assert.match(body, /selectedToolId\.value = id/)
})

test('预选只在工具列表到位后执行（选项不存在时赋值不会生效）', () => {
  const at = KAMI_SOURCE.indexOf('onMounted(async () => {')
  const body = KAMI_SOURCE.slice(at, KAMI_SOURCE.indexOf('})', at))

  const fetchAt = body.indexOf('fetchTools')
  const applyAt = body.indexOf('applyToolFromQuery')
  assert.ok(fetchAt > -1 && applyAt > -1, '两件事都要在 onMounted 里')
  assert.ok(fetchAt < applyAt, '必须先 await 工具列表，再预选')
})

test('已在激活页时切换工具也要生效（只改 query 不会重新挂载组件）', () => {
  assert.match(KAMI_SOURCE, /watch\(\s*\(\) => route\.query\.tool_id/)
})

// ══════════════════════════════════════════════════════════
// 视频工具的占位页
// ══════════════════════════════════════════════════════════

test('视频工具的路径与数据库里的 tool_path 一致（跨仓库契约）', () => {
  const router = readFileSync(join(WEB_ROOT, 'src', 'router', 'index.js'), 'utf8')

  // 这三个字面量必须与迁移 2026-10-05-cleanup-and-tool-access.sql 里
  // UPDATE sstc.tools SET tool_path = '/video/downloader' 完全一致。
  // 不一致的后果：工具页点「打开工具」会跳到 404，而两边各自看都「没问题」。
  assert.match(router, /path: '\/video\/downloader'/, '路由路径必须是 /video/downloader')
  assert.match(router, /import\('@\/pages\/VideoTool\.vue'\)/, '该路径要指向占位页')
})

test('占位页要如实说明「开发中」，并给出可走的下一步', async () => {
  const html = await renderComponent('pages/VideoTool.vue', {})

  expectIncludes(html, VIDEO_TOOL.status, '要标明功能开发中')
  expectIncludes(html, VIDEO_TOOL.body, '要有一段说明，而不是空白页')
  // 已激活的用户点进来必须**有出路**：回工具页、或看自己的卡密
  expectIncludes(html, VIDEO_TOOL.backToTools, '要能回工具页')
  expectIncludes(html, VIDEO_TOOL.myCards, '要能去看我的卡密')
})

test('占位页不写死域名、不假装已可用', () => {
  const source = readFileSync(join(WEB_ROOT, 'src', 'pages', 'VideoTool.vue'), 'utf8')

  assert.equal(/http:\/\/|https:\/\//.test(source), false, '站内链接一律走路由，不写死域名')
  assert.equal(VIDEO_TOOL.body.includes('支持'), false, '还没接服务，不能承诺支持哪些平台')
})
