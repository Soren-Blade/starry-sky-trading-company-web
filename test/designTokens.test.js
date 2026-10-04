import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const WEB_ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const SRC = path.join(WEB_ROOT, 'src')
const VARS = path.join(SRC, 'assets', 'styles', 'variables.css')

const read = (p) => fs.readFileSync(p, 'utf8')
const rel = (file) => path.relative(WEB_ROOT, file).replace(/\\/g, '/')

/** 递归列出 src 下的样式相关文件 */
function styleFiles() {
  const out = []
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name)
      if (entry.isDirectory()) walk(full)
      else if (/\.(vue|css|js)$/.test(entry.name)) out.push(full)
    }
  }
  walk(SRC)
  return out
}

/** 取出 .vue 的 <style> 段；纯 css/js 返回原文 */
function stylePartsOf(file, text) {
  if (file.endsWith('.vue')) {
    return [...text.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)].map((m) => m[1])
  }
  return [text]
}

/**
 * 令牌定义层。
 *
 * `src/theme/**` 与 `variables.css` 一样，是**写出令牌名与取值**的地方，
 * 不是消费令牌的地方。若把它们计入「使用次数」，
 * 每个令牌都会因为「在预设里被定义过」而显得有人用 —— 死令牌检查会假通过。
 */
const TOKEN_LAYER_DIR = `${path.sep}theme${path.sep}`
const isTokenDefinition = (file) =>
  path.basename(file) === 'variables.css' || file.includes(TOKEN_LAYER_DIR)

