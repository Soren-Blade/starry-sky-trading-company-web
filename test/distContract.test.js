import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

/**
 * 构建产物契约验证
 *
 * 为什么需要：源码测试跑在 Node 里、直接加载 `src/`，而生产用的是 Vite 打包产物。
 * 若某个模块被 tree-shaking 掉、导出名丢失、或样式令牌没进 CSS，
 * **源码测试不会发现**。本文件检查产物这一层。
 *
 * 这不是渲染测试（那需要 jsdom 或真实浏览器），只覆盖「产物契约」。
 *
 * 前提：`dist/` 需已构建（`npm run build`）。目录不存在时**整组跳过** ——
 * 这样 `npm test` 在未构建的环境里也能直接跑通。
 */
const WEB_ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const DIST = path.join(WEB_ROOT, 'dist')
const ASSETS = path.join(DIST, 'assets')
const BUILT = fs.existsSync(ASSETS)

const readDirText = (files) =>
  files.map((f) => fs.readFileSync(path.join(ASSETS, f), 'utf8')).join('\n')

function assets(ext) {
  return fs.readdirSync(ASSETS).filter((f) => f.endsWith(ext))
}

// 产物不存在时跳过整组（no-op 测试，保证基础 npm test 可用）
if (!BUILT) {
  test('构建产物契约：dist 未构建，跳过（请先 npm run build）', { skip: true }, () => {})
} else {
  const jsFiles = assets('.js')
  const cssFiles = assets('.css')
  const allJs = readDirText(jsFiles)
  const allCss = readDirText(cssFiles)

  test('产物中保留已修复缺陷的「行为标识」（未被 tree-shaking 掉）', () => {
    const markers = [
      ['token 续期防死循环', '__isRetry'],
      ['刷新请求标记', '__isRefreshToken'],
      ['登录失效提示', '登录状态已失效'],
      ['复制降级提示', '请手动选择文本复制'],
      ['激活刷新失败提示', '列表刷新失败'],
    ]
    const missing = markers.filter(([, m]) => !allJs.includes(m)).map(([label, m]) => `${label} (${m})`)
    assert.deepEqual(missing, [], `以下标识未出现在产物中，可能被意外移除：\n  ${missing.join('\n  ')}`)
  })

  test('抽取出的 composable 逻辑确实被打进产物', () => {
    // useKamiDisplay / useKamiActivation 里的文案是它们被真正引用的证据
    const markers = ['已过期', '全部状态', '请选择工具', '请输入卡密', '激活服务不可用']
    const missing = markers.filter((m) => !allJs.includes(m))
    assert.deepEqual(missing, [], `以下文案未出现在产物中：\n  ${missing.join('\n  ')}`)
  })

  test('设计令牌完整进入 CSS', () => {
    const tokens = [
      '--color-primary',
      '--color-on-primary',
      '--color-surface',
      '--color-text-primary',
      '--gradient-indigo',
      '--gradient-page-soft',
      '--radius-xl',
      '--shadow-card',
    ]
    const missing = tokens.filter((t) => !allCss.includes(t))
    assert.deepEqual(missing, [], `以下令牌未进入产物 CSS：\n  ${missing.join('\n  ')}`)
  })

  test('已删除的死令牌不得残留在产物里', () => {
    const removed = ['--color-accent', '--color-warning', '--gradient-warm', '--shadow-glass']
    const present = removed.filter((t) => allCss.includes(t))
    assert.deepEqual(present, [], `以下令牌已删除但仍出现在产物中：\n  ${present.join('\n  ')}`)
  })

  test(':root 在产物中只输出一次（避免变量重复定义）', () => {
    const count = (allCss.match(/:root/g) || []).length
    assert.equal(count, 1, `:root 出现 ${count} 次`)
  })

  test('index.html 引用的产物文件都存在', () => {
    const indexHtml = fs.readFileSync(path.join(DIST, 'index.html'), 'utf8')
    const referenced = [...indexHtml.matchAll(/\/assets\/([\w.-]+\.(?:js|css))/g)].map((m) => m[1])
    assert.ok(referenced.length > 0, 'index.html 应引用构建产物')

    const missing = referenced.filter((f) => !fs.existsSync(path.join(ASSETS, f)))
    assert.deepEqual(missing, [], `index.html 引用了不存在的产物：\n  ${missing.join('\n  ')}`)
  })

  test('产物中不含旧包名等已清理的标识', () => {
    assert.equal(allJs.includes('easy-payment-interface-test'), false, '不应出现旧包名')
  })

  test('无异常空的 JS chunk（可能是构建配置问题）', () => {
    const tiny = jsFiles.filter((f) => fs.statSync(path.join(ASSETS, f)).size < 200)
    assert.deepEqual(tiny, [], `以下 chunk 体积异常小：\n  ${tiny.join('\n  ')}`)
  })

  test('检查器自检：确实读到了产物内容（防止假通过）', () => {
    assert.ok(jsFiles.length > 5, `应读多个 JS 产物，实际 ${jsFiles.length}`)
    assert.ok(cssFiles.length > 3, `应读多个 CSS 产物，实际 ${cssFiles.length}`)
    assert.ok(allJs.length > 10000, 'JS 产物内容应有实质体积')
    assert.ok(allCss.length > 1000, 'CSS 产物内容应有实质体积')
  })
}
