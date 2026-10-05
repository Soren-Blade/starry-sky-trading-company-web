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
    │       ├── userApi.js        # /userApi（用户信息、资料修改、头像上传）
    │       ├── shop.js           # /shop 与 /class（含商品详情）
    │       ├── toolApi.js        # /toolApi
    │       ├── kami.js           # /kamiApi
    │       ├── cart.js           # /cartApi
    │       ├── order.js          # /orderApi
    │       └── favorite.js       # /favoriteApi
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
    │   ├── useToken/index.js             # localStorage 读写 token（含「记住我」）
│   ├── useBootScreen/index.js        # 首屏遮罩的三个时间闸（延迟/最短/最长）
│   ├── useRouteLoading/index.js      # 路由是否在切换（顶部进度条）
    │   ├── useRefreshToken/index.js      # 刷新 token（再导出 @/api/request 的单飞实现）
    │   ├── useBodyScroll/useBodyScroll.js# 弹窗打开时锁定页面滚动（含引用计数）
    │   ├── useModalA11y/index.js         # 模态无障碍：Escape / 焦点陷阱 / 焦点归还 / 滚动锁定
    │   ├── useAvatarUpload/index.js      # 头像：选图 → canvas 缩到 256px → 编码 data URL
    │   ├── useProductActions/index.js    # 商品的看详情 / 加购 / 立即下单（含未登录拦截）
    │   ├── useOpenTool/index.js          # 打开外部工具（地址校验、弹窗拦截、复用已开窗口）
    │   ├── useClass/index.js             # 按 class 字段对工具分组
    │   ├── useEmoji/index.js             # emoji → 渐变色（分类卡底纹用）
    │   ├── useKamiDisplay/index.js       # 卡密展示：状态文案/配色、列定义、工具名、日期
    │   ├── useKamiActivation/index.js    # 卡密激活流程：校验、提交、结果状态机
    │   ├── useToast/index.js             # 提示框门面（notify.success/warning/error/info）
    │   └── useSimpleTimeFormatter/index.js # 时间格式化与时区转换
    ├── pages/                    # 路由目标页面（见 §4）
    ├── router/
    │   └── index.js              # 路由表 + 标题守卫 + 鉴权守卫
    ├── stores/                   # Pinia store（见 §5）
    │   ├── user.js
    │   ├── shop.js
    │   ├── tool.js
    │   ├── kami.js
    │   ├── cart.js               # 购物车（服务端为唯一事实来源）
    │   ├── favorite.js           # 收藏（登录走服务端、游客的工具有 localStorage 兜底）
    │   └── theme.js              # 设计风格：切换、单项自定义、持久化、写入 :root
    ├── theme/                    # 设计风格（样式体系的运行时层）
    │   ├── presets.js            # 五套风格的完整令牌取值 + 可调项定义
    │   ├── compose.js            # 预设 + 单项自定义 → 最终令牌表（纯函数）
    │   └── color.js              # 解析/压暗/转 rgba/缩放 px 的小工具
    └── utils/
        ├── index.js              # throttle / domUtils.smoothScroll / formatUtils
        ├── assetUrl.js           # 后端静态资源地址解析（/uploads/... → API 基地址）
        ├── avatarFile.js         # 头像纯函数：文件校验、等比缩放尺寸、data URL 体积
        └── clipboard.js          # 剪贴板写入（两级策略 + 失败提示）
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

- `<Navbar />` 固定顶栏（品牌 + 主导航 + **收成图标的搜索** + 样式主题切换 + 账号入口 + 移动端抽屉）
- `<main class="main-content"><router-view /></main>` 路由出口；
  `padding-top: var(--navbar-height)` 在这里统一给出，**各页面不再自己写顶栏占位**
- `<Footer />` 页脚
- 右下角"回到顶部"悬浮按钮（滚动超过 300px 出现，用 `throttle` 节流）
- 顶部路由进度条 `<div class="route-progress">`（导航中显示，见 §5）
- **首屏启动遮罩** `<div class="boot-screen">`，挂在 `.app-container` **外面**（见 §5）

### `onMounted` 的启动顺序

```js
startBoot()                      // 启动计时开始（遮罩延迟出现）
try {
  await userStore.init()         // 身份：复用本地 token 或建游客
  await router.isReady()         // 首次路由就位（含首屏分包下载）
} finally {
  booting.value = false; finishBoot()   // 无论成败都必须放行
}
shopStore.init()                 // 商品数据**不阻塞**启动（有骨架屏）
if (userStore.isLoggedIn) { … }  // 购物车 / 收藏是账号级数据，身份就绪后再取
```

`userStore.init()` 必须**先于** `shopStore.init()`：商品接口要鉴权，两者赛跑会让
冷启动的商品请求先发出并 401，进而触发「登录态失效」回调把深链悄悄带回首页。

`shopStore.init()` 则**必须排在放行之后**：它有自己的骨架屏，让全屏遮罩等它
只会把「边看边加载」变成更久的白屏。

---

## 4. 路由表

`src/router/index.js`，history 模式，全部页面按需懒加载。

| 路径 | name | 组件 | 标题 | 需登录 |
| --- | --- | --- | --- | --- |
| `/` | — | *重定向到 `/home`* | — | — |
| `/home` | `Home` | `pages/Home.vue` | 首页 - 星辰商行 | |
| `/categories` | `Categories` | `pages/Categories.vue` | 商品分类 - 星辰商行 | |
| `/hot` | `Hot` | `pages/Hot.vue` | 热门推荐 - 星辰商行 | |
| `/product/:id` | `ProductDetail` | `pages/ProductDetail.vue` | 商品详情 - 星辰商行 | |
| `/category/:id` | `CategoryDetail` | `pages/CategoryDetail.vue` | 分类商品 - 星辰商行 | |
| `/cart` | `Cart` | `pages/Cart.vue` | 购物车 - 星辰商行 | |
| `/tool` | `Tool` | `pages/Tool.vue` | 工具分类 - 星辰商行 | |
| `/video/downloader` | `videoDownloader` | `pages/VideoTool.vue` | 视频下载工具 - 星辰商行 | 占位页，见下 |
| `/about` | `About` | `pages/About.vue` | 关于我们 - 星辰商行 | |
| `/other/2fa` | `2fa` | `pages/2FA.vue` | 2FA - 星辰商行 | |
| `/other/appleId` | `appleId` | `pages/AppleId.vue` | appleId - 星辰商行 | |
| `/user/kami` | `kami` | `pages/Kami.vue` | 卡密管理 - 星辰商行 | ✅ |
| `/user/profile` | `Profile` | `pages/Profile.vue` | 个人中心 - 星辰商行 | ✅ |
| `/user/favorites` | `Favorites` | `pages/Favorites.vue` | 我的收藏 - 星辰商行 | ✅ |
| `/user/orders` | `Orders` | `pages/Orders.vue` | 订单管理 - 星辰商行 | ✅ |
| `/user/orders/:orderNo` | `OrderDetail` | `pages/OrderDetail.vue` | 订单详情 - 星辰商行 | ✅ |
| `/terms` | `Terms` | `pages/Legal.vue` | 用户协议 - 星辰商行 | |
| `/privacy` | `Privacy` | `pages/Legal.vue` | 隐私政策 - 星辰商行 | |
| `/rules` | `Rules` | `pages/Legal.vue` | 平台规则 - 星辰商行 | |
| `/:pathMatch(.*)*` | `NotFound` | `pages/NotFound.vue` | 页面未找到 - 星辰商行 | |

**导航守卫**有三个：

1. `router.beforeEach` 第一件事是 `markRouteLoading()`（顶栏那条进度条），
   然后**先确保身份就绪**（`userStore.init()`，幂等），再判断 `to.meta.requiresAuth`：
   未登录时**打开登录弹窗**并把原目标写进 `query.redirect`，然后回首页。
2. `router.afterEach` 把 `to.meta.title` 写入 `document.title`，并 `markRouteLoaded()`。
3. `router.onError` 同样 `markRouteLoaded()` —— 分包下载失败时若不收，
   进度条会一直挂在页面顶部。

> 为什么必须在守卫里等身份：受保护接口要带 token，而组件在 `onMounted` 里立刻发请求。
> 身份没就绪就发请求会 401 → 刷新失败 → 触发「登录态失效」回调 →
> 被带回首页，表现就是**深链访问任何页面都静默变成首页**（实测冷启动访问 `/tool`）。
>
> 未登录时只弹提示不打开弹窗的话，用户还得自己找到右上角的登录入口 ——
> 因此这里直接 `userStore.openLoginModal(...)`，弹窗本体挂在 `App.vue` 上（全站唯一实例）。

**滚动行为**：优先恢复 `savedPosition`；有 `hash` 时滚动到锚点
（页脚的「联系我们」→ `/about#about-contact` 依赖这条，否则锚点等于失效）；否则回到顶部。

---

## 5. 加载状态：三层各管一段

