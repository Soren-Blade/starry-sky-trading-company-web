# starry-sky-trading-company-web

星辰商行前端。Vue 3 单页应用，Vite 6 构建，部署在 Vercel。

> 项目总览、前后端数据流、本地开发与部署步骤见[根目录 README](../README.md)；后端接口清单见 [server README](../starry-sky-trading-company-server/README.md)。

---

## 1. 技术栈

| 项 | 内容 |
| --- | --- |
| 框架 | Vue 3.5，全部使用 `<script setup>` 组合式 API |
| 构建 | Vite 6（`@vitejs/plugin-vue`） |
| 路由 | vue-router 4，`createWebHistory`（HTML5 history 模式） |
| 状态 | Pinia 2 |
| UI | ant-design-vue 4 + `unplugin-vue-components` 的 `AntDesignVueResolver` 按需自动引入 |
| HTTP | axios 1.7，统一封装于 `src/api/request.js` |
| 日期 | dayjs（含 `utc`、`timezone` 插件） |
| 开发辅助 | `vite-plugin-vue-devtools` |

**使用** Vue 3 + Vite，但**不使用** TypeScript。已接入 ESLint 9（flat config，`eslint.config.cjs`）与
`node:test` 单元测试（不需要 jsdom / vitest）；**未使用** Prettier。

### 关于组件自动引入

`vite.config.js` 注册了 `unplugin-vue-components` + `AntDesignVueResolver`（`importStyle: false`）。因此模板中可以直接写 `<a-table>`、`<a-button>`、`<a-tag>` 等而无需 `import`；但**订阅式 API**（`message`、`Modal`）仍需显式 `import { message } from 'ant-design-vue'`。

注意：项目**没有**配置 `unplugin-auto-import`，所以 `ref`、`computed`、`defineStore` 等都必须手工 import。

---

## 2. 目录结构

```
starry-sky-trading-company-web/
├── .env.development              # 开发环境变量
├── .env.production               # 生产环境变量
├── index.html                    # SPA 入口 HTML
├── jsconfig.json                 # @ → ./src 路径别名（编辑器提示用）
├── vercel.json                   # Vercel 部署配置（SPA 回退）
├── vite.config.js                # 构建与开发服务器配置
├── package.json
├── public/
│   └── favicon.ico
├── scripts/
│   └── verify-dev.cjs            # 真实运行验证：dev server / 代理转发 / HMR 推送
├── README.md                     # ← 本文件
└── src/
    ├── main.js                   # 应用入口
    ├── App.vue                   # 根组件：Navbar + router-view + Footer + 回到顶部
    ├── api/
    │   ├── index.js              # 汇总所有接口模块并默认导出
    │   ├── request.js            # axios 实例：注入 token、解析响应、401 刷新重试
    │   └── ask/                  # 按后端路由分组的接口封装
    │       ├── user.js           # /user
    │       ├── userApi.js        # /userApi
    │       ├── shop.js           # /shop 与 /class
    │       ├── toolApi.js        # /toolApi
    │       └── kami.js           # /kamiApi
    ├── assets/
    │   ├── styles/
    │   │   ├── variables.css     # 设计令牌名册（+ 默认主题 tech-minimal 的兜底值）
    │   │   └── global.css        # 重置、共享结构类（.ui-card/.u-cta/...）、共享动效
    │   └── README.md             # assets 目录说明与令牌清单
    ├── components/               # 区块、卡片与弹窗组件（见 §6）
    ├── constants/
    │   ├── index.js              # 常量出口（只 re-export content.js）
    │   └── content.js            # 全站文案：SITE / NAV_MENU / HERO / SECTIONS / PAGES / FOOTER / 主题弹窗
    ├── hooks/
    │   ├── useToken/index.js             # localStorage 读写 token
    │   ├── useRefreshToken/index.js      # 刷新 token（再导出 @/api/request 的单飞实现）
    │   ├── useBodyScroll/useBodyScroll.js# 弹窗打开时锁定页面滚动（含引用计数）
    │   ├── useClass/index.js             # 按 class 字段对工具分组
    │   ├── useEmoji/index.js             # emoji → 渐变色（分类卡底纹用）
    │   ├── useKamiDisplay/index.js       # 卡密展示：状态文案/配色、列定义、工具名、日期
    │   ├── useKamiActivation/index.js    # 卡密激活流程：校验、提交、结果状态机
    │   └── useSimpleTimeFormatter/index.js # 时间格式化与时区转换
    ├── pages/                    # 路由目标页面（见 §4）
    ├── router/
    │   └── index.js              # 路由表 + 标题守卫 + 鉴权守卫
    ├── stores/                   # Pinia store（见 §5）
    │   ├── user.js
    │   ├── shop.js
    │   ├── tool.js
    │   ├── kami.js
    │   └── theme.js              # 设计风格：切换、单项自定义、持久化、写入 :root
    ├── theme/                    # 设计风格（样式体系的运行时层）
    │   ├── presets.js            # 五套风格的完整令牌取值 + 可调项定义
    │   ├── compose.js            # 预设 + 单项自定义 → 最终令牌表（纯函数）
    │   └── color.js              # 解析/压暗/转 rgba/缩放 px 的小工具
    └── utils/
        └── index.js              # throttle / domUtils.smoothScroll / formatUtils
```

---

## 3. 应用入口与初始化

`index.html` → `<script type="module" src="/src/main.js">` → `src/main.js`：

```js
import './assets/styles/variables.css'
import './assets/styles/global.css'
import 'ant-design-vue/dist/reset.css'

const app = createApp(App)
const pinia = createPinia()
app.use(pinia)
app.use(router)

// 主题必须在首屏渲染之前同步落到 <html>：
// 放到组件的 onMounted 里会让用户先看到默认主题、再闪一下切换（FOUC）。
useThemeStore(pinia).init()

app.mount('#app')
```

`App.vue` 提供全局骨架：

- `<Navbar />` 固定顶栏（品牌 + 主导航 + 搜索栏 + 样式主题切换 + 账号入口 + 移动端抽屉）
- `<main class="main-content"><router-view /></main>` 路由出口；
  `padding-top: var(--navbar-height)` 在这里统一给出，**各页面不再自己写顶栏占位**
- `<Footer />` 页脚
- 右下角"回到顶部"悬浮按钮（滚动超过 300px 出现，用 `throttle` 节流）

`App.vue` 的 `onMounted` 里并行调用 `userStore.init()` 与 `shopStore.init()`。

---

## 4. 路由表

`src/router/index.js`，history 模式，全部页面按需懒加载。

