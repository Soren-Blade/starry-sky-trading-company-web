import test from 'node:test'
import assert from 'node:assert/strict'

import { installStorageStub, installDomStub, loadAppModule } from './setup.js'

installStorageStub()
installDomStub()

const {
  validateAvatarFile,
  fitWithin,
  describeDataUrlSize,
  AVATAR_ALLOWED_TYPES,
  AVATAR_MAX_SOURCE_BYTES,
  AVATAR_TARGET_SIZE,
} = await loadAppModule('/utils/avatarFile.js')

/** 造一个类 File 对象（只需要 type / size / name） */
const fileOf = (size, type = 'image/png', name = 'a.png') => ({ size, type, name })

// ── validateAvatarFile ─────────────────────────────────────

test('validateAvatarFile：三种允许的类型都通过', () => {
  for (const type of AVATAR_ALLOWED_TYPES) {
    const out = validateAvatarFile(fileOf(1024, type))
    assert.equal(out.ok, true, `${type} 应通过`)
  }
})

test('validateAvatarFile：空值 / 空文件被拒', () => {
  for (const bad of [null, undefined, {}, { size: 0 }, { size: -1 }, { size: 'abc' }, 'a.png']) {
    const out = validateAvatarFile(bad)
    assert.equal(out.ok, false, `${JSON.stringify(bad)} 应被拒`)
    assert.ok(out.message.length > 0, '必须给出可展示的原因')
  }
})

test('validateAvatarFile：超过 5 MB 被拒，且文案给出 MB 数', () => {
  const out = validateAvatarFile(fileOf(AVATAR_MAX_SOURCE_BYTES + 1))
  assert.equal(out.ok, false)
  assert.match(out.message, /MB/)

  // 正好等于上限应通过（边界不能差一）
  assert.equal(validateAvatarFile(fileOf(AVATAR_MAX_SOURCE_BYTES)).ok, true)
})

test('validateAvatarFile：不支持的类型被拒，文案列出允许的格式', () => {
  for (const type of ['image/svg+xml', 'image/gif', 'image/bmp', 'application/pdf', 'text/plain']) {
    const out = validateAvatarFile(fileOf(1024, type))
    assert.equal(out.ok, false, `${type} 应被拒`)
  }
  assert.match(validateAvatarFile(fileOf(1024, 'image/gif')).message, /JPG/)
})

test('validateAvatarFile：type 为空时放行（浏览器不总能推断类型，交给服务端按字节判）', () => {
  assert.equal(validateAvatarFile(fileOf(1024, '')).ok, true)
  assert.equal(validateAvatarFile(fileOf(1024, undefined)).ok, true)
})

test('validateAvatarFile：SVG 被拒（与服务端白名单一致）', () => {
  assert.equal(AVATAR_ALLOWED_TYPES.includes('image/svg+xml'), false)
  assert.equal(validateAvatarFile(fileOf(1024, 'image/svg+xml')).ok, false)
})

// ── fitWithin ──────────────────────────────────────────────

test('fitWithin：横图按最长边等比缩小', () => {
  assert.deepEqual(fitWithin(4000, 3000, 256), { width: 256, height: 192 })
})

test('fitWithin：竖图同理（最长边是高）', () => {
  assert.deepEqual(fitWithin(3000, 4000, 256), { width: 192, height: 256 })
})

test('fitWithin：正方形缩到边长', () => {
  assert.deepEqual(fitWithin(1000, 1000, 256), { width: 256, height: 256 })
})

test('fitWithin：小图不放大（放大只会更糊、文件更大）', () => {
  assert.deepEqual(fitWithin(64, 64, 256), { width: 64, height: 64 })
  assert.deepEqual(fitWithin(100, 50, 256), { width: 100, height: 50 })
})

test('fitWithin：正好等于上限时原样返回', () => {
  assert.deepEqual(fitWithin(256, 128, 256), { width: 256, height: 128 })
})

test('fitWithin：极窄的图不会算出 0（canvas 宽高为 0 会抛错）', () => {
  const out = fitWithin(4000, 3, 256)
  assert.equal(out.width, 256)
  assert.ok(out.height >= 1, `高度必须至少为 1，实际 ${out.height}`)
})

test('fitWithin：非法输入回落到正方形目标尺寸', () => {
  for (const bad of [
    [0, 100], [100, 0], [-1, 100], ['a', 'b'], [null, null], [undefined, undefined], [NaN, 5],
  ]) {
    const out = fitWithin(bad[0], bad[1], 256)
    assert.equal(out.width, 256, `${JSON.stringify(bad)} 应回落到目标尺寸`)
    assert.equal(out.height, 256)
  }
})

test('fitWithin：结果永远是 >= 1 的整数', () => {
  for (const [w, h] of [[1, 1], [3999, 3999], [10000, 7], [7, 10000], [1.6, 2.4]]) {
    const out = fitWithin(w, h, AVATAR_TARGET_SIZE)
    assert.ok(Number.isInteger(out.width) && out.width >= 1, `${w}x${h} → ${JSON.stringify(out)}`)
    assert.ok(Number.isInteger(out.height) && out.height >= 1)
  }
})

// ── describeDataUrlSize ────────────────────────────────────

test('describeDataUrlSize：按 base64 长度换算字节并给出可读文本', () => {
  // 4 个 base64 字符 = 3 字节
  assert.equal(describeDataUrlSize('data:image/png;base64,AAAA'), '3 B')
  // 末尾 '=' 是填充，不计入
  assert.equal(describeDataUrlSize('data:image/png;base64,AAA='), '2 B')
})

test('describeDataUrlSize：超过 1 KB 用 KB 表示并保留一位小数', () => {
  const payload = 'A'.repeat(4096) // 4096/4*3 = 3072 字节 = 3.0 KB
  assert.equal(describeDataUrlSize(`data:image/png;base64,${payload}`), '3.0 KB')
})

test('describeDataUrlSize：非法输入返回空串而不是 NaN', () => {
  for (const bad of [null, undefined, '', 'notadataurl', 42, {}]) {
    assert.equal(describeDataUrlSize(bad), '')
  }
})

test('常量：目标边长与源文件上限的取值合理', () => {
  assert.equal(AVATAR_TARGET_SIZE, 256)
  assert.equal(AVATAR_MAX_SOURCE_BYTES, 5 * 1024 * 1024)
})
