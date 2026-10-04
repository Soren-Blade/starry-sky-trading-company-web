import test from 'node:test'
import assert from 'node:assert/strict'
import { createHmac } from 'node:crypto'

import {
  base32ToBytes,
  intToBytes,
  truncate,
  computeTOTP,
  createKeyCache,
  isCryptoAvailable,
} from '../src/utils/totp.js'

/**
 * RFC 6238 附录 B 的种子：ASCII "12345678901234567890"（20 字节），
 * Base32 表示为 GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ。
 */
const SEED_ASCII = '12345678901234567890'
const SEED_BASE32 = 'GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ'

/** 用 node:crypto 写的独立参考实现，用于交叉验证 */
function referenceTotp(base32, unixSeconds, digits = 6, step = 30) {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'
  const clean = base32.replace(/=+$/g, '').replace(/\s+/g, '').toUpperCase()
  const bytes = []
  let bits = 0
  let value = 0
  for (const ch of clean) {
    value = (value << 5) | alphabet.indexOf(ch)
    bits += 5
    if (bits >= 8) {
      bits -= 8
      bytes.push((value >> bits) & 0xff)
    }
  }
  const counter = Math.floor(unixSeconds / step)
  const buf = Buffer.alloc(8)
  buf.writeBigUInt64BE(BigInt(counter))
  const hmac = createHmac('sha1', Buffer.from(bytes)).update(buf).digest()
  const offset = hmac[hmac.length - 1] & 0x0f
  const binary =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff)
  return String(binary % 10 ** digits).padStart(digits, '0')
}

test('运行环境具备 WebCrypto（否则下面的向量无法验证）', () => {
  assert.equal(isCryptoAvailable(), true, 'Node 18+ 应提供 globalThis.crypto.subtle')
})

// ── Base32 解码 ────────────────────────────────────────────────

test('base32ToBytes：与 ASCII 种子逐字节一致', () => {
  const decoded = Buffer.from(base32ToBytes(SEED_BASE32))
  assert.equal(decoded.toString('hex'), Buffer.from(SEED_ASCII, 'ascii').toString('hex'))
})

test('base32ToBytes：忽略大小写、空白与填充符', () => {
  const canonical = Buffer.from(base32ToBytes(SEED_BASE32)).toString('hex')
  assert.equal(Buffer.from(base32ToBytes(SEED_BASE32.toLowerCase())).toString('hex'), canonical)
  assert.equal(Buffer.from(base32ToBytes('GEZD GNBV GY3T QOJQ GEZD GNBV GY3T QOJQ')).toString('hex'), canonical)
  assert.equal(Buffer.from(base32ToBytes(`${SEED_BASE32}======`)).toString('hex'), canonical)
})

test('base32ToBytes：非法字符抛错（而不是静默产出错误密钥）', () => {
  for (const bad of ['0189', 'ABC!', '中文', 'A B C 1']) {
    assert.throws(() => base32ToBytes(bad), /无效的 Base32 字符/, `应拒绝 ${JSON.stringify(bad)}`)
  }
})

test('base32ToBytes：非字符串输入抛错', () => {
  assert.throws(() => base32ToBytes(null), /必须是字符串/)
  assert.throws(() => base32ToBytes(undefined), /必须是字符串/)
  assert.throws(() => base32ToBytes(12345), /必须是字符串/)
})

test('base32ToBytes：已由 Google Authenticator 等使用的常见密钥可正确解码', () => {
  // JBSWY3DPEHPK3PXP 是各类文档里最常见的示例密钥，解码为 "Hello!" + 4 个字节
  const bytes = Buffer.from(base32ToBytes('JBSWY3DPEHPK3PXP'))
  assert.equal(bytes.toString('hex'), '48656c6c6f21deadbeef')
  assert.equal(bytes.length, 10)
  assert.equal(bytes.subarray(0, 6).toString('ascii'), 'Hello!')

  // RFC 4648 的标准示例
  assert.equal(Buffer.from(base32ToBytes('MZXW6===')).toString('ascii'), 'foo')
  assert.equal(Buffer.from(base32ToBytes('MZXW6YTBOI======')).toString('ascii'), 'foobar')
})

// ── 计数器编码 ─────────────────────────────────────────────────

test('intToBytes：8 字节大端', () => {
  assert.equal(Buffer.from(intToBytes(0)).toString('hex'), '0000000000000000')
  assert.equal(Buffer.from(intToBytes(1)).toString('hex'), '0000000000000001')
  assert.equal(Buffer.from(intToBytes(255)).toString('hex'), '00000000000000ff')
  assert.equal(Buffer.from(intToBytes(256)).toString('hex'), '0000000000000100')
  assert.equal(Buffer.from(intToBytes(0x0102030405)).toString('hex'), '0000000102030405')
})

