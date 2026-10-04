import request from '../request'

const baseURL = '/orderApi'

/**
 * 订单接口
 *
 * 需要登录账号（registered）。
 *
 * 关于支付：本平台**没有接入支付通道**，因此没有「支付」这一步。
 * 下单后订单处于 `pending`（待处理），买卖双方线下结算后由买家
 * `completeOrder` 确认完成，或在下单后 `cancelOrder` 取消（库存会自动退回）。
 * 服务端在 createOrder / getOrders 的响应里附带 `payment_notice` 文案，
 * 前端直接展示，不各自编一套说法。
 */

/**
 * 下单
 * @param {{items: Array<{product_id: number, quantity: number}>,
 *          contact?: string, remark?: string, from_cart?: boolean}} data
 *   from_cart 为 true 时，下单成功后服务端会把这批商品从购物车移除。
 *   商品详情页的「立即购买」不传它 —— 用户购物车里的同款商品不该被顺手清掉。
 */
function createOrder(data) {
    return request.post(`${baseURL}/createOrder`, data)
}

/**
 * 订单列表
 * @param {{page?: number, limit?: number, status?: string}} [params] status 省略或 'all' 表示不限
 */
function getOrders(params = {}) {
    return request.get(`${baseURL}/getOrders`, { params })
}

/**
 * 订单详情
 * @param {string} orderNo 订单号（形如 SSTC20261005XXXXXXXX）
 */
function getOrder(orderNo) {
    return request.get(`${baseURL}/getOrder/${encodeURIComponent(orderNo)}`)
}

/** 取消订单（仅「待处理」可取消，库存会退回） */
function cancelOrder(orderNo) {
    return request.post(`${baseURL}/cancelOrder`, { order_no: orderNo })
}

/** 确认完成订单 */
function completeOrder(orderNo) {
    return request.post(`${baseURL}/completeOrder`, { order_no: orderNo })
}

export default {
    createOrder,
    getOrders,
    getOrder,
    cancelOrder,
    completeOrder,
}
