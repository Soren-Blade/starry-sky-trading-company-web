import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

import {
  renderComponent,
  createPiniaWithState,
  createRenderEnv,
  expectIncludes,
  expectExcludes,
} from './render.mjs'

/** 读仓库内源码（路径相对仓库根） */
const read = (relPath) => readFileSync(new URL(`../${relPath}`, import.meta.url), 'utf8')

/**
 * 共享 Apple ID 目录（AppleIdSection）的四态与版式契约。
 *
 * 这一页最容易回归的四件事，都能在 SSR 里断死：
 * ① 未登录时给出登录引导，而不是一个必然 401 的请求 + 红色「加载失败」；
 * ② 空线路不出现在目录里，左栏也不留指向空区块的死锚点；
 * ③ 每张卡只有一枚主按钮（曾出现 31 张卡 = 62 个同权重实心按钮）；
 * ④ 更新时间说人话（「34 分钟前更新」），不是精确到秒的时间戳。
 */

async function renderSection(toolState = {}, userState = {}) {
  const [pinia, env] = await Promise.all([
    createPiniaWithState({ tool: toolState, user: userState }),
    createRenderEnv(),
  ])
  const html = await renderComponent('/components/AppleIdSection.vue', {
    plugins: [pinia, env.router],
    globalComponents: env.globalComponents,
  })
  return html
}

const ACCOUNT = (suffix) => ({
  apple_id: `user${suffix}@example.com`,
  password: 'secret-pass',
  country: '美国',
  status: '正常',
  create_time: new Date(Date.now() - 34 * 60 * 1000).toISOString(),
})

// 每张卡恰好一枚主按钮：卡数 = 主按钮数
const countOccurrences = (html, needle) => html.split(needle).length - 1

test('未登录：给出登录引导，而不是失败态', async () => {
  const html = await renderSection({}, { userInfo: null })

  expectIncludes(html, '登录后即可查看', '未登录时必须给登录引导')
  // 无身份时不渲染账号网格，也不把「没登录」说成加载失败
  expectExcludes(html, 'apple-id-card', '未登录时不应渲染账号卡')
  expectExcludes(html, 'inline-error', '未登录不是错误态，不能用失败面板')
})

test('两条线路都有数据：各出一个区块，卡数与计数一致', async () => {
  const main = [ACCOUNT(1), ACCOUNT(2)]
  const backup = [ACCOUNT(3)]
  const html = await renderSection(
    { appleIds: { nanoCloud: main, fangQiangNan: backup } },
    { userInfo: { id: 7 } },
  )

  expectIncludes(html, 'id="nano-cloud"', '主线路区块的锚点 id 必须存在（左栏切换指向它）')
  expectIncludes(html, 'id="fang-qiang-nan"', '副线路区块的锚点 id 必须存在')
  assert.equal(countOccurrences(html, 'class="apple-id-card'), 3, '三张账号卡')

  // 计数文案来自同一条 lanes 数据源，不能和实际卡数对不上
  expectIncludes(html, '2 个可用', '主线路计数')
  expectIncludes(html, '1 个可用', '副线路计数')

  // 一主一次：主按钮数 == 卡数（曾每卡两个实心主按钮）
  assert.equal(countOccurrences(html, 'u-btn-primary'), 3, '每张卡只允许一枚主按钮')
})

test('只有副线路有货：主线路不留死锚点', async () => {
  const html = await renderSection(
    { appleIds: { nanoCloud: [], fangQiangNan: [ACCOUNT(9)] } },
    { userInfo: { id: 7 } },
  )

  expectExcludes(html, 'id="nano-cloud"', '空线路不应渲染成区块')
  expectExcludes(html, 'href="#nano-cloud"', '空线路不能留一个点了没反应的锚点')
  expectIncludes(html, 'id="fang-qiang-nan"', '有货的线路照常渲染')
  // 空线路以「暂无」出现在切换条里，作为不可点状态
  expectIncludes(html, '暂无', '空线路在切换条里显示「暂无」')
})

test('加载态：role="status" + 共享 spinner，不渲染半成品网格', async () => {
  const html = await renderSection(
    { appleIdsLoading: true, appleIds: { nanoCloud: [], fangQiangNan: [] } },
    { userInfo: { id: 7 } },
  )

  expectIncludes(html, 'role="status"', '加载态要有 role="status" 供读屏播报')
  expectIncludes(html, 'u-spinner', '复用共享 spinner')
  expectExcludes(html, 'apple-id-card', '加载中不渲染空网格')
})

