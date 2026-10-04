import { useToastStore } from '@/stores/toast'

/**
 * 提示入口（组件内外通用）
 *
 * 为什么做成函数门面而不是直接在调用处 `useToastStore()`：
 * 路由守卫与 store action 里没有组件上下文，但仍然要弹提示
 * （例如「请先登录账号后再访问卡密管理」）。这里统一收口，
 * 调用形态与原先的 `message.warning(...)` 一致，替换成本最低。
 *
 * 依赖 `app.use(pinia)` 已经执行 —— 与路由守卫里 `useUserStore()` 的用法同源。
 */
const call = (type) => (text, duration) => useToastStore()[type](text, duration)

export const notify = {
  success: call('success'),
  warning: call('warning'),
  error: call('error'),
  info: call('info'),
}

export default notify
