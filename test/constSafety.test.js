import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const WEB_ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const SRC = path.join(WEB_ROOT, 'src')

function sourceFiles() {
  const out = []
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name)
      if (entry.isDirectory()) walk(full)
      else if (/\.(js|vue|mjs)$/.test(entry.name)) out.push(full)
    }
  }
  walk(SRC)
  return out
}

/** 取出 .vue 的 <script> 部分；纯 js 文件返回原文 */
function scriptPart(file, text) {
  if (!file.endsWith('.vue')) return text
  const matches = [...text.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g)]
  return matches.map((m) => m[1]).join('\n')
}

/** 去掉行注释与块注释，避免注释里的示例代码造成误报 */
function stripComments(code) {
  return code.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1')
}

/**
 * 找出「对 const 绑定的赋值」。
 *
 * 为什么需要这条检查：把模块级 `let` 重构为 `const`（或改用工厂函数返回的对象）时，
 * 遗留的 `x = null` 只在**运行到那一行**才抛
 * `TypeError: Assignment to constant variable`。静态层面极易漏掉，
 * 而单元测试只覆盖纯函数，不会执行到组件里的 watch 回调。
 *
 * 真实案例：2FA.vue 把 keyCache 从模块级变量改成 createKeyCache() 的结果后，
 * watch(secret) 里仍留着 `keyCache = null` —— 用户一输入密钥页面就崩。
 */
function findConstReassignments(code) {
  const findings = []
  const lines = code.split('\n')

  // 收集 const 声明名（按出现位置记录首次声明行）
  const declaredAt = new Map()
  lines.forEach((line, i) => {
    const m = line.match(/(?:^|[;{}\s])const\s+([A-Za-z_$][\w$]*)\s*=/)
    if (m && !declaredAt.has(m[1])) declaredAt.set(m[1], i)
  })

  for (const [name, declLine] of declaredAt) {
    const escaped = name.replace(/\$/g, '\\$')
    // 赋值形式：行首（允许缩进）出现 `name =`，且不是 `==` / `=>` / `const name`
    const assignRe = new RegExp(`^\\s*${escaped}\\s*=(?!=)`)
    // 形参形式：`name =>` 或 `(..., name, ...) =>` / `function (name)`
    const paramArrowRe = new RegExp(`(^|[\\s(,])${escaped}\\s*=>`)
    const paramParenRe = new RegExp(`\\([^)]*\\b${escaped}\\b[^)]*\\)\\s*=>`)

    for (let i = declLine + 1; i < lines.length; i++) {
      const line = lines[i]
      const trimmed = line.trim()
      if (trimmed.startsWith('//') || trimmed.startsWith('*')) continue
      if (new RegExp(`\\bconst\\s+${escaped}\\b`).test(line)) continue
      if (!assignRe.test(line)) continue

      // 该行同时把 name 声明为形参（如 items.map(name => ...)）时不是赋值
      const regionStart = Math.max(declLine, i - 2)
      const region = lines.slice(regionStart, i + 1).join('\n')
      if (paramArrowRe.test(line) || paramParenRe.test(region)) continue

      findings.push({ name, declLine: declLine + 1, line: i + 1, text: trimmed })
    }
  }

  return findings
}

test('源码中不得对 const 绑定赋值（重构遗留的隐患）', () => {
  const problems = []

  for (const file of sourceFiles()) {
    const rel = path.relative(WEB_ROOT, file).replace(/\\/g, '/')
    const code = stripComments(scriptPart(file, fs.readFileSync(file, 'utf8')))

    for (const f of findConstReassignments(code)) {
      problems.push(`${rel}:${f.line} 对 const '${f.name}'（声明于 L${f.declLine}）赋值 —— ${f.text}`)
    }
  }

  assert.deepEqual(
    problems,
    [],
    `发现对 const 的赋值，运行时将抛 TypeError：\n  ${problems.join('\n  ')}`
  )
})

test('检查器本身能识别出已知的反例（防止测试假通过）', () => {
  const sample = [
    'const cache = createCache();',
    'function useIt() {',
    '  cache = null;',
    '}',
  ].join('\n')

  const findings = findConstReassignments(stripComments(sample))
  assert.equal(findings.length, 1, '应识别出对 cache 的赋值')
  assert.equal(findings[0].name, 'cache')
})

test('检查器不把 let 赋值、属性赋值与比较当作问题', () => {
  const sample = [
    'let counter = 0',
    'const config = { a: 1 }',
    'const items = []',
    'counter = 1',
    'config.a = 2',
    'items.push(1)',
    'if (counter === 1) { counter += 1 }',
    'const sum = (a, b) => a + b',
  ].join('\n')

  const findings = findConstReassignments(stripComments(sample))
  assert.deepEqual(findings, [], `不应有发现，实际：${JSON.stringify(findings)}`)
})