刷新时页面必须先把数据请求回来才能显示（顶栏的头像/昵称就是典型），
Vercel 上这段可能到几秒。**不能用一个全屏转圈盖住所有情况** ——
那会把「边看边加载」变成「更久的白屏」。因此按「要等多久 / 能不能先渲染」分三层：

| 层 | 覆盖什么 | 表现 | 实现 |
| --- | --- | --- | --- |
| **首屏启动遮罩** | 身份解析 + 首次路由就位（含首屏分包） | 全屏品牌动画 | `hooks/useBootScreen` + `App.vue` |
| **顶栏身份占位** | 身份**尚未**解析出来的那一瞬 | 与头像等尺寸的骨架 | `Navbar.vue` 的 `identityResolved` |
| **顶部路由进度条** | 应用内导航（懒加载分包下载） | 视口顶部 4px 细条 | `hooks/useRouteLoading` + 路由守卫 |
| **页面内局部加载** | 各页面自己的数据 | 骨架屏 / `.u-loading-block` | 各组件（见下） |

### 首屏启动遮罩的三个时间闸

`useBootScreen` 不是简单的 `v-if="booting"`，那样会有两个反向问题：加载快时闪一下白屏、
加载慢时一闪而过。因此：

| 闸 | 默认 | 解决什么 |
| --- | --- | --- |
| `delay` | 200ms | 本地开发身份初始化只要几十毫秒，遮罩一闪而过比不显示更难看。**加载快就全程不出现**，这段由顶栏的骨架顶着 |
| `minVisible` | 400ms | 一旦出现就至少留够这段时间，否则「出现→立刻消失」是反方向的闪烁 |
| `maxWait` | 8000ms | 后端挂住时 axios 要等自己的超时，不能让遮罩无限期盖住应用 |

计时器通过参数注入（`schedule` / `cancel` / `now`），因此这套时序可以在没有浏览器的情况下
用假时钟测（`test/bootScreen.test.js`）。

另外两条硬约束：遮罩挂在 `.app-container` **外面**（这样启动期间可以给应用壳加 `inert`，
Tab 键不会跑进还没就绪的界面）；遮罩 `z-index: 2500` 压在 toast（3000）**之下**，
启动期间的告警仍然看得见。

### 局部的加载态约定

- 区块级加载用共享类 `.u-loading-block` + `.u-spinner`，**不要各页面自己写间距**
- 列表/卡片用骨架屏 `.u-skeleton`（含 `--avatar` / `--card` 等变体，走 `--skeleton-*` 令牌）
- 顶栏身份占位直接复用 `.u-skeleton--avatar`（它的尺寸就是 `--avatar-size`，与真头像等宽等高，
  出现与消失都不会让顶栏跳动）
- **「暂无数据」不等于「加载中」**：数据没回来之前显示空态是**错的**，
  用户会以为站点没内容。分类区块此前就是这样（加载期间显示「暂无商品分类」），已修

### 层级顺序（改 z-index 前先看这张表）

顶栏 `100` < 回到顶部 `900` < 路由进度条 `950` < 模态框 `2000` < 启动遮罩 `2500` < toast `3000`

**导航菜单**（`constants/index.js` 的 `NAV_MENU`，被 `Navbar` 渲染）：首页、商品分类、热门推荐、工具分享、关于我们。
顶栏右侧另有：样式主题、**购物车（带角标）**、登录/注册或用户头像下拉
（个人中心 / 我的收藏 / 订单管理 / 卡密管理 / 退出登录）。

> `/other/2fa` 与 `/other/appleId` 不在顶部导航里，属于直接通过 URL 访问的工具页。

### 页面构成

| 页面 | 结构 |
| --- | --- |
| `Home.vue` | `HeroSection` + `CategoriesSection` + `HotProductsSection`；Hero 的"去逛逛"按钮滚动到分类区块 |
| `Categories.vue` | 页头 + `CategoriesSection` |
| `Hot.vue` | 页头 + `HotProductsSection` |
| `ProductDetail.vue` | 面包屑 + 「左图右信息」两栏 + 描述面板 + 同类商品推荐 |
| `CategoryDetail.vue` | 标题带（含子分类入口）+ 该分类下的商品网格。**本分类为空时退回展示子分类的商品**（规则在 `utils/categoryProducts.js`，有单测）：本分类有自己的商品时绝不混入子分类的，否则「这个分类下有什么」就没法回答了 |
| `Cart.vue` | 左条目列表（勾选 / 步进器 / 移除）+ 右吸顶结算面板（联系方式、备注、提交订单） |
| `Tool.vue` | 工具页：左侧筛选轨（**「使用方式」+「分类」两组**，≤991 单栏时分类换行，不做隐藏滚动条的横滚条）+ 工具条（搜索 + 计数）+ `ToolCard` 网格。计数只在工具条里出现一次 |
| `VideoTool.vue` | 视频下载工具的**占位页**。解析服务暂停中（候选服务是会员制接口、且文档给的地址实测 404），但工具条目已经在库里、也已标为「需要卡密激活」—— 已激活的用户点进来必然是死链。给一个说明页，比让付过费的用户撞上 404 好：404 传达的是「这站坏了」，这一页传达的是「功能还没上线」。接上服务后只换这里的组件，`tool_path` 不用改 |
| `Kami.vue` | 仅包一层 `KamiSection`（"我的卡密"表格 + "激活卡密"表单两个 tab） |
| `Profile.vue` | 左只读账号信息 / 右可编辑资料（昵称、性别、生日、头像）。头像栏是**左右两栏**：左「头像 + 说明文字」、右「上传图标按钮」—— 按钮只有 `↑` 图标，可见文字转为 `.visually-hidden` 的可访问名，因此那个 `label` 里**必须**保留一段文字，否则被它关联的 file input 就没有可访问名（`label` 上的 `aria-label` 不算 input 的名字） |
| `Favorites.vue` | 胶囊页签（商品 / 工具）+ 卡片网格，被删除的收藏保留一行并给出清理入口 |
| `Orders.vue` | 状态页签 + 订单卡片列表（缩略图、金额、取消/完成/详情）+ 分页 |
| `OrderDetail.vue` | 订单号标题带 + 明细面板 + 联系备注 + 状态时间线 + 动作行 |
| `Legal.vue` | 左目录吸顶 + 右正文；三份文档共用一个组件，由 `meta.legalKey` 选内容 |
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
| `isLoggedIn` | 是否已登录（`user_type === 'registered'`；游客也有 token，但不算登录） |
| `isGuest` / `userId` | 是否游客 / 当前用户 id |
| **`hasIdentity`**（顶栏的本地 computed，非 store 成员） | **是否有身份（游客也算）**，取 `Boolean(userId)`。顶栏据此二选一：有身份 → 头像 + 用户面板；无身份 → 「登录 / 注册」按钮。它与 `isLoggedIn` 是**两个不同的问题**，混用会让游客既看不到自己的头像、也找不到退出入口（这正是改造前的状态） |
| `userInfo` | 当前用户信息（来自 `GET /userApi/getUserInfo`） |
| `loginModalOpen` | 登录/注册弹窗开关。**放 store 是因为拉起登录的入口不止顶栏一个** —— 下单、加购、收藏、路由守卫都要能拉起它；弹窗本体因此在 `App.vue` |
| `init()` | 身份初始化：本地有双 token 就拉用户信息，否则调 `POST /user/visitorLogin`。并发调用共享同一个 Promise |
| `getUserInfo()` | 拉取并合并到 `userInfo` |
| `login(payload)` / `register(payload)` | 账号登录 / 注册，返回 `{ success, message }`。`payload.rememberMe` 是纯客户端偏好，会被解构掉、不发给服务端 |
| `updateProfile(patch)` | 修改昵称/头像/性别/生日，成功后把回读结果并入 `userInfo` |
| `uploadAvatar(image)` | 上传头像（data URL），成功后把服务端回写的相对路径并入 `userInfo` |
| `avatarUrl` (getter) | **可直接放进 `<img src>`** 的头像地址。`avatar_url` 可能是外部 URL，也可能是后端托管的 `/uploads/...` 相对路径 —— 后者经 `resolveAssetUrl` 补上 API 基地址（否则生产环境会打到 web 域名上 404） |
| `openLoginModal(reason)` / `closeLoginModal()` | 打开（可带一句提示）/ 关闭登录弹窗 |
| `logout()` | 清空凭据与身份，进入**无身份**状态（顶栏显示登录按钮）。**刻意不再重新以游客身份初始化** —— 那会立刻拿到一个新游客，用户点「退出」后看到的还是一张头像，永远等不到登录按钮。两个必须留意的点：`initialized` 保持 `true`（置回 `false` 会让路由守卫在下一次导航时重新 init 出游客），`initPromise` 清空（让「退出后主动登录」能再初始化） |

