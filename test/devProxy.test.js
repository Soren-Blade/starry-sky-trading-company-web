/**
 * dev 代理覆盖测试（纯静态，不需要起 dev server）
 *
 * 为什么需要它：
 *   `vite.config.js` 的 proxy 是按路径**逐条**列出的 —— 不能写成 `'/user'` 一整段，
 *   因为 `/user/kami`、`/user/orders` 是前端路由，整段代理会让这些页面在 dev 下永远打不开。
 *   于是新增一个后端前缀却忘了补代理时，dev 下该接口会被 dev server 自己接住、
 *   返回一份 `index.html`；前端拿到 HTML 去解析，报出来的却是「网络错误」，
 *   排查方向被完全带偏。
 *
 * 本项目已经踩过两次同一个坑：
 *   - v1.1.0：`/memberApi`、`/pointsApi`、`/couponApi`（发布后才发现，提交 `92d66b1`）
 *   - v1.3.0：`/mailApi`、`/supportApi`（被 `verify:dev` 在收口时抓住）
 *
 * 这条断言此前只存在于 `npm run verify:dev` 里，而那个脚本要起 5173 + 后端，
 * 默认门禁 `npm test` 覆盖不到它。所以把同一套判定规则搬到这里，
 * 让「加前缀要补代理」变成跑一次单测就知道的事。
 *
 * 判定规则与 `scripts/verify-dev.cjs` 的 4b 段保持一致：
 *   每个具体调用路径，要么**整条**是 proxy 的键（`/user/login` 这种），
 *   要么它的**第一段**是 proxy 的键（`/cartApi/getCart` → `/cartApi`）。
 */
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, readdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const WEB_ROOT = join(__dirname, '..')

const read = (p) => readFileSync(p, 'utf8')

/** 解析 `src/api/ask/*.js` 里所有 `request.<method>('<path>')` 调用路径。 */
function parseCallPaths() {
  const dir = join(WEB_ROOT, 'src', 'api', 'ask')
  const paths = new Set()

  for (const file of readdirSync(dir).filter((f) => f.endsWith('.js'))) {
    const source = read(join(dir, file))

    const bases = {}
    for (const m of source.matchAll(/const\s+(\w+)\s*=\s*['"]([^'"]+)['"]/g)) bases[m[1]] = m[2]

    for (const m of source.matchAll(/request\.(?:get|post|put|patch|delete)\s*\(\s*[`'"]([^`'"]*)[`'"]/g)) {
      // `${baseURL}` 还原成字面量；`${encodeURIComponent(x)}` 这类还原不了也无妨 —— 只看第一段
      const resolved = m[1].replace(/\$\{(\w+)\}/g, (_, name) => (name in bases ? bases[name] : ''))
      paths.add(resolved.split('?')[0])
    }
  }

  return paths
}

/** 解析 `vite.config.js` 的 `server.proxy` 键。 */
function parseProxyKeys() {
  const config = read(join(WEB_ROOT, 'vite.config.js'))
  const block = config.slice(config.indexOf('proxy:'))

  return new Set([...block.matchAll(/^\s*'([^']+)':\s*\{\s*target/gm)].map((m) => m[1]))
}

const firstSegment = (p) => '/' + String(p).split('/').filter(Boolean)[0]

const callPaths = parseCallPaths()
const proxyKeys = parseProxyKeys()

test('解析出的前端 API 调用路径数量不为零（避免解析失败导致假通过）', () => {
  // 低于 15 条基本说明正则失配了（真实数量见下面的失败信息）
  assert.ok(callPaths.size >= 15, `只解析到 ${callPaths.size} 条：${[...callPaths].join(', ')}`)
})

test('vite.config.js 的 proxy 能覆盖全部前端 API 调用路径', () => {
  const unproxied = [...callPaths].filter((p) => !proxyKeys.has(p) && !proxyKeys.has(firstSegment(p)))

  assert.deepEqual(
    unproxied,
    [],
    `以下路径在 dev 下不会被转发（会被 dev server 接住返回 index.html）：${unproxied.join(', ')}`
  )
})

test('`/user` 下的四个接口逐条列出（不能整段代理 `/user`）', () => {
  // 这是上面那条判定规则唯一的例外，也是刻意为之：
  // `/user` 既是接口前缀（四个鉴权接口），又是前端路由前缀（`/user/kami`、`/user/orders`、
  // `/user/profile`）。所以这里**没有** `/user` 这一条代理键，只有四条具体路径；
  // 换句话说「调用路径的第一段必须在 proxy 表里」并不成立 —— 整条路径在表里也算数。
  for (const p of ['/user/login', '/user/register', '/user/visitorLogin', '/user/refreshToken']) {
    assert.ok(proxyKeys.has(p), `${p} 必须逐条列出代理规则`)
  }
})

test('v1.3.0 的两个前缀在代理表里（回归钉子：mailApi / supportApi）', () => {
  for (const prefix of ['/mailApi', '/supportApi']) {
    assert.ok(proxyKeys.has(prefix), `${prefix} 没有代理规则，dev 下消息中心/客服中心会拿不到数据`)
  }
})

test('`/uploads` 在代理表里（它不经 request()，上面的静态比对覆盖不到）', () => {
  // `/uploads` 一旦没被代理，表现是「头像上传成功但图片不显示」，极难联想到代理配置
  assert.ok(proxyKeys.has('/uploads'), '/uploads 没有代理规则，dev 下头像等上传物会 404')
})

test('`/mailCron` 刻意不代理：它只由运维定时器调用，浏览器不发', () => {
  assert.ok(!proxyKeys.has('/mailCron'), '/mailCron 不该出现在浏览器代理表里')
  const cronCalls = [...callPaths].filter((p) => p.startsWith('/mailCron'))

  assert.deepEqual(cronCalls, [], `前端不应调用 /mailCron：${cronCalls.join(', ')}`)
})

test('没有把前端路由前缀整段代理掉（`/user` 是路由不是接口前缀）', () => {
  // `/user/kami`、`/user/orders`、`/user/profile` 都是前端路由；
  // 一旦把 `/user` 整段代理，这些页面在 dev 下会永远打不开。
  assert.ok(!proxyKeys.has('/user'), '`/user` 被整段代理了 —— 会吃掉 /user/kami、/user/orders 等前端路由')

  for (const key of proxyKeys) {
    assert.ok(key.startsWith('/'), `代理键必须是绝对路径：${key}`)
  }
})
