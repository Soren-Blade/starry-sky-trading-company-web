import request from '../request'

const baseURL = '/cartApi'

/**
 * 购物车接口
 *
 * 所有写操作都**返回整份购物车**，前端因此不需要在本地做乐观加减：
 * 数量、小计、合计、可下单判断全部由后端算好，
 * 避免「前端算一遍、后端算一遍」两套金额逻辑。
 *
 * 需要登录账号（registered）。游客请求会拿到 403 `REGISTERED_ACCOUNT_REQUIRED`，
 * 调用方据此弹出登录弹窗。
 */

/** 获取购物车 */
function getCart() {
    return request.get(`${baseURL}/getCart`)
}

/**
 * 加入购物车（同一商品已存在时累加数量）
 * @param {{product_id: number, quantity?: number}} data
 */
function addItem(data) {
    return request.post(`${baseURL}/addItem`, data)
}

/**
 * 修改某一行数量（0 等价于移除该行）
 * @param {{id: number, quantity: number}} data
 */
function updateItem(data) {
    return request.post(`${baseURL}/updateItem`, data)
}

/** 移除某一行 */
function removeItem(id) {
    return request.post(`${baseURL}/removeItem`, { id })
}

/** 清空购物车 */
function clearCart() {
    return request.post(`${baseURL}/clear`, {})
}

export default {
    getCart,
    addItem,
    updateItem,
    removeItem,
    clearCart,
}
