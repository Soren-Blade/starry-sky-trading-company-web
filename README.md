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
| `LoginModal.vue` | 登录/注册弹窗。登录支持用户名/邮箱/手机号自动判别 `login_type`；注册成功后自动切回登录页签。模态约定见下 |
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

详见 [`src/assets/README.md`](src/assets/README.md)。要点：

**设计令牌**（`assets/styles/variables.css` 的 `:root`）：品牌色、语义色（`--color-muted` /
`--color-border` / `--color-success|warning|danger`）、渐变、阴影（含 `--shadow-card`）、
毛玻璃、圆角、过渡、布局尺寸。文件末尾含 `prefers-reduced-motion` 全局降级。

> **断点没有令牌**：CSS 自定义属性不能出现在 `@media` 条件里，实际断点必须写字面量，
> 统一使用 `1199` / `991` / `767` / `575`。此前的 `--breakpoint-*` 变量已删除。

**全局样式**（`assets/styles/global.css`，约 336 行）：基础重置、WebKit 滚动条、元素重置、
**4 个动画关键帧**（`fadeInUp` `fadeInScale` `float` `floatRandom`）、
**共享结构类**（`.section-header` 系列、`.page-header`、`.ui-card` 系列、
`.visually-hidden`、`.hide-mobile`/`.show-mobile`）、`:focus-visible`。

**加载方式**：`main.js` 依次 `import` `variables.css` → `global.css` → antd reset。
`global.css` **不再** `@import variables.css`（此前导致 `:root` 输出两次）。

**组件样式**：全部 `<style scoped>`，通过 `var(--token)` 引用。antd 表格等需穿透时用 `:deep()`
（见 `KamiSection.vue`）。

**设计规范的单一来源**：`.dsh/skills/project-ui-system/SKILL.md`。

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

需要后端同时运行在 8080（见 [server README](../starry-sky-trading-company-server/README.md)）。

`vite.config.js` 已为 `/user/login`、`/user/register`、`/user/visitorLogin`、`/user/refreshToken`、
`/userApi`、`/shop`、`/class`、`/toolApi`、`/kamiApi`、`/userBackend`、`/health` 配置了开发代理，
默认指向 `http://localhost:8080`（可用 `VITE_API_TARGET` 覆盖）。
由于 `/user` 下既有后端接口也有前端路由（`/user/kami` 是页面），代理只列了四个具体接口而非 `/user` 前缀 ——
**新增后端接口时若前缀不是上述之一，需要同步在这里加代理规则**。

其他脚本：

```bash
npm run build      # 产出 dist/
npm run preview    # 预览构建产物
npm run lint       # ESLint 检查
npm test           # 单元测试（node:test，74 个用例）
npm run check      # lint + test
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
├── utils.test.js                     # src/utils 的纯函数（格式化、样式、响应式、防抖节流）
├── useClass.test.js                  # 工具分类与统计（分组、排序、映射、缺字段兜底）
├── useSimpleTimeFormatter.test.js    # 时间格式化（时区、季度、相对时间、非法输入）
├── useEmoji.test.js                  # emoji 渐变（已知/未知/空值/自定义/样式对象）
├── useToken.test.js                  # token 双存储读写与响应头提取
├── stores.user.test.js               # 用户 store：getters / init / login / register / logout
├── stores.shop.test.js               # 商品分类 store：数组形状不变量、loading 复位
├── stores.tool.test.js               # 工具 store：toolData 形状、分类产出、Apple ID 双来源
├── stores.kami.test.js               # 卡密 store：用户切换重置、筛选拼装、分页合并
└── api-contract.test.js              # 前后端接口契约（跨仓库静态校验）
```

共 286 个用例。

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

已覆盖：`utils`、`useClass`、`useSimpleTimeFormatter`、`useEmoji`、`useToken`、
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
| ⬜ | `Navbar` 的个人中心 / 我的收藏 / 订单管理仍为 TODO |
| ⬜ | 商品「标签 / 评分」等字段后端未提供，卡片已不再渲染，若需要需先扩展 `products` 表 |
| ⬜ | 无 lint / 无测试运行器（`package.json` 仍沿用旧包名 `easy-payment-interface-test`） |

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
