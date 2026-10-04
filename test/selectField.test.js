import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

// 必须先求值：setup.js 注册 `@/` 别名与 .vue 编译钩子，下面那次动态导入才认得 .vue
import './setup.js'
import { renderComponent, createRenderEnv, createPiniaWithState, WEB_ROOT } from './render.mjs'

const { default: SelectField, filterSelectOptions, splitSelectHit, isSameSelectValue } = await import(
  '@/components/SelectField.vue'
)

/**
 * SelectField 的用例（新建文件，不改动别人的测试）
 *
 * 三层覆盖，对应三种真实风险：
 *   1. 纯函数 —— 过滤、命中切片、值比较。这是唯一能在 Node 里直接断言的部分。
 *   2. SSR（test/render.mjs）—— 模板绑定错误与「无 props 渲染」的噪音警告。
 *   3. 客户端（最小 nodeOps）—— 面板结构 / aria-selected / 键盘 / 点击外部。
 *      为什么非做不可：面板是 v-if 出来的**内部状态**，SSR 只能渲染关闭态，
 *      于是「aria-selected 落在哪一项」「方向键把焦点移到哪」恰好测不到。
 *      这里不引 jsdom、也不给 setup.js 加 DOM 桩（那是被明确否掉的路），
 *      而是给 Vue 一个最小 nodeOps（@vue/runtime-test 的做法）：
 *      元素是普通对象，事件就是对象上的函数。模板逻辑、响应式与事件流
 *      全部真实执行，只有排版不在。
 */

// ── 1. 纯函数 ──────────────────────────────────────────────────

const TOOLS = [
  { value: '1', label: 'ChatGPT 账号' },
  { value: '2', label: 'Claude Pro' },
  { value: '3', label: 'Midjourney 订阅' },
  { value: '4', label: 'Steam 充值卡' },
]

test('filterSelectOptions：大小写不敏感的子串匹配', () => {
  assert.deepEqual(
    filterSelectOptions(TOOLS, 'chatgpt').map((o) => o.value),
    ['1'],
    '小写关键字应命中大写 label'
  )
  assert.deepEqual(
    filterSelectOptions(TOOLS, 'PRO').map((o) => o.value),
    ['2'],
    '大写关键字应命中'
  )
  assert.deepEqual(
    filterSelectOptions(TOOLS, '订阅').map((o) => o.value),
    ['3'],
    '中文关键字应命中'
  )
})

test('filterSelectOptions：只匹配 label，不匹配 value', () => {
  // value 是内部 id / 枚举，命中它会让用户看到一屏「看不出为什么命中」的选项
  assert.deepEqual(filterSelectOptions(TOOLS, '4'), [], 'value=4 不应命中任何选项')
})

test('filterSelectOptions：空关键字返回全部，且不返回原数组', () => {
  const all = filterSelectOptions(TOOLS, '')
  assert.equal(all.length, TOOLS.length)
  assert.notEqual(all, TOOLS, '应返回副本：调用方改它不能污染 props')
  assert.equal(filterSelectOptions(TOOLS, '   ').length, TOOLS.length, '纯空白等于没输入')
  assert.deepEqual(filterSelectOptions(undefined, 'x'), [], '非数组输入不应抛错')
})

test('filterSelectOptions：label 缺失不会抛错，也不会误命中', () => {
  const rows = [{ value: 'a' }, { value: 'b', label: null }, { value: 'c', label: '有名字' }]
  assert.deepEqual(filterSelectOptions(rows, 'b').map((o) => o.value), [], 'value 不参与匹配')
  assert.equal(filterSelectOptions(rows, '').length, 3, '空关键字仍应列出全部')
})

test('splitSelectHit：只把命中的片段切出来，且保留原文大小写', () => {
  assert.deepEqual(splitSelectHit('ChatGPT 账号', 'gpt'), [
    { text: 'Chat', hit: false },
    { text: 'GPT', hit: true },
    { text: ' 账号', hit: false },
  ])
})

