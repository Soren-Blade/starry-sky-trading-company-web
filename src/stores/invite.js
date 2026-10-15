import { defineStore } from 'pinia'

import { getSummary, getRecords } from '@/api/ask/invite.js'

/**
 * 邀请中心状态（1.6.0）
 *
 * ## 纪律
 *
 * 1. **邀请码与邀请链接一律用服务端返回值**：码由 `uuid` 现算（库里没有这一列），
 *    链接由服务端按 `MAIL_LINK_BASE_URL` 拼（没配基址时是相对路径 `/?invite=CODE`）。
 *    前端拼域名一定会与「邮件里的链接」分叉。
 * 2. **`invitee_label` 已脱敏**：页面直接展示，不要再拼接或暗示对方身份。
 * 3. **奖励与进度都读服务端**：数值（邀请人 500 / 被邀请人 200 / 满 3 人 +500）
 *    定义在库内常量函数里，前端 `|| 0` 兜底只用于占位，不能拿它算「还差多少分」。
 * 4. 失败时**保留旧数据**（与 task / mall 一致）：网络抖动不该把已经渲染出来的
 *    邀请码与记录清空。
 */
export const useInviteStore = defineStore('invite', {
  state: () => ({
    summary: null,
    records: [],
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1,

    loadingSummary: false,
    loadingRecords: false,
    error: '',
  }),

  getters: {
    /** 首屏直接读 `summary.invite_code` 会抛 TypeError，用 getter 收口 */
    hasSummary: (state) => Boolean(state.summary && state.summary.invite_code),
    inviteCode: (state) => state.summary?.invite_code || '',
    inviteLink: (state) => state.summary?.invite_link || '',
    counts: (state) => state.summary?.counts || null,
    reward: (state) => state.summary?.reward || null,
    progress: (state) => state.summary?.progress || null,
    ranking: (state) => state.summary?.ranking || [],
    progressPercent: (state) => {
      const current = Number(state.summary?.progress?.current ?? 0)
      const target = Number(state.summary?.progress?.target ?? 0)
      if (!target || target <= 0) return 0
      return Math.min(100, Math.max(0, Math.round((current / target) * 100)))
    },
    hasRecords: (state) => state.records.length > 0,
    hasPrev: (state) => state.page > 1,
    hasNext: (state) => state.page < state.totalPages,
  },

  actions: {
    async fetchSummary({ silent = false } = {}) {
      this.loadingSummary = true
      if (!silent) this.error = ''
      try {
        const { data } = await getSummary()
        this.summary = data
        return data
      } catch (error) {
        // 401 是「没登录」，不该在页面上留一条红色错误
        this.error = error?.response?.status === 401 ? '' : error?.message || '获取邀请概况失败'
        return null
      } finally {
        this.loadingSummary = false
      }
    },

    async fetchRecords({ page } = {}) {
      if (page) this.page = page
      this.loadingRecords = true
      try {
        const { data } = await getRecords({ page: this.page, limit: this.limit })
        this.records = data?.list || []
        this.total = data?.pagination?.total ?? 0
        this.totalPages = data?.pagination?.total_pages ?? 1
        return data
      } catch (error) {
        this.error = error?.response?.status === 401 ? '' : error?.message || '获取邀请记录失败'
        this.records = []
        this.total = 0
        this.totalPages = 1
        return null
      } finally {
        this.loadingRecords = false
      }
    },

    reset() {
      this.summary = null
      this.records = []
      this.page = 1
      this.total = 0
      this.totalPages = 1
      this.error = ''
      this.loadingSummary = false
      this.loadingRecords = false
    },
  },
})
