// token 的本地存储读写
//
// 存储位置说明：
// - access token 放 localStorage：刷新页面后仍保持登录态。它只有 180 秒有效期，
//   持久化带来的暴露窗口很小。
// - refresh token **默认放 sessionStorage**：关闭标签页即失效，缩小长效凭据的暴露窗口。
// - 勾选「记住我」后，refresh token **同时**持久化到 localStorage —— 这才是
//   「记住我」的实际含义：关掉浏览器再打开仍然是登录态（有效期 7 天，取决于
//   refresh token 本身的时长）。
//
// 「记住我」的状态**不再单独用一个开关记录**，而是直接由
// 「localStorage 里此刻有没有 refresh token」推导（见 setRefreshToken）。
// 这样只有一处事实来源：
//   - 退出登录 / 刷新失败 → clearTokens 清掉它 → 之后的游客登录自动回到会话级
//   - 静默续期换了新 token → 发现原来有就继续维护，发现原来没有就不再写入
// 用一个独立开关的话，退出登录后那个开关会残留为「开」，
// 于是**游客**的 refresh token 也会被持久化 —— 那不是用户要的。
//
// 注意：localStorage/sessionStorage 都无法防御 XSS。彻底方案是让后端改用
// httpOnly Cookie 下发 refresh token，那需要后端配合，属于后续演进项。

const ACCESS_KEY = 'ACCESS_TOKEN'
const REFRESH_KEY = 'REFRESH_TOKEN'
/** 「记住我」这个**偏好**本身（只影响复选框的默认值与是否带出账号，不参与鉴权判定） */
const REMEMBER_KEY = 'SSTC_REMEMBER_ME'
/** 上次成功登录用的账号标识（用户名 / 邮箱 / 手机号），仅在勾选「记住我」时保存 */
const IDENTIFIER_KEY = 'SSTC_LAST_IDENTIFIER'

/**
 * 读取本地存储。
 *
 * 存储对象本身必须在 **try 内部**取：`localStorage` 这个标识符有两种情况会直接抛错 ——
 *   1. 环境里根本没有它（Node / SSR / 组件渲染测试）；
 *   2. 浏览器禁用了存储（隐私模式、第三方 Cookie 被拦）时，**访问 `window.localStorage`
 *      本身就抛 SecurityError**，而不是等到调用它的方法才抛。
 * 因此不能写成 `safeGet(localStorage, key)` 那种形式 —— 那样 `localStorage` 的求值在 try 之外。
 *
 * 这个区别是在把 token 读取提到组件 setup（LoginModal 读「记住我」偏好）之后才暴露的：
 * 渲染测试直接报 `ReferenceError: localStorage is not defined`。
 *
 * @param {'localStorage'|'sessionStorage'} name
 * @param {string} key
 * @returns {string|null}
 */
function readStorage(name, key) {
    try {
        return globalThis[name]?.getItem(key) ?? null
    } catch {
        return null
    }
}

/** 写入本地存储（值为空时删除该键）。同上，存储对象在 try 内取；不可写时静默降级。 */
function writeStorage(name, key, value) {
    try {
        const storage = globalThis[name]
        if (!storage) return
        if (value) storage.setItem(key, value)
        else storage.removeItem(key)
    } catch {
        /* 隐私模式下可能不可写，静默降级 */
    }
}

export function getAccessToken() {
    return readStorage('localStorage', ACCESS_KEY)
}

/**
 * 解码 JWT 的载荷段（**不验签**）。
 *
 * 为什么不验签：这个 token 是我们自己签的，前端也没有密钥；验签本来就该由服务端做。
 * 这里读 `exp` 只是为了「别带着一个必然过期的 token 出门」，读错了最坏的结果是
 * 白跑一次刷新请求 —— 而服务端仍会照常拒绝被篡改的 token。**安全边界没有下移**。
 *
 * 解码失败（段数不对、base64 非法、不是 JSON）一律返回 null，绝不抛异常：
 * 它会被请求拦截器**每个请求**调用一次，抛错等于整站不可用。
 *
 * @param {*} token
 * @returns {object|null}
 */
export function decodeTokenPayload(token) {
    if (typeof token !== 'string' || token === '') return null

    const parts = token.split('.')
    if (parts.length !== 3) return null

    try {
        // JWT 用 base64url：先换回标准 base64 再补齐 padding
        const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/')
        const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4)

        // atob 在 Node 与浏览器里都存在；不依赖 Buffer（浏览器里没有）
        const json = globalThis.atob(padded)
        const payload = JSON.parse(json)
        return payload && typeof payload === 'object' ? payload : null
    } catch {
        return null
    }
}

