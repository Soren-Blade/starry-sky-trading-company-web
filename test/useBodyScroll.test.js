import test from 'node:test'
import assert from 'node:assert/strict'

import { installDomStub, loadAppModule } from './setup.js'

installDomStub()

const { useBodyScroll, __resetBodyScrollForTests, __getBodyScrollStateForTests } = await loadAppModule(
  '/hooks/useBodyScroll/useBodyScroll.js'
)

/**
 * 建一个「可手动触发卸载」的 hook 实例。
 *
 * 为什么这样做：hook 用 Vue 的 onUnmounted 在组件卸载时释放滚动锁，
 * 而在 Node 里 mount 组件需要 jsdom（实测仅补 DOM 桩会在
 * Vue 的 `SVGElement is not defined` 处失败）。
 * hook 因此接受可选的 onUnmounted 注入 —— 生产用法不变，
 * 测试传入自己的注册函数，从而能真实走「卸载 → 释放」这条路径。
 */
function mountHook() {
  const handlers = []
  const api = useBodyScroll({
    onUnmounted: (fn) => handlers.push(fn),
  })
  return {
    ...api,
    /** 触发本实例的卸载回调，返回触发个数 */
    unmount: () => {
      const pending = handlers.splice(0)
      for (const fn of pending) fn()
      return pending.length
    },
    registeredCount: () => handlers.length,
  }
}

/** 记录当前 body 上的相关内联样式 */
const bodyStyle = () => ({
  overflow: document.body.style.overflow,
  paddingRight: document.body.style.paddingRight,
  touchAction: document.body.style.touchAction,
})

/** 设置视口尺寸，用于模拟有无滚动条 */
function setViewport(innerWidth, clientWidth) {
  globalThis.window.innerWidth = innerWidth
  document.documentElement.clientWidth = clientWidth
}

test.beforeEach(() => {
  __resetBodyScrollForTests()
  document.body.style.overflow = ''
  document.body.style.paddingRight = ''
  document.body.style.touchAction = ''
  setViewport(1000, 1000)
})

// ── 基本加锁/解锁 ──────────────────────────────────────────────

test('disableScroll 锁定 body 滚动，enableScroll 还原', () => {
  const s = mountHook()

  s.disableScroll()
  assert.equal(document.body.style.overflow, 'hidden')
  assert.equal(document.body.style.touchAction, 'none')

  s.enableScroll()
  assert.equal(document.body.style.overflow, '')
  assert.equal(document.body.style.touchAction, '')
})

test('有滚动条时补偿 paddingRight，避免页面横向跳动', () => {
  setViewport(1015, 1000) // 滚动条宽 15px
  const s = mountHook()

  s.disableScroll()
  assert.equal(document.body.style.paddingRight, '15px')

  s.enableScroll()
  assert.equal(document.body.style.paddingRight, '')
})

test('无滚动条（移动端）时不写 paddingRight', () => {
  setViewport(375, 375)
  const s = mountHook()

  s.disableScroll()
  assert.equal(document.body.style.overflow, 'hidden')
  assert.equal(document.body.style.paddingRight, '', '无滚动条时不应留下 paddingRight')
})

test('视口数值异常时不写入 NaN', () => {
  globalThis.window.innerWidth = undefined
  document.documentElement.clientWidth = undefined
  const s = mountHook()

  s.disableScroll()
  assert.equal(document.body.style.paddingRight, '')
})

// ── toggle ────────────────────────────────────────────────────

test('toggle(true/false) 分别加锁与解锁', () => {
  const s = mountHook()

  s.toggle(true)
  assert.equal(document.body.style.overflow, 'hidden')
  s.toggle(false)
  assert.equal(document.body.style.overflow, '')
})

// ── 引用计数（本轮修复的核心） ─────────────────────────────────

test('两个持有者：释放一个仍保持锁定（早期实现会提前解锁）', () => {
  const a = mountHook()
  const b = mountHook()

  a.disableScroll()
  b.disableScroll()
  assert.equal(document.body.style.overflow, 'hidden')

  a.enableScroll()
  assert.equal(document.body.style.overflow, 'hidden', 'b 仍持有锁，页面不应恢复滚动')

  b.enableScroll()
  assert.equal(document.body.style.overflow, '')
})

test('后释放者不会抹掉仍需要的样式（只在计数归零时还原）', () => {
  setViewport(1015, 1000)
  const a = mountHook()
  const b = mountHook()

  a.disableScroll()
  b.disableScroll()
  a.enableScroll()
  assert.equal(document.body.style.paddingRight, '15px', '仍处于锁定态，补偿应保留')

  b.enableScroll()
  assert.equal(document.body.style.paddingRight, '')
})

