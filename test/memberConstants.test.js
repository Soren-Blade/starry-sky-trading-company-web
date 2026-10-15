import test from 'node:test'
import assert from 'node:assert/strict'

import { ICONS } from '../src/utils/iconSet.js'
import {
  MEMBER_BENEFITS,
  MEMBER_LEVELS,
  MEMBER_MATRIX_LABELS,
  discountLabel,
  memberMatrixColumns,
} from '../src/constants/member.js'

/**
 * 会员文案常量的一致性守卫
 *
 * ## 为什么需要
 *
 * `appIcon.test.js` 只能静态检查模板里**字面量**图标名（`name="star"`）。
 * 而权益矩阵是动态绑定（`:name="item.icon"`），常量文件里写错一个名字
 * **门禁完全看不见** —— 页面上就是一块空白，不报错、不警告。
 *
 * 实测踩到过：`constants/member.js` 里的 `tag` 与 `headset` 当时**并不存在于
 * ICONS**，于是「专属折扣」与「专属客服」两张卡片渲染成空白图标，
 * 712 个测试全绿。所以这里把动态名字也钉住。
 *
 * ## 还守什么
 *
 * 八项权益的 `requiredLevel` 必须与后端 `sstc.get_member_snapshot` 里的
 * 映射一致（v1: discount / points_boost / coupon_pack / points_deduct / free_tool，
 * v3: identity，v4: birthday / support）。不一致会出现「矩阵说未解锁、后端说已解锁」，
 * 两边都不报错 —— 这类静默分叉只能靠断言发现。
 *
 * v1.4.0 起还多守一项：`valueType`（前端副本）必须等于后端 `value.type`
 * （迁移 `2026-10-15-member-level-values-v2.sql` 的 `d.vtype`）。它不参与渲染，
 * 只为「加权益时两边一起改」留一道门。
 */

test('八项权益的图标名都必须在 ICONS 里存在（动态绑定，模板门禁查不到）', () => {
  const missing = MEMBER_BENEFITS
    .filter((b) => !ICONS[b.icon])
    .map((b) => `${b.key} → ${b.icon}`)

  assert.deepEqual(
    missing,
    [],
    `这些权益的图标名不存在，页面会渲染成空白图标且不报错：\n  ${missing.join('\n  ')}`
  )
})

test('八项权益恰好 8 项，且 key 不重复', () => {
  // hero 文案 `member-level` 写死「已解锁 8 项」—— 多一项少一项都是说谎
  assert.equal(MEMBER_BENEFITS.length, 8, '权益必须是 8 项（hero 文案写死的）')
  const keys = MEMBER_BENEFITS.map((b) => b.key)
  assert.equal(new Set(keys).size, keys.length, `key 有重复：${keys.join(', ')}`)
})

test('权益的 key / requiredLevel / valueType 与后端 get_member_snapshot 逐一对应', () => {
  // 后端 sstc.get_member_snapshot 里的固定顺序、所需等级与 value.type
  // （v1.4.0 起八项：五项成长型权益自 v1 解锁，档位差异体现在数值上）
  const BACKEND = [
    ['discount', 'v1', 'rate'],
    ['points_boost', 'v1', 'multiplier'],
    ['coupon_pack', 'v1', 'money'],
    ['points_deduct', 'v1', 'percent'],
    ['free_tool', 'v1', 'quota'],
    ['identity', 'v3', 'tier'],
    ['birthday', 'v4', 'money'],
    ['support', 'v4', 'tier'],
  ]
  assert.deepEqual(
    MEMBER_BENEFITS.map((b) => [b.key, b.requiredLevel, b.valueType]),
    BACKEND,
    '前端权益的顺序 / 所需等级 / 数值类型与后端不一致 —— 会出现「矩阵说未解锁、后端说已解锁」或「数值画错单位」'
  )
})

test('每项权益都有名称与描述（空文案会渲染出空白卡片）', () => {
  for (const b of MEMBER_BENEFITS) {
    assert.ok(b.name && b.name.trim() !== '', `${b.key} 缺少 name`)
    assert.ok(b.desc && b.desc.trim() !== '', `${b.key} 缺少 desc`)
  }
})

test('权益 detail 是「一段字符串」，不是字符串数组', () => {
  // 页面直接 {{ item.detail }} 渲染。若哪天把它改成数组（或写成 `|| []`），
  // 而模板又用 v-for 逐项渲染，字符串就会被**按字符展开**成一个汉字一行 ——
  // 这是实测踩到的坑：lint / test / build 全绿，只有截图能看出来。
  for (const b of MEMBER_BENEFITS) {
    assert.equal(Array.isArray(b.detail), false, `${b.key} 的 detail 必须是字符串，不能是数组`)
    assert.equal(typeof b.detail, 'string', `${b.key} 的 detail 必须是字符串`)
    assert.notEqual(b.detail.trim(), '', `${b.key} 的 detail 不能为空（空的话整段不渲染）`)
  }
})

