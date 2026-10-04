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

test('遮罩 z-index 压在 toast 之下：启动期间的告警必须看得见', () => {
  // toast 是 3000（global.css 的 .toast-host），遮罩取 2500
  assert.match(APP_SOURCE, /\.boot-screen \{[\s\S]*?z-index: 2500;/, '遮罩应为 2500')
  assert.match(APP_SOURCE, /\.route-progress \{[\s\S]*?z-index: 950;/, '进度条应为 950')
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
