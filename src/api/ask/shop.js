import request from '../request'
const classBaseURL = '/class'
const shopBaseURL = '/shop'

// 获取分类列表
function getCategories(params) {
    return request.get(`${classBaseURL}/getCategories`, { params })
}

// 获取商品列表
function getProducts(params) {
    return request.get(`${shopBaseURL}/getProducts`, { params })
}

/**
 * 获取单个商品详情
 *
 * 返回的 `data.product` 与列表接口的单项**逐字段一致**（服务端由同一份
 * 映射函数产出），因此详情页与商品卡可以共用价格/库存/折扣的展示逻辑。
 *
 * @param {number|string} id 商品 id
 */
function getProduct(id) {
    return request.get(`${shopBaseURL}/getProduct/${encodeURIComponent(id)}`)
}

export default {
    getCategories,
    getProducts,
    getProduct,
}
