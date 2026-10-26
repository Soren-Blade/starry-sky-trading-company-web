import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

import { renderComponent, createPiniaWithState, createRenderEnv } from './render.mjs'

/**
 * 个人中心用户标识（UUID）的 CardCodeBox 化：
 *   默认掩码（前三段可见、末段恒掩码）→ 点眼睛明文 → 30 秒自动回掩码。
 *
 * 组件逻辑放在 Profile.vue 的普通 <script> 里并以具名导出暴露，
 * 因此这里不用挂载组件、也不用真等 30 秒：掩码规则直接断言，
 * 倒计时用注入的假时钟推进，卸载清理用 dispose() 验证。
 */

const profile = await import('../src/pages/Profile.vue')
const { maskUuid, plainUuid, formatUuid, createUuidRevealController, UUID_REVEAL_MS, UUID_MASK_CHAR } =
  profile

const LONG_UUID = '550e8400e29b41d4a716446655440000'
const MASKED_UUID = '550e-8400-e29b-••••-••••-••••-••••-••••'

const USER_WITH_LONG_UUID = {
  user: {
    userInfo: {
      id: 42,
      uuid: LONG_UUID,
      user_type: 'registered',
      nickname: '星尘',
      username: 'stardust',
      email: 'a@b.c',
      phone: null,
      gender: 'female',
      birthday: '1995-06-15T00:00:00.000Z',
      status: 'active',
      created_at: '2026-01-01T00:00:00.000Z',
      last_login_at: '2026-10-05T00:00:00.000Z',
    },
  },
}

async function renderProfile() {
  const [pinia, env] = await Promise.all([createPiniaWithState(USER_WITH_LONG_UUID), createRenderEnv()])
  return renderComponent('/pages/Profile.vue', {
    plugins: [pinia, env.router],
    globalComponents: env.globalComponents,
  })
}

/** 从 SSR 输出里取出「用户标识」那一行：<dd> 开标签 + 内部 HTML */
function uuidField(html) {
  const at = html.indexOf('<dd class="profile-field-value profile-field-value--code')
  assert.ok(at > 0, '用户标识行应渲染成 CardCodeBox 形态的 <dd>')

  const openEnd = html.indexOf('>', at)
  const closeAt = html.indexOf('</dd>', openEnd)
  assert.ok(closeAt > openEnd, '用户标识行的 <dd> 应正常闭合')

  return { tag: html.slice(at, openEnd + 1), inner: html.slice(openEnd + 1, closeAt) }
}