> **退出之后会怎样**：进入无身份状态后，公开页面（首页 / 分类 / 热门 / 关于 / 法务）照常可用；
> 需要身份的两处会给出登录引导而不是报错 —— 工具页与共享 Apple ID 页的列表都来自 JWT 保护的
> `/toolApi/*`，无身份时不发请求，直接显示「登录后即可查看」。
>
> **刷新页面会重新分配一个游客身份**：游客是这个应用对「没有任何 token 的访客」的默认处理
> （否则 `/toolApi` 这类只读接口无法工作）。也就是说「退出游客」在**当前这次页面会话内**有效，
> 刷新会回到默认的游客态。要让它跨刷新保留，需要额外持久化一个「已主动退出」标记，
> 那会牺牲新访客的开箱体验，因此没有做。

### `shop.js` — `useShopStore`

| 成员 | 说明 |
| --- | --- |
| `shopClass` | 商品分类树 |
| `shopInfo` | 商品列表（`getProducts` 默认拉 `limit: 100`） |
| `searchKeyword` | 商品搜索关键词（顶栏搜索图标展开后写入） |
| `filteredProducts` | **getter**：按 `searchKeyword` 过滤后的商品列表。匹配规则只此一处 |
| `pagination` | 分页信息 |
| `setSearchKeyword(kw)` | 写入搜索关键词（空串表示不过滤） |
| `getCategories()` | 以 `{ tree: true }` 调 `/class/getCategories` |
| `getProducts(extra)` | 以 `{ in_stock: 'all', limit: 100 }` 调 `/shop/getProducts` |
| `init()` | 并行调用上面两个，并在 `finally` 里收尾 `loading` |

> **搜索为什么仍在客户端**：`filteredProducts` 是搜索栏与商品网格共用的唯一匹配规则，
> 改成服务端搜索意味着两处都要变成异步、且要各自处理 loading 与竞态。
> 折中做法是把 `limit` 提到服务端上限（100），超过 100 件商品时首页只展示前 100 条，
> 完整目录走分类详情页（那里按 `category_id` 过滤）。

### `cart.js` — `useCartStore`

| 成员 | 说明 |
| --- | --- |
| `items` / `totalQuantity` / `totalAmount` | 购物车行与汇总（**全部来自服务端**） |
| `availableCount` / `unavailableCount` / `hasUnavailable` | 可下单与不可下单的计数 |
| `availableItems` / `count` / `isEmpty` | 结算用、角标用、空态用的派生值 |
| `fetch({silent})` | 拉购物车。`silent` 时不进入 loading（首屏角标刷新用） |
| `add(productId, quantity)` / `updateQuantity(id, q)` / `remove(id)` / `clear()` | 四个写操作 |
| `reset()` | 清空本地状态（切换账号时调用） |

三条刻意的约定：

1. **不做本地乐观更新**。每个写接口都返回整份购物车，store 直接把响应覆盖到 state ——
   前端再算一遍金额就等于有两套逻辑，迟早对不上。
2. **需要登录账号**。游客请求会拿到 403 `REGISTERED_ACCOUNT_REQUIRED`，
   action 把它翻译成 `{ needLogin: true }` 交给调用方弹登录弹窗，
   而不是把 403 当普通错误弹一个「操作失败」。
3. **action 不抛异常**，统一返回 `{ success, message, needLogin }`。

### `favorite.js` — `useFavoriteStore`

| 成员 | 说明 |
| --- | --- |
| `productIds` / `toolIds` | 已收藏的 id（渲染星标用） |
| `productItems` / `toolItems` | 收藏详情（「我的收藏」页用，服务端已补齐 `target`） |
| `isProductFavorited(id)` / `isToolFavorited(id)` | 判断（id 兼容数字与字符串） |
| `load(force)` | 从**正确的来源**加载；用 `loadedForUserId` 记住这份数据属于谁 |
| `toggle(type, id)` / `toggleProduct(id)` / `toggleTool(id)` | 收藏 / 取消收藏 |
| `reset()` | 清空（切换账号时调用） |

**为什么工具收藏有两套存储**：改造前工具收藏**只有** localStorage（游客也能用），
商品收藏则完全不存在。现在登录用户的收藏统一放到服务端（跨设备一致、换浏览器不丢），
但**保留游客态的 localStorage 兜底**（沿用原 key `SSTC_TOOL_FAVORITES`，老数据不丢）——
直接砍掉会让游客点星星时突然被要求登录，那是功能退化而不是完善。
游客收藏**商品**时返回 `{ needLogin: true }`。

`loadedForUserId` 用 `user:<id>` / `guest` 作为键：同一用户重复进页面直接返回，
切换账号时自动重载 —— 否则会把上一个账号的收藏显示给新账号。

### `tool.js` — `useToolStore`

| 成员 | 说明 |
| --- | --- |
| `toolData` | 工具数据。`fetchTools()` 会把接口返回的 `data` 与 `classifyToolsByClass()` 的结果合并进去，因此实际含 `tools` / `pagination` / `filters` / `classified` / `classes` |
| `toolMeta` | 接口 `meta`（仅写入，未被读取） |
| `activeCategory` | 当前选中分类，默认 `'all'`。除了真实 class（`dev`/`video`…）与 `all`，还接受两个**伪分类** `__card__`（需要卡密激活）与 `__free__`（免费工具）—— 见 `pages/Tool.vue` 的说明 |
| `appleIds` | 共享 Apple ID 数据，实际是 `{ nanoCloud, fangQiangNan }` 对象 |
| `validToolIds` | 当前用户**有效**的工具授权 id 数组。`null` = 不知道（未登录 / 查询失败），`[]` = 确定没有授权。两者对界面含义不同，不要合并 |
| `fetchTools()` / `fetchAppleIds()` / `setActiveCategory()` / `init()` | 见 server README 的 `/toolApi` 接口说明 |
| `fetchEntitlements()` | 拉 `/kamiApi/myEntitlements`。**失败时保留 `null`**：若写成 `[]`，一个已付费但查询失败的用户会被引导回激活页 |
| `clearEntitlements()` | 退出登录时清空，避免同一标签页换账号后沿用上一个人的授权 |

### 工具页的「使用方式」两个分类

工具页左轨分两组，是**两根独立的轴**：

| 组 | 回答的问题 | 取值 |
| --- | --- | --- |
| 使用方式 | **要不要卡密** | `__card__`（需要卡密激活）/ `__free__`（免费工具） |
| 分类 | 工具的**主题** | `all` / `dev` / `image` / `video` / `outher` |

两根轴不叠加：轨本身是单选的（同一个 `activeCategory`），
所以不会出现「视频 + 免费」这种组合态，也**不需要第二套筛选状态**。
实现上关键是分类过滤必须写成 `else if` —— 写成独立 `if` 的话，
选「需要卡密」时还会再按 `class` 过滤一遍，得到空列表。

需要卡密的工具由后端 `tools.requires_card` 标记（不是前端写死 id）。
卡片按三态呈现：

| 状态 | 标注 | 按钮 |
| --- | --- | --- |
| 不需要卡密 | 无 | 打开工具 |
| 需要卡密、未激活 | 「需卡密激活」+ 一句提醒 | **立即激活** → `/user/kami?tool_id=<id>` |
| 需要卡密、已激活 | 「已激活」 | 打开工具 |

**已激活**的判定要同时满足三件事，缺一不可（`pages/Tool.vue` 的 `hasEntitlement`）：

1. `tool.requires_card` 为真 —— 免费工具不存在「激活」，永远算可用
2. 有身份（`userStore.userId`）—— 退出登录后不能沿用上一个账号留下的授权
3. 授权**已查到** —— 查询失败时按未激活呈现。此时按钮指向激活页，
   用户点进去能自助解决；反过来若把失败当成「已激活」，用户会看到一个点不动的按钮

