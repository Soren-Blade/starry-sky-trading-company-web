import { defineStore } from 'pinia'

import { getAvailable, previewUse } from '@/api/ask/coupon.js'

/**
 * 结算试算状态（购物车结算面板）
 *
 * ## 纪律
 *
 * 1. **金额全部来自服务端**：`previewUse` 与 `createOrder` 调用同一个库内函数
 *    （`sstc.preview_order_amount()`），前端不做减法、不做四舍五入。
 * 2. **提交用试算结果里的 `points_used`**（getter `effectivePoints`）：服务端会把
 *    积分下调到上限，输入框里的数字只是「用户想要多少」。
 * 3. **券被服务端拒绝时自动取消选择**并留一句说明（`couponNotice`）：
 *    券可能刚刚被别人用掉、或门槛/范围变了，不清掉的话用户会一直撞同一个 409。
 * 4. **失败不吞掉 `code` / `details`**：设置页与下单接口共用同一套错误码，
 *    调用方可以把 `details.shortage` 这类结构化信息直接渲染出来。
 */
export const useCheckoutStore = defineStore('checkout', {
  state: () => ({
    /** 本单可用券（含不可用的，带 selectable / reason） */
    coupons: [],
    loadingCoupons: false,

    /** 选中的券码（空串 = 不使用） */
    couponCode: '',
    /** 用户想要的积分数（真实用量以试算结果为准） */
    usePoints: 0,

    quote: null,
    quoting: false,
    quoteError: '',
    /** 券被自动取消时的说明（与 quoteError 分开，前者更像提示而不是报错） */
    couponNotice: '',

    /** 券列表拉取失败的说明（不阻塞下单，只是没有下拉可选） */
    couponError: '',
  }),

  getters: {
    hasQuote: (state) => Boolean(state.quote),
    hasCoupons: (state) => state.coupons.length > 0,
    /** 可选的券（服务端排序：可用在前、7 天内到期的更靠前） */
    selectableCoupons: (state) => state.coupons.filter((row) => row.selectable === true),
    /** 提交给下单接口的积分数：有试算结果就用服务端确认过的值 */
    effectivePoints: (state) => Number(state.quote?.points_used ?? state.usePoints) || 0,
    warnings: (state) => state.quote?.warnings || [],
  },

  actions: {
    /**
     * 拉本单可用券。`amount` 是原价合计（判定门槛），`productIds` 逗号分隔
     * （不传时服务端不做范围判定，见 §4.13）。
     */
    async fetchCoupons({ amount, productIds } = {}) {
      this.loadingCoupons = true
      this.couponError = ''
      try {
        const { data } = await getAvailable({ amount, productIds })
        this.coupons = data?.list || []
        return this.coupons
      } catch (error) {
        this.couponError = error?.response?.status === 401
          ? ''
          : (error?.response?.data?.message || error?.message || '获取可用券失败')
        this.coupons = []
        return []
      } finally {
        this.loadingCoupons = false
      }
    },

    setCoupon(code) {
      this.couponCode = code ? String(code) : ''
      this.couponNotice = ''
    },

    setPoints(points) {
      this.usePoints = Number(points) || 0
    },

    /**
     * 试算。`items` 为空（用户取消全部勾选）时直接清空结果，
     * 不发一次注定 400 的请求。
     */
    async refreshQuote({ items } = {}) {
      if (!Array.isArray(items) || items.length === 0) {
        this.quote = null
        this.quoteError = ''
        return null
      }

      this.quoting = true
      try {
        const payload = { items }
        if (this.couponCode) payload.coupon_code = this.couponCode
        if (this.usePoints > 0) payload.use_points = this.usePoints

        const { data } = await previewUse(payload)
        this.quote = data
        this.quoteError = ''
        this.couponNotice = ''
        return data
      } catch (error) {
        const body = error?.response?.data || {}
        this.quote = null
        this.quoteError = body.message || error?.message || '试算失败'

        if (body.code === 'COUPON_NOT_AVAILABLE' || body.code === 'COUPON_THRESHOLD') {
          const dropped = this.couponCode
          this.couponCode = ''
          this.couponNotice = dropped
            ? `已取消使用该券：${this.quoteError}`
            : this.quoteError
        } else {
          this.couponNotice = ''
        }

        return {
          error: {
            code: body.code || '',
            details: body.details || null,
            message: this.quoteError,
          },
        }
      } finally {
        this.quoting = false
      }
    },

    reset() {
      this.coupons = []
      this.loadingCoupons = false
      this.couponCode = ''
      this.usePoints = 0
      this.quote = null
      this.quoting = false
      this.quoteError = ''
      this.couponNotice = ''
      this.couponError = ''
    },
  },
})