/**
 * access token 距过期还有多少毫秒。
 *
 * @param {number} [nowMs] 便于测试注入
 * @returns {number|null} 无 token / 无 exp / 解不开时返回 null（调用方按「不知道」处理）
 */
export function getAccessTokenRemainingMs(nowMs) {
    const payload = decodeTokenPayload(getAccessToken())
    if (!payload || typeof payload.exp !== 'number') return null

    const now = typeof nowMs === 'number' ? nowMs : Date.now()
    return payload.exp * 1000 - now
}

export function setAccessToken(token) {
    writeStorage('localStorage', ACCESS_KEY, token)
}

export function getRefreshToken() {
    return readStorage('sessionStorage', REFRESH_KEY) || readStorage('localStorage', REFRESH_KEY)
}

/**
 * 写入 refresh token。
 *
 * **保持既有的存储位置**：localStorage 里本来有一份就继续维护那一份，
 * 本来没有就只写 sessionStorage。
 *
 * 为什么必须这样做：access token 只有 180 秒，一次静默续期就会走一遍这里。
 * 若无条件「只写 sessionStorage」，用户勾了「记住我」登录后，
 * 只要页面停留超过 3 分钟触发过一次续期，持久化的那份就会被悄悄删掉 ——
 * 表现为「明明勾了记住我，过一会儿关掉浏览器还是要重新登录」，
 * 而且极难复现（取决于停留时长）。
 *
 * 顺带保证两份**不会不一致**：要么都持有新 token，要么 localStorage 里没有。
 * 这也取代了旧实现「无条件清掉 localStorage 旧值」的迁移逻辑 ——
 * 旧版遗留的那份同样会被同步成新 token，而不是留下一个失效值。
 */
export function setRefreshToken(token) {
    const remembered = Boolean(readStorage('localStorage', REFRESH_KEY))

    writeStorage('sessionStorage', REFRESH_KEY, token)
    writeStorage('localStorage', REFRESH_KEY, remembered ? token : '')
}

export function clearTokens() {
    writeStorage('localStorage', ACCESS_KEY, '')
    writeStorage('localStorage', REFRESH_KEY, '')
    writeStorage('sessionStorage', REFRESH_KEY, '')
}

// ── 记住我 ────────────────────────────────────────────────────────

/** 复选框的默认值：上次是否勾选过 */
export function getRememberPreference() {
    return readStorage('localStorage', REMEMBER_KEY) === '1'
}

/** 上次成功登录用的账号标识（没勾「记住我」时为空串） */
export function getRememberedIdentifier() {
    return readStorage('localStorage', IDENTIFIER_KEY) || ''
}

/**
 * 应用「记住我」的选择。
 *
 * **必须在登录成功之后、任何会触发续期的请求之前调用**：
 * token 是响应拦截器写进来的，这里只负责把它复制/移出 localStorage。
 * 顺序反了的话，`getUserInfo()` 一旦 401 触发续期，
 * 那次续期看到的是「还没勾记住我」的旧状态，于是把 token 写成会话级，
 * 用户的选择就丢了。
 *
 * @param {boolean} remember
 * @param {string} [identifier] 本次登录用的账号标识，勾选时一并记住
 */
export function applyRememberMe(remember, identifier) {
    const rememberIt = Boolean(remember)

    writeStorage('localStorage', REMEMBER_KEY, rememberIt ? '1' : '')

    // 没勾就顺手忘掉上次记住的账号 —— 否则用户取消勾选后仍会被带出账号，
    // 看上去像「取消没生效」
    if (rememberIt) {
        const value = typeof identifier === 'string' ? identifier.trim() : ''
        writeStorage('localStorage', IDENTIFIER_KEY, value)
    } else {
        writeStorage('localStorage', IDENTIFIER_KEY, '')
    }

    // 登录失败时这里拿不到 token，只记偏好、不动存储
    const token = readStorage('sessionStorage', REFRESH_KEY) || readStorage('localStorage', REFRESH_KEY)
    if (!token) return

    writeStorage('localStorage', REFRESH_KEY, rememberIt ? token : '')
}

/**
 * 从响应头里提取并保存 token。
 * 后端下发的头名是 Access-Token / Refresh-Token（见 server/src/utils/index.js 的 TOKEN_HEADERS）。
 * axios 会把响应头键名小写化，因此这里统一按小写读取。
 * @param {Record<string, string>} headers
 * @returns {{ accessToken?: string, refreshToken?: string }}
 */
export function setTokensFromHeaders(headers) {
    if (!headers) return {}

    const accessToken = headers['access-token']
    const refreshToken = headers['refresh-token']

    if (accessToken) setAccessToken(accessToken)
    if (refreshToken) setRefreshToken(refreshToken)

    return { accessToken, refreshToken }
}
