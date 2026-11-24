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

const ruleBody = (selector) => {
  const at = PROFILE_SOURCE.indexOf(selector)
  assert.ok(at > -1, `应有 ${selector} 规则`)
  return PROFILE_SOURCE.slice(at, PROFILE_SOURCE.indexOf('}', at))
}

test('源码：会员卡自身留白，签到 / 邀请的间距由 .profile-ops 的 gap 统一给', () => {
  // .ui-card（global.css）自己不设 margin，.profile-page 也不是 flex/grid 容器，
  // 因此卡片与下方内容的竖向间距只能显式给。
  assert.match(
    ruleBody('.ui-card.profile-member {'),
    /margin-bottom: calc\(var\(--space-unit\) \* 3\)/,
    '会员摘要卡需要下外边距'
  )

  const ops = ruleBody('.profile-ops {')
  assert.match(ops, /grid-template-columns: repeat\(2, minmax\(0, 1fr\)\)/, '签到 + 邀请并排两列')
  assert.match(ops, /gap: calc\(var\(--space-unit\) \* 2\)/, '两卡之间由 grid gap 分隔')
  assert.match(ops, /margin-bottom: calc\(var\(--space-unit\) \* 3\)/, '与下方日志留出间距')

  for (const selector of ['.ui-card.profile-checkin {', '.ui-card.profile-invite {']) {
    assert.match(ruleBody(selector), /margin-bottom: 0/, `${selector} 不再各自占一行，外边距交给 .profile-ops`)
  }
})

test('源码：签到卡与邀请卡都是横向条（文案左、按钮右），不能继承 .ui-card 的纵向方向', () => {
  for (const selector of ['.ui-card.profile-checkin {', '.ui-card.profile-invite {']) {
    const body = ruleBody(selector)

    assert.match(body, /flex-direction: row/, `global.css 的 .ui-card 是 column，${selector} 必须合写类名覆盖`)
    assert.match(body, /justify-content: space-between/)
  }
})

test('源码：极窄屏的签到卡与邀请卡覆盖也带上 .ui-card（否则又变回纵向）', () => {
  const media = PROFILE_SOURCE.slice(PROFILE_SOURCE.indexOf('@media (max-width: 575px)'))
  assert.match(media, /\.ui-card\.profile-checkin \{/, '窄屏覆盖必须是同一个选择器')
  assert.match(media, /\.ui-card\.profile-invite \{/, '窄屏覆盖必须是同一个选择器')
})

test('源码：两栏面板用 grid + --section-gap，窄屏回落单列', () => {
  const body = ruleBody('.profile-layout {')
  assert.match(body, /grid-template-columns: minmax\(0, 1fr\) minmax\(0, 1fr\)/)
  assert.match(body, /gap: var\(--section-gap\)/)

  const media = PROFILE_SOURCE.slice(PROFILE_SOURCE.indexOf('@media (max-width: 991px)'))
  assert.match(media, /\.profile-layout \{[\s\S]*?grid-template-columns: minmax\(0, 1fr\)/)
})

test('源码：我的服务四入口在桌面四列、平板两列、手机一列', () => {
  assert.match(
    ruleBody('.profile-services {'),
    /grid-template-columns: repeat\(4, minmax\(0, 1fr\)\)/,
    '桌面四列'
  )

  const tablet = PROFILE_SOURCE.slice(PROFILE_SOURCE.indexOf('@media (max-width: 991px)'))
  assert.match(tablet, /\.profile-services \{[\s\S]*?repeat\(2, minmax\(0, 1fr\)\)/)

  const phone = PROFILE_SOURCE.slice(PROFILE_SOURCE.indexOf('@media (max-width: 575px)'))
  assert.match(phone, /\.profile-services \{[\s\S]*?grid-template-columns: minmax\(0, 1fr\)/)
})

test('源码：优惠券为 0 时用空态文案替换数字，不与「0」并排', () => {
  const at = PROFILE_SOURCE.indexOf('v-if="memberStore.overview.coupons != null"')
  assert.ok(at > -1, '应有优惠券统计项')
  const block = PROFILE_SOURCE.slice(at, PROFILE_SOURCE.indexOf('</dl>', at))

  assert.match(block, /coupons === 0/, '会员且 0 张要单独判断')
  assert.match(block, /PAGES\.profile\.couponsEmpty/, '0 张时换成「暂无可用券 · 去领券」')
  assert.ok(
    !block.includes('profile-member-sub'),
    '0 张时不要再并排渲染一个数字加一行提示，两句话互相矛盾'
  )
})

test('源码：日志导出文件名是 account-events-<范围>-<日期>.csv，不是 tool-usage-', () => {
  assert.match(PROFILE_SOURCE, /link\.download = `account-events-\$\{logRange\.value\}/)
  assert.ok(!PROFILE_SOURCE.includes('tool-usage-'), '日志内容是账号与商城操作，文件名不能叫 tool-usage')
})
