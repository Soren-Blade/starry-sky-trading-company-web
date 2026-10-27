import request from '../request'
import { shortCache } from '@/utils/shortCache.js'
const classBaseURL = '/class'
const shopBaseURL = '/shop'

/**
 * 分类与商品列表是「多个组件都要、且几秒内不会变」的读接口：
 * 首页/分类页/导航同时挂载时实测会各发两次相同请求，每次都带一次远程
 * 数据库往返（约 220 ms），所以这里按参数合并 + 8 秒短缓存。
 *
 * 注意 key 必须**按键名排序**再序列化：不同调用方传参顺序不同
 * （`{in_stock, limit}` 与 `{limit, in_stock}`）会得到同一个 URL 却算出
 * 两个 key，缓存就白做了 —— 这是实测两次重复请求的原因。
 */
function stableStringify(value) {
    if (value === null || value === undefined) return String(value)
    if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`
    if (typeof value === 'object') {
        const keys = Object.keys(value).sort()
        return `{${keys.map((k) => `${JSON.stringify(k)}:${stableStringify(value[k])}`).join(',')}}`
    }
    // 原语统一按字符串归一：axios 拼 query 时 `{tree: true}` 与 `{tree: 'true'}`
    // 出来是同一个 URL（`?tree=true`），key 也必须一致，否则缓存会漏。
    return JSON.stringify(String(value))
}

function cacheKey(prefix, params) {
    return `${prefix}:${stableStringify(params)}`
}

// 获取分类列表
function getCategories(params) {
    return shortCache.run(cacheKey('shop:categories', params), () =>
        request.get(`${classBaseURL}/getCategories`, { params })
    )
}

// 获取商品列表
function getProducts(params) {
    return shortCache.run(cacheKey('shop:products', params), () =>
        request.get(`${shopBaseURL}/getProducts`, { params })
    )
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