第 3 条是 `stores/tool.js` 里 `validToolIds` 用 `null`（不知道）而不是 `[]`（确定没有）
的原因 —— 两者对界面含义不同。换账号时由 `pages/Tool.vue` 的 `watch(userStore.userId)`
重取（清除或重新拉取），因此不需要在 logout 里反向调用 tool store。

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
| `Navbar.vue` | 固定顶栏：品牌、`NAV_MENU` 导航、**收成图标的搜索**（点击展开并聚焦；**展开前后放大镜位置不变**：浮层右缘固定、向左生长，放大镜是浮层最后一个子元素。收起态与展开态**共用同一套令牌、只有宽度变**，否则点击时盒子会在四套主题里明显长大变方）、`ThemeSwitcher`、登录/注册按钮或用户头像下拉、移动端汉堡 + 抽屉。毛玻璃写在 `.navbar::before` 上 —— 写在 `.navbar` 上会让 `backdrop-filter` 成为 fixed 后代的包含块，弹窗会被"钉"进导航栏 |
| `SearchBar.vue` | 受控搜索栏（`v-model` + `@submit`），并通过 `defineExpose` 暴露 `focus()` / `blur()` —— 顶栏点搜索图标要能把光标直接送进来。本身不碰 store，过滤规则属于数据层（`shopStore.filteredProducts`） |
| `ThemeSwitcher.vue` | 导航栏右侧的图标按钮 + 样式切换弹窗：五套风格整体切换，或按字号/密度/圆角/强调色/字体族/背景图逐项微调。新增可调项只需在 `theme/presets.js` 的 `CUSTOM_FIELDS` 加一条 |
| `Footer.vue` | 页脚：品牌、简介、社交链接、支付方式、版权与法务链接，文案取自 `constants/content.js` 的 `FOOTER` / `SITE` |
| `LoginModal.vue` | 登录/注册弹窗。登录支持用户名/邮箱/手机号自动判别 `login_type`；注册成功后自动切回登录页签。「忘记密码」与新窗口「微信/QQ 登录」都指向 `HelpModal`（如实说明第三方登录尚未接入）。模态约定见下 |
| `HelpModal.vue` | 通用「说明 + 联系方式」弹窗：标题、引导段、编号步骤、可点的 `tel:`/`mailto:` 联系方式。联系方式取自 `constants/CONTACT`，与页脚、关于我们共用一份 |
| `SectionHeader.vue` | **区块头**（icon + title + description）。样式定义在 `global.css` 的 `.section-header` 系列，供各 Section 组件复用 |
| ~~`PageHeader.vue`~~ | **已删除**（第三轮）。除主页外的页面不再套同一个页头，各自设计开场 —— 见 §9.9 |

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

约定**只有一个实现**：`hooks/useModalA11y/index.js`。
`LoginModal`、`ThemeSwitcher`、`HelpModal` 三处都用它，不再各写一份。

| 约定 | 实现位置 |
| --- | --- |
| `role="dialog"` + `aria-modal="true"` + `aria-labelledby` 指向一个 `.visually-hidden` 标题 | 组件模板 |
| **Escape 关闭**：监听挂在 `document` 上（只挂容器不可靠，焦点可能不在其中） | `useModalA11y` |
| **焦点陷阱**：`Tab` / `Shift+Tab` 在弹窗内循环 | `useModalA11y` |
| **焦点归还**：打开前记录 `document.activeElement`，关闭时归还 | `useModalA11y` |
| **滚动锁定**：`useBodyScroll`（引用计数），关闭自动恢复 | `useModalA11y` |

两种用法：

```js
// 挂载即打开（LoginModal / HelpModal）
const { modalRef } = useModalA11y({ close: () => emit('close') })

// 常驻组件 + 由状态开关（ThemeSwitcher）
const { modalRef, activate, deactivate } = useModalA11y({ close, auto: false, initialFocus: '.theme-close' })
watch(() => store.panelOpen, (open) => (open ? activate() : deactivate()))
```

> **嵌套弹窗必须是兄弟节点，不能是子节点。** `.u-modal-overlay` 上有 `backdrop-filter`，
> 而 `backdrop-filter` 会让元素成为 `fixed` 后代的包含块（与 Navbar 踩过的坑同源）——
> 嵌在里面的弹窗会以遮罩层的 padding box 为参照定位，并在遮罩层滚动时跟着滚。
> `LoginModal` 因此用**两个根节点**（遮罩层 + `HelpModal`）。

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
| `user.js` | `visitorLogin`、`login`、`register` | `POST /user/visitorLogin`、`/user/login`、`/user/register` |
| `userApi.js` | `getUserInfo`、`updateProfile(patch)`、`uploadAvatar({image})` | `GET /userApi/getUserInfo`、`PUT /userApi/profile`、`POST /userApi/avatar` |
| `shop.js` | `getCategories(params)`、`getProducts(params)`、`getProduct(id)` | `/class/getCategories`、`/shop/getProducts`、`/shop/getProduct/:id` |
| `toolApi.js` | `getTools`、`getToolClasses`、`getTool`、`getAppleIds` | `/toolApi/*` |
| `kami.js` | `getUserCards(user_id, params)`、**`getMyEntitlements()`**、`activateCard(data)`、`verifyCard(data)`、`verifyCards(data)` | `/kamiApi/*` |
| `cart.js` | `getCart`、`addItem`、`updateItem`、`removeItem`、`clearCart` | `/cartApi/*` |
| `order.js` | `createOrder`、`getOrders`、`getOrder(orderNo)`、`cancelOrder`、`completeOrder` | `/orderApi/*` |
| `favorite.js` | `getFavorites({target_type})`、`addFavorite`、`removeFavorite` | `/favoriteApi/*` |

> `getMyEntitlements()` 与 `getUserCards()` 回答的是**两个不同问题**：
> 后者是「我兑换过哪些卡」，前者是「我现在能不能用这件工具」。
> 一张卡兑换过、授权已过期时，卡列表里仍有它，工具却已经不能用 ——
> 工具页因此读前者，不读卡列表。
>
> `/uploadApi/image`（通用图片上传）目前**前端还没有调用方** ——
> 头像是走 `uploadAvatar` 的 base64 路径。这个接口是给后续需要传图的场景准备的。

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
| `useModalA11y` | `modalRef` / `activate` / `deactivate` / `handleKeydown` | 模态无障碍的**唯一实现**（Escape / 焦点陷阱 / 焦点归还 / 滚动锁定）。`auto: false` 用于常驻组件，`initialFocus` 支持选择器/元素/函数 |
| `useAvatarUpload` | `preview` / `previewSize` / `sourceName` / `preparing` / `prepare(file)` / `reset()` | 头像上传的前端流程：校验 → 解码 → **canvas 缩到 256px** → 编码 data URL。纯逻辑部分在 `utils/avatarFile.js`，因此可单测 |
| `useProductActions` | `goDetail` / `addToCart` / `buyNow` / `requireLogin` | 商品的三个动作。未登录时拉起登录弹窗；下单成功后跳到订单详情。**不抛异常**，返回 `{ success, needLogin?, message? }` |
| `useOpenTool` | `openTool(tool)` | 打开外部工具：地址校验、弹窗被拦截的提示、复用已开窗口（同一工具点两次不会开出两个标签页） |
| `useClass` | `classifyToolsByClass(tools, options)` | 按 `class` 字段把工具数组分组，返回 `{ classified, classes }`。`classes` 内含一个合成的 `all` 分类 |
| `useBootScreen` | `visible` / `start()` / `finish()` | 首屏遮罩的三个时间闸（延迟出现 / 最短停留 / 最长等待），计时器可注入以便用假时钟测 |
| `useRouteLoading` | `loading`（只读） / `markRouteLoading()` / `markRouteLoaded()` | 路由是否在切换（顶部进度条）。用开关而不是计数器：重定向会再触发一次 `beforeEach`，计数器会漂移 |
| `useEmoji` | `getEmojiGradient` 等 | emoji → `linear-gradient(...)`。内含约 200 条 emoji 映射表 |
| `useSimpleTimeFormatter` | `toDate` / `formatISOTime` / `parseISOTime` / `getFriendlyTime` 等 | 基于 dayjs + `utc`/`timezone` 插件的时间格式化，默认时区 `Asia/Shanghai` |
| `useToast` | `notify.success/warning/error/info` | 提示框门面，供组件内外统一调用（路由守卫与 store action 也用它） |
| `useKamiDisplay` | `getStatusText` / `getStatusColor` / `formatCardDate` / `resolveToolName` / `toToolOptions` / `STATUS_FILTER_OPTIONS` / `KAMI_TABLE_COLUMNS` | 卡密展示层**纯函数**。状态文案与配色用 `lookupOr` 查表以避开原型链；工具 id 兼容数字与字符串 |
| `useKamiActivation` | `activateCode` / `selectedToolId` / `activationResult` / `activating` / `activate()` / `resetForm()` / `clearResult()` | 卡密激活流程的状态与提交逻辑，依赖注入 `activateCard` / `getUserId` / `onActivated` |

> `useKamiActivation` 有一条与其他 hook 不同的约定：**激活成功后若列表刷新失败，
> 仍报告成功**（文案附「请手动刷新」）。因为卡密在服务端已经生效，
> 报失败会诱导用户重复激活。

## 9. 样式体系

全站支持**五套可切换的设计风格**，且每套风格从「风格语言」（颜色/字体/阴影/动效）
到「组件尺寸」（输入框高度、按钮圆角、卡片宽度、模态框宽度……）都完全由设计令牌驱动。
令牌清单与用法见 [`src/assets/README.md`](src/assets/README.md)。

### 9.1 五套风格

