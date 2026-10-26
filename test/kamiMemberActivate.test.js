import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const WEB_ROOT = join(__dirname, '..')
const SRC = join(WEB_ROOT, 'src')

const read = (relPath) => readFileSync(join(SRC, ...relPath.split('/')), 'utf8')

/**
 * 需求 5 / 5.1 / 8 的前端契约守卫。
 *
 * 这三块都依赖「服务端契约 + 交互时序 + CSS 层叠」三件事同时正确，而它们
 * 恰好是 SSR 渲染测试看不见的部分：
 *   - 下拉被裁：DOM 与事件全对，错的是祖先的 overflow；
 *   - 粘贴识别：要等 400ms 防抖、paste 事件早于 v-model，写错时序只会偶发；
 *   - 免卡密激活：错误码分流与额度刷新全靠文案/请求编排，没法靠快照兜住。
 *
 * 因此这里只钉「契约与不变量」：接口路径/字段名、关键文案、code 分支、
 * 防抖与静默失败、以及去掉裁切祖先的 overflow。样式细节仍交给视觉回归。
 */

const kamiSection = read('components/KamiSection.vue')
const kamiApi = read('api/ask/kami.js')
const formCss = read('assets/styles/ui-kit-form.css')

/** 取出某个选择器第一次出现的顶层规则体（用于检查 .panel 不再裁切） */
function ruleBody(css, selector) {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const match = css.match(new RegExp(`(?:^|\\n)${escaped}\\s*\\{([^}]*)\\}`))
  assert.ok(match, `样式里找不到选择器 ${selector}`)
  return match[1]
}

/** 截取模板中某个开标签的文本（用于确认卡片没有被整体 v-if 掉） */
function openingTag(source, marker) {
  const start = source.indexOf(marker)
  assert.ok(start >= 0, `模板里找不到 ${marker}`)
  const end = source.indexOf('>', start)
  return source.slice(start, end + 1)
}

// ── 一、接口契约：路径、方法与 body 字段名 ─────────────────────

test('API 契约：三个新接口的路径、方法与 body 字段名与后端一致', () => {
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
    /export default \{[\s\S]*?lookupCard,[\s\S]*?getMemberQuota,[\s\S]*?activateByMember,/,
    '三个方法必须挂进默认导出，否则 api 门面（src/api/index.js）取不到'
  )
})

test('自动识别：paste/blur 触发、400ms 防抖、长度门槛、同卡去重', () => {
  assert.match(kamiSection, /@paste="queueToolLookup"/, '卡密输入框要监听 paste')
  assert.match(kamiSection, /@blur="queueToolLookup"/, '卡密输入框要监听 blur')

  assert.match(
    kamiSection,
    /const AUTO_LOOKUP_DEBOUNCE_MS = 400/,
    '防抖窗口必须是 400ms（契约规定）'
  )
  assert.match(kamiSection, /const AUTO_LOOKUP_MIN_LENGTH = 8/, '不足 8 位不查询')
  assert.match(
    kamiSection,
    /if \(cardNo\.length < AUTO_LOOKUP_MIN_LENGTH\) return/,
    '长度门槛必须在请求前短路'
  )
  assert.match(
    kamiSection,
    /if \(selectedToolId\.value \|\| cardNo === lastLookupCardNo\) return/,
    '已选工具 / 同一张卡都不得重复查询'
  )
  assert.match(
    kamiSection,
    /lastLookupCardNo = cardNo[\s\S]*?api\.lookupCard\(cardNo\)/,
    '必须先登记 cardNo 再发请求，失败也不会对同一张卡反复查'
  )
})

test('自动识别成功：精确命中 toolOptions、选中并轻提示', () => {
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
  // 主工具下拉不能被锁死：自动选中后用户仍可改选
  const modelIndex = kamiSection.indexOf('v-model="selectedToolId"')
  assert.ok(modelIndex > 0, '找不到主工具下拉的 v-model')
  const tagStart = kamiSection.lastIndexOf('<SelectField', modelIndex)
  const toolSelect = kamiSection.slice(tagStart, kamiSection.indexOf('>', modelIndex) + 1)
  assert.doesNotMatch(toolSelect, /disabled/, '自动选中不是锁定，主工具下拉不得 disabled')
})

