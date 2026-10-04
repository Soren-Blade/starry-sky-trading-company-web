import test from 'node:test'
import assert from 'node:assert/strict'

import { classifyToolsByClass } from '../src/hooks/useClass/index.js'

/** 构造一个最小可用的工具对象 */
const tool = (over = {}) => ({
  id: 1,
  class: 'video',
  class_name: '视频工具',
  tool_name: '工具',
  tool_slug: 't-1',
  description: '',
  sort_order: 10,
  collection_count: 0,
  icon: '🔧',
  is_new: false,
  ...over,
})

test('classifyToolsByClass：非数组入参抛错', () => {
  assert.throws(() => classifyToolsByClass(null), /必须是一个数组/)
  assert.throws(() => classifyToolsByClass({}), /必须是一个数组/)
  assert.throws(() => classifyToolsByClass('x'), /必须是一个数组/)
})

test('classifyToolsByClass：空数组返回仅含 all 分类的合法结构', () => {
  const result = classifyToolsByClass([])
  assert.equal(result.classes.length, 1)
  assert.equal(result.classes[0].class, 'all')
  assert.equal(result.classes[0].count, 0)
  assert.deepEqual(result.classes[0].tools, [])
  assert.deepEqual(result.classified, {})
})

test('classifyToolsByClass：按 class 分组', () => {
  const result = classifyToolsByClass([
    tool({ id: 1, class: 'video' }),
    tool({ id: 2, class: 'dev' }),
    tool({ id: 3, class: 'video' }),
  ])

  assert.equal(result.classified.video.length, 2)
  assert.equal(result.classified.dev.length, 1)
  // classes[0] 固定是 all 分类
  assert.equal(result.classes[0].class, 'all')
  assert.equal(result.classes[0].count, 3)
})

test('classifyToolsByClass：all 分类排在最前，且保留全部工具', () => {
  const result = classifyToolsByClass([
    tool({ id: 1, class: 'dev', sort_order: 1 }),
    tool({ id: 2, class: 'video', sort_order: 2 }),
  ])

  assert.equal(result.classes[0].class, 'all')
  assert.equal(result.classes[0].tools.length, 2)
  assert.equal(result.classes[0].sort_order, 0)
})

test('classifyToolsByClass：分类内按 sort_order 升序', () => {
  const result = classifyToolsByClass([
    tool({ id: 1, class: 'video', sort_order: 30 }),
    tool({ id: 2, class: 'video', sort_order: 10 }),
    tool({ id: 3, class: 'video', sort_order: 20 }),
  ])

  assert.deepEqual(result.classified.video.map((t) => t.id), [2, 3, 1])
})

test('classifyToolsByClass：sortDirection=desc 时降序', () => {
  const result = classifyToolsByClass(
    [tool({ id: 1, sort_order: 10 }), tool({ id: 2, sort_order: 30 })],
    { sortDirection: 'desc' }
  )
  assert.deepEqual(result.classified.video.map((t) => t.id), [2, 1])
})

test('classifyToolsByClass：sortByOrder=false 时保持输入顺序', () => {
  const result = classifyToolsByClass(
    [tool({ id: 1, sort_order: 30 }), tool({ id: 2, sort_order: 10 })],
    { sortByOrder: false }
  )
  assert.deepEqual(result.classified.video.map((t) => t.id), [1, 2])
})

test('classifyToolsByClass：class 为 undefined 时归入 all 之外的独立分组而不丢数据', () => {
  const result = classifyToolsByClass([tool({ id: 9, class: undefined })])
  assert.equal(result.classes.find((c) => c.class === 'all').count, 1)
  // 不因缺字段而丢工具
  const total = result.classes.filter((c) => c.class !== 'all').flatMap((c) => c.tools)
  assert.equal(total.length, 1)
})

test('classifyToolsByClass：class_name 缺失时回退到内置映射', () => {
  const result = classifyToolsByClass([tool({ class: 'video', class_name: undefined })])
  const videoGroup = result.classes.find((c) => c.class === 'video')
  assert.equal(videoGroup.class_name, '视频工具')
})

test('classifyToolsByClass：未知 class 且无 class_name 时回退为 class 本身', () => {
  const result = classifyToolsByClass([
    tool({ class: 'mystery', class_name: undefined }),
  ])
  const group = result.classes.find((c) => c.class === 'mystery')
  assert.equal(group.class_name, 'mystery')
})

