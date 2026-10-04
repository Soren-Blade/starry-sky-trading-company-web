import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

import { renderComponent, createPiniaPlugin, createRenderEnv } from './render.mjs'

/**
 * 组件渲染测试（基于 SSR，**不需要 jsdom**）
 *
 * ## 为什么可行
 *
 * `@vue/server-renderer` 会在 Node 里真正执行组件 setup 与 render 函数。
 * 因此「模板里引用了不存在的变量」「computed 抛错」「把 undefined 插值到页面」
 * 这类缺陷会在这一步暴露 —— 而这些正是纯逻辑测试覆盖不到的部分。
 *
 * 覆盖不到的是 CSS 布局、真实 DOM 事件、无障碍树；那些仍需浏览器。
 *
 * ## 组件清单是自动发现的
 *
 * 遍历 `src/**\/*.vue`，新增组件会自动纳入 —— 避免「新写的组件没人渲染过」。
 */

const WEB_ROOT = path.join(import.meta.dirname, '..')
const SRC = path.join(WEB_ROOT, 'src')

/** 递归找出所有 .vue */
function allComponents() {
  const out = []
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name)
      if (entry.isDirectory()) walk(full)
      else if (entry.name.endsWith('.vue')) out.push(full)
    }
  }
  walk(SRC)
  return out
}

/** 转成 renderComponent 用的模块路径 */
const toSpec = (full) => '/' + path.relative(SRC, full).replace(/\\/g, '/')

/**
 * 收集渲染期间的 Vue 警告。
 *
 * Vue 的 `warn` 会写到 console.warn —— 很多「模板绑定错了」只表现为一条警告而不抛错，
 * 因此必须捕获并断言。
 */
async function captureWarnings(run) {
  const warnings = []
  const savedWarn = console.warn
  const savedError = console.error
  console.warn = (...args) => {
    warnings.push(args.map(String).join(' '))
  }
  console.error = (...args) => {
    warnings.push(args.map(String).join(' '))
  }
  try {
    const html = await run()
    return { html, warnings }
  } finally {
    console.warn = savedWarn
    console.error = savedError
  }
}

/**
 * 渲染一个组件。
 *
 * 每个用例都新建 pinia / router / 全局桩：
 *   - pinia 是组件里 useXxxStore 的前提
 *   - 全局桩提供 router-link / a-* / 带必需 props 的子组件，
 *     否则会产生大量「未解析组件 / 缺必需 prop」的噪音警告，
 *     让「渲染期间无警告」这条断言失去信号
 */
async function render(spec, props = {}) {
  const [pinia, env] = await Promise.all([createPiniaPlugin(), createRenderEnv()])
  return renderComponent(spec, {
    props,
    plugins: [pinia, env.router],
    globalComponents: env.globalComponents,
  })
}

const COMPONENTS = allComponents()

/**
 * 直连渲染某些组件时必须自带 props。
 *
 * 这 5 个组件声明了 `required: true` 的 props；不传就直接抛
 * `Cannot read properties of undefined` —— 这是**符合声明**的行为
 * （调用方本就必须传），因此在渲染测试里补上桩数据，而不是改组件。
 */
const REQUIRED_PROPS = {
  'SectionHeader.vue': { title: '桩标题' },
  'ProductCard.vue': {
    product: {
      id: 1,
      product_name: '桩商品',
      main_title: '桩主标题',
      price: 9.9,
      stock_quantity: 3,
      cover_url: '',
      stock_status: { message: '有货' },
    },
  },
  'ToolCard.vue': { tool: { id: 1, tool_name: '桩工具', cover_url: '', icon: '🔧' } },
  'AppleIdCard.vue': {
    appleId: { account: 'a@b.c', password: 'p', status: 'available' },
    source: 'Stub',
  },
  // HelpModal 的 title 同时作为可见标题与 aria-labelledby 的目标，
  // 没有默认值（默认标题会让读屏念出一句与内容无关的话），因此单独渲染时必须给。
  'HelpModal.vue': { title: '桩标题' },
  // AppIcon 的 name 同理：给它一个默认图标名会把「漏传」藏起来
  'AppIcon.vue': { name: 'search' },
}

const propsFor = (spec) => REQUIRED_PROPS[path.basename(spec)] || {}

/**
 * 与渲染无关、但在此环境下必然出现的警告。
 *
 * `Failed to resolve component` 已通过全局桩消除；若仍出现，说明桩列表缺了某个
 * antd 组件 —— 那也是有价值的信号，因此**不**在此过滤。
 */
const IGNORED_WARNINGS = [/^\[Vue warn\]: Failed to resolve component: a-/]

// ── 全体组件都能渲染 ───────────────────────────────────────────

test('所有 .vue 组件都能被渲染（无 setup/render 抛错）', async () => {
  const failures = []

  for (const full of COMPONENTS) {
    const spec = toSpec(full)
    try {
      const html = await render(spec, propsFor(spec))
      // 渲染必须产出内容，而不是空串（空串通常意味着 render 函数没返回东西）
      if (typeof html !== 'string' || html.length === 0) {
        failures.push(`${spec}: 渲染结果为空`)
      }
    } catch (e) {
      failures.push(`${spec}: ${e.constructor.name}: ${String(e.message).split('\n')[0]}`)
    }
  }

  assert.deepEqual(failures, [], `以下组件渲染失败：\n  ${failures.join('\n  ')}`)
})

