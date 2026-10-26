import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

import { renderComponent, createPiniaWithState, createRenderEnv } from './render.mjs'

/**
 * 首屏启动遮罩 / 顶部路由进度条与 App.vue 的接线
 *
 * 时序逻辑本身在 bootScreen.test.js 里用假时钟测（那是最容易写错的部分）。
 * 这里测的是**接线**：状态真的驱动了 DOM，以及两个必须守住的约束 ——
 * 启动期间应用壳是 inert 的、遮罩不能盖住 toast。
 */

const __dirname = dirname(fileURLToPath(import.meta.url))
const WEB_ROOT = join(__dirname, '..')
const APP_SOURCE = readFileSync(join(WEB_ROOT, 'src', 'App.vue'), 'utf8')

const { useRouteLoading, markRouteLoading, markRouteLoaded } = await import(
  new URL('../src/hooks/useRouteLoading/index.js', import.meta.url).href
)

const state = {
  user: { initialized: true, userInfo: {} },
  shop: { shopClass: [], loading: false },
  cart: {},
  favorite: {},
}

async function renderApp() {
  const [pinia, env] = await Promise.all([createPiniaWithState(state), createRenderEnv()])
  return renderComponent('/App.vue', {
    plugins: [pinia, env.router],
    globalComponents: env.globalComponents,
  })
}

// ── 路由进度条 ─────────────────────────────────────────────

test('路由切换中：顶部进度条出现（导航从此刻起就有反馈）', async () => {
  markRouteLoading()
  try {
    const html = await renderApp()
    assert.match(html, /class="route-progress"/, '导航中应渲染进度条')
    assert.match(html, /role="progressbar"/, '进度条要有 progressbar 语义')
    assert.match(html, /aria-label="页面加载中"/)
  } finally {
    markRouteLoaded()
  }
})

test('导航结束：进度条收起，不留一条线挂在页面顶部', async () => {
  markRouteLoaded()
  const html = await renderApp()
  assert.equal(html.includes('route-progress'), false)
})

test('状态是全局单例，组件读得到（marking 与渲染共用同一份状态）', () => {
  const { loading } = useRouteLoading()
  markRouteLoading()
  assert.equal(loading.value, true)
  markRouteLoaded()
  assert.equal(loading.value, false)
})

// ── 启动遮罩与应用壳的 inert ───────────────────────────────

test('启动未结束：应用壳是 inert 的（Tab 键不能跑进还没就绪的界面）', async () => {
  // booting 初始为 true，SSR 不执行 onMounted，因此这就是首屏的真实状态
  const html = await renderApp()
  assert.match(html, /<div class="app-container" inert/, '启动期间应用壳应带 inert')
})

test('启动期间遮罩挂在应用壳**外面**：否则 inert 会把遮罩自己也罩住', () => {
  // 用源码级断言兜住结构：inert 加在 .app-container 上，
  // 遮罩若被写进这个容器内部，就会连它一起失效
  const containerStart = APP_SOURCE.indexOf('class="app-container"')
  const bootStart = APP_SOURCE.indexOf('class="boot-screen"')
  const containerEnd = APP_SOURCE.indexOf('</div>', APP_SOURCE.indexOf('<ToastHost />'))

  assert.ok(containerStart > -1 && bootStart > -1 && containerEnd > -1)
  assert.ok(
    bootStart > containerEnd,
    `遮罩必须排在 .app-container 闭合之后，实际 boot=${bootStart} containerEnd=${containerEnd}`
  )
})