test('权益的 requiredLevel 都是已知等级（写错会渲染出「升级到 解锁」）', () => {
  for (const b of MEMBER_BENEFITS) {
    assert.ok(
      Object.hasOwn(MEMBER_LEVELS, b.requiredLevel) && b.requiredLevel !== 'none',
      `${b.key} 的 requiredLevel=${b.requiredLevel} 不是有效等级`
    )
  }
})

test('等级表含 none 与 v1–v8 八档，且 id 与后端 member_levels 取值一致', () => {
  assert.deepEqual(Object.keys(MEMBER_LEVELS).sort(), ['none', 'v1', 'v2', 'v3', 'v4', 'v5', 'v6', 'v7', 'v8'])
  assert.equal(MEMBER_LEVELS.none.name, '', '非会员没有等级名（空串，不是「非会员」三个字）')
  // 展示名就是等级名本身（v1.2.0 起的命名决策：等级叫 V1–V8，不再用「星辉/星耀」别名）
  for (const id of ['v1', 'v4', 'v8']) {
    assert.equal(MEMBER_LEVELS[id].name, id.toUpperCase())
    assert.equal(MEMBER_LEVELS[id].level, id)
  }
  // 门槛、折扣、倍率一律由后端下发，前端 constants 里不许出现第二份数字
  const numbers = JSON.stringify(MEMBER_LEVELS)
  assert.equal(/\d{2,}/.test(numbers), false, 'MEMBER_LEVELS 里不应出现门槛/折扣类数字（那是后端的事实）')
})

test('discountLabel：折扣率只翻译不计算，非法值不渲染成「0 折」', () => {
  // 套餐卡片的「消费 95 折」与等级阶梯表的「消费折扣」列共用这一份翻译
  assert.equal(discountLabel(0.95), '95 折')
  assert.equal(discountLabel(0.9), '9 折', '整十的折扣要走中文习惯（9 折，不是 90 折）')
  assert.equal(discountLabel(0.82), '82 折')
  assert.equal(discountLabel(0.945), '94.5 折', '折扣率允许两位小数')

  // 不打折（1）与脏数据都必须给「无折扣」：显示「0 折」比不显示更糟
  for (const bad of [1, 0, -0.1, null, undefined, NaN, 'abc']) {
    assert.equal(discountLabel(bad), '无折扣', `discountLabel(${String(bad)}) 应为「无折扣」`)
  }
})

/**
 * 矩阵列的唯一来源（1.6.0）
 *
 * `/member/benefits` 与 `/member/growth` 原先各写一份 `MATRIX_COLUMNS`：
 * 同一组 `{ key, field }` 抄两遍，加一项权益时漏改一处就会出现
 * 「一个页面有 8 列、另一个 7 列」，两边都不报错。现在列定义只在
 * `constants/member.js` 里，这里把它钉住。
 */
test('矩阵列来自唯一实例：键序与八项权益一致，字段名与后端 levels/thresholds 对齐', () => {
  const columns = memberMatrixColumns()

  assert.deepEqual(
    columns.map((c) => c.key),
    MEMBER_BENEFITS.map((b) => b.key),
    '矩阵列的顺序必须与八项权益一致（后端 benefits[] 也按这个顺序下发）'
  )

  // 字段名是后端 levels[] / thresholds[] 的列名，写错就是整列空白
  const expectedFields = [
    'discount_rate',
    'points_multiplier',
    'coupon_pack_value',
    'points_deduct_cap',
    'free_tool_quota',
    'identity_tier',
    'birthday_value',
    'support_tier',
  ]
  assert.deepEqual(columns.map((c) => c.field), expectedFields)

  // 每一列都要有标题（缺了就是表头空白）
  for (const column of columns) {
    assert.ok(column.label, `列 ${column.key} 缺标题`)
  }
})

test('矩阵列支持按页覆盖标题，未覆盖的列回落默认标题', () => {
  const overridden = memberMatrixColumns({ discount: '折扣率', points_boost: '积分加速' })

  assert.equal(overridden[0].label, '折扣率', '覆盖应生效')
  assert.equal(overridden[1].label, '积分加速')
  assert.equal(overridden[2].label, MEMBER_MATRIX_LABELS.coupon_pack, '未覆盖的列回落默认标题')

  // 覆盖不能改变键序与字段名（只换标题）
  assert.deepEqual(
    overridden.map((c) => c.key),
    memberMatrixColumns().map((c) => c.key)
  )
  assert.equal(overridden[0].field, 'discount_rate', '覆盖标题不应丢掉后端字段名')

  // 不传参时与默认完全一致（调用方不应依赖默认对象被就地修改）
  assert.equal(memberMatrixColumns()[0].label, MEMBER_MATRIX_LABELS.discount)
})
