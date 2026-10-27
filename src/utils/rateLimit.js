/**
 * 点击频率控制。
 *
 * 为什么单独抽一个文件：全站有几十个「点一下就发请求」的入口（激活卡密、
 * 免卡密激活、刷新列表、导出日志、签到、收藏、加购、下单……）。之前每个组件
 * 各写一套 `if (loading) return`，能挡住「请求已经发出去之后」的重复点击，
 * 但挡不住**请求发出前**的连点：双击的两次 click 都在同一个事件循环里跑完，
 * 两次请求几乎同时到达服务端 —— 这正是要消掉的服务器压力。
 *
 * 三个工具的分工，不要混用：
 *   · `debounce`  —— 等用户停下来再执行。用于「输入即查询」（卡密识别）。
 *   · `throttle`  —— 固定窗口内最多执行一次。用于滚动、resize 这类连续事件。
 *   · `createClickGuard` / `guardAsync` —— 用于按钮点击。前者纯时间窗，
 *     后者额外保证「上一次还没结束就不发第二次」，适合真正打接口的处理函数。
 *
 * 三者都不吞错误：被跳过的调用直接返回 `false` / 上一次的结果，不抛异常，
 * 调用方据此决定要不要给用户反馈。
 */

/**
 * 防抖：最后一次调用后等待 `wait` 毫秒再执行。
 *
 * @param {Function} fn 目标函数
 * @param {number} [wait=300] 静默期（毫秒）
 * @param {{ leading?: boolean }} [options] `leading` 为 true 时先立即执行一次，
 *   之后的连续调用仍会被合并到末尾（输入框通常用 false，按钮用 true）
 * @returns {Function & { cancel: Function, flush: Function, pending: Function }}
 */
export function debounce(fn, wait = 300, options = {}) {
    const { leading = false } = options
    let timer = null
    let lastArgs = null
    let lastThis = null
    let calledLeading = false

    function clear() {
        if (timer !== null) {
            clearTimeout(timer)
            timer = null
        }
    }

    function invoke() {
        const args = lastArgs
        const self = lastThis
        lastArgs = null
        lastThis = null
        calledLeading = false
        fn.apply(self, args)
    }

    function debounced(...args) {
        lastArgs = args
        lastThis = this

        // 本轮静默期的第一下 + 允许 leading：立刻执行，并让后续调用只更新时间
        if (leading && timer === null && !calledLeading) {
            calledLeading = true
            invoke()
            timer = setTimeout(clear, wait)
            return
        }

        clear()
        timer = setTimeout(invoke, wait)
    }

    debounced.cancel = () => {
        lastArgs = null
        lastThis = null
        calledLeading = false
        clear()
    }

    debounced.flush = () => {
        if (lastArgs) {
            clear()
            invoke()
        }
    }

    debounced.pending = () => timer !== null

    return debounced
}

/**
 * 节流：固定窗口内最多执行一次。
 *
 * 默认 leading + trailing 都开：第一下立刻响应（按钮手感），窗口末尾
 * 再用**最后一次**的参数补一次（连续输入时不会丢掉最终值）。
 *
 * @param {Function} fn 目标函数
 * @param {number} [wait=300] 窗口长度（毫秒）
 * @param {{ leading?: boolean, trailing?: boolean }} [options]
 * @returns {Function & { cancel: Function }}
 */
export function throttle(fn, wait = 300, options = {}) {
    const { leading = true, trailing = true } = options
    let lastTime = 0
    let timer = null
    let lastArgs = null
    let lastThis = null

    function clear() {
        if (timer !== null) {
            clearTimeout(timer)
            timer = null
        }
    }

    function throttled(...args) {
        const nowTime = Date.now()
        if (lastTime === 0 && leading === false) {
            lastTime = nowTime
        }
        const remaining = wait - (nowTime - lastTime)
        lastArgs = args
        lastThis = this

        if (remaining <= 0 || remaining > wait) {
            clear()
            lastTime = nowTime
            fn.apply(lastThis, lastArgs)
            lastArgs = null
            lastThis = null
            return
        }

        if (trailing && timer === null) {
            timer = setTimeout(() => {
                timer = null
                lastTime = leading === false ? 0 : Date.now()
                if (!lastArgs) return
                fn.apply(lastThis, lastArgs)
                lastArgs = null
                lastThis = null
            }, remaining)
        }
    }

    throttled.cancel = () => {
        clear()
        lastTime = 0
        lastArgs = null
        lastThis = null
    }

    return throttled
}

/**
 * 按钮点击闸门：同一个 `wait` 窗口内只放行第一次。
 *
 * 刻意做成「返回布尔」而不是「包一层事件处理器」：组件里通常还要执行
 * `if (!guard()) return` 之外的事情（比如按钮 disabled、埋点、提示节流），
 * 包起来反而不方便。
 *
 * @param {number} [wait=800] 放行间隔（毫秒）。取 800 是因为它比一次
 *   正常请求的往返略长：连点会被挡住，但用户「想再点一次」时又不会觉得卡住。
 * @param {{ now?: () => number }} [options] 注入时钟，便于单测
 * @returns {Function & { reset: Function }}
 */
export function createClickGuard(wait = 800, options = {}) {
    const { now = () => Date.now() } = options
    let last = Number.NEGATIVE_INFINITY

    const guard = () => {
        const current = now()
        if (current - last < wait) return false
        last = current
        return true
    }

    guard.reset = () => {
        last = Number.NEGATIVE_INFINITY
    }

    return guard
}

/**
 * 异步动作锁：执行期间再次触发直接返回 `null`，结束后还可选冷却一段时间。
 *
 * 与 `createClickGuard` 的区别：这个锁的判据是「上一次有没有结束」，
 * 适合下单、激活这类**必须**避免并发的操作 —— 网络慢时单靠时间窗挡不住。
 *
 * @param {Function} task 返回 Promise 的处理函数
 * @param {{ cooldown?: number }} [options] 结束后的额外冷却（毫秒）
 * @returns {Function & { busy: Function }}
 */
export function guardAsync(task, options = {}) {
    const { cooldown = 0 } = options
    let running = false
    let until = 0

    const wrapped = async (...args) => {
        if (running || Date.now() < until) return null
        running = true
        try {
            return await task(...args)
        } finally {
            running = false
            until = Date.now() + cooldown
        }
    }

    wrapped.busy = () => running || Date.now() < until

    return wrapped
}
