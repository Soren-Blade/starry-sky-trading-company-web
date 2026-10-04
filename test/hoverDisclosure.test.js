import test from 'node:test'
import assert from 'node:assert/strict'

import { loadAppModule } from './setup.js'

const { useHoverDisclosure } = await loadAppModule('/hooks/useHoverDisclosure/index.js')

/**
 * 「悬停或聚焦即展开」的展开态
 *
 * 两条容易写错的分支各有一组用例：
 *   1. 鼠标移开但焦点还在输入框里 —— 绝不能收起（否则打字打到一半搜索框消失）
 *   2. 触屏上补发的 mouseenter —— 不参与判定，否则手机关不掉
 */

/** 默认按「能悬停」建（桌面） */
const desktop = () => useHoverDisclosure({ canHover: () => true })
/** 触屏：不能悬停 */
const touch = () => useHoverDisclosure({ canHover: () => false })

test('初始是收起的', () => {
  assert.equal(desktop().open.value, false)
})

test('悬停进入：展开', () => {
  const d = desktop()
  d.onEnter()
  assert.equal(d.open.value, true)
})

test('悬停离开且焦点不在内部：收起', () => {
  const d = desktop()
  d.onEnter()
  d.onLeave()
  assert.equal(d.open.value, false)
})

test('**关键组合**：悬停离开但焦点还在输入框里 —— 不能收起', () => {
  const d = desktop()
  d.onEnter()
  d.onFocusIn() // 用户点了图标，光标落进输入框
  d.onLeave() // 鼠标移开去别处看

  assert.equal(d.open.value, true, '焦点还在里面，收起会让输入到一半的内容消失')
})

test('焦点离开但鼠标还停在上面：保持展开', () => {
  const d = desktop()
  d.onEnter()
  d.onFocusIn()
  d.onFocusOut()

  assert.equal(d.open.value, true, '鼠标还在，此时收起会让按钮在光标下消失')
})

test('焦点离开且鼠标也走了：收起', () => {
  const d = desktop()
  d.onEnter()
  d.onFocusIn()
  d.onLeave()
  d.onFocusOut()
  assert.equal(d.open.value, false)
})

test('两个来源都消失才收起，顺序无关', () => {
  // 顺序一：先悬停后聚焦，然后先失焦
  const first = desktop()
  first.onFocusIn()
  first.onEnter()
  first.onFocusOut()
  assert.equal(first.open.value, true, '鼠标还在，失焦后仍应展开')
  first.onLeave()
  assert.equal(first.open.value, false)

  // 顺序二：先悬停后聚焦，然后先移开鼠标
  const second = desktop()
  second.onFocusIn()
  second.onEnter()
  second.onLeave()
  assert.equal(second.open.value, true, '焦点还在，移开鼠标后仍应展开')
  second.onFocusOut()
  assert.equal(second.open.value, false)
})

test('键盘 Tab 进输入框也能展开（不依赖鼠标）', () => {
  const d = desktop()
  d.onFocusIn()
  assert.equal(d.open.value, true)
})

// ── 触屏 ───────────────────────────────────────────────────

test('触屏：补发的 mouseenter 不参与判定（否则手机关不掉）', () => {
  const t = touch()
  t.onEnter()
  assert.equal(t.open.value, false, '触屏上的悬停是浏览器补发的，不能当作真实悬停')

  // 点按走 reveal + 焦点
  t.reveal()
  t.onFocusIn()
  assert.equal(t.open.value, true)

  // 点别处：焦点离开即可收起，不会被残留的「悬停中」挡住
  t.onFocusOut()
  assert.equal(t.open.value, false)
})

test('触屏：onLeave 仍会把内部标记清掉', () => {
  const t = touch()
  t.onEnter() // 被忽略
  t.onLeave()
  assert.equal(t.open.value, false)
})

// ── reveal / close ─────────────────────────────────────────

test('reveal：立刻展开，不等焦点事件到达', () => {
  const d = desktop()
  d.reveal()
  assert.equal(d.open.value, true, '点图标要立刻看到展开，否则会有一帧的空档')
})

test('close：无论此前是悬停还是聚焦，一律收起', () => {
  const d = desktop()
  d.onEnter()
  d.onFocusIn()
  d.close()
  assert.equal(d.open.value, false)
})

test('close 之后再悬停进入，仍能重新展开（状态没有卡死）', () => {
  const d = desktop()
  d.onEnter()
  d.onFocusIn()
  d.close()

  d.onEnter()
  assert.equal(d.open.value, true)
})

test('close 会清掉「悬停中」的内部标记，不会让下一次 onLeave 失效', () => {
  const d = desktop()
  d.onEnter()
  d.close()
  // 若内部还记着 hovered=true，这一句之后状态仍是 true
  d.onLeave()
  assert.equal(d.open.value, false)
})
