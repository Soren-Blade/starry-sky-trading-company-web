import { computed, ref, watch } from 'vue'

/**
 * 图片加载状态管理。
 *
 * ## 它解决什么问题
 *
 * 商品 / 工具 / 头像的图片地址来自后端返回的**第三方图床**
 * （images.pexels.com、images.unsplash.com、api.dicebear.com …）。
 * 这类外链随时可能不可达（网络受限、图床下线、链接失效），
 * 于是出现两种截然不同的失败：
 *
 *   1. **无图**：地址为空 / 空白 —— 后端没给，属于「本来就没有」；
 *   2. **加载失败**：地址有，但拿不回来 —— 属于「本该有却拿不到」。
 *
 * 两者都不该把浏览器的「碎图」图标丢给用户。但它们的**语义不同**，
 * 因此占位观感也应该可以不同（例如失败时给一个「图片加载失败」的提示图形）。
 * 这个 hook 把「当前该显示真实图、默认占位、还是失败占位」收敛成一个状态机，
 * 组件只负责把状态画出来。
 *
 * ## 三个状态的判定
 *
 *   - `src` 为空 / 空白 / 非字符串 → `'placeholder'`（默认占位，不发起请求）
 *   - 已开始加载且尚未出结果       → `'placeholder'`（**默认占位兜底**，
 *     避免图片解码期间露出空白）
 *   - `onLoad` 且 `src` 未变       → `'loaded'`（真实图）
 *   - `onError` 且 `src` 未变      → `'failed'`（失败占位）
 *
 * ## 为什么 `loaded` 要跟「当前地址」比对
 *
 * `@load` / `@error` 事件是**异步**的：在慢网络下，用户可能已经切到下一张图，
 * 上一张的事件才姗姗来迟。若不加判别，后到的旧事件会把新图的显示状态改错 ——
 * 症状是「切图后偶发地显示上一张的失败占位」。
 * 因此 `markLoaded` / `markFailed` 都接收**触发事件的那个地址**，
 * 与当前地址不一致时直接忽略。
 *
 * ## 地址变化时的重置
 *
 * `watch(src)` 在地址变化时把状态复位为 `'placeholder'`。
 * 注意判据是**原始值**（不是 trim 后的），只要引用值变了就复位；
 * 复位本身不做加载 —— 加载由模板里的 `<img>` 真正发生
 * （`<img>` 的 `@load` 触达 hook 的 `markLoaded`）。
 *
 * @param {object} [options]
 * @param {import('vue').Ref<string>|(() => unknown)|string} [options.src] 图片地址。
 *   支持三种写法：ref、getter 函数（`() => props.src`）、静态字符串。
 *   组件里推荐 getter —— 不依赖 `toRef`，props 变化时天然读到最新值。
 * @param {string} [options.defaultPlaceholder] 默认占位标识（目前仅用于状态透传，
 *   真正的图形由组件插槽决定 —— 保留它是为了将来支持「按类型选占位图」）
 * @param {string} [options.failurePlaceholder] 失败占位标识，同上
 * @returns {{
 *   status: import('vue').ComputedRef<'placeholder'|'loaded'|'failed'>,
 *   isLoading: import('vue').ComputedRef<boolean>,
 *   isLoaded: import('vue').ComputedRef<boolean>,
 *   isFailed: import('vue').ComputedRef<boolean>,
 *   normalizedSrc: import('vue').ComputedRef<string>,
 *   showImage: import('vue').ComputedRef<boolean>,
 *   showFallback: import('vue').ComputedRef<boolean>,
 *   markLoaded: (fromSrc?: unknown) => void,
 *   markFailed: (fromSrc?: unknown) => void,
 *   reset: () => void,
 * }}
 */
