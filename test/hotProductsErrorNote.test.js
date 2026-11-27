/**
 * 首页热门商品区块的错误态
 *
 * 用户报的原始问题：「`products-note products-note--error` 请求失败应该加一个
 * 重新请求的文字按钮」。所以这里守三件事：
 *   1. 错误态**真的渲染出**重试按钮（SSR 渲染，不是只搜源码）；
 *   2. 按钮接的是 store 的重新请求动作，且请求中会禁用（否则连点会打多次接口）；
 *   3. 排版各段有对应样式与窄屏堆叠规则，且不写死色值。
 */
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { renderComponent, createPiniaWithState, createRenderEnv } from './render.mjs'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const SRC = path.join(HERE, '..', 'src')
const read = (rel) => fs.readFileSync(path.join(HERE, '..', rel), 'utf8')
/** 去掉块注释再断言：说明文字里出现同名 API 不算残留实现 */
const readCode = (rel) => read(rel).replace(/\/\*[\s\S]*?\*\//g, '')

test('错误态渲染出原因、提示与「重新请求」文字按钮', async () => {
  // 组件里 useProductActions() 会 useRouter()：不装 router 会出
  // `injection "Symbol(router)" not found` 警告，把「无警告」这条信号冲淡
  const [pinia, env] = await Promise.all([
    createPiniaWithState({ shop: { error: '网络异常', loading: false } }),
    createRenderEnv(),
  ])

  const html = await renderComponent('components/HotProductsSection.vue', {
    props: { variant: 'section' },
    plugins: [pinia, env.router],
    globalComponents: env.globalComponents,
  })

  assert.match(html, /products-note--error/, '错误态容器应存在')
  assert.match(html, /role="alert"/, '错误态要让读屏软件立即播报')
  assert.match(html, /商品加载失败：/, '要带上前缀文案')
  assert.match(html, /网络异常/, '要显示具体失败原因')
  assert.match(html, /请检查网络连接后重新请求/, '要有「接下来怎么办」的副行')

  // 文字按钮：必须是 <button type="button">，带文案与图标
  assert.match(html, /<button[^>]*class="products-note__retry"/, '要有重试按钮')
  assert.match(html, /type="button"/, '按钮必须是 button 而不是可点击的 span')
  assert.match(html, /重新请求/, '按钮文案是「重新请求」')
  assert.match(html, /products-note__icon[\s\S]*?<svg/, '要有警示图标')
})

test('重试走 store 的重新请求动作，并在请求中禁用', () => {
  const source = readCode('src/components/HotProductsSection.vue')

  assert.match(source, /@click="retry"/, '按钮要绑到 retry')
  assert.match(source, /const retry = \(\) => \{[\s\S]*?shopStore\.init\(\)/, 'retry 应调用 store 的 init()')
  // error 是 categories/products 共用的字段，只重取商品会让分类失败时按钮永远点不好
  assert.equal(/shopStore\.getProducts\(/.test(source), false, '不要只重取商品：错误可能来自分类接口')
  assert.match(source, /:disabled="loading"/, '请求中要禁用，避免连点打多次接口')
  assert.match(source, /:aria-busy="loading"/, '请求中要有 aria-busy')
  assert.match(source, /PRODUCT_GRID\.retrying/, '请求中要换成进行中文案')
})

test('错误态排版与多端适配都走令牌，窄屏竖排', () => {
  const source = readCode('src/components/HotProductsSection.vue')

  for (const cls of ['products-note__icon', 'products-note__body', 'products-note__title', 'products-note__hint', 'products-note__retry']) {
    assert.match(source, new RegExp(`\\.${cls} \\{`), `${cls} 应有样式`)
  }

  // 桌面：一条基线；窄屏：竖排堆叠
  const errorBlock = source.slice(source.indexOf('.products-note--error {'))
  assert.match(errorBlock.slice(0, errorBlock.indexOf('}')), /display: flex/, '桌面用 flex 三段式')
  assert.match(source, /@media \(max-width: 767px\)[\s\S]*\.products-note--error \{[\s\S]*flex-direction: column/, '窄屏要竖排')

  // 不得写死色值：颜色一律走令牌
  const colorLiterals = source.match(/(?:^|\s)(?:color|background|border-color):\s*#[0-9a-fA-F]{3,8}/g) || []
  assert.deepEqual(colorLiterals, [], '组件样式不得写死色值')
  const rgbLiterals = source.match(/(?:^|\s)(?:color|background|border-color):\s*rgba?\(/g) || []
  assert.deepEqual(rgbLiterals, [], '组件样式不得写死 rgb/rgba')
})

test('文案键双语齐备（新增键不能只写中文）', () => {
  const zh = read('src/constants/content.js')
  const en = read('src/i18n/locales/en-US/commerce.js')

  for (const key of ['errorHint', 'retry', 'retrying']) {
    assert.match(zh, new RegExp(`${key}:`), `中文缺 ${key}`)
    assert.match(en, new RegExp(`${key}:`), `英文缺 ${key}`)
  }
})

test('CSS 里引用的自定义属性都已在令牌表中定义', () => {
  const source = readCode('src/components/HotProductsSection.vue')
  const tokens = ['src/assets/styles/variables.css', 'src/assets/ec/tokens/semantic.css']
    .map((rel) => read(rel))
    .join('\n')

  const used = new Set([...source.matchAll(/var\((--[a-z0-9-]+)/g)].map((m) => m[1]))
  const missing = [...used].filter((name) => !new RegExp(`${name}\\s*:`).test(tokens))
  assert.deepEqual(missing, [], `未定义的令牌：${missing.join(', ')}`)
})

test('样式文件没有被误删的空规则', () => {
  const source = readCode('src/components/HotProductsSection.vue')
  assert.equal(/\{\s*\}/.test(source), false, '不应出现空规则块')
  assert.equal(SRC.length > 0, true)
})
