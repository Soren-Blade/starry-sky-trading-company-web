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

**没有使用** TypeScript、ESLint、Prettier、测试框架。

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
    │   │   ├── variables.css     # CSS 变量（色彩、渐变、阴影、圆角、过渡）
    │   │   └── global.css        # 全局重置、滚动条、动画关键帧、工具类
    │   └── README.md             # assets 目录说明
    ├── components/               # 区块与卡片组件（见 §6）
    ├── constants/
    │   └── index.js              # COLORS / NAV_MENU / BREAKPOINTS / 动画时长 / 标签色
    ├── hooks/
    │   ├── useToken/index.js             # localStorage 读写 token
    │   ├── useRefreshToken/index.js      # 刷新 token（单飞 promise）
    │   ├── useBodyScroll/useBodyScroll.js# 弹窗打开时锁定页面滚动
    │   ├── useClass/index.js             # 按 class 字段对工具分组
    │   ├── useEmoji/index.js             # emoji → 渐变背景（映射表 + 生成器类）
    │   └── useSimpleTimeFormatter/index.js # 时间格式化与时区转换
    ├── pages/                    # 路由目标页面（见 §4）
    ├── router/
    │   └── index.js              # 路由表 + 标题守卫
    ├── stores/                   # Pinia store（见 §5）
    │   ├── user.js
    │   ├── shop.js
    │   ├── tool.js
    │   └── kami.js
    ├── utils/
    │   └── index.js              # 动画/样式/响应式/DOM/格式化工具 + debounce/throttle
    └── __tests__/
        └── imports.test.js       # 非测试：仅导入与 console.log（见 §10）
```

---

## 3. 应用入口与初始化

`index.html` → `<script type="module" src="/src/main.js">` → `src/main.js`：

```js
import './assets/styles/variables.css'
import './assets/styles/global.css'
import 'ant-design-vue/dist/reset.css'

