import test from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { basename, dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { renderComponent, createPiniaPlugin, createRenderEnv, expectIncludes } from './render.mjs'
import { PAGES, TOOL_PAGE, TOOL_PAGES, TOOL_RESULT, VIDEO_TOOL } from '../src/constants/content.js'

/**
 * 工具页骨架（五个工具页的结构契约）
 *
 * 需求：所有工具页都要有「页头 + 输入区 + 操作区 + 结果区四态 + 辅助信息」，
 * 风格统一、不再各写一套页头；图片压缩与 JSON 格式化两个 tool_path 此前**没有路由**，
 * 工具页点「打开工具」会跳到 404。
 *
 * SSR 能覆盖的：外壳与结果区的渲染结果、每个页面用同一套壳。
 * SSR 覆盖不到的：拖拽、剪贴板、TOTP 计算等真实交互 —— 由源码级断言兜住结构。
 */

const __dirname = dirname(fileURLToPath(import.meta.url))
const WEB_ROOT = join(__dirname, '..')

const read = (relative) => readFileSync(join(WEB_ROOT, relative), 'utf8')

const ROUTER_SOURCE = read('src/router/index.js')
const PANE_SOURCE = read('src/components/ToolResultPane.vue')
const SHELL_SOURCE = read('src/components/ToolPageShell.vue')

/**
 * tool_path（与数据库 sstc.tools.tool_path 一一对应）→ 页面文件。
 *
 * 这张表就是「工具清单」的代码侧快照：库里改路径而这里没跟上，
 * 工具页点「打开工具」就会 404。
 */
const TOOL_ROUTES = {
  '/video/downloader': 'src/pages/VideoTool.vue',
  '/image/compressor': 'src/pages/ImageCompressor.vue',
  '/dev/json-formatter': 'src/pages/JsonFormatter.vue',
  '/other/2fa': 'src/pages/2FA.vue',
  '/other/appleId': 'src/pages/AppleId.vue',
}

const escapeRe = (value) => value.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&')

async function render(spec, props = {}) {
  const [pinia, env] = await Promise.all([createPiniaPlugin(), createRenderEnv()])
  return renderComponent(spec, {
    props,
    plugins: [pinia, env.router],
    globalComponents: env.globalComponents,
  })
}

// ══════════════════════════════════════════════════════════
// 路由 ↔ 页面 ↔ 常量：三个来源必须一一对上
// ══════════════════════════════════════════════════════════

test('五个工具的 tool_path 都同时有路由、页面文件与页头常量', () => {
  for (const [toolPath, file] of Object.entries(TOOL_ROUTES)) {
    assert.match(
      ROUTER_SOURCE,
      new RegExp(`path: '${escapeRe(toolPath)}'`),
      `${toolPath} 必须有一条路由（库里 tool_path 指向它）`,
    )
    assert.match(
      ROUTER_SOURCE,
      new RegExp(`import\\('@\\/pages\\/${escapeRe(basename(file))}'\\)`),
      `${toolPath} 的组件必须是 ${basename(file)}`,
    )
    assert.ok(existsSync(join(WEB_ROOT, file)), `${file} 必须存在（否则路由懒加载 404）`)
    assert.ok(TOOL_PAGES[toolPath], `常量表 TOOL_PAGES 缺少 ${toolPath}（页头文案没有单一出处）`)
  }
})

test('此前的两条死链（图片压缩 / JSON 格式化）已经可以访问', () => {
  // 这两个 tool_path 来自数据库，此前只有卡片、没有路由：
  // 点「打开工具」会新开一个 404 页面，而两边各自看都「没问题」。
  for (const toolPath of ['/image/compressor', '/dev/json-formatter']) {
    const at = ROUTER_SOURCE.indexOf(`path: '${toolPath}'`)
    assert.ok(at > -1, `${toolPath} 必须有路由`)

    // 截到该 route 对象结束为止，确认它没有落在鉴权守卫后面：
    // 这两个工具都是免费工具，挂上 requiresAuth 会把未登录用户挡在自己的工具之外。
    const body = ROUTER_SOURCE.slice(at, ROUTER_SOURCE.indexOf('},', at))
    assert.equal(/requiresAuth/.test(body), false, `${toolPath} 是免费工具，不应要求登录`)
  }
})

test('工具清单以数据库为准：常量表与路由表数量一致', () => {
  const configured = Object.keys(TOOL_PAGES)

  // 五个来自 sstc.tools 的原始工具：常量表里必须有一份页头文案
  for (const toolPath of Object.keys(TOOL_ROUTES)) {
    assert.ok(configured.includes(toolPath), `TOOL_PAGES 缺少 ${toolPath}`)
  }

  // 扩展工具页（2026-10-18 那批）：常量表里出现的每个 tool_path
  // 都必须真的有路由 —— 否则「工具页骨架」就是一堆点开即 404 的常量。
  for (const toolPath of configured) {
    assert.ok(
      ROUTER_SOURCE.includes(`path: '${toolPath}'`),
      `${toolPath} 在常量表里但没有路由（点开即 404）`,
    )
  }
})

// ══════════════════════════════════════════════════════════
// 五个页面共用同一套壳与结果区
// ══════════════════════════════════════════════════════════

test('五个工具页都用公共外壳与共享四态，页头不再各写一套', () => {
  for (const file of Object.values(TOOL_ROUTES)) {
    const source = read(file)
    assert.match(source, /ToolPageShell/, `${file} 必须走公共工具页外壳`)
    assert.equal(
      /page-shell-head/.test(source),
      false,
      `${file} 不应自己写页头 —— 那是外壳的职责，重复写会立刻产生两套间距`,
    )

    // 结果区有两种合法形态：页面自己用 ToolResultPane，
    // 或交给一个**自己带四态**的区块（Apple ID 的列表连数据流都在 AppleIdSection 里）。
    const ownPane = /ToolResultPane/.test(source) && /:state=/.test(source)
    const delegated = /<AppleIdSection/.test(source)
    assert.ok(ownPane || delegated, `${file} 的结果区必须呈现空/加载/成功/失败四态`)
  }
})

test('被委派的结果区（Apple ID 列表）同样使用共享的加载与空态类', () => {
  const source = read('src/components/AppleIdSection.vue')

  assert.match(source, /u-spinner/, '加载态要复用共享 spinner')
  assert.match(source, /role="status"/, '加载态要能被读屏播报')
  assert.match(source, /u-loading-block/, '区块级加载态复用共享占位类')
})

test('每个工具页都带辅助信息（使用说明 / 注意事项）', () => {
  // 辅助信息有两种合法载体：
  //   1. 页面自己的 #aside 插槽（外壳在宽屏把它排成右栏）；
  //   2. 被委派的结果区自带说明区 —— 共享 Apple ID 页属于这种：
  //      说明与风险提示移到了 AppleIdSection 的左轨（sticky 在账号列表旁，
  //      长列表滚动时仍可见；≤991px 折到列表上方），页面本身不再挂 #aside，
  //      因此不能再用 `#aside` 作为标签页的判据。
  // 2FA 继续用它已有的教程区（fp-tutorial）充当辅助信息。
  const delegatedGuide = read('src/components/AppleIdSection.vue')

  for (const [toolPath, file] of Object.entries(TOOL_ROUTES)) {
    if (toolPath === '/other/appleId') {
      assert.match(
        delegatedGuide,
        /guide-toggle/,
        'Apple ID 的使用说明折叠块应由 AppleIdSection 左轨承载',
      )
      assert.match(
        delegatedGuide,
        /risk-warning/,
        'Apple ID 的风险提示应由 AppleIdSection 左轨顶部承载',
      )
      continue
    }

    const source = read(file)
    const hasAside = /#aside/.test(source)
    const hasTutorial = /fp-tutorial/.test(source)
    assert.ok(
      hasAside || hasTutorial,
      `${file} 必须给出使用说明或注意事项（${toolPath}）`,
    )
  }
})

test('外壳把「返回工具页」与「需卡密」做成同一处，页面不再各写一遍', () => {
  assert.match(SHELL_SOURCE, /VIDEO_TOOL\.backToTools/, '返回文案来自常量，不硬编码')
  assert.match(SHELL_SOURCE, /TOOL_PAGE\.needCardTag/, '需卡密标示文案来自常量')
  assert.match(SHELL_SOURCE, /page-shell-head/, '页头只使用全局的 .page-shell-*')
})

// ══════════════════════════════════════════════════════════
// 结果区四态（SSR）
// ══════════════════════════════════════════════════════════

test('结果区·空态：给出空态标题与说明，而不是一片空白', async () => {
  const html = await render('components/ToolResultPane.vue', { state: 'empty' })

  expectIncludes(html, 'u-empty', '空态用共享的 .u-empty')
  expectIncludes(html, TOOL_RESULT.emptyTitle, '空态标题走共享兜底文案')
})

test('结果区·加载态：对辅助技术播报「忙」', async () => {
  const html = await render('components/ToolResultPane.vue', { state: 'loading' })

  expectIncludes(html, 'u-spinner', '加载态用共享 spinner')
  expectIncludes(html, 'aria-busy="true"', '加载态要标记 aria-busy')
  expectIncludes(html, 'role="status"', '加载态要能被读屏播报')
})

test('结果区·失败态：用 role="alert" 说出原始报错', async () => {
  const html = await render('components/ToolResultPane.vue', {
    state: 'error',
    error: 'Unexpected token } in JSON at position 12',
  })

  expectIncludes(html, 'role="alert"', '失败态要立刻被播报')
  expectIncludes(html, 'Unexpected token } in JSON at position 12', '要显示真实报错原文')
})

test('结果区·成功态：内容与后续操作分开放', async () => {
  const html = await render('components/ToolResultPane.vue', { state: 'success' })

  expectIncludes(html, 'tool-result-body', '成功态有自己的容器')
})

// ══════════════════════════════════════════════════════════
// 外壳与页面（SSR）
// ══════════════════════════════════════════════════════════

test('外壳：标题 / 简介 / 返回入口 / 需卡密标示都按 props 渲染', async () => {
  const html = await render('components/ToolPageShell.vue', {
    title: '桩工具',
    description: '桩简介',
    requiresCard: true,
  })

  expectIncludes(html, 'page-shell-title', '标题用全局页头类')
  expectIncludes(html, '桩工具', '标题要渲染出来')
  expectIncludes(html, '桩简介', '简介要渲染出来')
  expectIncludes(html, VIDEO_TOOL.backToTools, '要有回工具页的出口')
  expectIncludes(html, TOOL_PAGE.needCardTag, '需卡密的工具要标示出来')
})

test('外壳：没有传眉标时沿用「工具分享」这一层级的眉标', async () => {
  const html = await render('components/ToolPageShell.vue', { title: '桩工具' })

  expectIncludes(html, PAGES.tools.eyebrow, '眉标有默认值，不显示空标签')
})

test('五个工具页都能直接渲染，且页头文案与常量一致', async () => {
  for (const [toolPath, file] of Object.entries(TOOL_ROUTES)) {
    const html = await render(file.replace(/^src\//, ''))
    const page = TOOL_PAGES[toolPath]

    expectIncludes(html, page.title, `${file} 的标题应来自 TOOL_PAGES`)
    expectIncludes(html, page.description, `${file} 的简介应来自 TOOL_PAGES`)
    expectIncludes(html, VIDEO_TOOL.backToTools, `${file} 要有回工具页的出口`)
    assert.equal(/undefined|NaN|\[object Object\]/.test(html), false, `${file} 渲染出了无效值`)
  }
})

test('结果区只用常量里的兜底文案，页面可以覆盖', () => {
  assert.match(PANE_SOURCE, /props\.title \|\| TOOL_RESULT\.emptyTitle/, '标题留空时用兜底')
  assert.match(PANE_SOURCE, /props\.description \|\| TOOL_RESULT\.emptyDesc/, '说明留空时用兜底')
})
