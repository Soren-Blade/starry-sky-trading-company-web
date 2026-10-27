import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { installStorageStub, installDomStub, loadAppModule } from './setup.js'

/**
 * 工具目录：全量分页聚合 + 搜索覆盖派生标签
 *
 * 背景（线上问题）：
 *   · `/tool` 只显示 20 个工具 —— store 没传 limit，只取到后端默认的第一页；
 *   · 左轨分类计数、分类筛选与搜索都只在这 20 条里进行；
 *   · 搜索只匹配名称与描述，不匹配卡片上已经显示的派生标签（toolTagsOf）。
 *
 * 这里一半是源码契约（本仓库测试的主流写法：读源码 + 正则断言），
 * 一半是行为验证 —— store 是选项式 Pinia store，可以直接替换 api.getTools
 * 的桩喂两页数据，不需要引入新依赖。
 */

const __dirname = dirname(fileURLToPath(import.meta.url))
const WEB_ROOT = join(__dirname, '..')
const read = (relative) => readFileSync(join(WEB_ROOT, relative), 'utf8')

const STORE_SOURCE = read('src/stores/tool.js')
const TOOL_PAGE_SOURCE = read('src/pages/Tool.vue')

/** 取两个锚点之间的源码，避免断言命中文件里别的同名文本 */
function sliceBetween(source, start, end) {
  const from = source.indexOf(start)
  assert.ok(from > -1, `源码中应存在锚点：${start}`)
  const to = source.indexOf(end, from + start.length)
  return source.slice(from, to > -1 ? to : undefined)
}

const FETCH_SOURCE = sliceBetween(STORE_SOURCE, 'async fetchTools(params = {})', '/** 切换当前分类')
const FILTERED_SOURCE = sliceBetween(TOOL_PAGE_SOURCE, 'const filteredTools = computed', 'const toggleFavorites')

// ══════════════════════════════════════════════════════════
// A. 源码契约：分页聚合取全量
// ══════════════════════════════════════════════════════════

test('fetchTools：第一页显式 limit=100，并按 has_next 聚合后续页', () => {
  assert.match(
    STORE_SOURCE,
    /const TOOL_FETCH_PAGE_SIZE = 100/,
    '单页取数必须用后端上限 100，而不是默认的 20'
  )
  assert.match(FETCH_SOURCE, /limit: TOOL_FETCH_PAGE_SIZE/, '第一页请求必须带 limit=100')
  assert.match(FETCH_SOURCE, /pagination\?\.has_next === true/, '必须读取后端的分页字段 has_next')
  assert.match(
    FETCH_SOURCE,
    /const nextTools = nextResponse\.data\?\.tools \?\? \[\]/,
    '后续页要从 data.tools 取数据'
  )
  assert.match(FETCH_SOURCE, /tools\.push\(\.\.\.nextTools\)/, '后续页的 tools 必须累加到同一个数组')
})

test('fetchTools：分页聚合有页数与条数硬上限，防止 has_next 异常时死循环', () => {
  assert.match(STORE_SOURCE, /const TOOL_FETCH_MAX_PAGES = 10/, '必须有页数硬上限 10')
  assert.match(STORE_SOURCE, /const TOOL_FETCH_MAX_TOOLS = 1000/, '必须有条数硬上限 1000')
  assert.match(FETCH_SOURCE, /page < TOOL_FETCH_MAX_PAGES/, '循环条件必须受页数上限约束')
  assert.match(FETCH_SOURCE, /tools\.length < TOOL_FETCH_MAX_TOOLS/, '循环条件必须受条数上限约束')
})

test('fetchTools：外部显式分页时不聚合，保持原有调用方语义', () => {
  assert.match(
    FETCH_SOURCE,
    /params\.page !== undefined \|\| params\.limit !== undefined/,
    '要识别外部是否显式传了 page / limit'
  )
  assert.match(FETCH_SOURCE, /if \(!externallyPaged\)/, '只有非外部分页时才进入聚合循环')
})

test('fetchTools：合并后的 pagination 记录真实总数，而不是第一页的 20', () => {
  assert.match(FETCH_SOURCE, /Number\(serverPagination\?\.total\)/, 'total 必须取后端返回的总数')
  assert.match(FETCH_SOURCE, /limit: tools\.length/, '合并后 limit 取实际条数')
  assert.match(
    FETCH_SOURCE,
    /total: Number\.isFinite\(total\) \? total : tools\.length/,
    'total 缺失时回落到实际条数'
  )
})

