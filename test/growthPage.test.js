import test from 'node:test'
import assert from 'node:assert/strict'

import { renderComponent, createPiniaWithState, createRenderEnv } from './render.mjs'

/**
 * 成长值页（`/growth`）渲染测试
 *
 * 这一页是新需求「缺少成长值体系的有效展示页」的落地，三件事最容易出错，
 * 因此每个都单独有用例：
 *   1. **满级（V8）时后端不下发 `next_level` 系列四个键** —— 判据必须是
 *      `!== undefined`。写成 `> 0` 或 `if (x)` 就会把进度块藏掉或渲染出
 *      「再攒 undefined 成长值」。
 *   2. **门槛/进度数字只能来自服务端 `summary`** —— 用例断言库里给的
 *      500/437 这些数字被原样渲染出来（前端没有第二份门槛表）。
 *   3. **非会员也要能看** —— 这一页的价值有一半是「我现在 0 分，怎么才能涨」，
 *      所以 level 为 `none` 时不能整页空白。
 */

/** 一个已登录用户（页面只判 `isLoggedIn`） */
const LOGGED_IN_USER = { userInfo: { id: 7, user_type: 'registered', nickname: '测试用户' } }

/** 服务端 `getGrowthHistory` 的形状（照抄 §4.3） */
const SUMMARY = {
  growth: 63,
  level: 'v1',
  level_name: 'V1',
  growth_threshold: 0,
  is_member: false,
  effective_level: 'none',
  effective_level_name: '',
  next_level: 'v2',
  next_level_name: 'V2',
  next_level_threshold: 500,
  growth_to_next: 437,
  thresholds: [
    { level: 'v1', name: 'V1', growth_threshold: 0 },
    { level: 'v2', name: 'V2', growth_threshold: 500 },
  ],
}

const RULES = [
  { key: 'earn_order', name: '消费得值', desc: '订单一经确认，按实付金额 1 元 = 1 成长值发放。' },
  { key: 'earn_checkin', name: '每日签到', desc: '每天签到可得 5 成长值。' },
  { key: 'earn_card', name: '卡密兑奖', desc: '卡密按面值 × 10 发放成长值。' },
]

const ROWS = [
  {
    id: 2,
    delta: 58,
    growth_after: 63,
    type: 'earn_order',
    type_text: '消费得值',
    ref_order_no: 'SSTC20261012001',
    remark: '订单消费得成长值（实付 ¥58.80）',
    created_at: '2026-10-12T02:10:10.602Z',
  },
  {
    id: 1,
    delta: 5,
    growth_after: 5,
    type: 'earn_checkin',
    type_text: '每日签到',
    ref_order_no: null,
    remark: '每日签到（连签 1 天）',
    created_at: '2026-10-11T02:10:10.602Z',
  },
]

/** 渲染成长值页；`member` 覆盖项直接写进 store（选项式 store 可直接赋值，无需 mock api） */
async function renderGrowth(member = {}, options = {}) {
  const [pinia, env] = await Promise.all([
    createPiniaWithState({
      user: options.guest ? {} : LOGGED_IN_USER,
      member: {
        growth: ROWS,
        growthSummary: SUMMARY,
        growthRules: RULES,
        growthPage: 1,
        growthTotal: 2,
        growthTotalPages: 1,
        loadingGrowth: false,
        error: '',
        ...member,
      },
    }),
    createRenderEnv(),
  ])
  return renderComponent('/pages/Growth.vue', {
    plugins: [pinia, env.router],
    globalComponents: env.globalComponents,
  })
}

/** 捕获渲染期间的 Vue 警告：模板绑定错了往往只表现为一条警告而不抛错 */
async function captureWarnings(fn) {
  const warnings = []
  const savedWarn = console.warn
  const savedError = console.error
  console.warn = (...args) => warnings.push(args.map(String).join(' '))
  console.error = (...args) => warnings.push(args.map(String).join(' '))
  try {
    return { html: await fn(), warnings }
  } finally {
    console.warn = savedWarn
    console.error = savedError
  }
}

test('未登录：显示登录引导，不渲染汇总与明细', async () => {
  const html = await renderGrowth({}, { guest: true })
  assert.match(html, /请先登录账号/)
  assert.doesNotMatch(html, /累计成长值/)
  // 用章节 id 判定「明细区整块没渲染」：文案里本来就有「查看成长值明细」这句话
  assert.doesNotMatch(html, /id="growth-history-title"/)
  assert.doesNotMatch(html, /role="progressbar"/)
})

test('已登录：汇总三个数字原样来自服务端 summary', async () => {
  const html = await renderGrowth()
  assert.match(html, /累计成长值/)
  assert.match(html, />\s*63\s*</)
  assert.match(html, /成长值等级/)
  assert.match(html, /V1/)
  // 门槛 0 来自 summary.growth_threshold，不是前端算的
  assert.match(html, /门槛 0/)
  // 生效等级为空（非会员）时显示「未开通」，不留空白
  assert.match(html, /未开通/)
  // 汇总卡走共享分片 §23 的 .u-mm-stat-*（卡面不再由页面自己画）
  assert.match(html, /u-mm-stat-grid/)
  assert.match(html, /u-mm-stat-label[\s\S]{0,40}累计成长值/)
  assert.match(html, /u-mm-stat-num[\s\S]{0,10}63/)
})

