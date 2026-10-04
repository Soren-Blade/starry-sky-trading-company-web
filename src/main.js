import './assets/styles/variables.css'
import './assets/styles/global.css'
import 'ant-design-vue/dist/reset.css'

import { createApp } from 'vue'
import { createPinia } from 'pinia'
import router from './router/index.js'
import App from './App.vue'
import { setAuthExpiredHandler } from './api/request.js'
import { useThemeStore } from './stores/theme.js'
import { notify } from './hooks/useToast/index.js'

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)
app.use(router)

// ── 样式主题 ────────────────────────────────────────────────────
// 必须在 app.mount() 之前同步执行：主题令牌是写到 <html> 的行内样式上的，
// 放到组件的 onMounted 里会让用户先看到默认主题、再闪一下切换（FOUC）。
// 这里显式传入 pinia 实例，因为此刻还没有组件上下文。
useThemeStore(pinia).init()

app.mount('#app')

// ── 登录态失效的处理 ────────────────────────────────────────────
// request 层在「刷新 token 也失败」时会清空凭据并调用这个回调。
//
// 为什么必须注册：这个回调此前**从未在任何地方被注册**，
// 于是 onAuthExpired 恒为 null —— 刷新失败只是静默清空凭据，
// 用户既看不到提示也不会跳转登录，只会反复点击一直失败的按钮。
//
// 这里只做两件事：给出明确提示、把用户带回首页。
// 不做自动弹登录框：回调可能在并发请求中被多次触发，
// 而跳转与弹窗需要产品层面的取舍（例如是否保留当前路径以便登录后回跳）。
let notifiedAt = 0

setAuthExpiredHandler(() => {
    // 并发请求会同时触发回调，这里做去重，避免刷屏
    const now = Date.now()
    if (now - notifiedAt < 3000) return
    notifiedAt = now

    notify.warning('登录状态已失效，请重新登录')

    // 回到首页，避免停留在需要登录的页面反复失败
    // （路由名是 'Home'，见 router/index.js）
    if (router.currentRoute.value.name !== 'Home') {
        router.replace({ name: 'Home' }).catch(() => {
            /* 路由跳转失败不影响提示 */
        })
    }
})