| id | 名称 | 底色 | 强调色 | 风格语言 |
| --- | --- | --- | --- | --- |
| `tech-minimal`（默认） | Tech Minimal 暗色科技极简 | `#0a0a0a` | `#3b82f6` | 无阴影、1px 边框分层；标题 Inter；价格 JetBrains Mono（小数小一号）；入场 translateY 12px，60ms 递增 |
| `liquid-glass` | Liquid Glass Commerce 液态玻璃·电商 | 紫粉渐变网格 | `#6366f1` | 半透明面板 + `blur(16px) saturate(180%)`（悬停与聚焦提到 24px）；入场 scale 0.96 带弹性；背景网格 20s 流动 |
| `bento-editorial` | Bento Editorial 便当盒编辑风 | `#f7f7f5` | `#d62872` | 边框驱动而非阴影驱动；大卡片标题 Playfair Display；价格 Oxygen 且无小数 |
| `neo-brutalism` | Neo-Brutalism Accent 新粗野主义·点缀 | `#ffffff` | `#ff6b35` | 2px 纯黑描边 + 零模糊硬阴影；主按钮 `6px 6px 0 #000`、悬停 `translate(3px,3px)`、`0.1s linear`；卡片硬投影 `4px→8px`；标题压缩大写 |
| `technical-monochrome` | Technical Monochrome 技术单色·等宽 | `#0d0d0d` | `#22c55e` | 等宽字体贯穿所有层级；4-6px 小圆角；价格 `$` 前缀 + `#141414` 底色、无小数；悬停只换边框色（卡片描边转绿） |

> **尺寸不参与风格区分。** 上表只描述颜色 / 字体 / 圆角 / 阴影 / 动效这些不改变盒子几何的差异；
> 组件的高宽与间距五套完全相同，见 9.2。

### 9.2 尺寸统一（切主题不改变几何）

**组件尺寸不再逐主题取值。** 凡是会改变盒子几何的量 —— 高 / 宽 / 内边距 / 间距 /
字号 / 行高 / 密度基准 / 控件与轨道尺寸 —— 五套取值**完全相同**，统一以默认主题
`tech-minimal` 为基准：

```
组件              五套统一值
输入框高度         40px
主按钮高度         40px
图标按钮           40×40
卡片宽度           280px（大卡同宽）
卡片内边距         20px
卡片图片高度       200px
卡片间距           16px
价格字号           20px
提示框宽度         360px
模态框宽度         480px
下拉选项高度       36px
标签高度           22px
导航高度           64px
分页按钮           36×36
进度条高度         4px
复选框             18px
间距单位           8px
正文行高           1.5
移动缩放系数       0.85
```

这样切换主题时布局不跳动，用户不会觉得「窗口变大或变小」。
真机实测（1440 宽、同一份数据、逐套重载 `/home`）：整页高 **3761 ± 14px（0.37%）**，
导航栏 64px 五套一致，页脚 428px；glass 与 mono 与默认主题**逐像素相同**。
残留的十几像素只来自两个允许的来源：**字体族不同导致的文本换行差异**，
以及 **neo 的 2px 描边**（它比其余四套粗 1px，是风格签名）。

**按风格保留逐主题的是**（都不改变盒子几何）：颜色、字体族、字重/字距/大小写、
圆角、阴影、滤镜、过渡与入场动效，以及描边粗细（1–2px）。

```
组件             TechMin  LiquidGlass  Bento   NeoBrutal  TechMono
输入框圆角        12px     9999px       24px    8px        6px
主按钮圆角        8px      14px         10px    0px        6px
卡片圆角          12px     20px         16px    12px       4px
卡片图片圆角      8px      16px         12px    8px        4px
下拉面板圆角      12px     16px         12px    0px        4px
复选框圆角        4px      6px          4px     0px        2px
提示框圆角        6px      10px         8px     0px        4px
描边粗细          1px      1px          1px     2px        1px
```

完整取值在 `src/theme/presets.js`（几何类集中在一个 `尺寸统一组` 注释块下的 `SHARED`，
风格类留在逐主题 `MATRIX`）。两条守卫在 `test/themeContract.test.js`：

1. **组件尺寸在五套主题下完全一致** —— 逐格断言上表的统一值；
2. **全部几何令牌在五套主题下一致** —— 扫全部 415 个令牌兜底，判据里的 `--fs-`
   与 `--leading-` 不可省（它们不含 height/width/size 任何词根，漏了就会静默漂移）。

新增令牌时若它改变几何，却没有放进统一组，第 2 条会直接失败。

移动端缩放统一在 `global.css` 末尾的三个媒体查询里用 `--mobile-*` 系数实现：
控件高度 ×0.9、内边距 ×0.8、区块间距 ×0.6、标题字号 ×0.7、正文字号 ×0.95、圆角保持不变。
（**注意**：主题在 `app.mount()` 之前就把令牌写成 `<html>` 的行内样式，行内样式优先于
`:root`，所以**不能在 `@media` 里重定义令牌** —— 移动端缩放必须在每个使用点写成
`calc(var(--x) * var(--mobile-*-scale))`。）

### 9.3 令牌的三层结构

| 层 | 文件 | 职责 |
| --- | --- | --- |
| 名册与兜底 | `assets/styles/variables.css` | 令牌**名** + 默认主题的值；JS 执行前的首屏兜底 |
| 取值 | `src/theme/presets.js` | 五套风格的完整取值（唯一数值来源）。分两块：`SHARED` = 五套同值（含几何统一组），`MATRIX` = 一行令牌 × 五列取值的逐主题差异（只剩风格类） |
| 合成与应用 | `src/theme/compose.js` + `src/stores/theme.js` | 叠加「单项自定义」并把结果写到 `:root` |

`main.js` 在 `app.mount()` **之前**调用 `useThemeStore(pinia).init()`，
把令牌同步写到 `<html>` 的行内样式上 —— 放到 `onMounted` 会让用户先看到默认主题闪一下。

### 9.4 切换与单项自定义

导航栏右侧的 🎨 图标按钮打开弹窗（`ThemeSwitcher.vue`），两个页签：

- **整体风格**：五套风格整体切换（含色板预览、当前项标记）。
- **单项修改**：全局字号 / 间距与控件密度 / 圆角缩放 / 强调色 / 字体族 / 页面背景图与不透明度。
  强调色会**自动派生**悬停色（压暗 18%）、柔和底色、按钮悬停底色与「强调色之上的文字色」
  （按相对亮度决定黑或白），因此换个品牌色不会出现看不清的按钮文字。

控件由 `theme/presets.js` 的 `CUSTOM_FIELDS` 数据驱动渲染 ——
**新增一个可调项只需加一条描述，不用改组件模板**。选择保存在
`localStorage` 的 `SSTC_THEME_PREF`，刷新后保留。

### 9.5 与数据层的联动

风格会改变价格的表现形式，因此货币与小数位属于**数据层**而不是模板：

- `theme/presets.js` 每套主题声明 `price: { prefix, decimals }`
  （tech/glass 是 `¥` 两位小数，bento/neo 是 `¥` 无小数，mono 是 `$` 无小数）；
- `useThemeStore()` 暴露 `pricePrefix` / `priceDecimals`；
- `formatUtils.splitPrice(price, currency)` 把价格拆成
  `{ prefix, integer, decimals, text }`，**模板据此对小数部分单独设字号**（规范：小数小一号）；
  `formatPrice` 仍在，返回拼好的整串，默认行为与旧版一致；
- `ProductCard.vue` 从 store 取货币再拆分渲染，模板里不写货币符号；
  划线原价与折扣标签直接消费后端已返回的 `original_price` / `has_discount` / `discount_percent`
  （见 server `router/products.js`），不在前端重算折扣。

同理，商品搜索的匹配规则放在 `shopStore` 的 `filteredProducts` getter 里，
导航栏搜索栏与商品网格共用同一份规则。

### 9.6 共享组件类

组件规范表的落地点是 `global.css` 里的一批共享类，组件只负责布局：

| 组件 | 类 |
| --- | --- |
| 按钮 | `.u-btn-primary` / `.u-btn-secondary` / `.u-icon-btn` |
| 输入框/搜索框 | `.u-input` / `.u-search` / `.u-search-icon` |
| 表单字段 | `.u-field` / `.u-field-label` / `.u-field-hint` / `.u-field-error` / `.u-field-value`（只读值用等宽字体，与可编辑输入框区分） |
| 卡片 | `.ui-card` / `.ui-card--lg` / `.ui-card-media` / `.ui-card-body` / `.ui-card-title` / `.ui-card-sub` |
| 价格 | `.u-price` / `.u-price-decimals` / `.u-price-original` / `.u-discount` |
| 标签 | `.u-tag` + `--accent/--success/--warning/--danger/--info` |
| 提示框 | `.u-toast-host` / `.u-toast` / `.u-toast--*` |
| 模态框 | `.u-modal-overlay` / `.u-modal` / `.u-modal-title/body/foot/close` |
| 下拉 | `.u-dropdown` / `.u-dropdown-item(--active)` / `.u-dropdown-divider` |
| 进度与加载 | `.u-progress(-bar)` / `.u-spinner(-sm/-lg)` / `.u-loading-block` / `.u-skeleton` |
| 头像与复选框 | `.u-avatar` / `.u-checkbox` / `.u-checkbox-box` |
| 事务页外壳 | `.page-shell` / `.page-shell-head(--row)` / `.page-shell-eyebrow/title/title-link/desc` |
| 事务页面板 | `.page-panel(-head)` / `.page-note(--warning/--error)` / `.page-empty(-title/-hint)` / `.page-actions` |