test('失败态：走 InlineErrorNote，后端原文折进技术信息', async () => {
  const html = await renderSection(
    { appleIdsError: 'Request failed with status code 500' },
    { userInfo: { id: 7 } },
  )

  expectIncludes(html, 'inline-error', '复用统一失败面板')
  expectIncludes(html, '账号列表加载失败', '标题只讲人话')
  assert.ok(
    !html.includes('<h3 class="inline-error__title">Request failed'),
    '不允许把后端原文当标题',
  )
  expectIncludes(html, 'Request failed with status code 500', '原文折进技术信息里')
})

test('两条线路都空：给空态说明，不渲染空网格', async () => {
  const html = await renderSection(
    { appleIds: { nanoCloud: [], fangQiangNan: [] } },
    { userInfo: { id: 7 } },
  )

  expectIncludes(html, '现在还没有可用账号', '空态标题')
  expectExcludes(html, 'apple-id-card', '没有账号就不渲染卡片')
  expectExcludes(html, 'data-source-section', '没有账号就不渲染空的线路区块')
})

test('更新时间说人话：34 分钟前更新（不是精确到秒）', async () => {
  const html = await renderSection(
    { appleIds: { nanoCloud: [ACCOUNT(4)], fangQiangNan: [] } },
    { userInfo: { id: 7 } },
  )

  expectIncludes(html, '34 分钟前更新', '相对时间承担「这号还新不新」')
  // 数据源名（FangQiangNan）只允许出现在代码注释里，不能作为可见文本渲染出来
  expectExcludes(html, '>FangQiangNan<', '数据源内部字段不上屏')
})

// ══════════════════════════════════════════════════════════
// 4.30.0：风险门禁 + 教程
// ══════════════════════════════════════════════════════════

async function renderGate() {
  const [pinia, env] = await Promise.all([createPiniaWithState({}), createRenderEnv()])
  return renderComponent('/components/AppleIdRiskGate.vue', {
    plugins: [pinia, env.router],
    globalComponents: env.globalComponents,
  })
}

async function renderGuide() {
  const [pinia, env] = await Promise.all([createPiniaWithState({}), createRenderEnv()])
  return renderComponent('/components/AppleIdGuide.vue', {
    plugins: [pinia, env.router],
    globalComponents: env.globalComponents,
  })
}

test('风险门禁：未确认时给弹窗，且不渲染目录内容', async () => {
  const html = await renderGate()

  expectIncludes(html, 'role="alertdialog"', '两条风险提示是取号的前置条件，用 alertdialog')
  expectIncludes(html, 'aria-modal="true"', '模态语义')
  expectIncludes(html, '只登 App Store', '第一条：锁机风险')
  expectIncludes(html, '本站不收解锁费', '第二条：诈骗提示')
  expectIncludes(html, '我已了解，加载账号', '唯一的继续动作')

  // 关键：门禁未确认时不挂载 slot —— 目录不在 DOM 里，请求自然不会发出
  expectExcludes(html, 'apple-id-card', '确认之前不允许出现账号卡')
  expectExcludes(html, 'data-source-section', '确认之前不允许出现线路区块')
})

test('风险门禁：移动端确认一次即记住，桌面端每次都问', async () => {
  const source = read('src/components/AppleIdRiskGate.vue')

  assert.match(source, /localStorage/, '移动端把「已确认」记在本地')
  assert.match(
    source,
    /max-width:\s*767px/,
    '读写记忆必须按窄屏判定：桌面端每次都提示，不能一次点掉永久同意',
  )
  assert.match(source, /<slot v-else \/>/, '门禁通过后才挂载目录（v-else 的 slot）')
})

test('教程：三步 + 示意图 + 五问，配图走 public 目录', async () => {
  const html = await renderGuide()

  expectIncludes(html, 'guide-steps', '三步是有序列表，不是并排卡片')
  expectIncludes(html, '登录 App Store', '第一步')
  expectIncludes(html, '下载软件', '第二步')
  expectIncludes(html, '退出账号', '第三步')
  expectIncludes(html, '只在 App Store 登录，不要在「设置」里登', '第一步的警告必须留下')

  expectIncludes(html, 'apple-id-guide.jpg', '示意图来自 public/ 的静态图')
  expectIncludes(html, 'figure-caption', '图下要有一句「图里在做什么」')

  expectIncludes(html, '用共享 ID 会不会把手机锁了？', 'FAQ 第一条')
  expectIncludes(html, '下载好小火箭之后呢？', 'FAQ 最后一条')
})

