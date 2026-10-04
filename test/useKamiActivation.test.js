import test from 'node:test'
import assert from 'node:assert/strict'

import { loadAppModule } from './setup.js'

const { useKamiActivation } = await loadAppModule('/hooks/useKamiActivation/index.js')

/**
 * 建一个受控的 pending 队列，用来断言「提交期间 activating 为 true」。
 */
function makeDeferred() {
  let resolveFn
  let rejectFn
  const promise = new Promise((resolve, reject) => {
    resolveFn = resolve
    rejectFn = reject
  })
  return { promise, resolve: resolveFn, reject: rejectFn }
}

/** 造一个记录调用的 activateCard 桩 */
function stubApi(result) {
  const calls = []
  const fn = async (payload) => {
    calls.push(payload)
    if (result instanceof Error) throw result
    if (typeof result === 'function') return result(payload)
    return result
  }
  return { fn, calls }
}

// ── 本地校验（不发请求） ───────────────────────────────────────

test('未选工具时直接失败，且不发起请求', async () => {
  const { fn, calls } = stubApi({ success: true })
  const a = useKamiActivation({ activateCard: fn, getUserId: () => 7 })

  a.activateCode.value = 'CARD-1'
  const out = await a.activate()

  assert.equal(out.success, false)
  assert.equal(out.reason, 'empty_tool')
  assert.equal(a.activationResult.value.message, '请选择工具')
  assert.equal(calls.length, 0, '本地校验失败不应发请求')
})

test('未填卡密时直接失败，且不发起请求', async () => {
  const { fn, calls } = stubApi({ success: true })
  const a = useKamiActivation({ activateCard: fn, getUserId: () => 7 })

  a.selectedToolId.value = '3'
  const out = await a.activate()

  assert.equal(out.success, false)
  assert.equal(out.reason, 'empty_code')
  assert.equal(a.activationResult.value.message, '请输入卡密')
  assert.equal(calls.length, 0)
})

test('只填空白字符视为未填', async () => {
  const { fn, calls } = stubApi({ success: true })
  const a = useKamiActivation({ activateCard: fn })

  a.selectedToolId.value = '3'
  a.activateCode.value = '   \n\t  '
  const out = await a.activate()

  assert.equal(out.reason, 'empty_code')
  assert.equal(calls.length, 0)
})

test('工具校验先于卡密校验（两者都空时报「请选择工具」）', async () => {
  const { fn } = stubApi({ success: true })
  const a = useKamiActivation({ activateCard: fn })

  const out = await a.activate()
  assert.equal(out.reason, 'empty_tool')
})

// ── 成功路径 ───────────────────────────────────────────────────

test('成功时：提交 payload 正确、清空表单、触发 onActivated', async () => {
  const { fn, calls } = stubApi({ success: true, message: '激活成功' })
  let refreshed = 0
  const a = useKamiActivation({
    activateCard: fn,
    getUserId: () => 42,
    onActivated: async () => {
      refreshed += 1
    },
  })

  a.selectedToolId.value = '7'
  a.activateCode.value = '  CARD-XYZ  '

  const out = await a.activate()

  assert.equal(out.success, true)
  assert.equal(out.reason, 'ok')
  assert.equal(calls.length, 1)
  assert.deepEqual(calls[0], { card_no: 'CARD-XYZ', user_id: 42, tool_id: 7 })
  // 卡密需要 trim，tool_id 需要转成数字
  assert.equal(a.activateCode.value, '', '成功后应清空卡密')
  assert.equal(a.selectedToolId.value, '', '成功后应清空工具选择')
  assert.equal(refreshed, 1, '成功后应重新拉取列表')
  assert.equal(a.activating.value, false, 'activating 应复位')
})

test('成功时若未提供 onActivated 也不报错', async () => {
  const { fn } = stubApi({ success: true })
  const a = useKamiActivation({ activateCard: fn, getUserId: () => 1 })

  a.selectedToolId.value = '1'
  a.activateCode.value = 'C'
  await assert.doesNotReject(() => a.activate())
})

