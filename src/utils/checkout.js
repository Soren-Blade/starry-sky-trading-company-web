/**
 * 结算试算的展示与校验口径（购物车结算面板专用）
 *
 * 服务端的结算内核是 `sstc.preview_order_amount()`，`POST /couponApi/previewUse`
 * 与 `POST /orderApi/createOrder` **调用同一个函数** —— 所以前端只做两件事：
 *   1. 把「原价 / 会员优惠 / 券 / 积分 / 应付」原样显示出来，**不自己算钱**；
 *   2. 在发请求之前挡住一眼就能看出的非法输入（避免用户点了下单才拿到 400）。
 *
 * 三条纪律：
 *   1. **一律用服务端返回的金额**：这里的函数不做减法，`settlementRows` 只是把
 *      契约字段排成可渲染的行，`payable_amount` 用的就是服务端给的数。
 *   2. **下单要发的是「试算后的真实用量」**：服务端会把积分下调到上限
 *      （`points_used` 可能小于用户填的数），所以提交时用 `quote.points_used`，
 *      不是输入框里的数字 —— 否则「试算 30 元、下单扣 40 元」这类信任问题迟早出现。
 *   3. **不读 store**：全部是纯函数，余额与试算结果都由调用方传进来。
 */

/** 100 积分 = ¥1，且积分必须是 100 的整数倍（服务端 `INVALID_PARAMS` 的口径） */
export const POINTS_STEP = 100

/**
 * 校验用户填的积分数量。
 *
 * 返回 `{ ok, points, error, clamped }`：
 *   - `ok: false` → 不要发试算请求，直接显示 `error`
 *   - `clamped: true` → 数量超过本单上限，`points` 是**下调并按 100 取整**后的值
 *     （服务端也会下调，但先在这里收口能让输入框旁边的话说清楚）
 */
export function normalizePointsInput(value, { max = Infinity } = {}) {
  if (value === '' || value === null || value === undefined) {
    return { ok: true, points: 0, error: '', clamped: false }
  }

  const raw = Number(value)
  if (!Number.isFinite(raw) || raw < 0) {
    return { ok: false, points: 0, error: '积分必须是 0 或正整数', clamped: false }
  }
  if (!Number.isInteger(raw)) {
    return { ok: false, points: 0, error: '积分必须是整数', clamped: false }
  }
  if (raw % POINTS_STEP !== 0) {
    return { ok: false, points: 0, error: `积分必须是 ${POINTS_STEP} 的整数倍`, clamped: false }
  }

  const limit = Number(max)
  if (Number.isFinite(limit) && limit >= 0 && raw > limit) {
    const capped = Math.max(0, Math.floor(limit / POINTS_STEP) * POINTS_STEP)
    if (capped === raw) return { ok: true, points: raw, error: '', clamped: false }
    return {
      ok: true,
      points: capped,
      error: '',
      clamped: true,
      message: `本单最多抵扣 ${capped} 积分`,
    }
  }

  return { ok: true, points: raw, error: '', clamped: false }
}

/**
 * 本单最多能用多少积分 = min（积分抵扣金额上限换算成积分，账户余额）。
 *
 * `limits.max_points_discount` 是**生效上限**（服务端已取「等级上限」与
 * 「抵扣总额 50% 剩余额度」的较小者），因此只能用它，不能自己按等级算。
 */
export function maxUsablePoints(quote, balance = 0) {
  if (!quote) return 0
  const capAmount = Number(quote.limits?.max_points_discount ?? 0)
  const capPoints = Number.isFinite(capAmount) && capAmount > 0
    ? Math.floor((capAmount * 100) / POINTS_STEP) * POINTS_STEP
    : 0
  const step = Number(quote.limits?.points_step ?? POINTS_STEP) || POINTS_STEP
  const balancePoints = Math.floor(Math.max(0, Number(balance) || 0) / step) * step
  return Math.max(0, Math.min(capPoints, balancePoints))
}

/**
 * 结算明细行：**只做筛选与排序，不做算术**。
 *
 * 金额为 0 的优惠行不展示（会员价优惠为 0 时给非会员看一行「会员优惠 -¥0」是噪音）。
 * `payable_amount` 永远展示，它是这一屏最需要看清的数字。
 *
 * 订单与试算的字段同名（`original_amount` / `member_discount` / `coupon_discount` /
 * `points_used` / `points_discount` / `payable_amount`），所以订单详情页也复用这个函数，
 * 只是把末行文案从「应付」换成「实付」。
 */
export function settlementRows(quote, { totalLabel = '应付' } = {}) {
  if (!quote) return []
  const rows = [
    { key: 'original_amount', label: '商品原价', amount: Number(quote.original_amount) || 0, kind: 'base' },
    { key: 'member_discount', label: '会员价优惠', amount: Number(quote.member_discount) || 0, kind: 'discount' },
    { key: 'coupon_discount', label: '优惠券抵扣', amount: Number(quote.coupon_discount) || 0, kind: 'discount' },
    {
      key: 'points_discount',
      label: `积分抵扣${Number(quote.points_used) > 0 ? `（${quote.points_used} 积分）` : ''}`,
      amount: Number(quote.points_discount) || 0,
      kind: 'discount',
    },
    { key: 'payable_amount', label: totalLabel, amount: Number(quote.payable_amount) || 0, kind: 'total' },
  ]
  return rows.filter((row) => row.kind !== 'discount' || row.amount > 0)
}

/**
 * 券下拉里一行的文案：面额 + 门槛 + 不可用原因。
 *
 * 不可用的券也列出来（`selectable: false` + `reason`）—— 与领取接口一样，
 * 让用户看到「我有券，但为什么用不了」，而不是凭空消失。
 */
export function couponOptionLabel(coupon) {
  if (!coupon) return ''
  const amount = Number(coupon.amount) || 0
  const threshold = Number(coupon.threshold) || 0
  const head = threshold > 0 ? `¥${amount} 券 · 满 ¥${threshold} 可用` : `¥${amount} 券 · 无门槛`
  if (coupon.selectable === true) return head
  return `${head} · ${coupon.reason || '本单不可用'}`
}