| 路径 | name | 组件 | 标题 |
| --- | --- | --- | --- |
| `/` | — | *重定向到 `/home`* | — |
| `/home` | `Home` | `pages/Home.vue` | 首页 - 星辰商行 |
| `/categories` | `Categories` | `pages/Categories.vue` | 商品分类 - 星辰商行 |
| `/hot` | `Hot` | `pages/Hot.vue` | 热门推荐 - 星辰商行 |
| `/tool` | `Tool` | `pages/Tool.vue` | 工具分类 - 星辰商行 |
| `/about` | `About` | `pages/About.vue` | 关于我们 - 星辰商行 |
| `/other/2fa` | `2fa` | `pages/2FA.vue` | 2FA - 星辰商行 |
| `/other/appleId` | `appleId` | `pages/AppleId.vue` | appleId - 星辰商行 |
| `/user/kami` | `kami` | `pages/Kami.vue` | 卡密管理 - 星辰商行 |
| `/:pathMatch(.*)*` | `NotFound` | `pages/NotFound.vue` | 页面未找到 - 星辰商行 |

**导航守卫**：只有一个 `router.afterEach`，把 `to.meta.title` 写入 `document.title`。**没有任何鉴权守卫**（`/user/kami` 也未保护）。

**滚动行为**：优先恢复 `savedPosition`，否则回到顶部。

**导航菜单**（`constants/index.js` 的 `NAV_MENU`，被 `Navbar` 渲染）：首页、商品分类、热门推荐、工具分享、关于我们。

> `/other/2fa` 与 `/other/appleId` 不在顶部导航里，属于直接通过 URL 访问的工具页。

### 页面构成

| 页面 | 结构 |
| --- | --- |
| `Home.vue` | `HeroSection` + `CategoriesSection` + `HotProductsSection`；Hero 的"去逛逛"按钮滚动到分类区块 |
| `Categories.vue` | 页头 + `CategoriesSection` |
| `Hot.vue` | 页头 + `HotProductsSection` |
| `Tool.vue` | 工具页：分类 tab + 搜索框 + "已收藏"筛选 + `ToolCard` 网格 |
| `Kami.vue` | 仅包一层 `KamiSection`（"我的卡密"表格 + "激活卡密"表单两个 tab） |
| `AppleId.vue` | 仅包一层 `AppleIdSection`（页头已注释） |
| `2FA.vue` | 纯前端 TOTP 生成器：Base32 解码 → WebCrypto HMAC-SHA1 → 动态截断，30 秒倒计时并自动复制 |
| `About.vue` | 静态内容：愿景、核心价值、联系方式 |
| `NotFound.vue` | 404 页 + 站内推荐链接 |

---

## 5. 状态管理

所有 store 都定义在 `src/stores/`，遵循 `state` / `actions` 的对象式写法。

### `user.js` — `useUserStore`

| 成员 | 说明 |
| --- | --- |
| `isLoggedIn` | 是否已登录 |
| `userInfo` | 当前用户信息（来自 `GET /userApi/getUserInfo`） |
| `visitorLogin()` | 本地有双 token 则直接拉用户信息，否则调 `POST /user/visitorLogin` 再拉 |
| `getUserInfo()` | 拉取并合并到 `userInfo`，置 `isLoggedIn = true` |
| `logout()` | 清空状态并把 localStorage 中的 token 写为空串 |
| `inint()` | 空实现的占位（拼写有误，未接入） |

### `shop.js` — `useShopStore`

| 成员 | 说明 |
| --- | --- |
| `shopClass` | 商品分类 |
| `shopInfo` | 商品列表 |
| `searchKeyword` | 商品搜索关键词（导航栏搜索栏写入） |
| `filteredProducts` | **getter**：按 `searchKeyword` 过滤后的商品列表。匹配规则只此一处 —— 搜索栏与商品网格分处两个组件，规则不能各写一份 |
| `pagination` | 分页信息 |
| `setSearchKeyword(kw)` | 写入搜索关键词（空串表示不过滤） |
| `getCategories()` | 以 `{ tree: true }` 调 `/class/getCategories` |
| `getProducts()` | 以 `{ in_stock: 'all' }` 调 `/shop/getProducts` |
| `init()` | 并行调用上面两个，并在 `finally` 里收尾 `loading` |

### `tool.js` — `useToolStore`

| 成员 | 说明 |
| --- | --- |
| `toolData` | 工具数据。`fetchTools()` 会把接口返回的 `data` 与 `classifyToolsByClass()` 的结果合并进去，因此实际含 `tools` / `pagination` / `filters` / `classified` / `classes` |
| `toolMeta` | 接口 `meta`（仅写入，未被读取） |
| `activeCategory` | 当前选中分类，默认 `'all'` |
| `appleIds` | 共享 Apple ID 数据，实际是 `{ nanoCloud, fangQiangNan }` 对象 |
| `fetchTools()` / `fetchAppleIds()` / `setActiveCategory()` / `init()` | 见 server README 的 `/toolApi` 接口说明 |

### `theme.js` — `useThemeStore`

设计风格的运行时状态。**这里不写任何设计数值**（数值在 `src/theme/presets.js`）。

| 成员 | 说明 |
| --- | --- |
| `themeId` | 当前风格 id，默认 `tech-minimal` |
| `custom` | 单项自定义值（字号缩放、间距密度、圆角缩放、强调色、字体族、背景图与其不透明度） |
| `theme` / `themeList` | 当前主题元数据 / 可选主题列表（供弹窗渲染） |
| `pricePrefix` / `priceDecimals` | 当前主题的货币描述（technical-monochrome 是 `$`），供 `formatUtils.formatPrice` 使用 |
| `tokens` | getter：`composeTokens(themeId, custom)` 的合成结果 |
| `customizedKeys` / `isCustomized` | 哪几项被改过 |
| `panelOpen` | 主题弹窗开关（导航栏按钮与弹窗共享同一状态） |
| `init()` | 从 `localStorage` 恢复并写入 `:root`；由 `main.js` 在 mount 前调用 |
| `setTheme(id)` | 整体切换风格 |
| `setCustom(key, v)` / `resetCustomField(key)` / `resetCustom()` / `resetAll()` | 单项修改与三种粒度的还原 |
| `apply()` | 把合成后的令牌写成 `<html>` 的行内自定义属性 + `data-theme` + `color-scheme` |
| `openPanel` / `closePanel` / `togglePanel` | 弹窗开关 |

> 走行内样式而不是切 class 的原因：单项自定义的取值来自用户输入（任意强调色、
> 任意字号），无法预先穷举成 CSS 类；行内自定义属性也天然优先于 `variables.css`
> 的 `:root` 兜底值。`apply()` 用能力检测（`style.setProperty` 是否存在）
> 而不是 `typeof document` 来兼容 SSR 与测试桩。

### `kami.js` — `useKamiStore`

