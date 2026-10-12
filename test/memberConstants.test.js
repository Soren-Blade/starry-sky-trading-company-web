import test from 'node:test'
import assert from 'node:assert/strict'

import { ICONS } from '../src/utils/iconSet.js'
import { MEMBER_BENEFITS, MEMBER_LEVELS } from '../src/constants/member.js'

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
 * 映射一致（1-4 星辉、5-6 星耀）。不一致会出现「矩阵说未解锁、后端说已解锁」，
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
  const BACKEND = [
    ['discount', 'star'],
    ['coupon_pack', 'star'],
    ['points_deduct', 'star'],
    ['free_tool', 'star'],
    ['birthday', 'galaxy'],
    ['support', 'galaxy'],
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

test('等级表含 none / star / galaxy，且与后端 memberLevel 取值一致', () => {
  assert.deepEqual(Object.keys(MEMBER_LEVELS).sort(), ['galaxy', 'none', 'star'])
  assert.equal(MEMBER_LEVELS.none.name, '', '非会员没有等级名（空串，不是「非会员」三个字）')
  assert.equal(MEMBER_LEVELS.star.name, '星辉')
  assert.equal(MEMBER_LEVELS.galaxy.name, '星耀')
})
