import test from 'node:test'
import assert from 'node:assert/strict'

// setup.js 注册 `@/` 别名钩子；钩子在求值时才生效，因此这里动态加载
// （goodsType.js 内部用 `@/constants/content.js`，静态 import 会早于钩子注册）
import './setup.js'
import { loadAppModule } from './setup.js'

const { isGoodsType, goodsTypeLabel, formatDimensions, buildDeliveryNote } =
  await loadAppModule('/utils/goodsType.js')

/**
 * 商品形态展示逻辑的单元测试。
 *
 * 这里锁定两条容易被「顺手优化」掉的规矩：
 *   1. 合法枚举之外一律不显示 —— 缺失的 goods_type 不能被猜成 digital；
 *   2. 重量/体积只在实物商品、且接口真有值时才带出。
 */

test('isGoodsType：只认四个合法枚举，原型键名与大小写变体都不算', () => {
  for (const type of ['digital', 'physical', 'service', 'account']) {
    assert.equal(isGoodsType(type), true, `${type} 应合法`)
  }

  for (const raw of [undefined, null, '', 'Digital', 'DIGITAL', 'other', 0, 1, {}, [], 'toString', 'constructor']) {
    assert.equal(isGoodsType(raw), false, `${String(raw)} 不是合法形态`)
  }
})

test('goodsTypeLabel：四种形态各自的中文角标，非法返回空串', () => {
  assert.equal(goodsTypeLabel('digital'), '虚拟商品')
  assert.equal(goodsTypeLabel('physical'), '实物')
  assert.equal(goodsTypeLabel('service'), '服务')
  assert.equal(goodsTypeLabel('account'), '账号')
  assert.equal(goodsTypeLabel(undefined), '')
  assert.equal(goodsTypeLabel('unknown'), '')
})

test('formatDimensions：字符串原样、数组拼 ×、对象取值并补 unit，读不出内容给空串', () => {
  assert.equal(formatDimensions('30 × 20 × 10 cm'), '30 × 20 × 10 cm')
  assert.equal(formatDimensions('  30×20  '), '30×20')

  assert.equal(formatDimensions([30, 20, 10]), '30 × 20 × 10')
  assert.equal(formatDimensions([30, null, 20, '', 10]), '30 × 20 × 10')

  assert.equal(formatDimensions({ length: 30, width: 20, height: 10, unit: 'cm' }), '30 × 20 × 10 cm')
  assert.equal(formatDimensions({ length: 30, width: 20, height: 10 }), '30 × 20 × 10')

  for (const raw of [null, undefined, '', '   ', { unit: 'cm' }, 42, true]) {
    assert.equal(formatDimensions(raw), '', `${String(raw)} 应读不出体积`)
  }
})

test('buildDeliveryNote：四种形态的交付说明文案', () => {
  assert.equal(
    buildDeliveryNote({ goods_type: 'digital' }),
    '虚拟商品 · 下单后立即可用，卡密在订单详情查看'
  )
  assert.equal(buildDeliveryNote({ goods_type: 'physical' }), '实物商品 · 需物流配送')
  assert.equal(
    buildDeliveryNote({ goods_type: 'service' }),
    '服务类商品 · 下单后联系客服安排'
  )
  assert.equal(
    buildDeliveryNote({ goods_type: 'account' }),
    '账号类商品 · 发货后请及时修改密码并绑定自己的信息'
  )
})

test('buildDeliveryNote：实物商品带出重量与体积，非实物或非法形态不显示', () => {
  assert.equal(
    buildDeliveryNote({
      goods_type: 'physical',
      weight_kg: 1.2,
      dimensions: '30 × 20 × 10 cm',
    }),
    '实物商品 · 需物流配送 · 约 1.2 kg · 30 × 20 × 10 cm'
  )

  // numeric 列经驱动常以字符串返回，也要认
  assert.equal(
    buildDeliveryNote({ goods_type: 'physical', weight_kg: '2.5' }),
    '实物商品 · 需物流配送 · 约 2.5 kg'
  )

  // 只有体积
  assert.equal(
    buildDeliveryNote({ goods_type: 'physical', dimensions: [30, 20, 10] }),
    '实物商品 · 需物流配送 · 30 × 20 × 10'
  )

  // 重量非法/非正 → 不提；只有体积照常带出
  for (const weight of [undefined, null, '', 0, -1, 'abc', 'NaN']) {
    assert.equal(
      buildDeliveryNote({ goods_type: 'physical', weight_kg: weight, dimensions: '20 cm' }),
      '实物商品 · 需物流配送 · 20 cm',
      `${String(weight)} 不应产生重量文案`
    )
  }

  // 重量体积都不存在时不要出现「约」「kg」这种半截文案
  assert.equal(buildDeliveryNote({ goods_type: 'physical', weight_kg: null, dimensions: null }), '实物商品 · 需物流配送')

  // 虚拟/服务/账号不涉及物流，即便误带了 weight 也不展示
  assert.equal(
    buildDeliveryNote({ goods_type: 'digital', weight_kg: 1.2, dimensions: '30 cm' }),
    '虚拟商品 · 下单后立即可用，卡密在订单详情查看'
  )
  assert.equal(
    buildDeliveryNote({ goods_type: 'service', weight_kg: 1.2 }),
    '服务类商品 · 下单后联系客服安排'
  )
})

test('buildDeliveryNote：形态缺失或非法时返回空串（调用方不渲染这一段）', () => {
  for (const raw of [undefined, null, '', 'DIGITAL', 'unknown', 'constructor', {}, []]) {
    assert.equal(buildDeliveryNote({ goods_type: raw }), '', `${String(raw)} 不应产生交付说明`)
  }
  assert.equal(buildDeliveryNote(null), '')
})