| 成员 | 说明 |
| --- | --- |
| `userKamis` | 当前用户的卡密列表 |
| `pagination` | 分页信息 |
| `filters` | `status` / `card_type` / `tool_id`（仅声明，未被读写） |
| `fetchUserKamis(userId, opts)` | 调 `GET /kamiApi/getUserCards/:user_id`，写入列表与分页 |

> `KamiSection.vue` 通过 `kamiStore.fetchUserKamis` 取数并就地读 `pagination`。

---

## 6. 组件清单

### 布局与通用

| 组件 | 说明 |
| --- | --- |
| `Navbar.vue` | 固定顶栏：品牌、`NAV_MENU` 导航、搜索栏（≥992px）、`ThemeSwitcher`、登录/注册按钮或用户头像下拉、移动端汉堡 + 抽屉（抽屉内含搜索栏）。毛玻璃写在 `.navbar::before` 上 —— 写在 `.navbar` 上会让 `backdrop-filter` 成为 fixed 后代的包含块，弹窗会被"钉"进导航栏 |
| `SearchBar.vue` | 受控搜索栏（`v-model` + `@submit`）。本身不碰 store，过滤规则属于数据层（`shopStore.filteredProducts`） |
| `ThemeSwitcher.vue` | 导航栏右侧的图标按钮 + 样式切换弹窗：五套风格整体切换，或按字号/密度/圆角/强调色/字体族/背景图逐项微调。新增可调项只需在 `theme/presets.js` 的 `CUSTOM_FIELDS` 加一条 |
| `Footer.vue` | 页脚：品牌、简介、社交链接、支付方式、版权与法务链接，文案取自 `constants/content.js` 的 `FOOTER` / `SITE` |
| `LoginModal.vue` | 登录/注册弹窗。登录支持用户名/邮箱/手机号自动判别 `login_type`；注册成功后自动切回登录页签。模态约定见下 |
| `SectionHeader.vue` | **区块头**（icon + title + description）。样式定义在 `global.css` 的 `.section-header` 系列，供各 Section 组件复用 |
| `PageHeader.vue` | **页面头**（title + subtitle）。样式统一在 `global.css` 的 `.page-header`，各页面不再逐页覆写渐变 |

### 区块

| 组件 | 说明 |
| --- | --- |
| `HeroSection.vue` | 首屏 hero：eyebrow / 标题 / 副标题 / 双 CTA / 特性行 + 一个表面面板。**没有**随机星点、浮动 emoji 与光斑 —— 规范排除装饰性渐变与夸张动画 |
| `CategoriesSection.vue` | 商品分类网格，分类卡是真实 `<button>`；`getEmojiGradient(category.icon_url)` 只作为 16% 透明度的底纹出现，不铺满整卡 |
| `HotProductsSection.vue` | 热门商品网格，数据源 `shopStore.filteredProducts`（含搜索过滤），含加载 / 错误 / 空三种状态 |
| `AppleIdSection.vue` | 汇总两个数据源的 Apple ID；加载与错误状态取自 `toolStore.appleIdsLoading` / `appleIdsError` |
| `KamiSection.vue` | 卡密管理主体。`a-table` 卡密列表（状态筛选、刷新、分页、卡号脱敏）与激活表单；游客态显示登录提示 |

### 卡片

所有卡片共用 `global.css` 里的 `.ui-card` 外壳（背景 / 圆角 / 阴影 / hover 位移），
以及 `.ui-card-media`（媒体区固定比例 + 图片裁切 + hover 放大）。
卡片组件本身只保留各自特有的内部布局。

### 弹窗（模态）约定

`LoginModal.vue` 是唯一模态组件，新增弹窗需照做：

- `role="dialog"` + `aria-modal="true"` + `aria-labelledby` 指向一个 `.visually-hidden` 标题
- **Escape 关闭**：在 `document` 上监听 `keydown`（只挂在容器上不可靠，焦点可能不在其中）
- **焦点陷阱**：`Tab` / `Shift+Tab` 在弹窗内循环
- **焦点归还**：打开前记录 `document.activeElement`，卸载时归还
- **滚动锁定**：`useBodyScroll`，卸载时自动恢复

| 组件 | 说明 |
| --- | --- |
| `ProductCard.vue` | 商品卡：图片、标题、价格、浏览/销量/库存三个指标、购买按钮。整卡可点击（`role="link"` + Enter/Space） |
| `ToolCard.vue` | 工具卡：封面或 icon、分类、描述、收藏按钮、"打开工具" |
| `AppleIdCard.vue` | Apple ID 账号卡：账号、密码（可显隐、可复制）、状态、地区、更新时间 |

### 卡密与 Apple ID

| 组件 | 说明 |
| --- | --- |
| `KamiSection.vue` | 卡密管理主体。两个 tab：`a-table` 卡密列表（状态筛选、刷新、分页、卡号脱敏与复制）和激活表单（选工具 + 输卡密） |
| `AppleIdSection.vue` | 汇总两个数据源的 Apple ID，含加载态、错误提示与重试按钮 |

### 未被引用

| 组件 | 状态 |
| --- | --- |
| `ProductsSection.vue` | 已删除（无人引用的旧版硬编码实现，且导入不存在的 `HOT_PRODUCTS`，会让 `vite build` 失败） |
| `KamiCard.vue` | 已删除（卡密以表格而非卡片呈现） |

---

## 7. 请求层

### `src/api/request.js`

```js
const requests = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
})
```

> `baseURL` 在 **dev 下为空字符串**（请求走相对路径 → Vite 代理 → 后端，同源无 CORS），
> 生产构建时注入 `.env.production` 里的绝对地址。详见 §10 与 §11。

**请求拦截器**：每次请求从 localStorage 读取最新 token 并注入 `Authorization: Bearer <token>`。
（不能在 `axios.create` 时求值 —— 那样拿到的永远是模块加载时的 `null`。）

**响应拦截器**（成功分支）

1. 读取响应头 `access-token` / `refresh-token` 并写入本地存储（后端头名为 `Access-Token` / `Refresh-Token`，axios 会小写化）
2. 若响应体 `code === 401` 且不是刷新请求本身，则调用 `refreshToken()`，成功后用新 token 重放原请求；刷新失败则清理凭据并触发 `setAuthExpiredHandler`
3. 最后返回 `res.data`（**所有调用方拿到的是服务端 JSON 报文，不是 axios response**）

**响应拦截器**（失败分支）：把服务端 `message`/`status`/`code` 透传出去（不再压成固定字符串），超时会有专门提示。

### `src/api/ask/`

| 模块 | 导出 | 对应后端 |
| --- | --- | --- |
| `user.js` | `visitorLogin` | `POST /user/visitorLogin` |
| `userApi.js` | `getUserInfo` | `GET /userApi/getUserInfo` |
| `shop.js` | `getCategories(params)`、`getProducts(params)` | `/class/getCategories`、`/shop/getProducts` |
| `toolApi.js` | `getTools`、`getAppleIds` | `/toolApi/getTools`、`/toolApi/getAppleIds` |
| `kami.js` | `getUserCards(user_id, params)`、`activateCard(data)`、`verifyCard(data)` | `/kamiApi/*` |