test('遮罩压在 toast 之下：启动期间的告警必须看得见', () => {
  // 层级统一走 variables.css 的 --z-* 令牌：遮罩 --z-boot < toast --z-toast
  assert.match(APP_SOURCE, /\.boot-screen \{[\s\S]*?z-index: var\(--z-boot\);/, '遮罩应取 --z-boot')
  assert.match(APP_SOURCE, /\.route-progress \{[\s\S]*?z-index: var\(--z-sticky\);/, '进度条应取 --z-sticky')

  // 桥接层把 --z-* 指到 EC 的 --ec-z-*，所以要**顺着 var() 解析一次**再比数值。
  // 直接正则会读到空字符串（Number('') === 0），于是所有比较都假通过。
  const vars = readFileSync(join(WEB_ROOT, 'src', 'assets', 'styles', 'variables.css'), 'utf8')
  const ecTokens = ['semantic'].map((f) =>
    readFileSync(join(WEB_ROOT, 'src', 'assets', 'ec', 'tokens', `${f}.css`), 'utf8')
  )
  const layerOf = (source, name) => {
    const raw = (source.match(new RegExp(`${name}:\\s*([^;]+);`)) || [])[1]
    return raw ? raw.trim() : null
  }
  const valueOf = (name) => {
    let raw = layerOf(vars, name)
    assert.ok(raw, `${name} 必须定义`)
    const ref = raw.match(/var\((--ec-[a-z0-9-]+)\)/)
    if (ref) {
      const ecRaw = ecTokens.map((t) => layerOf(t, ref[1])).find(Boolean)
      assert.ok(ecRaw, `${name} 指向的 ${ref[1]} 必须在 EC 令牌层里存在`)
      raw = ecRaw
    }
    const num = Number(raw.replace(/px$/, ''))
    assert.ok(Number.isFinite(num), `${name} 应能解析出数值，实际 ${raw}`)
    return num
  }

  // Toast 层由设计系统的 `.ec-toast-layer` 直接取 `--ec-z-toast`，
  // 桥接层不再保留 `--z-toast` 别名（无消费者的令牌会被死令牌检查拦下），
  // 因此这里直接读 EC 令牌比较。
  const ecValueOf = (name) => {
    const raw = ecTokens.map((t) => layerOf(t, name)).find(Boolean)
    assert.ok(raw, `${name} 必须在 EC 令牌层里存在`)
    const num = Number(raw.replace(/px$/, ''))
    assert.ok(Number.isFinite(num), `${name} 应能解析出数值，实际 ${raw}`)
    return num
  }

  assert.ok(valueOf('--z-boot') < ecValueOf('--ec-z-toast'), '--z-boot 必须小于 toast 层')
  // Dialog / Drawer 改用 `.ec-overlay` 后，弹窗层级由它自带的 `--ec-z-overlay` 决定，
  // 桥接层不再转出 `--z-modal`（同样为了不留无消费者令牌）。
  assert.ok(valueOf('--z-nav') < ecValueOf('--ec-z-overlay'), '导航必须低于弹窗遮罩')
  assert.ok(ecValueOf('--ec-z-overlay') < valueOf('--z-boot'), '启动遮罩必须压在弹窗之上')
  // EC 的刻度里下拉（200）高于吸顶（100）：浮层必须能盖过顶栏，
  // 否则吸顶栏一滚到顶部就会把用户菜单裁掉半截。
  assert.ok(valueOf('--z-dropdown') > valueOf('--z-nav'), '下拉必须压过吸顶导航')
})

test('尊重减少动态效果：进度条与遮罩都有降级', () => {
  assert.match(APP_SOURCE, /@media \(prefers-reduced-motion: reduce\)/)
  const block = APP_SOURCE.slice(APP_SOURCE.indexOf('prefers-reduced-motion: reduce'))
  assert.match(block, /\.route-progress-bar \{[^}]*animation: none/, '进度条动画应停下')
  assert.match(block, /\.boot-inner[^}]*\.u-spinner/, '旋转的 spinner 也应停下')
})

// ── onMounted 的接线 ───────────────────────────────────────

test('启动结束一定会放行：finishBoot 在 finally 里（失败也不能永远盖着）', () => {
  const onMountedBlock = APP_SOURCE.slice(APP_SOURCE.indexOf('onMounted(async () => {'))
  const finallyAt = onMountedBlock.indexOf('} finally {')
  const finishAt = onMountedBlock.indexOf('finishBoot()')

  assert.ok(finallyAt > -1, 'onMounted 应有 finally')
  assert.ok(finishAt > finallyAt, 'finishBoot 必须在 finally 里，而不是 try 的末尾')
  assert.match(onMountedBlock.slice(finallyAt, finishAt), /booting\.value = false/)
})

test('启动只等「身份 + 首次路由」，不等商品数据（那个有骨架屏）', () => {
  const onMountedBlock = APP_SOURCE.slice(APP_SOURCE.indexOf('onMounted(async () => {'))
  const finishAt = onMountedBlock.indexOf('finishBoot()')
  const shopAt = onMountedBlock.indexOf('shopStore.init()')

  assert.ok(shopAt > finishAt, 'shopStore.init() 必须排在启动放行之后，否则遮罩会白等一次商品请求')
})
