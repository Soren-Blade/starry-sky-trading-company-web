import test from 'node:test'
import assert from 'node:assert/strict'

import {
  copyText,
  isClipboardAvailable,
  COPY_RESULT,
} from '../src/utils/clipboard.js'
import { installDomStub, loadAppModule } from './setup.js'

installDomStub()

/**
 * 造一个可控的 document 桩：记录 execCommand 的调用与返回值。
 * clipboard.js 会创建 textarea、select、setSelectionRange，然后 body 增删节点。
 */
function makeDocumentStub({ execCommandResult = true, execCommandThrows = false } = {}) {
  const calls = []
  const created = []

  const body = {
    style: {},
    appendChild: (node) => {
      calls.push('appendChild')
      return node
    },
    removeChild: (node) => {
      calls.push('removeChild')
      return node
    },
  }

  const createElement = () => {
    const el = {
      value: '',
      style: {},
      setAttribute: () => {},
      select: () => {
        calls.push('select')
      },
      setSelectionRange: () => {
        calls.push('setSelectionRange')
      },
    }
    created.push(el)
    return el
  }

  const stub = {
    body,
    createElement,
    execCommand: (cmd) => {
      calls.push(`execCommand:${cmd}`)
      if (execCommandThrows) throw new Error('execCommand 不被支持')
      return execCommandResult
    },
  }

  return { document: stub, calls, created }
}

/** 在测试期间替换全局 navigator.clipboard 与 document（支持 async 回调） */
async function withEnv({ clipboard, doc }, fn) {
  const savedNavigator = Object.getOwnPropertyDescriptor(globalThis, 'navigator')
  const savedDocument = Object.getOwnPropertyDescriptor(globalThis, 'document')

  Object.defineProperty(globalThis, 'navigator', {
    configurable: true,
    writable: true,
    value: clipboard === undefined ? {} : { clipboard },
  })
  if (doc !== undefined) {
    Object.defineProperty(globalThis, 'document', {
      configurable: true,
      writable: true,
      value: doc,
    })
  }

  try {
    return await fn()
  } finally {
    if (savedNavigator) Object.defineProperty(globalThis, 'navigator', savedNavigator)
    else delete globalThis.navigator
    if (savedDocument) Object.defineProperty(globalThis, 'document', savedDocument)
    else delete globalThis.document
  }
}

// ── 可用性判断 ─────────────────────────────────────────────────

test('isClipboardAvailable：有 navigator.clipboard.writeText 时为真', () => {
  withEnv({ clipboard: { writeText: async () => {} } }, () => {
    assert.equal(isClipboardAvailable(), true)
  })
})

test('isClipboardAvailable：无 clipboard 或非安全上下文时为假', () => {
  withEnv({ clipboard: undefined }, () => {
    assert.equal(isClipboardAvailable(), false)
  })
  withEnv({ clipboard: {} }, () => {
    assert.equal(isClipboardAvailable(), false, 'clipboard 存在但没有 writeText')
  })
  withEnv({ clipboard: { writeText: 'not-a-function' } }, () => {
    assert.equal(isClipboardAvailable(), false)
  })
})

// ── 优先走现代 API ─────────────────────────────────────────────

test('copyText：优先使用 navigator.clipboard.writeText', async () => {
  const written = []
  const { document: doc, calls } = makeDocumentStub()

  await withEnv(
    { clipboard: { writeText: async (t) => written.push(t) }, doc },
    async () => {
      const result = await copyText('ABC123')
      assert.equal(result.ok, true)
      assert.equal(result.method, COPY_RESULT.CLIPBOARD)
      assert.equal(result.message, '已复制到剪贴板')
    }
  )

  assert.deepEqual(written, ['ABC123'])
  assert.equal(calls.length, 0, '现代 API 可用时不应触碰 execCommand 降级路径')
})

// ── 降级路径 ───────────────────────────────────────────────────

test('copyText：clipboard 抛错时降级到 execCommand，并检查其返回值', async () => {
  const { document: doc, calls } = makeDocumentStub({ execCommandResult: true })

  await withEnv(
    {
      clipboard: {
        writeText: async () => {
          throw new Error('NotAllowedError')
        },
      },
      doc,
    },
    async () => {
      const result = await copyText('ABC123')
      assert.equal(result.ok, true, '降级成功应报告 ok')
      assert.equal(result.method, COPY_RESULT.LEGACY)
    }
  )

  assert.ok(calls.includes('execCommand:copy'), `应调用 execCommand，实际调用：${calls.join(',')}`)
  assert.ok(calls.includes('appendChild') && calls.includes('removeChild'), '应清理临时节点')
})