`api/index.js` 把上述模块的具名导出汇总为一个对象并默认导出，组件里通过 `import api from '@/api/index'` 统一调用（如 `api.getProducts(params)`）。

**调用约定**：需要查询字符串的接口，axios 的第二个参数必须是 `{ params: {...} }`：

```js
api.getCategories({ tree: true })                       // ✅ 内部已包一层 params
api.getUserCards(userId, { page: 1, limit: 20 })        // ✅ 签名直通 axios config
```

### 鉴权与续期

- token 存在 `localStorage`：`ACCESS_TOKEN`、`REFRESH_TOKEN`（`hooks/useToken`）
- 后端下发的响应头名是 `AccessToken` / `RefreshToken`（首字母大写）
- 刷新流程在 `hooks/useRefreshToken/index.js`：维护一个"单飞" promise，避免并发刷新；刷新请求带 `__isRefreshToken` 标记，供拦截器判断（`isRefreshToken(config)`）

---

## 8. Hooks

| Hook | 导出 | 说明 |
| --- | --- | --- |
| `useToken` | `setAccessToken` / `setRefreshToken` / `getAccessToken` / `getRefreshToken` | localStorage 读写封装 |
| `useRefreshToken` | `refreshToken()` / `isRefreshToken(config)` | 刷新 token；promise 级去重 |
| `useBodyScroll` | `disableScroll` / `enableScroll` / `toggle` | 弹窗打开时锁 `body` 滚动，并在 `onUnmounted` 自动恢复 |
| `useClass` | `classifyToolsByClass(tools, options)` | 按 `class` 字段把工具数组分组，返回 `{ classified, classes }`。`classes` 内含一个合成的 `all` 分类，并附带每个分类的图标、数量、最热门工具、是否含新工具 |
| `useEmoji` | `getEmojiGradient` 等 | emoji → `linear-gradient(...)`。内含约 200 条 emoji 映射表和一个 `EmojiGradientGenerator` 单例类；绝大部分导出尚未被使用 |
| `useSimpleTimeFormatter` | `toDate` / `formatISOTime` / `parseISOTime` / `getFriendlyTime` 等 | 基于 dayjs + `utc`/`timezone` 插件的时间格式化，默认时区 `Asia/Shanghai` |
| `useKamiDisplay` | `getStatusText` / `getStatusColor` / `formatCardDate` / `resolveToolName` / `toToolOptions` / `STATUS_FILTER_OPTIONS` / `KAMI_TABLE_COLUMNS` | 卡密展示层**纯函数**。状态文案与配色用 `lookupOr` 查表以避开原型链；工具 id 兼容数字与字符串（后端 bigint 返回字符串）。状态映射与筛选下拉选项同源，避免两处错位 |
| `useKamiActivation` | `activateCode` / `selectedToolId` / `activationResult` / `activating` / `activate()` / `resetForm()` / `clearResult()` | 卡密激活流程的状态与提交逻辑，依赖注入 `activateCard` / `getUserId` / `onActivated`。`activate()` 返回 `{ success, reason, message }`，`reason` 区分 `empty_tool`/`empty_code`/`server`/`thrown`/`ok`，且**不向外抛异常** |

> `useKamiActivation` 有一条与其他 hook 不同的约定：**激活成功后若列表刷新失败，
> 仍报告成功**（文案附「请手动刷新」）。因为卡密在服务端已经生效，
> 报失败会诱导用户重复激活。

## 9. 样式体系

全站支持**五套可切换的设计风格**，并且每套风格都完全由设计令牌驱动。
令牌清单与用法见 [`src/assets/README.md`](src/assets/README.md)。

### 9.1 五套风格

| id | 名称 | 底色 | 强调色 | 特点 |
| --- | --- | --- | --- | --- |
| `tech-minimal`（默认） | Tech Minimal 暗色科技极简 | `#0a0a0a` | `#3b82f6` | 无阴影、1px 边框分层；标题 Inter 600-700；价格 JetBrains Mono；卡片 12px / 按钮 8px；入场 translateY 12px，60ms 递增 |
| `liquid-glass` | Liquid Glass Commerce 液态玻璃·电商 | 紫粉渐变网格 | `#6366f1` | 半透明面板 + `backdrop-filter: blur(16px) saturate(180%)`（悬停 24px）；卡片 20px / 面板 24px / 按钮 14px / 搜索栏全胶囊；入场 scale 0.96 带弹性；背景网格 20s 流动 |
| `bento-editorial` | Bento Editorial 便当盒编辑风 | `#f7f7f5` | `#d62872` | 边框驱动而非阴影驱动；大卡片标题 Playfair Display；价格 Century Gothic；卡片 20px / 小卡 16px / 按钮 10px / 搜索框 24px；网格 gap 14px |
| `neo-brutalism` | Neo-Brutalism Accent 新粗野主义·点缀 | `#ffffff` | `#ff6b35` | 克制基底 + 关键转化点的粗野主义 CTA：3px 黑边、`6px 6px 0 #000` 硬阴影、悬停 `3px 3px 0` + `translate(3px,3px)`、激活归零位移 6px、`0.1s linear` 即时过渡；标题压缩大写 |
| `technical-monochrome` | Technical Monochrome 技术单色·等宽 | `#0d0d0d` | `#22c55e` | 等宽字体贯穿所有层级；全部 4-6px 圆角；基础间距单位 4px；价格 `$` 前缀 + `#141414` 代码块底色；悬停仅边框变绿，无缩放无位移 |

### 9.2 令牌的三层结构

| 层 | 文件 | 职责 |
| --- | --- | --- |
| 名册与兜底 | `assets/styles/variables.css` | 令牌**名** + 默认主题的值；JS 执行前的首屏兜底 |
| 取值 | `src/theme/presets.js` | 五套风格的完整取值（唯一数值来源） |
| 合成与应用 | `src/theme/compose.js` + `src/stores/theme.js` | 叠加「单项自定义」并把结果写到 `:root` |

`main.js` 在 `app.mount()` **之前**调用 `useThemeStore(pinia).init()`，
把令牌同步写到 `<html>` 的行内样式上 —— 放到 `onMounted` 会让用户先看到默认主题闪一下。

### 9.3 切换与单项自定义

导航栏右侧的 🎨 图标按钮打开弹窗（`ThemeSwitcher.vue`），两个页签：

