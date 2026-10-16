import './assets/styles/variables.css'
import './assets/styles/global.css'
/*
 * 组件套件（第三批规范 §1–§21）分四个分片，按族划分而不是按页面。
 * 必须排在 global.css 之后：骨架屏的动画名、滚动条的令牌化版本都在这里覆盖基础层的旧实现。
 *   form     §1 下拉/选择器 §2 复选框 §3 单选框 §4 开关 §5 滑块
 *   nav      §6 步骤条 §7 手风琴 §8 选项卡 §9 面包屑
 *   data     §10 表格 §11 日期选择器 §12 文件上传 §13 评分
 *   feedback §14 气泡提示 §15 抽屉 §16 骨架屏 §17 空状态 §18 通知徽标 §19 滚动条 §21 通用状态
 */
import './assets/styles/ui-kit-form.css'
import './assets/styles/ui-kit-nav.css'
import './assets/styles/ui-kit-data.css'
import './assets/styles/ui-kit-feedback.css'
/*
 * 会员与邮件组件套件（业务复合件，第五个分片）。
 * 前缀 `.u-mm-`（member / mail），与前面四片的 `.u-*` 原子层、`global.css` 的 `.ui-*` 复合层并列：
 *   §1 区块壳 §2 四态容器 §3 元信息行 §4 分页壳 §5–§19 会员域（徽章/身份卡/资产/成长/权益/阶梯/矩阵/
 *   套餐/券/签到/余额/流水/任务/商城/待办）§20–§24 邮件域（通知条目/偏好开关/联系邮箱/台账统计/台账行）
 * 只定义 `.u-mm-*` 类，不覆盖任何全局元素与既有原子 —— 页面没用这些类时引入它没有任何视觉影响。
 */
import './assets/styles/ui-kit-member.css'
/*
 * 工具页骨架（第六个分片）。
 * 前缀 `.tool-`：页头仍由全局 `.page-shell-*` 提供，这一片只放工具页共用的
 * 面板 / 表单与操作区 / 结果区四态 / 预览区 / 辅助信息版式。
 *   §1 页面骨架 §2 面板 §3 表单与操作区 §4 结果区四态 §5 预览区 §6 辅助信息 §7 响应式
 * 只定义 `.tool-*`，页面没用这些类时引入它没有任何视觉影响。
 */
import './assets/styles/ui-kit-tool.css'

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
