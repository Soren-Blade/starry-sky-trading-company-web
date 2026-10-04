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
        /**
         * 商品搜索关键词（导航栏搜索栏写入）。
         *
         * 放在数据层而不是组件里：搜索栏与商品网格分处两个组件，
         * 关键词若留在组件内就需要事件层层透传；更重要的是「什么算匹配」
         * 属于数据规则，只能有一处定义（见 getters.filteredProducts）。
         */
        searchKeyword: '',
    }),

    getters: {
        /**
         * 按关键词过滤后的商品列表。
         * 不区分大小写，命中标题/副标题/作者/卖家/分类任一字段即可。
         */
        filteredProducts: (state) => {
            const keyword = String(state.searchKeyword || '').trim().toLowerCase()
            if (!keyword) return state.shopInfo

            return state.shopInfo.filter((product) => {
                if (!product || typeof product !== 'object') return false
                const fields = [
                    product.main_title,
                    product.sub_title,
                    product.name,
                    product.product_name,
                    product.author,
                    product.seller,
                    product.category_name,
                    product.class_name,
                ]
                return fields.some(
                    (field) => field != null && String(field).toLowerCase().includes(keyword)
                )
            })
        },
    },

    actions: {
        /** 写入搜索关键词（空串表示不过滤） */
        setSearchKeyword(keyword) {
            this.searchKeyword = typeof keyword === 'string' ? keyword : ''
        },

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
                // limit 取服务端上限（100）：搜索与展示都在客户端做
                // （见 getters.filteredProducts），只拉 20 条会让「搜不到」
                // 与「没加载到」混为一谈。超过 100 件商品时首页只展示前 100 条，
                // 需要完整目录请走分类详情页 —— 那里按 category_id 过滤。
                const params = { in_stock: 'all', limit: 100, ...extraParams }
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
