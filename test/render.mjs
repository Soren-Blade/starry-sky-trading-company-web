/**
 * 组件渲染辅助（基于 SSR，不需要 jsdom）
 *
 * ## 为什么用 SSR 而不是 jsdom
 *
 * 目标里「组件在浏览器中渲染」这一层一直无法验证。但**模板绑定错误**其实不需要浏览器
 * 就能发现：`@vue/server-renderer` 会在 Node 里真正执行 setup 与 render 函数，
 * 未定义的变量、绑错的字段、抛错的 computed 都会在这一步暴露。
 *
 * 它覆盖不到的是：CSS 布局、真实的 DOM 事件、无障碍树 —— 那些仍需要浏览器。
 * 但「模板里引用了不存在的东西」这一类缺陷可以覆盖，而这正是我此前改动中最容易出错的地方。
 *
 * ## 实现要点
 *
 * - 用 `module.registerHooks` 的 `load` 钩子把 `.vue` 编译成 ESM（`@vue/compiler-sfc`）
 * - 编译时 `inlineTemplate: true`，把模板内联进 render 函数，避免额外的 `?vue&type=template` 请求
 * - import 路径沿用 `test/loaders/alias.mjs` 的规则（`@/` 别名、省略扩展名）
 */
import { registerHooks } from 'node:module'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const WEB_ROOT = path.join(HERE, '..')
const SRC_DIR = path.join(WEB_ROOT, 'src')

// 复用测试环境的解析规则（@/ 别名 + 省略扩展名 + antd 替身）与 import.meta.env 注入。
// 必须在动态导入被测组件之前完成注册。
await import('./setup.js')

const { parse, compileScript } = await import('@vue/compiler-sfc')

/** 编译单个 SFC 为 ESM 源码 */
function compileSfc(filename) {
  const source = fs.readFileSync(filename, 'utf8')
  const { descriptor, errors } = parse(source, { filename })
  if (errors && errors.length) {
    throw new Error(`SFC 解析失败：${errors[0].message}`)
  }

  const id = Buffer.from(filename).toString('hex').slice(0, 12)

  const compiled = compileScript(descriptor, {
    id,
    // 关键：把模板内联进 render，避免生成第二个模块请求
    inlineTemplate: true,
    templateOptions: {
      compilerOptions: {
        // 组件是自动引入的（unplugin-vue-components），渲染时用 resolveComponent 兜底
        isCustomElement: () => false,
      },
    },
  })

  return compiled.content
}

registerHooks({
  resolve(specifier, context, nextResolve) {
    // 只处理 .vue：其余交给 alias.mjs
    if (specifier.endsWith('.vue')) {
      return nextResolve(specifier, context)
    }
    return nextResolve(specifier, context)
  },
  load(url, context, nextLoad) {
    if (url.startsWith('file:') && url.endsWith('.vue')) {
      const filename = fileURLToPath(url)
      if (!fs.existsSync(filename)) return nextLoad(url, context)
      const code = compileSfc(filename)
      return { format: 'module', source: code, shortCircuit: true }
    }
    return nextLoad(url, context)
  },
})

/**
 * 渲染一个组件。
 *
 * @param {string} moduleSpec 相对 src 的模块路径，如 '/components/KamiSection.vue'
 * @param {object} options
 * @param {Function} [options.setup] 传入后替换组件的 setup（用于注入桩数据）
 * @param {object} [options.props] 传给组件的 props
 * @param {object} [options.globalComponents] 全局注册的组件（替代 antd 自动引入）
 * @param {Array<Function>} [options.plugins] 额外安装的插件（pinia、router 等）
 * @param {object} [options.provide] provide 注入
 * @returns {Promise<string>} 渲染出的 HTML
 */
