import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

import { renderComponent, createPiniaWithState, createRenderEnv } from './render.mjs'

/**
 * 个人中心用户标识（UUID）的 CardCodeBox 化：
 *   默认掩码（前三段可见、末段恒掩码）→ 点眼睛明文 → 30 秒自动回掩码。
 *
 * 组件逻辑放在 Profile.vue 的普通 <script> 里并以具名导出暴露，
 * 因此这里不用挂载组件、也不用真等 30 秒：掩码规则直接断言，
 * 倒计时用注入的假时钟推进，卸载清理用 dispose() 验证。
 */

const profile = await import('../src/pages/Profile.vue')
const { maskUuid, plainUuid, formatUuid, createUuidRevealController, UUID_REVEAL_MS, UUID_MASK_CHAR } =
  profile

const LONG_UUID = '550e8400e29b41d4a716446655440000'
const MASKED_UUID = '550e-8400-e29b-••••-••••-••••-••••-••••'

const USER_WITH_LONG_UUID = {
  user: {
    userInfo: {
      id: 42,
      uuid: LONG_UUID,
      user_type: 'registered',
      nickname: '星尘',
      username: 'stardust',
      email: 'a@b.c',
      phone: null,
      gender: 'female',
      birthday: '1995-06-15T00:00:00.000Z',
      status: 'active',
      created_at: '2026-01-01T00:00:00.000Z',
      last_login_at: '2026-10-05T00:00:00.000Z',
    },
  },
}

async function renderProfile() {
  const [pinia, env] = await Promise.all([createPiniaWithState(USER_WITH_LONG_UUID), createRenderEnv()])
  return renderComponent('/pages/Profile.vue', {
    plugins: [pinia, env.router],
    globalComponents: env.globalComponents,
  })
}

/** 可控假时钟：setTimeout 只登记，advance() 时按到期顺序触发 */
function createFakeClock() {
  let now = 0
  let nextId = 1
  const tasks = new Map()

  return {
    now: () => now,
    pending: () => tasks.size,
    timers: {
      setTimeout(callback, delay) {
        const id = nextId++
        tasks.set(id, { at: now + delay, callback })
        return id
      },
      clearTimeout(id) {
        tasks.delete(id)
      },
    },
    advance(ms) {
      now += ms
      for (const [id, task] of [...tasks.entries()]) {
        if (task.at <= now) {
          tasks.delete(id)
          task.callback()
        }
      }
    },
  }
}

test('用户标识默认掩码：前三段可见，其余按四位一组遮住', () => {
  assert.equal(UUID_REVEAL_MS, 30000, '倒计时必须是 30 秒')
  assert.equal(UUID_MASK_CHAR, '•')
  assert.equal(maskUuid(LONG_UUID), MASKED_UUID)
  assert.equal(maskUuid(LONG_UUID.toUpperCase()), '550E-8400-E29B-••••-••••-••••-••••-••••', '保留原大小写')
  assert.equal(maskUuid('abcdefghijklmnop'), 'abcd-efgh-ijkl-••••')
  assert.equal(maskUuid('uuid-42'), 'uuid-42', '短标识不应被整段涂掉（测试账号仍可见）')
  assert.equal(maskUuid(''), '—')
})

test('用户标识明文：仍按四位分组，不做大小写变换', () => {
  assert.equal(plainUuid(LONG_UUID), '550e-8400-e29b-41d4-a716-4466-5544-0000')
  assert.equal(plainUuid('uuid-42'), 'uuid-42')
  assert.equal(plainUuid(null), '—')
})

test('切换后展示明文、回掩码后恢复掩码（template 用的同一个格式化入口）', () => {
  assert.equal(formatUuid(LONG_UUID, false), MASKED_UUID)
  assert.equal(formatUuid(LONG_UUID, true), '550e-8400-e29b-41d4-a716-4466-5544-0000')
})

