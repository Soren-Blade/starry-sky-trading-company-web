import test from 'node:test'
import assert from 'node:assert/strict'

import { installStorageStub, resetStorage, loadAppModule } from './setup.js'

// 存储桩必须在模块被导入前装好
const { local, session } = installStorageStub()

const {
  getAccessToken,
  setAccessToken,
  getRefreshToken,
  setRefreshToken,
  clearTokens,
  setTokensFromHeaders,
} = await loadAppModule('/hooks/useToken/index.js')

const ACCESS_KEY = 'ACCESS_TOKEN'
const REFRESH_KEY = 'REFRESH_TOKEN'

test.beforeEach(() => resetStorage())

test('setAccessToken / getAccessToken：写入 localStorage', () => {
  setAccessToken('access-abc')
  assert.equal(local.getItem(ACCESS_KEY), 'access-abc')
  assert.equal(getAccessToken(), 'access-abc')
})

test('setRefreshToken：放 sessionStorage，并清掉 localStorage 里的旧值', () => {
  // 模拟旧版本遗留
  local.setItem(REFRESH_KEY, 'legacy-refresh')

  setRefreshToken('refresh-xyz')

  assert.equal(session.getItem(REFRESH_KEY), 'refresh-xyz')
  assert.equal(local.getItem(REFRESH_KEY), null, 'localStorage 的旧值应被清除')
  assert.equal(getRefreshToken(), 'refresh-xyz')
})

test('getRefreshToken：sessionStorage 缺失时回退读取 localStorage（兼容旧版本）', () => {
  local.setItem(REFRESH_KEY, 'legacy-only')
  assert.equal(getRefreshToken(), 'legacy-only')
})

test('getRefreshToken：sessionStorage 优先于 localStorage', () => {
  local.setItem(REFRESH_KEY, 'legacy')
  session.setItem(REFRESH_KEY, 'current')
  assert.equal(getRefreshToken(), 'current')
})

test('clearTokens：两个存储的三处键都被清空', () => {
  setAccessToken('a')
  setRefreshToken('r')
  local.setItem(REFRESH_KEY, 'legacy')

  clearTokens()

  assert.equal(local.getItem(ACCESS_KEY), null)
  assert.equal(local.getItem(REFRESH_KEY), null)
  assert.equal(session.getItem(REFRESH_KEY), null)
  assert.equal(getAccessToken(), null)
  assert.equal(getRefreshToken(), null)
})

test('setAccessToken(null)：传空值等于删除而不是写入 "null"', () => {
  setAccessToken('a')
  setAccessToken(null)
  assert.equal(local.getItem(ACCESS_KEY), null)
  assert.equal(getAccessToken(), null)
})

test('setTokensFromHeaders：从响应头提取两个 token 并落库', () => {
  const result = setTokensFromHeaders({
    'access-token': 'header-access',
    'refresh-token': 'header-refresh',
  })

  assert.equal(result.accessToken, 'header-access')
  assert.equal(result.refreshToken, 'header-refresh')
  assert.equal(getAccessToken(), 'header-access')
  assert.equal(getRefreshToken(), 'header-refresh')
})

test('setTokensFromHeaders：头名大写（axios 之外的调用方）不会被识别', () => {
  // 约定是 axios 已把响应头键名小写化；大写形式属调用方用法错误，应明确不生效
  const result = setTokensFromHeaders({ 'Access-Token': 'x', 'Refresh-Token': 'y' })
  assert.equal(result.accessToken, undefined)
  assert.equal(result.refreshToken, undefined)
})

test('setTokensFromHeaders：只有 access token 时不影响 refresh', () => {
  setRefreshToken('keep-me')
  const result = setTokensFromHeaders({ 'access-token': 'only-access' })
  assert.equal(result.accessToken, 'only-access')
  assert.equal(result.refreshToken, undefined)
  assert.equal(getRefreshToken(), 'keep-me')
})

test('setTokensFromHeaders：null / undefined 返回空对象', () => {
  assert.deepEqual(setTokensFromHeaders(null), {})
  assert.deepEqual(setTokensFromHeaders(undefined), {})
  assert.equal(getAccessToken(), null)
})

test('setTokensFromHeaders：空对象返回两个 undefined（而非空对象）', () => {
  // headers 是 truthy，会走到返回值分支；两个键都取不到值
  assert.deepEqual(setTokensFromHeaders({}), {
    accessToken: undefined,
    refreshToken: undefined,
  })
  assert.equal(getAccessToken(), null)
})

test('存储不可写时静默降级（隐私模式）', () => {
  // 换一套会抛错的桩，验证 safeSet / safeGet 的 try-catch 生效
  installStorageStub({ failWrites: true })
  try {
    assert.doesNotThrow(() => setAccessToken('a'))
    assert.doesNotThrow(() => setRefreshToken('r'))
    assert.doesNotThrow(() => clearTokens())
    assert.equal(getAccessToken(), null)
    assert.equal(getRefreshToken(), null)
  } finally {
    installStorageStub()
  }
})