test('激活成功后列表刷新失败：仍报告成功，不误报为激活失败', async () => {
  const { fn } = stubApi({ success: true, message: '卡密已激活' })
  const a = useKamiActivation({
    activateCard: fn,
    getUserId: () => 1,
    onActivated: async () => {
      throw new Error('列表刷新失败')
    },
  })

  a.selectedToolId.value = '1'
  a.activateCode.value = 'C'

  const out = await a.activate()

  // 卡密在服务端**已经激活成功**。若这里报告失败，用户会以为没生效而重复激活。
  assert.equal(out.success, true, '激活已成功，不应因刷新失败而报告失败')
  assert.equal(out.reason, 'ok')
  assert.equal(a.activationResult.value.success, true)
  assert.match(a.activationResult.value.message, /卡密已激活/, '应保留服务端的成功文案')
  assert.match(a.activationResult.value.message, /刷新/, '应提示需要手动刷新')
  assert.equal(a.activateCode.value, '', '成功路径仍然清空表单')
  assert.equal(a.activating.value, false, 'activating 必须复位（finally 保证）')
})

test('激活成功且刷新成功：文案就是服务端返回的 message', async () => {
  const { fn } = stubApi({ success: true, message: '卡密已激活' })
  const a = useKamiActivation({
    activateCard: fn,
    getUserId: () => 1,
    onActivated: async () => {},
  })

  a.selectedToolId.value = '1'
  a.activateCode.value = 'C'
  const out = await a.activate()

  assert.equal(out.success, true)
  assert.equal(a.activationResult.value.message, '卡密已激活')
  assert.equal(a.activationResult.value.message.includes('刷新'), false)
})

test('激活失败与刷新失败的区分：失败路径仍报告失败', async () => {
  const { fn } = stubApi(new Error('网络不可达'))
  const a = useKamiActivation({ activateCard: fn, getUserId: () => 1 })

  a.selectedToolId.value = '1'
  a.activateCode.value = 'C'
  const out = await a.activate()

  assert.equal(out.success, false, '激活请求本身失败时不应报告成功')
  assert.equal(out.reason, 'thrown')
})

// ── 服务端失败 ─────────────────────────────────────────────────

test('服务端返回 success:false 时保留表单内容，便于用户修正', async () => {
  const { fn } = stubApi({ success: false, message: '卡密已被使用', code: 'CARD_USED' })
  let refreshed = 0
  const a = useKamiActivation({
    activateCard: fn,
    getUserId: () => 1,
    onActivated: async () => {
      refreshed += 1
    },
  })

  a.selectedToolId.value = '3'
  a.activateCode.value = 'USED-CARD'

  const out = await a.activate()

  assert.equal(out.success, false)
  assert.equal(out.reason, 'server')
  assert.equal(out.message, '卡密已被使用')
  assert.equal(a.activateCode.value, 'USED-CARD', '失败时不应清空，否则用户要重新输入')
  assert.equal(a.selectedToolId.value, '3')
  assert.equal(refreshed, 0, '失败时不应刷新列表')
  assert.equal(a.activationResult.value.code, 'CARD_USED', '服务端 code 应透传用于展示')
})

test('服务端返回 success:false 且无 message 时有兜底文案', async () => {
  const { fn } = stubApi({ success: false })
  const a = useKamiActivation({ activateCard: fn, getUserId: () => 1 })

  a.selectedToolId.value = '1'
  a.activateCode.value = 'C'
  const out = await a.activate()

  assert.equal(out.success, false)
  assert.ok(out.message.length > 0, 'message 不应为空')
})

test('这里区分「服务端明确失败」与「请求抛异常」（原实现只看真值）', async () => {
  // 场景 A：服务端返回 success:false
  const apiA = stubApi({ success: false, message: '服务端拒绝' })
  const a = useKamiActivation({ activateCard: apiA.fn, getUserId: () => 1 })
  a.selectedToolId.value = '1'
  a.activateCode.value = 'C'
  const outA = await a.activate()

  // 场景 B：请求本身抛异常
  const apiB = stubApi(new Error('网络不可达'))
  const b = useKamiActivation({ activateCard: apiB.fn, getUserId: () => 1 })
  b.selectedToolId.value = '1'
  b.activateCode.value = 'C'
  const outB = await b.activate()

  assert.equal(outA.reason, 'server')
  assert.equal(outB.reason, 'thrown')
  assert.equal(outB.message, '网络不可达')
  assert.notEqual(outA.reason, outB.reason, '两种情况应可区分')
})

// ── 异常路径 ───────────────────────────────────────────────────

