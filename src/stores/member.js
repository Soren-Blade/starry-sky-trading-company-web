import { defineStore } from 'pinia'

import { getOverview, getPlans, getGrowthHistory } from '@/api/ask/member.js'

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
    /** 等级对照表（`levels`），套餐页的「等级对照」用 */
    levels: null,
    /** 接口里的说明文案（结算方式/退款口径），由服务端下发，前端不自己编 */
    paymentNotice: '',
    refundNotice: '',

    /** 成长值明细（`/growth` 页） */
    growth: [],
    growthSummary: null,
    growthRules: [],
    growthPage: 1,
    growthLimit: 20,
    growthTotal: 0,
    growthTotalPages: 1,

    loadingOverview: false,
    loadingPlans: false,
    loadingGrowth: false,
    /** 错误信息；与「空数据」分开：出错不该显示成「暂无」 */
    error: '',
  }),

  getters: {
    isMember: (state) => Boolean(state.overview?.is_member),
    level: (state) => state.overview?.level || 'none',
    levelName: (state) => state.overview?.level_name || '',
    points: (state) => state.overview?.points,
    /** 八项权益的解锁状态与数值（后端给 key + unlocked + required_level，已解锁的另带 value） */
    benefits: (state) => state.overview?.benefits || [],
    todos: (state) => state.overview?.todos || [],
    /** 会员即将到期（阈值与 hero 文案同为 60 天，由服务端算好并放进 todos） */
    hasExpiringTodo: (state) =>
      (state.overview?.todos || []).some((t) => t.type === 'member_expiring'),
    /**
     * 等级对照表是否已经拿到（`getPlans` 的 `levels[]`）。
     *
     * 页面用 `if (!memberStore.hasLevels) fetchPlans()` 代替
     * `if (!memberStore.levels.length)`：`levels` 的初值是 `null`（不是 `[]`），
     * 在 `onMounted` 里直接取 `.length` 会在全新会话首屏抛
     * `TypeError: Cannot read properties of null`，把整个挂载钩子打断，
     * 后面的请求与副作用都不会执行。这类错误 lint / build / SSR 都看不见，
     * 所以把「有没有」收进 getter，页面不再自己判 `null`。
     */
    hasLevels: (state) => Array.isArray(state.levels) && state.levels.length > 0,
    /** 成长值累计（成长值页汇总卡用；缺数据时给 0） */
    growthTotalValue: (state) => Number(state.growthSummary?.growth ?? 0),
    growthHasPrev: (state) => state.growthPage > 1,
    growthHasNext: (state) => state.growthPage < state.growthTotalPages,
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
        // `levels` 与 `plans` 同一次响应下发（见 `sstc.get_member_plans`），
        // 之前只存了 plans，套餐页的「等级对照」就没有数据源
        this.levels = data.levels || []
        this.paymentNotice = data.payment_notice || ''
        this.refundNotice = data.refund_notice || ''
        return data
      } catch (error) {
        this.error = error?.message || '获取套餐失败'
        this.plans = null
        this.levels = null
        return null
      } finally {
        this.loadingPlans = false
      }
    },

    /**
     * 成长值明细。分页与汇总来自同一份响应 —— 服务端把「当前成长值档 / 下一档 /
     * 八档门槛 / 来源说明」都放在 `summary` 与 `rules` 里，页面不再自己算。
     *
     * 翻页时**不**清空旧列表：等新数据覆盖，避免出现一瞬「暂无记录」。
     */
    async fetchGrowthHistory({ page } = {}) {
      if (page) this.growthPage = page
      this.loadingGrowth = true
      this.error = ''
      try {
        const { data } = await getGrowthHistory({
          page: this.growthPage,
          limit: this.growthLimit,
        })
        this.growth = data.list || []
        this.growthSummary = data.summary || null
        this.growthRules = data.rules || []
        this.growthTotal = data.pagination?.total ?? 0
        this.growthTotalPages = data.pagination?.total_pages ?? 1
        return data
      } catch (error) {
        this.error = error?.response?.status === 401 ? '' : (error?.message || '获取成长值明细失败')
        this.growth = []
        this.growthSummary = null
        this.growthRules = []
        this.growthTotal = 0
        this.growthTotalPages = 1
        return null
      } finally {
        this.loadingGrowth = false
      }
    },

    /** 切换账号时必须清空：否则会短暂显示上一个用户的等级与权益 */
    reset() {
      this.overview = null
      this.plans = null
      this.levels = null
      this.paymentNotice = ''
      this.refundNotice = ''
      this.growth = []
      this.growthSummary = null
      this.growthRules = []
      this.growthPage = 1
      this.growthTotal = 0
      this.growthTotalPages = 1
      this.error = ''
      this.loadingOverview = false
      this.loadingPlans = false
      this.loadingGrowth = false
    },
  },
})
