import { useRouter } from 'vue-router'
import api from '@/api/index'
import { useCartStore } from '@/stores/cart'
import { useUserStore } from '@/stores/user'
import { notify } from '@/hooks/useToast/index.js'
import { PRODUCT_GRID } from '@/constants/index.js'

/**
 * 商品的三个动作：看详情 / 加购 / 立即下单
 *
 * 抽出来的原因：同一个「点购买」在商品卡（主页、榜单、分类详情）与详情页
 * 共四处出现，而它要做的事并不只是发一个请求 ——
 * 未登录时要弹登录弹窗、要区分「参数错误」与「没登录」、
 * 下单成功后要跳到订单详情。逐处重写必然漏掉其中一条。
 *
 * 与 `useKamiActivation` 同一套约定：**不向外抛异常**，
 * 统一返回 `{ success, needLogin?, message? }`。
 */
export function useProductActions() {
  const router = useRouter()
  const cartStore = useCartStore()
  const userStore = useUserStore()

  /** 跳商品详情页 */
  const goDetail = (product) => {
    const id = Number(product?.id)
    if (!Number.isFinite(id)) return
    router.push({ name: 'ProductDetail', params: { id } })
  }

  /**
   * 未登录时统一拉起登录弹窗。
   * 返回 true 表示「已经拦下并提示过了」，调用方不必再报错。
   */
  const requireLogin = (message) => {
    if (userStore.isLoggedIn) return false
    userStore.openLoginModal(message)
    return true
  }

  /**
   * 加入购物车
   * @param {object} product
   * @param {number} [quantity]
   */
  const addToCart = async (product, quantity = 1) => {
    const id = Number(product?.id)
    if (!Number.isFinite(id)) return { success: false, message: '商品不合法' }

    if (requireLogin(PRODUCT_GRID.cartNeedLogin)) {
      return { success: false, needLogin: true, message: PRODUCT_GRID.cartNeedLogin }
    }

    const result = await cartStore.add(id, quantity)

    if (result.needLogin) {
      // 令牌在本地看着像登录态、服务端却判定不是注册账号（例如账号被改成游客），
      // 这种情况同样拉起登录弹窗，而不是弹一个看不懂的 403。
      userStore.openLoginModal(PRODUCT_GRID.cartNeedLogin)
      return result
    }

    if (result.success) notify.success(result.message || PRODUCT_GRID.addedToCart)
    else notify.error(result.message)

    return result
  }

  /**
   * 立即下单（单件商品直接生成订单）
   * @param {object} product
   * @param {number} [quantity]
   * @param {{contact?: string, remark?: string}} [extra]
   */
  const buyNow = async (product, quantity = 1, extra = {}) => {
    const id = Number(product?.id)
    if (!Number.isFinite(id)) return { success: false, message: '商品不合法' }

    if (requireLogin(PRODUCT_GRID.orderNeedLogin)) {
      return { success: false, needLogin: true, message: PRODUCT_GRID.orderNeedLogin }
    }

    try {
      const result = await api.createOrder({
        items: [{ product_id: id, quantity }],
        contact: extra.contact,
        remark: extra.remark,
      })

      if (!result?.success) {
        notify.error(result?.message || '下单失败')
        return { success: false, message: result?.message || '下单失败' }
      }

      const order = result.data?.order
      const orderNo = order?.order_no

      if (orderNo) {
        notify.success('下单成功')
        router.push({ name: 'OrderDetail', params: { orderNo } })
      } else {
        // 极少数情况下服务端没回订单号：至少把用户带到订单列表，
        // 不要停在一个「成功了但不知道去哪看」的页面上
        notify.success('下单成功')
        router.push({ name: 'Orders' })
      }

      return { success: true, order }
    } catch (error) {
      notify.error(error?.message || '下单失败，请稍后重试')
      return { success: false, message: error?.message }
    }
  }

  return { goDetail, addToCart, buyNow, requireLogin }
}

export default useProductActions