test('splitSelectHit：同一段里的多处命中都要高亮', () => {
  const parts = splitSelectHit('卡密码 / 卡密号', '卡密')
  assert.equal(parts.filter((p) => p.hit).length, 2)
  assert.equal(parts.map((p) => p.text).join(''), '卡密码 / 卡密号', '拼回去必须与原文逐字相同')
})

test('splitSelectHit：无关键字 / 无命中时是整段未命中', () => {
  assert.deepEqual(splitSelectHit('任意文案', ''), [{ text: '任意文案', hit: false }])
  assert.deepEqual(splitSelectHit('任意文案', 'zzz'), [{ text: '任意文案', hit: false }])
  assert.deepEqual(splitSelectHit(null, 'a'), [{ text: '', hit: false }], '空 label 不应抛错')
})

test('isSameSelectValue：字符串与数字视为同值，null / undefined 不参与匹配', () => {
  assert.equal(isSameSelectValue('3', 3), true, '后端 id 可能是数字，选项 value 是字符串')
  assert.equal(isSameSelectValue(0, '0'), true)
  assert.equal(isSameSelectValue('', null), false, '空值不应与任何选项相等')
  assert.equal(isSameSelectValue(undefined, ''), false)
  assert.equal(isSameSelectValue('a', 'b'), false)
})

// ── 2. SSR：模板绑定与噪音警告 ─────────────────────────────────

/** 渲染一次并收集 Vue 警告（模板绑错通常只表现为警告，不抛错） */
async function renderSelect(props) {
  return renderWith('/components/SelectField.vue', { props })
}

/** 渲染任意组件并收集 Vue 警告（模板绑错通常只表现为警告，不抛错） */
async function renderWith(spec, options = {}) {
  const warnings = []
  const savedWarn = console.warn
  const savedError = console.error
  console.warn = (...args) => warnings.push(args.map(String).join(' '))
  console.error = (...args) => warnings.push(args.map(String).join(' '))
  try {
    const html = await renderComponent(spec, options)
    return { html, warnings }
  } finally {
    console.warn = savedWarn
    console.error = savedError
  }
}

test('SSR：带 props 渲染无 Vue 警告，触发器是带完整 combobox 语义的 button', async () => {
  const { html, warnings } = await renderSelect({
    modelValue: '2',
    options: TOOLS,
    placeholder: '请选择工具',
    ariaLabel: '选择工具',
    id: 'probe-trigger',
  })

  assert.deepEqual(
    warnings.filter((w) => w.includes('[Vue warn]')),
    [],
    '渲染期间不应出现 Vue 警告'
  )

  assert.match(html, /<button[^>]*id="probe-trigger"/, 'id 必须落在 button 上（label for 关联要用）')
  assert.match(html, /role="combobox"/)
  assert.match(html, /aria-haspopup="listbox"/)
  assert.match(html, /aria-expanded="false"/)
  assert.match(html, /aria-controls="[^"]+-listbox"/, 'aria-controls 要指向面板 id')
  assert.match(html, /aria-label="选择工具"/)
  assert.match(html, /Claude Pro/, '触发器显示已选项的 label（value=2）')
  assert.doesNotMatch(html, /请选择工具/, '已选中时不应同时出现占位文案')
  assert.doesNotMatch(html, /u-select-panel/, '关闭态不应渲染面板')
})

test('SSR：未选中时显示 placeholder，且 disabled 落到触发器上', async () => {
  const { html, warnings } = await renderSelect({
    modelValue: '',
    options: TOOLS,
    placeholder: '请选择工具',
    ariaLabel: '选择工具',
    disabled: true,
  })

  assert.deepEqual(warnings.filter((w) => w.includes('[Vue warn]')), [])
  assert.match(html, /请选择工具/)
  assert.match(html, /disabled/, 'disabled 要落到真实 button 上（套件的禁用样式挂在 :disabled）')
  assert.match(html, /aria-disabled="true"/)
})