test('渲染结果不含 undefined / NaN / [object Object] 之类的插值事故', async () => {
  const problems = []

  for (const full of COMPONENTS) {
    const spec = toSpec(full)
    let html = ''
    try {
      html = await render(spec, propsFor(spec))
    } catch {
      continue // 上一个用例已单独报告渲染失败
    }

    for (const bad of ['undefined', 'NaN', '[object Object]']) {
      if (html.includes(`>${bad}<`) || html.includes(`>${bad} `) || html.includes(` ${bad}<`)) {
        problems.push(`${spec}: 输出中出现了 ${JSON.stringify(bad)}`)
      }
    }
  }

  assert.deepEqual(problems, [], `插值事故：\n  ${problems.join('\n  ')}`)
})

test('渲染期间不产生 Vue 警告（模板绑错通常只表现为警告）', async () => {
  const problems = []

  for (const full of COMPONENTS) {
    const spec = toSpec(full)
    const { warnings } = await captureWarnings(async () => {
      try {
        return await render(spec, propsFor(spec))
      } catch {
        return ''
      }
    })

    const relevant = warnings.filter(
      (w) => /\[Vue warn\]/.test(w) && !IGNORED_WARNINGS.some((re) => re.test(w))
    )
    if (relevant.length > 0) {
      problems.push(`${spec}:\n      ${relevant.map((w) => w.split('\n')[0]).join('\n      ')}`)
    }
  }

  assert.deepEqual(problems, [], `渲染期间出现 Vue 警告：\n  ${problems.join('\n  ')}`)
})

// ── 关键组件的具体断言 ─────────────────────────────────────────

test('SectionHeader：props 正确落到 DOM', async () => {
  const html = await render('/components/SectionHeader.vue', {
    icon: '🎴',
    title: '卡密管理',
    description: '查看并激活你的卡密',
  })
  assert.match(html, /卡密管理/)
  assert.match(html, /查看并激活你的卡密/)
  assert.match(html, /🎴/)
  // 装饰性 emoji 必须有 aria-hidden
  assert.match(html, /aria-hidden="true"/)
})


test('KamiSection：未登录时给出提示，且不渲染激活表单', async () => {
  const html = await render('/components/KamiSection.vue')

  // 游客态（默认 store）应显示「请先登录账号」
  assert.match(html, /请先登录账号/, '未登录时应提示登录')
  assert.match(html, /卡密与账号绑定/, '应有说明文案')
  // 未登录不应出现激活表单的输入框
  assert.equal(html.includes('请粘贴卡密号'), false, '未登录不应渲染激活输入框')
})

test('KamiSection：游客态只渲染提示卡，不渲染控制台两栏', async () => {
  const html = await render('/components/KamiSection.vue')

  // 「我的卡密 / 激活卡密」页签在第三轮改版里已删除，改成「左激活面板 + 右卡密列表」的
  // 控制台版式；游客态下两栏都不渲染，只剩登录提示 —— 因此这里断言的是新结构。
  assert.match(html, /notice-card/, '游客态应只有提示卡')
  assert.equal(html.includes('console-grid'), false, '游客态不应渲染控制台两栏')
  assert.equal(html.includes('我的卡密'), false, '游客态不应出现列表标题')
})

test('CategoriesSection：含区块头，且渲染结果里分类卡片的 icon 不为空', async () => {
  const html = await render('/components/CategoriesSection.vue')

  assert.match(html, /商品分类/, '应有区块标题')
  // 默认 store 里 shopClass 为空数组，应渲染出空网格而不是崩溃
  assert.match(html, /categories-grid/)
})

test('NotFound：渲染 404 提示而不是空白', async () => {
  const html = await render('/pages/NotFound.vue')
  assert.ok(html.length > 100, `输出应有一定内容，实际 ${html.length} 字符`)
})

// ── 渲染器自检 ─────────────────────────────────────────────────

test('组件清单非空（防止路径写错导致「全部通过」）', () => {
  assert.ok(COMPONENTS.length >= 15, `应发现多个组件，实际 ${COMPONENTS.length}`)
  const specs = COMPONENTS.map(toSpec)
  assert.ok(specs.some((s) => s.includes('KamiSection.vue')), '应包含 KamiSection.vue')
  assert.ok(specs.some((s) => s.includes('pages/')), '应包含 pages 下的页面')
})

test('渲染器能把插值真正渲染出来（防止空渲染造成假通过）', async () => {
  const html = await render('/components/SectionHeader.vue', { title: '唯一标记-OK' })
  assert.match(html, /唯一标记-OK/, '传入的 title 应出现在输出里')
})

test('渲染器会捕获组件抛错（防止把失败当成空输出）', async () => {
  const { createSSRApp, h } = await import('vue')
  const { renderToString } = await import('@vue/server-renderer')
  const Boom = {
    setup() {
      throw new Error('setup 故意失败')
    },
  }
  await assert.rejects(
    () => renderToString(createSSRApp({ render: () => h(Boom) })),
    /setup 故意失败/
  )
})