- **整体风格**：五套风格整体切换（含色板预览、当前项标记）。
- **单项修改**：字号缩放 / 间距密度 / 圆角缩放 / 强调色 / 字体族 / 页面背景图与不透明度。
  强调色会**自动派生**悬停色（压暗 18%）、柔和底色（转 rgba）与「强调色之上的文字色」
  （按相对亮度决定黑或白），因此换个品牌色不会出现看不清的按钮文字。

控件由 `theme/presets.js` 的 `CUSTOM_FIELDS` 数据驱动渲染 ——
**新增一个可调项只需加一条描述，不用改组件模板**。

选择保存在 `localStorage` 的 `SSTC_THEME_PREF`，刷新后保留。

### 9.4 与数据层的联动

风格会改变价格的表现形式（`technical-monochrome` 用 `$` 前缀），
因此货币信息属于**数据层**而不是模板：

- `theme/presets.js` 每套主题声明 `price: { prefix, decimals }`；
- `useThemeStore()` 暴露 `pricePrefix` / `priceDecimals`；
- `formatUtils.formatPrice(price, currency)` 接受货币描述，默认值与旧行为一致（`¥` / 两位小数）；
- `ProductCard.vue` 从 store 取货币再格式化，**不在模板里写货币符号**。

同理，商品搜索的匹配规则放在 `shopStore` 的 `filteredProducts` getter 里，
搜索栏（导航栏）与商品网格（区块）共用同一份规则。

### 9.5 共享结构类与动效

`global.css` 提供（新增前请先确认确有多处复用）：

- `.section-header` / `.section-title` / `.title-icon` / `.section-description` — 区块头
- `.page-header` — 页面头
- `.ui-card` / `.ui-card-media` / `.ui-card-body` / `.ui-card-interactive` — 卡片外壳
- `.u-cta`（`--lg` 大号）/ `.u-btn` / `.u-chip` / `.u-input` — 按钮、标签、输入框
- `.u-enter` — 入场动效，配 `:style="{ '--i': index }"` 做错峰
- `.visually-hidden` / `.hide-mobile` / `.show-mobile`

动效全部由令牌参数化：`enterUp` 关键帧的起点取自 `--enter-shift` / `--enter-scale`，
延迟步长取自 `--stagger-step`，装饰性浮动由 `--decor-animation` 开关。
此外 `.scroll-reveal` 用 scroll-driven animation（`animation-timeline: view()`）
实现滚动渐显，**包在 `@supports` 内**，不支持的浏览器内容保持可见。
`variables.css` 末尾有 `prefers-reduced-motion: reduce` 的全局降级。

### 9.6 硬编码与断点纪律

- 组件样式**只允许消费令牌**。需要新色值/新字号时，先在 `variables.css` 登记语义化令牌，
  再补 `presets.js` 五套取值（`test/themeContract.test.js` 会校验两者集合一致）。
- **不许有死令牌**：`test/designTokens.test.js` 会把「定义了没人用」和
  「引用了未定义令牌」都判为失败；判定「有人用」时会排除 `variables.css` 与整个
  `src/theme/`（那是写出令牌名的地方）。
- **断点没有令牌**：CSS 自定义属性不能出现在 `@media` 条件里，实际断点必须写字面量，
  统一使用 `1199` / `991` / `767` / `575`（`min-width` 互补写法用 `768`）。
  同一文件内**不得重复声明相同的媒体查询**。

**设计规范的单一来源**：`.dsh/skills/project-ui-system/SKILL.md`。

---

## 10. 环境变量

| 文件 | 变量 | 值 |
| --- | --- | --- |
| `.env.development` | `VITE_API_BASE_URL` | 空（`''`）—— 请求走相对路径，由 Vite 代理转发 |
| `.env.development` | `VITE_API_TARGET` | 未设置 —— 代理目标回退到 `http://localhost:8080` |
| `.env.production` | `VITE_API_BASE_URL` | `https://starry-sky-trading-company-server.vercel.app` |

Vite 只把 `VITE_` 前缀的变量注入客户端（`import.meta.env.VITE_*`）。

> **开发环境为什么留空**：`baseURL` 为空时 axios 发相对路径，请求与页面**同源**，
> 由 `vite.config.js` 的 `server.proxy` 转发到后端 —— 与前端跑在哪个端口无关，也没有预检。
> 若改成绝对地址 `http://localhost:8080`，就变成跨源请求，必须依赖后端的 `CORS_ORIGINS`
> 白名单放行，而本地 Vite 端口是**会漂移**的（5173 被占用时自动退到 5174、5175……）：
> 实测过白名单只写 5173、前端跑在 5174 时，预检拿不到
> `Access-Control-Allow-Origin`，登录与列表接口全部 `Network Error`。
> 需要直连别的后端时设 `VITE_API_TARGET`（`vite.config.js` 优先读它）。

> 这两个文件**已被 git 跟踪**（`.gitignore` 只忽略 `*.local`），当前内容是公开 URL、不含凭据。

---

## 11. 本地开发

```bash
npm install
npm run dev        # http://localhost:5173
```

需要后端同时运行在 8080（见 [server README](../starry-sky-trading-company-server/README.md)）。

**dev 的 API 请求走代理，不走 CORS**：`.env.development` 的 `VITE_API_BASE_URL` 为空，
axios 发相对路径 → 同源 → 由下面的代理转发到 8080。因此**前端跑在哪个端口都无所谓**
（5173 被占用时 Vite 自动退到 5174、5175……，`strictPort: false`），也不需要后端 CORS 白名单配合。

`vite.config.js` 已为 `/user/login`、`/user/register`、`/user/visitorLogin`、`/user/refreshToken`、
`/userApi`、`/shop`、`/class`、`/toolApi`、`/kamiApi`、`/userBackend`、`/health` 配置了开发代理，
默认指向 `http://localhost:8080`（可用 `VITE_API_TARGET` 覆盖）。
由于 `/user` 下既有后端接口也有前端路由（`/user/kami` 是页面），代理只列了四个具体接口而非 `/user` 前缀 ——
**新增后端接口时若前缀不是上述之一，需要同步在这里加代理规则**，否则该接口在 dev 下会 404
（打到 dev server 自己，不会转发给后端）。

> 只有「刻意把 `VITE_API_BASE_URL` 设成 `http://localhost:8080`（直连、跨源）」时才需要后端
> 的 `CORS_ORIGINS` 放行；那份白名单在 server 仓库的 `.env` 里，且支持 `/正则/` 条目以覆盖端口漂移。

其他脚本：

```bash
npm run build        # 产出 dist/
npm run preview      # 预览构建产物
npm run lint         # ESLint 检查（src + test + scripts）
npm test             # 单元测试（node:test，共 404 个用例）
npm run check        # lint + test
npm run verify:dev   # 真实启动 dev server + 后端，验证代理转发与 HMR 推送（11 项）
npm run verify       # lint + test + build + verify:dev
```