test('SSR：无 props 渲染不报错也不产生噪音警告（renderComponents 会遍历到本组件）', async () => {
  const { html, warnings } = await renderSelect({})
  assert.ok(html.length > 0, '必须产出内容')
  assert.deepEqual(
    warnings.filter((w) => w.includes('[Vue warn]')),
    [],
    '缺 prop 不应产生 Missing required prop 之类的警告'
  )
  assert.doesNotMatch(html, /undefined|NaN|\[object Object\]/, '不应出现插值事故')
})

// ── 接线：三处原生 select 已被换掉 ─────────────────────────────

test('接线：KamiSection 用登录态渲染时，两处下拉都是 SelectField', async () => {
  // 用真实 store 初值把组件带到「已登录 + 有工具列表」这一支，控制台两栏才会渲染出来
  const pinia = await createPiniaWithState({
    user: { userInfo: { id: 7, username: 'tester', user_type: 'registered' } },
    tool: {
      toolData: {
        tools: [
          { id: 3, tool_name: 'ChatGPT 账号' },
          { id: 4, tool_name: 'Claude Pro' },
        ],
      },
    },
  })
  const env = await createRenderEnv()
  const { html, warnings } = await renderWith('/components/KamiSection.vue', {
    plugins: [pinia, env.router],
    globalComponents: env.globalComponents,
  })

  assert.deepEqual(
    warnings.filter((w) => w.includes('[Vue warn]')),
    [],
    '接线后渲染不应出现 Vue 警告'
  )
  assert.match(html, /role="combobox"/, '触发器应是带 combobox 语义的 button')
  assert.match(html, /aria-label="选择工具"/, '原 aria-label 必须保留')
  assert.match(html, /aria-label="按状态筛选"/, '原 aria-label 必须保留')
  assert.match(html, /请选择工具/, '未选工具时显示原占位文案')
  assert.match(html, /全部状态/, '状态筛选默认值 all 应显示为「全部状态」')
  assert.doesNotMatch(html, /<select/, '不应再残留原生 select')
})

test('接线：三个文件的模板契约（SSR 覆盖不到的两种分支用源码级断言兜底）', () => {
  const read = (name) => fs.readFileSync(path.join(WEB_ROOT, 'src', 'components', name), 'utf8')

  const kami = read('KamiSection.vue')
  assert.match(kami, /import SelectField from '@\/components\/SelectField\.vue'/, 'KamiSection 必须显式导入')
  assert.match(kami, /v-model="selectedToolId"/, 'v-model 仍绑同一个 ref')
  assert.match(kami, /:options="toolOptions"/, '选项仍来自后端工具列表')
  assert.match(kami, /v-model="statusFilter"[\s\S]*@update:model-value="reload\(1\)"/,
    'v-model 必须写在 @update:model-value 之前：编译器按书写顺序合并处理函数，反过来会拿旧状态去请求')
  assert.doesNotMatch(kami, /<select/, 'KamiSection 不应再残留原生 select')

  // ThemeSwitcher 的「字体族」在弹窗的第二个页签里，而弹窗是 Teleport 出来的 ——
  // SSR 只渲染默认页签，因此这条分支只能靠源码契约把关
  const theme = read('ThemeSwitcher.vue')
  assert.match(theme, /import SelectField from '@\/components\/SelectField\.vue'/, 'ThemeSwitcher 必须显式导入')
  assert.match(theme, /<label class="theme-field-label" :for="fieldId\(field\.key\)">/, 'for 关联必须保留')
  assert.match(theme, /:id="fieldId\(field\.key\)"/, 'id 必须继续传给字段')
  assert.match(theme, /:model-value="themeStore\.custom\[field\.key\]"/, '值仍来自主题 store')
  assert.match(theme, /:options="field\.options"/, '选项仍由 CUSTOM_FIELDS 驱动')
  assert.match(theme, /@update:model-value="themeStore\.setCustom\(field\.key, \$event\)"/,
    '$event 现在是值本身，setCustom 的入参不变')
  assert.doesNotMatch(theme, /<select/, 'ThemeSwitcher 不应再残留原生 select')
})

