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
  applyRememberMe,
  getRememberPreference,
  getRememberedIdentifier,
} = await loadAppModule('/hooks/useToken/index.js')

const ACCESS_KEY = 'ACCESS_TOKEN'
const REFRESH_KEY = 'REFRESH_TOKEN'
const REMEMBER_KEY = 'SSTC_REMEMBER_ME'
const IDENTIFIER_KEY = 'SSTC_LAST_IDENTIFIER'

test.beforeEach(() => resetStorage())

test('setAccessToken / getAccessToken：写入 localStorage', () => {
  setAccessToken('access-abc')
  assert.equal(local.getItem(ACCESS_KEY), 'access-abc')
  assert.equal(getAccessToken(), 'access-abc')
})

test('setRefreshToken：默认只放 sessionStorage（会话级，关掉浏览器即失效）', () => {
  setRefreshToken('refresh-xyz')

  assert.equal(session.getItem(REFRESH_KEY), 'refresh-xyz')
  assert.equal(local.getItem(REFRESH_KEY), null, '没勾「记住我」时不应持久化')
  assert.equal(getRefreshToken(), 'refresh-xyz')
})

test('setRefreshToken：旧版遗留在 localStorage 的值会被同步成新 token，而不是留下失效值', () => {
  // 旧版本把 refresh token 写在 localStorage；旧实现是无条件删掉它。
  // 现在改为「原来有就继续维护」，因此两份要么都是新值、要么都没有 ——
  // 不会出现一份新的在 sessionStorage、一份过期的留在 localStorage。
  local.setItem(REFRESH_KEY, 'legacy-refresh')

  setRefreshToken('refresh-xyz')

  assert.equal(session.getItem(REFRESH_KEY), 'refresh-xyz')
  assert.equal(local.getItem(REFRESH_KEY), 'refresh-xyz', '应与 sessionStorage 保持一致')
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
    assert.doesNotThrow(() => applyRememberMe(true, 'me'))
    assert.equal(getAccessToken(), null)
    assert.equal(getRefreshToken(), null)
  } finally {
    installStorageStub()
  }
})

// ── 记住我 ─────────────────────────────────────────────────

test('记住我：勾选后 refresh token 同时持久化到 localStorage', () => {
  // 模拟登录：响应拦截器先把 token 写进 sessionStorage
  setRefreshToken('refresh-from-login')
  assert.equal(local.getItem(REFRESH_KEY), null, '此时还没应用「记住我」')

  applyRememberMe(true, 'alice')

  assert.equal(session.getItem(REFRESH_KEY), 'refresh-from-login')
  assert.equal(local.getItem(REFRESH_KEY), 'refresh-from-login', '勾选后应持久化')
  assert.equal(getRememberPreference(), true)
  assert.equal(getRememberedIdentifier(), 'alice')
})

test('记住我：不勾选时保持会话级，并清掉此前可能存在的持久化', () => {
  applyRememberMe(true, 'alice')
  setRefreshToken('refresh-1')
  applyRememberMe(true, 'alice')
  assert.equal(local.getItem(REFRESH_KEY), 'refresh-1')

  // 用户这次不勾了
  applyRememberMe(false, 'alice')

  assert.equal(local.getItem(REFRESH_KEY), null, '取消勾选后不应再持久化')
  assert.equal(session.getItem(REFRESH_KEY), 'refresh-1', '本次会话仍然可用')
  assert.equal(getRememberPreference(), false)
  assert.equal(getRememberedIdentifier(), '', '取消勾选应一并忘掉记住的账号')
})

