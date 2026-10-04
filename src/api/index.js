import user from './ask/user'
import userApi from './ask/userApi'
import toolApi from './ask/toolApi'
import shop from './ask/shop'
import kami from './ask/kami'
import cart from './ask/cart'
import order from './ask/order'
import favorite from './ask/favorite'

/**
 * 接口门面
 *
 * 注意：**不要**在这里引入 `request.js` 的 `refreshToken`。
 * `ask/user.js` 曾经也导出一个同名的 refreshToken，展开后把 request.js 里
 * 正确的单飞实现覆盖掉，导致自动续期静默失效（见 api/ask/user.js 的说明）。
 * 新增模块时留意与既有导出重名。
 */
export default {
    ...user,
    ...userApi,
    ...toolApi,
    ...shop,
    ...kami,
    ...cart,
    ...order,
    ...favorite,
}
