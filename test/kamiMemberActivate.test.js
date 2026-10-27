import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

import { CREDENTIAL_TYPES, detectCredentialType, normalizeCardNo } from '../src/utils/credential.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const WEB_ROOT = join(__dirname, '..')
const SRC = join(WEB_ROOT, 'src')

const read = (relPath) => readFileSync(join(SRC, ...relPath.split('/')), 'utf8')

/**
 * 卡密控制台（需求 4 / 4.1 / 4.2 / 5 / 7 / 8）的契约守卫。
 *
 * 这几块都依赖「服务端契约 + 交互时序 + CSS 层叠」三件事同时正确，而它们
 * 恰好是 SSR 渲染测试看不见的部分：
 *   - 下拉被裁：DOM 与事件全对，错的是祖先的 overflow；
 *   - 自动识别：400ms 防抖 + 请求序号，写错时序只会偶发丢结果；
 *   - 免卡密激活：错误码分流与额度刷新全靠文案/请求编排；
 *   - toast 着色：选择器写错不会报错，只是永远不生效（默认灰）。
 *
 * 因此这里只钉「契约与不变量」：接口路径/字段名、关键文案、code 分支、
 * 防抖与静默失败、以及 .panel 不裁切浮层。样式细节仍交给视觉回归。
 */

const kamiSection = read('components/KamiSection.vue')
const kamiApi = read('api/ask/kami.js')
const toastHost = read('components/ToastHost.vue')
const formCss = read('assets/styles/ui-kit-form.css')

/** 取出某个选择器第一次出现的顶层规则体（用于检查 .panel 不再裁切） */
function ruleBody(css, selector) {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const match = css.match(new RegExp(`(?:^|\\n)${escaped}\\s*\\{([^}]*)\\}`))
  assert.ok(match, `样式里找不到选择器 ${selector}`)
  return match[1]
}

const countOf = (source, needle) => source.split(needle).length - 1

// ── 一、接口契约：路径、方法与 body 字段名 ─────────────────────

