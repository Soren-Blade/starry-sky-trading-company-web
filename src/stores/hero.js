import { defineStore } from 'pinia'

import { getHeroPersona } from '@/api/ask/hero.js'

/**
 * 首页人格位状态（1.6.0）
 *
 * ## 纪律
 *
 * 1. **不要把空对象与「失败」混为一谈**：游客与非会员都会拿到 `{}`，
 *    这是**正常结果**（L2：整块缺席代表「没有这个能力」），不是错误。
 *    因此 401/403 之外的失败才记 `error`，而 `{}` 只让 `hasBenefits` 为 false。
 * 2. **不要给缺失的键补 0**：`coupons` / `coupon_expiring` 为 0 时服务端不下发，
 *    `checkin_available` 只在 true 时下发。页面用 `'coupons' in benefits` 判断，
 *    写成 `benefits.coupons || 0` 会把「没有」显示成「0 张券」。
 * 3. 身份切换时必须 `reset()`：会员 A 的等级与券数不能留给会员 B（同 cart/points）。
 */
export const useHeroStore = defineStore('hero', {
  state: () => ({
    persona: null,
    loaded: false,
    loading: false,
    error: '',
  }),

  getters: {
    benefits: (state) => state.persona?.benefits || null,
    hasBenefits: (state) => Boolean(state.persona && state.persona.benefits),
    memberLevelName: (state) => state.persona?.benefits?.member_level_name || '',
    /** 有没有「今天签到可得 N 积分」这条（服务端只在可签到时下发） */
    hasCheckinHint: (state) => state.persona?.benefits?.checkin_available === true,
  },

  actions: {
    async fetchPersona({ silent = false } = {}) {
      this.loading = true
      if (!silent) this.error = ''
      try {
        const { data } = await getHeroPersona()
        this.persona = data || {}
        this.loaded = true
        return this.persona
      } catch (error) {
        const status = error?.response?.status
        this.error = status === 401 || status === 403 ? '' : error?.message || '获取会员速览失败'
        // 保留上一次的 persona：网络抖动不该让速览整块消失
        return null
      } finally {
        this.loading = false
      }
    },

    reset() {
      this.persona = null
      this.loaded = false
      this.loading = false
      this.error = ''
    },
  },
})