/** 去掉 CSS 注释，避免注释里提到的示例/历史说明被当作真实声明 */
function stripCssComments(text) {
  return text.replace(/\/\*[\s\S]*?\*\//g, '')
}

/** 从 variables.css 的 :root 里取出所有令牌名 */
function definedTokens() {
  const names = []
  for (const line of read(VARS).split('\n')) {
    const m = line.match(/^\s*(--[a-z0-9-]+)\s*:/)
    if (m) names.push(m[1])
  }
  return [...new Set(names)]
}

/** 每个令牌在「除令牌定义层以外」的文件里被引用的次数 */
function usageCounts(tokens, files) {
  const counts = Object.fromEntries(tokens.map((t) => [t, 0]))
  for (const file of files) {
    if (isTokenDefinition(file)) continue
    const text = read(file)
    for (const token of tokens) {
      // 用 \b 边界，避免 --shadow-md 命中 --shadow-md-hover 之类
      const re = new RegExp(`${token.replace(/-/g, '\\-')}\\b`, 'g')
      const found = text.match(re)
      if (found) counts[token] += found.length
    }
  }
  return counts
}

/**
 * 由**运行时注入**、因此不应在 variables.css 里声明的局部变量。
 *
 * 它们不是设计令牌，而是「组件把自己的值通过 CSS 变量传进样式」的通道：
 * `:style` 绑定或 JS 数据里赋值，样式侧只负责消费。
 * 把它们当成漏定义的令牌会让检查失去信号价值。
 */
const RUNTIME_SCOPED_VARS = [
  // 列表/卡片序号，组件用 :style="{ '--i': index }" 注入，供 .u-enter 计算错峰延迟
  '--i',
]

/** 统一断点（见 variables.css 末尾的文档注释与 project-ui-system Skill） */
const BREAKPOINTS = [1199, 991, 767, 575]

// ── 令牌卫生 ───────────────────────────────────────────────────

test('variables.css 中的每个令牌都至少被一处样式引用（无死令牌）', () => {
  const tokens = definedTokens()
  const counts = usageCounts(tokens, styleFiles())
  const unused = tokens.filter((t) => counts[t] === 0)

  // 死令牌会稀释「可用令牌」的信号，结果是作者继续写新的硬编码值 ——
  // 这正是本仓库此前的状态：16 个令牌无人使用，而组件里硬编码着它们的值
  assert.deepEqual(
    unused,
    [],
    `以下令牌定义了却无人使用，应删除或真正用上：\n  ${unused.join('\n  ')}`
  )
})

test('样式中引用的每个 --token 都必须在 variables.css 中定义（运行时注入的除外）', () => {
  const tokens = new Set(definedTokens())
  const problems = []

  for (const file of styleFiles()) {
    if (path.basename(file) === 'variables.css') continue
    const text = read(file)

    for (const rawPart of stylePartsOf(file, text)) {
      const part = stripCssComments(rawPart)
      for (const m of part.matchAll(/var\(\s*(--[a-z0-9-]+)/g)) {
        if (tokens.has(m[1])) continue
        if (RUNTIME_SCOPED_VARS.includes(m[1])) continue
        problems.push(`${rel(file)}: 使用了未定义的 ${m[1]}`)
      }
    }
  }

  assert.deepEqual(
    problems,
    [],
    // 真实案例：删除 --glass-backdrop 时漏掉了 Navbar 的 backdrop-filter 引用，
    // 会导致该属性静默失效（CSS 变量未定义时整条声明被丢弃）
    `以下样式引用了未定义的令牌：\n  ${problems.join('\n  ')}`
  )
})

// ── 断点纪律 ───────────────────────────────────────────────────

test('@media 中的断点只用统一的 1199 / 991 / 767 / 575', () => {
  const problems = []

  for (const file of styleFiles()) {
    const text = stripCssComments(read(file))
    for (const m of text.matchAll(/@media[^{]*?(?:max|min)-width:\s*(\d+)px/g)) {
      const px = Number(m[1])
      // 允许：max-width 用 575/767/991/1199；min-width 用其 +1 作为互补写法
      const ok = BREAKPOINTS.includes(px) || BREAKPOINTS.includes(px - 1)
      if (!ok) problems.push(`${rel(file)}: ${px}px`)
    }
  }

  assert.deepEqual(
    problems,
    [],
    `出现统一体系之外的断点（应用 ${BREAKPOINTS.join(' / ')}）：\n  ${problems.join('\n  ')}`
  )
})

test('同一文件内不得重复声明完全相同的媒体查询（应合并为一个块）', () => {
  const problems = []
  for (const file of styleFiles()) {
    const text = stripCssComments(read(file))
    const queries = [...text.matchAll(/@media\s*\(([^)]*)\)/g)].map((m) => m[1].trim())
    const seen = new Map()
    for (const q of queries) seen.set(q, (seen.get(q) || 0) + 1)
    for (const [q, n] of seen) {
      if (n > 1) problems.push(`${rel(file)}: "${q}" 出现 ${n} 次`)
    }
  }
  assert.deepEqual(problems, [], `重复的媒体查询应合并：\n  ${problems.join('\n  ')}`)
})

test('CSS 自定义属性不得出现在 @media 条件里（无效写法）', () => {
  const problems = []
  for (const file of styleFiles()) {
    if (/@media[^{]*var\(--/.test(stripCssComments(read(file)))) problems.push(rel(file))
  }
  assert.deepEqual(
    problems,
    [],
    `@media 条件里出现 var()，该条件不会按预期生效：\n  ${problems.join('\n  ')}`
  )
})

// ── 字体与加载 ─────────────────────────────────────────────────

test('字体令牌含中文字体栈（避免中文走系统默认字体）', () => {
  // 字体栈随令牌一起从 global.css 迁到了 variables.css（global.css 只消费 var(--font-*)），
  // 因此这里改为检查令牌定义处，语义不变：中文必须有显式的 CJK 字体兜底。
  const vars = read(VARS)
  for (const family of ['PingFang SC', 'Microsoft YaHei']) {
    assert.ok(vars.includes(family), `字体令牌应包含 ${family}`)
  }
  // 同时确认 global.css 真的消费了字体令牌，而不是各自另写一套字体族
  const global = read(path.join(SRC, 'assets', 'styles', 'global.css'))
  assert.match(global, /font-family:\s*var\(--font-body\)/, 'global.css 应消费 --font-body')
})

test('variables.css 只被 main.js 引入一次（避免 :root 重复输出）', () => {
  const global = read(path.join(SRC, 'assets', 'styles', 'global.css'))
  assert.equal(
    /@import\s+['"].*variables\.css/.test(global),
    false,
    'global.css 不应再 @import variables.css'
  )
  const main = read(path.join(SRC, 'main.js'))
  assert.match(main, /import\s+['"].*variables\.css['"]/, 'main.js 应引入 variables.css')
})

// ── 检查器自检（防止假通过） ───────────────────────────────────

test('令牌提取器能从 variables.css 取到令牌（防止检查器失效导致假通过）', () => {
  const tokens = definedTokens()
  assert.ok(tokens.length > 60, `应提取到大量令牌，实际 ${tokens.length}`)
  for (const name of ['--bg-page', '--accent', '--text-primary', '--radius-card', '--fs-body']) {
    assert.ok(tokens.includes(name), `应包含 ${name}`)
  }
  assert.equal(tokens.some((t) => t === '--'), false, '不应提取出空令牌名')
})

test('令牌定义层被排除在「使用次数」之外（防止预设文件让死令牌假通过）', () => {
  const themeFile = path.join(SRC, 'theme', 'presets.js')
  const varsFile = VARS
  const componentFile = path.join(SRC, 'components', 'ProductCard.vue')
  assert.equal(isTokenDefinition(themeFile), true, 'theme/ 属于令牌定义层')
  assert.equal(isTokenDefinition(varsFile), true, 'variables.css 属于令牌定义层')
  assert.equal(isTokenDefinition(componentFile), false, '组件不属于令牌定义层')
})

test('检查器能识别出注释里的断点不算真实断点（防止误报）', () => {
  const sample = '/* 原先是 @media (max-width: 560px) */\n@media (max-width: 575px) { .a { color: red } }'
  const stripped = stripCssComments(sample)
  const found = [...stripped.matchAll(/@media[^{]*?(?:max|min)-width:\s*(\d+)px/g)].map((m) => Number(m[1]))
  assert.deepEqual(found, [575], `应只识别出真实的 575，实际 ${JSON.stringify(found)}`)
})