test('intToBytes：超过 2^31 的计数器不溢出（这是改用除法的原因）', () => {
  // 位运算 >> 会先把操作数转成 32 位有符号整数，2^31 处会出错
  const counter = 2 ** 31
  const bytes = Buffer.from(intToBytes(counter))
  assert.equal(bytes.toString('hex'), '0000000080000000')

  const big = 2 ** 32 + 1
  assert.equal(Buffer.from(intToBytes(big)).toString('hex'), '0000000100000001')

  // 对照：位运算版本会得到错误结果
  const bitwise = (() => {
    const b = new Uint8Array(8)
    let n = counter
    for (let i = 7; i >= 0; i--) {
      b[i] = n & 0xff
      n = n >> 8
    }
    return Buffer.from(b).toString('hex')
  })()
  assert.notEqual(bitwise, bytes.toString('hex'), '位运算版本确实是错的')
})

test('intToBytes：负数或非整数被向下取整为 0 基', () => {
  assert.equal(Buffer.from(intToBytes(-1)).toString('hex'), 'ffffffffffffffff', '按字节回绕')
  assert.equal(Buffer.from(intToBytes(3.9)).toString('hex'), '0000000000000003')
})

// ── 动态截断 ───────────────────────────────────────────────────

test('truncate：按 RFC 4226 5.3 取值，且掩掉符号位', () => {
  // 构造一个 HMAC：最后一字节低 4 位 = 2，因此 offset = 2
  const hmac = new Uint8Array(20)
  hmac[2] = 0x80 // 最高位会被 0x7f 掩掉
  hmac[3] = 0x00
  hmac[4] = 0x00
  hmac[5] = 0x01
  hmac[19] = 0x02 // offset = 2
  const value = truncate(hmac)
  assert.equal(value, (0x80 & 0x7f) << 24 | 0x01, '应掩掉 0x80 的最高位')
  assert.ok(value >= 0, '结果必须是非负数')
})

test('truncate：offset 取最后一字节的低 4 位', () => {
  const hmac = new Uint8Array(20)
  hmac[19] = 0x1f // 低 4 位 = 15
  hmac[15] = 0x7f
  hmac[16] = 0xff
  hmac[17] = 0xff
  hmac[18] = 0xff
  assert.equal(truncate(hmac), 0x7fffffff)
})

// ── RFC 6238 官方测试向量 ──────────────────────────────────────

const RFC_VECTORS = [
  [59, '94287082'],
  [1111111109, '07081804'],
  [1111111111, '14050471'],
  [1234567890, '89005924'],
  [2000000000, '69279037'],
  [20000000000, '65353130'],
]

for (const [unixSeconds, expected] of RFC_VECTORS) {
  test(`computeTOTP：RFC 6238 向量 t=${unixSeconds} -> ${expected}`, async () => {
    const { otp } = await computeTOTP(SEED_BASE32, { digits: 8, now: unixSeconds * 1000 })
    assert.equal(otp, expected)
  })
}

test('computeTOTP：6 位时取 8 位结果的后 6 位', async () => {
  // RFC 向量的 8 位结果为 94287082，6 位应为 287082
  const { otp } = await computeTOTP(SEED_BASE32, { digits: 6, now: 59 * 1000 })
  assert.equal(otp, '287082')
})

test('computeTOTP：计数器 = floor(unixSeconds / step)', async () => {
  const a = await computeTOTP(SEED_BASE32, { now: 0 })
  assert.equal(a.counter, 0)

  const b = await computeTOTP(SEED_BASE32, { now: 29_999 })
  assert.equal(b.counter, 0, '29.999 秒仍属于第 0 个周期')

  const c = await computeTOTP(SEED_BASE32, { now: 30_000 })
  assert.equal(c.counter, 1, '30 秒进入第 1 个周期')
})

test('computeTOTP：同一周期内结果稳定，跨周期变化', async () => {
  const t0 = await computeTOTP(SEED_BASE32, { now: 60_000 })
  const t1 = await computeTOTP(SEED_BASE32, { now: 89_999 })
  const t2 = await computeTOTP(SEED_BASE32, { now: 90_000 })

  assert.equal(t0.otp, t1.otp, '同一 30 秒周期内应一致')
  assert.equal(t0.counter, t1.counter)
  assert.notEqual(t0.otp, t2.otp, '跨周期应变化')
  assert.notEqual(t0.counter, t2.counter)
})