export async function renderComponent(moduleSpec, options = {}) {
  const { createSSRApp, h } = await import('vue')
  const { renderToString } = await import('@vue/server-renderer')

  const target = path.join(SRC_DIR, moduleSpec.replace(/^\//, ''))
  if (!fs.existsSync(target)) throw new Error(`组件不存在：${target}`)

  const mod = await import(`${pathToFileURL(target).href}?t=${Date.now()}-${Math.random()}`)
  const Raw = mod.default
  if (!Raw) throw new Error(`${moduleSpec} 没有默认导出`)

  const Comp = options.setup
    ? {
        name: Raw.name || path.basename(moduleSpec, '.vue'),
        props: Raw.props,
        emits: Raw.emits,
        setup: options.setup,
      }
    : Raw

  const app = createSSRApp({ render: () => h(Comp, options.props || {}) })

  for (const plugin of options.allPlugins || options.plugins || []) {
    app.use(plugin)
  }
  for (const [name, comp] of Object.entries(options.globalComponents || {})) {
    app.component(name, comp)
  }
  if (options.provide) {
    for (const [key, value] of Object.entries(options.provide)) app.provide(key, value)
  }

  return renderToString(app)
}

/** 建一个 pinia 实例（组件里用 useXxxStore 时必须先 app.use 它） */
export async function createPiniaPlugin() {
  const { createPinia } = await import('pinia')
  return createPinia()
}

/**
 * 建一个 pinia 实例并写入 store 初值。
 *
 * 为什么需要：项目的 store 都是 `defineStore('name', { state, actions })` 的选项式写法，
 * 因此拿到 store 实例后可直接改它的状态 —— **无需 mock api**。
 * 这样才能渲染「已登录 + 有卡密列表」这类真实状态，而不只是空态。
 *
 * @param {Record<string, object>} stateByStoreName key 为 store id
 *   （'user' / 'kami' / 'tool' / 'shop' / 'cart' / 'favorite'）
 */
export async function createPiniaWithState(stateByStoreName = {}) {
  const pinia = await createPiniaPlugin()

  /** 按 store id 懒加载对应的 useXxxStore */
  const loaders = {
    user: async () => (await import('@/stores/user')).useUserStore,
    kami: async () => (await import('@/stores/kami')).useKamiStore,
    tool: async () => (await import('@/stores/tool')).useToolStore,
    shop: async () => (await import('@/stores/shop')).useShopStore,
    cart: async () => (await import('@/stores/cart')).useCartStore,
    favorite: async () => (await import('@/stores/favorite')).useFavoriteStore,
  }

  for (const [storeName, partial] of Object.entries(stateByStoreName)) {
    const loader = loaders[storeName]
    if (!loader) throw new Error(`未知 store：${storeName}`)

    // 取一次 store 只是为了让 pinia 注册它的 state 槽位；
    // 之后直接写 pinia.state.value 即可 —— 组件通过 useXxxStore() 拿到的就是同一份响应式对象。
    const { setActivePinia } = await import('pinia')
    setActivePinia(pinia)
    const useStore = await loader()
    useStore()

    const bucket = pinia.state.value[storeName]
    if (!bucket) throw new Error(`store ${storeName} 未在 pinia 中注册 state`)
    for (const [key, value] of Object.entries(partial)) {
      bucket[key] = value
    }
  }

  return pinia
}

/**
 * 建一套**渲染环境桩**，让组件能在 Node 里被渲染而不产生噪音警告。
 *
 * 包含三类：
 *   1. `router-link` / `router-view` —— 真实项目里由 vue-router 提供
 *   2. `a-*`（ant-design-vue）—— 真实项目里由 unplugin-vue-components 自动注册
 *   3. 子组件的必需 props —— 渲染父组件时按需注入，避免 "Missing required prop"
 *
 * 目的不是模拟浏览器，而是**把环境噪音去掉**，这样「渲染期间出现 Vue 警告」
 * 这一断言才有信号价值。
 */
export async function createRenderEnv() {
  // vue-router 的浏览器构建里有形如 `const { history } = window` 的模块级解构，
  // 在 Node 下若 window 已被其他测试文件改动/删除，就会抛
  // `ReferenceError: history is not defined`。
  // 显式补上进程级桩，让渲染环境不依赖测试文件的执行顺序。
  if (typeof globalThis.history === 'undefined') {
    globalThis.history = {
      state: null,
      length: 1,
      pushState() {},
      replaceState() {},
      go() {},
      back() {},
      forward() {},
      scrollRestoration: 'auto',
    }
  }
  if (typeof globalThis.location === 'undefined') {
    globalThis.location = {
      href: 'http://localhost:5173/',
      origin: 'http://localhost:5173',
      protocol: 'http:',
      host: 'localhost:5173',
      hostname: 'localhost',
      port: '5173',
      pathname: '/',
      search: '',
      hash: '',
      assign() {},
      replace() {},
      reload() {},
    }
  }
  if (typeof globalThis.window === 'undefined') {
    globalThis.window = globalThis
  }

  const { h, defineComponent } = await import('vue')

  const passThrough = (name) =>
    defineComponent({
      name,
      inheritAttrs: false,
      setup(_, { slots, attrs }) {
        return () => h('div', { class: `stub-${name}`, ...attrs }, slots.default ? slots.default() : [])
      },
    })

  const routerLink = defineComponent({
    name: 'RouterLink',
    inheritAttrs: false,
    props: { to: { type: [String, Object], default: '/' } },
    setup(props, { slots, attrs }) {
      const href = typeof props.to === 'string' ? props.to : props.to && props.to.path
      return () => h('a', { class: 'stub-router-link', href: href || '#', ...attrs }, slots.default ? slots.default() : [])
    },
  })

  const globalComponents = {
    'router-link': routerLink,
    'router-view': passThrough('RouterView'),
    // ant-design-vue 的常用组件：渲染成带 class 的容器，保留插槽内容
    'a-button': passThrough('AButton'),
    'a-tag': passThrough('ATag'),
    'a-input': passThrough('AInput'),
    'a-select': passThrough('ASelect'),
    'a-option': passThrough('AOption'),
    'a-spin': passThrough('ASpin'),
    'a-modal': passThrough('AModal'),
    'a-empty': passThrough('AEmpty'),
    'a-pagination': passThrough('APagination'),
    // a-table 必须**真正渲染行**并调用 bodyCell 插槽，否则所有单元格模板都不会被执行，
    // 渲染测试就看不到「表格里的绑定是否正确」。
    'a-table': defineComponent({
      name: 'ATable',
      inheritAttrs: false,
      props: {
        columns: { type: Array, default: () => [] },
        dataSource: { type: Array, default: () => [] },
        rowKey: { type: [String, Function], default: 'id' },
        locale: { type: Object, default: () => ({}) },
        loading: { type: [Boolean, Object], default: false },
        pagination: { type: [Object, Boolean], default: false },
        scroll: { type: Object, default: () => ({}) },
      },
      setup(props, { slots, attrs }) {
        return () =>
          h('table', { class: 'stub-a-table', ...attrs }, [
            h(
              'thead',
              {},
              h(
                'tr',
                {},
                props.columns.map((col) =>
                  h('th', { key: col.key || col.dataIndex }, col.title)
                )
              )
            ),
            h(
              'tbody',
              {},
              props.dataSource.length === 0
                ? h('tr', {}, h('td', { colspan: String(props.columns.length || 1) }, slots.emptyText ? slots.emptyText() : (props.locale && props.locale.emptyText) || '暂无数据'))
                : props.dataSource.map((record, index) => {
                    const key =
                      typeof props.rowKey === 'function'
                        ? props.rowKey(record)
                        : record[props.rowKey] ?? index
                    return h(
                      'tr',
                      { key: String(key) },
                      props.columns.map((col) =>
                        h(
                          'td',
                          { key: col.key || col.dataIndex },
                          // 与 antd 一致：bodyCell 插槽决定单元格内容
                          slots.bodyCell
                            ? slots.bodyCell({ column: col, record, index, text: record[col.dataIndex] })
                            : String(record[col.dataIndex] ?? '')
                        )
                      )
                    )
                  })
            ),
          ])
      },
    }),
  }

  // 子组件必需 props：渲染父组件时注入，否则会报 Missing required prop
  const requiredProps = {
    SectionHeader: { title: '桩标题' },
    ProductCard: { product: { id: 1, product_name: '桩商品', price: 1, stock_quantity: 1 } },
    ToolCard: { tool: { id: 1, tool_name: '桩工具' } },
    AppleIdCard: { appleId: { account: 'a@b.c', password: 'p' }, source: 'Stub' },
    HelpModal: { title: '桩标题' },
  }

  // 注册到全局，使父组件模板里的子组件能被解析并拿到必需 props
  const { default: SectionHeader } = await import('@/components/SectionHeader.vue')
  const { default: ProductCard } = await import('@/components/ProductCard.vue')
  const { default: ToolCard } = await import('@/components/ToolCard.vue')
  const { default: AppleIdCard } = await import('@/components/AppleIdCard.vue')
  const { default: HelpModal } = await import('@/components/HelpModal.vue')

  const withDefaults = (name, Comp, props) =>
    defineComponent({
      name: `${name}WithDefaults`,
      inheritAttrs: false,
      setup(_, { attrs, slots }) {
        return () => h(Comp, { ...props, ...attrs }, slots)
      },
    })

  globalComponents.SectionHeader = withDefaults('SectionHeader', SectionHeader, requiredProps.SectionHeader)
  globalComponents.ProductCard = withDefaults('ProductCard', ProductCard, requiredProps.ProductCard)
  globalComponents.ToolCard = withDefaults('ToolCard', ToolCard, requiredProps.ToolCard)
  globalComponents.AppleIdCard = withDefaults('AppleIdCard', AppleIdCard, requiredProps.AppleIdCard)
  globalComponents.HelpModal = withDefaults('HelpModal', HelpModal, requiredProps.HelpModal)

  const { createRouter, createMemoryHistory } = await import('vue-router')
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      // 法务页由 `meta.legalKey` 选内容，因此这里必须给出带 meta 的真实路由 ——
      // 只有 catch-all 的话，`route.meta.legalKey` 永远是 undefined，
      // 三份文档都会回落到用户协议，测「隐私政策」就测了个寂寞。
      { path: '/terms', meta: { legalKey: 'terms' }, component: { render: () => null } },
      { path: '/privacy', meta: { legalKey: 'privacy' }, component: { render: () => null } },
      { path: '/rules', meta: { legalKey: 'rules' }, component: { render: () => null } },
      { path: '/:pathMatch(.*)*', component: { render: () => null } },
    ],
  })
  await router.push('/')
  await router.isReady()

  return { globalComponents, router, requiredProps }
}

/** 断言辅助：HTML 中应包含 / 不应包含的内容 */
export function expectIncludes(html, needle, label) {
  if (!html.includes(needle)) {
    throw new Error(`${label || `应包含 ${JSON.stringify(needle)}`}（未找到）`)
  }
}

export function expectExcludes(html, needle, label) {
  if (html.includes(needle)) {
    throw new Error(`${label || `不应包含 ${JSON.stringify(needle)}`}（却找到了）`)
  }
}

export { WEB_ROOT, SRC_DIR }