test('自动识别失败：静默（只在 DEV 打一条 debug），绝不在打字时弹错', () => {
  const start = kamiSection.indexOf('async function runToolLookup()')
  assert.ok(start > 0, '找不到 runToolLookup')
  const end = kamiSection.indexOf('onBeforeUnmount', start)
  const body = kamiSection.slice(start, end)

  const catchIndex = body.indexOf('} catch (error) {')
  assert.ok(catchIndex > 0, 'runToolLookup 必须有 catch')
  const catchBlock = body.slice(catchIndex)

  assert.doesNotMatch(catchBlock, /notify\./, 'catch 里不能 toast —— 用户可能还在输入')
  assert.match(catchBlock, /import\.meta\.env\?\.DEV/, '只在开发环境输出')
  assert.match(catchBlock, /console\.debug/, '失败最多留一条 console.debug')
})

// ── 二、会员免卡密激活面板 ───────────────────────────────────

test('会员卡常驻：非会员也显示，只是禁用表单', () => {
  const sectionTag = openingTag(kamiSection, '<section class="member-card"')
  assert.doesNotMatch(sectionTag, /v-if/, '不能把整张会员卡 v-if 掉')
  assert.match(kamiSection, /还不是会员 · 开通会员可免卡密使用工具/)
  assert.match(kamiSection, /本等级可免卡密激活/, '会员态要展示额度文案')

  assert.match(
    kamiSection,
    /const memberFormDisabled = computed\(\(\) => !memberIsMember\.value \|\| memberActivating\.value\)/,
    '非会员必须禁用表单控件'
  )
  assert.match(
    kamiSection,
    /const memberSubmitDisabled = computed\(\(\) => memberFormDisabled\.value \|\| !memberToolId\.value\)/,
    '未选工具时提交按钮也必须禁用'
  )
  assert.match(kamiSection, /:disabled="memberFormDisabled"/)
  assert.match(kamiSection, /:disabled="memberSubmitDisabled"/)
  assert.match(
    kamiSection,
    /v-if="memberQuota && !memberQuota\.is_member"[\s\S]*?to="\/member\/plans"[\s\S]*?开通会员/,
    '非会员要保留 /member/plans 入口'
  )
})

test('额度展示：档位 + quota/used/remaining，unlimited 显示不限数量', () => {
  assert.match(
    kamiSection,
    /本等级可免卡密激活 \$\{quota\.quota\} 个工具，已用 \$\{quota\.used\} 个，剩余 \$\{quota\.remaining\} 个/,
    '文案必须同时含 quota / used / remaining'
  )
  assert.match(
    kamiSection,
    /quota\.unlimited[\s\S]*?不限数量/,
    'unlimited 会员不能显示具体数字额度'
  )
  assert.match(kamiSection, /v-if="memberQuota\?\.is_member && memberQuota\.expires_at"/)
  assert.match(kamiSection, /formatDate\(memberQuota\.expires_at\)/)
})

test('表单：工具复用 toolOptions，用户标识可留空且有说明', () => {
  assert.match(
    kamiSection,
    /<SelectField\s+v-model="memberToolId"\s+:options="toolOptions"/,
    '会员工具选择必须复用同一份 toolOptions'
  )
  assert.match(kamiSection, /placeholder="粘贴你的用户标识以确认身份"/)
  assert.match(kamiSection, /用户标识可留空，留空时按当前登录账号校验身份/)
  assert.match(kamiSection, /v-if="!memberUuid\.trim\(\)"/, '留空说明按输入状态显隐')
  assert.match(kamiSection, /aria-label="选择免卡密激活的工具"/)
  assert.match(kamiSection, /aria-label="用户标识（选填）"/)
})

test('提交：tool_id 必传、user_uuid 选填、成功后提示并刷新额度与列表', () => {
  assert.match(kamiSection, /const payload = \{ tool_id: toolId \}/)
  assert.match(
    kamiSection,
    /const userUuid = memberUuid\.value\.trim\(\)\s*if \(userUuid\) payload\.user_uuid = userUuid/,
    'user_uuid 留空时不得下发空字符串'
  )
  assert.match(kamiSection, /api\.activateByMember\(payload\)/)
  assert.match(kamiSection, /notify\.success\(response\.message \|\| '免卡密激活成功'\)/)
  assert.match(
    kamiSection,
    /await Promise\.all\(\[loadMemberQuota\(\), reload\(1\)\]\)/,
    '成功后要同时刷新额度与卡密列表（复用页面既有 reload）'
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

test('额度取数与兜底：404 视为「未开放」，不弹出用户错误', () => {
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

// ── 三、下拉遮挡修复（需求 5） ───────────────────────────────

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
