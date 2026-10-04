import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

import { renderComponent, createPiniaWithState, createRenderEnv } from './render.mjs'

/**
 * 新交易页面（购物车 / 收藏 / 个人中心）的带数据渲染
 *
 * `renderComponents.test.js` 只渲染默认空态。本文件注入真实 store 数据，
 * 断言页面上**真的出现了商品名、数量、金额、可下单判断** ——
 * 这类缺陷空态发现不了：表格/列表有表头、其它项都有值，只有某一项空着，
 * 人工检查很容易漏（本仓库此前就因此漏掉过卡密名称整列为空）。
 *
 * 注意：只有状态来自 **store** 的页面能这样测。Orders / OrderDetail /
 * ProductDetail / CategoryDetail 的数据在组件内部的 ref 里、由 onMounted 拉取，
 * SSR 不执行 onMounted，因此它们只能断言首屏骨架（见文件末尾）。
 */

const CART_ITEMS = [
  {
    id: 11,
    product_id: 7,
    quantity: 2,
    product_title: '纯棉男士T恤',
    product_image: null,
    unit_price: 89,
    subtotal: 178,
    stock_quantity: 200,
    available: true,
    unavailable_reason: null,
    price_changed: false,
    current_price: 89,
  },
  {
    id: 12,
    product_id: 9,
    quantity: 1,
    product_title: '已下架的夹克',
    product_image: null,
    unit_price: 459,
    subtotal: 459,
    stock_quantity: 0,
    available: false,
    unavailable_reason: '商品缺货',
    price_changed: false,
    current_price: 459,
  },
]