// ── 3. 客户端：面板结构 / ARIA / 键盘 ──────────────────────────

/**
 * 造一个假元素：只实现被测组件真正调用的那几个能力。
 *
 * `__v_skip` 不是装饰：Vue 的 `ref()` 对普通对象会做一层 reactive 代理，而**真实 DOM
 * 元素不会被代理**（它的 toRawType 不在 reactive 的白名单里，reactive 直接原样返回）。
 * 不标这个标记，`event.target === searchRef.value` 这种在浏览器里恒为真的比较，
 * 会在假环境里变成「原始对象 vs 代理」而恒为假 —— 那是桩的失真，不是组件的问题。
 */
function makeEl(tag) {
  const el = {
    kind: 'element',
    __v_skip: true,
    tag,
    props: {},
    children: [],
    parent: null,
    listeners: {},
    focus() {
      globalThis.document.activeElement = el
    },
    scrollIntoView() {
      el.scrolled = true
    },
    contains(node) {
      for (let cursor = node; cursor; cursor = cursor.parent) if (cursor === el) return true
      return false
    },
    addEventListener(type, fn) {
      el.listeners[type] = el.listeners[type] || []
      el.listeners[type].push(fn)
    },
    removeEventListener(type, fn) {
      el.listeners[type] = (el.listeners[type] || []).filter((item) => item !== fn)
    },
    /** 模拟在输入框里打字：v-model 走的就是 input 事件 */
    type(value) {
      el.value = value
      for (const fn of el.listeners.input || []) fn({ target: el })
    },
    /** 假的 querySelectorAll：只按类名匹配后代，够组件用了 */
    querySelectorAll(selector) {
      const wanted = selector.replace(/^\./, '')
      const found = []
      const walk = (node) => {
        for (const child of node.children) {
          if (child.kind !== 'element') continue
          if (String(child.props.class || '').split(/\s+/).includes(wanted)) found.push(child)
          walk(child)
        }
      }
      walk(el)
      return found
    },
    querySelector(selector) {
      return el.querySelectorAll(selector)[0] || null
    },
  }
  return el
}

const makeText = (text) => ({ kind: 'text', text, props: {}, children: [], parent: null })

function createMockRenderer() {
  const insert = (child, parent, anchor) => {
    child.parent = parent
    const at = anchor ? parent.children.indexOf(anchor) : -1
    if (at >= 0) parent.children.splice(at, 0, child)
    else parent.children.push(child)
  }

  const nodeOps = {
    createElement: (tag) => makeEl(tag),
    createText: (text) => makeText(text),
    createComment: (text) => ({ kind: 'comment', text, props: {}, children: [], parent: null }),
    setText: (node, text) => {
      node.text = text
    },
    setElementText: (el, text) => {
      el.children = text ? [{ ...makeText(text), parent: el }] : []
    },
    parentNode: (node) => node.parent,
    nextSibling: (node) => {
      const parent = node.parent
      if (!parent) return null
      return parent.children[parent.children.indexOf(node) + 1] || null
    },
    querySelector: () => null,
    setScopeId: (el, id) => {
      el.props[id] = ''
    },
    insert,
    remove: (child) => {
      const parent = child.parent
      if (parent) parent.children.splice(parent.children.indexOf(child), 1)
      child.parent = null
    },
    patchProp: (el, key, _prev, next) => {
      el.props[key] = next
    },
  }

  const listeners = []
  const document = {
    activeElement: null,
    createElement: (tag) => makeEl(tag),
    createElementNS: (_ns, tag) => makeEl(tag),
    createTextNode: (text) => makeText(text),
    createComment: (text) => ({ kind: 'comment', text, props: {}, children: [], parent: null }),
    addEventListener: (type, fn) => listeners.push({ type, fn }),
    removeEventListener: (type, fn) => {
      const at = listeners.findIndex((item) => item.type === type && item.fn === fn)
      if (at >= 0) listeners.splice(at, 1)
    },
    querySelector: () => null,
    /** 触发挂在 document 上的捕获监听（点击外部关闭用的就是它） */
    pointerdown(target) {
      for (const item of listeners.filter((l) => l.type === 'pointerdown')) item.fn({ target })
    },
    listenerCount: () => listeners.length,
  }

  return { nodeOps, document, listeners }
}