> **事务页外壳为什么可以共享，而 `.page-header` 当年必须删掉**：
> `.page-header` 被删是因为**营销页**（分类索引 / 榜单 / 工作台 / 目录 / 编辑式双栏）
> 各有自己的开场节奏，套同一个居中页头等于「一个模板换文案」。
> 而购物车、订单、收藏、个人中心、法务与两个详情页属于**另一族**：
> 信息密集型事务页 —— 窄标题带 + 单列内容 + 明确的动作区，版式本就应当一致。
> 把这族的外壳收成一套共享类，好过在 8 个页面里各抄一遍（约 320 行相同 CSS）。

命名迁移（旧 → 新）：`.u-cta` → `.u-btn-primary`、`.u-btn` → `.u-btn-secondary`、
`.u-chip` → `.u-tag`；`.u-cta--lg` 已删除（规范没有「大按钮」这一档）。

动效全部由令牌参数化：`enterUp` 关键帧的起点取自 `--enter-shift` / `--enter-scale`，
延迟步长取自 `--stagger-step`，装饰性浮动由 `--decor-animation` 开关。
`.scroll-reveal` 用 scroll-driven animation（`animation-timeline: view()`），
**包在 `@supports` 内**，不支持的浏览器内容保持可见。
`variables.css` 末尾有 `prefers-reduced-motion: reduce` 的全局降级。

### 9.7 提示框为什么不用 antd 的 message

规范要求提示框「右上角固定、距顶/距右 24px、堆叠间距 12px、3000ms 自动消失、悬停暂停」，
并给出五套风格的宽度/内边距/圆角/阴影/图标尺寸。antd 的 `message` 只能顶部居中、
样式由它自己的样式表固定、完全不消费本项目的令牌（五套风格下长得一模一样）。

因此改为自建：`stores/toast.js`（队列、计时、悬停暂停）+ `components/ToastHost.vue`
（唯一渲染出口，挂在 `App.vue` 根部）+ `hooks/useToast/index.js`
（`notify.success/warning/error/info` 门面，供组件内外统一调用，路由守卫与 store action 也用它）。

### 9.9 页面版式（第三轮）

除主页（其「页头」就是 Hero）外，**不再有统一的页头组件**：`PageHeader.vue` 与
`.page-header` 样式已删除，每个页面按自己的信息结构设计开场，文案仍集中在
`constants/content.js` 的 `PAGES`（字段 `eyebrow / title / description`）。

| 页面 | 版式 | 开场 |
| --- | --- | --- |
| 主页 `/home` | Hero + 分类卡片网格 + 商品网格 | Hero（眉标 + 大字标题 + 双 CTA + 特性行 + 视觉面板） |
| 商品分类 `/categories` | **索引**：行式索引面板（序号 + 图标 + 名称 + 说明 + 浏览），`CategoriesSection` 的 `variant="index"` | 竖排：眉标 + 大字标题 + 说明 + 分类数 |
| 热门推荐 `/hot` | **榜单**：标题带 + 带序号的商品网格，`HotProductsSection` 的 `variant="board"` | 横向标题带（左标题 / 右计数） |
| 商品详情 `/product/:id` | **事务页**：面包屑 + 左图右信息两栏 + 描述面板 + 同类商品 | `.page-shell-head`（眉标 + 大字标题） |
| 分类商品 `/category/:id` | **事务页**：标题带（含子分类入口）+ 商品网格 | `.page-shell-head--row` |
| 购物车 `/cart` | **事务页**：左条目列表 + 右吸顶结算面板 | `.page-shell-head--row`（右侧件数标签） |
| 工具分享 `/tool` | **工作台**：左侧筛选轨（分类 + 计数 + 已收藏）吸顶 + 右侧工具条与网格 | 左对齐：眉标 + 大字标题 + 说明 + 工具数 |
| 卡密管理 `/user/kami` | **控制台**：左激活面板（吸顶）+ 右卡密表格与分页 | 眉标 + 大字标题 + 说明 + 卡密总数 |
| 个人中心 `/user/profile` | **事务页**：左只读账号信息 / 右可编辑资料 | `.page-shell-head--row` |
| 我的收藏 `/user/favorites` | **事务页**：胶囊页签 + 卡片网格 | `.page-shell-head--row` |
| 订单管理 `/user/orders` | **事务页**：状态页签 + 订单卡片列表 + 分页 | `.page-shell-head--row` |
| 订单详情 `/user/orders/:orderNo` | **事务页**：订单号标题带 + 明细 / 备注 / 状态时间线三个面板 | 标题带带等宽订单号 |
| 用户协议 / 隐私政策 / 平台规则 | **事务页 · 编辑式双栏**：左目录吸顶 + 右条款正文 | 眉标 + 标题 + 最后更新日期 |
| 共享苹果 ID `/other/appleId` | **目录**：左线路轨（使用说明折叠 + 线路锚点）+ 右账号目录 | 眉标 + 大字标题 + 说明 + 双线路计数 |
| 关于我们 `/about` | **编辑式双栏**：左侧目录吸顶 + 右侧正文（编号价值列表 + 标签值对照表） | 左栏：眉标 + 大字标题 + 说明 + 页内锚点 |
| 2FA `/other/2fa` | **终端面板**：窗口标题栏（三个圆点 + 等宽标题）+ 输入区 + 读数区 + 进度条；教程区在面板下方做键值对照 | 面板标题栏 |
| 404 | **大号数字**：`404` 作为视觉主体（`calc(var(--fs-display) * 2.5)`）+ 右侧说明与行式建议链接 | 大号数字 |

**装订线只有一条**：`--container-max`。原先 1320 与 1280 并存，会让导航栏的
Logo 左边缘对不上下方的卡片与表格 —— 这是导航栏「排版有问题」的根因之一，
`--container-content` 已删除。

带吸顶侧栏的页面统一用 `top: calc(var(--navbar-height) + var(--space-unit) * 2)`
让出粘性顶栏的高度（`≤767px` 时顶栏是 `var(--navbar-height) * var(--mobile-nav-scale)`）。

### 9.10 导航栏排版修复（第三轮）

| 问题 | 根因 | 修法 |
| --- | --- | --- |
| Logo 与下方内容左右错位 20px | 导航用 `--container-max`(1320)，商品/工具/卡密区块用 `--container-content`(1280) | 令牌层只留 `--container-max`，全站一条装订线 |
| 导航链接会压到搜索栏上 | `.navbar-menu` 曾是 `flex: 1`（basis 0）+ `min-width: 0`，而 `.menu-list` 不换行 → 宽度不足时菜单盒被压到 0，链接溢出 | 菜单改 `flex: none` 不参与伸缩；`≤1199` 再收一档密度 |
| 导航项与操作区之间是一个大空洞 | 菜单 `flex: 1` 吃掉了全部剩余空间 | 曾把搜索栏改成可伸缩来填满空洞。**后来搜索收成了一个图标（浮层展开，不参与布局）**，空洞由 `navbar-actions` 的 `margin-left: auto` 解决 |
| 展开 320px 的搜索框会把顶栏顶出屏幕 | 搜索框若参与文档流，1024px 与手机上 Logo + 菜单 + 五组图标的总宽会超视口 | 展开态改为**绝对定位浮层**（`right: 0` + 宽度 `min(输入框高度 × 8, 100vw - 边距)`），相邻元素不再被推挤 |
| 底边那一像素没有背景/模糊 | `::before` 的 `inset: 0` 只覆盖 padding box，边框区域露出页面内容 | 边框移到 `::before` 上，背景 + 模糊 + 边框同层铺满整高 |
| 菜单项可点区域只有约 21px | `.menu-link` 是 `padding: 4px 0` | 改为整条通高（tab 式），下划线落在导航栏底边上 |

### 9.11 组件套件（第四轮：第三批规范 21 节）

第二批只做到「组件尺寸」，这批是完整的交互组件：**19 个族、212 个新令牌**，
拆成四个分片文件（按族划分，不按页面）：

| 文件 | 覆盖 |
| --- | --- |
| `ui-kit-form.css` | §1 下拉/选择器、§2 复选框、§3 单选框、§4 开关、§5 滑块 |
| `ui-kit-nav.css` | §6 步骤条、§7 手风琴、§8 选项卡、§9 面包屑 |
| `ui-kit-data.css` | §10 表格、§11 日期选择器、§12 文件上传、§13 评分 |
| `ui-kit-feedback.css` | §14 气泡、§15 抽屉、§16 骨架、§17 空态、§18 徽标、§19 滚动条、§21 通用状态 |

