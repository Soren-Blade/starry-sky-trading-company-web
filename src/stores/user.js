import { defineStore } from 'pinia'
import { notify } from '@/hooks/useToast/index.js'
import {
    getAccessToken,
    getRefreshToken,
    clearTokens,
    applyRememberMe,
} from '@/hooks/useToken'
import { resolveAssetUrl } from '@/utils/assetUrl.js'
import api from '@/api/index'

/**
 * 用户状态
 *
 * 关键区分（原实现混为一谈）：
 * - 游客（user_type === 'guest'）也会拿到 token，但它不该被当作「已登录」，
 *   否则顶栏的登录入口会在首屏之后消失，用户再也无法登录。
 * - 只有 user_type === 'registered' 才算已登录。
 */

/**
 * 从登录凭据里取出「用户填的那个账号」。
 *
 * 登录支持用户名 / 邮箱 / 手机号三种方式，用户只填其中一个，
 * 而「记住我」要带出的正是他填的那一个（不是数据库里的用户名）。
 */
function identifierOf(credentials) {
    if (!credentials || typeof credentials !== 'object') return ''
    const raw = credentials.username ?? credentials.email ?? credentials.phone ?? ''
    return typeof raw === 'string' ? raw : ''
}
export const useUserStore = defineStore('user', {
    state: () => ({
        userInfo: {},
        /** 是否正在初始化（游客登录/拉取用户信息） */
        initializing: false,
        /** 是否已经尝试过初始化，避免重复请求 */
        initialized: false,
        /** 进行中的初始化 Promise：并发调用共享它，见 init() 的注释 */
        initPromise: null,
        /**
         * 登录/注册弹窗是否打开。
         *
         * 放在 store 而不是 Navbar 的局部 ref：触发登录的场景**不止顶栏一个** ——
         * 商品详情页的「立即购买」、购物车结算、工具收藏、路由守卫都要能拉起它。
         * 弹窗本体因此也移到 App.vue（全站唯一实例），与 ThemeSwitcher 的
         * `themeStore.panelOpen` 是同一套做法。
         */
        loginModalOpen: false,
    }),

    getters: {
        /** 是否已用账号登录 */
        isLoggedIn: (state) => state.userInfo?.user_type === 'registered',
        /** 是否为游客身份 */
        isGuest: (state) => state.userInfo?.user_type === 'guest',
        /** 当前用户 id（游客也有） */
        userId: (state) => state.userInfo?.id ?? null,
        nickname: (state) => state.userInfo?.nickname || '',
        /**
         * 头像地址（**可直接用于 `<img src>`**）。
         *
         * `userInfo.avatar_url` 里存的可能是外部 URL，也可能是后端自己托载的
         * 相对路径 `/uploads/avatars/...`。后者在生产环境必须补上 API 基地址，
         * 否则会打到 web 域名上 404。解析统一收在这个 getter 里，
         * 让所有消费方（顶栏、个人中心）拿到的都是可直接加载的地址。
         */
        avatarUrl: (state) => resolveAssetUrl(state.userInfo?.avatar_url || ''),
    },

    actions: {
        /**
         * 初始化身份：本地有 token 就复用，否则做一次游客登录。
         * 失败时不抛异常（首屏不应因为后端不可用而崩），只记录状态。
         *
         * 并发调用**共享同一个 Promise**（`initPromise`）。
         * 此前是 `if (this.initializing) return` —— 第二个调用者会立刻拿到
         * `undefined` 继续往下走：路由守卫据此认为身份已就绪，路由组件随即发出
         * 需要鉴权的请求（如 /toolApi/getTools），请求 401 → 刷新失败 → 触发
         * 「登录态失效」回调 → `router.replace({ name: 'Home' })`。
         * 表现就是**深链访问任何需要鉴权的页面都会静默变成首页**（实测 /tool）。
         *
         * Promise 存在 state 里是安全的：Vue 的 reactive 只代理普通对象/数组/集合，
         * `getTargetType(Promise)` 返回 INVALID，不会包一层 Proxy 破坏 then 的 brand check。
         */
        async init() {
            if (this.initPromise) return this.initPromise

            this.initializing = true

            const promise = (async () => {
                try {
                    const accessToken = getAccessToken()
                    const refreshToken = getRefreshToken()

                    if (accessToken && refreshToken) {
                        const ok = await this.getUserInfo()
                        if (ok) return
                        // token 失效：清理后走游客登录
                        clearTokens()
                    }

                    const result = await api.visitorLogin()
                    if (result?.success) {
                        await this.getUserInfo()
                    }
                } catch (error) {
                    // 静默失败：未登录/游客态下页面依然要能浏览
                    console.warn('用户初始化失败:', error.message)
                } finally {
                    this.initializing = false
                    this.initialized = true
                }
            })()

            this.initPromise = promise
            // 只缓存「进行中」的那一个：完成后清掉，之后的调用仍会重新走一遍
            promise.then(() => {
                if (this.initPromise === promise) this.initPromise = null
            })

            return promise
        },

        /**
         * 拉取当前用户信息
         * @returns {Promise<boolean>} 是否成功
         */
        async getUserInfo() {
            try {
                const result = await api.getUserInfo()
                if (result?.success && result.data) {
                    this.userInfo = result.data
                    return true
                }
                return false
            } catch (error) {
                console.warn('获取用户信息失败:', error.message)
                return false
            }
        },

        /**
         * 账号登录（用户名 / 邮箱 / 手机号）
         *
         * `rememberMe` 是**纯客户端的偏好**，不会发给服务端（下面解构掉了）：
         * 它决定 refresh token 放在 sessionStorage 还是同时持久化到 localStorage，
         * 也就是「关掉浏览器后是否仍是登录态」。
         *
         * @param {{login_type: 'username'|'email'|'phone', username?: string, email?: string,
         *          phone?: string, password: string, rememberMe?: boolean}} payload
         * @returns {Promise<{success: boolean, message: string}>}
         */
        async login(payload) {
            // 把客户端偏好摘出去，避免混进请求体（服务端会忽略未知字段，但不该发）
            const { rememberMe, ...credentials } = payload || {}

            try {
                const result = await api.login(credentials)
                if (result?.success) {
                    // **必须在 getUserInfo 之前**：token 由响应拦截器写入，
                    // 而 getUserInfo 一旦 401 就会触发一次静默续期；
                    // 那次续期会依据「localStorage 里有没有 refresh token」
                    // 决定把新 token 写到哪里 —— 顺序反了，「记住我」就丢了。
                    applyRememberMe(Boolean(rememberMe), identifierOf(credentials))

                    // 登录接口只下发 token，用户信息需要再拉一次
                    await this.getUserInfo()
                    return { success: true, message: result.message || '登录成功' }
                }
                return { success: false, message: result?.message || '登录失败' }
            } catch (error) {
                return { success: false, message: error.message || '登录失败，请稍后重试' }
            }
        },

        /**
         * 注册账号
         * @param {{username: string, email: string, password: string}} payload
         * @returns {Promise<{success: boolean, message: string}>}
         */
        async register(payload) {
            try {
                const result = await api.register(payload)
                if (result?.success) {
                    return { success: true, message: result.message || '注册成功' }
                }
                return { success: false, message: result?.message || '注册失败' }
            } catch (error) {
                return { success: false, message: error.message || '注册失败，请稍后重试' }
            }
        },

        /**
         * 退出登录 / 退出游客身份。
         *
         * 退出后进入**无身份**状态（顶栏显示「登录 / 注册」按钮），
         * 而不是立刻又建一个游客。
         *
         * 为什么不能再 `await this.init()`：init 会走 visitorLogin 立刻拿到一个新的
         * 游客身份，于是 `userInfo.id` 马上又有值 —— 用户点「退出」之后看到的还是
         * 一张头像（只是昵称变了），既没有退出反馈，也永远等不到登录按钮。
         *
         * 两点必须留意：
         *   1. `initialized` 保持 true。路由守卫的写法是
         *      `if (!initialized) await init()`，置回 false 会在下一次导航时
         *      重新 init 出游客，退出同样白做。
         *   2. `initPromise` 清空，让「退出后主动登录」这条路径能正常再初始化。
         *
         * 无身份状态下 JWT 保护的读接口会 401，此时 request 层**不会**触发
         * 「登录态失效」回调（它只在「本来持有会话」时才触发），
         * 因此不会出现跳转首页的意外。需要身份的页面各自给出登录引导。
         */
        async logout() {
            const wasGuest = this.isGuest

            clearTokens()
            this.userInfo = {}
            this.loginModalOpen = false
            this.initPromise = null
            // 关键：**不**置回 false，见上方说明
            this.initialized = true
            // 退出后没有身份，任何「进行中的初始化」都不该再往里写 userInfo
            this.initializing = false

            notify.success(wasGuest ? '已退出游客身份' : '已退出登录')
        },

        /**
         * 打开登录弹窗。
         * @param {string} [reason] 触发原因，会作为提示告知用户「为什么突然要登录」
         */
        openLoginModal(reason) {
            this.loginModalOpen = true
            if (reason) notify.info(reason)
        },

        closeLoginModal() {
            this.loginModalOpen = false
        },

        /**
         * 修改个人资料（昵称 / 头像 / 性别 / 生日）
         * @param {{nickname?: string, avatar_url?: string|null, gender?: string|null, birthday?: string|null}} patch
         * @returns {Promise<{success: boolean, message: string}>}
         */
        async updateProfile(patch) {
            try {
                const result = await api.updateProfile(patch)
                if (result?.success) {
                    // 接口回读的就是更新后的白名单字段，直接并入本地状态，
                    // 不必再发一次 getUserInfo
                    if (result.data) this.userInfo = { ...this.userInfo, ...result.data }
                    return { success: true, message: result.message || '资料已更新' }
                }
                return { success: false, message: result?.message || '资料更新失败' }
            } catch (error) {
                return { success: false, message: error.message || '资料更新失败，请稍后重试' }
            }
        },

        /**
         * 上传头像
         *
         * `image` 是前端在 canvas 上缩放后编码的 data URL（见 useAvatarUpload）。
         * 成功后服务端返回的 `avatar_url` 是**相对路径**，这里直接写回 userInfo；
         * 需要绝对地址时由 `avatarUrl` getter 解析。
         *
         * @param {string} image
         * @returns {Promise<{success: boolean, message: string, avatarUrl?: string}>}
         */
        async uploadAvatar(image) {
            try {
                const result = await api.uploadAvatar({ image })
                if (result?.success && result.data?.avatar_url) {
                    this.userInfo = { ...this.userInfo, avatar_url: result.data.avatar_url }
                    return {
                        success: true,
                        message: result.message || '头像已更新',
                        avatarUrl: result.data.avatar_url,
                    }
                }
                return { success: false, message: result?.message || '头像上传失败' }
            } catch (error) {
                return { success: false, message: error.message || '头像上传失败，请稍后重试' }
            }
        },
    },
})