test('未持有时调用 enableScroll 不影响他人的锁', () => {
  const a = mountHook()
  const b = mountHook()
  a.disableScroll()

  b.enableScroll() // 从未加锁
  assert.equal(document.body.style.overflow, 'hidden', 'a 的锁不应被无关实例解除')

  a.enableScroll()
  assert.equal(document.body.style.overflow, '')
})

test('同一实例重复 disableScroll 只计一次', () => {
  const s = mountHook()

  s.disableScroll()
  s.disableScroll()
  s.disableScroll()

  s.enableScroll()
  assert.equal(document.body.style.overflow, '', '一次 enable 应完全解锁（计数从 1 归零）')
  assert.equal(__getBodyScrollStateForTests().lockCount, 0)
})

test('同一实例重复 enableScroll 不会把计数减成负数', () => {
  const s = mountHook()
  s.disableScroll()
  s.enableScroll()
  s.enableScroll()
  s.enableScroll()

  assert.equal(__getBodyScrollStateForTests().lockCount, 0)

  const other = mountHook()
  other.disableScroll()
  assert.equal(document.body.style.overflow, 'hidden', '之后别人加锁仍然有效')
})

// ── 原始内联样式的还原 ─────────────────────────────────────────

test('解锁时还原 body 原有的内联样式，而不是一律置空', () => {
  document.body.style.paddingRight = '7px'

  const s = mountHook()
  setViewport(1015, 1000)
  s.disableScroll()
  assert.equal(document.body.style.paddingRight, '15px', '锁定时应覆盖')

  s.enableScroll()
  assert.equal(document.body.style.paddingRight, '7px', '解锁后应还原为原值')
})

test('原始样式为空的属性解锁后仍为空', () => {
  const s = mountHook()
  s.disableScroll()
  s.enableScroll()

  assert.deepEqual(bodyStyle(), { overflow: '', paddingRight: '', touchAction: '' })
})

// ── 卸载时自动释放 ────────────────────────────────────────────

test('每个实例都注册一个卸载回调', () => {
  const s = mountHook()
  assert.equal(s.registeredCount(), 1, '应恰好注册一个 onUnmounted 回调')
})

test('组件卸载时自动释放（不留下锁死的页面）', () => {
  const s = mountHook()
  s.disableScroll()
  assert.equal(document.body.style.overflow, 'hidden')

  const ran = s.unmount()
  assert.equal(ran, 1)
  assert.equal(document.body.style.overflow, '', '卸载后应释放滚动锁')
  assert.equal(__getBodyScrollStateForTests().lockCount, 0)
})

test('两个实例都卸载后计数归零，不会变成负数', () => {
  const a = mountHook()
  const b = mountHook()

  a.disableScroll()
  b.disableScroll()

  a.unmount()
  assert.equal(document.body.style.overflow, 'hidden', 'b 仍持有锁')
  assert.equal(__getBodyScrollStateForTests().lockCount, 1)

  b.unmount()
  assert.equal(document.body.style.overflow, '')
  assert.equal(__getBodyScrollStateForTests().lockCount, 0)
})

test('未加锁的实例卸载不会破坏仍挂载持有者的锁', () => {
  const holder = mountHook()
  holder.disableScroll()

  const idle = mountHook() // 从未加锁
  idle.unmount()

  assert.equal(document.body.style.overflow, 'hidden', '未加锁实例卸载不应解锁他人')
  assert.equal(__getBodyScrollStateForTests().lockCount, 1, '计数应保留')

  holder.unmount()
  assert.equal(__getBodyScrollStateForTests().lockCount, 0)
})

test('卸载后再次卸载是安全的（回调只触发一次）', () => {
  const s = mountHook()
  s.disableScroll()

  assert.equal(s.unmount(), 1)
  assert.equal(s.unmount(), 0, '回调不应被重复触发')
  assert.equal(__getBodyScrollStateForTests().lockCount, 0)
})

// ── 无 DOM 环境下的健壮性 ──────────────────────────────────────

test('缺少 body 时不抛错（SSR / 测试环境）', () => {
  const savedBody = document.body
  document.body = undefined

  try {
    const s = mountHook()
    assert.doesNotThrow(() => s.disableScroll())
    assert.doesNotThrow(() => s.enableScroll())
    assert.doesNotThrow(() => s.unmount())
  } finally {
    document.body = savedBody
    __resetBodyScrollForTests()
  }
})

test('缺少 document 时不抛错', () => {
  const savedDocument = globalThis.document
  globalThis.document = undefined

  try {
    const s = mountHook()
    assert.doesNotThrow(() => s.disableScroll())
    assert.doesNotThrow(() => s.enableScroll())
  } finally {
    globalThis.document = savedDocument
    __resetBodyScrollForTests()
  }
})