/**
 * 挂载一个 SelectField 并把它挂成受控组件（与页面里的用法一致）。
 *
 * `document` 只在挂载期间替换、结束后原样还原：`--test-isolation=none` 让所有
 * 测试文件共享进程，别的文件可能装着 setup.js 的 DOM 桩，不能留下自己的版本。
 */
async function mountSelect(props) {
  const { nodeOps, document } = createMockRenderer()
  const savedDocument = globalThis.document
  globalThis.document = document

  const { createRenderer, h, nextTick, ref } = await import('vue')
  const model = ref(props.modelValue ?? null)
  const emitted = []
  const container = makeEl('root')

  createRenderer(nodeOps)
    .createApp({
      render: () =>
        h(SelectField, {
          ...props,
          modelValue: model.value,
          'onUpdate:modelValue': (value) => {
            emitted.push(value)
            model.value = value
          },
        }),
    })
    .mount(container)

  const findByClass = (name) => container.querySelectorAll(`.${name}`)
  const textOf = (node) => (node.kind === 'text' ? node.text : node.children.map(textOf).join(''))

  /** 断言失败时的可读落点：假元素的身份比较没法直接打印（对象图很大且有环） */
  const focused = () => {
    const el = globalThis.document.activeElement
    if (!el) return '(无)'
    return `${el.tag}.${String(el.props.class || '').split(/\s+/).join('.')}「${textOf(el).trim()}」`
  }

  const api = {
    container,
    model,
    emitted,
    document,
    nextTick,
    findAll: findByClass,
    textOf,
    focused,
    trigger: () => findByClass('u-select-trigger')[0],
    items: () => findByClass('u-select-item'),
    panel: () => findByClass('u-select-panel')[0] || null,
    flush: async () => {
      await nextTick()
      await nextTick()
    },
    key: (key, target) => {
      const event = {
        key,
        target,
        prevented: false,
        preventDefault() {
          event.prevented = true
        },
      }
      findByClass('u-select')[0].props.onKeydown(event)
      return event
    },
    click: (el) => el.props.onClick(),
    restore: () => {
      if (savedDocument === undefined) delete globalThis.document
      else globalThis.document = savedDocument
    },
  }

  // 面板打开后的滚动定位与聚焦都排在 nextTick 之后，等一拍再交还控制权
  await api.flush()
  return api
}

test('客户端：展开后面板是 listbox，aria-selected 只落在当前值那一项', async () => {
  const app = await mountSelect({
    modelValue: '2',
    options: TOOLS,
    ariaLabel: '选择工具',
    id: 'probe-trigger',
  })
  try {
    const trigger = app.trigger()
    assert.equal(trigger.props.role, 'combobox')
    assert.equal(trigger.props['aria-expanded'], 'false')
    assert.equal(trigger.props.id, 'probe-trigger', 'id 必须落在 button 上')
    assert.equal(app.panel(), null, '关闭态不该有面板')

    app.click(trigger)
    await app.flush()

    const panel = app.panel()
    assert.ok(panel, '点击后应展开面板')
    assert.equal(trigger.props['aria-expanded'], 'true')

    const listbox = app.findAll('u-select-list')[0]
    assert.equal(listbox.props.role, 'listbox')
    assert.equal(listbox.props.id, trigger.props['aria-controls'], 'aria-controls 必须指向真实存在的面板 id')

    const items = app.items()
    assert.equal(items.length, TOOLS.length)
    assert.deepEqual(
      items.map((item) => item.props['aria-selected']),
      ['false', 'true', 'false', 'false'],
      'aria-selected 只落在 value=2 的 Claude Pro 上'
    )
    assert.deepEqual(
      items.map((item) => item.props.role),
      ['option', 'option', 'option', 'option']
    )
    assert.deepEqual(
      app.findAll('u-select-item--active').map(app.textOf),
      ['Claude Pro'],
      '选中态类名与 aria-selected 必须同步'
    )
    assert.equal(app.findAll('u-select-hit').length, 0, '没有关键字时不应产生 mark')
  } finally {
    app.restore()
  }
})

