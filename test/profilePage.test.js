/**
 * 个人中心页（`/user/profile`）版式测试
 *
 * 只做源码断言：卡片方向、栅格列数、移动端降级这些全都只存在于 CSS 与模板结构里，
 * SSR 出来的 HTML 一模一样 —— `.ui-card` 自带的方向与响应式断点都不在 SSR 结果里。
 * 真浏览器里一旦漏掉，表现就是「两张卡紧贴」「数字与说明粘成一句」「手机上要滚两屏」。
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

test('源码：资料编辑为整页单栏，签到已上移到身份条，下方不再有签到卡', () => {
  assert.ok(!PROFILE_SOURCE.includes('class="profile-layout"'), '不再有左右两栏容器')
  assert.ok(!PROFILE_SOURCE.includes('profile-checkin'), '签到卡与样式应已从下方移除')

  // 身份条里签到在主按钮位、编辑资料是次按钮，且签到排在前面
  const actions = PROFILE_SOURCE.slice(
    PROFILE_SOURCE.indexOf('class="profile-hero-actions"'),
    PROFILE_SOURCE.indexOf('</section>', PROFILE_SOURCE.indexOf('class="profile-hero-actions"'))
  )
  const checkinAt = actions.indexOf('handleProfileCheckin')
  const editAt = actions.indexOf('profile.editCta')
  assert.ok(checkinAt > -1 && editAt > -1, '身份条应同时有签到与编辑资料入口')
  assert.ok(checkinAt < editAt, '签到应排在编辑资料之前')
  assert.match(actions.slice(checkinAt - 200, checkinAt + 400), /u-btn-primary/)
  assert.match(actions.slice(editAt - 300, editAt + 100), /u-btn-secondary/)
})

test('源码：身份条动作纵向排列，窄屏铺满一行', () => {
  const body = ruleBody('.profile-hero-actions {')
  assert.match(body, /flex-direction: column/)
  assert.match(body, /margin-left: auto/)

  const phone = PROFILE_SOURCE.slice(PROFILE_SOURCE.indexOf('@media (max-width: 575px)'))
  assert.match(phone, /\.profile-hero-actions \{[\s\S]*?margin-left: 0/)
})

test('源码：会员条数字与说明有明确间距，数字等宽、说明走正文字体', () => {
  assert.match(ruleBody('.profile-member-stat {'), /gap: calc\(var\(--space-unit\) \* 0\.75\)/)
  assert.match(
    ruleBody('.profile-member-value {'),
    /display: flex[\s\S]*?flex-direction: column[\s\S]*?gap: calc\(var\(--space-unit\) \* 0\.75\)/,
    'dd 只是纵向排版容器，不能整块继承等宽字体'
  )
  assert.match(ruleBody('.profile-member-link {'), /font-family: var\(--font-mono\)/)
  assert.match(ruleBody('.profile-member-sub {'), /font-family: var\(--font-body\)/)
  assert.match(ruleBody('.profile-member-sub {'), /white-space: nowrap/)

  // 卡片本身给足列间距，并让按钮组不再被挤压收缩
  assert.match(ruleBody('.ui-card.profile-member {'), /column-gap: calc\(var\(--space-unit\) \* 4\)/)
  assert.match(ruleBody('.profile-member-actions {'), /flex: 0 0 auto/)
  assert.match(ruleBody('.ui-card.profile-member {'), /margin-bottom: calc\(var\(--space-unit\) \* 3\)/)
})

test('源码：账号信息跟在资料面板之后，桌面两列、UID 横跨整行', () => {
  const editAt = PROFILE_SOURCE.indexOf('id="profile-edit"')
  const accountAt = PROFILE_SOURCE.indexOf('class="page-panel profile-account"')
  assert.ok(editAt > -1 && accountAt > editAt, '账号信息应在资料面板之后')

  assert.match(ruleBody('.profile-fields {'), /grid-template-columns: repeat\(2, minmax\(0, 1fr\)\)/)
  assert.match(ruleBody('.profile-row--wide {'), /grid-column: 1 \/ -1/)

  const tablet = PROFILE_SOURCE.slice(PROFILE_SOURCE.indexOf('@media (max-width: 991px)'))
  assert.match(tablet, /\.profile-fields \{[\s\S]*?grid-template-columns: minmax\(0, 1fr\)/)
})

test('源码：表单三字段同一行，平板两列（昵称独占）、手机一列', () => {
  assert.match(
    ruleBody('.profile-field-grid {'),
    /grid-template-columns: minmax\(0, 1\.2fr\) minmax\(0, 0\.9fr\) minmax\(0, 0\.9fr\)/
  )

  const tablet = PROFILE_SOURCE.slice(PROFILE_SOURCE.indexOf('@media (max-width: 991px)'))
  assert.match(tablet, /\.profile-field-grid \{[\s\S]*?repeat\(2, minmax\(0, 1fr\)\)/)
  assert.match(tablet, /\.profile-field-grid > \.u-field:first-child \{[\s\S]*?grid-column: 1 \/ -1/)

  const phone = PROFILE_SOURCE.slice(PROFILE_SOURCE.indexOf('@media (max-width: 575px)'))
  assert.match(phone, /\.profile-field-grid \{[\s\S]*?grid-template-columns: minmax\(0, 1fr\)/)
})

test('源码：我的服务桌面四列、平板两列、手机 2×2 且隐藏描述行', () => {
  assert.match(
    ruleBody('.profile-services {'),
    /grid-template-columns: repeat\(4, minmax\(0, 1fr\)\)/,
    '桌面四列'
  )

  const tablet = PROFILE_SOURCE.slice(PROFILE_SOURCE.indexOf('@media (max-width: 991px)'))
  assert.match(tablet, /\.profile-services \{[\s\S]*?repeat\(2, minmax\(0, 1fr\)\)/)

  const phone = PROFILE_SOURCE.slice(PROFILE_SOURCE.indexOf('@media (max-width: 575px)'))
  assert.match(phone, /\.profile-services \{[\s\S]*?repeat\(2, minmax\(0, 1fr\)\)/, '手机仍是 2×2')
  assert.match(phone, /\.profile-service-desc \{[\s\S]*?display: none/)
})

test('源码：手机上只读值去掉盒状底板，label + 文本靠 dl 间距分组', () => {
  const phone = PROFILE_SOURCE.slice(PROFILE_SOURCE.indexOf('@media (max-width: 575px)'))
  const block = phone.slice(
    phone.indexOf('.profile-fields .u-field-value {'),
    phone.indexOf('.profile-field-grid {', phone.indexOf('.profile-fields .u-field-value {'))
  )
  assert.match(block, /background: none/)
  assert.match(block, /border: 0/)
  assert.match(block, /line-height: 32px/)
  assert.match(block, /font-family: var\(--font-body\)/)
})

test('源码：邀请卡仍是横向条（文案左、按钮右），窄屏才竖排', () => {
  const body = ruleBody('.ui-card.profile-invite {')
  assert.match(body, /flex-direction: row/, 'global.css 的 .ui-card 是 column，必须合写类名覆盖')
  assert.match(body, /justify-content: space-between/)

  const phone = PROFILE_SOURCE.slice(PROFILE_SOURCE.indexOf('@media (max-width: 575px)'))
  assert.match(phone, /\.ui-card\.profile-invite \{[\s\S]*?flex-direction: column/)
})

test('源码：会员为 0 张券时只渲染空态文案，不与「0」并排', () => {
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

test('源码：头像外链输入框不展示内部路径，保存时跳过 / 开头的内部地址', () => {
  assert.match(PROFILE_SOURCE, /const avatarFromUpload = computed\(\(\) =>/, '应判断头像是否来自上传')
  assert.match(PROFILE_SOURCE, /v-model="avatarUrlInput"/, '输入框只绑定代理值')
  assert.ok(
    !PROFILE_SOURCE.includes('v-model="form.avatar_url"'),
    '不能直接绑 form.avatar_url —— 一展开就会看到 /userApi/avatar/… 内部路径'
  )
  assert.match(PROFILE_SOURCE, /if \(!avatarValue\.startsWith\('\/'\)\) patch\.avatar_url/)
  assert.match(PROFILE_SOURCE, /avatarFromUpload \? PAGES\.profile\.avatarExternalLabel/, '上传态改标「改用外链」')
})

test('源码：banned / deleted 警示条注明「正常不可达」', () => {
  const at = PROFILE_SOURCE.indexOf('const accountAlert = computed')
  const block = PROFILE_SOURCE.slice(at - 600, at)
  assert.match(block, /正常不可达/, '登录只放行 active，这段是防御性死代码，必须写明')
})

test('源码：日志导出文件名是 account-events-<范围>-<日期>.csv，不是 tool-usage-', () => {
  assert.match(PROFILE_SOURCE, /link\.download = `account-events-\$\{logRange\.value\}/)
  assert.ok(!PROFILE_SOURCE.includes('tool-usage-'), '日志内容是账号与商城操作，文件名不能叫 tool-usage')
})
