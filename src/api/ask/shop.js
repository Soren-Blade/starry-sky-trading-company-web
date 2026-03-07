import request from '../request'
const classBaseURL = '/class'
const shopBaseURL = '/shop'
// 获取分类列表
function getCategories(params) {
    return request.get(`${classBaseURL}/getCategories`,{ params })
}

// 获取商品列表
function getProducts(params) {
    return request.get(`${shopBaseURL}/getProducts`, { params })
}

export default {
    getCategories,
    getProducts
}