test('个人中心 SSR：默认渲染掩码，DOM 中不出现完整明文', async () => {
  const html = await renderProfile()

  assert.ok(html.includes(MASKED_UUID), '应显示前三段 + 掩码')
  assert.ok(!html.includes(LONG_UUID), '初始 DOM 不得包含完整 UUID')
  assert.ok(!html.includes('41d4'), '末段（第 13 位之后）必须始终掩码')
  assert.ok(html.includes('已脱敏'), '应标注当前为脱敏状态')

  // 眼睛按钮初始 aria-pressed=false，文案为「显示」；点击后由控制器的
  // onChange 推动 uuidRevealed，模板再把 aria-pressed 同步为 true。
  assert.match(html, /aria-pressed="false"/)
  assert.match(html, /aria-label="显示用户标识"/)
  assert.match(html, /aria-label="复制用户标识"/)
  assert.ok(html.includes('ec-code'), '应使用设计系统 CardCodeBox 版式')
})

test('显示后 30 秒自动回掩码；29,999ms 时仍是明文', () => {
  const changes = []
  const clock = createFakeClock()
  const controller = createUuidRevealController({
    onChange: (value) => changes.push(value),
    timers: clock.timers,
  })

  controller.toggle()
  assert.equal(controller.isRevealed(), true)
  assert.equal(clock.pending(), 1, '显示明文时必须挂上回掩码计时器')

  clock.advance(29999)
  assert.equal(controller.isRevealed(), true, '未满 30 秒不应回掩码')

  clock.advance(1)
  assert.equal(controller.isRevealed(), false, '满 30 秒应自动回掩码')
  assert.deepEqual(changes, [true, false], 'onChange 应同步驱动 aria-pressed')
  assert.equal(clock.pending(), 0, '触发后的计时器应被清理')
})

test('30 秒内再次点眼睛立即回掩码，并取消未触发的计时器', () => {
  const changes = []
  const clock = createFakeClock()
  const controller = createUuidRevealController({
    onChange: (value) => changes.push(value),
    timers: clock.timers,
  })

  controller.show()
  clock.advance(5000)
  controller.toggle()

  assert.equal(controller.isRevealed(), false)
  assert.deepEqual(changes, [true, false])
  assert.equal(clock.pending(), 0, '手动回掩码后不应再留下计时器')

  clock.advance(30000)
  assert.deepEqual(changes, [true, false], '已取消的计时器不能再触发一次 onChange')
})

test('重复 show 会重新计时，不会被旧计时器提前打回掩码', () => {
  const clock = createFakeClock()
  const controller = createUuidRevealController({ timers: clock.timers })

  controller.show()
  clock.advance(20000)
  controller.show()

  clock.advance(20000) // 距第二次 show 只有 20 秒
  assert.equal(controller.isRevealed(), true)

  clock.advance(10000) // 距第二次 show 满 30 秒
  assert.equal(controller.isRevealed(), false)
})

test('dispose() 清理回掩码计时器（组件卸载路径）', () => {
  const changes = []
  const clock = createFakeClock()
  const controller = createUuidRevealController({
    onChange: (value) => changes.push(value),
    timers: clock.timers,
  })

  controller.show()
  assert.equal(clock.pending(), 1)

  controller.dispose()
  assert.equal(clock.pending(), 0, '卸载时必须清掉 setTimeout')

  clock.advance(30000)
  assert.deepEqual(changes, [true], '卸载后旧计时器不得再修改状态')
})

test('模板契约：aria-pressed / aria-label 跟随 uuidRevealed 切换，卸载时清定时器', () => {
  const source = readFileSync(new URL('../src/pages/Profile.vue', import.meta.url), 'utf8')

  assert.ok(
    source.includes(':aria-pressed="uuidRevealed ? \'true\' : \'false\'"'),
    'aria-pressed 必须与明文状态同步'
  )
  assert.ok(
    source.includes(':aria-label="uuidRevealed ? \'隐藏用户标识\' : \'显示用户标识\'"'),
    'aria-label 必须在「显示/隐藏」之间切换'
  )
  assert.ok(source.includes('onBeforeUnmount('), '组件卸载时必须有清理钩子')
  assert.ok(source.includes('uuidController.dispose()'), '卸载时清理回掩码计时器')
  assert.ok(source.includes('clearTimeout(uuidCopyTimer)'), '卸载时清理复制反馈计时器')
})
