import test from 'node:test'
import assert from 'node:assert/strict'

import {
  renderComponent,
  createPiniaWithState,
  createRenderEnv,
  expectIncludes,
  expectExcludes,
} from './render.mjs'

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
