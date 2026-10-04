import { defineStore } from 'pinia'
import api from '@/api/index'
import { useUserStore } from '@/stores/user'

/**
 * 收藏（商品 / 工具）
 *
 * ## 为什么工具收藏有两套存储
 *
 * 改造前工具收藏**只有** localStorage（游客也能用），商品收藏则完全不存在。
 * 现在把登录用户的收藏统一放到服务端（跨设备一致、换浏览器不丢），
 * 但**保留游客态的 localStorage 兜底** —— 直接砍掉会让游客点星星时
 * 突然被要求登录，那是功能退化而不是完善。
 *
 * 于是：
 *   - 已登录：商品与工具都走 `/favoriteApi`，本地只缓存 id 列表用于渲染星标；
 *   - 游客：只有工具可用，写 localStorage（沿用改造前的 key，老数据不丢）；
 *           商品收藏返回 `{ needLogin: true }`，由调用方弹登录弹窗。
 *
 * localStorage 的 key 与改造前一致（`SSTC_TOOL_FAVORITES`），
 * 存的是 id 数组 —— 换成别的形状会让老用户的收藏凭空消失。
 */
const TOOL_FAVORITES_KEY = 'SSTC_TOOL_FAVORITES'

/** 读本地工具收藏（容错：隐私模式、脏数据都退回空数组） */
function readLocalToolIds() {
    try {
        const raw = localStorage.getItem(TOOL_FAVORITES_KEY)
        if (!raw) return []
        const parsed = JSON.parse(raw)
        if (!Array.isArray(parsed)) return []
        return parsed.map(Number).filter((n) => Number.isFinite(n))
    } catch {
        return []
    }
}

function writeLocalToolIds(ids) {
    try {
        localStorage.setItem(TOOL_FAVORITES_KEY, JSON.stringify(ids))
    } catch {
        /* 隐私模式下不可写，忽略：收藏仍在本会话内生效 */
    }
}

export const useFavoriteStore = defineStore('favorite', {
    state: () => ({
        /** 已收藏的商品 id */
        productIds: [],
        /** 已收藏的工具 id */
        toolIds: [],
        /** 收藏详情（我的收藏页用；服务端返回 target 已补齐） */
        productItems: [],
        toolItems: [],
        loading: false,
        error: null,
        /** 标记本地状态是否已从「正确的来源」加载过 */
        loadedForUserId: null,
    }),

    getters: {
        isProductFavorited: (state) => (id) => state.productIds.includes(Number(id)),
        isToolFavorited: (state) => (id) => state.toolIds.includes(Number(id)),
        productCount: (state) => state.productIds.length,
        toolCount: (state) => state.toolIds.length,
    },

    actions: {
        /** 是否需要走服务端（只有登录用户才有账号级收藏） */
        isServerBacked() {
            return useUserStore().isLoggedIn
        },

        reset() {
            this.productIds = []
            this.toolIds = []
            this.productItems = []
            this.toolItems = []
            this.error = null
            this.loadedForUserId = null
        },

        /**
         * 从正确的来源加载收藏。
         *
         * 用一个 `loadedForUserId` 记住「这份数据属于谁」：
         * 同一个用户重复进入页面时直接返回，切换账号时自动重载 ——
         * 否则会把上一个账号的收藏显示给新账号。
         */
        async load(force = false) {
            const userStore = useUserStore()
            const key = userStore.isLoggedIn ? `user:${userStore.userId}` : 'guest'

            if (!force && this.loadedForUserId === key) return { success: true }

            this.loading = true
            this.error = null

            try {
                if (!userStore.isLoggedIn) {
                    // 游客：只有工具收藏，来自 localStorage
                    this.productIds = []
                    this.productItems = []
                    this.toolIds = readLocalToolIds()
                    this.toolItems = []
                    this.loadedForUserId = key
                    return { success: true }
                }

                const [products, tools] = await Promise.all([
                    api.getFavorites({ target_type: 'product' }),
                    api.getFavorites({ target_type: 'tool' }),
                ])

                const productItems = products?.data?.items || []
                const toolItems = tools?.data?.items || []

                this.productItems = productItems
                this.toolItems = toolItems
                this.productIds = productItems.map((item) => Number(item.target_id))
                this.toolIds = toolItems.map((item) => Number(item.target_id))
                this.loadedForUserId = key
                return { success: true }
            } catch (error) {
                this.error = error?.message || '获取收藏失败'
                return { success: false, message: this.error }
            } finally {
                this.loading = false
            }
        },

        /**
         * 收藏 / 取消收藏
         * @param {'product'|'tool'} targetType
         * @param {number} targetId
         * @returns {Promise<{success: boolean, favorited?: boolean, needLogin?: boolean, message?: string}>}
         */
        async toggle(targetType, targetId) {
            const id = Number(targetId)
            if (!Number.isFinite(id)) return { success: false, message: '目标不合法' }

            if (targetType === 'product') return this.toggleProduct(id)
            if (targetType === 'tool') return this.toggleTool(id)
            return { success: false, message: '收藏类型不合法' }
        },

        async toggleProduct(id) {
            if (!this.isServerBacked()) {
                return { success: false, needLogin: true, message: '登录后即可收藏商品' }
            }

            const favorited = this.productIds.includes(id)
            try {
                const call = favorited ? api.removeFavorite : api.addFavorite
                const result = await call({ target_type: 'product', target_id: id })
                if (!result?.success) {
                    return { success: false, message: result?.message || '操作失败' }
                }

                if (favorited) {
                    this.productIds = this.productIds.filter((x) => x !== id)
                    this.productItems = this.productItems.filter((item) => Number(item.target_id) !== id)
                } else {
                    this.productIds = [...this.productIds, id]
                    // 详情由服务端在下次 load 时补齐；本地先放一个占位，
                    // 让「我的收藏」页在刚收藏完就有行可渲染
                    this.productItems = [
                        { target_type: 'product', target_id: id, target: null },
                        ...this.productItems,
                    ]
                }

                return { success: true, favorited: !favorited, message: favorited ? '已取消收藏' : '已收藏' }
            } catch (error) {
                return { success: false, message: error?.message || '操作失败' }
            }
        },

        async toggleTool(id) {
            if (!this.isServerBacked()) {
                // 游客：沿用 localStorage
                const favorited = this.toolIds.includes(id)
                this.toolIds = favorited
                    ? this.toolIds.filter((x) => x !== id)
                    : [...this.toolIds, id]
                writeLocalToolIds(this.toolIds)
                return { success: true, favorited: !favorited, message: favorited ? '已取消收藏' : '已收藏' }
            }

            const favorited = this.toolIds.includes(id)
            try {
                const call = favorited ? api.removeFavorite : api.addFavorite
                const result = await call({ target_type: 'tool', target_id: id })
                if (!result?.success) {
                    return { success: false, message: result?.message || '操作失败' }
                }

                if (favorited) {
                    this.toolIds = this.toolIds.filter((x) => x !== id)
                    this.toolItems = this.toolItems.filter((item) => Number(item.target_id) !== id)
                } else {
                    this.toolIds = [...this.toolIds, id]
                    this.toolItems = [
                        { target_type: 'tool', target_id: id, target: null },
                        ...this.toolItems,
                    ]
                }

                return { success: true, favorited: !favorited, message: favorited ? '已取消收藏' : '已收藏' }
            } catch (error) {
                return { success: false, message: error?.message || '操作失败' }
            }
        },
    },
})
