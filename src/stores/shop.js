import { defineStore } from 'pinia'
import api from '@/api/index'

/**
 * 商品与分类
 *
 * 原实现有两个致命问题，这里一并修正：
 * 1. state 里用 reactive({}) 承接服务端的**数组**，Object.assign 后数组变成
 *    {0:..,1:..} 形式的下标对象，length 丢失（空状态判断失效、v-for 语义错乱）。
 *    → 现在直接用数组。
 * 2. init() 从未被调用（App.vue 里是注释）。
 *    → 现在由 App.vue / 各页面显式调用，并暴露 loading/error。
 */
export const useShopStore = defineStore('shop', {
    state: () => ({
        /** 分类树（后端 tree=true 返回数组） */
        shopClass: [],
        /** 商品列表 */
        shopInfo: [],
        pagination: {
            page: 1,
            limit: 20,
            total: 0,
            total_pages: 0,
            has_next: false,
            has_prev: false,
        },
        loading: false,
        error: null,
    }),

    actions: {
        /** 获取分类（树形） */
        async getCategories() {
            try {
                const result = await api.getCategories({ tree: true })
                if (result?.success) {
                    this.shopClass = Array.isArray(result.data) ? result.data : []
                    return true
                }
                throw new Error(result?.message || '获取分类失败')
            } catch (error) {
                this.error = error.message
                console.warn('获取分类失败:', error.message)
                return false
            }
        },

        /**
         * 获取商品
         * @param {Record<string, unknown>} [extraParams] 追加的查询参数（分页/筛选）
         */
        async getProducts(extraParams = {}) {
            try {
                const params = { in_stock: 'all', ...extraParams }
                const result = await api.getProducts(params)
                if (result?.success) {
                    this.shopInfo = result.data?.products ?? []
                    if (result.data?.pagination) {
                        this.pagination = result.data.pagination
                    }
                    return true
                }
                throw new Error(result?.message || '获取商品失败')
            } catch (error) {
                this.error = error.message
                console.warn('获取商品失败:', error.message)
                this.shopInfo = []
                return false
            }
        },

        /** 并行初始化分类与商品 */
        async init() {
            this.loading = true
            this.error = null
            try {
                await Promise.all([this.getCategories(), this.getProducts()])
            } finally {
                this.loading = false
            }
        },
    },
})