### `npm run verify:dev` —— 唯一的「真实运行」验证

`test/*.test.js` 直接加载 `src/` 源码，**无法证明** dev server 能起来、代理能转发、
HMR 能推送。`scripts/verify-dev.cjs` 补上这一段：

| 断言 | 说明 |
| --- | --- |
| vite dev 启动并就绪 | 真实拉起 `vite`，等 `ready in` 输出 |
| `/` 返回 200 且含 HMR 客户端与入口 | 确认 dev 中间件正常 |
| 代理 `/health` 转发到后端 | 真实后端，返回后端 JSON |
| 代理 `POST /user/visitorLogin` 返回 token | 确认带响应头的接口也能透传 |
| HMR WebSocket 握手 | **必须带子协议 `vite-hmr`**，否则握手失败 |
| 改源文件后收到变更推送 | 实测收到 `custom:file-changed` 且指向该文件 |
| 未触发整页 reload | HMR 应为局部热更新 |
| 探测后源文件已还原 | 脚本自身保证不留残留 |

> 会真实启动 vite（5173）与后端（8080），结束时自动关闭并清理临时目录。
> 在受限沙箱中需一次性放宽权限（esbuild 要派生子进程）。

**路径别名**：`@` → `./src`，在 `vite.config.js` 的 `resolve.alias` 生效；`jsconfig.json` 里有一份对应配置供编辑器解析。

---

## 12. 部署

Vercel 静态站点，构建命令为 Vite 默认流程，产物目录 `dist`（`vercel.json` 未显式声明，依赖自动探测）。

`vercel.json`：

```json
{ "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }] }
```

这条回退是 `createWebHistory` 所必需的：直接访问 `/user/kami` 这类深层路径时也要返回 `index.html`。Vercel 会先匹配文件系统，所以 `/assets/*` 的哈希资源不受影响。

生产 API 地址由 `.env.production` 的 `VITE_API_BASE_URL` 在构建期注入。

---

## 13. 代码检查与测试

### 代码检查

```bash
npm run lint        # 或 npm run check（lint + test）
```

ESLint 9 扁平配置，文件为 **`eslint.config.cjs`** —— 因 `package.json` 声明了
`"type": "module"`，`.js` 会被当作 ESM 加载，而配置里用的是 `require`。

**只启用能抓真实缺陷的规则**（`no-undef`、`no-unused-vars`、`no-unreachable`、
`no-unsafe-optional-chaining`、`no-self-assign` 等），加上 `eslint-plugin-vue` 的
`flat/essential`。风格规则（缩进/引号/分号/`vue/html-indent` 等）全部关闭 ——
历史代码风格不统一，开启它们只会淹没真正的问题。

`vue/no-undef-components` 也已关闭：本项目用 `unplugin-vue-components` 自动导入
`a-*` 组件，开启该规则会大面积误报。

### 测试

使用 **Node 内置 `node:test`**，无新增依赖：

```bash
npm test
```

```
test/
├── loaders/
│   └── alias.mjs                     # 解析钩子：@/ 别名、省略扩展名、antd 测试替身
├── setup.js                          # 公共设施：Storage 桩、浏览器桩、import.meta.env
├── utils.test.js                     # src/utils 的纯函数（价格/计数格式化、节流、平滑滚动）
├── useClass.test.js                  # 工具分类与统计（分组、排序、映射、缺字段兜底）
├── useSimpleTimeFormatter.test.js    # 时间格式化（时区、季度、相对时间、非法输入）
├── useEmoji.test.js                  # emoji 渐变（已知/未知/空值/自定义/样式对象）
├── useToken.test.js                  # token 双存储读写与响应头提取
├── render.mjs                        # 渲染辅助：编译 .vue + SSR 渲染 + 环境桩
├── stores.user.test.js               # 用户 store：getters / init / login / register / logout
├── stores.shop.test.js               # 商品分类 store：数组形状不变量、loading 复位
├── stores.tool.test.js               # 工具 store：toolData 形状、分类产出、Apple ID 双来源
├── stores.kami.test.js               # 卡密 store：用户切换重置、筛选拼装、分页合并
├── useKamiDisplay.test.js            # 卡密展示层纯函数（状态文案/配色、工具名、日期）
├── useKamiActivation.test.js         # 卡密激活流程（校验、服务端失败、异常、activating 复位）
├── designTokens.test.js              # 设计令牌卫生（无死令牌、断点白名单、无重复媒体查询）
├── themeContract.test.js             # 主题契约：五套预设 ↔ 令牌名册一致、合成不产出空令牌、规范数值守卫
├── constSafety.test.js               # 静态检查「对 const 绑定赋值」
├── distContract.test.js              # 产物契约：标识/令牌是否真的进了打包结果（无 dist 时跳过）
├── renderComponents.test.js          # 组件渲染（SSR）：全部 .vue 渲染、无警告/插值事故
├── renderKamiData.test.js            # 注入真实 store 数据渲染：逐格断言 8 列内容与状态分支
└── api-contract.test.js              # 前后端接口契约（跨仓库静态校验）
```

共 404 个用例。

### 主题契约测试

`themeContract.test.js` 是新样式体系的安全网，覆盖三类只有"打开浏览器点一遍"才容易发现的缺陷：

1. **名册 ↔ 预设一致**：`variables.css` 登记的每个令牌，五套主题都必须给出取值（反之亦然）。
   漏一处，该令牌在某个主题下会静默落回别的主题的值。
2. **合成不产出空令牌**：五套主题 × 极端自定义组合（字号 85%~130%、密度 80%~130%、
   圆角 0~200%、`NaN`/负数/超范围）逐个走 `assertTokenContract`，任何缺失/空串都会失败。
3. **规范数值守卫**：把五套规范里写死的数字（`#0a0a0a`、`--radius-card: 20px`、
   `6px 6px 0 #000000`、`--space-unit: 4px` …）逐条断言，防止后续"凭手感改数值"。

此外还覆盖了强调色派生（自动压暗 + 反白/反黑文字）、背景图 URL 白名单
（`javascript:` 被丢弃、引号/换行被剔除）、缩放只作用于对应令牌组等行为。

### 测试基础设施（无新增依赖）

要让 `node:test` 直接跑 `src/` 里的源码，需要补掉三处 Vite 专有特性：

| 特性 | 方案 |
| --- | --- |
| `@/` 别名、省略扩展名的导入（`./ask/user`、`@/hooks/useToken`） | `test/loaders/alias.mjs` 用 `module.registerHooks` 注册同步 resolve 钩子 |
| `import.meta.env` | `test/setup.js` 的 load 钩子注入最小实现（源码无需为可测试而改写） |
| `ant-design-vue` 加载期访问 `document` | 在解析层替换为测试替身（记录 `message.*` 调用后返回空函数） |

