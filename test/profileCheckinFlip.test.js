/**
 * 2.6.1 · 个人中心「立即签到」签完必须翻面成「查看签到日历」
 *
 * 用户实测：点签到 → 提示成功，但按钮没变。
 * 根因不是视图没更新，而是**数据源读的是旧快照**：
 * `fetchOverview` 走 shortCache（8 秒 TTL），签到这种写操作之后立刻再读，
 * 拿到的还是签到前的 `checkin_available: true`，于是 `v-if` 一直停在「立即签到」。
 *
 * 修法两处配合：
 *   1. `stores/member.js` 的 `fetchOverview` 支持 `force`，先失效缓存再请求；
 *   2. `pages/Profile.vue` 的 `handleProfileCheckin` 在签到成功后用 `force: true` 重取。
 * 本用例把这两处钉住 —— 只改一处都不生效，所以必须一起断言。
 */
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const read = (relative) => readFileSync(join(ROOT, relative), 'utf8')

const MEMBER_STORE = read('src/stores/member.js')
const PROFILE = read('src/pages/Profile.vue')

test('member store：fetchOverview 支持 force，且先失效缓存再请求', () => {
  assert.match(MEMBER_STORE, /async fetchOverview\(\{ silent = false, force = false \} = \{\}\)/)
  assert.match(MEMBER_STORE, /const OVERVIEW_CACHE_KEY = 'member:overview'/)

  const body = MEMBER_STORE.slice(MEMBER_STORE.indexOf('async fetchOverview'))
  const invalidateAt = body.indexOf('shortCache.invalidate(OVERVIEW_CACHE_KEY)')
  const runAt = body.indexOf('shortCache.run(OVERVIEW_CACHE_KEY')
  assert.ok(invalidateAt > -1, 'force 分支必须显式失效缓存键')
  assert.ok(runAt > -1, '正常路径仍走 shortCache.run（导航栏与首屏共用同一次请求）')
  assert.ok(invalidateAt < runAt, '必须先失效再请求，顺序反了就还是旧快照')
  assert.match(body, /if \(force\) shortCache\.invalidate/)
})

test('Profile：签到成功后用 force 重取总览（否则按钮不翻面）', () => {
  const start = PROFILE.indexOf('async function handleProfileCheckin')
  assert.ok(start > -1, '应存在 handleProfileCheckin')

  const body = PROFILE.slice(start, PROFILE.indexOf('\n}', start))
  assert.match(body, /pointsStore\.doCheckin\(\)/)
  assert.match(
    body,
    /memberStore\.fetchOverview\(\{ silent: true, force: true \}\)/,
    '签到是写操作，必须 force 穿透 8 秒短缓存'
  )
})

test('按钮文案由 checkin_available 驱动，两个分支都在', () => {
  // 未签到 → 主按钮「立即签到」；已签到 → 次级链接「查看签到日历」
  assert.match(PROFILE, /checkinAvailable \? '今天还没签到/) 
  assert.match(PROFILE, /v-if="checkinAvailable"/)
  assert.match(PROFILE, /签到中…/)
  assert.match(PROFILE, /查看签到日历/)
})