test('请求抛异常时转成展示结果，不向外抛', async () => {
  const { fn } = stubApi(new Error('500 服务异常'))
  const a = useKamiActivation({ activateCard: fn, getUserId: () => 1 })

  a.selectedToolId.value = '1'
  a.activateCode.value = 'C'

  const out = await a.activate()
  assert.equal(out.success, false)
  assert.equal(out.reason, 'thrown')
  assert.equal(a.activationResult.value.message, '500 服务异常')
  assert.equal(a.activating.value, false)
})

test('异常对象没有 message 时使用兜底文案', async () => {
  const a = useKamiActivation({
    activateCard: async () => {
      throw { code: 'X' } // 非 Error 对象
    },
    getUserId: () => 1,
  })
  a.selectedToolId.value = '1'
  a.activateCode.value = 'C'

  const out = await a.activate()
  assert.equal(out.success, false)
  assert.equal(out.message, '激活失败')
})

test('未提供 activateCard 时返回失败而不是抛 TypeError', async () => {
  const a = useKamiActivation({ getUserId: () => 1 })
  a.selectedToolId.value = '1'
  a.activateCode.value = 'C'

  const out = await a.activate()
  assert.equal(out.success, false)
  assert.equal(out.reason, 'thrown')
  assert.equal(out.message, '激活服务不可用')
})

// ── activating 状态 ────────────────────────────────────────────

test('提交期间 activating 为 true，结束后复位', async () => {
  const deferred = makeDeferred()
  const a = useKamiActivation({ activateCard: () => deferred.promise, getUserId: () => 1 })

  a.selectedToolId.value = '1'
  a.activateCode.value = 'C'
  assert.equal(a.activating.value, false)

  const pending = a.activate()
  // 让同步部分先跑完（校验通过 → activating = true → 等待 promise）
  await Promise.resolve()
  assert.equal(a.activating.value, true, '请求进行中应为 true')

  deferred.resolve({ success: true })
  await pending
  assert.equal(a.activating.value, false, '结束后应复位')
})

test('请求被拒绝时 activating 也会复位（finally）', async () => {
  const deferred = makeDeferred()
  const a = useKamiActivation({ activateCard: () => deferred.promise, getUserId: () => 1 })

  a.selectedToolId.value = '1'
  a.activateCode.value = 'C'
  const pending = a.activate()
  await Promise.resolve()
  assert.equal(a.activating.value, true)

  deferred.reject(new Error('boom'))
  await pending
  assert.equal(a.activating.value, false, '异常路径也必须复位，否则按钮永久禁用')
})

test('本地校验失败不会把 activating 置为 true', async () => {
  const a = useKamiActivation({ activateCard: async () => ({ success: true }) })
  await a.activate()
  assert.equal(a.activating.value, false)
})

// ── 表单重置 ───────────────────────────────────────────────────

test('resetForm 清空卡密与工具选择', () => {
  const a = useKamiActivation({ activateCard: async () => ({ success: true }) })
  a.activateCode.value = 'X'
  a.selectedToolId.value = '5'

  a.resetForm()
  assert.equal(a.activateCode.value, '')
  assert.equal(a.selectedToolId.value, '')
})

test('clearResult 只清提示，保留用户已填内容（切换 tab 用）', () => {
  const a = useKamiActivation({ activateCard: async () => ({ success: true }) })
  a.activateCode.value = '保留我'
  a.selectedToolId.value = '5'
  a.activationResult.value = { success: false, message: '上次失败' }

  a.clearResult()
  assert.equal(a.activationResult.value, null)
  assert.equal(a.activateCode.value, '保留我')
  assert.equal(a.selectedToolId.value, '5')
})

test('连续两次提交：第二次成功后表单被清空（不会残留第一次的内容）', async () => {
  let n = 0
  const a = useKamiActivation({
    activateCard: async () => {
      n += 1
      return n === 1 ? { success: false, message: '第一次失败' } : { success: true }
    },
    getUserId: () => 1,
  })

  a.selectedToolId.value = '1'
  a.activateCode.value = 'CARD'
  await a.activate()
  assert.equal(a.activateCode.value, 'CARD', '第一次失败应保留')

  await a.activate()
  assert.equal(a.activateCode.value, '', '第二次成功应清空')
})