// ══════════════════════════════════════════════════════════
// B. 源码契约：搜索覆盖派生标签与 slug
// ══════════════════════════════════════════════════════════

test('Tool.vue：导入 toolTagsOf，并把它接进搜索条件', () => {
  assert.match(
    TOOL_PAGE_SOURCE,
    /import \{ toolTagsOf \} from '@\/constants\/toolTags\.js'/,
    '必须从 constants/toolTags.js 导入 toolTagsOf'
  )
  assert.match(FILTERED_SOURCE, /toolTagsOf\(tool\)\.some\(/, '搜索必须遍历该工具的全部派生标签')
  assert.match(
    FILTERED_SOURCE,
    /tag\.toLowerCase\(\)\.includes\(query\)/,
    '派生标签要小写后与搜索词做 includes 匹配'
  )
  assert.match(FILTERED_SOURCE, /lower\(tool\.tool_slug\)\.includes\(query\)/, '搜索还必须覆盖 tool_slug')
})

test('Tool.vue：分类过滤仍然按 tool.class === activeCategory 工作', () => {
  assert.match(
    FILTERED_SOURCE,
    /tool\.class === activeCategory\.value/,
    '分类筛选分支不能被搜索改动挤掉'
  )
  assert.match(FILTERED_SOURCE, /activeCategory\.value === ACCESS_CARD/, '需要卡密的过滤仍在')
  assert.match(FILTERED_SOURCE, /activeCategory\.value === ACCESS_FREE/, '免费的过滤仍在')
  assert.match(
    FILTERED_SOURCE,
    /favoriteTools\.value\.has\(Number\(tool\.id\)\)/,
    '收藏过滤仍在'
  )
})

test('toolTagsOf：对 undefined / null / 空对象安全，调用处无需额外判空', async () => {
  const { toolTagsOf } = await loadAppModule('/constants/toolTags.js')

  assert.deepEqual(toolTagsOf(undefined), [])
  assert.deepEqual(toolTagsOf(null), [])
  assert.deepEqual(toolTagsOf({}), [])
})

// ══════════════════════════════════════════════════════════
// C. 行为验证：替换 api.getTools，直接跑 store action
// ══════════════════════════════════════════════════════════

installStorageStub()
installDomStub()

const { createPinia, setActivePinia } = await import('pinia')
const { useToolStore } = await loadAppModule('/stores/tool.js')
const api = (await loadAppModule('/api/index.js')).default

function freshStore() {
  setActivePinia(createPinia())
  return useToolStore()
}

/** 临时替换 api.getTools，返回的函数用于恢复 */
function stubGetTools(handler) {
  const original = api.getTools
  api.getTools = handler
  return () => {
    api.getTools = original
  }
}

/** 与 server/toolApi.js 响应体对齐的最小工具对象 */
const makeTool = (id, className, classLabel) => ({
  id,
  class: className,
  class_name: classLabel,
  tool_name: `工具${id}`,
  tool_slug: `tool-${id}`,
  description: `第 ${id} 个工具`,
  sort_order: id,
  collection_count: 0,
  requires_card: false,
  access_policy: 'free',
})

const makePage = (
  tools,
  { pageNum = 1, total = tools.length, hasNext = false, hasPrev = false } = {}
) => ({
  success: true,
  data: {
    tools,
    pagination: {
      page: pageNum,
      limit: 100,
      total,
      total_pages: Math.ceil(total / 100),
      has_next: hasNext,
      has_prev: hasPrev,
    },
    filters: { class: 'all' },
  },
  meta: { count: tools.length, total },
})

test('fetchTools：喂两页数据后 tools 与 classes 都按 3 条计算', async () => {
  const store = freshStore()
  const calls = []
  const responses = [
    makePage([makeTool(1, 'dev', '开发工具'), makeTool(2, 'dev', '开发工具')], {
      total: 3,
      hasNext: true,
    }),
    makePage([makeTool(3, 'video', '视频工具')], { pageNum: 2, total: 3 }),
  ]
  const restore = stubGetTools(async (params) => {
    calls.push(params)
    return responses[(params.page ?? 1) - 1]
  })

  try {
    assert.equal(await store.fetchTools(), true, '两页都成功时 fetchTools 应返回 true')
    assert.equal(calls.length, 2, 'has_next 为真时必须请求第二页')
    assert.equal(calls[0].limit, 100, '第一页必须带 limit=100')
    assert.equal(calls[0].page, undefined, '第一页不显式传 page，交给后端默认值')
    assert.equal(calls[1].page, 2, '第二页 page 应为 2')
    assert.equal(calls[1].limit, 100)

    assert.equal(store.toolData.tools.length, 3, '两页的工具必须全部合并进来')
    assert.deepEqual(
      store.toolData.tools.map((tool) => tool.id),
      [1, 2, 3]
    )

    const all = store.toolData.classes.find((item) => item.class === 'all')
    assert.equal(all.count, 3, '左轨「全部」的计数必须覆盖整份目录')
    const regular = store.toolData.classes.filter((item) => item.class !== 'all')
    assert.deepEqual(
      regular.map((item) => [item.class, item.count]),
      [
        ['dev', 2],
        ['video', 1],
      ],
      '分类计数必须按合并后的 3 条计算'
    )

    assert.deepEqual(store.toolData.pagination, {
      page: 1,
      limit: 3,
      total: 3,
      total_pages: 1,
      has_next: false,
      has_prev: false,
    })
    assert.equal(store.toolsError, null)
    assert.equal(store.toolsLoading, false, 'loading 必须在 finally 里复位')
  } finally {
    restore()
  }
})

test('fetchTools：外部显式传 page / limit 时只请求一页，不聚合', async () => {
  const store = freshStore()
  const calls = []
  const restore = stubGetTools(async (params) => {
    calls.push(params)
    return makePage([makeTool(9, 'dev', '开发工具')], { pageNum: 2, total: 37 })
  })

  try {
    const ok = await store.fetchTools({ page: 2, limit: 10, keyword: 'x' })
    assert.equal(ok, true)
    assert.deepEqual(calls, [{ page: 2, limit: 10, keyword: 'x' }], '外部参数必须原样透传')
    assert.equal(store.toolData.pagination.page, 2, '外部分页信息也应原样透传')
    assert.equal(store.toolData.tools.length, 1)
  } finally {
    restore()
  }
})

test('fetchTools：中途某页失败时保留上一次成功的目录，不写入半份列表', async () => {
  const store = freshStore()

  const restoreFirst = stubGetTools(async () =>
    makePage([makeTool(1, 'dev', '开发工具'), makeTool(2, 'dev', '开发工具')])
  )
  try {
    assert.equal(await store.fetchTools(), true)
  } finally {
    restoreFirst()
  }
  const beforeIds = store.toolData.tools.map((tool) => tool.id)
  assert.deepEqual(beforeIds, [1, 2])

  const restoreFail = stubGetTools(async (params) => {
    if ((params.page ?? 1) === 1) {
      return makePage([makeTool(7, 'dev', '开发工具'), makeTool(8, 'dev', '开发工具')], {
        total: 5,
        hasNext: true,
      })
    }
    return { success: false, message: '第二页炸了' }
  })
  try {
    assert.equal(await store.fetchTools(), false, '任一页失败都应返回 false')
    assert.equal(store.toolsError, '第二页炸了')
    assert.equal(store.toolsLoading, false, '失败后 loading 也必须复位')
    assert.deepEqual(
      store.toolData.tools.map((tool) => tool.id),
      beforeIds,
      '不能把「第一页成功、第二页失败」的半份列表写进 store'
    )
    assert.equal(store.toolData.pagination.total, 2, '失败时 pagination 也应保留上一次成功的值')
  } finally {
    restoreFail()
  }
})

test('fetchTools：has_next 恒真时最多请求 10 页就停（硬上限）', async () => {
  const store = freshStore()
  let calls = 0
  const restore = stubGetTools(async (params) => {
    calls += 1
    const pageNum = params.page ?? 1
    return makePage([makeTool(pageNum, 'dev', '开发工具')], {
      pageNum,
      total: 9999,
      hasNext: true,
    })
  })

  try {
    assert.equal(await store.fetchTools(), true, '触顶是防御性截断，不是错误')
    assert.equal(calls, 10, '最多只允许请求 TOOL_FETCH_MAX_PAGES 页')
    assert.equal(store.toolData.tools.length, 10)
    assert.equal(store.toolData.pagination.total, 9999, 'total 仍记录后端给的真实总数')
  } finally {
    restore()
  }
})
