import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

import './render.mjs'

/**
 * 兑换结果四模板：success / used / expired / notfound。
 *
 * 设计系统禁止把「已使用」「已过期」「未找到」统一成一句「兑换失败」，
 * 所以这里直接断言四种语义的 variant、标题、描述与下一步操作**互不相同**，
 * 并验证成功模板带下一步引导、未知流程错误不会被硬套成结果页。
 *
 * 映射函数是 KamiSection.vue 普通 <script> 的具名导出，测试不依赖请求或挂载。
 */

const { buildActivationResultView, REDEEM_RESULT_VARIANTS } = await import('../src/components/KamiSection.vue')

const NOT_FOUND_RESULT = { success: false, code: 'USE_CARD_FAILED', message: '卡密不存在' }
const USED_RESULT = { success: false, code: 'USE_CARD_FAILED', message: '卡密已被使用或已失效' }
const EXPIRED_RESULT = { success: false, code: 'USE_CARD_FAILED', message: '卡密已过期' }
const SUCCESS_RESULT = {
  success: true,
  message: '兑换成功',
  data: {
    card_name: '工具箱 Pro',
    entitlement_expires_at: '2027-10-25T00:00:00.000Z',
    points_granted: 100,
    growth_granted: 50,
  },
}

const formatDate = (value) => String(value).slice(0, 10)

const views = {
  success: buildActivationResultView(SUCCESS_RESULT, {
    rewards: '100 积分、50 成长值',
    formatDate,
  }),
  notfound: buildActivationResultView(NOT_FOUND_RESULT),
  used: buildActivationResultView(USED_RESULT),
  expired: buildActivationResultView(EXPIRED_RESULT),
}

test('四模板常量与语义一一对应', () => {
  assert.deepEqual(REDEEM_RESULT_VARIANTS, {
    SUCCESS: 'success',
    USED: 'used',
    EXPIRED: 'expired',
    NOTFOUND: 'notfound',
  })
  assert.equal(views.success.variant, 'success')
  assert.equal(views.used.variant, 'used')
  assert.equal(views.expired.variant, 'expired')
  assert.equal(views.notfound.variant, 'notfound')
})

test('四种结果各自有独立标题、描述与操作，不合并成「兑换失败」', () => {
  const list = Object.values(views)

  assert.equal(new Set(list.map((view) => view.title)).size, 4, '四个模板的标题必须不同')
  assert.equal(new Set(list.map((view) => view.desc)).size, 4, '四个模板的描述必须不同')
  assert.deepEqual(
    list.map((view) => view.icon),
    ['check-circle', 'search', 'clock', 'alert-triangle'],
    '图标应能区分四种语义'
  )

  for (const view of list) {
    assert.ok(view.title.length > 0)
    assert.ok(view.desc.length > 0)
    assert.ok(view.actions.length > 0, '每个模板都要给下一步操作')
    assert.notEqual(view.title, '兑换失败')
    assert.ok(!view.title.includes('失败'), `标题不能统一显示失败：${view.title}`)
  }

  assert.equal(views.used.title, '这张卡密已被使用')
  assert.equal(views.expired.title, '卡密已过期')
  assert.equal(views.notfound.title, '没有找到这张卡密')
})

test('成功模板：带下一步引导，并说明到账权益与有效期', () => {
  const { success } = views

  assert.equal(success.title, '兑换成功')
  assert.ok(success.desc.includes('「工具箱 Pro」已到账'))
  assert.ok(success.desc.includes('有效期至 2027-10-25'), '应展示权益有效期')
  assert.ok(success.desc.includes('100 积分、50 成长值'), '应展示本次发放的奖励')
  assert.ok(success.desc.includes('查看详情'), '成功页不能只写「成功」，要给下一步引导')

  assert.deepEqual(success.actions.map((action) => action.label), ['查看我的卡密', '继续兑换'])
  assert.deepEqual(success.actions.map((action) => action.action), ['show-cards', 'continue'])
  assert.equal(success.actions[0].kind, 'primary')
})

test('未找到模板：提示检查字符并允许重新输入', () => {
  const { notfound } = views
  assert.equal(notfound.icon, 'search')
  assert.ok(notfound.desc.includes('O 与 0'))
  assert.deepEqual(notfound.actions, [{ label: '重新输入', kind: 'outline', action: 'restart' }])
})

test('已使用模板：引导查看我的卡密，不再提供兑换入口', () => {
  const { used } = views
  assert.equal(used.icon, 'clock')
  assert.ok(used.desc.includes('查看兑换记录'))
  assert.ok(used.actions.every((action) => action.kind === 'outline'))
  assert.deepEqual(used.actions.map((action) => action.label), ['查看我的卡密'])
})

test('已过期模板：主操作联系客服，次操作重新输入', () => {
  const { expired } = views
  assert.equal(expired.icon, 'alert-triangle')
  assert.ok(expired.desc.includes('联系客服'))
  assert.deepEqual(expired.actions.map((action) => action.label), ['联系客服', '重新输入'])
  assert.equal(expired.actions[0].href, '/support', '客服入口应为真实路由')
  assert.equal(expired.actions[0].kind, 'primary')
})

test('优先使用接口错误码判定；缺码时回退服务端 message 文案', () => {
  assert.equal(
    buildActivationResultView({ success: false, code: 'CARD_EXPIRED', message: '使用卡密失败' }).variant,
    'expired',
    '错误码应优先于泛化文案'
  )
  assert.equal(
    buildActivationResultView({ success: false, code: 'CARD_USED', message: '使用卡密失败' }).variant,
    'used'
  )
  assert.equal(
    buildActivationResultView({ success: false, code: 'CARD_NOT_FOUND', message: '使用卡密失败' }).variant,
    'notfound'
  )

  assert.equal(buildActivationResultView({ success: false, message: '卡密不存在' }).variant, 'notfound')
  assert.equal(buildActivationResultView({ success: false, message: '卡密已过期' }).variant, 'expired')
  assert.equal(
    buildActivationResultView({ success: false, message: '卡密已被使用或已失效' }).variant,
    'used'
  )
})

test('流程性错误不套四模板：缺工具、未知失败、空结果都返回 null', () => {
  assert.equal(buildActivationResultView({ success: false, message: '请选择要激活的工具' }), null)
  assert.equal(
    buildActivationResultView({ success: false, code: 'USE_CARD_FAILED', message: '使用卡密失败' }),
    null,
    '未知失败应保留普通错误提示，不能伪装成四模板之一'
  )
  assert.equal(buildActivationResultView(null), null)
})

test('KamiSection 模板确实使用 .ec-redeem-result 结构渲染映射结果', () => {
  const source = readFileSync(new URL('../src/components/KamiSection.vue', import.meta.url), 'utf8')

  assert.ok(source.includes('class="ec-redeem-result"'))
  assert.match(source, /ec-redeem-result--\$\{activationView\.variant\}/)
  assert.ok(source.includes('ec-redeem-result__icon'))
  assert.ok(source.includes('ec-redeem-result__title'))
  assert.ok(source.includes('ec-redeem-result__desc'))
  assert.ok(source.includes('ec-redeem-result__actions'))
  assert.ok(source.includes('v-else-if="activationResult"'), '非四模板错误仍走普通提示')
})