test('API 契约：卡密/会员接口的路径、方法与 body 字段名与后端一致', () => {
  assert.match(
    kamiApi,
    /function lookupCard\(cardNo\) \{\s*return request\.post\(`\$\{baseURL\}\/lookupCard`, \{ card_no: cardNo \}\)/,
    'lookupCard 必须是 POST /lookupCard，body 字段名为 card_no'
  )
  assert.match(
    kamiApi,
    /function getMemberQuota\(\) \{\s*return request\.get\(`\$\{baseURL\}\/memberQuota`\)/,
    'getMemberQuota 必须是 GET /memberQuota'
  )
  assert.match(
    kamiApi,
    /function activateByMember\(data\) \{\s*return request\.post\(`\$\{baseURL\}\/activateByMember`, data\)/,
    'activateByMember 必须是 POST /activateByMember，body 原样透传'
  )
  assert.match(
    kamiApi,
    /function getMyEntitlements\(\) \{\s*return request\.get\(`\$\{baseURL\}\/myEntitlements`\)/,
    'getMyEntitlements 必须是 GET /myEntitlements，且返回整包 data'
  )
  assert.match(
    kamiApi,
    /export default \{[\s\S]*?lookupCard,[\s\S]*?getMemberQuota,[\s\S]*?activateByMember,/,
    '三个方法必须挂进默认导出，否则 api 门面（src/api/index.js）取不到'
  )
  assert.match(kamiApi, /getMyEntitlements,/, '已激活工具要走默认导出里的 getMyEntitlements')
})

// ── 二、纯函数：凭证识别（需求 4.1） ─────────────────────────

test('detectCredentialType：标准 UUID → uid，三段十六进制 → card', () => {
  assert.equal(detectCredentialType('c2b248f1-0505-40d4-9a96-09a445e0a900'), CREDENTIAL_TYPES.UID)
  assert.equal(detectCredentialType('C2B248F1-0505-40D4-9A96-09A445E0A900'), CREDENTIAL_TYPES.UID)
  assert.equal(detectCredentialType('  c2b248f1-0505-40d4-9a96-09a445e0a900  '), CREDENTIAL_TYPES.UID)

  assert.equal(detectCredentialType('8FBC-427D-D3D9'), CREDENTIAL_TYPES.CARD)
  assert.equal(detectCredentialType('8fbc-427d-d3d9'), CREDENTIAL_TYPES.CARD)
})

test('detectCredentialType：兜底不放过历史批次卡号，也不接走打错的 UID', () => {
  // 历史批次：generate_cards 之前的无分隔卡号（后端测试桩里的 STAR2026ABCDEF）
  assert.equal(detectCredentialType('STAR2026ABCDEF'), CREDENTIAL_TYPES.CARD)
  assert.equal(detectCredentialType('star2026abcdef'), CREDENTIAL_TYPES.CARD)
  // 少写分隔符的十六进制
  assert.equal(detectCredentialType('8FBC427DD3D9'), CREDENTIAL_TYPES.CARD)

  // 五段形状但没通过 UUID 校验（打错一位）→ 不能当卡密去查，否则静默 404
  assert.equal(detectCredentialType('c2b248f1-0505-40d4-9a96-09a445e0a90'), CREDENTIAL_TYPES.UNKNOWN)
  assert.equal(detectCredentialType('c2b248f1-0505-40d4-9a96-09a445e0a9000'), CREDENTIAL_TYPES.UNKNOWN)

  // 两者都不像：不发任何请求
  assert.equal(detectCredentialType(''), CREDENTIAL_TYPES.UNKNOWN)
  assert.equal(detectCredentialType('   '), CREDENTIAL_TYPES.UNKNOWN)
  assert.equal(detectCredentialType('hello'), CREDENTIAL_TYPES.UNKNOWN)
  assert.equal(detectCredentialType('abcdefgh'), CREDENTIAL_TYPES.UNKNOWN)
  assert.equal(detectCredentialType(null), CREDENTIAL_TYPES.UNKNOWN)
  assert.equal(detectCredentialType(12345678), CREDENTIAL_TYPES.UNKNOWN)
})

test('normalizeCardNo：统一大写，12 位紧凑写法补回三段式', () => {
  assert.equal(normalizeCardNo('8fbc-427d-d3d9'), '8FBC-427D-D3D9')
  assert.equal(normalizeCardNo(' 8fbc427dd3d9 '), '8FBC-427D-D3D9')
  assert.equal(normalizeCardNo('star2026abcdef'), 'STAR2026ABCDEF')
  assert.equal(normalizeCardNo(''), '')
  assert.equal(normalizeCardNo(undefined), '')
})

// ── 三、合并后的左栏：一个输入框 + 一个下拉 + 一个主按钮 ────────

test('合并面板：只留一个输入框、一个工具下拉、一个提交按钮', () => {
  const formStart = kamiSection.indexOf('<form class="activate-form"')
  assert.ok(formStart > 0, '找不到合并后的表单')
  const formEnd = kamiSection.indexOf('</form>', formStart)
  const form = kamiSection.slice(formStart, formEnd)

  assert.match(form, /<SelectField\s+v-model="selectedToolId"\s+:options="toolOptions"/)
  assert.match(form, /v-model="activateCode"/)
  assert.match(form, /type="submit"/, '主按钮必须走表单提交，回车与点击同一入口')
  assert.match(form, /@submit\.prevent="handleSubmit"/)

  // 顺序：先选工具、再粘凭据、最后提交
  assert.ok(
    form.indexOf('<SelectField') < form.indexOf('v-model="activateCode"') &&
      form.indexOf('v-model="activateCode"') < form.indexOf('type="submit"'),
    '模板顺序必须是 工具下拉 → 输入框 → 主按钮'
  )

  // 全组件只能有一个输入框（旧的会员 UID 输入框必须消失）
  assert.equal(countOf(kamiSection, '<input'), 1, '合并后不该再有第二个输入框')
  assert.doesNotMatch(kamiSection, /member-card/, '旧的「会员免卡密激活」面板必须删掉')
  assert.doesNotMatch(kamiSection, /memberFormDisabled|memberSubmitDisabled/)
  assert.doesNotMatch(kamiSection, /memberToolId|memberUuid\b/)
})

test('输入框文案：卡密 / 用户 UID 双语义，placeholder 与 aria-label 同步', () => {
  assert.match(kamiSection, /placeholder="粘贴卡密 \/ 用户 UID"/)
  assert.match(kamiSection, /aria-label="卡密或用户 UID"/)
  assert.match(kamiSection, /请输入卡密或用户 UID/, '未识别时要有明确提示')
})

test('按钮文案跟识别结果走：UID → 免卡密激活，其余 → 激活', () => {
  assert.match(
    kamiSection,
    /const submitLabel = computed\(\(\) =>\n\s*credentialType\.value === CREDENTIAL_TYPES\.UID \? '免卡密激活' : '激活'\n\)/
  )
  assert.match(kamiSection, /\{\{ submitting \? '激活中\.\.\.' : submitLabel \}\}/)
  assert.match(kamiSection, /:aria-busy="submitting"/)
})

test('提交按钮 disabled：空值 / 未识别 / UID 未选工具 / 请求进行中', () => {
  const start = kamiSection.indexOf('const submitDisabled = computed(() => {')
  assert.ok(start > 0, '找不到 submitDisabled')
  const body = kamiSection.slice(start, kamiSection.indexOf('\n})', start))

  assert.match(body, /if \(submitting\.value\) return true/, '请求未返回前不能再点')
  assert.match(body, /if \(!activateCode\.value\.trim\(\)\) return true/)
  assert.match(
    body,
    /if \(credentialType\.value === CREDENTIAL_TYPES\.UNKNOWN\) return true/,
    '未识别时必须禁用（4.1：不发任何请求）'
  )
  assert.match(
    body,
    /if \(credentialType\.value === CREDENTIAL_TYPES\.UID && !selectedToolId\.value\) return true/,
    '会员通道没有工具可激活，必须先选工具'
  )
  assert.match(kamiSection, /:disabled="submitDisabled"/)
})

// ── 四、自动识别时序（需求 4.1） ─────────────────────────────

test('识别防抖：400ms，复用 @/utils/rateLimit 的 debounce', () => {
  assert.match(kamiSection, /import \{ debounce, guardAsync \} from '@\/utils\/rateLimit\.js'/)
  assert.match(kamiSection, /const CREDENTIAL_DEBOUNCE_MS = 400/, '防抖窗口必须是 400ms（契约规定）')
  assert.match(
    kamiSection,
    /const scheduleCredentialScan = debounce\(scanCredential, CREDENTIAL_DEBOUNCE_MS\)/,
    '必须用共享 debounce，而不是再写一个 setTimeout'
  )
  assert.match(kamiSection, /scheduleCredentialScan\(\)/, 'watch(activateCode) 里要触发防抖识别')
  assert.match(
    kamiSection,
    /onBeforeUnmount\(\(\) => \{[\s\S]*?scheduleCredentialScan\.cancel\(\)/,
    '卸载时要取消待执行的识别'
  )
})

test('识别 → 分流：卡密查工具、UID 走会员、unknown 不发请求', () => {
  assert.match(kamiSection, /if \(UUID_RE|detectCredentialType\(activateCode\.value\)/)

  const scanStart = kamiSection.indexOf('const scanCredential = async () => {')
  assert.ok(scanStart > 0, '找不到 scanCredential')
  const scan = kamiSection.slice(scanStart, kamiSection.indexOf('const scheduleCredentialScan'))

  assert.match(scan, /const type = detectCredentialType\(activateCode\.value\)/)
  assert.match(scan, /credentialType\.value = type/)
  assert.match(scan, /if \(type !== CREDENTIAL_TYPES\.CARD\)/, '非卡密不查工具')
  assert.match(scan, /lookupSeq \+= 1/, '切换成非卡密时让在途查询失效')
  assert.match(scan, /await runToolLookup\(normalizeCardNo\(activateCode\.value\)\)/, '卡密要规范化后再查')

  // 提交流程必须同步再判一次，避免 400ms 窗口内把 UID 当卡密提交
  const submitStart = kamiSection.indexOf('function handleSubmit()')
  const submit = kamiSection.slice(submitStart, kamiSection.indexOf('\n}', submitStart))
  assert.match(submit, /scheduleCredentialScan\.cancel\(\)/)
  assert.match(submit, /const type = detectCredentialType\(activateCode\.value\)/)
  assert.match(submit, /if \(type === CREDENTIAL_TYPES\.UID\) return handleMemberActivate\(\)/)
  assert.match(submit, /if \(type === CREDENTIAL_TYPES\.CARD\) return handleActivate\(\)/)
})

test('自动识别成功：精确命中 toolOptions、选中并轻提示，且不锁死下拉', () => {
  assert.match(
    kamiSection,
    /toolOptions\.value\.find\(\(item\) => String\(item\.value\) === String\(toolId\)\)/,
    '必须按 toolOptions 的字符串值比对，避免 number/string 混用漏选'
  )
  assert.match(kamiSection, /selectedToolId\.value = option\.value/, '命中后写回同一个 v-model')
  assert.match(kamiSection, /notify\.success\('已自动选择该卡密对应的工具'\)/)
  assert.match(
    kamiSection,
    /notify\.error\('该卡密绑定的工具已下架'\)/,
    '卡密存在但工具不在可选列表时要明确提示，不能静默'
  )
  // 用户手选的工具不能被自动结果覆盖
  assert.match(
    kamiSection,
    /if \(selectedToolId\.value && selectedToolId\.value !== autoSelectedToolId\) return/
  )
  // 主工具下拉不能被锁死：自动选中后用户仍可改选
  const modelIndex = kamiSection.indexOf('v-model="selectedToolId"')
  const tagStart = kamiSection.lastIndexOf('<SelectField', modelIndex)
  const toolSelect = kamiSection.slice(tagStart, kamiSection.indexOf('>', modelIndex) + 1)
  assert.doesNotMatch(toolSelect, /disabled/, '自动选中不是锁定，主工具下拉不得 disabled')
})

test('自动识别并发安全：请求序号丢弃过期响应，同卡不重复查', () => {
  const start = kamiSection.indexOf('async function runToolLookup(cardNo)')
  assert.ok(start > 0, '找不到 runToolLookup')
  const body = kamiSection.slice(start, kamiSection.indexOf('onBeforeUnmount', start))

  assert.match(body, /if \(cardNo === lastLookupCardNo\) return/, '同一张卡不得重复查询')
  assert.match(body, /lastLookupCardNo = cardNo[\s\S]*?const seq = \+\+lookupSeq/, '先登记再发请求')
  assert.match(body, /if \(lookupDisposed \|\| seq !== lookupSeq\) return/, '过期响应必须丢弃')
  assert.match(body, /if \(normalizeCardNo\(activateCode\.value\) !== cardNo\) return/, '输入已改则丢弃')
})

test('自动识别失败：静默（只在 DEV 打一条 debug），绝不在打字时弹错', () => {
  const start = kamiSection.indexOf('async function runToolLookup(cardNo)')
  const end = kamiSection.indexOf('onBeforeUnmount', start)
  const body = kamiSection.slice(start, end)

  const catchIndex = body.indexOf('} catch (error) {')
  assert.ok(catchIndex > 0, 'runToolLookup 必须有 catch')
  const catchBlock = body.slice(catchIndex)

  assert.doesNotMatch(catchBlock, /notify\./, 'catch 里不能 toast —— 用户可能还在输入')
  assert.match(catchBlock, /import\.meta\.env\?\.DEV/, '只在开发环境输出')
  assert.match(catchBlock, /console\.debug/, '失败最多留一条 console.debug')
})

// ── 五、说明框（需求 4.2） ───────────────────────────────────

test('说明框：面板之后、四条指引齐全', () => {
  const asideIndex = kamiSection.indexOf('<aside class="side-notes"')
  assert.ok(asideIndex > 0, '找不到 .side-notes 说明框')
  assert.ok(
    asideIndex > kamiSection.indexOf('class="panel activate-panel"'),
    '说明框必须在合并后的面板之后（页面左下）'
  )
  assert.ok(asideIndex < kamiSection.indexOf('class="panel list-panel"'), '说明框属于左栏')

  const aside = kamiSection.slice(asideIndex, kamiSection.indexOf('</aside>', asideIndex))
  assert.equal(countOf(aside, '<li>'), 4, '四条指引')
  assert.match(aside, /有卡密：把卡密粘贴到输入框，系统会自动识别它绑定的工具并选好，点「激活」即可。/)
  assert.match(
    aside,
    /是会员：粘贴自己的用户 UID（留空则按当前登录账号校验），选好工具后点「免卡密激活」。/
  )
  assert.match(aside, /会员额度：/, '第三条是额度说明')
  assert.match(aside, /额度用尽或不是会员：/)
  assert.match(aside, /to="\/member\/plans"[\s\S]{0,40}升级会员/, '要有升级会员出口')
  assert.match(aside, /to="\/tool"[\s\S]{0,40}购买卡密/, '要有购买卡密出口')
})

test('说明框接管原会员卡文案：额度档位 + 有效期 + 非会员提示', () => {
  assert.match(
    kamiSection,
    /本等级可免卡密激活 \$\{quota\.quota\} 个工具，已用 \$\{quota\.used\} 个，剩余 \$\{quota\.remaining\} 个/,
    '文案必须同时含 quota / used / remaining'
  )
  assert.match(kamiSection, /quota\.unlimited[\s\S]*?不限数量/, 'unlimited 会员不能显示具体数字额度')
  assert.match(kamiSection, /还不是会员 · 开通会员可免卡密使用工具/)
  assert.match(
    kamiSection,
    /v-if="memberQuota\?\.is_member && memberQuota\.expires_at"[\s\S]{0,120}权益有效期至 \{\{ formatDate\(memberQuota\.expires_at\) \}\}/,
    'member-expire 文案搬到说明框，仍然只在会员态显示'
  )
  // 搬走文案后不能留空容器：额度行必须有可见文案分支
  const quotaLi = kamiSection.slice(
    kamiSection.indexOf('会员额度：'),
    kamiSection.indexOf('额度用尽或不是会员')
  )
  assert.match(quotaLi, /class="member-identity"/, '额度行保留 member-identity 钩子')
  assert.match(quotaLi, /正在读取会员权益…/, '额度未到时也要有文案，不留空')
})

// ── 六、会员免卡密激活的提交与失败分流 ───────────────────────

test('提交：tool_id 必传、user_uuid 来自同一个输入框且不传空串', () => {
  assert.match(kamiSection, /const payload = \{ tool_id: toolId \}/)
  assert.match(
    kamiSection,
    /detectCredentialType\(activateCode\.value\) === CREDENTIAL_TYPES\.UID/,
    'user_uuid 取自合并后的输入框，且仅当识别为 UID 时下发'
  )
  assert.match(kamiSection, /if \(typedUid\) payload\.user_uuid = typedUid/, '留空时不得下发空字符串')
  assert.match(kamiSection, /api\.activateByMember\(payload\)/)
  assert.match(kamiSection, /notify\.success\(response\.message \|\| '免卡密激活成功'\)/)
  assert.match(
    kamiSection,
    /await Promise\.all\(\[loadMemberQuota\(\), reload\(1\)\]\)/,
    '成功后要刷新额度与卡密列表（授权表在「我的资产」，不在这里刷新）'
  )
})

test('失败按 code 分流：文案与入口按钮齐全', () => {
  const cases = [
    ['NOT_MEMBER', '当前账号还不是会员，开通会员后可免卡密激活工具。'],
    ['QUOTA_EXCEEDED', '本等级额度已用满，升级会员或购买卡密。'],
    ['TOOL_NOT_ELIGIBLE', '该工具不支持会员免卡密激活，请购买卡密。'],
    ['USER_UUID_MISMATCH', '用户标识与当前登录账号不一致。'],
    ['TOOL_NOT_FOUND', '该工具不存在或已下架。'],
    ['TOOL_ID_REQUIRED', '请先选择要激活的工具。'],
  ]
  for (const [code, message] of cases) {
    assert.match(kamiSection, new RegExp(`${code}: '${message.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}'`))
  }

  assert.match(
    kamiSection,
    /code === 'QUOTA_EXCEEDED'[\s\S]*?to: '\/member\/plans'[\s\S]*?to: '\/tool'/,
    '额度用满要给「升级会员」和「购买卡密」两个入口'
  )
  assert.match(
    kamiSection,
    /code === 'NOT_MEMBER'\) return \[\{ to: '\/member\/plans'/,
    '非会员只给开通会员入口'
  )
  assert.match(kamiSection, /role="alert"/, '失败文案要进入 live region')
})

test('额度取数与兜底：404 视为「未开放」，退出登录清干净', () => {
  assert.match(kamiSection, /api\.getMemberQuota\(\)/)
  assert.match(kamiSection, /error\?\.status === 404/, '404 单独识别')
  assert.match(kamiSection, /会员免卡密激活暂未开放，请稍后再试。/)
  assert.match(kamiSection, /memberQuotaUnavailable/, '404 与真实错误要共享同一份状态')
  assert.match(
    kamiSection,
    /onMounted\(async \(\) => \{[\s\S]*?loadMemberQuota\(\)/,
    '进入页面就要读额度'
  )
  assert.match(
    kamiSection,
    /watch\(\s*\(\) => userStore\.userId[\s\S]*?resetMemberPanel\(\)/,
    '退出登录必须清掉上一个账号的额度'
  )
})

// ── 七、防连点（需求 5） ─────────────────────────────────────

test('两个激活动作都过 guardAsync，连点不会发第二次请求', () => {
  assert.match(kamiSection, /const handleActivate = guardAsync\(\(\) => activation\.activate\(\)\)/)
  assert.match(kamiSection, /const handleMemberActivate = guardAsync\(runMemberActivate\)/)
  // 现有 activating 标记保留（按钮 loading 文案与 aria-busy 还要用）
  assert.match(kamiSection, /activating/, 'activating 标记必须保留')
  assert.match(kamiSection, /memberActivating/, '会员通道的进行中标记必须保留')
})

// ── 八、已激活工具（需求 8）→ 2.3.0 起挪到「我的资产」 ────────

test('已激活工具：卡密页只留出口，表格整体搬去「我的资产」', () => {
  // 表格、来源标签、滚动锚点全部下线（同一份数据不在两个页面各画一遍）
  assert.equal(kamiSection.includes('class="entitlements-section"'), false, '小节已删除')
  assert.equal(kamiSection.includes('entitlements-table'), false, '表格已删除')
  assert.equal(kamiSection.includes('getEntitlementSource'), false, '来源映射随表一起走')
  assert.equal(kamiSection.includes('entitlementsBlock'), false, '滚动锚点已删除')

  // 取而代之是一个明确的出口
  assert.match(kamiSection, /class="entitlements-link-row"/)
  assert.match(
    kamiSection,
    /<router-link class="u-btn-secondary" to="\/user\/assets">/,
    '出口指向 /user/assets'
  )
  assert.match(kamiSection, /已激活的工具在「我的资产」查看/)

  // 成功模板的主动作也要跳过去，而不是滚动
  assert.match(kamiSection, /label: '查看我的资产'/)
  assert.match(
    kamiSection,
    /if \(action === 'show-entitlements'\) \{\s*\/\/[^\n]*\n\s*router\.push\('\/user\/assets'\)/,
    'show-entitlements 改为跳转'
  )
})

test('已激活工具：卡密通道成功后只刷卡密列表，不再重复拉授权', () => {
  assert.match(kamiSection, /onActivated: \(\) => reload\(1\)/, '卡密通道只刷列表')
  assert.match(
    kamiSection,
    /await Promise\.all\(\[loadMemberQuota\(\), reload\(1\)\]\)/,
    '会员通道刷额度与列表'
  )
  assert.equal(kamiSection.includes('loadEntitlements'), false, '授权取数函数已移出本组件')
  assert.equal(kamiSection.includes('api.getMyEntitlements'), false, '本组件不再请求 /myEntitlements')
})

// ── 九、Toast 着色（需求 7） ─────────────────────────────────

test('Toast 四态图标着色：选择器打在 .toast-icon 上，四种类型各不相同', () => {
  const tokensByClass = {
    'ec-toast--success': 'var(--ec-success)',
    'ec-toast--danger': 'var(--ec-danger)',
  }
  for (const [cls, token] of Object.entries(tokensByClass)) {
    const body = ruleBody(toastHost, `.${cls} .toast-icon`)
    assert.match(body, new RegExp(token.replace(/[()]/g, '\\$&')), `${cls} 的图标要用 ${token}`)
  }

  // warning / info 的类名是本组件扩写（TYPE_CLASS 里没有 ec- 前缀），两种写法都要在
  const warningRule = toastHost.match(/\.ec-toast--warning \.toast-icon,\s*\.toast-warning \.toast-icon\s*\{([^}]*)\}/)
  assert.ok(warningRule, 'warning 同时兼容两种类名')
  assert.match(warningRule[1], /var\(--ec-warning\)/)

  const infoRule = toastHost.match(/\.ec-toast--info \.toast-icon,\s*\.toast-info \.toast-icon\s*\{([^}]*)\}/)
  assert.ok(infoRule, 'info 同时兼容两种类名')
  assert.match(infoRule[1], /var\(--ec-info\)/)

  // 行为不变：TYPE_CLASS 映射与 3 条上限都还在
  assert.match(toastHost, /success: 'ec-toast--success'/)
  assert.match(toastHost, /error: 'ec-toast--danger'/)
  assert.match(toastHost, /warning: 'toast-warning'/)
  assert.match(toastHost, /info: 'toast-info'/)
  // 不给 AppIcon 全局加 ic 类（会把全站图标描边从 2px 改成 1.5px）
  assert.doesNotMatch(toastHost, /['"]ic['"]/, '不得通过加 ic 类来复用 EC 着色规则')
})

// ── 十、下拉遮挡修复 ─────────────────────────────────────────

test('遮挡修复：.panel 不再裁切绝对定位的 SelectField 浮层', () => {
  const panelRule = ruleBody(kamiSection, '.panel')
  assert.doesNotMatch(
    panelRule,
    /overflow\s*:\s*hidden/,
    '.panel 的 overflow:hidden 会裁掉 .u-select-panel；表格横滚由 .u-table-wrap 自理'
  )
  assert.match(
    kamiSection,
    /\.u-select-panel` 是[\s\S]{0,40}绝对定位浮层/,
    '要留下注释解释为什么这里不能加 overflow:hidden'
  )

  const selectPanel = ruleBody(formCss, '.u-select-panel')
  assert.match(selectPanel, /position:\s*absolute/, 'SelectField 面板仍是绝对定位浮层')
  assert.match(selectPanel, /z-index:\s*var\(--z-dropdown\)/, '浮层层级仍走设计令牌')
})
