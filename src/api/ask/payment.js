import request from '../request'

const baseURL = '/payApi'

/**
 * 支付接口（易支付，3.3.0）
 *
 * 三条与界面强相关的约定：
 *
 * 1. **不要在下单后就自动建支付单**。`createPayment` 会向网关要一个支付单，
 *    每点一次都产生一次真实尝试；面板应该是「用户点立即支付才建」。
 *    重复点击由服务端复用同一笔未过期支付单（返回 `reuse: true`）。
 * 2. **金额一律用服务端给的 `amount_fen` 展示**（`amount_yuan` 只用于显示），
 *    前端不自己从订单金额算 —— 折扣、积分抵扣的口径只有服务端一处。
 * 3. **轮询用 `getPaymentStatus`，绝不套 shortCache**：缓存 8 秒会让「已付款」
 *    最多晚 8 秒才反映出来（`utils/shortCache.js` 的默认 TTL 就是 8 秒）。
 */

/**
 * 创建（或复用）支付单
 * @param {{order_no: string, pay_type?: 'alipay'|'wxpay', device?: string}} data
 * @returns {Promise<{out_trade_no: string, order_no: string, amount_fen: number,
 *   amount_yuan: string, pay_type: string, pay_url: string|null,
 *   qrcode: string|null, urlscheme: string|null, expires_at: string|null,
 *   reuse: boolean}>}
 */
function createPayment(data) {
    return request.post(`${baseURL}/create`, data)
}

/**
 * 查询支付单状态（面板轮询用；只读，不写库）
 * @param {{order_no?: string, out_trade_no?: string}} params 两者给一个即可
 * @returns {Promise<{payment: object|null, refund: object|null}>}
 */
function getPaymentStatus(params = {}) {
    return request.get(`${baseURL}/status`, { params })
}

export default {
    createPayment,
    getPaymentStatus,
}