test('升级进度：再攒 437 到 V2（门槛 500），进度条按 63/500 给 13%', async () => {
  const html = await renderGrowth()
  assert.match(html, /再攒/)
  assert.match(html, /437/)
  assert.match(html, /升到\s*V2/)
  assert.match(html, /门槛 500/)
  // 进度条是可读的无障碍控件：aria-valuetext 带上真实数字
  assert.match(html, /role="progressbar"/)
  assert.match(html, /aria-valuenow="13"/)
  assert.match(html, /已攒 63，还差 437/)
  assert.match(html, /width:13%/)
  // 进度条几何走共享分片 §8 的 .u-mm-growth-track / -fill
  assert.match(html, /class="u-mm-growth-track"/)
  assert.match(html, /class="u-mm-growth-fill"/)
})

test('满级：后端不给 next_level 四键时，进度块整块不渲染且不出现 undefined', async () => {
  const maxed = { ...SUMMARY, level: 'v8', level_name: 'V8', growth: 46063, next_level: null }
  delete maxed.growth_to_next
  delete maxed.next_level_name
  delete maxed.next_level_threshold
  const html = await renderGrowth({ growthSummary: maxed })
  assert.match(html, /V8/)
  assert.doesNotMatch(html, /再攒/)
  assert.doesNotMatch(html, /progressbar/)
  assert.doesNotMatch(html, /undefined/)
})

test('来源说明与明细：文案、单号、增减颜色类名都渲染出来', async () => {
  const html = await renderGrowth()
  assert.match(html, /怎么攒成长值/)
  assert.match(html, /消费得值/)
  assert.match(html, /每天签到可得 5 成长值/)
  assert.match(html, /卡密按面值 × 10 发放成长值/)
  // 明细：+58 与累计 63、单号
  assert.match(html, /\+58/)
  assert.match(html, /累计 63/)
  assert.match(html, /SSTC20261012001/)
  // 增减颜色走共享分片 §16 的语义修饰符，不再是页面私有的 is-earn / is-spend
  assert.match(html, /u-mm-ledger-delta--earn/)
  // 两行都渲染（不是只渲染第一行）
  assert.match(html, /\+5/)
  assert.match(html, /累计 5/)
})

test('明细为空：显示空态而不是一片空白（出错与空数据分开）', async () => {
  const html = await renderGrowth({ growth: [], growthTotal: 0 })
  assert.match(html, /还没有成长值记录/)
  assert.doesNotMatch(html, /SSTC20261012001/)
})

test('出错：显示重试按钮与错误信息，不显示成「暂无记录」', async () => {
  const html = await renderGrowth({ growth: [], error: '获取成长值明细失败' })
  assert.match(html, /获取成长值明细失败/)
  assert.match(html, /role="alert"/)
  assert.doesNotMatch(html, /还没有成长值记录/)
})

test('分页：多于 1 页时才渲染控件', async () => {
  const paged = await renderGrowth({ growthTotalPages: 3, growthTotal: 45 })
  assert.match(paged, /上一页/)
  assert.match(paged, /下一页/)
  assert.match(paged, /1 \/ 3/)
  assert.match(paged, /共 45 条/)
  // 分页壳走共享分片 §4：信息在左、按钮在右
  assert.match(paged, /class="u-mm-pager"/)
  assert.match(paged, /class="u-mm-pager-info"/)
  assert.match(paged, /class="u-mm-pager-btns"/)

  const single = await renderGrowth()
  assert.doesNotMatch(single, /上一页/)
})

test('等级门槛表：与套餐页共用组件，且只展示门槛（无折扣/倍率列）', async () => {
  const html = await renderGrowth()
  assert.match(html, /等级门槛/)
  assert.match(html, /成长值门槛/)
  // thresholds 里只有门槛数据，两列折扣/倍率必须藏掉，而不是渲染 undefined
  assert.doesNotMatch(html, /消费折扣/)
  assert.doesNotMatch(html, /积分倍率/)
  assert.doesNotMatch(html, /undefined/)
})

test('渲染期间不产生 Vue 警告（模板绑定错误的唯一信号）', async () => {
  const { warnings } = await captureWarnings(() => renderGrowth())
  assert.deepEqual(warnings.filter((w) => w.includes('[Vue warn]')), [])
})

// 迁移守护：这一页的四块（汇总 / 进度 / 对照表 / 明细）都改走共享分片了，
// 页面私有的那几套类名不许再回来 —— 它们正是「六个页面各抄一份」的来源。
test('不再保留页面私有的汇总 / 进度 / 明细 / 分页类名', async () => {
  const html = await renderGrowth({ growthTotalPages: 3, growthTotal: 45 })
  assert.doesNotMatch(html, /growth-summary/)
  assert.doesNotMatch(html, /growth-stat-label|growth-stat-value/)
  assert.doesNotMatch(html, /growth-progress/)
  assert.doesNotMatch(html, /growth-list|growth-item/)
  assert.doesNotMatch(html, /growth-pager/)
  assert.doesNotMatch(html, /growth-matrix-wrap/)
  assert.doesNotMatch(html, /is-earn|is-spend/)
})
