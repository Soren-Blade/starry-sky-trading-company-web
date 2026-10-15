import { defineStore } from 'pinia'

import {
  getAccount,
  getHistory,
  checkin,
  getCheckinCalendar,
  getMallItems,
  redeem,
  replenishCheckin,
} from '@/api/ask/points.js'

/**
 * 积分状态（阶段 P0）
 *
 * ## 纪律
 *
 * 1. **签到后不做本地 +10**：服务端返回整份账户快照（`points` 是签到后的余额），
 *    以它为准。本地加减会在「已签到」分支上与真实值分叉。
 * 2. **`expire_soon` 缺失表示「没有将过期的批次」**，不是 0。展示时用
 *    `account.expire_soon` 的真值判断，不要 `points > 0`。
 * 3. 分页在切换账号时重置（沿用项目其它 store 的做法）。
 * 4. **商城库存一律用服务端返回的值**（`stock: null` = 不限量、`0` = 已兑完）：
 *    兑换成功后用响应里的 `item` 覆盖该行，不本地 -1 —— 券是「别人也在抢」的库存，
 *    本地递减会与真实值分叉。
 */
export const usePointsStore = defineStore('points', {
  state: () => ({
    account: null,
    calendar: null,

    history: [],
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 1,
    historyType: 'all',
    summary: { earned: 0, spent: 0 },

    // 积分商城（1.5.0 M3）：清单来自服务端常量，stock 是实时值
    mallItems: [],
    mallLoaded: false,
    redeemingId: '',

    loadingAccount: false,
    loadingHistory: false,
    checkingIn: false,
    loadingMall: false,
    /** 正在补签的日期（空串 = 没有进行中的补签），用于禁用单元格 */
    replenishingDate: '',
    error: '',
  }),

  getters: {
    points: (state) => Number(state.account?.points ?? 0),
    pointsValue: (state) => Number(state.account?.points_value ?? 0),
    multiplier: (state) => Number(state.account?.multiplier ?? 1),
    isMember: (state) => Boolean(state.account?.is_member),
    /** 有批次将过期时才有值（键可能不存在） */
    expireSoon: (state) => state.account?.expire_soon || null,
    todayChecked: (state) => Boolean(state.calendar?.today_checked),
    streak: (state) => Number(state.calendar?.streak ?? 0),
    hasPrev: (state) => state.page > 1,
    hasNext: (state) => state.page < state.totalPages,
    /** 首屏直接 `.length` 会抛 TypeError，用 getter 收口 */
    hasMallItems: (state) => state.mallItems.length > 0,
  },

  actions: {
    async fetchAccount({ silent = false } = {}) {
      this.loadingAccount = true
      if (!silent) this.error = ''
      try {
        const { data } = await getAccount()
        this.account = data
        return data
      } catch (error) {
        this.error = error?.response?.status === 401 ? '' : (error?.message || '获取积分失败')
        this.account = null
        return null
      } finally {
        this.loadingAccount = false
      }
    },

    async fetchHistory({ page } = {}) {
      if (page) this.page = page
      this.loadingHistory = true
      this.error = ''
      try {
        const { data } = await getHistory({
          page: this.page,
          limit: this.limit,
          type: this.historyType === 'all' ? undefined : this.historyType,
        })
        // 服务端把「上一页有数据但下一页没有」的情况处理成空数组，这里直接覆盖
        this.history = data.list || []
        this.total = data.pagination?.total ?? 0
        this.totalPages = data.pagination?.total_pages ?? 1
        this.summary = data.summary || { earned: 0, spent: 0 }
        return data
      } catch (error) {
        this.error = error?.message || '获取积分明细失败'
        this.history = []
        this.total = 0
        this.totalPages = 1
        return null
      } finally {
        this.loadingHistory = false
      }
    },

    /** 改筛选条件必须把页码拉回第 1 页，否则会停在一个不存在的页上 */
    setHistoryType(type) {
      this.historyType = type
      this.page = 1
    },

    async fetchCalendar({ month } = {}) {
      try {
        const { data } = await getCheckinCalendar(month ? { month } : undefined)
        this.calendar = data
        return data
      } catch (error) {
        this.error = error?.message || '获取签到日历失败'
        this.calendar = null
        return null
      }
    },

    /**
     * 用服务端返回的快照更新余额。签到、商城兑换、任务领奖三处共用 ——
     * 三个接口都回整份 `points` / `points_value`，各自写一遍迟早漂移。
     */
    applyBalance(source) {
      if (!this.account || !source) return
      this.account = {
        ...this.account,
        points: source.points,
        points_value: source.points_value,
      }
    },

    /**
     * 签到。`already=true` 不是错误（服务端也是 200），因此照常更新余额与日历。
     */
    async doCheckin() {
      if (this.checkingIn) return null
      this.checkingIn = true
      try {
        const { data } = await checkin()
        // 用服务端返回的整份快照，不本地加
        this.applyBalance(data)
        if (this.calendar) {
          this.calendar = {
            ...this.calendar,
            today_checked: true,
            streak: data.streak,
            month_count: (this.calendar.month_count || 0) + (data.already ? 0 : 1),
          }
        }
        return data
      } finally {
        this.checkingIn = false
      }
    },

    /**
     * 补签某一天（1.5.0 M4）。
     *
     * 与签到相反的地方：**必须传日期**。成功后有副作用要跟着刷新 ——
     * 补签会重算整条连续天数（可能连带改动后面已签到那些天的 `streak`），
     * 因此日历**必须重新拉一次**，不能在本地改一个格子。
     *
     * 失败时把错误抛给调用方：四种失败码各有各的说法（超出月度上限 / 这天已签 /
     * 跨月或未来 / 积分不够），store 不该把它们糊成一句。
     */
    async doReplenish(date) {
      const target = String(date || '').trim()
      if (!target || this.replenishingDate) return null
      this.replenishingDate = target
      try {
        const { data } = await replenishCheckin(target)
        this.applyBalance(data)
        await this.fetchCalendar()
        return data
      } finally {
        this.replenishingDate = ''
      }
    },

    /** 商城清单（未登录/游客在路由层就被挡住，这里只处理接口错误） */
    async fetchMall({ silent = false } = {}) {
      this.loadingMall = true
      if (!silent) this.error = ''
      try {
        const { data } = await getMallItems()
        this.mallItems = data?.items || []
        this.mallLoaded = true
        return data
      } catch (error) {
        this.error = error?.response?.status === 401 ? '' : (error?.message || '获取商城清单失败')
        return null
      } finally {
        this.loadingMall = false
      }
    },

    /**
     * 兑换。**余额与库存都用服务端返回值**：响应里的 `points` 是兑换后的余额，
     * `item.stock` 是兑换后的实时库存。
     *
     * 失败时把错误抛给调用方：四种失败码（`MEMBER_ONLY` / `OUT_OF_STOCK` /
     * `POINTS_NOT_ENOUGH` / `ITEM_NOT_FOUND`）各有各的提示语，store 不该把它们糊成一句。
     */
    async redeemItem(itemId) {
      if (this.redeemingId) return null
      this.redeemingId = itemId
      try {
        const { data } = await redeem(itemId)
        this.applyBalance(data)
        if (data?.item) {
          const index = this.mallItems.findIndex((row) => row.item_id === data.item.item_id)
          if (index >= 0) this.mallItems.splice(index, 1, data.item)
        }
        return data
      } finally {
        this.redeemingId = ''
      }
    },

    reset() {
      this.account = null
      this.calendar = null
      this.history = []
      this.page = 1
      this.total = 0
      this.totalPages = 1
      this.historyType = 'all'
      this.summary = { earned: 0, spent: 0 }
      this.mallItems = []
      this.mallLoaded = false
      this.redeemingId = ''
      this.replenishingDate = ''
      this.error = ''
      this.loadingAccount = false
      this.loadingHistory = false
      this.loadingMall = false
    },
  },
})