const app = createApp(App)
app.use(createPinia())
app.use(router)
app.mount('#app')
```

`App.vue` 提供全局骨架：

- `<Navbar />` 固定顶栏（含登录/注册入口与用户下拉菜单）
- `<main><router-view /></main>` 路由出口
- `<Footer />` 页脚
- 右下角"回到顶部"悬浮按钮（滚动超过 300px 出现，用 `throttle` 节流）

> `App.vue` 里 `useShopStore()` 已实例化，但驱动商品/分类数据的 `shopStore.init()` 被注释掉了，因此首页的分类与热门商品区块目前拿不到数据。

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
| `pagination` | 分页信息 |
| `getCategories()` | 以 `{ tree: true }` 调 `/class/getCategories` |
| `getProducts()` | 以 `{ in_stock: 'all' }` 调 `/shop/getProducts` |
| `init()` | 依次调用上面两个（用逗号表达式，无返回值） |

### `tool.js` — `useToolStore`

| 成员 | 说明 |
| --- | --- |
| `toolData` | 工具数据。`fetchTools()` 会把接口返回的 `data` 与 `classifyToolsByClass()` 的结果合并进去，因此实际含 `tools` / `pagination` / `filters` / `classified` / `classes` |
| `toolMeta` | 接口 `meta`（仅写入，未被读取） |
| `activeCategory` | 当前选中分类，默认 `'all'` |
| `appleIds` | 共享 Apple ID 数据，实际是 `{ nanoCloud, fangQiangNan }` 对象 |
| `fetchTools()` / `fetchAppleIds()` / `setActiveCategory()` / `init()` | 见 server README 的 `/toolApi` 接口说明 |

### `kami.js` — `useKamiStore`

| 成员 | 说明 |
| --- | --- |
| `userKamis` | 当前用户的卡密列表 |
| `pagination` | 分页信息 |
| `filters` | `status` / `card_type` / `tool_id`（仅声明，未被读写） |
| `fetchUserKamis(userId, opts)` | 调 `GET /kamiApi/getUserCards/:user_id`，写入列表与分页 |

> `KamiSection.vue` 目前自己在组件内实现了取数逻辑并直接改 store 状态，`fetchUserKamis` 未被调用。
> `stores/home.js` 是一个未被任何地方引用、且没有 import `defineStore` 的空文件。

---

## 6. 组件清单

### 布局与通用

| 组件 | 说明 |
| --- | --- |
| `Navbar.vue` | 固定顶栏。Logo、`NAV_MENU` 渲染的导航、移动端汉堡菜单、登录/注册按钮（游客与未登录都显示）、用户头像下拉（个人中心 / 我的收藏 / 订单管理 / 卡密管理 / 退出登录，前三项为 TODO）。身份初始化由 `App.vue` 统一负责，此处不再重复请求 |
| `Footer.vue` | 页脚：站点信息、链接分组、版权 |
| `LoginModal.vue` | 登录/注册弹窗。登录支持用户名/邮箱/手机号自动判别 `login_type`；注册成功后自动切回登录页签 |
| `SectionHeader.vue` | **区块头**（icon + title + description）。样式定义在 `global.css` 的 `.section-header` 系列，供各 Section 组件复用 |
| `PageHeader.vue` | **页面头**（title + subtitle）。渐变通过 CSS 变量 `--page-header-gradient` 在页面上覆写 |

### 区块

| 组件 | 说明 |
| --- | --- |
| `HeroSection.vue` | 首屏 hero，渐变背景 + CTA 按钮，含浮动装饰与入场动画 |
| `CategoriesSection.vue` | 商品分类网格，卡片背景由 `getEmojiGradient(category.icon_url)` 生成 |
| `HotProductsSection.vue` | 热门商品网格，数据源 `shopStore.shopInfo`，含加载 / 错误 / 空三种状态 |
| `AppleIdSection.vue` | 汇总两个数据源的 Apple ID；加载与错误状态取自 `toolStore.appleIdsLoading` / `appleIdsError` |
| `KamiSection.vue` | 卡密管理主体。`a-table` 卡密列表（状态筛选、刷新、分页、卡号脱敏）与激活表单；游客态显示登录提示 |

### 卡片

| 组件 | 说明 |
| --- | --- |
| `ProductCard.vue` | 商品卡：图片/占位、标签、评分、价格、收藏、快速预览、加购（后两者仅打印日志） |
| `ToolCard.vue` | 工具卡：封面或 icon、分类、描述、收藏按钮（`collection_count` 展示）、"打开工具" |
| `AppleIdCard.vue` | Apple ID 账号卡：账号、密码（可复制）、状态、地区、更新时间 |

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

## 9. 样式体系

**变量**（`assets/styles/variables.css`，挂在 `:root`）：色彩（`--color-primary` `#8A6DFF` 等 6 个）、渐变（`--gradient-primary` 等 3 个）、阴影（`--shadow-sm/md/lg/xl/glass`）、圆角（`--radius-sm/md/lg/xl`）、过渡（`--transition-fast/base/slow`）、断点（`--breakpoint-*`，CSS 变量无法用于 `@media`，仅为记录）。

**全局样式**（`assets/styles/global.css`）：基础重置、WebKit 滚动条定制、元素重置、`.container` 响应式容器、10 个动画关键帧（`fadeInUp` `fadeInScale` `float` 等）、工具类（`.text-gradient` `.glass-effect` `.hide-mobile` `.show-mobile` 等）、`:focus-visible` 焦点样式。

**加载方式**：`main.js` 直接 `import` 两个 css，且 `global.css` 顶部又 `@import './variables.css'`，变量文件因此被引入两次。

**组件样式**：全部使用 `<style scoped>`，通过 `var(--color-*)` 引用变量。antd 表格等需要穿透时用 `:deep()`（见 `KamiSection.vue`）。

---

## 10. 环境变量

