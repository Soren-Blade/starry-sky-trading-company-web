import test from 'node:test'
import assert from 'node:assert/strict'

import { loadAppModule } from './setup.js'

/**
 * `useOpenTool` 的受控打开
 *
 * 这个 hook 的顺序本身就是实现：**先同步开占位窗、再 await 换地址**。
 * 顺序错了会被浏览器拦截弹窗，而这类缺陷在无浏览器环境下无法靠「看渲染结果」发现，
 * 所以这里用注入的 `openWindow` / `openToolUrl` / `notify` 记录调用序列来钉住它。
 *
 * 依赖注入只用于测试：组件侧仍然调用 `useOpenTool()`，默认值就是线上行为。
 */

const { useOpenTool } = await loadAppModule('/hooks/useOpenTool/index.js')
const { TOOL_PAGE } = await loadAppModule('/constants/index.js')

const ORIGIN = 'https://shop.example.com'

/** 最小窗口桩：只提供 hook 真正碰到的三样东西 */
function makeWindow() {
    const win = {
        closed: false,
        location: { href: 'about:blank' },
        focusCount: 0,
        closeCount: 0,
        focus() {
            win.focusCount += 1
        },
        close() {
            win.closeCount += 1
            win.closed = true
        },
    }
    return win
}

/**
 * 组装一次调用所需的依赖
 *
 * `calls` 按时间顺序记录每件事，用于断言「谁先谁后」——
 * 这是本文件的核心：只断言「最终打开了地址」会漏掉「await 之后才开窗」这个错误。
 */
function setup({ openToolUrl, windowFactory = makeWindow } = {}) {
    const calls = []
    const notices = []
    const windows = []

    const hook = useOpenTool({
        baseUrl: ORIGIN,
        notify: {
            success: (text) => notices.push(['success', text]),
            warning: (text) => notices.push(['warning', text]),
            error: (text) => notices.push(['error', text]),
            info: (text) => notices.push(['info', text]),
        },
        openWindow: (url) => {
            calls.push(['openWindow', url])
            const win = windowFactory()
            if (win) windows.push(win)
            return win
        },
        openToolUrl: async (options) => {
            calls.push(['openToolUrl', options])
            return openToolUrl(options)
        },
    })

    return { openTool: hook.openTool, calls, notices, windows }
}

test('没有工具 id 时退回旧行为：直接打开 tool_path', async () => {
    const { openTool, calls, windows, notices } = setup({
        openToolUrl: async () => assert.fail('没有 id 不该请求受控端点'),
    })

    const ok = await openTool({ id: null, tool_path: '/dev/hash' })

    assert.equal(ok, true)
    assert.deepEqual(calls, [['openWindow', `${ORIGIN}/dev/hash`]])
    assert.equal(windows[0].location.href, 'about:blank', '旧路径不该再改地址，openWindow 已经是最终地址')
    assert.deepEqual(notices, [])
})

test('没有 id 也没有地址：提示缺地址且不开窗', async () => {
    const { openTool, calls, notices } = setup({ openToolUrl: async () => assert.fail('不该请求') })

    const ok = await openTool({ id: null, tool_path: '' })

    assert.equal(ok, false)
    assert.deepEqual(calls, [])
    assert.deepEqual(notices, [['warning', TOOL_PAGE.missingPath]])
})

test('有 id 时先同步开占位窗，再请求地址', async () => {
    const { openTool, calls, windows, notices } = setup({
        openToolUrl: async () => ({ data: { url: 'https://tools.example.com/hash' } }),
    })

    const ok = await openTool({ id: 7, tool_path: '' })

    assert.equal(ok, true)
    assert.deepEqual(
        calls.map((entry) => entry[0]),
        ['openWindow', 'openToolUrl'],
        '必须先开占位窗再请求，否则 await 之后再开窗会被拦截'
    )
    assert.deepEqual(calls[1][1], { tool_id: 7 })
    assert.equal(windows[0].location.href, 'https://tools.example.com/hash')
    assert.deepEqual(notices, [])
})

test('相对地址按 baseUrl 补全', async () => {
    const { openTool, windows } = setup({
        openToolUrl: async () => ({ data: { url: '/tool/hash' } }),
    })

    await openTool({ id: 9, tool_path: '' })

    assert.equal(windows[0].location.href, `${ORIGIN}/tool/hash`)
})

