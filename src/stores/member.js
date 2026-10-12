import { defineStore } from 'pinia'

import { getOverview, getPlans } from '@/api/ask/member.js'

/**
 * 会员状态（阶段 P0）
 *
 * ## 两条纪律
 *
 * 1. **不做本地乐观更新**：开通会员走订单链路（下单 → 客服确认），
 *    状态只会由服务端改变，因此这里只读不猜。
 * 2. **「不适用」以「键不存在」表达**：非会员的 `points` / `coupons` /
 *    `days_left` 在响应里**没有**这些键。因此判断「有没有」要用
 *    `hasOwnProperty` 或 `?? undefined`，**不能用 `=== 0`** ——
 *    0 分对会员是真实状态，对非会员才是「不适用」。
 */
export const useMemberStore = defineStore('member', {
  state: () => ({
    /** 会员中心总览，null = 还没取过 */
    overview: null,
    /** 套餐与等级对照 */
    plans: null,
    /** 接口里的说明文案（结算方式/退款口径），由服务端下发，前端不自己编 */
    paymentNotice: '',
    refundNotice: '',

    loadingOverview: false,
    loadingPlans: false,
    /** 错误信息；与「空数据」分开：出错不该显示成「暂无」 */
    error: '',
  }),

  getters: {
    isMember: (state) => Boolean(state.overview?.is_member),
    level: (state) => state.overview?.level || 'none',
    levelName: (state) => state.overview?.level_name || '',
    points: (state) => state.overview?.points,
    /** 六项权益的解锁状态（后端只给 key + unlocked + required_level） */
    benefits: (state) => state.overview?.benefits || [],
    todos: (state) => state.overview?.todos || [],
    /** 会员即将到期（阈值与 hero 文案同为 60 天，由服务端算好并放进 todos） */
    hasExpiringTodo: (state) =>
      (state.overview?.todos || []).some((t) => t.type === 'member_expiring'),
  },

  actions: {
    async fetchOverview({ silent = false } = {}) {
      this.loadingOverview = true
      if (!silent) this.error = ''
      try {
        const { data } = await getOverview()
        this.overview = data
        return data
      } catch (error) {
        // 未登录（401）不算错误：页面显示登录引导，而不是一片红
        this.error = error?.response?.status === 401 ? '' : (error?.message || '获取会员信息失败')
        this.overview = null
        return null
      } finally {
        this.loadingOverview = false
      }
    },

    async fetchPlans({ silent = false } = {}) {
      this.loadingPlans = true
      if (!silent) this.error = ''
      try {
        const { data } = await getPlans()
        this.plans = data.plans || []
        this.paymentNotice = data.payment_notice || ''
        this.refundNotice = data.refund_notice || ''
        return data
      } catch (error) {
        this.error = error?.message || '获取套餐失败'
        this.plans = null
        return null
      } finally {
        this.loadingPlans = false
      }
    },

    /** 切换账号时必须清空：否则会短暂显示上一个用户的等级与权益 */
    reset() {
      this.overview = null
      this.plans = null
      this.paymentNotice = ''
      this.refundNotice = ''
      this.error = ''
      this.loadingOverview = false
      this.loadingPlans = false
    },
  },
})