export function useImageLoader(options = {}) {
  const srcSource = options.src

  /** 是否是 getter 函数（区别于「传静态字符串」） */
  const isGetter = typeof srcSource === 'function'
  /** 是否是 ref（有 .value） */
  const isRef = Boolean(srcSource) && typeof srcSource === 'object' && 'value' in srcSource

  /**
   * 读取当前地址的**原始**值（不 trim）。
   * 三种入参形态在这里收敛成同一个取值路径。
   */
  const readRawSrc = () => {
    if (isGetter) return srcSource()
    if (isRef) return srcSource.value
    return srcSource
  }

  /** 归一化后的可用地址：非字符串或空白一律归为空串 */
  const normalizedSrc = computed(() => {
    const raw = readRawSrc()
    return typeof raw === 'string' ? raw.trim() : ''
  })

  /**
   * 状态机：'placeholder' | 'loaded' | 'failed'。
   *
   * 这里**只存事件结果**（loaded / failed），是否为空串由 computed 派生 ——
   * 把「有没有图」和「图加载成没成」分开存，避免两者打架：
   * 一个空地址永远不可能进入 loaded / failed，因为 `status` 先看 `normalizedSrc`。
   */
  const settled = ref(null) // null | 'loaded' | 'failed'

  const status = computed(() => {
    if (!normalizedSrc.value) return 'placeholder'
    return settled.value || 'placeholder'
  })

  const isLoading = computed(() => Boolean(normalizedSrc.value) && settled.value === null)
  const isLoaded = computed(() => status.value === 'loaded')
  const isFailed = computed(() => status.value === 'failed')

  /** 是否应该渲染真实图片 */
  const showImage = computed(() => status.value === 'loaded')
  /** 是否应该渲染占位（默认占位与失败占位都算，具体图形由组件决定） */
  const showFallback = computed(() => !showImage.value)

  /**
   * 传入的地址是否就是当前地址。
   *
   * 三种「视为匹配」的情况：
   *   1. 不传 `fromSrc` —— 最简用法 `@load="markLoaded"`；
   *   2. 传了事件对象（非字符串）—— 说明调用方不想声明来源，按匹配处理；
   *   3. 传了字符串且 trim 后与当前地址相等。
   *
   * 只有「传了字符串且与当前地址不同」才判为不匹配（丢弃晚到的旧事件）。
   */
  const isSameSrc = (fromSrc) => {
    if (fromSrc === undefined || fromSrc === null) return true
    if (typeof fromSrc !== 'string') return true // 事件对象等：视为「未声明来源」
    return fromSrc.trim() === normalizedSrc.value
  }

  /**
   * 标记「加载成功」。
   * @param {unknown} [fromSrc] 触发事件的地址；传入且与当前地址不一致时忽略
   *   （防慢网络下晚到的旧事件污染新图状态 —— 见文件头说明）
   */
  const markLoaded = (fromSrc) => {
    if (!isSameSrc(fromSrc)) return
    if (!normalizedSrc.value) return
    settled.value = 'loaded'
  }

  /**
   * 标记「加载失败」。
   * @param {unknown} [fromSrc] 同 markLoaded
   */
  const markFailed = (fromSrc) => {
    if (!isSameSrc(fromSrc)) return
    if (!normalizedSrc.value) return
    settled.value = 'failed'
  }

  /** 复位为初始态（下一次事件可以重新判定） */
  const reset = () => {
    settled.value = null
  }

  // 地址变化 → 复位（含首次挂载）。判据用原始值：trim 前后算是同一张图，
  // 但引用值一变就必须重新判定，否则会残留上一张图的结果。
  if (isGetter) {
    // getter 形态：包一层 watch，Vue 会自动收集 getter 读到的全部响应式依赖，
    // 不需要调用方声明「到底依赖了 props 的哪几个字段」。
    watch(
      () => srcSource(),
      () => {
        settled.value = null
      },
      { immediate: true }
    )
  } else if (isRef) {
    watch(
      srcSource,
      () => {
        settled.value = null
      },
      { immediate: true }
    )
  }

  return {
    status,
    isLoading,
    isLoaded,
    isFailed,
    normalizedSrc,
    showImage,
    showFallback,
    markLoaded,
    markFailed,
    reset,
    // 透传，供组件按需使用（当前 SmartImage 用固定的 image 图标）
    defaultPlaceholder: options.defaultPlaceholder ?? 'default',
    failurePlaceholder: options.failurePlaceholder ?? 'default',
  }
}

export default useImageLoader
