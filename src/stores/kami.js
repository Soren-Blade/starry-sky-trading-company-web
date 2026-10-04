import { defineStore } from 'pinia'
import api from '@/api/index'

const DEFAULT_PAGINATION = {
    page: 1,
    limit: 20,
    total: 0,
    total_pages: 0,
    has_next: false,
    has_prev: false,
}

/**
 * 卡密列表
 *
 * 原实现的问题：
 * - fetchUserKamis 从未被调用，逻辑被复制到 KamiSection 里，组件还直接改 store 状态。
 * - 切换用户时 pagination 不会重置，会串到上一个用户的数据。
 * 现在统一走 store action，并在用户变化时重置。
 */
export const useKamiStore = defineStore('kami', {
    state: () => ({
        /** 当前列表归属的用户 id，用于检测用户切换 */
        ownerUserId: null,
        userKamis: [],
        pagination: { ...DEFAULT_PAGINATION },
        filters: {
            status: 'all',
            card_type: 'all',
            tool_id: null,
        },
        loading: false,
        error: null,
    }),

    actions: {
        /** 更新筛选条件（不自动请求，由调用方决定何时刷新） */
        setFilter(key, value) {
            if (key in this.filters) {
                this.filters[key] = value
            }
        },

        /**
         * 获取指定用户的卡密列表
         * @param {string|number} userId
         * @param {{page?: number, limit?: number, status?: string, card_type?: string, tool_id?: number}} [opts]
         * @returns {Promise<boolean>}
         */
        async fetchUserKamis(userId, opts = {}) {
            if (!userId) {
                this.error = '缺少用户信息'
                // 这条路径不发请求，因此不在 try/finally 覆盖范围内；
                // 必须显式复位，否则上一次请求留在 true 的 loading 会一直卡住加载指示器。
                this.loading = false
                return false
            }

            // 用户切换时先清空，避免展示上一个用户的数据
            if (this.ownerUserId !== null && String(this.ownerUserId) !== String(userId)) {
                this.userKamis = []
                this.pagination = { ...DEFAULT_PAGINATION }
            }
            this.ownerUserId = userId

            this.loading = true
            this.error = null
            try {
                const params = {
                    page: opts.page ?? this.pagination.page ?? 1,
                    limit: opts.limit ?? this.pagination.limit ?? 20,
                }
                // 只传递有意义的筛选值，'all'/null 表示不过滤
                const status = opts.status ?? this.filters.status
                if (status && status !== 'all') params.status = status
                const cardType = opts.card_type ?? this.filters.card_type
                if (cardType && cardType !== 'all') params.card_type = cardType
                const toolId = opts.tool_id ?? this.filters.tool_id
                if (toolId) params.tool_id = toolId

                const { success, data, message } = await api.getUserCards(userId, params)
                if (!success) {
                    throw new Error(message || '获取卡密列表失败')
                }

                this.userKamis = data?.cards ?? []
                if (data?.pagination) {
                    this.pagination = { ...DEFAULT_PAGINATION, ...data.pagination }
                }
                return true
            } catch (error) {
                this.error = error.message
                this.userKamis = []
                console.warn(`获取用户 ${userId} 的卡密列表失败:`, error.message)
                return false
            } finally {
                this.loading = false
            }
        },

        /** 重置列表状态（退出登录时调用） */
        reset() {
            this.ownerUserId = null
            this.userKamis = []
            this.pagination = { ...DEFAULT_PAGINATION }
            this.error = null
        },
    },
})