test('classifyToolsByClass：customClassMapping 覆盖内置映射', () => {
  const result = classifyToolsByClass([tool({ class: 'video', class_name: undefined })], {
    customClassMapping: { video: '自定义视频' },
  })
  assert.equal(result.classes.find((c) => c.class === 'video').class_name, '自定义视频')
})

test('classifyToolsByClass：缺 icon 时使用默认图标（曾因 getDefaultIcon 未定义而抛错）', () => {
  // 这一条专门保护 goDefaultIcon 的补齐：图标缺失时不能抛 ReferenceError
  const result = classifyToolsByClass([tool({ class: 'video', icon: undefined })])
  const group = result.classes.find((c) => c.class === 'video')
  assert.equal(typeof group.icon, 'string')
  assert.ok(group.icon.length > 0)
})

test('classifyToolsByClass：从工具中取到 icon 时优先使用它', () => {
  const result = classifyToolsByClass([tool({ class: 'video', icon: '🎬' })])
  assert.equal(result.classes.find((c) => c.class === 'video').icon, '🎬')
})

test('classifyToolsByClass：includeAllCategory=false 时不生成 all 分类', () => {
  const result = classifyToolsByClass([tool()], { includeAllCategory: false })
  assert.equal(result.classes.some((c) => c.class === 'all'), false)
  assert.equal(result.classes.length, 1)
})

test('classifyToolsByClass：includeStats=true 时统计字段正确（含除零保护）', () => {
  const result = classifyToolsByClass(
    [
      tool({ id: 1, class: 'video', collection_count: 100 }),
      tool({ id: 2, class: 'video', collection_count: 50 }),
      tool({ id: 3, class: 'dev', collection_count: 10 }),
    ],
    { includeStats: true }
  )

  assert.equal(result.stats.totalTools, 3)
  assert.equal(result.stats.classCounts.video, 2)
  assert.equal(result.stats.totalCollectionCount, 160)
  // 曾因未定义 getMostPopularCategory 而抛错
  assert.equal(result.stats.mostPopularCategory, 'video')
  assert.equal(result.stats.totalClasses, 3) // all + video + dev
  assert.ok(Number.isFinite(result.stats.averageToolsPerClass))
})

test('classifyToolsByClass：空列表 + includeStats 不产生 NaN', () => {
  const result = classifyToolsByClass([], { includeStats: true })
  assert.ok(Number.isFinite(result.stats.averageToolsPerClass))
  assert.equal(result.stats.averageToolsPerClass, 0)
  assert.equal(result.stats.mostPopularCategory, null)
})

test('classifyToolsByClass：keepOriginal=false 时输出精简字段', () => {
  const result = classifyToolsByClass([tool({ id: 7, custom_field: 'x' })], {
    keepOriginal: false,
  })
  const [first] = result.classified.video
  assert.equal(first.id, 7)
  assert.equal('custom_field' in first, false)
})

test('classifyToolsByClass：all 分类的 popular_tool 是收藏数最高的工具', () => {
  const result = classifyToolsByClass([
    tool({ id: 1, collection_count: 5 }),
    tool({ id: 2, collection_count: 99, tool_name: '最热' }),
  ])
  assert.equal(result.classes[0].popular_tool.name, '最热')
  assert.equal(result.classes[0].popular_tool.collection_count, 99)
})

test('classifyToolsByClass：has_new_tools 反映分类内是否有新工具', () => {
  const withNew = classifyToolsByClass([tool({ class: 'video', is_new: true })])
  assert.equal(withNew.classes.find((c) => c.class === 'video').has_new_tools, true)

  const withoutNew = classifyToolsByClass([tool({ class: 'video', is_new: false })])
  assert.equal(withoutNew.classes.find((c) => c.class === 'video').has_new_tools, false)
})

test('classifyToolsByClass：不修改传入的原始数组元素引用（keepOriginal 下为浅拷贝）', () => {
  const original = tool({ id: 1, class: 'video', class_name: undefined })
  const result = classifyToolsByClass([original])
  // 输出对象不应把 class_name 写回调用方的对象
  assert.equal(original.class_name, undefined)
  assert.equal(result.classified.video[0].class_name, '视频工具')
})
