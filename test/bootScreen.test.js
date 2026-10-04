import test from 'node:test'
import assert from 'node:assert/strict'

import { loadAppModule } from './setup.js'

const { useBootScreen } = await loadAppModule('/hooks/useBootScreen/index.js')

/**
 * 一个手动的假时钟。
 *
 * 这套时序（延迟出现 / 最短停留 / 最长等待）是纯逻辑，也是本功能最容易出错的
 * 地方 —— 而它的错误形态全是「时序」：加载快的时候闪一下白屏、
 * 加载慢的时候一闪而过、后端挂掉时永远盖着。用真等待来测会又慢又不稳，
 * 因此把 schedule / cancel / now 注入进来。
 */
function createFakeClock() {
  let current = 0
  let nextId = 1
  const timers = new Map()

  return {
    now: () => current,
    schedule(fn, ms) {
      const id = nextId++
      timers.set(id, { at: current + ms, fn })
      return id
    },
    cancel(id) {
      timers.delete(id)
    },
    /** 把时钟推进 ms，并按到期顺序执行回调 */
    advance(ms) {
      const target = current + ms
      for (;;) {
        const due = [...timers.entries()]
          .filter(([, t]) => t.at <= target)
          .sort((a, b) => a[1].at - b[1].at)
        if (due.length === 0) break
        const [id, timer] = due[0]
        timers.delete(id)
        current = timer.at
        timer.fn()
      }
      current = target
    },
    get pendingCount() {
      return timers.size
    },
  }
}

const setup = (options = {}) => {
  const clock = createFakeClock()
  const boot = useBootScreen({ schedule: clock.schedule, cancel: clock.cancel, now: clock.now, ...options })
  return { clock, boot }
}

test('加载很快：遮罩从不出现（宁可什么都不闪，也不要闪一下）', () => {
  const { clock, boot } = setup({ delay: 200, minVisible: 400 })

  boot.start()
  clock.advance(50)
  assert.equal(boot.visible.value, false, '还没到 delay，不该显示')

  boot.finish()
  clock.advance(5000)

  assert.equal(boot.visible.value, false, '等待期内就结束了，绝不能补显示一次')
})

test('加载较慢：到 delay 才出现，不早不晚', () => {
  const { clock, boot } = setup({ delay: 200, minVisible: 400 })

  boot.start()
  clock.advance(199)
  assert.equal(boot.visible.value, false)
  clock.advance(1)
  assert.equal(boot.visible.value, true, '刚好到 200ms 应出现')
})

test('出现后立刻结束：仍然停留够 minVisible（避免反向闪烁）', () => {
  const { clock, boot } = setup({ delay: 200, minVisible: 400 })

  // 时间轴：t=0 开始 → t=200 出现（shownAt=200）→ t=250 结束
  boot.start()
  clock.advance(250)
  assert.equal(boot.visible.value, true)

  boot.finish()
  assert.equal(boot.visible.value, true, '才显示了 50ms，不能立刻消失')

  // 最短停留以**出现时刻**为基准：应到 t=600（200+400）才收起，
  // 也就是 finish 之后还要再撑 350ms
  clock.advance(349)
  assert.equal(boot.visible.value, true, 't=599 还没到 600')
  clock.advance(1)
  assert.equal(boot.visible.value, false, 't=600 收起')
})

test('出现后已超过最短时间：立即收起，不再多等', () => {
  const { clock, boot } = setup({ delay: 200, minVisible: 400 })

  boot.start()
  clock.advance(2000)
  assert.equal(boot.visible.value, true)

  boot.finish()
  assert.equal(boot.visible.value, false, '已显示 1800ms，无需再留')
})

test('最长等待：后端挂住时到点强制放行，不能永远盖着', () => {
  const { clock, boot } = setup({ delay: 200, minVisible: 400, maxWait: 8000 })

  // 时间轴：t=200 出现，maxWait 计时器在 t=8000 到点
  boot.start()
  clock.advance(200)
  assert.equal(boot.visible.value, true)

  clock.advance(7799) // t=7999
  assert.equal(boot.visible.value, true, '还没到 maxWait，应继续盖着')

  clock.advance(1) // t=8000：maxWait 到点
  // 此时已显示 7800ms，远超 minVisible，因此立即放行而不是再等 400ms
  assert.equal(boot.visible.value, false, 'maxWait 到点必须放行')
})

test('finish 幂等：重复调用不会打乱时序', () => {
  const { clock, boot } = setup({ delay: 200, minVisible: 400 })

  boot.start()
  clock.advance(300)
  boot.finish()
  boot.finish()
  boot.finish()

  clock.advance(400)
  assert.equal(boot.visible.value, false)
  assert.equal(clock.pendingCount, 0, '不应留下未清理的计时器')
})

test('start 可重复调用（重新启动一次流程）', () => {
  const { clock, boot } = setup({ delay: 200, minVisible: 400 })

  boot.start()
  clock.advance(300)
  assert.equal(boot.visible.value, true)

  boot.start()
  assert.equal(boot.visible.value, false, '重新开始应回到未显示状态')
  clock.advance(200)
  assert.equal(boot.visible.value, true)
})

test('结束后没有残留计时器（否则组件卸载后仍会改状态）', () => {
  const { clock, boot } = setup({ delay: 200, minVisible: 400, maxWait: 8000 })

  boot.start()
  boot.finish()
  assert.equal(clock.pendingCount, 0, 'finish 应清掉 delay 与 maxWait 两个计时器')

  clock.advance(10000)
  assert.equal(clock.pendingCount, 0)
})

test('默认参数：delay / minVisible / maxWait 都是有限正数', () => {
  const { boot } = setup()
  // 默认值必须存在，否则调用方忘记传参时会退化成「永远显示」
  assert.equal(typeof boot.start, 'function')
  assert.equal(typeof boot.finish, 'function')
  assert.equal(boot.visible.value, false, '初始不可见')
})