> **关于 ant-design-vue**：最初是给 `document` 打桩，然后一路补
> `getElementsByTagName` → `createElementNS` → `createComment` → `getComputedStyle`……
> 每补一个就冒出下一个。那是**用桩去追一个 UI 库**，而不是测试被测逻辑。
> 改为替身后，`setup.js` 的浏览器桩可以缩到极小（只剩 axios 平台探测需要的
> `window.location`），也不再产生测试结束后的异步拒绝。
> 若将来确需渲染组件，应引入 jsdom，而不是继续往桩里加 API。

### 接口契约测试

`api-contract.test.js` 会**静态解析两端源码**（不启动服务、不连数据库），断言：

1. 前端 `src/api/ask/*.js` 里调用的每个「方法 + 路径」在 server 的 `src/router/*` 中都有对应路由
2. 不存在同名路径但方法不一致的情况
3. 12 个关键接口（登录/注册/刷新/用户信息/商品/分类/工具/卡密/探活）显式存在
4. 解析器自检 —— 解析结果数量低于阈值即失败，避免正则失效导致「假通过」

动态段会归一化后比较（前端 `${userId}` 与后端 `:user_id` 视为同一段）。
该测试会读取 `../starry-sky-trading-company-server/src`，因此**两个仓库需要保持并列的目录结构**；
server 源码缺失时断言会直接失败，不会静默跳过。

> 注意：它只校验「路径与方法」，**不校验请求体/响应字段的形状**。

### 构建产物契约测试

`distContract.test.js` 在「源码测试」与「渲染测试」之间补一层：源码测试直接加载 `src/`，
而生产用的是 Vite 打包产物 —— 若模块被 tree-shaking 掉、导出名丢失、或样式令牌没进 CSS，
**源码测试不会发现**。它断言：

1. 已修缺陷的**行为标识**仍在产物中（`__isRetry`、`__isRefreshToken`、`登录状态已失效` 等）
2. 抽取出的 composable 文案确实被打包（`请选择工具`、`请输入卡密` 等）
3. 设计令牌完整进入 CSS，且**已删除的死令牌无残留**
4. `:root` 只输出一次（防止 `@import` 重复引入回归）
5. `index.html` 引用的产物文件都存在（哈希不匹配会导致白屏）
6. 无异常空的 JS chunk；解析器自检（防止空产物造成假通过）

> **`dist/` 不存在时该组整体跳过**（`{ skip: true }`），因此 `npm test` 无需先构建。
> CI 若要覆盖这组，需在 `npm test` 前先 `npm run build`。

> 它能抓「代码没进产物 / 令牌没进 CSS / 哈希不匹配」，**抓不到「模板绑错了变量」**——
> 渲染与交互仍需 jsdom 或真实浏览器。

### 组件渲染测试（基于 SSR，不需要 jsdom）

`renderComponents.test.js` 用 `@vue/server-renderer` **在 Node 里真正执行**组件的 setup 与
render 函数。它**不引入任何新依赖** —— `@vue/server-renderer` 是 `vue` 自身的依赖。

- 组件清单**自动发现**（遍历 `src/**/*.vue`），当前 25 个组件全部纳入
- `test/render.mjs` 提供 `renderComponent()` 与 `createRenderEnv()`：
  后者注册 `router-link`/`router-view` 桩、11 个 `a-*` antd 组件桩、
  以及 5 个带必需 props 的子组件包装 —— 目的是**去掉噪音**，
  让「渲染期间无 Vue 警告」这条断言有信号
- `.vue` 的编译在 `test/loaders/alias.mjs` 的 `load` 钩子里完成
  （`@vue/compiler-sfc`，`inlineTemplate: true`）

> **能抓**：模板引用了不存在的变量、computed 抛错、把 `undefined`/`NaN` 插值到页面、
> 组件缺必需 prop 直接崩、渲染期间的 Vue 警告。
>
> **抓不到**：CSS 布局与响应式、真实点击/键盘事件、无障碍树、
> `onMounted` 里的数据加载（SSR 不执行 `onMounted`）。

`renderKamiData.test.js` 在此基础上**注入真实 store 数据**再渲染
（`createPiniaWithState({ user, kami, tool })` —— store 是选项式写法，无需 mock api），
逐格断言卡密表格的 8 列内容与状态分支。它抓到过一个**纯空态渲染发现不了的缺陷**：
`#bodyCell` 插槽缺少 `card_name` 分支，导致「卡密名称」**整列为空**
（表头还在、其它 7 列都有值，只有这一列空着 —— 人工检查时很容易漏）。

> 关键语义：`a-table` **一旦提供 `#bodyCell`，所有单元格都由该插槽决定**，
> 未命中的列**不会**回落到 `dataIndex` 默认渲染 —— 因此每列都必须有分支。
> `render.mjs` 里的 `a-table` 桩也按这个语义真正渲染 `data-source` 并调用插槽，
> 否则单元格模板根本不会执行（这一点是能发现上述缺陷的前提）。

`package.json` 中的脚本带 `--test-isolation=none`：默认的按文件进程隔离会派生子进程，
在受限环境下会被拒绝，同进程运行即可。**代价是所有测试文件共享进程，因此新测试不得依赖执行顺序** ——
各文件都自行安装所需的全局桩。

**为什么不用 vitest**：曾安装并尝试，但 vitest 加载配置文件与 vite 一样要经 esbuild
派生常驻子进程，在受限环境下报 `spawn EPERM`；`node:test` 零依赖且可直接运行，故改用后者
（vitest / jsdom / @vue/test-utils 已卸载）。

**注意**：测试直接以原生 ESM 加载 `src/` 源码，因此源码中的依赖导入必须写完整路径
（例如 `dayjs/plugin/utc.js` 而不是 `dayjs/plugin/utc`）—— Vite 能解析无后缀形式，Node 不能。

**尚未覆盖**：

| 未覆盖 | 原因与说明 |
| --- | --- |
| 组件渲染 | 需要 jsdom（或在 CI 里用真实浏览器）；当前加载器不渲染 SFC |
| `hooks/useBodyScroll` | 依赖 DOM 尺寸测量 |

已覆盖：`utils`、`useClass`、`useSimpleTimeFormatter`、`useEmoji`、`useToken`、`useKamiDisplay`、`useKamiActivation`、
四个 store（`user` / `shop` / `tool` / `kami`），以及跨仓库的接口契约。

> 测试基础设施（`test/loaders/alias.mjs`、`test/setup.js`）模拟了 Vite 的解析规则；
> 若 `vite.config.js` 的 `resolve.alias` 有变动，这里需要同步。

---

## 14. 问题状态

完整的问题清单与成因分析见根目录 `代码审查报告.md`。下表是**当前状态**（✅ 已修 / ⬜ 未修）。

