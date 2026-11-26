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

  // 身份行只留一个主按钮：签到；编辑资料降为「注册于 …」同一行的文字链
  const actions = PROFILE_SOURCE.slice(
    PROFILE_SOURCE.indexOf('class="profile-summary-actions"'),
    PROFILE_SOURCE.indexOf('</section>', PROFILE_SOURCE.indexOf('class="profile-summary-actions"'))
  )
  assert.match(actions, /handleProfileCheckin/)
  assert.match(actions, /u-btn-primary/)
  assert.ok(!actions.includes('profile.editCta'), '编辑资料不再占一个按钮位')

  const head = PROFILE_SOURCE.slice(
    PROFILE_SOURCE.indexOf('class="profile-summary-identity"'),
    PROFILE_SOURCE.indexOf('class="profile-summary-actions"')
  )
  assert.match(head, /profile-summary-edit/)
  assert.match(head, /@click="openEditor"/)
  assert.match(head, /PAGES\.profile\.editCta/)
})

test('源码：身份条动作横向收在右端，窄屏铺满一行', () => {
  const body = ruleBody('.profile-summary-actions {')
  assert.match(body, /display: flex/)
  assert.match(body, /justify-content: flex-end/)
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

  // 身份、会员、统计、邀请合并在同一张「通行证」里：封面 + 身体两段
  const summary = ruleBody('.ui-card.profile-summary {')
  assert.match(summary, /flex-direction: column/)
  assert.match(summary, /gap: 0/)
  assert.match(summary, /padding: 0/)
  assert.match(summary, /overflow: hidden/)
  assert.match(summary, /margin-bottom: calc\(var\(--space-unit\) \* 3\)/)
  assert.match(ruleBody('.profile-summary-head {'), /padding: calc\(var\(--space-unit\) \* 2\.5\)/, '封面自带内边距')
  assert.match(ruleBody('.profile-summary-head {'), /radial-gradient/, '封面是唯一允许挥霍的视觉层')
  assert.match(ruleBody('.profile-summary-plan {'), /grid-template-columns: minmax\(0, 1fr\) auto/)
  assert.match(ruleBody('.profile-summary-plan {'), /grid-template-areas:/, '徽章 + 入口一行，说明落第二行')
  assert.match(ruleBody('.profile-summary-plan {'), /background: var\(--bg-soft\)/, '会员状态条用浅底与统计分开')
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

test('源码：我的服务是一张分组卡，桌面四列、平板两列、手机 2×2 且隐藏描述行', () => {
  assert.match(
    ruleBody('.ui-card.profile-services {'),
    /grid-template-columns: repeat\(4, minmax\(0, 1fr\)\)/,
    '桌面四列'
  )
  // 四个入口不再各自一张卡
  assert.ok(!PROFILE_SOURCE.includes('class="ui-card profile-service"'))

  const tablet = PROFILE_SOURCE.slice(PROFILE_SOURCE.indexOf('@media (max-width: 991px)'))
  assert.match(tablet, /\.ui-card\.profile-services \{[\s\S]*?repeat\(2, minmax\(0, 1fr\)\)/)
  assert.match(tablet, /\.profile-service:nth-child\(2n\) \{[\s\S]*?border-left/)

  const phone = PROFILE_SOURCE.slice(PROFILE_SOURCE.indexOf('@media (max-width: 575px)'))
  assert.match(
    phone,
    /\.ui-card\.profile-services \{[\s\S]*?repeat\(2, minmax\(0, 1fr\)\)/,
    '手机仍是 2×2，且选择器要压过基础规则的 .ui-card.profile-services'
  )
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

test('源码：邀请收进摘要卡最后一行，图标 / 文案 / 入口压在同一行', () => {
  const body = ruleBody('.profile-member-invite {')
  assert.match(body, /display: grid/, '邀请行与统计同处一张卡，用分隔线分段即可')
  assert.ok(!body.includes('grid-column'), '合并后不再需要跨会员卡整行')
  assert.match(body, /grid-template-columns: auto minmax\(0, 1fr\) auto/, '图标 / 文字 / 入口同一行')
  assert.match(body, /align-items: center/)
  assert.match(body, /border-top: var\(--stroke-width\) solid var\(--divider\)/, '用分隔线区分运营位')
  assert.match(body, /background: var\(--bg-soft\)/, '邀请是页脚运营位，用浅底与数字区分')

  // 说明超长时单行省略，不允许再把入口挤到下一行
  assert.match(ruleBody('.profile-member-invite-desc {'), /text-overflow: ellipsis/)
  assert.match(ruleBody('.profile-member-invite-desc {'), /white-space: nowrap/)

  // 入口是一枚安静的胶囊，不需要再靠 margin-left 推右
  const link = ruleBody('.profile-member-invite-link {')
  assert.match(link, /display: inline-flex/)
  assert.match(link, /white-space: nowrap/)
  assert.match(link, /border-radius: var\(--radius-pill\)/)
  assert.ok(!link.includes('margin-left: auto'))

  assert.ok(!PROFILE_SOURCE.includes('profile-member-invite-text'), '旧的整段文案结构已拆成标题 + 说明')
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
  assert.match(PROFILE_SOURCE, /const LOG_PREVIEW_LIMIT = 6/)
  assert.match(
    PROFILE_SOURCE,
    /: await getMyLogs\(\{ range: logRange\.value, limit: LOG_PREVIEW_LIMIT \}\)/
  )
  assert.match(PROFILE_SOURCE, /class="profile-log-list"/)
  assert.match(PROFILE_SOURCE, /v-for="\(item, index\) in logItems"/)
  assert.match(PROFILE_SOURCE, /formatLogTime\(item\.created_at\)/)
  assert.match(PROFILE_SOURCE, /item\.outcome_label/)
  assert.match(PROFILE_SOURCE, /PAGES\.profile\.logsEmpty/)
  assert.match(PROFILE_SOURCE, /PAGES\.profile\.logsRetry/)
  assert.match(PROFILE_SOURCE, /@click="selectLogRange\(item\.value\)"/)
  assert.match(PROFILE_SOURCE, /class="profile-logs-range"/, '范围选择是自研滑轨，不再复用 u-tabs 胶囊')
  assert.match(PROFILE_SOURCE, /class="profile-logs-toolbar"/, '范围与导出同处一条工具栏')
  assert.match(PROFILE_SOURCE, /class="profile-logs-export"/, '导出是安静的文字按钮，不抢页面主按钮')

  // 手机一行：滑轨吃掉剩余宽度，导出贴右端
  const toolbar = ruleBody('.profile-logs-toolbar {')
  assert.match(toolbar, /display: flex/)
  assert.match(toolbar, /align-items: center/)
  assert.match(ruleBody('.profile-logs-range {'), /flex: 1 1 auto/)
  assert.match(ruleBody('.profile-logs-export {'), /margin-left: auto/)

  const phone = PROFILE_SOURCE.slice(PROFILE_SOURCE.indexOf('@media (max-width: 575px)'))
  assert.match(phone, /\.profile-logs-toolbar \{[\s\S]*?gap:/, '手机上工具栏收紧间距')
  assert.match(phone, /\.profile-logs-range \{[\s\S]*?max-width: none/)
  assert.ok(
    !/\.profile-logs-head \{[\s\S]*?flex-direction: column/.test(phone),
    '标题区不再竖排 —— 导出已经移到工具栏'
  )
  assert.match(PROFILE_SOURCE, /const logIcon = \(item\) =>/, '轨迹左侧按类别给字形')
  assert.match(
    PROFILE_SOURCE,
    /const selectLogRange = \(value\) => \{[\s\S]{0,240}?loadLogs\(1\)/,
    '切范围要回到第 1 页并同时刷新列表'
  )

  // 轨迹：字形 + 文本两列，手机再收一档；不再是五列表格
  assert.match(
    ruleBody('.profile-log-item {'),
    /grid-template-columns: calc\(var\(--space-unit\) \* 4\) minmax\(0, 1fr\)/
  )
  assert.match(ruleBody('.profile-log-icon {'), /background: var\(--bg-soft\)/)
  assert.match(ruleBody('.profile-log-outcome::before'), /border-radius: 50%/, '结果是小圆点，不是整枚胶囊')
  const tablet = PROFILE_SOURCE.slice(PROFILE_SOURCE.indexOf('@media (max-width: 767px)'))
  assert.match(tablet, /\.profile-log-item \{[\s\S]*?calc\(var\(--space-unit\) \* 3\.5\) minmax\(0, 1fr\)/)
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

test('源码：手机号带地区前缀，只读显示 +86、编辑用可搜索选择器，校验仍只认 11 位数字', () => {
  // 只读表：展示层补 `+86` 与 3-4-4 分组，存库仍是纯数字
  assert.match(
    PROFILE_SOURCE,
    /key: 'phone'[\s\S]{0,220}formatPhoneDisplay\(data\.phone, DEFAULT_DIAL\)/
  )
  // 编辑弹层：前缀是可选国家 / 地区的触发器，不再是固定标签
  assert.match(PROFILE_SOURCE, /<PhonePrefixPicker v-model="phoneDial" \/>/)
  assert.match(PROFILE_SOURCE, /const phoneDial = ref\(DEFAULT_DIAL\)/)
  assert.match(PROFILE_SOURCE, /id="profile-phone"[\s\S]{0,400}class="profile-phone-input"/)
  assert.match(PROFILE_SOURCE, /maxlength="11"/)
  assert.match(PROFILE_SOURCE, /class="profile-phone-group"/)
  assert.match(ruleBody('.profile-phone-group {'), /display: flex/)
})

test('源码：摘要卡的按钮层级收敛 —— 签到是唯一主按钮，其余降为文字链', () => {
  // 会员行两个入口是「去看看」型导航，不该和主操作抢按钮视觉
  const planActions = PROFILE_SOURCE.slice(
    PROFILE_SOURCE.indexOf('class="profile-summary-plan-actions"'),
    PROFILE_SOURCE.indexOf('</dl>', PROFILE_SOURCE.indexOf('class="profile-summary-plan-actions"'))
  )
  assert.match(planActions, /class="profile-summary-link"/)
  assert.match(planActions, /chevron-right/)
  assert.ok(!planActions.includes('u-btn-secondary'), '会员入口不再用次按钮')

  // 编辑资料是低频动作，做成身份说明行里的文字链
  assert.match(PROFILE_SOURCE, /class="profile-summary-edit"/)
  assert.match(ruleBody('.profile-summary-edit {'), /text-decoration: underline/)
  assert.match(ruleBody('.profile-summary-link {'), /font-size: var\(--fs-label\)/)
  assert.match(ruleBody('.profile-summary-link {'), /color: var\(--text-secondary\)/)

  // 签到按钮带日历图标：图标是「今天」的语义，不只是装饰
  const actions = PROFILE_SOURCE.slice(
    PROFILE_SOURCE.indexOf('class="profile-summary-actions"'),
    PROFILE_SOURCE.indexOf('</section>', PROFILE_SOURCE.indexOf('class="profile-summary-actions"'))
  )
  assert.match(actions, /AppIcon name="calendar"/)
})

test('源码：UID 复制成功有 toast，按钮本身也变成功态', () => {
  assert.match(PROFILE_SOURCE, /notify\.success\(PAGES\.profile\.uidCopied\)/, '复制成功要有即时反馈')
  assert.match(ruleBody('.profile-field-value--code .ec-icon-btn.is-ok {'), /color: var\(--success\)/)
})

/**
 * 4.11.0 移动端三处返工
 *
 * 都是「手机上看得见、但不该那样」的问题，用源码锁定比截图回归便宜：
 *   ① 底部悬浮 Tab 压住最后一行内容（page-shell 只有 38px 下边距）；
 *   ② 游客徽标被全局 column 断点挤到描述下面，独占一行像第二个眉标；
 *   ③ UID 行的眼睛/复制按钮视觉 28px，拇指点不准。
 */
test('源码：手机端给悬浮 Tab 让位，但留白只由 App.vue 预留一次', () => {
  // 4.11.0 起 Profile 不再重复给 .profile-page 加 padding-bottom：
  // App.vue 的 .app-container 已经按 Tab Bar 高度 + 12px + safe-area 预留，
  // 两处叠加会让最后一张卡到页脚多出近 110px 空白。
  assert.doesNotMatch(
    PROFILE_SOURCE,
    /\.profile-page\s*\{[^}]*padding-bottom:/,
    'Profile 页面不再重复预留底部 Tab 空间'
  )
  const app = readFileSync('src/App.vue', 'utf8')
  assert.match(
    app,
    /padding-bottom:\s*calc\(\s*var\(--bottom-nav-height[\s\S]*?env\(safe-area-inset-bottom/,
    '全站容器按 Tab Bar 实际占位统一预留'
  )
})

test('源码：手机端账号信息默认只展示主四行，其余进「更多」', () => {
  assert.match(
    PROFILE_SOURCE,
    /const ACCOUNT_PRIMARY_KEYS = \['uuid', 'username', 'email', 'phone'\]/
  )
  assert.match(
    PROFILE_SOURCE,
    /class="profile-more profile-account-toggle"[\s\S]{0,200}aria-controls="profile-account-list"/
  )
  assert.match(PROFILE_SOURCE, /:aria-expanded="accountMoreOpen \? 'true' : 'false'"/)
  assert.match(PROFILE_SOURCE, /'profile-row--extra': !ACCOUNT_PRIMARY_KEYS\.includes\(row\.key\)/)

  const phone = PROFILE_SOURCE.slice(PROFILE_SOURCE.indexOf('@media (max-width: 767px)'))
  assert.match(phone, /\.profile-row--extra \{\s*display: none;/)
  assert.match(phone, /\.profile-fields\.is-open \.profile-row--extra \{\s*display: grid;/)
})

test('源码：操作日志手机端默认 3 条，展开后按 8 条/页分页', () => {
  assert.match(PROFILE_SOURCE, /const LOG_PAGE_SIZE = 8/)
  assert.match(PROFILE_SOURCE, /const logPage = ref\(1\)/)
  assert.match(PROFILE_SOURCE, /const logHasMore = ref\(false\)/)
  assert.match(
    PROFILE_SOURCE,
    /getMyLogs\(\{[\s\S]{0,200}?limit: LOG_PAGE_SIZE[\s\S]{0,200}?category: logCategory\.value \|\| undefined,[\s\S]{0,120}?outcome: logOutcome\.value \|\| undefined/
  )
  assert.match(PROFILE_SOURCE, /const goLogPage = \(page\) => \{/)
  assert.match(PROFILE_SOURCE, /logPage\.value = 1[\s\S]{0,40}?logHasMore\.value = false/)
  assert.match(PROFILE_SOURCE, /:class="\{ 'profile-log-item--extra': index >= 3 \}"/)
  assert.match(PROFILE_SOURCE, /class="profile-more profile-logs-more"[\s\S]{0,200}aria-controls="profile-log-list"/)

  // 分页器：上一页 / 页码 / 下一页，翻到末页时不再可点
  assert.match(PROFILE_SOURCE, /<nav v-if="logsExpanded" class="profile-log-pager"/)
  assert.match(PROFILE_SOURCE, /:aria-label="PAGES\.profile\.logsPagerAria"/)
  assert.match(PROFILE_SOURCE, /:disabled="logPage <= 1 \|\| logsLoading"/)
  assert.match(PROFILE_SOURCE, /:disabled="!logHasMore \|\| logsLoading"/)
  assert.match(PROFILE_SOURCE, /PAGES\.profile\.logsPagePrev/)
  assert.match(PROFILE_SOURCE, /PAGES\.profile\.logsPageNext/)
  assert.match(PROFILE_SOURCE, /logPageInfo/)

  const phone = PROFILE_SOURCE.slice(PROFILE_SOURCE.indexOf('@media (max-width: 767px)'))
  assert.match(phone, /\.profile-log-item--extra \{\s*display: none;/)

  const narrow = PROFILE_SOURCE.slice(PROFILE_SOURCE.lastIndexOf('@media (max-width: 575px)'))
  assert.match(narrow, /\.profile-log-pager \{/)
  assert.match(narrow, /\.profile-log-page-btn \{/)
})

test('源码：桌面默认展开日志，筛选条与单行台账只在 ≥768 出现', () => {
  // 桌面默认就是分页台账；手机仍是 3 条 + 按需展开。
  assert.match(PROFILE_SOURCE, /matchMedia\?\.\('\(min-width: 768px\)'\)/)
  assert.match(PROFILE_SOURCE, /logsExpanded\.value = true/)

  // 筛选只给桌面：类型 / 结果两个 SelectField，变更即回到第 1 页。
  assert.match(PROFILE_SOURCE, /class="profile-log-filters"/)
  assert.match(PROFILE_SOURCE, /id="profile-log-category"/)
  assert.match(PROFILE_SOURCE, /id="profile-log-outcome"/)
  assert.match(PROFILE_SOURCE, /const logCategoryOptions = computed/)
  assert.match(PROFILE_SOURCE, /const applyLogFilters = \(\) => \{/)
  assert.match(PROFILE_SOURCE, /category: logCategory\.value \|\| undefined/)
  assert.match(PROFILE_SOURCE, /outcome: logOutcome\.value \|\| undefined/)

  const desktop = PROFILE_SOURCE.slice(
    PROFILE_SOURCE.indexOf('@media (min-width: 768px)'),
    PROFILE_SOURCE.indexOf('@media (max-width: 991px)')
  )
  assert.match(desktop, /\.profile-logs-more \{\s*display: flex;/)
  assert.match(desktop, /\.profile-log-filters \{[\s\S]{0,80}?display: flex;/)
  assert.match(desktop, /grid-template-areas: 'time action category detail outcome'/)
  assert.match(desktop, /\.profile-log-line,\s*\.profile-log-meta \{\s*display: contents;/)
  assert.match(desktop, /\.profile-log-category \{[^}]*grid-area: category;/)

  // 手机上筛选条保持隐藏（区域有限）。
  const base = PROFILE_SOURCE.slice(
    PROFILE_SOURCE.indexOf('.profile-log-filters {'),
    PROFILE_SOURCE.indexOf('@media (min-width: 768px)')
  )
  assert.match(base, /display: none;/)
})

test('源码：展开后日志按日期分组，行样式沿用折叠态轨迹', () => {
  // 展开态与折叠态共用同一套「字形 + 动作/结果 + 时刻·类别 + 细节」行式轨迹，
  // 只多一层日期组头；不再为表格感把一行拆成三列。
  assert.match(PROFILE_SOURCE, /<div v-else-if="logsExpanded" id="profile-log-list" class="profile-log-groups">/)
  assert.match(PROFILE_SOURCE, /v-for="group in logGroups"/)
  assert.match(PROFILE_SOURCE, /<ol class="profile-log-list profile-log-list--grouped">/)
  assert.match(PROFILE_SOURCE, /class="profile-log-icon"/)
  assert.match(PROFILE_SOURCE, /formatLogClock\(item\.created_at\)/)
  assert.match(PROFILE_SOURCE, /const logGroups = computed\(\(\) => \{/)
  assert.match(PROFILE_SOURCE, /profile-log-day-count/)
  assert.doesNotMatch(PROFILE_SOURCE, /profile-log-table/)
  assert.doesNotMatch(PROFILE_SOURCE, /profile-log-td-/)

  // 展开后的说明换文案，不再说「默认只展示最近几条」
  assert.match(PROFILE_SOURCE, /logsExpanded \? PAGES\.profile\.logsExpandedNote : PAGES\.profile\.logsPreviewNote/)
})

test('源码：手机端账号行两行一组，摘要封面与统计改版', () => {
  const phone = PROFILE_SOURCE.slice(PROFILE_SOURCE.lastIndexOf('@media (max-width: 575px)'))
  assert.match(phone, /\.profile-row \{\s*grid-template-columns: minmax\(0, 1fr\);/)
  assert.match(phone, /padding-block: calc\(var\(--space-unit\) \* 1\.1\)/)
  assert.match(phone, /border-top: 1px solid var\(--divider\)/)

  // 封面自带内边距；卡片本身不再有 padding，渐变才能压到圆角
  assert.match(phone, /\.ui-card\.profile-summary \{\s*padding: 0;/)
  assert.match(phone, /\.profile-summary-head \{[\s\S]*?padding: calc\(var\(--space-unit\) \* 2\);/)
  assert.match(phone, /\.profile-summary-avatar \{[\s\S]*?calc\(var\(--space-unit\) \* 7\)/)

  // 成长值独占一行，积分与优惠券并排，靠发丝线分栏
  assert.match(phone, /\.profile-summary-stats \{[\s\S]*?grid-template-columns: repeat\(2, minmax\(0, 1fr\)\)/)
  assert.match(phone, /\.profile-summary-stats > \.profile-member-stat:first-child \{\s*grid-column: 1 \/ -1;/)
})

test('源码：页脚在手机上不再沿用桌面 section-gap', () => {
  const footer = readFileSync(new URL('../src/components/Footer.vue', import.meta.url), 'utf8')
  const phone = footer.slice(footer.indexOf('@media (max-width: 767px)'))
  assert.match(phone, /\.footer \{\s*margin-top: calc\(var\(--space-unit\) \* 2\);/, '手机页脚与卡片同节奏')
})

test('源码：手机端页头保持行向，徽标回到标题右侧', () => {
  assert.match(
    PROFILE_SOURCE,
    /\.profile-page \.page-shell-head--row \{[\s\S]*?flex-direction: row;[\s\S]*?\}/
  )
  assert.match(PROFILE_SOURCE, /\.profile-page \.page-shell-head--row > \.u-tag \{[\s\S]*?flex: none/)
})

test('源码：手机端 UID 操作按钮按 44px 触控区，不再缩到 28px', () => {
  const phone = PROFILE_SOURCE.slice(PROFILE_SOURCE.indexOf('@media (max-width: 767px)'))
  assert.match(
    phone,
    /\.profile-field-value--code \.ec-icon-btn \{[\s\S]*?width: var\(--ec-control-h-lg\);[\s\S]*?height: var\(--ec-control-h-lg\);/
  )
})

test('源码：游客在账号信息顶部先看到「登录能得到什么」，而不是七行空值', () => {
  const at = PROFILE_SOURCE.indexOf('class="page-panel profile-account"')
  const block = PROFILE_SOURCE.slice(at, PROFILE_SOURCE.indexOf('</section>', at))
  assert.match(block, /v-if="!userStore\.isLoggedIn"/, '说明只在游客态出现')
  assert.match(block, /PAGES\.profile\.guestNote/)
  assert.ok(
    block.indexOf('profile-account-guest') < block.indexOf('profile-fields'),
    '说明必须在字段列表之前，否则又变成结尾的补丁'
  )
})