test('教程有两种容器：桌面切换目录视图，窄屏开抽屉', async () => {
  const source = read('src/components/AppleIdSection.vue')

  assert.match(source, /guide-entry--mobile/, '窄屏有独立入口按钮，放在目录最上方')
  assert.match(source, /ec-drawer/, '窄屏教程走侧边抽屉（复用共享抽屉样式）')
  assert.match(source, /showGuideView/, '桌面把目录整块换成教程视图，而不是折叠展开')
  assert.match(source, /guide-view/, '教程视图容器')
  // 折叠块已删除：再留 guide-toggle 就说明页面还藏着第二套说明
  assert.equal(/guide-toggle/.test(source), false, '折叠说明已由教程视图取代')
})

test('风险门禁：弹窗不再有页脚说明，文案只留标题 + 两条风险 + 两个动作', async () => {
  const html = await renderGate()
  const source = read('src/components/AppleIdRiskGate.vue')

  expectExcludes(html, 'risk-foot', '4.31.0 去掉弹窗页脚：记忆策略已在交互里体现，不必再写一遍')
  assert.equal(/riskGateFoot/.test(source), false, '页脚节点与词条一起删干净')

  const zh = read('src/i18n/locales/zh-CN.js')
  const en = read('src/i18n/locales/en-US/tools.js')
  assert.equal(/riskGateFoot/.test(zh), false, '中文词条已移除页脚文案')
  assert.equal(/riskGateFoot/.test(en), false, '英文词条已移除页脚文案')
})

test('左轨：确认弹窗之后，风险提示仍常驻（桌面）', async () => {
  const html = await renderSection(
    { appleIds: { nanoCloud: [ACCOUNT(1)], fangQiangNan: [] } },
    { userInfo: { id: 1, username: 'tester' } },
  )

  expectIncludes(html, 'rail-risk', '桌面左轨保留风险块')
  expectIncludes(html, '只登 App Store', '风险块里仍有锁机提醒')
  expectIncludes(html, '本站不收解锁费', '风险块里仍有诈骗提醒')
  expectIncludes(html, 'guide-entry', '教程入口与风险块并存')
})

test('线路跳转：教程视图下点左栏线路，一步回到该线路目录', async () => {
  const source = read('src/components/AppleIdSection.vue')

  assert.match(source, /jumpToLane/, '线路点击有统一的跳转处理')
  assert.match(source, /@click\.prevent="jumpToLane/, '线路链接拦截默认锚点跳转，改走处理函数')
  assert.match(source, /nextTick/, '先切回列表再取目标元素：视图切换后 DOM 才存在')
  assert.match(source, /scrollIntoView/, '滚动到目标线路')
  assert.match(source, /prefers-reduced-motion/, '尊重系统的减少动效设置')
})


test('英文词条齐全：门禁与教程不回落成中文，也不漏 key', async () => {
  const { i18n } = await import('@/i18n/index.js')
  const previous = i18n.global.locale.value
  i18n.global.locale.value = 'en-US'

  try {
    const gate = await renderGate()
    expectIncludes(gate, 'Two things before you take an account', '门禁标题已翻译')
    expectIncludes(gate, 'App Store only', '风险条已翻译')

    const guide = await renderGuide()
    expectIncludes(guide, 'Sign in to the App Store', '教程第一步已翻译')
    expectIncludes(guide, 'Can a shared ID lock my phone?', 'FAQ 已翻译')

    // fallbackLocale 是中文：漏翻的 key 会静默回落成中文，断言里必须挡住这种情况。
    // SSR 会保留模板注释（注释里本来就是中文），先剥掉再查可见文本。
    const visible = guide.replace(/<!--[\s\S]*?-->/g, '')
    const leftovers = ['使用教程', '新手先读', '三步用上共享 ID', '常见问题']
    for (const word of leftovers) {
      assert.equal(visible.includes(word), false, `英文界面残留中文：${word}`)
    }
    assert.equal(/\{\w+\}/.test(visible), false, '不允许把未插值的占位符渲染出来')
  } finally {
    i18n.global.locale.value = previous
  }
})