**阻断性 — 已全部修复**

| 状态 | 问题 |
| --- | --- |
| ✅ | 登录/注册不可用：已补 `api/ask/user.js` 的 `login`/`register` 与 `stores/user.js` 的对应 action，注册分支不再为空 |
| ✅ | 游客被当作已登录导致登录入口消失：`isLoggedIn` 改为 getter，仅 `user_type === 'registered'` 成立 |
| ✅ | token 从未被保存：响应头统一为 `Access-Token`/`Refresh-Token`，Authorization 改由请求拦截器动态注入 |
| ✅ | 401 刷新链路不通：刷新请求补 `Bearer `、promise 保证 settle、失败触发 `setAuthExpiredHandler` |
| ✅ | 商品/分类不加载：`App.vue` 调用 `shopStore.init()`；store 改为数组承接 |
| ✅ | `vite build` 因 `HOT_PRODUCTS` 缺失而失败：`ProductsSection.vue` 已删除 |

**功能缺陷**

| 状态 | 问题 |
| --- | --- |
| ✅ | `useClass` 调用了不存在的 `getDefaultIcon()` / `getMostPopularCategory()`（已补齐实现） |
| ✅ | `KamiSection` 双层 `{ params }` 导致分页与筛选失效（已重写并统一到 API 层包装） |
| ✅ | 请求失败统一抛 `'faile'`，服务端 `message` 被丢弃 |
| ✅ | `Navbar` 卡密管理项把 `<router-link>` 嵌在 `<button>` 里（已改为独立 `<router-link>`） |
| ✅ | 区块头被复制 5 份、页面头被复制 4 份（已抽取 `SectionHeader.vue` / `PageHeader.vue`） |
| ✅ | `Tool.vue` 的搜索对 `tool.description` 直接调 `.toLowerCase()`（已统一 null 安全处理） |
| ✅ | `Tool.vue` 收藏是写死的 `Set([1,3,5])`（已改为真实可切换并持久化到 localStorage） |
| ✅ | `2FA.vue` 中 `countdown === 0` 永不成立（已改为 `=== 30`，并给异步计算加序号守卫） |
| ✅ | 非 HTTPS 下 `crypto.subtle` 不可用却报「无法解析密钥」（已改为明确的安全上下文提示） |
| ✅ | `useSimpleTimeFormatter` 的 `getRelativeTime()` 恒返回空串（插件改为静态注册） |
| ✅ | 季度计算 `Math.ceil(month()/3)+1` 偏差 1（已改为 `Math.floor(month()/3)+1`） |
| ✅ | `router/index.js` 无鉴权守卫（已加 `beforeEach`，`/user/kami` 标记 `requiresAuth`，登录后按 `redirect` 回跳） |
| ✅ | 卡片外壳被复制到 3 个组件（已收敛为 `global.css` 的 `.ui-card` / `.ui-card-media`） |
| ✅ | `ProductCard.vue` 静态容器带 `role="button"` 但无键盘处理（已改为 `role="link"` + Enter/Space） |
| ✅ | `ProductCard.vue` 模板直接取 `product.stock_status.message` 会崩溃（已改为 computed 兜底） |
| ✅ | token 自动续期从未生效：401 重试逻辑写在成功回调里（axios 对 4xx 会 reject，那段代码不可达），且请求拦截器无条件覆盖 `Authorization` 使刷新请求带的是 access token；另有 `api/ask/user.js` 的同名 `refreshToken` 覆盖了正确实现。已移入错误处理器、拦截器改为「已显式设置则提前返回」、删除重复实现，并补 `__isRetry` 防死循环 |
| ✅ | `useBodyScroll` 无引用计数，任一持有者解锁即恢复滚动；`Navbar` 还在从不加锁的情况下调用 `enableScroll`（无主释放）。已加引用计数与实例级持有标记，并删除 `Navbar` 的无主解锁 |
| ✅ | `2FA.vue` 的 TOTP 算法无法被测试（嵌在 `.vue` 中）。已抽到 `utils/totp.js` 并对照 RFC 6238 官方测试向量验证（6/6 通过） |
| ✅ | 复制验证码/密钥失败时完全静默（丢弃 `execCommand` 返回值、降级分支无任何提示）。已抽出 `utils/clipboard.js`，按结果提示，失败明确告知用户 |
| ✅ | 后台标签页返回前台后仍显示上一周期的验证码（`setInterval` 被节流）。已加 `visibilitychange` 监听，重新可见时立刻重算 |
| ✅ | `obj[key]` 命中原型链：`icon_url` 为 `toString` 等值时分区块渲染崩溃（实测可达）。已加 `utils/safeLookup.js` 并修复 4 处同类查表 |
| ⬜ | `Navbar` 的个人中心 / 我的收藏 / 订单管理仍为 TODO |
| ⬜ | 商品「标签 / 评分」等字段后端未提供，卡片已不再渲染，若需要需先扩展 `products` 表 |
| ⬜ | `product_categories.icon_url` 有 6 行为 NULL，这些分类会渲染出空白图标（数据问题，需确认是否补齐） |

**工程卫生**

| 状态 | 问题 |
| --- | --- |
| ✅ | `Navbar.vue` 重复的 `<style>` 块（1109 行 → 828 行） |
| ✅ | 死文件 `ProductsSection.vue` / `KamiCard.vue` / `stores/home.js` / `__tests__/imports.test.js` 已删除 |
| ✅ | `variables.css` 的非法值（`--glass-backdrop` 曾含属性名）、缺失语义令牌、重复 `@import`、缺失中文字体栈 —— 均已修复（已实测确认：`global.css` 第 1 行为注释说明不再 `@import`；字体栈含 `PingFang SC`/`Microsoft YaHei`；已补 `--color-muted`/`--color-border`/`--color-success`/`--color-warning`/`--color-danger`） |
| ✅ | `package.json` 的 `name` 已改为 `starry-sky-trading-company-web`；已有 `lint` / `test` / `check` 脚本；已接入 ESLint 9 与 `node:test`（404 个用例） |
| ⬜ | `.vscode/settings.json` 仍是 Vite-TS 模板残留 |

> 上表中的 ✅ 条目均经实际检查确认，不是「应该已修」。
>
> **环境限制**：本仓库的 `vite build` / `vite dev` 需要 esbuild 以管道 stdio 派生常驻子进程，
> 在受限沙箱中会被拒绝（`vite build` 已通过一次性放宽权限实际执行成功，产物已验证）。
> **组件渲染类行为仍未在真实浏览器中实测** —— 需要 jsdom 或浏览器环境，属尚未决定引入的依赖。

17. `constants/index.js` 缺少部分被引用的导出（`CATEGORIES`、`HOT_PRODUCTS`）。