test('记住我：静默续期换了新 token 后仍然是持久化的（关键的失效场景）', () => {
  // 这是最容易漏的一条：access token 只有 180 秒，页面停留超过 3 分钟
  // 就会触发一次静默续期，新 refresh token 经由 setTokensFromHeaders 写入。
  // 若 setRefreshToken 无条件只写 sessionStorage，用户「明明勾了记住我」，
  // 过一会儿关掉浏览器却还是要重新登录。
  setRefreshToken('refresh-1')
  applyRememberMe(true, 'alice')

  setTokensFromHeaders({ 'access-token': 'a2', 'refresh-token': 'refresh-2' })

  assert.equal(local.getItem(REFRESH_KEY), 'refresh-2', '续期后的新 token 仍应持久化')
  assert.equal(session.getItem(REFRESH_KEY), 'refresh-2', '两份必须一致，不能一 new 一 old')
})

test('记住我：没勾选时续期不会「偷偷升级」成持久化', () => {
  setRefreshToken('refresh-1')
  applyRememberMe(false, 'alice')

  setTokensFromHeaders({ 'refresh-token': 'refresh-2' })

  assert.equal(local.getItem(REFRESH_KEY), null)
  assert.equal(session.getItem(REFRESH_KEY), 'refresh-2')
})

test('记住我：clearTokens 之后游客登录不会继承持久化（不应把游客会话也记住）', () => {
  setRefreshToken('refresh-user')
  applyRememberMe(true, 'alice')
  assert.equal(local.getItem(REFRESH_KEY), 'refresh-user')

  // 退出登录
  clearTokens()
  assert.equal(local.getItem(REFRESH_KEY), null)

  // 退出后自动以游客身份初始化，游客 token 走同一条写入路径
  setTokensFromHeaders({ 'access-token': 'guest-a', 'refresh-token': 'guest-r' })

  assert.equal(session.getItem(REFRESH_KEY), 'guest-r')
  assert.equal(local.getItem(REFRESH_KEY), null, '游客的 refresh token 不应被持久化')
})

test('记住我：登录失败（没有拿到 token）时只记偏好，不动存储', () => {
  applyRememberMe(true, 'alice')

  assert.equal(getRememberPreference(), true)
  assert.equal(getRememberedIdentifier(), 'alice')
  assert.equal(local.getItem(REFRESH_KEY), null)
  assert.equal(session.getItem(REFRESH_KEY), null)
})

test('记住我：identifier 去空白，非字符串按空处理', () => {
  applyRememberMe(true, '  bob@example.com  ')
  assert.equal(getRememberedIdentifier(), 'bob@example.com')

  applyRememberMe(true, undefined)
  assert.equal(getRememberedIdentifier(), '')
})

test('记住我：偏好与账号的存储键名固定（改名会让老用户的偏好无声丢失）', () => {
  setRefreshToken('r')
  applyRememberMe(true, 'alice')

  // 直接断言底层键名：这两个键是「用户偏好」而不是凭据，
  // 一旦改名，老用户已保存的勾选状态与账号会被当成从未存在过。
  assert.equal(local.getItem(REMEMBER_KEY), '1')
  assert.equal(local.getItem(IDENTIFIER_KEY), 'alice')

  applyRememberMe(false)

  assert.equal(local.getItem(REMEMBER_KEY), null, '取消勾选应删除该键而不是写 "0"')
  assert.equal(local.getItem(IDENTIFIER_KEY), null)
})

test('记住我：默认未勾选、无记住账号（首次访问的干净状态）', () => {
  assert.equal(getRememberPreference(), false)
  assert.equal(getRememberedIdentifier(), '')
  assert.equal(local.getItem(REMEMBER_KEY), null)
  assert.equal(local.getItem(IDENTIFIER_KEY), null)
})

test('记住我：偏好与账号不受 clearTokens 影响（它们不是凭据）', () => {
  setRefreshToken('r')
  applyRememberMe(true, 'alice')

  clearTokens()

  assert.equal(getRememberPreference(), true, '退出登录后复选框应保持上次的选择')
  assert.equal(getRememberedIdentifier(), 'alice', '退出登录不该抹掉记住的账号')
  assert.equal(getRefreshToken(), null, '凭据必须清干净')
})
