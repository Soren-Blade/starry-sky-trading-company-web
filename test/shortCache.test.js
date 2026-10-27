/**
 * `src/utils/shortCache.js` 的契约。
 *
 * 它被放在 store 的读路径上（会员总览 / 收藏 / 未读数 / 购物车），
 * 所以三件事必须成立：并发只飞一次、TTL 内不重复发、失败不进缓存。
 */
import test from 'node:test'
import assert from 'node:assert/strict'

import { createShortCache } from '../src/utils/shortCache.js'

function fakeClock(start = 1000) {
  let t = start
  const now = () => t
  now.advance = (ms) => {
    t += ms
  }
  return now
}

test('并发调用同一个 key 只执行一次 loader', async () => {
  const cache = createShortCache({ ttlMs: 8000 })
  let calls = 0
  const loader = async () => {
    calls += 1
    return { n: calls }
  }

  const [a, b, c] = await Promise.all([cache.run('k', loader), cache.run('k', loader), cache.run('k', loader)])

  assert.equal(calls, 1, '三个并发调用应合并为一次')
  assert.deepEqual(a, { n: 1 })
  assert.deepEqual(b, { n: 1 })
  assert.deepEqual(c, { n: 1 })
})

test('TTL 内重复调用直接返回缓存，过期后重新加载', async () => {
  const now = fakeClock()
  const cache = createShortCache({ ttlMs: 8000, now })
  let calls = 0
  const loader = async () => {
    calls += 1
    return calls
  }

  assert.equal(await cache.run('k', loader), 1)
  now.advance(7999)
  assert.equal(await cache.run('k', loader), 1, 'TTL 内应命中缓存')
  assert.equal(calls, 1)

  now.advance(1)
  assert.equal(await cache.run('k', loader), 2, '过期后应重新请求')
  assert.equal(calls, 2)
})

test('不同 key 互不干扰', async () => {
  const cache = createShortCache({ ttlMs: 8000 })
  assert.equal(await cache.run('a', async () => 'A'), 'A')
  assert.equal(await cache.run('b', async () => 'B'), 'B')
  assert.equal(await cache.run('a', async () => 'A2'), 'A')
  assert.equal(await cache.run('b', async () => 'B2'), 'B')
})

test('失败不进缓存：下一次调用仍会真正执行', async () => {
  const cache = createShortCache({ ttlMs: 8000 })
  await assert.rejects(
    cache.run('k', async () => {
      throw new Error('boom')
    }),
    /boom/
  )

  let called = false
  const value = await cache.run('k', async () => {
    called = true
    return 'ok'
  })
  assert.equal(called, true, '失败之后必须允许重试')
  assert.equal(value, 'ok')
})

test('invalidate 让单个 key 立即失效', async () => {
  const cache = createShortCache({ ttlMs: 8000 })
  let calls = 0
  const loader = async () => {
    calls += 1
    return calls
  }

  await cache.run('cart:list', loader)
  cache.invalidate('cart:list')
  assert.equal(await cache.run('cart:list', loader), 2)
})

test('clear 清空所有缓存与在途请求', async () => {
  const cache = createShortCache({ ttlMs: 8000 })
  let calls = 0
  const loader = async () => {
    calls += 1
    return calls
  }

  await cache.run('a', loader)
  await cache.run('b', loader)
  cache.clear()

  assert.equal(await cache.run('a', loader), 3)
  assert.equal(await cache.run('b', loader), 4)
})

test('ttlMs=0 表示只做单飞、不留缓存', async () => {
  const cache = createShortCache({ ttlMs: 0 })
  let calls = 0
  const loader = async () => {
    calls += 1
    return calls
  }

  const [a, b] = await Promise.all([cache.run('k', loader), cache.run('k', loader)])
  assert.equal(calls, 1, '并发仍然合并')
  assert.equal(a, 1)
  assert.equal(b, 1)

  assert.equal(await cache.run('k', loader), 2, '串行调用不再命中缓存')
})
