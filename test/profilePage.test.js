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
    PROFILE_SOURCE.indexOf('class="profile-summary-actions"'),
    PROFILE_SOURCE.indexOf('</section>', PROFILE_SOURCE.indexOf('class="profile-summary-actions"'))
  )
  const checkinAt = actions.indexOf('handleProfileCheckin')
  const editAt = actions.indexOf('profile.editCta')
  assert.ok(checkinAt > -1 && editAt > -1, '身份条应同时有签到与编辑资料入口')
  assert.ok(checkinAt < editAt, '签到应排在编辑资料之前')
  assert.match(actions.slice(checkinAt - 200, checkinAt + 400), /u-btn-primary/)
  assert.match(actions.slice(editAt - 300, editAt + 100), /u-btn-secondary/)
})

test('源码：身份条动作纵向排列，窄屏铺满一行', () => {
  const body = ruleBody('.profile-summary-actions {')
  assert.match(body, /flex-direction: column/)
  assert.match(body, /flex: 0 0 auto/)

  const phone = PROFILE_SOURCE.slice(PROFILE_SOURCE.indexOf('@media (max-width: 575px)'))
  assert.match(phone, /\.profile-summary-actions \{[\s\S]*?width: 100%;[\s\S]*?margin-left: 0/)
})

test('源码：会员数字与说明有明确间距，数字等宽、说明走正文字体，摘要卡合三为一', () => {
  assert.match(ruleBody('.profile-member-stat {'), /gap: calc\(var\(--space-unit\) \* 0\.75\)/)
  assert.match(
    ruleBody('.profile-member-value {'),
    /display: flex[\s\S]*?flex-direction: column[\s\S]*?gap: calc\(var\(--space-unit\) \* 0\.75\)/,
    'dd 只是纵向排版容器，不能整块继承等宽字体'
  )
  assert.match(ruleBody('.profile-member-link {'), /font-family: var\(--font-mono\)/)
  assert.match(ruleBody('.profile-member-sub {'), /font-family: var\(--font-body\)/)
  assert.match(ruleBody('.profile-member-sub {'), /white-space: nowrap/)

  // 身份、会员、统计、邀请合并在同一张摘要卡里：纵向分三段，间距由卡片统一给
  const summary = ruleBody('.ui-card.profile-summary {')
  assert.match(summary, /flex-direction: column/)
  assert.match(summary, /gap: calc\(var\(--space-unit\) \* 2\.5\)/)
  assert.match(summary, /margin-bottom: calc\(var\(--space-unit\) \* 3\)/)
  assert.match(ruleBody('.profile-summary-plan {'), /grid-template-columns: minmax\(0, 1fr\) auto/)
  assert.match(ruleBody('.profile-summary-plan-actions {'), /justify-content: flex-end/)
})

test('源码：资料只在弹层里编辑，账号信息跟在后面，桌面两列、UID 横跨整行', () => {
  // 编辑入口不再常驻；页面常驻的只有只读摘要，表单收进 #profile-editor 弹层
  assert.equal(
    PROFILE_SOURCE.includes('id="profile-edit"'),
    false,
    '不应再有常驻的资料编辑面板'
  )
  const editorAt = PROFILE_SOURCE.indexOf('id="profile-editor"')
  const accountAt = PROFILE_SOURCE.indexOf('class="page-panel profile-account"')
  assert.ok(editorAt > -1, '应有编辑弹层')
  assert.ok(accountAt > editorAt, '账号信息应在资料弹层之后')

  assert.match(ruleBody('.profile-fields {'), /grid-template-columns: repeat\(2, minmax\(0, 1fr\)\)/)
  assert.match(ruleBody('.profile-row--wide {'), /grid-column: 1 \/ -1/)

  const tablet = PROFILE_SOURCE.slice(PROFILE_SOURCE.indexOf('@media (max-width: 991px)'))
  assert.match(tablet, /\.profile-fields \{[\s\S]*?grid-template-columns: minmax\(0, 1fr\)/)
})

test('源码：表单字段昵称独占一行、性别生日并排，手机一列', () => {
  assert.match(
    ruleBody('.profile-field-grid {'),
    /grid-template-columns: repeat\(2, minmax\(0, 1fr\)\)/,
    '弹层只有 640 宽，昵称占整行、两个短字段并排'
  )
  assert.match(
    ruleBody('.profile-field-grid > .u-field:first-child {'),
    /grid-column: 1 \/ -1/
  )

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

test('源码：邀请收进摘要卡最后一行（说明左、入口右），窄屏入口换行', () => {
  const body = ruleBody('.profile-member-invite {')
  assert.match(body, /display: flex/, '邀请行与统计同处一张卡，用分隔线分段即可')
  assert.ok(!body.includes('grid-column'), '合并后不再需要跨会员卡整行')
  assert.match(body, /align-items: baseline/)
  assert.match(body, /border-top: var\(--stroke-width\) solid var\(--divider\)/, '用分隔线区分运营位')

  assert.match(ruleBody('.profile-member-invite-link {'), /margin-left: auto/)

  const phone = PROFILE_SOURCE.slice(PROFILE_SOURCE.indexOf('@media (max-width: 575px)'))
  assert.match(phone, /\.profile-member-invite-link \{[\s\S]*?margin-left: 0/)
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

test('源码：编辑资料走弹层，关闭时按未保存状态确认，保存成功后自动收起', () => {
  // 页面不再常驻表单；「编辑资料」打开弹层，表单在弹层里
  assert.match(PROFILE_SOURCE, /const editorOpen = ref\(false\)/)
  assert.equal(PROFILE_SOURCE.includes('id="profile-edit"'), false, '不再有常驻编辑面板')
  assert.match(PROFILE_SOURCE, /id="profile-editor"/, '弹层应有稳定 id，供测试与焦点管理使用')
  assert.match(PROFILE_SOURCE, /role="dialog"[\s\S]{0,80}?aria-modal="true"/, '弹层必须声明为模态对话框')

  // 无障碍复用项目唯一实现：Escape / 焦点陷阱 / 滚动锁不自己手写
  assert.match(PROFILE_SOURCE, /useModalA11y\(\{[\s\S]{0,200}?initialFocus: '#profile-nickname'/)
  assert.match(PROFILE_SOURCE, /function openEditor\(\)[\s\S]{0,160}?fillForm\(\)[\s\S]{0,120}?activateEditor\(\)/)

  // 关闭：保存中不关；有改动先确认
  assert.match(PROFILE_SOURCE, /function requestCloseEditor\(\)[\s\S]{0,160}?if \(saving\.value\) return/)
  assert.match(PROFILE_SOURCE, /function requestCloseEditor\(\)[\s\S]{0,260}?window\.confirm\(PAGES\.profile\.unsavedConfirm\)/)

  // 路由离开与关页面只在「弹层打开且有改动」时拦，页面本身没有草稿
  assert.match(PROFILE_SOURCE, /onBeforeRouteLeave\(\(\) => \{[\s\S]{0,160}?!editorOpen\.value \|\| !isDirty\.value/)
  assert.match(PROFILE_SOURCE, /handleBeforeUnload[\s\S]{0,160}?editorOpen\.value \|\| !isDirty\.value/)

  // 保存成功关闭弹层，页面回到只读摘要
  assert.match(PROFILE_SOURCE, /if \(result\.success\)[\s\S]{0,240}?editorOpen\.value = false/)
})

test('源码：优惠券空态走正文字体，不继承数字的等宽字号', () => {
  const at = PROFILE_SOURCE.indexOf('v-if="memberStore.overview.coupons != null"')
  const block = PROFILE_SOURCE.slice(at, PROFILE_SOURCE.indexOf('</dl>', at))
  assert.match(block, /profile-member-link--text/, '0 张时用散文样式，不用数字样式')
  assert.match(ruleBody('.profile-member-link--text {'), /font-family: var\(--font-body\)/)
  assert.match(ruleBody('.profile-member-link--text {'), /font-size: var\(--fs-label\)/)
})

test('源码：账号说明里的入口是行内文本链接，不再是一排按钮', () => {
  assert.ok(!PROFILE_SOURCE.includes('class="profile-security"'), '按钮组已删除')
  assert.ok(!PROFILE_SOURCE.includes('.profile-security'), '对应样式也应删除')

  const at = PROFILE_SOURCE.indexOf('class="page-note profile-note"')
  const block = PROFILE_SOURCE.slice(at, PROFILE_SOURCE.indexOf('</section>', at))
  assert.match(block, /class="profile-note-links"/)
  assert.match(block, /to="\/other\/2fa"/)
  assert.match(block, /to="\/support"/)
  assert.match(ruleBody('.profile-note-links a {'), /color: var\(--accent\)/)
})

test('源码：邮箱 / 手机号可在弹层里直接改，且校验格式与空值', () => {
  assert.match(PROFILE_SOURCE, /v-model="form\.email"/)
  assert.match(PROFILE_SOURCE, /v-model="form\.phone"/)
  assert.match(PROFILE_SOURCE, /id="profile-email"/)
  assert.match(PROFILE_SOURCE, /id="profile-phone"/)

  // 失焦校验 + 提交前校验，错误挂在字段下方
  assert.match(PROFILE_SOURCE, /function validateEmail\(\)/)
  assert.match(PROFILE_SOURCE, /function validatePhone\(\)/)
  assert.match(PROFILE_SOURCE, /@blur="validateEmail"/)
  assert.match(PROFILE_SOURCE, /@blur="validatePhone"/)
  assert.match(PROFILE_SOURCE, /id="profile-email-error"/)
  assert.match(PROFILE_SOURCE, /id="profile-phone-error"/)

  // 只提交改动过的字段；空值仍受「已有凭据不能清空」约束
  assert.match(PROFILE_SOURCE, /if \(emailValue !== baseline\.value\.email/)
  assert.match(PROFILE_SOURCE, /if \(phoneValue !== baseline\.value\.phone/)
  assert.match(PROFILE_SOURCE, /emailError\.value = baseline\.value\.email \? PAGES\.profile\.emailRequired/)
  assert.match(PROFILE_SOURCE, /phoneError\.value = baseline\.value\.phone \? PAGES\.profile\.phoneRequired/)

  // 说明文字必须与「能否自助改」一致
  assert.ok(!PROFILE_SOURCE.includes('手机号是登录凭据'))
})

test('源码：操作日志是时间线，按范围加载最近几条并能重试', () => {
  assert.match(PROFILE_SOURCE, /getMyLogs\(\{ range: logRange\.value, limit: LOG_PREVIEW_LIMIT \}\)/)
  assert.match(PROFILE_SOURCE, /const LOG_PREVIEW_LIMIT = 6/)
  assert.match(PROFILE_SOURCE, /class="profile-log-list"/)
  assert.match(PROFILE_SOURCE, /v-for="item in logItems"/)
  assert.match(PROFILE_SOURCE, /formatLogTime\(item\.created_at\)/)
  assert.match(PROFILE_SOURCE, /item\.outcome_label/)
  assert.match(PROFILE_SOURCE, /PAGES\.profile\.logsEmpty/)
  assert.match(PROFILE_SOURCE, /PAGES\.profile\.logsRetry/)
  assert.match(PROFILE_SOURCE, /@click="selectLogRange\(item\.value\)"/)
  assert.match(PROFILE_SOURCE, /const selectLogRange = \(value\) => \{[\s\S]{0,200}?loadLogs\(\)/, '切范围要同时刷新列表')

  // 时间线网格：桌面五列、窄屏两列
  assert.match(ruleBody('.profile-log-item {'), /grid-template-columns: 6\.5rem 6rem minmax\(6rem, 9rem\) minmax\(0, 1fr\) auto/)
  const tablet = PROFILE_SOURCE.slice(PROFILE_SOURCE.indexOf('@media (max-width: 767px)'))
  assert.match(tablet, /\.profile-log-item \{[\s\S]*?grid-template-columns: minmax\(0, 1fr\) auto/)
})

test('源码：身份与会员合并成一张摘要卡，旧的两张卡不再存在', () => {
  assert.equal(PROFILE_SOURCE.includes('class="ui-card profile-hero"'), false, '身份条不再是独立卡片')
  assert.equal(
    PROFILE_SOURCE.includes('class="ui-card profile-member"'),
    false,
    '会员摘要不再单独成卡'
  )
  assert.match(PROFILE_SOURCE, /class="ui-card profile-summary"/)
  assert.match(PROFILE_SOURCE, /class="profile-summary-plan"/)
  assert.match(PROFILE_SOURCE, /class="profile-summary-stats"/)
  assert.match(PROFILE_SOURCE, /class="profile-summary-skeleton"/)
  assert.match(PROFILE_SOURCE, /class="profile-summary-error"/)
})

test('源码：手机号带 +86 地区前缀，校验仍只认 11 位数字', () => {
  assert.match(PROFILE_SOURCE, /class="profile-phone-prefix"[\s\S]{0,120}phonePrefix/)
  assert.match(PROFILE_SOURCE, /id="profile-phone"[\s\S]{0,400}class="profile-phone-input"/)
  assert.match(PROFILE_SOURCE, /maxlength="11"/)
  assert.match(PROFILE_SOURCE, /class="profile-phone-group"/)
  assert.match(ruleBody('.profile-phone-group {'), /display: flex/)
  assert.match(ruleBody('.profile-phone-prefix {'), /font-family: var\(--font-mono\)/)
})

test('源码：UID 复制成功有 toast，按钮本身也变成功态', () => {
  assert.match(PROFILE_SOURCE, /notify\.success\(PAGES\.profile\.uidCopied\)/, '复制成功要有即时反馈')
  assert.match(ruleBody('.profile-field-value--code .ec-icon-btn.is-ok {'), /color: var\(--success\)/)
})
