import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { renderComponent, createPiniaWithState, createRenderEnv } from './render.mjs'

const root = join(import.meta.dirname, '..')
const readSrc = (rel) =>
  readFileSync(join(root, 'src', rel), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')

test('首页商品失败态：渲染统一错误面板，标题不夹带后端原文', async () => {
  const pinia = await createPiniaWithState({ shop: { error: 'Request failed with status code 500' } })
  const env = await createRenderEnv()
  const html = await renderComponent('components/HotProductsSection.vue', {
    plugins: [pinia, env.router],
    globalComponents: env.globalComponents,
  })

  // 统一面板的结构：图标 + 标题 + 说明 + 技术细节 + 两个出口
  assert.match(html, /class="inline-error/)
  assert.match(html, /role="alert"/)
  assert.match(html, /商品加载失败/)
  assert.match(html, /我们这边没能连上服务/)
  assert.match(html, /查看技术信息/)
  assert.match(html, /重新请求/)
  assert.match(html, /联系客服/)

  // 后端原文只能出现在 <details> 里，不能出现在标题行
  const title = html.match(/class="inline-error__title"[^>]*>([^<]*)</)
  assert.ok(title, '找不到标题节点')
  assert.ok(!title[1].includes('500'), `标题不应含后端原文：${title[1]}`)
})

test('首页商品失败态：重试按钮调 store.init 并有进行中状态', () => {
  const src = readSrc('components/HotProductsSection.vue')
  assert.match(src, /@retry="retry"/)
  assert.match(src, /shopStore\.init\(\)/)
  assert.match(src, /:loading="loading"/)
  // 不要只重取商品：error 是分类与商品共用的字段
  assert.doesNotMatch(src, /shopStore\.getProducts\(/)
})

test('InlineErrorNote：重试按钮是文字按钮，禁用时 aria-busy', () => {
  const src = readSrc('components/InlineErrorNote.vue')
  assert.match(src, /:disabled="loading"/)
  assert.match(src, /:aria-busy="loading"/)
  assert.match(src, /emit\('retry'\)/)
  // 技术细节必须折叠，不能直接铺在正文里
  assert.match(src, /<details/)
  // 文字按钮：不能带填充底色
  assert.doesNotMatch(src, /\.inline-error__retry\s*\{[^}]*background:\s*var\(--primary\)/)
})

test('InlineErrorNote：窄屏改版式但不隐藏出口', () => {
  const src = readSrc('components/InlineErrorNote.vue')
  assert.match(src, /@media \(max-width: 767px\)/)
  assert.match(src, /flex-wrap: wrap/)
  assert.match(src, /@media \(max-width: 575px\)/)
})

test('InlineErrorNote：只用设计令牌，不写死色值', () => {
  const src = readSrc('components/InlineErrorNote.vue')
  const style = src.slice(src.indexOf('<style'))
  assert.doesNotMatch(style, /#[0-9a-fA-F]{3,8}\b/)
  assert.doesNotMatch(style, /rgba?\(/)
})

test('错误提示文案：中英齐备且不再责怪用户网络', async () => {
  const zh = readSrc('constants/content.js')
  assert.match(zh, /errorTitle: '商品加载失败'/)
  assert.match(zh, /errorHint: '我们这边没能连上服务，稍后再试一次。'/)
  assert.doesNotMatch(zh, /请检查网络连接后重新请求/)

  const en = readSrc('i18n/locales/en-US/commerce.js')
  assert.match(en, /errorTitle: 'Could not load products'/)
  assert.match(en, /errorTitle:/)
  assert.match(en, /errorSupport:/)
})
