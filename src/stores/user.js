import { defineStore } from 'pinia'
import { notify } from '@/hooks/useToast/index.js'
import {
    getAccessToken,
    getRefreshToken,
    clearTokens,
} from '@/hooks/useToken'
import api from '@/api/index'

/**
 * 用户状态
 *
 * 关键区分（原实现混为一谈）：
 * - 游客（user_type === 'guest'）也会拿到 token，但它不该被当作「已登录」，
 *   否则顶栏的登录入口会在首屏之后消失，用户再也无法登录。
 * - 只有 user_type === 'registered' 才算已登录。
 */
export const useUserStore = defineStore('user', {
    state: () => ({
        userInfo: {},
        /** 是否正在初始化（游客登录/拉取用户信息） */
        initializing: false,
        /** 是否已经尝试过初始化，避免重复请求 */
        initialized: false,
        /** 进行中的初始化 Promise：并发调用共享它，见 init() 的注释 */
        initPromise: null,
    }),

    getters: {
        /** 是否已用账号登录 */
        isLoggedIn: (state) => state.userInfo?.user_type === 'registered',
        /** 是否为游客身份 */
        isGuest: (state) => state.userInfo?.user_type === 'guest',
        /** 当前用户 id（游客也有） */
        userId: (state) => state.userInfo?.id ?? null,
        nickname: (state) => state.userInfo?.nickname || '',
        avatarUrl: (state) => state.userInfo?.avatar_url || '',
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
         * @param {{login_type: 'username'|'email'|'phone', username?: string, email?: string, phone?: string, password: string}} payload
         * @returns {Promise<{success: boolean, message: string}>}
         */
        async login(payload) {
            try {
                const result = await api.login(payload)
                if (result?.success) {
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

        /** 退出登录：清理凭据与状态，并回到游客身份 */
        async logout() {
            clearTokens()
            this.userInfo = {}
            this.initialized = false
            notify.success('已退出登录')
            // 退出后重新以游客身份初始化，保证卡密等需登录功能给出正确提示
            await this.init()
        },
    },
})
