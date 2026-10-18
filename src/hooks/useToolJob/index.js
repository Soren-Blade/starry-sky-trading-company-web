import { onUnmounted, ref } from 'vue'

/**
 * 工具页的「一次任务」状态机：空 → 加载 → 成功 / 失败。
 *
 * 为什么要有它：五个工具页的操作区都是同一个形状 ——
 * 点按钮、等一会儿、拿到结果或拿到报错。改造前每个页面各写一套
 * `loading` / `error` 布尔量，于是「加载中点第二次」的行为在页面之间并不一致
 * （有的重复发起，有的按钮没禁用）。收成一个 hook 之后，
 * 重入、卸载后赋值、错误文案归一都只有一处实现。
 *
 * 用法：
 * ```js
 * const job = useToolJob({ run: async () => { ... return 结果 } })
 * job.run()   // 走一次完整流转
 * job.reset() // 回到空态
 * ```
 *
 * @param {object} options
 * @param {() => Promise<any>} options.run 页面提供的真实实现（骨架阶段是占位逻辑）
 * @param {(fn: Function) => void} [options.onUnmounted]
 *   生命周期注册函数，默认用 Vue 的 `onUnmounted`；
 *   **仅在测试中注入**，用来在不 mount 组件的前提下验证「卸载后不再赋值」。
 * @param {{ record: (detail: object) => void }} [options.usage]
 *   可选的留痕器，通常是 `useToolUsage(...)` 的返回值。传了它，
 *   **每一次完整流转都会自动上报一条**（含耗时与成功/失败），页面不用再自己写；
 *   留痕失败被完全吞掉，不影响工具结果。
 */
export function useToolJob(options = {}) {
  const { run: task, onUnmounted: registerUnmounted = onUnmounted, usage } = options

  const state = ref('empty')
  const result = ref(null)
  const error = ref('')

  // 卸载后必须停止赋值：否则异步返回时会写进一个已经不存在的组件状态，
  // 在 Vue 里不会报错，只会静默泄漏（测试里表现为「unmounted 之后 state 又变了」）。
  let disposed = false

  registerUnmounted(() => {
    disposed = true
  })

  /** 留痕是旁路：没传 usage、或记录本身抛错，都不该改变任务结果 */
  function reportUsage(detail) {
    if (!usage || typeof usage.record !== 'function') return
    try {
      usage.record(detail)
    } catch (error) {
      // 故意忽略：见上
    }
  }

  function reset() {
    state.value = 'empty'
    result.value = null
    error.value = ''
  }

  /**
   * 跑一次任务。
   *
   * 加载中重入**直接忽略**（返回 undefined 而不是再发一次）：
   * 按钮虽然会禁用，但回车提交与双击仍可能进来。
   */
  async function execute() {
    if (state.value === 'loading') return undefined

    state.value = 'loading'
    error.value = ''

    const startedAt = typeof performance !== 'undefined' ? performance.now() : Date.now()

    try {
      const value = typeof task === 'function' ? await task() : null
      if (disposed) return undefined
      result.value = value ?? null
      state.value = 'success'
      reportUsage({ ok: true, durationMs: Date.now() - startedAt })
      return value ?? null
    } catch (e) {
      if (disposed) return undefined
      // 保留 Error 原始描述：JSON 解析失败这类报错，
      // 换成「处理失败」四个字就等于把唯一有用的信息抹掉了
      error.value = e && e.message ? String(e.message) : String(e)
      result.value = null
      state.value = 'error'
      // 失败原因用页面挂上去的稳定错误码（`error.code`），没有就退化成通用码：
      // 留痕表的失败行必须有错误码，否则「哪类失败最多」答不了。
      reportUsage({
        ok: false,
        errorCode: errorCodeOf(e),
        durationMs: Date.now() - startedAt,
      })
      return undefined
    }
  }

  return {
    state,
    result,
    error,
    run: execute,
    reset,
  }
}

/** 从异常里取一个符合留痕表约束（大写下划线）的错误码 */
function errorCodeOf(error) {
  const code = error && typeof error.code === 'string' ? error.code : ''
  return /^[A-Z][A-Z0-9_]{0,63}$/.test(code) ? code : 'TOOL_JOB_FAILED'
}

export default useToolJob
