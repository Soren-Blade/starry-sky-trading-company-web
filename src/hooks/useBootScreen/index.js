import { ref } from 'vue'

/**
 * 首屏启动遮罩的显示闸门。
 *
 * 背景：刷新页面时，应用必须先完成「身份初始化」（复用本地 token 或建游客），
 * 首屏才知道该显示头像还是登录按钮。Vercel 上这一步可能几百毫秒到几秒，
 * 期间页面是「顶栏 + 空白内容」，观感像坏掉了。
 *
 * 直接用 `v-if="booting"` 会有两个反向问题，因此这里做了三道闸：
 *
 *   1. **延迟出现**（`delay`）：本地开发时身份初始化往往只要几十毫秒，
 *      遮罩一闪而过比不显示更难看（白屏闪烁）。因此先等一小会儿，
 *      期间由顶栏的身份占位骨架顶着 —— 加载快就全程看不到遮罩。
 *   2. **最短停留**（`minVisible`）：已经显示了就至少留够这段时间。
 *      否则「出现 → 立刻消失」同样是一次闪烁，只是方向相反。
 *   3. **最长等待**（`maxWait`）：后端挂掉时 axios 要等自己的超时，
 *      不能让遮罩无限期盖住整个应用。到点无条件放行，
 *      用户至少能看到页面骨架与错误提示。
 *
 * 计时器通过参数注入，因此这套时序逻辑可以在没有浏览器的情况下被测试
 * （见 test/bootScreen.test.js）。
 *
 * @param {object} [options]
 * @param {number} [options.delay] 按下后多久才允许出现，毫秒
 * @param {number} [options.minVisible] 一旦出现，最少停留多久，毫秒
 * @param {number} [options.maxWait] 最多等多久就强制放行，毫秒
 * @param {Function} [options.schedule] setTimeout 替身
 * @param {Function} [options.cancel] clearTimeout 替身
 * @param {Function} [options.now] 取当前时间，毫秒
 */
export function useBootScreen({
    delay = 200,
    minVisible = 400,
    maxWait = 8000,
    schedule = setTimeout,
    cancel = clearTimeout,
    now = () => Date.now(),
} = {}) {
    /** 遮罩此刻是否应该可见 */
    const visible = ref(false)

    let shownAt = 0
    let delayTimer = null
    let maxTimer = null
    let settleTimer = null
    let done = false

    const clear = (id) => {
        if (id !== null) cancel(id)
    }

    /** 开始一次启动：通常挂在 onMounted 上 */
    const start = () => {
        done = false

        clear(delayTimer)
        clear(maxTimer)
        clear(settleTimer)
        delayTimer = null
        maxTimer = null
        settleTimer = null
        visible.value = false
        shownAt = 0

        delayTimer = schedule(() => {
            delayTimer = null
            // 等待期间就已经结束的话，绝不补显示一次
            if (done) return
            visible.value = true
            shownAt = now()
        }, delay)

        maxTimer = schedule(() => {
            maxTimer = null
            finish()
        }, maxWait)
    }

    /** 启动结束（身份就绪、路由就位，或到达最长等待） */
    const finish = () => {
        if (done) return
        done = true

        clear(delayTimer)
        clear(maxTimer)
        delayTimer = null
        maxTimer = null

        if (!visible.value) return

        const rest = Math.max(0, minVisible - (now() - shownAt))
        if (rest === 0) {
            visible.value = false
            return
        }

        settleTimer = schedule(() => {
            settleTimer = null
            visible.value = false
        }, rest)
    }

    /** 只给测试用：确认没有残留计时器 */
    const pending = () => ({ delayTimer, maxTimer, settleTimer })

    return { visible, start, finish, pending }
}