test('同一工具再次点击复用已打开窗口，不新开也不重复请求', async () => {
    const { openTool, calls, windows } = setup({
        openToolUrl: async () => ({ data: { url: 'https://tools.example.com/hash' } }),
    })

    await openTool({ id: 3, tool_path: '' })
    // 窗口仍停在记住的地址上 → 直接聚焦
    const again = await openTool({ id: 3, tool_path: '' })

    assert.equal(again, true)
    assert.equal(windows.length, 1, '不该开第二个窗口')
    assert.equal(windows[0].focusCount, 1)
    assert.equal(calls.filter((entry) => entry[0] === 'openToolUrl').length, 1)
})

test('被拒绝时关掉占位窗并按错误码提示，且不退回 tool_path', async () => {
    const { openTool, windows, notices } = setup({
        openToolUrl: async () => {
            const error = new Error('需要卡密')
            error.code = 'TOOL_CARD_REQUIRED'
            throw error
        },
    })

    const ok = await openTool({ id: 11, tool_path: '/dev/hash' })

    assert.equal(ok, false)
    assert.equal(windows[0].closeCount, 1, '占位窗必须关掉，否则用户留在一个空白页')
    assert.equal(windows[0].location.href, 'about:blank', '被拒时不该把占位窗导航到 tool_path')
    assert.deepEqual(notices, [['warning', TOOL_PAGE.accessCardRequired]])
})

test('四个访问错误码各自有提示文案', async () => {
    const mapping = [
        ['TOOL_CARD_REQUIRED', TOOL_PAGE.accessCardRequired],
        ['TOOL_CARD_OR_MEMBER_REQUIRED', TOOL_PAGE.accessCardOrMember],
        ['TOOL_MEMBER_REQUIRED', TOOL_PAGE.accessMemberOnly],
        ['TOOL_UNAVAILABLE', TOOL_PAGE.accessUnavailable],
    ]

    for (const [code, expected] of mapping) {
        const { openTool, notices } = setup({
            openToolUrl: async () => {
                const error = new Error(code)
                error.code = code
                throw error
            },
        })

        await openTool({ id: 5, tool_path: '' })
        assert.deepEqual(notices, [['warning', expected]], code)
    }
})

test('接口不可用（无错误码）时退回 tool_path', async () => {
    const { openTool, windows, notices } = setup({
        openToolUrl: async () => {
            throw new Error('Network Error')
        },
    })

    const ok = await openTool({ id: 13, tool_path: '/dev/hash' })

    assert.equal(ok, true)
    assert.equal(windows[0].location.href, `${ORIGIN}/dev/hash`)
    assert.equal(windows[0].closeCount, 0)
    assert.deepEqual(notices, [])
})

test('接口不可用且没有 tool_path：关窗并提示缺地址', async () => {
    const { openTool, windows, notices } = setup({
        openToolUrl: async () => {
            throw new Error('404')
        },
    })

    const ok = await openTool({ id: 15, tool_path: '' })

    assert.equal(ok, false)
    assert.equal(windows[0].closeCount, 1)
    assert.deepEqual(notices, [['warning', TOOL_PAGE.missingPath]])
})

test('成功响应里没有地址时按接口不可用处理', async () => {
    const { openTool, windows, notices } = setup({
        openToolUrl: async () => ({ data: {} }),
    })

    const ok = await openTool({ id: 17, tool_path: '/dev/hash' })

    assert.equal(ok, true, '有 tool_path 就兜底打开')
    assert.equal(windows[0].location.href, `${ORIGIN}/dev/hash`)
    assert.deepEqual(notices, [])
})

test('弹窗被拦截时提示且不请求接口', async () => {
    const { openTool, calls, notices } = setup({
        windowFactory: () => null,
        openToolUrl: async () => assert.fail('没窗可导航，不该再请求'),
    })

    const ok = await openTool({ id: 21, tool_path: '/dev/hash' })

    assert.equal(ok, false)
    assert.deepEqual(calls.map((entry) => entry[0]), ['openWindow'])
    assert.deepEqual(notices, [['warning', TOOL_PAGE.popupBlocked]])
})
