import test from 'node:test'
import assert from 'node:assert/strict'

import { renderComponent, createPiniaWithState, createRenderEnv } from './render.mjs'

/**
 * 带数据的组件渲染测试
 *
 * `renderComponents.test.js` 渲染的是各组件的**默认/空态**；本文件进一步注入真实
 * store 数据，验证「表格列是否真的渲染出内容」。
 *
 * 这类缺陷靠空态渲染发现不了：本次就抓到一个 —— `#bodyCell` 插槽缺少 `card_name`
 * 分支，导致「卡密名称」整列为空（表格有表头、其它列都有值，只有这一列是空的）。
 */

/** 一个已登录用户 */
const LOGGED_IN_USER = { userInfo: { id: 7, user_type: 'registered', nickname: '测试用户' } }

/** 两条卡密：一条未使用（永久有效）、一条已使用 */
const KAMI_ROWS = [
  {
    id: 1,
    card_name: '月卡',
    card_value: 30,
    card_no_display: '****1111',
    status: 'unused',
    status_text: '未使用',
    tool_id: 3,
    valid_until: null,
    used_at: null,
  },
  {
    id: 2,
    card_name: '季卡',
    card_value: 90,
    card_no_display: '****2222',
    status: 'used',
    status_text: '已使用',
    tool_id: 7,
    valid_until: '2026-12-31T00:00:00Z',
    used_at: '2026-10-01T08:00:00Z',
  },
]

const TOOLS = { toolData: { tools: [{ id: 3, tool_name: '视频解析' }, { id: 7, tool_name: '图片压缩' }] } }

async function renderKami(overrides = {}) {
  const [pinia, env] = await Promise.all([
    createPiniaWithState({
      user: LOGGED_IN_USER,
      kami: {
        ownerUserId: 7,
        userKamis: KAMI_ROWS,
        pagination: { page: 1, limit: 20, total: 2, total_pages: 1, has_next: false, has_prev: false },
        loading: false,
        error: null,
        ...overrides.kami,
      },
      tool: TOOLS,
    }),
    createRenderEnv(),
  ])
  return renderComponent('/components/KamiSection.vue', {
    plugins: [pinia, env.router],
    globalComponents: env.globalComponents,
  })
}

/** 按行/列解析出所有单元格的纯文本 */
function cells(html) {
  return [...html.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)].map((m) =>
    m[1].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim()
  )
}

function headers(html) {
  return [...html.matchAll(/<th[^>]*>([\s\S]*?)<\/th>/g)].map((m) =>
    m[1].replace(/<[^>]+>/g, '').trim()
  )
}

// ── 表头与列 ───────────────────────────────────────────────────

test('表头包含全部 8 列，且顺序与列定义一致', async () => {
  const html = await renderKami()
  const th = headers(html)
  assert.deepEqual(th, [
    '卡密名称',
    '面值',
    '卡号',
    '状态',
    '有效期至',
    '使用日期',
    '已关联工具',
    '操作',
  ])
})

// ── 每一列都真的有值（本轮抓到的缺陷就在这里） ──────────────────

test('「卡密名称」列渲染出 card_name（曾整列为空）', async () => {
  const html = await renderKami()
  // 这条断言若失败，说明 #bodyCell 插槽缺了 card_name 分支 ——
  // 表头还在、其它列都有值，只有这一列空着，非常容易漏掉
  assert.ok(html.includes('月卡'), '应渲染第一个卡密的名称')
  assert.ok(html.includes('季卡'), '应渲染第二个卡密的名称')

  const tds = cells(html)
  // 每行 8 列，第一列必须是卡密名称
  assert.equal(tds[0], '月卡', `第 1 行第 1 列应为「月卡」，实际 ${JSON.stringify(tds[0])}`)
  assert.equal(tds[8], '季卡', `第 2 行第 1 列应为「季卡」，实际 ${JSON.stringify(tds[8])}`)
})

test('没有任何一列是空的（表格有表头却整列空白是典型缺陷）', async () => {
  const html = await renderKami()
  const tds = cells(html)
  assert.equal(tds.length, 16, `2 行 × 8 列应为 16 个单元格，实际 ${tds.length}`)

  const empty = tds.map((v, i) => ({ i, v })).filter((x) => x.v === '' || x.v === '—')
  // 「使用日期」对未使用卡密显示 —，属预期；其余为空即异常
  const unexpected = empty.filter((x) => x.i % 8 !== 5)
  assert.deepEqual(
    unexpected,
    [],
    `以下单元格为空（列索引 % 8 = ${unexpected.map((x) => x.i % 8).join(',')}）：${JSON.stringify(unexpected)}`
  )
})

// ── 各列内容 ───────────────────────────────────────────────────