| 文件 | 变量 | 值 |
| --- | --- | --- |
| `.env.development` | `VITE_API_BASE_URL` | `http://localhost:8080` |
| `.env.production` | `VITE_API_BASE_URL` | `https://starry-sky-trading-company-server.vercel.app` |

Vite 只把 `VITE_` 前缀的变量注入客户端（`import.meta.env.VITE_*`）。

> 这两个文件**已被 git 跟踪**（`.gitignore` 只忽略 `*.local`），当前内容是公开 URL、不含凭据。

---

## 11. 本地开发

```bash
npm install
npm run dev        # http://localhost:5173
```

需要后端同时运行在 8080（见 [server README](../starry-sky-trading-company-server/README.md)），`vite.config.js` 中的 `server.proxy` 目前为空，跨域由后端 `cors()` 全开放承担。

其他脚本：

```bash
npm run build      # 产出 dist/
npm run preview    # 预览构建产物
```

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

## 13. 测试

`src/__tests__/imports.test.js` 目前**不是可执行的测试**：

- `package.json` 中没有任何测试运行器（无 vitest / jest / `@vue/test-utils`），也没有 `test` 脚本
- 文件内没有 `describe` / `it` / `expect`，主体是 import 与 `console.log`
- 其中的 import 已失效：引用了不存在的 `@/pages/New.vue`，以及 `constants/index.js` 不再导出的 `CATEGORIES` / `HOT_PRODUCTS`

若需要接入测试，最小改动是安装 `vitest` + `jsdom` + `@vue/test-utils`，加 `"test": "vitest run"`，并把该文件重写为真正的断言（store 需先 `setActivePinia(createPinia())`，接口用 `vi.mock('@/api/index')`）。

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
| ⬜ | `Tool.vue` 的搜索对 `tool.description` 直接调 `.toLowerCase()`（后端可能返回 null） |
| ⬜ | `Tool.vue` 收藏是写死的 `Set([1,3,5])`，切换逻辑仍被注释 |
| ⬜ | `2FA.vue` 中 `countdown === 0` 永不成立（应为 `=== 30`）；非 HTTPS 下 `crypto.subtle` 不可用 |
| ⬜ | `useSimpleTimeFormatter` 的 `getRelativeTime()` 恒返回空串；季度计算 `Math.ceil(month()/3)+1` 偏差 1 |
| ⬜ | `Navbar` 的个人中心 / 我的收藏 / 订单管理仍为 TODO |
| ⬜ | `router/index.js` 无鉴权守卫（`/user/kami` 未保护） |
| ⬜ | 卡片组件仍各自实现外壳；`ProductCard.vue` 静态容器带 `role="button"` 但无键盘处理 |

**工程卫生**

| 状态 | 问题 |
| --- | --- |
| ✅ | `Navbar.vue` 重复的 `<style>` 块（1109 行 → 828 行） |
| ✅ | 死文件 `ProductsSection.vue` / `KamiCard.vue` / `stores/home.js` / `__tests__/imports.test.js` 已删除 |
| ✅ | `variables.css` 的非法值、缺失语义令牌、重复 `@import`、缺失中文字体栈 |
| ⬜ | `package.json` 的 `name` 仍是 `easy-payment-interface-test`；无 lint / test 脚本，无测试运行器 |
| ⬜ | `.vite`/`dist` 之外，`.env.*` 的忽略规则已补，但 `.vscode/settings.json` 仍是 Vite-TS 模板残留 |

> **未完成项均未经验证修复**。另有环境层面的限制：本仓库的 `vite build` / `vite dev` 在受限沙箱中无法运行（esbuild 需要以管道 stdio 派生常驻子进程），因此前端改动仅通过静态检查（ESM 解析、SFC 结构、令牌引用完整性），**尚未在浏览器中实测**。

17. `constants/index.js` 缺少部分被引用的导出（`CATEGORIES`、`HOT_PRODUCTS`）。
