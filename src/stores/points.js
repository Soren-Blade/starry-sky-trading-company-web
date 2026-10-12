import { defineStore } from 'pinia'

import { getAccount, getHistory, checkin, getCheckinCalendar } from '@/api/ask/points.js'

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

    loadingAccount: false,
    loadingHistory: false,
    checkingIn: false,
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
     * 签到。`already=true` 不是错误（服务端也是 200），因此照常更新余额与日历。
     */
    async doCheckin() {
      if (this.checkingIn) return null
      this.checkingIn = true
      try {
        const { data } = await checkin()
        // 用服务端返回的整份快照，不本地加
        if (this.account) {
          this.account = {
            ...this.account,
            points: data.points,
            points_value: data.points_value,
          }
        }
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

    reset() {
      this.account = null
      this.calendar = null
      this.history = []
      this.page = 1
      this.total = 0
      this.totalPages = 1
      this.historyType = 'all'
      this.summary = { earned: 0, spent: 0 }
      this.error = ''
      this.loadingAccount = false
      this.loadingHistory = false
    },
  },
})