test('copyText：execCommand 返回 false 时报告失败（而不是静默成功）', async () => {
  const { document: doc } = makeDocumentStub({ execCommandResult: false })

  await withEnv(
    {
      clipboard: {
        writeText: async () => {
          throw new Error('NotAllowedError')
        },
      },
      doc,
    },
    async () => {
      const result = await copyText('ABC123')
      assert.equal(result.ok, false, 'execCommand 返回 false 必须视为失败')
      assert.equal(result.method, COPY_RESULT.FAILED)
      assert.match(result.message, /复制失败/)
    }
  )
})

test('copyText：execCommand 抛错时也报告失败', async () => {
  const { document: doc } = makeDocumentStub({ execCommandThrows: true })

  await withEnv(
    {
      clipboard: {
        writeText: async () => {
          throw new Error('NotAllowedError')
        },
      },
      doc,
    },
    async () => {
      const result = await copyText('ABC123')
      assert.equal(result.ok, false)
      assert.equal(result.method, COPY_RESULT.FAILED)
    }
  )
})

test('copyText：完全没有 clipboard API 时直接走降级', async () => {
  const { document: doc, calls } = makeDocumentStub({ execCommandResult: true })

  await withEnv({ clipboard: undefined, doc }, async () => {
    const result = await copyText('非安全上下文下的复制')
    assert.equal(result.ok, true)
    assert.equal(result.method, COPY_RESULT.LEGACY)
  })

  assert.ok(calls.includes('execCommand:copy'))
})

test('copyText：降级路径异常时仍会清理临时节点（finally）', async () => {
  const { document: doc, calls } = makeDocumentStub({ execCommandThrows: true })

  await withEnv({ clipboard: undefined, doc }, async () => {
    await copyText('X')
  })

  const appended = calls.filter((c) => c === 'appendChild').length
  const removed = calls.filter((c) => c === 'removeChild').length
  assert.equal(appended, 1)
  assert.equal(removed, 1, '抛错时也必须移除临时 textarea，否则会残留在 DOM 里')
})

// ── 边界 ───────────────────────────────────────────────────────

test('copyText：空值与 null 不执行复制', async () => {
  const written = []
  const { document: doc, calls } = makeDocumentStub()

  await withEnv({ clipboard: { writeText: async (t) => written.push(t) }, doc }, async () => {
    for (const value of ['', null, undefined]) {
      const result = await copyText(value)
      assert.equal(result.ok, false, `${JSON.stringify(value)} 不应视为成功`)
      assert.equal(result.method, COPY_RESULT.EMPTY)
    }
  })

  assert.deepEqual(written, [], '不应写入空内容')
  assert.equal(calls.length, 0)
})

test('copyText：数字 0 会被复制（不是「空值」）', async () => {
  const written = []
  const { document: doc } = makeDocumentStub()

  await withEnv({ clipboard: { writeText: async (t) => written.push(t) }, doc }, async () => {
    const result = await copyText(0)
    assert.equal(result.ok, true, '0 是有效内容')
  })

  assert.deepEqual(written, ['0'])
})

test('copyText：永不抛异常（调用方只需看 ok）', async () => {
  const { document: doc } = makeDocumentStub({ execCommandThrows: true })

  await withEnv(
    {
      clipboard: {
        writeText: async () => {
          throw new Error('boom')
        },
      },
      doc,
    },
    async () => {
      await assert.doesNotReject(() => copyText('X'))
    }
  )
})

test('copyText：缺少 document 时不抛错（SSR）', async () => {
  const savedDocument = Object.getOwnPropertyDescriptor(globalThis, 'document')
  try {
    Object.defineProperty(globalThis, 'document', { configurable: true, writable: true, value: undefined })
    const result = await copyText('X')
    assert.equal(result.ok, false)
    assert.equal(result.method, COPY_RESULT.FAILED)
  } finally {
    if (savedDocument) Object.defineProperty(globalThis, 'document', savedDocument)
  }
})

test('copyText：复制内容不被意外改写（含换行与中文）', async () => {
  const written = []
  const { document: doc } = makeDocumentStub()
  const payload = '第一行\n第二行\t含制表符 🎉'

  await withEnv({ clipboard: { writeText: async (t) => written.push(t) }, doc }, async () => {
    await copyText(payload)
  })

  assert.deepEqual(written, [payload], '内容应原样传递')
})

test('通过 loadAppModule 加载时导出完整', async () => {
  const mod = await loadAppModule('/utils/clipboard.js')
  assert.equal(typeof mod.copyText, 'function')
  assert.equal(typeof mod.isClipboardAvailable, 'function')
  assert.deepEqual(Object.keys(mod.COPY_RESULT).sort(), ['CLIPBOARD', 'EMPTY', 'FAILED', 'LEGACY'])
})
