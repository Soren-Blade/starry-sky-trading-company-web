/**
 * 个人中心页（`/user/profile`）布局测试
 *
 * 只做源码断言：这里的三类问题（卡片间距、卡片方向、两栏回落）全都只存在于 CSS，
 * SSR 渲染出来的 HTML 一模一样 —— `.ui-card` 自带的方向与页面里显式写的 margin
 * 都不在 HTML 里。真浏览器里一旦漏掉，表现就是「两张卡紧贴在一起」或者
 * 「文案与按钮叠成上下两行」。
 */
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const PROFILE_SOURCE = readFileSync(new URL('../src/pages/Profile.vue', import.meta.url), 'utf8')

test('源码：会员摘要与签到两张卡都有下外边距，不会与下方内容紧贴', () => {
  // .ui-card（global.css）自己不设 margin，.profile-page 也不是 flex/grid 容器，
  // 因此这两张卡与「账号信息 / 修改资料」两栏面板之间的竖向间距只能显式给。
  for (const selector of ['.ui-card.profile-member {', '.ui-card.profile-checkin {']) {
    const at = PROFILE_SOURCE.indexOf(selector)
    assert.ok(at > -1, `应有 ${selector} 规则`)
    const body = PROFILE_SOURCE.slice(at, PROFILE_SOURCE.indexOf('}', at))
    assert.match(body, /margin-bottom: calc\(var\(--space-unit\) \* 3\)/, `${selector} 需要下外边距`)
  }
})

test('源码：签到卡是横向条（文案左、按钮右），不能继承 .ui-card 的纵向方向', () => {
  const at = PROFILE_SOURCE.indexOf('.ui-card.profile-checkin {')
  assert.ok(at > -1)
  const body = PROFILE_SOURCE.slice(at, PROFILE_SOURCE.indexOf('}', at))

  assert.match(body, /flex-direction: row/, 'global.css 的 .ui-card 是 column，必须合写类名覆盖')
  assert.match(body, /justify-content: space-between/)
})

test('源码：极窄屏的签到卡覆盖也带上 .ui-card（否则又变回纵向）', () => {
  const media = PROFILE_SOURCE.slice(PROFILE_SOURCE.indexOf('@media (max-width: 575px)'))
  assert.match(media, /\.ui-card\.profile-checkin \{/, '窄屏覆盖必须是同一个选择器')
})

test('源码：两栏面板用 grid + --section-gap，窄屏回落单列', () => {
  const at = PROFILE_SOURCE.indexOf('.profile-layout {')
  assert.ok(at > -1)
  const body = PROFILE_SOURCE.slice(at, PROFILE_SOURCE.indexOf('}', at))
  assert.match(body, /grid-template-columns: minmax\(0, 1fr\) minmax\(0, 1fr\)/)
  assert.match(body, /gap: var\(--section-gap\)/)

  const media = PROFILE_SOURCE.slice(PROFILE_SOURCE.indexOf('@media (max-width: 991px)'))
  assert.match(media, /\.profile-layout \{[\s\S]*?grid-template-columns: minmax\(0, 1fr\)/)
})
