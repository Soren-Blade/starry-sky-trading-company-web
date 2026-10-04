import request from '../request'

const baseURL = '/favoriteApi'

/**
 * 收藏接口（商品 / 工具）
 *
 * 需要登录账号（registered）。
 *
 * 工具收藏在**游客态**下另有 localStorage 兜底（沿用改造前的既有行为，
 * 见 `stores/favorite.js`）—— 那是「本机偏好」，不涉及账号数据；
 * 商品收藏则只在服务端，因为收藏一件商品的目的就是稍后回来下单。
 */

/**
 * 收藏列表
 * @param {{target_type: 'product'|'tool'}} params
 */
function getFavorites(params) {
    return request.get(`${baseURL}/getFavorites`, { params })
}

/**
 * 收藏（幂等）
 * @param {{target_type: 'product'|'tool', target_id: number}} data
 */
function addFavorite(data) {
    return request.post(`${baseURL}/addFavorite`, data)
}

/**
 * 取消收藏（幂等）
 * @param {{target_type: 'product'|'tool', target_id: number}} data
 */
function removeFavorite(data) {
    return request.post(`${baseURL}/removeFavorite`, data)
}

export default {
    getFavorites,
    addFavorite,
    removeFavorite,
}
