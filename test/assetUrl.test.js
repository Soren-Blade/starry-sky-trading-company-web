import test from 'node:test'
import assert from 'node:assert/strict'

import { installStorageStub, installDomStub, loadAppModule, setTestEnv } from './setup.js'

installStorageStub()
installDomStub()

const { resolveAssetUrl } = await loadAppModule('/utils/assetUrl.js')

/**
 * `test/setup.js` 注入的是**转发用的 Proxy**，`import.meta.env.VITE_X` 永远读
 * `globalThis.__SSTC_TEST_ENV__` 的当前值，因此这里改环境变量对已加载的模块同样生效
 * （曾经不是 —— 那次让本文件与 stores.user.test.js 出现「单独跑通过、全量跑失败」）。
 */
const withBase = (base, fn) => {
  const previous = globalThis.__SSTC_TEST_ENV__.VITE_API_BASE_URL
  setTestEnv({ VITE_API_BASE_URL: base })
  try {
    return fn()
  } finally {
    setTestEnv({ VITE_API_BASE_URL: previous })
  }
}

// ── 空值 ───────────────────────────────────────────────────

test('resolveAssetUrl：空值一律返回空串（不会渲染出 src="undefined"）', () => {
  for (const bad of [null, undefined, '', '   ', 0, 42, {}, []]) {
    assert.equal(resolveAssetUrl(bad), '', `${JSON.stringify(bad)} 应返回空串`)
  }
})

// ── 已经可用的地址原样透传 ─────────────────────────────────

test('resolveAssetUrl：绝对 URL / data: / blob: / 协议相对 一律不改写', () => {
  const already = [
    'https://cdn.example.com/a.png',
    'http://cdn.example.com/a.png',
    'HTTPS://CDN.EXAMPLE.COM/a.png',
    'data:image/png;base64,AAAA',
    'blob:http://localhost:5173/abc-123',
    '//cdn.example.com/a.png',
    'https://api.dicebear.com/7.x/avataaars/svg?seed=x',
  ]
  for (const url of already) {
    assert.equal(resolveAssetUrl(url), url, `${url} 不应被改写`)
  }
})

test('resolveAssetUrl：外部绝对地址不受 base 影响', () => {
  withBase('https://api.example.com', () => {
    const url = 'https://cdn.example.com/a.png'
    assert.equal(resolveAssetUrl(url), url)
  })
})

// ── 站内相对路径 ───────────────────────────────────────────

test('resolveAssetUrl：dev（base 为空）保持同源相对路径，交给 Vite 代理', () => {
  withBase('', () => {
    assert.equal(resolveAssetUrl('/uploads/avatars/u1-x.webp'), '/uploads/avatars/u1-x.webp')
  })
})

test('resolveAssetUrl：生产（base 有值）补上后端基地址', () => {
  withBase('https://starry-sky-trading-company-server.vercel.app', () => {
    assert.equal(
      resolveAssetUrl('/uploads/avatars/u1-x.webp'),
      'https://starry-sky-trading-company-server.vercel.app/uploads/avatars/u1-x.webp'
    )
  })
})

test('resolveAssetUrl：base 末尾有斜杠时不会拼出双斜杠', () => {
  withBase('https://api.example.com/', () => {
    assert.equal(resolveAssetUrl('/uploads/a.png'), 'https://api.example.com/uploads/a.png')
  })
  withBase('https://api.example.com///', () => {
    assert.equal(resolveAssetUrl('/uploads/a.png'), 'https://api.example.com/uploads/a.png')
  })
})

test('resolveAssetUrl：只处理以单个 / 开头的路径，不碰相对片段', () => {
  withBase('https://api.example.com', () => {
    // 不以 / 开头：交给浏览器按当前文档解析，擅自拼接反而可能拼错
    assert.equal(resolveAssetUrl('a.png'), 'a.png')
    assert.equal(resolveAssetUrl('./a.png'), './a.png')
    // 以 / 开头但不是站内上传目录：也照样补基地址（后端可能新增其它静态目录）
    assert.equal(resolveAssetUrl('/static/x.png'), 'https://api.example.com/static/x.png')
  })
})

test('resolveAssetUrl：去掉首尾空白', () => {
  withBase('', () => {
    assert.equal(resolveAssetUrl('  /uploads/a.png  '), '/uploads/a.png')
  })
})
