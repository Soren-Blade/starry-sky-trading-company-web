import test from 'node:test'
import assert from 'node:assert/strict'

import { ICONS } from '../src/utils/iconSet.js'
import { MEMBER_BENEFITS, MEMBER_LEVELS, discountLabel } from '../src/constants/member.js'

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
 * 六项权益的 `requiredLevel` 必须与后端 `sstc.get_member_snapshot` 里的
 * 映射一致（1-4 需 v1、5-6 需 v4）。不一致会出现「矩阵说未解锁、后端说已解锁」，
 * 两边都不报错 —— 这类静默分叉只能靠断言发现。
 */

test('六项权益的图标名都必须在 ICONS 里存在（动态绑定，模板门禁查不到）', () => {
  const missing = MEMBER_BENEFITS
    .filter((b) => !ICONS[b.icon])
    .map((b) => `${b.key} → ${b.icon}`)

  assert.deepEqual(
    missing,
    [],
    `这些权益的图标名不存在，页面会渲染成空白图标且不报错：\n  ${missing.join('\n  ')}`
  )
})

test('六项权益恰好 6 项，且 key 不重复', () => {
  // hero 文案 `member-level` 写死「已解锁 6 项」—— 多一项少一项都是说谎
  assert.equal(MEMBER_BENEFITS.length, 6, '权益必须是 6 项（hero 文案写死的）')
  const keys = MEMBER_BENEFITS.map((b) => b.key)
  assert.equal(new Set(keys).size, keys.length, `key 有重复：${keys.join(', ')}`)
})

test('权益的 key 与后端 get_member_snapshot 的映射逐一对应', () => {
  // 后端 sstc.get_member_snapshot 里的固定顺序与所需等级
  // （v1.2.0 起八档：前四项付费即解锁 v1，后两项要爬到 v4）
  const BACKEND = [
    ['discount', 'v1'],
    ['coupon_pack', 'v1'],
    ['points_deduct', 'v1'],
    ['free_tool', 'v1'],
    ['birthday', 'v4'],
    ['support', 'v4'],
  ]
  assert.deepEqual(
    MEMBER_BENEFITS.map((b) => [b.key, b.requiredLevel]),
    BACKEND,
    '前端权益的顺序或所需等级与后端不一致 —— 会出现「矩阵说未解锁、后端说已解锁」'
  )
})

test('每项权益都有名称与描述（空文案会渲染出空白卡片）', () => {
  for (const b of MEMBER_BENEFITS) {
    assert.ok(b.name && b.name.trim() !== '', `${b.key} 缺少 name`)
    assert.ok(b.desc && b.desc.trim() !== '', `${b.key} 缺少 desc`)
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