`main.js` 的引入顺序是 **variables → global → 四个分片**：分片要覆盖基础层的旧实现
（骨架屏动画、滚动条、`.u-field-error` 三处已从 `global.css` 删除）。

**先做减法再落地**。规范里大量取值与第二批逐值相同，能复用就不新增：

- §1 下拉触发器那张 8 行表**只产出 2 个新令牌**（箭头尺寸与颜色）——
  高度/内边距/圆角/字号/描边分别与 `--input-height` / `--input-padding-*` /
  `--radius-input` / `--input-font-size` / `--stroke-*` 逐值相同。好处是下拉框与相邻
  输入框**天然对齐**，不需要 `calc()` 凑。
- `--dropdown-shadow` **没有登记**：§1 的面板阴影五套取值与既有的 `--shadow-float` 逐值相同
  （tech `0 8px 24px rgba(0,0,0,.4)` / glass `0 8px 32px rgba(99,102,241,.12)` /
  bento `0 4px 16px rgba(0,0,0,.08)` / neo `6px 6px 0 #000000` / mono `none`），
  于是共用，并在 `themeContract.test.js` 留了一条**反向断言**防止日后又拆开。

**死令牌白名单**（`test/kitAllowlist.js`）：`designTokens.test.js` 原本要求「已登记的必须有人用」，
而这批组件里有一部分的使用页面还没写。白名单四条规则 —— 未登记引用失败；已登记无人用且不在白名单失败；
在白名单允许但必须写明 `family` 与 `expectedConsumer`；**在白名单却已有人用则失败**。
第四条是关键：白名单只能缩小，不能腐烂。
**当前白名单是空表** —— 四个分片自身即消费者，415 个令牌全部有人用。

**标记契约**（接线时必须遵守，否则样式不生效）：

| 组件 | 约定 |
| --- | --- |
| 半星 | `[aria-checked="mixed"]`（整星 `"true"`，空星无属性） |
| 表格 | `.u-table` 是真 `<table>`，假定 `thead`/`tbody`；`aria-sort` 放 `th`、`aria-selected` 放 `tr`；**无 sticky 表头**（规范未给 max-height） |
| 日期选择器 | 只读 `aria-readonly="true"` 在 `.u-datepicker` 根上；「今天」要同时给 `color` 与 `box-shadow`（标记值用 `currentColor`） |
| 滑块气泡 | `.u-slider-bubble` 必须是 `.u-slider` 的直接子元素（轨道 `overflow: hidden`） |
| 下拉 | `.u-select-panel` 不滚动、`.u-select-list` 滚动（否则搜索型下拉的搜索框会跟着滚走） |
| 抽屉 | `u-is-open` 写在元素自己身上或共同祖先 `.u-drawer-root` 上，两种都支持 |
| 气泡提示 | 必须给方向变体（`.u-tooltip--top/--bottom/--left/--right`），否则不显示箭头 |
| 文件上传 | `.u-upload--drag` 是 **dragover 激活态**，不是静态外观 |
| 手风琴 | `.u-accordion-item` 必须**只有两个子元素**：`button.u-accordion-head` + `div.u-accordion-body`（单项是两行 grid，多一个子元素就会多出一行） |
| 步骤条 | 连接线写在项末尾，或作为 `<li class="u-step-line">`；末项不必写（写了也被 `:last-child` 隐藏） |
| 聚焦 | 分片**不抹掉**全局 `:focus-visible` 的 outline，而是叠加 `box-shadow: var(--focus-ring)` —— 强制色/高对比度模式下仍可见，这是无障碍底线 |
| 加载圈 | `.u-loading-spinner` 弧线取 `currentColor`（主按钮底色就是 accent，取 accent 会隐形）；区块级的 `.u-spinner` 仍在 `global.css` |
| 字段错误 | 挂在外层 `.u-field` 上（`.u-field-error` / `.u-field-success` 作子元素） |

**视觉复核怎么做**（`bsk` 不可用时的替代路径）：把 `variables.css` + `global.css` + 四个分片
内联进一个静态 HTML，再把某主题的 415 个令牌写成 `<html style="…">`（等价于 store 运行时做的事），
用 headless Chrome 截图。这条路径发现过一个真问题 —— `--drawer-radius` 的取值方向是反的
（`0 16px 16px 0` 圆的是屏幕外那两角），已修。

### 9.12 硬编码与断点纪律

- 组件样式**只允许消费令牌**。需要新色值/新尺寸时，先在 `variables.css` 登记语义化令牌，
  再补 `presets.js` 五套取值（`test/themeContract.test.js` 会校验两者集合一致）。
- **不许有死令牌**：`test/designTokens.test.js` 会把「定义了没人用」和
  「引用了未定义令牌」都判为失败；判定「有人用」时会排除 `variables.css` 与整个
  `src/theme/`（那是写出令牌名的地方）。
- **规范里有、产品里没有对应组件的档位不入册**（Radio 目前无使用场景、
  头像只登记实际使用的那一档），否则会触发死令牌检查。
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
`/userApi`、`/shop`、`/class`、`/toolApi`、`/kamiApi`、`/cartApi`、`/orderApi`、`/favoriteApi`、
`/uploads`、`/userBackend`、`/health` 配置了开发代理，
默认指向 `http://localhost:8080`（可用 `VITE_API_TARGET` 覆盖）。
由于 `/user` 下既有后端接口也有前端路由（`/user/kami`、`/user/orders` 是页面），代理只列了四个具体接口
而非 `/user` 前缀 —— **新增后端接口时若路径不在上述之内，需要同步在这里加代理规则**，
否则该接口在 dev 下会 404（打到 dev server 自己，不会转发给后端，而且返回的是 index.html，
前端拿到一段 HTML 去解析，报的却是「网络错误」，排查方向会被带偏）。

> `/uploads` 这条尤其容易漏：它不是 `request()` 调用而是 `<img src>`，
> 漏了的表现是「**头像上传成功但图片不显示**」，几乎不会有人联想到代理配置。
> `npm run verify:dev` 因此单独断言了它。

> `npm run verify:dev` 会**静态比对**「前端 `src/api/ask/*.js` 里的每条调用路径」
> 与「`vite.config.js` 的 proxy 键」，并真实请求三个交易前缀与 `/uploads` 确认返回的是
> JSON 而不是 index.html。忘记加代理规则会被这条断言直接拦下。

> 只有「刻意把 `VITE_API_BASE_URL` 设成 `http://localhost:8080`（直连、跨源）」时才需要后端
> 的 `CORS_ORIGINS` 放行；那份白名单在 server 仓库的 `.env` 里，且支持 `/正则/` 条目以覆盖端口漂移。

其他脚本：

```bash
npm run build        # 产出 dist/
npm run preview      # 预览构建产物
npm run lint         # ESLint 检查（src + test + scripts）
npm test             # 单元测试（node:test，共 668 个用例）
npm run check        # lint + test
npm run verify:dev   # 真实启动 dev server + 后端，验证代理转发与 HMR 推送（17 项）
npm run verify       # lint + test + build + verify:dev
```

> `npm run build` 在本机偶尔会因 esbuild 清理系统临时目录失败而报
> `[vite:esbuild-transpile] remove ... Access is denied` —— 那是环境问题而非代码问题。
> 把 `TEMP`/`TMP` 指到工作区内的目录即可：
> `$env:TEMP="F:\Starry Sky Trading Company\.npm-cache\tmp"; npm run build`。

### `npm run verify:dev` —— 唯一的「真实运行」验证

`test/*.test.js` 直接加载 `src/` 源码，**无法证明** dev server 能起来、代理能转发、
HMR 能推送。`scripts/verify-dev.cjs` 补上这一段：