test('客户端：方向键 / Home / End 移动真实焦点，选中后焦点回到触发器', async () => {
  const app = await mountSelect({ modelValue: '2', options: TOOLS, ariaLabel: '选择工具' })
  try {
    const trigger = app.trigger()
    app.click(trigger)
    await app.flush()

    const items = app.items()
    app.key('ArrowDown', trigger)
    assert.ok(
      app.document.activeElement === items[1],
      `ArrowDown 应先落到当前选中项，实际 ${app.focused()}`
    )
    app.key('ArrowDown', items[1])
    assert.ok(
      app.document.activeElement === items[2],
      `再按一次应往下走一项，实际 ${app.focused()}`
    )
    app.key('ArrowUp', items[2])
    assert.ok(app.document.activeElement === items[1], `ArrowUp 应回退一项，实际 ${app.focused()}`)
    app.key('Home', items[1])
    assert.ok(app.document.activeElement === items[0], `Home 应到首项，实际 ${app.focused()}`)
    app.key('End', items[0])
    assert.ok(app.document.activeElement === items[3], `End 应到末项，实际 ${app.focused()}`)

    // <button> 的 Enter / Space 由原生 click 完成，这里直接模拟那次 click
    app.click(items[0])
    await app.flush()

    assert.deepEqual(app.emitted, ['1'], 'update:modelValue 抛出的是选项的 value')
    assert.equal(app.panel(), null, '选中后应关闭')
    assert.ok(
      app.document.activeElement === trigger,
      `焦点应回到触发器，实际 ${app.focused()}`
    )
    assert.match(app.textOf(trigger), /ChatGPT 账号/)
  } finally {
    app.restore()
  }
})

test('客户端：禁用项不会被选中，键盘也会跳过它（disabled 的按钮无法获得焦点）', async () => {
  const options = [
    { value: 'a', label: '甲' },
    { value: 'b', label: '乙', disabled: true },
    { value: 'c', label: '丙' },
  ]
  const app = await mountSelect({ modelValue: 'a', options, ariaLabel: '选择' })
  try {
    const trigger = app.trigger()
    app.click(trigger)
    await app.flush()

    const items = app.items()
    assert.equal(items[1].props.disabled, true, 'disabled 选项必须带 disabled 属性')

    app.key('ArrowDown', trigger)
    assert.ok(app.document.activeElement === items[0], `应先落到选中项，实际 ${app.focused()}`)
    app.key('ArrowDown', items[0])
    assert.ok(
      app.document.activeElement === items[2],
      `焦点必须跳过被禁用的选项，否则会卡死，实际 ${app.focused()}`
    )
    app.key('End', items[0])
    assert.ok(app.document.activeElement === items[2], `End 也要跳过末尾的禁用项，实际 ${app.focused()}`)

    app.click(items[1])
    await app.flush()
    assert.deepEqual(app.emitted, [], '点击禁用项不应抛出任何值')
  } finally {
    app.restore()
  }
})

