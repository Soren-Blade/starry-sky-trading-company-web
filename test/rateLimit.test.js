import test from 'node:test'
import assert from 'node:assert/strict'

import { debounce, throttle, createClickGuard, guardAsync } from '../src/utils/rateLimit.js'

/**
 * 点击频率控制
 *
 * 这里守的是「服务器压力」那条线，所以断言的落点都是**被调用了几次**，
 * 而不是「看起来没卡」：连点被放过去一次，测试就该红。
 *
 * 时间相关的用例统一用 10–30ms 的窗口 + 宽松的 sleep，不依赖假计时器 ——
 * 假计时器需要同时 mock `Date.now()` 才能测 throttle，配置差异比收益大。
 */

const sleep = (ms) =>
  new Promise((resolve) => {
    setTimeout(resolve, ms)
  })

test('createClickGuard：窗口内只放行第一次', () => {
  let clock = 1000
  const guard = createClickGuard(800, { now: () => clock })

  assert.equal(guard(), true, '第一次点击放行')
  assert.equal(guard(), false, '同一毫秒的第二次点击必须挡住')
  clock += 400
  assert.equal(guard(), false, '窗口内再点仍然挡住')
  clock += 401
  assert.equal(guard(), true, '窗口过后重新放行')
})

test('createClickGuard：reset 之后立即可再次放行', () => {
  let clock = 0
  const guard = createClickGuard(800, { now: () => clock })

  assert.equal(guard(), true)
  assert.equal(guard(), false)
  guard.reset()
  assert.equal(guard(), true, '手动重置应绕过剩余窗口')
})

test('guardAsync：执行期间重复触发只跑一次，结束后冷却', async () => {
  let runs = 0
  let release
  const gate = new Promise((resolve) => {
    release = resolve
  })
  const action = guardAsync(
    async (value) => {
      runs += 1
      await gate
      return value
    },
    { cooldown: 20 }
  )

  const first = action('a')
  const second = action('b')
  assert.equal(await second, null, '并发的那次直接返回 null，不发请求')
  release()
  assert.equal(await first, 'a')
  assert.equal(runs, 1, '处理函数只执行一次')

  assert.equal(await action('c'), null, '冷却期内仍然挡住')
  await sleep(40)
  assert.equal(await action('d'), 'd', '冷却结束后恢复')
  assert.equal(runs, 2)
})

test('debounce：连续调用只执行最后一次的参数', async () => {
  const seen = []
  const fn = debounce((value) => seen.push(value), 20)

  fn(1)
  fn(2)
  fn(3)
  assert.deepEqual(seen, [], '静默期内一次都不执行')
  await sleep(60)
  assert.deepEqual(seen, [3])
})

test('debounce：leading 让第一下立刻执行，其余仍被合并', async () => {
  const seen = []
  const fn = debounce((value) => seen.push(value), 20, { leading: true })

  fn('first')
  assert.deepEqual(seen, ['first'], 'leading 立刻响应')
  fn('second')
  await sleep(60)
  assert.deepEqual(seen, ['first', 'second'])
})

test('debounce：cancel 丢弃挂起的调用，flush 立即执行它', async () => {
  const seen = []
  const fn = debounce((value) => seen.push(value), 50)

  fn('a')
  fn.cancel()
  await sleep(80)
  assert.deepEqual(seen, [], 'cancel 后不再执行')

  fn('b')
  assert.equal(fn.pending(), true)
  fn.flush()
  assert.deepEqual(seen, ['b'], 'flush 立刻执行，不等静默期')
  assert.equal(fn.pending(), false)
  await sleep(80)
  assert.deepEqual(seen, ['b'], 'flush 已消费的参数不会被重复执行')
})

test('throttle：窗口内合并，末尾用最后一次参数补执行', async () => {
  const seen = []
  const fn = throttle((value) => seen.push(value), 30)

  fn(1)
  fn(2)
  fn(3)
  assert.deepEqual(seen, [1], 'leading：第一下立刻执行')
  await sleep(70)
  assert.deepEqual(seen, [1, 3], 'trailing：窗口末尾用最后一次参数补一次')
})

test('throttle：trailing 关闭时只执行 leading 那一次', async () => {
  const seen = []
  const fn = throttle((value) => seen.push(value), 30, { trailing: false })

  fn(1)
  fn(2)
  await sleep(70)
  assert.deepEqual(seen, [1])
})

test('throttle：窗口结束后重新放行', async () => {
  const seen = []
  const fn = throttle((value) => seen.push(value), 20)

  fn('a')
  await sleep(50)
  fn('b')
  await sleep(50)
  assert.deepEqual(seen, ['a', 'b'])
})