| 断言 | 说明 |
| --- | --- |
| vite dev 启动并就绪 | 真实拉起 `vite`，等 `ready in` 输出 |
| `/` 返回 200 且含 HMR 客户端与入口 | 确认 dev 中间件正常 |
| 代理 `/health` 转发到后端 | 真实后端，返回后端 JSON |
| 代理 `POST /user/visitorLogin` 返回 token | 确认带响应头的接口也能透传 |
| **代理能覆盖全部前端 API 调用路径** | 静态比对 `src/api/ask/*.js` 的每条调用路径与 `vite.config.js` 的 proxy 键（整条匹配或首段匹配） |
| **三个交易前缀真实转发** | `/cartApi`、`/orderApi`、`/favoriteApi` 经 5173 请求后端，断言返回 JSON 而不是 index.html |
| **`/uploads` 真实转发** | 用户上传的头像靠它才能在 dev 下显示；漏了的表现是「上传成功但图片不显示」，极难联想到代理配置 |
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
├── assetUrl.test.js                  # 后端静态资源地址解析（dev 同源 / 生产补基地址）
├── avatarFile.test.js                # 头像纯函数：文件校验、等比缩放、data URL 体积
├── modalLayering.test.js             # 「点不到」类缺陷守卫：关闭按钮的层叠层级与让位
├── useClass.test.js                  # 工具分类与统计（分组、排序、映射、缺字段兜底）
├── useSimpleTimeFormatter.test.js    # 时间格式化（时区、季度、相对时间、非法输入）
├── useEmoji.test.js                  # emoji 渐变（已知/未知/空值/自定义/样式对象）
├── useToken.test.js                  # token 双存储读写与响应头提取
├── appIcon.test.js                    # 线性图标体系：颜色只来自 currentColor、模板引用的名字都存在`r`n├── navbarSearch.test.js              # 顶栏搜索：点击展开（悬停不展开）、**展开前后放大镜位置不变**、焦点只在本块内移动时不收起
├── categoryProducts.test.js          # 分类为空时退回子分类商品的规则（本分类有货时绝不混入子分类的）
├── bootScreen.test.js                # 首屏遮罩时序：假时钟测延迟/最短停留/最长等待
├── bootOverlay.test.js               # 启动遮罩与路由进度条在 App.vue 上的接线
├── render.mjs                        # 渲染辅助：编译 .vue + SSR 渲染 + 环境桩
├── stores.user.test.js               # 用户 store：getters / init / login / register / logout
├── stores.shop.test.js               # 商品分类 store：数组形状不变量、loading 复位
├── stores.tool.test.js               # 工具 store：toolData 形状、分类产出、Apple ID 双来源
├── stores.kami.test.js               # 卡密 store：用户切换重置、筛选拼装、分页合并
├── stores.cart.test.js               # 购物车 store：整份覆盖、needLogin 翻译、loading 复位
├── stores.favorite.test.js           # 收藏 store：游客走 localStorage、登录走服务端、缓存键按 userId
├── useKamiDisplay.test.js            # 卡密展示层纯函数（状态文案/配色、工具名、日期）
├── useKamiActivation.test.js         # 卡密激活流程（校验、服务端失败、异常、activating 复位）
├── designTokens.test.js              # 设计令牌卫生（无死令牌、断点白名单、无重复媒体查询）
├── themeContract.test.js             # 主题契约：名册↔预设一致、合成不产出空令牌、组件尺寸速查总表逐格断言
├── stores.toast.test.js              # 提示框：3000ms 自动消失、悬停暂停/恢复、上限挤出、未知 id 兜底
├── constSafety.test.js               # 静态检查「对 const 绑定赋值」
├── distContract.test.js              # 产物契约：标识/令牌是否真的进了打包结果（无 dist 时跳过）
├── renderComponents.test.js          # 组件渲染（SSR）：全部 .vue 渲染、无警告/插值事故
├── renderKamiData.test.js            # 注入真实 store 数据渲染：逐格断言 8 列内容与状态分支
├── renderTradeData.test.js           # 注入 store 数据渲染交易页：购物车/收藏/个人中心/法务的具体内容
├── renderIdentity.test.js            # 顶栏的身份呈现：游客显示头像与标记、退出后显示登录按钮
└── api-contract.test.js              # 前后端接口契约（跨仓库静态校验）
```

共 668 个用例。

### 主题契约测试

`themeContract.test.js` 是新样式体系的安全网，覆盖三类只有"打开浏览器点一遍"才容易发现的缺陷：

1. **名册 ↔ 预设一致**：`variables.css` 登记的每个令牌，五套主题都必须给出取值（反之亦然）。
   漏一处，该令牌在某个主题下会静默落回别的主题的值。
2. **合成不产出空令牌**：五套主题 × 极端自定义组合（字号 85%~130%、密度 80%~130%、
   圆角 0~200%、`NaN`/负数/超范围）逐个走 `assertTokenContract`，任何缺失/空串都会失败。
3. **组件尺寸速查总表逐格断言**：25 行 × 5 列的组件尺寸（输入框/按钮/卡片/导航/
   分页/进度条/复选框……）与规范表格逐格比对，改错一个数字就会失败；
   另有聚焦态的五种做法、主按钮悬停态的五种做法、价格五套规格、
   「5 套通用」部分的一致性、基础层风格语言等专项守卫。

此外还覆盖了强调色派生（自动压暗 + 按钮悬停底色 + 反白/反黑文字）、背景图 URL 白名单
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
3. 26 个关键接口（登录/注册/刷新/用户信息/资料修改/商品列表与详情/分类/工具/卡密/购物车/订单/收藏/探活）显式存在
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
| 真实浏览器行为 | 本机 `bsk`（BrowserSkill CLI）未安装，无法真实打开页面。CSS 布局、响应式、真实点击/键盘事件、无障碍树都只能靠人工看 |
| `hooks/useBodyScroll` | 依赖 DOM 尺寸测量 |
| `hooks/useModalA11y` 的焦点陷阱 | 依赖 `offsetParent` 与真实焦点，SSR 下拿不到 |
| `hooks/useAvatarUpload` 的 canvas 部分 | 依赖 `Image` / `createImageBitmap` / `canvas.toDataURL`；纯逻辑（校验、缩放尺寸、体积换算）已抽到 `utils/avatarFile.js` 并覆盖 |
| 由 `onMounted` 取数的页面内容 | SSR 不执行 `onMounted`，`Orders` / `OrderDetail` / `ProductDetail` / `CategoryDetail` 只能断言首屏骨架（见 `renderTradeData.test.js` 末尾） |

已覆盖：`utils`、`assetUrl`、`avatarFile`、`modalLayering`、`useClass`、`useSimpleTimeFormatter`、`useEmoji`、`useToken`、`useKamiDisplay`、`useKamiActivation`、
六个 store（`user` / `shop` / `tool` / `kami` / `cart` / `favorite`），
带数据的页面渲染（卡密表格逐格、交易页具体内容），以及跨仓库的接口契约。

> 测试基础设施（`test/loaders/alias.mjs`、`test/setup.js`）模拟了 Vite 的解析规则；
> 若 `vite.config.js` 的 `resolve.alias` 有变动，这里需要同步。
>
> **`import.meta.env` 注入的是转发用的 Proxy**（见 `test/setup.js`）。
> 早先是直接把 `globalThis.__SSTC_TEST_ENV__` 赋给 `import.meta.env`，而只要有代码
> 把那个全局换成新对象（`setTestEnv()` 与 `request.test.js` 都这么做过），
> 已经加载的模块就会继续指向旧对象 —— 表现为「单独跑通过、全量跑失败」的顺序依赖。
> 转发之后 `import.meta.env.VITE_X` 永远读当前值，两种写法都成立。
> 相应地，**改了环境变量的测试必须还原**（`request.test.js` 的 `freshRequestModule`
> 就紧跟着 `finally` 还原）。

---

## 14. 问题状态

完整的问题清单与成因分析见根目录 `代码审查报告.md`。下表是**当前状态**（✅ 已修 / ⬜ 未修）。

**阻断性 — 已全部修复**

| 状态 | 问题 |
| --- | --- |
| ✅ | 登录/注册不可用：已补 `api/ask/user.js` 的 `login`/`register` 与 `stores/user.js` 的对应 action，注册分支不再为空 |
| ✅ | 游客被当作已登录导致登录入口消失：`isLoggedIn` 改为 getter，仅 `user_type === 'registered'` 成立 |
| ✅ | **反过来的一刀切：游客被当作「未登录」** —— 顶栏只给一颗「登录 / 注册」按钮，于是游客看不到自己的头像与昵称，也**没有任何退出入口**（用户菜单整块是注册用户专属）。已把顶栏的判断从 `isLoggedIn` 改为 `hasIdentity`（游客也算有身份）：游客显示头像（带「游」标记）+ 用户面板（游客徽标、身份说明、登录入口、退出游客身份）；退出后进入无身份状态并显示登录按钮。另修掉 `logout()` 里「退出后立刻又建一个游客」的死循环 —— 详见 `docs/changes/2026-10-05-游客身份呈现与退出.md` |
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
| ✅ | 区块头被复制 5 份、页面头被复制 4 份 —— 区块头已抽取为 `SectionHeader.vue`；页面头在第三轮**整体删除**，改为每页独立开场（见 §9.9） |
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
| ✅ | `package.json` 的 `name` 已改为 `starry-sky-trading-company-web`；已有 `lint` / `test` / `check` 脚本；已接入 ESLint 9 与 `node:test`（668 个用例） |
| ⬜ | `.vscode/settings.json` 仍是 Vite-TS 模板残留 |

> 上表中的 ✅ 条目均经实际检查确认，不是「应该已修」。
>
> **环境限制**：本仓库的 `vite build` / `vite dev` 需要 esbuild 以管道 stdio 派生常驻子进程，
> 在受限沙箱中会被拒绝（`vite build` 已通过一次性放宽权限实际执行成功，产物已验证）。
> **组件渲染类行为仍未在真实浏览器中实测** —— 需要 jsdom 或浏览器环境，属尚未决定引入的依赖。

17. `constants/index.js` 缺少部分被引用的导出（`CATEGORIES`、`HOT_PRODUCTS`）。