test('面值、卡号、状态三列内容正确', async () => {
  const tds = cells(await renderKami())
  assert.equal(tds[1], '30', '第 1 行面值')
  // 卡号单元格里除文本外还有「复制」图标按钮，因此用包含判断
  assert.match(tds[2], /\*\*\*\*1111/, `第 1 行脱敏卡号，实际 ${JSON.stringify(tds[2])}`)
  assert.equal(tds[3], '未使用', '第 1 行状态文案')
  assert.equal(tds[9], '90', '第 2 行面值')
  assert.match(tds[10], /\*\*\*\*2222/, `第 2 行脱敏卡号，实际 ${JSON.stringify(tds[10])}`)
  assert.equal(tds[11], '已使用', '第 2 行状态文案')
})

test('卡号单元格里的复制按钮带 aria-label（图标型按钮必须有无障碍名）', async () => {
  const html = await renderKami()
  assert.match(html, /aria-label="复制脱敏卡号，仅用于核对"/)
  // 卡号列只回传脱敏值，按钮文案必须如实说明，避免用户以为复制到了完整卡号
  assert.match(html, /title="复制脱敏卡号（含掩码，仅用于核对）"/)
})

test('有效期为空时显示「永久有效」，有值时显示格式化日期', async () => {
  const tds = cells(await renderKami())
  assert.equal(tds[4], '永久有效', 'valid_until 为 null 应显示永久有效')
  assert.match(tds[12], /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/, `第 2 行有效期应被格式化，实际 ${tds[12]}`)
})

test('使用日期为空时显示「—」，有值时显示日期', async () => {
  const tds = cells(await renderKami())
  assert.equal(tds[5], '—')
  assert.match(tds[13], /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/, `实际 ${tds[13]}`)
})

test('工具名按 tool_id 解析出来（数字与字符串 id 都能匹配）', async () => {
  const tds = cells(await renderKami())
  assert.equal(tds[6], '🔧 视频解析')
  assert.equal(tds[14], '🔧 图片压缩')
})

test('操作列：未使用的卡密显示「去激活」，已使用的显示占位', async () => {
  const tds = cells(await renderKami())
  assert.equal(tds[7], '去激活')
  assert.equal(tds[15], '已激活')
})

test('计数文案跟随 pagination.total', async () => {
  const html = await renderKami()
  assert.match(html, /共 2 张卡密/)
})

// ── 状态与边界 ─────────────────────────────────────────────────

test('已登录时不显示「请先登录账号」提示', async () => {
  const html = await renderKami()
  assert.equal(html.includes('请先登录账号'), false)
})

test('游客态（isLoggedIn 为 false）显示登录提示且不渲染表格', async () => {
  const [pinia, env] = await Promise.all([
    createPiniaWithState({
      user: { userInfo: { id: 9, user_type: 'guest' } },
      kami: { userKamis: KAMI_ROWS, pagination: { total: 2 } },
      tool: TOOLS,
    }),
    createRenderEnv(),
  ])
  const html = await renderComponent('/components/KamiSection.vue', {
    plugins: [pinia, env.router],
    globalComponents: env.globalComponents,
  })
  assert.match(html, /请先登录账号/)
  assert.equal(html.includes('月卡'), false, '游客不应看到卡密数据')
})

test('空列表时仍渲染表头，并给出空态提示', async () => {
  const html = await renderKami({ kami: { userKamis: [], pagination: { total: 0 } } })
  assert.equal(headers(html).length, 8, '空列表也应保留表头')
  assert.match(html, /共 0 张卡密/)
  assert.match(html, /暂无卡密/, '应显示空态文案')
})

test('error 存在时渲染错误横幅', async () => {
  const html = await renderKami({ kami: { userKamis: [], error: '获取卡密列表失败' } })
  assert.match(html, /获取卡密列表失败/)
  assert.match(html, /role="alert"/, '错误提示应带 role=alert')
})

test('渲染结果不含 undefined / NaN 插值事故', async () => {
  const html = await renderKami()
  for (const bad of ['>undefined<', '>NaN<', '[object Object]']) {
    assert.equal(html.includes(bad), false, `输出中出现了 ${bad}`)
  }
})

test('status 字段异常时回退到客户端状态文案（不显示空白）', async () => {
  const html = await renderKami({
    kami: {
      userKamis: [
        {
          id: 1,
          card_name: '异常卡',
          card_value: 1,
          card_no_display: '****0000',
          status: 'toString', // 原型链属性名：查表若走原型链会取到函数
          status_text: '',
          tool_id: null,
          valid_until: null,
          used_at: null,
        },
      ],
      pagination: { total: 1 },
    },
  })
  const tds = cells(html)
  assert.equal(tds[3], 'toString', '未识别状态应原样显示，而不是留空或显示函数')
  assert.equal(tds[3].includes('function'), false)
})