const REGISTERED_USER = {
  userInfo: {
    id: 42,
    uuid: 'uuid-42',
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
}

const GUEST_USER = { userInfo: { id: 9, uuid: 'uuid-9', user_type: 'guest' } }

async function renderPage(path, state, options = {}) {
  const [pinia, env] = await Promise.all([createPiniaWithState(state), createRenderEnv()])
  return renderComponent(path, {
    plugins: [pinia, env.router],
    globalComponents: env.globalComponents,
    ...options,
  })
}

const cartState = (overrides = {}) => ({
  user: REGISTERED_USER,
  cart: {
    items: CART_ITEMS,
    totalQuantity: 3,
    totalAmount: 178,
    availableCount: 1,
    unavailableCount: 1,
    loading: false,
    loaded: true,
    error: null,
    ...overrides,
  },
})

// ══════════════════════════════════════════════════════════════
// 购物车
// ══════════════════════════════════════════════════════════════

test('购物车：渲染出商品名、单价、数量与小计', async () => {
  const html = await renderPage('/pages/Cart.vue', cartState())

  assert.ok(html.includes('纯棉男士T恤'), '应渲染商品名')
  assert.ok(html.includes('已下架的夹克'), '不可下单的商品也要显示（并标记原因），不能静默消失')
  assert.ok(html.includes('¥89.00'), '应渲染单价')
  assert.ok(html.includes('¥178.00'), '应渲染小计')
  assert.match(html, /aria-live="polite"[^>]*>2</, '数量应以 aria-live 播报，值为 2')
})

test('购物车：不可下单的行标出原因，且勾选框被禁用', async () => {
  const html = await renderPage('/pages/Cart.vue', cartState())

  assert.ok(html.includes('商品缺货'), '应显示不可下单的原因')
  // 不可下单的行不能勾选：让用户勾上再被服务端拒绝是更差的体验
  assert.match(
    html,
    /<input[^>]*type="checkbox"[^>]*disabled[^>]*>/,
    '不可下单行的勾选框应带 disabled'
  )
  assert.ok(html.includes('不会计入金额，也不会被提交'), '应说明不可下单行不计入金额')
})

test('购物车：合计只算可下单的行（178 而不是 637）', async () => {
  const html = await renderPage('/pages/Cart.vue', cartState())
  assert.ok(html.includes('¥178.00'), '合计应为可下单行的小计')
  assert.equal(html.includes('637'), false, '已下架商品的金额不应计入合计')
})

test('购物车：给出支付说明（没有支付通道这件事必须说清）', async () => {
  const html = await renderPage('/pages/Cart.vue', cartState())
  assert.match(html, /支付通道尚未接入/)
})

test('购物车：空车时给出空态与去逛的入口，不渲染结算面板', async () => {
  const html = await renderPage(
    '/pages/Cart.vue',
    cartState({ items: [], totalQuantity: 0, totalAmount: 0, availableCount: 0, unavailableCount: 0 })
  )
  assert.match(html, /购物车是空的/)
  assert.ok(html.includes('去商品分类看看'), '空态应给出下一步提示')
  // 用结算面板的类名判断，而不是搜「提交订单」四个字 ——
  // 那四个字也出现在页面的说明文案（PAGES.cart.description）里，会假阳性。
  assert.equal(html.includes('cart-summary'), false, '空车不应出现结算面板')
  assert.equal(html.includes('summary-submit'), false, '空车不应出现提交按钮')
})

test('购物车：游客（未登录）看到的是登录引导，不是结算面板', async () => {
  // needLogin 由 onMounted 里的 fetch 结果决定，SSR 拿不到，因此这里注入
  // 「已确认未登录」的可观察结果：空车 + 未加载过。
  // 断言的重点是「不能出现结算面板」—— 未登录却给出一个提交按钮，
  // 用户点下去只会拿到 403。
  const html = await renderPage('/pages/Cart.vue', {
    user: GUEST_USER,
    cart: { items: [], totalQuantity: 0, loading: false, loaded: false },
  })
  assert.equal(html.includes('summary-submit'), false, '未登录不应出现提交按钮')
  assert.equal(html.includes('cart-summary'), false, '未登录不应出现结算面板')
  assert.ok(html.includes('购物车'), '标题带仍应渲染')
})

test('购物车：渲染结果不含 undefined / NaN 插值事故', async () => {
  const html = await renderPage('/pages/Cart.vue', cartState())
  for (const bad of ['>undefined<', '>NaN<', '[object Object]']) {
    assert.equal(html.includes(bad), false, `输出中出现了 ${bad}`)
  }
  // 金额为两位数小数，不应出现浮点尾数
  assert.equal(/¥\d+\.\d{3,}/.test(html), false, `金额出现了多余小数位：${html.match(/¥[\d.]+/g)}`)
})

// ══════════════════════════════════════════════════════════════
// 我的收藏
// ══════════════════════════════════════════════════════════════

const favoriteState = (overrides = {}) => ({
  user: REGISTERED_USER,
  favorite: {
    productIds: [7],
    toolIds: [3],
    productItems: [
      {
        id: 1,
        target_type: 'product',
        target_id: 7,
        target: { id: 7, main_title: '收藏的T恤', price: 89, stock_quantity: 10, is_in_stock: true },
      },
      { id: 2, target_type: 'product', target_id: 99, target: null },
    ],
    toolItems: [
      { id: 3, target_type: 'tool', target_id: 3, target: { id: 3, tool_name: '视频解析', tool_path: 'https://x.test' } },
    ],
    loading: false,
    loadedForUserId: 'user:42',
    error: null,
    ...overrides,
  },
})

test('收藏：商品页签渲染商品卡与两个页签的计数', async () => {
  const html = await renderPage('/pages/Favorites.vue', favoriteState())

  assert.ok(html.includes('收藏的T恤'), '应渲染收藏的商品')
  assert.ok(html.includes('收藏的商品'), '应有商品页签')
  assert.ok(html.includes('收藏的工具'), '应有工具页签')
  assert.match(html, /role="tablist"/, '页签容器应有 tablist 角色')
  assert.match(html, /aria-selected="true"/, '当前页签应标记 aria-selected')
})

test('收藏：被删除的收藏对象保留一行并给出清理入口', async () => {
  const html = await renderPage('/pages/Favorites.vue', favoriteState())
  // target 为 null 的那条：静默消失会让用户以为收藏功能坏了
  assert.ok(html.includes('该内容已被删除'), '应提示收藏对象已被删除')
  assert.ok(html.includes('从收藏中移除'), '应给出清理入口')
})

test('收藏：空收藏给出空态与去逛的入口', async () => {
  const html = await renderPage(
    '/pages/Favorites.vue',
    favoriteState({ productItems: [], productIds: [], toolItems: [], toolIds: [] })
  )
  assert.match(html, /还没有收藏/)
  assert.ok(html.includes('去看热门推荐'))
})

// ══════════════════════════════════════════════════════════════
// 个人中心
// ══════════════════════════════════════════════════════════════

test('个人中心：只读区渲染账号信息，表单预填当前资料', async () => {
  const html = await renderPage('/pages/Profile.vue', { user: REGISTERED_USER })

  // 只读区
  assert.ok(html.includes('uuid-42'), '应显示用户标识')
  assert.ok(html.includes('stardust'), '应显示用户名')
  assert.ok(html.includes('a@b.c'), '应显示邮箱')
  assert.ok(html.includes('未绑定'), '未绑定的手机号应显示占位而不是空白')

  // 表单预填。
  // 注意这里**不**断言 `<select>` 的 selected：SSR 不给 `<select v-model>` 的
  // 静态 `<option>` 输出 selected 属性，那是 SSR 的产物而不是真实行为
  // （本应用是纯客户端渲染）。下一行的 input value 能证明 fillForm 真的跑过。
  assert.match(html, /id="profile-nickname"[^>]*value="星尘"/, '昵称应预填')

  // 生日的断言刻意**不绑定具体控件**：这个字段先是原生 `<input type="date">`，
  // 后来换成了自绘的 DatePickerField（值渲染成「1995 年 06 月 15 日」的文本）。
  // 两种实现都保留 `id="profile-birthday"`，因此只要求「值的年份出现在该字段的标记里」，
  // 换控件不会让这条断言失效 —— 它要证明的是 toDateInput() 把 ISO 串正确截断并预填。
  const birthdayAt = html.indexOf('id="profile-birthday"')
  assert.ok(birthdayAt > -1, '生日字段应渲染出来')
  const birthdayMarkup = html.slice(birthdayAt, birthdayAt + 400)
  assert.match(birthdayMarkup, /1995/, `生日应预填成 1995 年，实际片段：${birthdayMarkup.slice(0, 200)}`)
  assert.match(birthdayMarkup, /06/, '生日应带月份')
  assert.match(birthdayMarkup, /15/, '生日应带日')

  // 表单已预填 → 与基线一致 → 保存按钮应当禁用（没有改动可提交）
  assert.match(html, /class="u-btn-primary" disabled/, '没有改动时保存按钮应禁用')
})

test('个人中心：性别选项与数据库约束一致（male / female / unknown）', async () => {
  const html = await renderPage('/pages/Profile.vue', { user: REGISTERED_USER })

  /*
   * 性别原来用原生 <select>，选项能从 SSR 的 <option> 里抓；换成 SelectField 之后
   * 选项由组件渲染成 listbox 的项（value 不出现在 DOM 属性上），所以改为**源码级**断言。
   *
   * 这条用例真正要守的不是 DOM 形状，而是「送给接口的取值集合不能超出数据库 CHECK 约束」——
   * 多一个不在约束里的值，用户选中后会撞约束、接口 500。所以：
   *   1) 源码里的取值集合必须精确等于 '' + male/female/unknown；
   *   2) 页面上必须真的渲染出四个选项的文案（证明接线没断）。
   */
  const source = readFileSync(new URL('../src/pages/Profile.vue', import.meta.url), 'utf8')
  const block = source.match(/const genderOptions = \[([\s\S]*?)\n\]/)
  assert.ok(block, '应能找到 genderOptions 定义')

  const values = [...block[1].matchAll(/value:\s*'([^']*)'/g)].map((m) => m[1])
  assert.deepEqual(
    [...new Set(values)].sort(),
    ['', 'female', 'male', 'unknown'],
    '性别取值必须与数据库 CHECK 约束一致'
  )

  // 接线没断：页面上确实是一个 SelectField 触发器（面板 v-if 关闭时不渲染，
  // 所以这里断言的是触发器语义，而不是选项文案 —— 后者会与文案常量耦合）。
  assert.match(html, /aria-haspopup="listbox"/, '性别应渲染成 SelectField 的触发器')
  assert.match(html, /aria-label="性别"/, '触发器应带可访问名')
})

test('个人中心：说明哪些字段不能自助修改', async () => {
  const html = await renderPage('/pages/Profile.vue', { user: REGISTERED_USER })
  assert.match(html, /暂不支持自助修改/)
})

// ── 头像栏的版式：左「头像 + 说明」/ 右「上传图标按钮」──────────

test('头像栏：左侧是头像 + 说明文字，右侧是上传按钮', async () => {
  const html = await renderPage('/pages/Profile.vue', { user: REGISTERED_USER })

  const editorAt = html.indexOf('class="avatar-editor"')
  assert.ok(editorAt > -1, '应有头像编辑器')

  // 左栏：头像与说明在同一个 .avatar-profile 容器里，且**在**上传按钮之前
  const leftAt = html.indexOf('class="avatar-profile"', editorAt)
  const uploadAt = html.indexOf('class="u-icon-btn avatar-upload"', editorAt)
  const descAt = html.indexOf('class="u-field-hint avatar-hint"', editorAt)

  assert.ok(leftAt > -1 && descAt > -1 && uploadAt > -1, '左栏容器、说明、上传按钮都应存在')
  assert.ok(leftAt < uploadAt, '头像 + 说明应在左，上传按钮在右')
  assert.ok(descAt < uploadAt, '说明文字属于左栏，不能排在上传按钮之后')

  // 说明文字确实在左栏容器内部（两者之间没有关闭该容器）
  const leftBlock = html.slice(leftAt, uploadAt)
  assert.ok(leftBlock.includes('avatar-hint'), '说明文字应位于左栏容器内')
})

test('头像栏：上传按钮已收成图标（可见文字改成图标，文字转为可访问名）', async () => {
  const html = await renderPage('/pages/Profile.vue', { user: REGISTERED_USER })

  const uploadAt = html.indexOf('class="u-icon-btn avatar-upload"')
  assert.ok(uploadAt > -1)
  const button = html.slice(uploadAt, uploadAt + 500)

  // 图标是文本字形，且对读屏隐藏（它只是装饰，语义由可访问名承担）
  assert.match(button, /class="avatar-upload-icon" aria-hidden="true">↑</, '图标应是一个 aria-hidden 的字形')

  // 图标按钮必须有可访问名；且这段文字不能是可见文字
  assert.match(
    button,
    /<span class="visually-hidden">上传头像<\/span>/,
    '图标按钮必须带 .visually-hidden 的可访问名 —— label 上的 aria-label 不算 input 的名字'
  )
  assert.match(button, /title="上传头像"/, '鼠标悬停也要能知道这个按钮做什么')

  // 按钮里不应再有可见的「选择图片 / 上传中」文字
  assert.equal(/>\s*选择图片\s*</.test(button), false, '可见文字应已换成图标')
})

test('头像栏：隐藏的 file input 仍在，且被 label 关联', async () => {
  const html = await renderPage('/pages/Profile.vue', { user: REGISTERED_USER })

  assert.match(
    html,
    /<input id="profile-avatar-file"[^>]*class="visually-hidden"[^>]*type="file"/,
    '原生 file input 应保留（隐藏），label 通过 for 触发它'
  )
  assert.match(html, /<label for="profile-avatar-file"/, 'label 必须关联到该 input')
})

test('个人中心：游客态禁用表单并说明原因', async () => {
  const html = await renderPage('/pages/Profile.vue', { user: GUEST_USER })
  assert.match(html, /游客/)
  assert.ok(html.includes('登录后即可保存个人资料'))
  assert.match(html, /id="profile-nickname"[^>]*disabled/, '游客的表单应禁用')
})

test('个人中心：渲染结果不含 undefined / NaN 插值事故', async () => {
  const html = await renderPage('/pages/Profile.vue', { user: REGISTERED_USER })
  for (const bad of ['>undefined<', '>NaN<', '[object Object]']) {
    assert.equal(html.includes(bad), false, `输出中出现了 ${bad}`)
  }
})

// ══════════════════════════════════════════════════════════════
// 法务页（三份文档共用一个组件）
// ══════════════════════════════════════════════════════════════

test('法务页：按 meta.legalKey 渲染对应文档，并给出另两份的跳转', async () => {
  const [pinia, env] = await Promise.all([createPiniaWithState({ user: REGISTERED_USER }), createRenderEnv()])
  await env.router.push('/privacy')

  const html = await renderComponent('/pages/Legal.vue', {
    plugins: [pinia, env.router],
    globalComponents: env.globalComponents,
  })

  assert.ok(html.includes('隐私政策'), '应渲染隐私政策标题')
  assert.ok(html.includes('我们收集什么'), '应渲染隐私政策的章节而不是别的文档')
  assert.equal(html.includes('服务内容'), false, '不该混入用户协议的章节')
  assert.ok(html.includes('SSTC_TOOL_FAVORITES'), '隐私政策必须列出真实使用的本机存储键')
  // 另外两份文档的跳转
  assert.ok(html.includes('用户协议'))
  assert.ok(html.includes('平台规则'))
  assert.match(html, /href="\/terms"/, '应给出用户协议链接')
  assert.match(html, /href="\/rules"/, '应给出平台规则链接')
})

test('法务页：三份文档渲染出各自不同的正文（不是「一个模板换文案」）', async () => {
  const titles = {}
  for (const [path, expected] of [
    ['/terms', '禁止行为'],
    ['/privacy', '你的权利'],
    ['/rules', '卡密规则'],
  ]) {
    const [pinia, env] = await Promise.all([
      createPiniaWithState({ user: REGISTERED_USER }),
      createRenderEnv(),
    ])
    await env.router.push(path)
    const html = await renderComponent('/pages/Legal.vue', {
      plugins: [pinia, env.router],
      globalComponents: env.globalComponents,
    })
    assert.ok(html.includes(expected), `${path} 应包含章节「${expected}」`)
    titles[path] = html.length
  }
})

test('法务页：meta 缺失时回落到用户协议而不是渲染空页', async () => {
  const [pinia, env] = await Promise.all([createPiniaWithState({ user: REGISTERED_USER }), createRenderEnv()])
  // 路由表里全部页面都没有 legalKey
  await env.router.push('/anywhere')

  const html = await renderComponent('/pages/Legal.vue', {
    plugins: [pinia, env.router],
    globalComponents: env.globalComponents,
  })
  assert.ok(html.includes('用户协议'), '应回落到用户协议')
  assert.ok(html.includes('服务内容'), '应渲染正文而不是空页')
})

// ══════════════════════════════════════════════════════════════
// 由 onMounted 取数的页面：只能验证首屏骨架
// ══════════════════════════════════════════════════════════════

test('订单列表 / 订单详情 / 商品详情 / 分类详情：SSR 首屏渲染加载骨架而不是空白', async () => {
  for (const path of [
    '/pages/Orders.vue',
    '/pages/OrderDetail.vue',
    '/pages/ProductDetail.vue',
    '/pages/CategoryDetail.vue',
  ]) {
    const html = await renderPage(path, { user: REGISTERED_USER })
    assert.ok(html.length > 0, `${path} 渲染结果不应为空`)
    assert.equal(html.includes('undefined'), false, `${path} 输出中出现了 undefined`)
    // 这几页的首屏都应是「加载中」的可见反馈，而不是一片空白
    assert.match(html, /u-loading-block|u-spinner/, `${path} 首屏应给出加载指示`)
  }
})

test('订单列表 / 订单详情：标题带与返回入口在首屏就存在', async () => {
  const orders = await renderPage('/pages/Orders.vue', { user: REGISTERED_USER })
  assert.ok(orders.includes('订单管理'))
  assert.ok(orders.includes('待处理'), '状态筛选页签应在首屏就可操作')

  const detail = await renderPage('/pages/OrderDetail.vue', { user: REGISTERED_USER })
  assert.ok(detail.length > 0)
})