/** 取 <style> 段并去掉 CSS 注释：注释里会提到类名，不参与「定义几处」的计数 */
function styleBlock() {
  const source = readFileSync(new URL('../src/pages/Profile.vue', import.meta.url), 'utf8')
  const open = source.indexOf('<style')
  assert.ok(open > 0, 'Profile.vue 应有 <style> 段')
  return source.slice(open, source.lastIndexOf('</style>')).replace(/\/\*[\s\S]*?\*\//g, '')
}

/** 取一条规则的规则体（本文件没有嵌套规则，取到下一个 } 即可） */
function ruleBody(css, selector) {
  const at = css.indexOf(selector)
  assert.ok(at >= 0, `样式中应存在 ${selector.trim()} 规则`)
  return css.slice(at, css.indexOf('}', at))
}

/** 可控假时钟：setTimeout 只登记，advance() 时按到期顺序触发 */
function createFakeClock() {
  let now = 0
  let nextId = 1
  const tasks = new Map()

  return {
    now: () => now,
    pending: () => tasks.size,
    timers: {
      setTimeout(callback, delay) {
        const id = nextId++
        tasks.set(id, { at: now + delay, callback })
        return id
      },
      clearTimeout(id) {
        tasks.delete(id)
      },
    },
    advance(ms) {
      now += ms
      for (const [id, task] of [...tasks.entries()]) {
        if (task.at <= now) {
          tasks.delete(id)
          task.callback()
        }
      }
    },
  }
}

test('用户标识默认掩码：前三段可见，其余按四位一组遮住', () => {
  assert.equal(UUID_REVEAL_MS, 30000, '倒计时必须是 30 秒')
  assert.equal(UUID_MASK_CHAR, '•')
  assert.equal(maskUuid(LONG_UUID), MASKED_UUID)
  assert.equal(maskUuid(LONG_UUID.toUpperCase()), '550E-8400-E29B-••••-••••-••••-••••-••••', '保留原大小写')
  assert.equal(maskUuid('abcdefghijklmnop'), 'abcd-efgh-ijkl-••••')
  assert.equal(maskUuid('uuid-42'), 'uuid-42', '短标识不应被整段涂掉（测试账号仍可见）')
  assert.equal(maskUuid(''), '—')
})

test('用户标识明文：仍按四位分组，不做大小写变换', () => {
  assert.equal(plainUuid(LONG_UUID), '550e-8400-e29b-41d4-a716-4466-5544-0000')
  assert.equal(plainUuid('uuid-42'), 'uuid-42')
  assert.equal(plainUuid(null), '—')
})

test('切换后展示明文、回掩码后恢复掩码（template 用的同一个格式化入口）', () => {
  assert.equal(formatUuid(LONG_UUID, false), MASKED_UUID)
  assert.equal(formatUuid(LONG_UUID, true), '550e-8400-e29b-41d4-a716-4466-5544-0000')
})

test('个人中心 SSR：默认渲染掩码，DOM 中不出现完整明文', async () => {
  const html = await renderProfile()

  assert.ok(html.includes(MASKED_UUID), '应显示前三段 + 掩码')
  assert.ok(!html.includes(LONG_UUID), '初始 DOM 不得包含完整 UUID')
  assert.ok(!html.includes('41d4'), '末段（第 13 位之后）必须始终掩码')
  assert.ok(html.includes('已脱敏'), '应标注当前为脱敏状态')

  // 眼睛按钮初始 aria-pressed=false，文案为「显示」；点击后由控制器的
  // onChange 推动 uuidRevealed，模板再把 aria-pressed 同步为 true。
  assert.match(html, /aria-pressed="false"/)
  assert.match(html, /aria-label="显示用户标识"/)
  assert.match(html, /aria-label="复制用户标识"/)
  assert.ok(html.includes('ec-code'), '应使用设计系统 CardCodeBox 版式')
})

test('显示后 30 秒自动回掩码；29,999ms 时仍是明文', () => {
  const changes = []
  const clock = createFakeClock()
  const controller = createUuidRevealController({
    onChange: (value) => changes.push(value),
    timers: clock.timers,
  })

  controller.toggle()
  assert.equal(controller.isRevealed(), true)
  assert.equal(clock.pending(), 1, '显示明文时必须挂上回掩码计时器')

  clock.advance(29999)
  assert.equal(controller.isRevealed(), true, '未满 30 秒不应回掩码')

  clock.advance(1)
  assert.equal(controller.isRevealed(), false, '满 30 秒应自动回掩码')
  assert.deepEqual(changes, [true, false], 'onChange 应同步驱动 aria-pressed')
  assert.equal(clock.pending(), 0, '触发后的计时器应被清理')
})

test('30 秒内再次点眼睛立即回掩码，并取消未触发的计时器', () => {
  const changes = []
  const clock = createFakeClock()
  const controller = createUuidRevealController({
    onChange: (value) => changes.push(value),
    timers: clock.timers,
  })

  controller.show()
  clock.advance(5000)
  controller.toggle()

  assert.equal(controller.isRevealed(), false)
  assert.deepEqual(changes, [true, false])
  assert.equal(clock.pending(), 0, '手动回掩码后不应再留下计时器')

  clock.advance(30000)
  assert.deepEqual(changes, [true, false], '已取消的计时器不能再触发一次 onChange')
})

test('重复 show 会重新计时，不会被旧计时器提前打回掩码', () => {
  const clock = createFakeClock()
  const controller = createUuidRevealController({ timers: clock.timers })

  controller.show()
  clock.advance(20000)
  controller.show()

  clock.advance(20000) // 距第二次 show 只有 20 秒
  assert.equal(controller.isRevealed(), true)

  clock.advance(10000) // 距第二次 show 满 30 秒
  assert.equal(controller.isRevealed(), false)
})

test('dispose() 清理回掩码计时器（组件卸载路径）', () => {
  const changes = []
  const clock = createFakeClock()
  const controller = createUuidRevealController({
    onChange: (value) => changes.push(value),
    timers: clock.timers,
  })

  controller.show()
  assert.equal(clock.pending(), 1)

  controller.dispose()
  assert.equal(clock.pending(), 0, '卸载时必须清掉 setTimeout')

  clock.advance(30000)
  assert.deepEqual(changes, [true], '卸载后旧计时器不得再修改状态')
})

test('模板契约：aria-pressed / aria-label 跟随 uuidRevealed 切换，卸载时清定时器', () => {
  const source = readFileSync(new URL('../src/pages/Profile.vue', import.meta.url), 'utf8')

  assert.ok(
    source.includes(':aria-pressed="uuidRevealed ? \'true\' : \'false\'"'),
    'aria-pressed 必须与明文状态同步'
  )
  assert.ok(
    source.includes(':aria-label="uuidRevealed ? \'隐藏用户标识\' : \'显示用户标识\'"'),
    'aria-label 必须在「显示/隐藏」之间切换'
  )
  assert.ok(source.includes('onBeforeUnmount('), '组件卸载时必须有清理钩子')
  assert.ok(source.includes('uuidController.dispose()'), '卸载时清理回掩码计时器')
  assert.ok(source.includes('clearTimeout(uuidCopyTimer)'), '卸载时清理复制反馈计时器')
})

/* ── 结构：<dd> 自己就是 CardCodeBox（不是底板里再套一张卡片） ───────────── */

test('结构：用户标识的 <dd> 自己就是 CardCodeBox，不再套只读底板', async () => {
  const html = await renderProfile()
  const { tag, inner } = uuidField(html)

  assert.match(tag, /class="[^"]*\bec-code\b[^"]*"/, '<dd> 必须自己带 ec-code，而不是在内部再开一层')
  assert.match(tag, /ec-code--sm/, '字段值列偏窄，卡片走 sm 档')
  assert.match(tag, /profile-field-value--code/, '标识行要有自己的样式钩子')
  assert.doesNotMatch(tag, /u-field-value/, '标识行的 <dd> 不能再挂只读底板类')

  assert.ok(!inner.includes('u-field-value'), '标识行内部也不应出现只读底板类')
  assert.ok(!inner.includes('profile-uuid-code'), '旧的包裹层类应已删除')
})

test('结构：__label / __value / __act 是标识行 <dd> 的直接子元素', async () => {
  const html = await renderProfile()
  const { inner } = uuidField(html)

  // 三段必须紧挨着出现 —— 中间只要多包一层 div，这个断言就挂
  assert.match(
    inner,
    /^<span class="ec-code__label"[^>]*>[^<]*<\/span>\s*<span class="ec-code__value[^"]*"[^>]*>[\s\S]*?<\/span>\s*<div class="ec-code__act"[^>]*>/,
    '__label / __value / __act 必须是 <dd> 的直接子元素，顺序也不能变'
  )

  const act = inner.slice(inner.indexOf('<div class="ec-code__act"'))
  assert.match(act, /aria-label="显示用户标识"/, '操作区仍挂着眼睛按钮')
  assert.match(act, /aria-label="复制用户标识"/, '操作区仍挂着复制按钮')
  assert.doesNotMatch(act, /class="ec-code\b/, '__act 里不能再出现第二层卡片')
})

test('统一性：profile-fields 下每一行共用一套字段值类名', async () => {
  const html = await renderProfile()
  const from = html.indexOf('<dl class="profile-fields">')
  const to = html.indexOf('</dl>', from)
  const rows = html.slice(from, to).match(/<dd [^>]*>/g) || []

  assert.ok(rows.length >= 8, `只读字段应有 8 行，实际 ${rows.length}`)
  for (const tag of rows) {
    assert.match(tag, /profile-field-value/, `<dd> 必须统一带字段值节奏类：${tag}`)
  }

  assert.equal(rows.filter((t) => /\bec-code\b/.test(t)).length, 1, '只有用户标识这一行是卡片形态')
  assert.equal(
    rows.filter((t) => /\bu-field-value\b/.test(t)).length,
    rows.length - 1,
    '其余字段行继续用只读底板（标识行除外）'
  )
})

/* ── 样式：只读字段行的节奏只定义一处 ─────────────────────────────────── */

test('样式：.u-field-value 只有一个定义，节奏统一由 .profile-field-value 提供', () => {
  const css = styleBlock()

  const hits = css.match(/\.u-field-value\b/g) || []
  assert.equal(hits.length, 1, `.u-field-value 只允许有一处规则，实际 ${hits.length} 处`)

  const base = ruleBody(css, '\n.profile-field-value {')
  for (const prop of ['padding-inline', 'min-height', 'font-size', 'line-height', 'color', 'overflow-wrap']) {
    assert.match(base, new RegExp(`(^|\\s)${prop}:`), `统一节奏 .profile-field-value 应声明 ${prop}`)
  }
  assert.match(base, /padding-block: 0/, '卡片自带的块级 padding 要让位给统一 min-height')

  const plate = ruleBody(css, '.profile-fields .u-field-value {')
  assert.doesNotMatch(
    plate,
    /\b(padding|min-height|font-size|line-height)\b/,
    '只读底板不得再声明一套 padding / 字号，否则会出现两套节奏'
  )
})

test('样式：窄屏（≤767px）有防横向溢出的兜底', () => {
  const css = styleBlock()

  const mobile = css.match(/@media \(max-width: 767px\) \{[\s\S]*?\n\}/)
  assert.ok(mobile, '应有 ≤767px 的媒体查询')
  const block = mobile[0]

  // 移动端跟着设计系统的全局缩放收一档（选择器更具体，必须显式同步）
  assert.match(block, /\.profile-field-value \{[^}]*min-height: calc\(var\(--ec-control-h-md\) \* var\(--mobile-control-scale\)\)/)
  assert.match(block, /padding-inline: calc\(var\(--ec-input-px\) \* var\(--mobile-padding-scale\)\)/)

  // 标识行必须留在栏宽以内，值区可收缩、可断词
  assert.match(block, /\.profile-field-value--code \{[^}]*max-width: 100%/, '卡片宽度不得超过栏宽')
  assert.match(
    block,
    /\.profile-field-value--code \.ec-code__value \{[^}]*overflow-wrap: anywhere/,
    '值区要有任意断词兜底'
  )
  assert.match(
    css,
    /\.profile-field-value--code \.ec-code__value \{\s*min-width: 0;/,
    '值区必须允许收缩（省略号），否则 __act 会被挤出卡片'
  )
})
