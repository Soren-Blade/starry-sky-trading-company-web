import { readonly, ref } from 'vue'

/**
 * 路由是否正在切换（含懒加载分包下载）。
 *
 * 为什么需要它：路由用 `component: () => import(...)` 懒加载，Vue Router 会在
 * **导航过程中**等分包下载完再切换 —— 旧页面因此会多停留一会儿。这是好事
 * （不会白屏），但完全没有反馈：用户点了导航，界面纹丝不动，慢网下像是没点上。
 * 顶部那条细进度条就是给这个窗口用的。
 *
 * 用「开始 / 结束」两个开关而不是计数器：`beforeEach` 里返回重定向会再触发一次
 * `beforeEach`，计数器会只增不减地漂移，开关式不会。
 */
const routeLoading = ref(false)

/** 导航开始（router.beforeEach） */
export function markRouteLoading() {
    routeLoading.value = true
}

/** 导航完成或出错（router.afterEach / router.onError） */
export function markRouteLoaded() {
    routeLoading.value = false
}

/** 组件侧只读引用 */
export function useRouteLoading() {
    return { loading: readonly(routeLoading) }
}
