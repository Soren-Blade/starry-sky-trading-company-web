import { defineStore } from 'pinia'
import api from '@/api/index'

/**
 * 购物车
 *
 * 三条刻意的约定：
 *
 * 1. **不做本地乐观更新**。每个写接口都返回整份购物车，store 直接把响应覆盖到
 *    state。数量、小计、合计、"能不能下单" 全部由后端算好 ——
 *    前端再算一遍就等于有两套金额逻辑，迟早对不上。
 *
 * 2. **需要登录账号**。游客请求会拿到 403 `REGISTERED_ACCOUNT_REQUIRED`，
 *    action 把它翻译成 `{ needLogin: true }` 交给调用方弹登录弹窗，
 *    而不是把 403 当普通错误弹一个 "操作失败"。
 *
 * 3. **action 不抛异常**，统一返回 `{ success, message, needLogin }`。
 *    购物车是页面上的次要动作，失败不该中断渲染。
 */
export const useCartStore = defineStore('cart', {
    state: () => ({
        /** 购物车行（每行含商品快照与 available 判断） */
        items: [],
        /** 全部行的件数之和（含不可下单的行 —— 用户要知道车里总共有几件） */
        totalQuantity: 0,
        /** 只统计可下单行的金额，与结算金额一致 */
        totalAmount: 0,
        availableCount: 0,
        unavailableCount: 0,
        loading: false,
        error: null,
        /** 是否已成功加载过一次（用于避免每次进页面都闪 loading） */
        loaded: false,
    }),

    getters: {
        /** 顶栏角标用的件数 */
        count: (state) => state.totalQuantity,
        isEmpty: (state) => state.items.length === 0,
        /** 可下单的行 —— 结算只提交这些 */
        availableItems: (state) => state.items.filter((item) => item.available),
        hasUnavailable: (state) => state.unavailableCount > 0,
        /** 是否有勾选之外的商品价格发生变化（详情页会提示） */
        changedItems: (state) => state.items.filter((item) => item.price_changed),
    },

    actions: {
        /** 把接口返回的 data 覆盖到 state */
        applyPayload(data) {
            if (!data) return
            this.items = Array.isArray(data.items) ? data.items : []
            this.totalQuantity = data.total_quantity ?? 0
            this.totalAmount = data.total_amount ?? 0
            this.availableCount = data.available_count ?? 0
            this.unavailableCount = data.unavailable_count ?? 0
        },

        /** 清空本地状态（退出登录/切换账号时调用） */
        reset() {
            this.items = []
            this.totalQuantity = 0
            this.totalAmount = 0
            this.availableCount = 0
            this.unavailableCount = 0
            this.error = null
            this.loaded = false
        },

        /** 把异常翻译成统一的返回结构 */
        toResult(error) {
            const needLogin =
                error?.status === 403 && error?.code === 'REGISTERED_ACCOUNT_REQUIRED'
            if (!needLogin) this.error = error?.message || '操作失败'
            return {
                success: false,
                needLogin,
                message: needLogin ? '请先登录账号后再使用购物车' : error?.message || '操作失败',
            }
        },

        /**
         * 拉取购物车
         * @param {{silent?: boolean}} [options] silent 时不显示 loading（首屏角标刷新用）
         */
        async fetch(options = {}) {
            if (!options.silent) this.loading = true
            this.error = null
            try {
                const result = await api.getCart()
                if (result?.success) {
                    this.applyPayload(result.data)
                    this.loaded = true
                    return { success: true, message: result.message }
                }
                this.error = result?.message || '获取购物车失败'
                return { success: false, message: this.error }
            } catch (error) {
                const result = this.toResult(error)
                // 未登录不是错误状态：把车清空，角标归零即可
                if (result.needLogin) {
                    this.items = []
                    this.totalQuantity = 0
                    this.totalAmount = 0
                }
                return result
            } finally {
                this.loading = false
            }
        },

        /**
         * 加入购物车
         * @param {number} productId
         * @param {number} [quantity]
         */
        async add(productId, quantity = 1) {
            try {
                const result = await api.addItem({ product_id: productId, quantity })
                if (result?.success) {
                    this.applyPayload(result.data)
                    this.loaded = true
                    return { success: true, message: result.message || '已加入购物车' }
                }
                return { success: false, message: result?.message || '加入购物车失败' }
            } catch (error) {
                if (error?.status === 404) return { success: false, message: error.message }
                return this.toResult(error)
            }
        },

        /**
         * 修改数量（传 0 等价于移除该行）
         * @param {number} itemId
         * @param {number} quantity
         */
        async updateQuantity(itemId, quantity) {
            try {
                const result = await api.updateItem({ id: itemId, quantity })
                if (result?.success) {
                    this.applyPayload(result.data)
                    return { success: true, message: result.message || '购物车已更新' }
                }
                return { success: false, message: result?.message || '更新失败' }
            } catch (error) {
                return this.toResult(error)
            }
        },

        /** 移除一行 */
        async remove(itemId) {
            try {
                const result = await api.removeItem(itemId)
                if (result?.success) {
                    this.applyPayload(result.data)
                    return { success: true, message: result.message || '已移除' }
                }
                return { success: false, message: result?.message || '移除失败' }
            } catch (error) {
                return this.toResult(error)
            }
        },

        /** 清空购物车 */
        async clear() {
            try {
                const result = await api.clearCart()
                if (result?.success) {
                    this.applyPayload(result.data)
                    return { success: true, message: result.message || '购物车已清空' }
                }
                return { success: false, message: result?.message || '清空失败' }
            } catch (error) {
                return this.toResult(error)
            }
        },
    },
})
