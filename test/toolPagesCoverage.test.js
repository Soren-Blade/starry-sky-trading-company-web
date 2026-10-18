import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, readdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { TOOL_PAGES } from '../src/constants/content.js'

/**
 * 工具清单四向一致性
 *
 * 一个工具要能用，四个来源必须同时存在且路径一致：
 *   1. 路由（`src/router/index.js` 里的 `path` → `component`）
 *   2. 页面文件（`src/pages/tools/*.vue`，外加 3 个早期页面）
 *   3. 页头文案常量（`TOOL_PAGES[<path>]`，来自 `src/constants/`）
 *   4. 数据库 `sstc.tools.tool_path`（本测试用 `content.js` 的快照间接代表，库里那份靠
 *      `docs/tools-feature-matrix.md` 与迁移脚本对齐）
 *
 * 过往教训：`/image/compressor` 与 `/dev/json-formatter` 曾经「常量有、路由没有」，
 * 用户点「打开工具」直接 404；另有 30 个扩展页一度「页面有、路由漏登记」。这条测试
 * 就是为这两类漏登记兜底的。
 */

const __dirname = dirname(fileURLToPath(import.meta.url))
const WEB_ROOT = join(__dirname, '..')

const read = (relative) => readFileSync(join(WEB_ROOT, relative), 'utf8')

/** 早期就存在的工具页，不在 `src/pages/tools/` 目录下 */
const LEGACY_PAGES = {
  '/video/downloader': 'src/pages/VideoTool.vue',
  '/image/compressor': 'src/pages/ImageCompressor.vue',
  '/dev/json-formatter': 'src/pages/JsonFormatter.vue',
}

/** 从路由源码里抽出 `path` + `component` 对（保持顺序，用于「最近邻」配对） */
function parseRoutes(source) {
  const routes = []
  const pattern = /path:\s*'([^']+)'/g
  let match
  while ((match = pattern.exec(source)) !== null) {
    const rest = source.slice(match.index)
    const component = /component:\s*\(\)\s*=>\s*import\('([^']+)'\)/.exec(rest)
    if (!component) continue
    routes.push({ path: match[1], file: component[1] })
  }
  return routes
}

const ROUTES = parseRoutes(read('src/router/index.js'))
const TOOL_DIR = 'src/pages/tools'
const TOOL_FILES = readdirSync(join(WEB_ROOT, TOOL_DIR))
  .filter((name) => name.endsWith('.vue'))
  .sort()

const normalize = (file) => file.replace(/^@\//, 'src/')

const routeByPath = new Map(ROUTES.map((route) => [route.path, normalize(route.file)]))

// ══════════════════════════════════════════════════════════
// 1. 每个 TOOL_PAGES 常量都要有路由 + 页面
// ══════════════════════════════════════════════════════════

test('每个工具页常量都有对应的路由与页面文件', () => {
  const missing = []
  for (const toolPath of Object.keys(TOOL_PAGES)) {
    const file = routeByPath.get(toolPath)
    if (!file) {
      missing.push(`${toolPath} → 没有路由`)
      continue
    }
    if (!/\.vue$/.test(file)) missing.push(`${toolPath} → 路由没有指向 .vue 文件`)
  }
  assert.deepEqual(missing, [], `以下工具缺少路由：\n${missing.join('\n')}`)
})

test('每个工具页常量都指向真实存在的 .vue 文件', () => {
  const missing = []
  for (const toolPath of Object.keys(TOOL_PAGES)) {
    const file = routeByPath.get(toolPath)
    if (!file) continue
    try {
      read(file)
    } catch {
      missing.push(`${toolPath} → ${file} 不存在`)
    }
  }
  assert.deepEqual(missing, [], `以下工具的路由指向了不存在的文件：\n${missing.join('\n')}`)
})

// ══════════════════════════════════════════════════════════
// 2. `src/pages/tools/` 里的每个页面都要被路由登记
// ══════════════════════════════════════════════════════════

test('src/pages/tools 下每个页面都有路由，没有「孤儿页面」', () => {
  const routed = new Set(
    ROUTES.map((route) => normalize(route.file))
      .filter((file) => file.startsWith(`${TOOL_DIR}/`)),
  )
  const orphans = TOOL_FILES.map((name) => `${TOOL_DIR}/${name}`).filter((file) => !routed.has(file))
  assert.deepEqual(orphans, [], `以下页面没有被任何路由引用：\n${orphans.join('\n')}`)
})

// ══════════════════════════════════════════════════════════
// 3. 早期页面的重定向/清单不能丢
// ══════════════════════════════════════════════════════════

test('三个早期工具页仍在路由表里', () => {
  for (const [toolPath, file] of Object.entries(LEGACY_PAGES)) {
    assert.equal(routeByPath.get(toolPath), file, `${toolPath} 应当指向 ${file}`)
  }
})

// ══════════════════════════════════════════════════════════
// 4. 路径唯一性：同一个 path 被登记两次时 Vue Router 会静默取后者
// ══════════════════════════════════════════════════════════

test('路由里没有重复的工具路径', () => {
  assert.deepEqual(ROUTES.length, routeByPath.size, '存在重复注册的 path')
})

// ══════════════════════════════════════════════════════════
// 5. 工具页必须用统一壳层（新增页面最容易忘的一步）
// ══════════════════════════════════════════════════════════

test('所有工具页都用 ToolPageShell 统一骨架', () => {
  const offenders = []
  for (const name of TOOL_FILES) {
    const source = read(`${TOOL_DIR}/${name}`)
    if (!source.includes('ToolPageShell')) offenders.push(`${TOOL_DIR}/${name}`)
  }
  assert.deepEqual(offenders, [], `以下页面没有使用 ToolPageShell：\n${offenders.join('\n')}`)
})