test('computeTOTP：输出恒为指定位数的数字串', async () => {
  for (const digits of [6, 7, 8]) {
    for (const now of [0, 59_000, 1_700_000_000_000]) {
      const { otp } = await computeTOTP(SEED_BASE32, { digits, now })
      assert.match(otp, new RegExp(`^\\d{${digits}}$`), `digits=${digits} now=${now} 得到 ${otp}`)
    }
  }
})

test('computeTOTP：可自定义周期（step）', async () => {
  const { otp, counter } = await computeTOTP(SEED_BASE32, { step: 60, now: 60_000 })
  assert.equal(counter, 1)
  assert.equal(otp, referenceTotp(SEED_BASE32, 60, 6, 60))
})

// ── 与独立实现交叉验证 ─────────────────────────────────────────

test('computeTOTP：与 node:crypto 独立实现在多个时间点一致', async () => {
  const times = [0, 1, 59, 1111111109, 1234567890, 2000000000, 4102444800]
  for (const t of times) {
    for (const digits of [6, 8]) {
      const { otp } = await computeTOTP(SEED_BASE32, { digits, now: t * 1000 })
      assert.equal(otp, referenceTotp(SEED_BASE32, t, digits), `t=${t} digits=${digits} 不一致`)
    }
  }
})

test('computeTOTP：不同密钥产生不同验证码', async () => {
  const a = await computeTOTP('JBSWY3DPEHPK3PXP', { now: 1234567890000 })
  const b = await computeTOTP('GEZDGNBVGY3TQOJQ', { now: 1234567890000 })
  assert.notEqual(a.otp, b.otp)
})

// ── 密钥缓存 ───────────────────────────────────────────────────

test('createKeyCache：结果与直接计算一致', async () => {
  const cache = createKeyCache()
  const now = 1_234_567_890_000
  const viaCache = await cache.compute(SEED_BASE32, { now })
  const direct = await computeTOTP(SEED_BASE32, { now })
  assert.equal(viaCache.otp, direct.otp)
})

test('createKeyCache：大小写与空白差异不造成结果偏差', async () => {
  const cache = createKeyCache()
  const now = 1_234_567_890_000
  const lower = await cache.compute(SEED_BASE32.toLowerCase(), { now })
  const spaced = await cache.compute(` ${SEED_BASE32.slice(0, 8)} ${SEED_BASE32.slice(8)} `, { now })
  const canonical = await computeTOTP(SEED_BASE32, { now })
  assert.equal(lower.otp, canonical.otp)
  assert.equal(spaced.otp, canonical.otp)
})

test('createKeyCache：切换密钥后结果随之变化', async () => {
  const cache = createKeyCache()
  const now = 1_234_567_890_000
  const a = await cache.compute(SEED_BASE32, { now })
  const b = await cache.compute('JBSWY3DPEHPK3PXP', { now })
  assert.notEqual(a.otp, b.otp)
})

test('createKeyCache：clear 后可继续使用', async () => {
  const cache = createKeyCache()
  const now = 1_234_567_890_000
  const before = await cache.compute(SEED_BASE32, { now })
  cache.clear()
  const after = await cache.compute(SEED_BASE32, { now })
  assert.equal(before.otp, after.otp)
})

// ── 错误路径 ───────────────────────────────────────────────────

test('computeTOTP：非法 Base32 密钥抛错', async () => {
  await assert.rejects(() => computeTOTP('0189!', { now: 0 }), /无效的 Base32 字符/)
})

test('importKey：非安全上下文下抛出可识别的错误', async () => {
  const { importKey } = await import('../src/utils/totp.js')

  // globalThis.crypto 在 Node 里是只读的访问器属性，必须用 defineProperty 替换
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'crypto')
  try {
    Object.defineProperty(globalThis, 'crypto', {
      configurable: true,
      writable: true,
      value: {}, // 存在 crypto，但没有 subtle —— 模拟非安全上下文
    })
    assert.equal(isCryptoAvailable(), false, '此时应判定为不可用')

    await assert.rejects(
      () => importKey(new Uint8Array([1, 2, 3])),
      (err) => err.name === 'MissingSecureContext' && /安全上下文/.test(err.message)
    )
  } finally {
    if (descriptor) Object.defineProperty(globalThis, 'crypto', descriptor)
    else delete globalThis.crypto
  }
})