test('客户端：搜索即过滤、命中片段用 mark、无结果显示空态，Enter 选首个匹配', async () => {
  const app = await mountSelect({
    modelValue: '1',
    options: TOOLS,
    searchable: true,
    ariaLabel: '选择工具',
  })
  try {
    const trigger = app.trigger()
    app.click(trigger)
    await app.flush()

    const search = app.findAll('u-input')[0]
    assert.ok(search, 'searchable 时应渲染搜索框')
    assert.ok(
      app.document.activeElement === search,
      `搜索型下拉打开后焦点应在搜索框，实际 ${app.focused()}`
    )

    search.type('订阅')
    await app.nextTick()
    assert.deepEqual(app.items().map(app.textOf), ['Midjourney 订阅'])

    search.type('chatgpt')
    await app.nextTick()
    assert.deepEqual(
      app.findAll('u-select-hit').map(app.textOf),
      ['ChatGPT'],
      '大小写不敏感，且 mark 里是**原文**而不是小写副本'
    )
    assert.equal(app.textOf(app.items()[0]), 'ChatGPT 账号', '高亮不应改变整条文案')

    search.type('zzz')
    await app.nextTick()
    assert.equal(app.items().length, 0, '无匹配时不渲染任何选项')
    const empty = app.findAll('u-select-empty')[0]
    assert.ok(empty, '应显示空态')
    assert.equal(app.textOf(empty), '无匹配结果')

    search.type('steam')
    await app.nextTick()
    assert.deepEqual(app.items().map(app.textOf), ['Steam 充值卡'])
    app.key('Enter', search)
    await app.flush()
    assert.deepEqual(app.emitted, ['4'], '搜索框里回车应选中首个匹配项')
    assert.equal(app.panel(), null, '选中后关闭')
  } finally {
    app.restore()
  }
})

test('客户端：Escape / Tab 关闭并归还焦点，点击组件外部才关闭', async () => {
  const app = await mountSelect({ modelValue: '', options: TOOLS, ariaLabel: '选择工具' })
  try {
    const trigger = app.trigger()

    app.click(trigger)
    await app.flush()
    assert.ok(app.panel())
    app.key('Escape', trigger)
    await app.flush()
    assert.equal(app.panel(), null, 'Escape 应关闭面板')
    assert.ok(
      app.document.activeElement === trigger,
      `Escape 应把焦点还给触发器，实际 ${app.focused()}`
    )

    // 焦点还在面板内部（键盘已经走进了列表）时的 Tab：必须先交还触发器再关闭
    app.click(trigger)
    await app.flush()
    const first = app.items()[0]
    first.focus()
    const tab = app.key('Tab', first)
    await app.flush()
    assert.equal(tab.prevented, true, '焦点在面板内时必须拦下默认 Tab')
    assert.equal(app.panel(), null, 'Tab 应关闭面板')
    assert.ok(
      app.document.activeElement === trigger,
      `Tab 应把焦点交还触发器，实际 ${app.focused()}`
    )

    // 焦点在触发器上时的 Tab：不能 preventDefault，否则 Tab 就不再往前走
    app.click(trigger)
    await app.flush()
    const plainTab = app.key('Tab', trigger)
    await app.flush()
    assert.equal(plainTab.prevented, false, '焦点在触发器上时应放行默认 Tab')
    assert.equal(app.panel(), null, 'Tab 仍应关闭面板')

    app.click(trigger)
    await app.flush()
    assert.ok(app.panel())
    app.document.pointerdown(makeEl('span'))
    await app.nextTick()
    assert.equal(app.panel(), null, '点击组件外部应关闭')

    app.click(trigger)
    await app.flush()
    app.document.pointerdown(app.items()[0])
    await app.nextTick()
    assert.ok(app.panel(), '点击组件内部不应关闭')
  } finally {
    app.restore()
  }
})

test('客户端：卸载后移除 document 上的点击外部监听（不留悬挂的全局监听）', async () => {
  const { nodeOps, document, listeners } = createMockRenderer()
  const savedDocument = globalThis.document
  globalThis.document = document
  try {
    const { createRenderer, h } = await import('vue')
    const container = makeEl('root')
    const app = createRenderer(nodeOps).createApp({
      render: () => h(SelectField, { options: TOOLS, ariaLabel: '选择工具' }),
    })
    app.mount(container)
    assert.equal(listeners.length, 1, '挂载时应在 document 上注册一个监听')
    assert.equal(listeners[0].type, 'pointerdown')

    app.unmount()
    assert.equal(listeners.length, 0, '卸载时必须移除，否则页面每挂一次就多一个监听')
  } finally {
    if (savedDocument === undefined) delete globalThis.document
    else globalThis.document = savedDocument
  }
})
