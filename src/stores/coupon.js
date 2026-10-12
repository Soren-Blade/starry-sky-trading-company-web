import { defineStore } from 'pinia'

import { getMine, claim } from '@/api/ask/coupon.js'

/**
 * 优惠券状态（阶段 P0）
 *
 * ## 纪律
 *
 * 1. **状态一律用服务端给的 `status`**（派生状态）：库里只存 available / used，
 *    「已过期」是读的时候按 `expires_at` 判出来的。前端再判一次就会出现
 *    「页面说可用、下单时被拒」。
 * 2. **列表按页签缓存**：三个页签共用一份 `list`，切页签要重新拉，
 *    因为角标与置顶顺序都随状态变。
 * 3. **会员券包在读接口时惰性发放**（服务端行为）：因此第一次读
 *    `/couponApi/getMine` 可能「多出」一张券，这不是前端 bug。
 */
export const useCouponStore = defineStore('coupon', {
  state: () => ({
    list: [],
    counts: { available: 0, used: 0, expired: 0, expiring_soon: 0 },

    status: 'all',
    page: 1,
    limit: 50,
    total: 0,
    totalPages: 1,

    loading: false,
    claiming: false,
    error: '',
  }),

  getters: {
    availableCount: (state) => Number(state.counts.available ?? 0),
    hasAny: (state) => state.list.length > 0,
    /** 有券即将过期（7 天内）—— 与 hero 文案同阈值 */
    hasExpiring: (state) => Number(state.counts.expiring_soon ?? 0) > 0,
    expiringCount: (state) => Number(state.counts.expiring_soon ?? 0),
    hasNext: (state) => state.page < state.totalPages,
  },

  actions: {
    async fetchMine({ page } = {}) {
      if (page) this.page = page
      this.loading = true
      this.error = ''
      try {
        const { data } = await getMine({ status: this.status, page: this.page, limit: this.limit })
        this.list = data.list || []
        this.counts = data.counts || { available: 0, used: 0, expired: 0, expiring_soon: 0 }
        this.total = data.pagination?.total ?? 0
        this.totalPages = data.pagination?.total_pages ?? 1
        return data
      } catch (error) {
        this.error = error?.response?.status === 401 ? '' : (error?.message || '获取优惠券失败')
        this.list = []
        this.total = 0
        this.totalPages = 1
        return null
      } finally {
        this.loading = false
      }
    },

    setStatus(status) {
      this.status = status
      this.page = 1
    },

    /**
     * 领券。失败时**原样抛出**，由调用方展示服务端的 `message`
     * （「已领过」「已领完」「会员专属」的说法由服务端统一，前端不另编）。
     */
    async doClaim(templateId) {
      this.claiming = true
      try {
        const { data } = await claim(templateId)
        return data
      } finally {
        this.claiming = false
      }
    },

    reset() {
      this.list = []
      this.counts = { available: 0, used: 0, expired: 0, expiring_soon: 0 }
      this.status = 'all'
      this.page = 1
      this.total = 0
      this.totalPages = 1
      this.error = ''
      this.loading = false
    },
  },
})
