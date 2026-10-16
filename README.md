# starry-sky-trading-company-web

星辰商行前端。Vue 3 单页应用，Vite 6 构建，部署在 Vercel。

> 项目总览、前后端数据流、本地开发与部署步骤见[根目录 README](../README.md)；后端接口清单见 [server README](../starry-sky-trading-company-server/README.md)。

> **当前版本 `1.4.0`**（2026-10-15 发布）：会员中心重构为 **1 个枢纽 + 3 个子页**
> （`/member` 七区块 / `/member/benefits` 权益详解与 8×8 数值矩阵 / `/member/growth` 成长值 /
> `/user/checkin` 每日签到），权益由 6 项扩为 **8 项**且逐档数值全部由服务端下发
> （`benefits[].value`），积分明细并入 `/points` 的两个页签。完整清单见 [CHANGELOG.md](CHANGELOG.md)。
> 后端契约 v1.4（`member_levels` 新增 6 列 + `getOverview`/`getPlans`/`getGrowthHistory` 同步下发），版本号两仓库共用。
>
> **`1.5.0` 开发中**（2026-10-16，前端侧 M7）：把服务端这一版新落的七条端点接到界面上 ——
> `/member/benefits` 改用 `getBenefits`（文案与档位矩阵都来自服务端，取不到时逐字段回落到内置说明）；
> `/points` 由两个页签扩为**四个**（新增「商城」`getMallItems`/`redeem` 与「任务」`getTasks`/`claim`）；
> 购物车结算面板接 `getAvailable` 选券 + `previewUse` 试算，下单带 `coupon_code`/`use_points`；
> 订单详情复用同一份金额明细。
>
> **`1.6.0` 开发中**（2026-10-16，前端侧 M8）：最后三条 P2 接线 + 补签入口 ——
> `/user/checkin` 的日历可点选本月已过去的日子补签（`replenishCheckin`，补完重拉日历因为服务端会重算连续段）；
> 新增 `/invite` 邀请中心（邀请码 / 链接 / 计数 / 进度 / 榜单 / 记录分页），个人中心与积分中心各加一个入口；
> 注册弹窗支持选填邀请码（从 `/?invite=CODE` 进入时自动带入并大写）；
> 首页 Hero 面板新增「会员速览」（`getHeroPersona` 的 `benefits` 分块，游客与非会员整块不下发）。
> 至此 API.md 里写下的 **68 个端点全部有调用方**。

---

## 1. 技术栈

| 项 | 内容 |
| --- | --- |
| 框架 | Vue 3.5，全部使用 `<script setup>` 组合式 API |
| 构建 | Vite 6（`@vitejs/plugin-vue`） |
| 路由 | vue-router 4，`createWebHistory`（HTML5 history 模式） |
| 状态 | Pinia 2 |
| UI | **项目自有 UI 体系**：`src/assets/styles/ui-kit-*.css` 的 `u-*` 组件类 + `variables.css` 设计令牌，**不使用任何第三方组件库** |
| HTTP | axios 1.7，统一封装于 `src/api/request.js` |
| 日期 | dayjs（含 `utc`、`timezone` 插件） |
| 开发辅助 | `vite-plugin-vue-devtools` |

**使用** Vue 3 + Vite，但**不使用** TypeScript。已接入 ESLint 9（flat config，`eslint.config.cjs`）与
`node:test` 单元测试（不需要 jsdom / vitest）；**未使用** Prettier。

### 关于组件与自动引入

项目**不使用任何第三方组件库**，也没有配置 `unplugin-vue-components` / `unplugin-auto-import`。
模板里出现的全是自有组件（`src/components/*.vue`）与自有组件类
（`u-btn` / `u-card` / `u-table` / `u-tag` / `u-skeleton` …，定义在 `src/assets/styles/ui-kit-*.css`）。
因此：

- 每个用到的组件都必须在 `<script setup>` 里显式 `import`（局部注册）；
- `ref`、`computed`、`defineStore` 等也必须手工 import —— 没有任何「自动导入」的魔法。

> **历史注记**：`vite.config.js` 曾在 2026-10-12 之前注册
> `unplugin-vue-components` + `AntDesignVueResolver`（`importStyle: false`），
> 模板里因此可以直接写 `<a-table>` / `<a-button>` / `<a-tag>`。
> 该依赖已整体移除（见**工作区根**的 `docs/changes/2026-10-12-移除-ant-design-vue.md`；本仓库内没有 `docs/` 目录），
> 保留这段是为了让后来者知道「为什么模板里没有 `a-*`、也没有自动导入」。

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
    │       ├── order.js          # /orderApi（含 1.5.0 M2 的 coupon_code / use_points）
    │       ├── favorite.js       # /favoriteApi
    │       ├── member.js         # /memberApi（含 1.5.0 M6 的 getBenefits）
    │       ├── points.js         # /pointsApi（含 1.5.0 M3 商城、M4 补签）
    │       ├── coupon.js         # /couponApi（含 1.5.0 M1 的 getAvailable / previewUse）
    │       ├── task.js           # /taskApi（1.5.0 M5：任务清单与领奖）
    │       ├── invite.js         # /inviteApi（1.6.0 M8：邀请概况与记录）
    │       ├── hero.js           # /heroApi（1.6.0 M8：首页人格位的会员速览）
    │       ├── mail.js           # /mailApi
    │       └── support.js        # /supportApi
    ├── assets/
    │   ├── styles/
    │   │   ├── variables.css     # 设计令牌名册（+ 默认主题 tech-minimal 的兜底值）
    │   │   └── global.css        # 重置、共享结构类（.ui-card/.u-cta/...）、共享动效
    │   └── README.md             # assets 目录说明与令牌清单
    ├── components/               # 区块、卡片与弹窗组件（见 §6）
    ├── constants/
    │   ├── index.js              # 常量出口（只 re-export content.js）
    │   └── content.js            # 全站文案：SITE / NAV_MENU / HERO / SECTIONS / PAGES / SUPPORT / FOOTER / 主题弹窗
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
    │   ├── useClass/index.js             # 按 class 字段对工具分组（图标取 AppIcon 的名字）
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
    │   ├── member.js             # 会员概览 / 档位 / 成长值 / 权益公开页数据
    │   ├── points.js             # 积分账户 / 流水 / 签到 / 积分商城
    │   ├── coupon.js             # 我的优惠券
    │   ├── checkout.js           # 结算试算（1.5.0 M7）：券列表、积分、试算结果
    │   ├── task.js               # 任务中心（1.5.0 M7）：清单与领奖
    │   ├── invite.js             # 邀请中心（1.6.0 M8）：概况、记录、分页
    │   ├── hero.js               # 首页人格位（1.6.0 M8）：会员速览（可能整块缺席）
    │   ├── mail.js               # 站内信
    │   ├── support.js            # 客服工单
    │   └── theme.js              # 设计风格：切换、单项自定义、持久化、写入 :root
    ├── theme/                    # 设计风格（样式体系的运行时层）
    │   ├── presets.js            # 五套风格的完整令牌取值 + 可调项定义
    │   ├── compose.js            # 预设 + 单项自定义 → 最终令牌表（纯函数）
    │   └── color.js              # 解析/压暗/转 rgba/缩放 px 的小工具
    └── utils/
        ├── index.js              # throttle / domUtils.smoothScroll / formatUtils
        ├── assetUrl.js           # 后端静态资源地址解析（/uploads/... → API 基地址）
        ├── avatarFile.js         # 头像纯函数：文件校验、等比缩放尺寸、data URL 体积
        ├── checkout.js           # 结算口径纯函数：积分校验、上限换算、明细行、券选项文案
        ├── taskDisplay.js        # 任务与商城的展示纯函数：周期文案、进度百分比、按钮四态
        ├── checkinDisplay.js     # 签到与补签的展示纯函数：可补签判定、格子标题、失败文案
        └── clipboard.js          # 剪贴板写入（两级策略 + 失败提示）
```

---

## 3. 应用入口与初始化

`index.html` → `<script type="module" src="/src/main.js">` → `src/main.js`：

```js
import './assets/styles/variables.css'
import './assets/styles/global.css'
// 组件套件六分片（表单 / 导航 / 数据 / 反馈 / 会员与邮件 / 工具页），必须排在 global.css 之后
import './assets/styles/ui-kit-form.css'
import './assets/styles/ui-kit-nav.css'
import './assets/styles/ui-kit-data.css'
import './assets/styles/ui-kit-feedback.css'
import './assets/styles/ui-kit-member.css'
import './assets/styles/ui-kit-tool.css'

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

- `<Navbar />` 固定顶栏（品牌 + 主导航 + **收成图标的搜索** + 样式主题切换 + 账号入口 + **会员入口**（皇冠图标，有身份即显示；开通后角标显示等级名）+ 移动端抽屉）
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
if (userStore.isLoggedIn) { … }  // 购物车 / 收藏 / 会员概览 / 未读数是账号级数据，身份就绪后再取
```

`watch(() => userStore.userId)` 里做的事与登录对称：先 `reset()` 掉
`cart` / `favorite` / `member` / `mail` / `support`，再在已登录时重新拉一遍 ——
否则换号后页面上留着的是上一个人的角标、通知与会话回执号。

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
| `/tool` | `Tool` | `pages/Tool.vue` | 工具分类 - 星辰商行 |
| `/search` | `SearchResults` | `pages/SearchResults.vue` | 搜索 - 星辰商行 | 关键词走 `?q=`，同时搜商品与工具 | |
| `/video/downloader` | `videoDownloader` | `pages/VideoTool.vue` | 视频下载工具 - 星辰商行 | 骨架页，解析服务未接入，见下 |
| `/image/compressor` | `imageCompressor` | `pages/ImageCompressor.vue` | 图片压缩工具 - 星辰商行 | 骨架页（不要求登录） |
| `/dev/json-formatter` | `jsonFormatter` | `pages/JsonFormatter.vue` | JSON 格式化工具 - 星辰商行 | **唯一真实可用**（不要求登录） |
| `/about` | `About` | `pages/About.vue` | 关于我们 - 星辰商行 | |
| `/other/2fa` | `2fa` | `pages/2FA.vue` | 2FA - 星辰商行 | 真实可用（不要求登录） |
| `/other/appleId` | `appleId` | `pages/AppleId.vue` | 共享 Apple ID - 星辰商行 | 需要身份 |
| `/user/kami` | `kami` | `pages/Kami.vue` | 卡密管理 - 星辰商行 | ✅ |
| `/user/profile` | `Profile` | `pages/Profile.vue` | 个人中心 - 星辰商行 | ✅ |
| `/user/favorites` | `Favorites` | `pages/Favorites.vue` | 我的收藏 - 星辰商行 | ✅ |
| `/user/orders` | `Orders` | `pages/Orders.vue` | 订单管理 - 星辰商行 | ✅ |
| `/user/orders/:orderNo` | `OrderDetail` | `pages/OrderDetail.vue` | 订单详情 - 星辰商行 | ✅ |
| `/member` | `Member` | `pages/Member.vue` | 会员中心 - 星辰商行 | ✅ |
| `/member/plans` | `MemberPlans` | `pages/MemberPlans.vue` | 会员套餐 - 星辰商行 | ✅ |
| `/member/benefits` | `MemberBenefits` | `pages/MemberBenefits.vue` | 会员权益详解 - 星辰商行 | **不要求登录**，见下 |
| `/member/growth` | `MemberGrowth` | `pages/MemberGrowth.vue` | 成长值 - 星辰商行 | ✅ |
| `/points` | `Points` | `pages/Points.vue` | 积分中心 - 星辰商行 | ✅ |
| `/user/checkin` | `UserCheckin` | `pages/UserCheckin.vue` | 每日签到 - 星辰商行 | ✅ |
| `/growth` | → `/member/growth` | — | 旧路由重定向 | |
| `/points/history` | → `/points` | — | 旧路由重定向（并进「流水」页签） | |
| `/checkin` | → `/user/checkin` | — | 旧路由重定向 | |
| `/coupons` | `Coupons` | `pages/Coupons.vue` | 我的优惠券 - 星辰商行 | ✅ |
| `/mail` | `Mail` | `pages/Mail.vue` | 消息中心 - 星辰商行 | ✅ |
| `/support` | `Support` | `pages/Support.vue` | 客服中心 - 星辰商行 | **游客可用**，见下 |
| `/terms` | `Terms` | `pages/Legal.vue` | 用户协议 - 星辰商行 | |
| `/privacy` | `Privacy` | `pages/Legal.vue` | 隐私政策 - 星辰商行 | |
| `/rules` | `Rules` | `pages/Legal.vue` | 平台规则 - 星辰商行 | |
| `/:pathMatch(.*)*` | `NotFound` | `pages/NotFound.vue` | 页面未找到 - 星辰商行 | |

**为什么 `/support` 没有 `requiresAuth`**：服务端 `/supportApi` 也没挂
`requireRegisteredAccount`（`server/src/index.js:254` 的注释解释了原因）—— 游客是一期里
唯一「没有账号邮箱、也永远收不到站内通知」的身份，客服中心是他唯一的求助通道，关掉它
等于把人堵死。游客登录态同样带 access token 与 `users.id`，所以「我的会话」的归属判断
对两种身份是同一份代码；差别只有一处：**游客必须自己填联系邮箱**（回执与客服回复只发到那里）。

**为什么 `/member/benefits` 也不要求登录**：权益规则是公开信息（先知道能拿到什么才会考虑开通），
所以它是八项权益的唯一公开说明页，同时给非会员与会员看。数据来自 `getPlans` 的 `levels[]`（公开的
八档数值矩阵）与 `getOverview` 的 `benefits[]`（只有本人登录后才有）；未登录时卡片只显示解锁等级、
不显示数值，矩阵照常显示全部八档 —— 页面标题下方那句「数值全部来自服务端，页面上不写死任何折扣或倍率」
是这个文件的存在理由。

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
顶栏右侧另有：样式主题、**购物车（带角标）**、登录/注册或用户头像下拉。

下拉分两组：**账号资产**（个人中心 / 我的订单 / 我的收藏 / 卡密管理 / 每日签到）与
**会员权益**（会员套餐 / 积分中心 / 成长值 / 我的优惠券），
两组之间用分隔线 + 小组标题分开 —— 平铺会变成一条十一项的长列；退出登录在末尾。
组内按使用频率排序（个人中心 → 订单 → 收藏 → 卡密 → 签到），名称与跳转目标未变。
**下拉里不重复顶栏已有的入口**：会员中心（顶栏皇冠）与消息中心（顶栏信封）刻意不放进下拉，
去重由 `test/navbarUserMenu.test.js` 与 `test/navbarMail.test.js` 双向钉住。
每个条目左侧有一个 `aria-hidden` 的装饰图标（`.dropdown-item-icon`，图标名在 `iconSet.js`）。
昵称右侧的徽标是「游客」或**当前会员等级**（`levelName` 为空时整个徽标不渲染）。
展开下拉时会静默刷新一次会员概览：等级可能因「客服确认结算」而在会话中途变化。
无障碍与交互：触发器带 `aria-haspopup="menu"` / `aria-controls="user-menu"` / `aria-expanded`，
面板是 `role="menu"` + 每条 `role="menuitem"`；`↓` 展开并把焦点落到第一项，面板内 `↑/↓` 循环、
`Home/End` 到首尾、`Esc` 关闭并把焦点还给触发器（`Tab` 不拦截，交给浏览器默认顺序）。
面板 `max-height: var(--dropdown-max-height)` + `overflow-y: auto`（短视口不再看不到「退出登录」），
展开动画收紧到 180ms（全局 `--enter-duration` 是页面进入的节奏，下拉就地展开用它会显得卡）。
消息铃铛**尚未实现**（`notifyApi` 只有契约、没有服务端实现），所以不放点不开的入口。

> `/other/2fa` 与 `/other/appleId` 不在顶部导航里，属于直接通过 URL 访问的工具页。

### 页面构成

| 页面 | 结构 |
| --- | --- |
| `Home.vue` | `HeroSection` + `CategoriesSection` + `HotProductsSection` + `HotToolsSection`；Hero 的"去逛逛"按钮滚动到分类区块。**1.6.0 M8 起 Hero 右侧面板多一块「会员速览」**（`GET /heroApi/getHeroPersona` 的 `benefits` 分块）：等级与剩余天数、积分与折算金额、可用券与即将过期张数、今天签到可得多少分。游客与非会员拿到的是 `{}`（**整块缺席代表「没有这个能力」**），此时面板只剩品牌块；面板也因此去掉了 `aria-hidden` 并把固定宽高比换成 `min-height` —— 行数会变，固定比例会把内容挤出去 |
| `Categories.vue` | 页头 + `CategoriesSection` |
| `Hot.vue` | 页头（计数只数**商品**）+ `HotProductsSection` + `HotToolsSection` |
| `SearchResults.vue` | 两个分区：商品 / 工具，各查各的接口（都带 `keyword`，服务端搜索）、各有一套加载/错误/空态。用 `Promise.allSettled` 让两个分区互不拖累。**工具分区需要身份**（接口是 JWT 保护的），无身份时给登录引导而不是报错 |
| `ProductDetail.vue` | 面包屑 + 「左图右信息」两栏 + 描述面板 + 同类商品推荐 |
| `CategoryDetail.vue` | 标题带（含子分类入口）+ 该分类下的商品网格。**本分类为空时退回展示子分类的商品**（规则在 `utils/categoryProducts.js`，有单测）：本分类有自己的商品时绝不混入子分类的，否则「这个分类下有什么」就没法回答了 |
| `Cart.vue` | 左条目列表（勾选 / 步进器 / 移除）+ 右吸顶结算面板（**1.5.0 M7 起含选券、积分抵扣与试算明细**，再是联系方式、备注、提交订单）。结算面板**不自己算钱**：选中项一变就（250ms 防抖）调 `POST /couponApi/previewUse`，明细行原样展示服务端返回的六个数；提交时发的是 **试算后的 `points_used`** 而不是输入框里的数字，且只带 `coupon_code` / `use_points` 这两个意图字段 |
| `Tool.vue` | 工具页：左侧筛选轨（**「使用方式」+「分类」两组**，≤991 单栏时分类换行，不做隐藏滚动条的横滚条）+ 工具条（搜索 + 计数）+ `ToolCard` 网格。计数只在工具条里出现一次 |
| `VideoTool.vue` | 视频下载工具的**骨架页**（`ToolPageShell` + 四态结果区）。解析服务暂停中（候选服务是会员制接口、且文档给的地址实测 404），但工具条目已经在库里、也已标为「需要卡密激活」—— 已激活的用户点进来必然是死链。链接输入 + 清晰度/输出格式 + 「解析链接」会走完加载与成功流转，**但结果是占位回显**，页头「需卡密激活」与侧栏「功能开发中」都如实标注。接上服务后只换 `parse()` 的实现，`tool_path` 不用改 |
| `ImageCompressor.vue` | 图片压缩工具的**骨架页**：拖放/点选本地图片（校验类型与 5MB 上限）→ 压缩档位（约 80/60/40%）→ 「开始压缩」。**压缩是估算法**：只按档位系数折算体积，不做真实编码，预览用 `URL.createObjectURL`（离开或换图时 revoke）；下载按钮保持禁用并在侧栏写明「骨架阶段」。图片不上传，全部本地处理 |
| `JsonFormatter.vue` | JSON 格式化工具的**唯一真实实现页**：`JSON.parse` + `JSON.stringify(obj, null, indent)`，缩进 2/4/Tab、可切「压缩为单行」，失败时原样展示 `SyntaxError.message`（含位置），成功展示字符数与行数并可一键复制。解析期间插一帧让出主线程，保证加载态可见 |
| `Kami.vue` | 仅包一层 `KamiSection`（"我的卡密"表格 + "激活卡密"表单两个 tab） |
| `Profile.vue` | 左只读账号信息 / 右可编辑资料（昵称、性别、生日、头像）。头像栏是**左右两栏**：左「头像 + 说明文字」、右「上传图标按钮」—— 按钮只有 `↑` 图标，可见文字转为 `.visually-hidden` 的可访问名，因此那个 `label` 里**必须**保留一段文字，否则被它关联的 file input 就没有可访问名（`label` 上的 `aria-label` 不算 input 的名字）。两栏之上还有三张**独立卡片**：会员权益摘要、每日签到入口、**邀请有礼入口（1.6.0 M8 新增，指向 `/invite`）**。`.ui-card` 自己不设外边距、`.profile-page` 也不是 flex 容器，所以这三张卡的下外边距必须显式给（否则几块会紧贴在一起）；签到卡与邀请卡还必须合写类名（`.ui-card.profile-checkin` / `.ui-card.profile-invite`）才压得过 `.ui-card` 的纵向方向（文案左、按钮右），窄屏再用同优先级选择器改回 `column` |
| `Member.vue` | 会员中心（**枢纽，七区块**）：身份区（等级徽标 / 有效期 / 开通或续费 + 权益详解入口）、资产三卡（积分 / 优惠券 / 会员到期日，**就地显示已有数值**，不新增后端调用）、成长值进度（`growth_to_next` 存在才渲染）、八项权益卡（已解锁显示服务端下发的当前值，未解锁显示解锁等级）、下一档预告（用 `benefits[].value.next` 与 `next_level`）、快捷入口（含每日签到）。四个分支按优先级排：未登录引导 → 骨架 → 错误（带重试）→ 正式内容 |
| `MemberBenefits.vue` | 会员权益详解（**公开页，不要求登录**）：权益说明（八项，逐项给规则与当前值）、**8×8 数值矩阵**（全部来自服务端 `levels[]` 的六个新列，当前档高亮，窄屏降级成「每档一张卡」）、规则与常见问题。**页面上不写死任何折扣 / 倍率 / 金额 / 档位数字** —— 数字只有服务端一份，改档位不用改页面。**1.5.0 M6/M7 起文案与矩阵也走服务端**（`GET /memberApi/getBenefits`）：`benefitDetails` 按字段回落（服务端缺哪个字段就用内置的那一条），`faq` 优先服务端、`detail` 归一成数组逐行渲染，矩阵取 `memberStore.matrixLevels`（服务端 `benefitsPage.levels` → `plans.levels` → `[]`） |
| `MemberGrowth.vue` | 成长值（原 `/growth`）：汇总三数（累计 / 成长值等级 / **当前生效等级**）、升级进度、来源说明（四条规则文案由 `getGrowthHistory` 的 `rules` 下发）、八档门槛对照表。**满级时服务端不下发 `next_level` 三键，进度块整块不渲染**（判据是 `!== undefined`，不是 `> 0`）；非会员不写「已是最高等级」，而是说「按成长值门槛定档、到账即时生效」 |
| `Growth.vue` | 12 行的**转发薄壳**：渲染 `MemberGrowth.vue`。留着它的唯一理由是 `test/growthPage.test.js` 直接渲染这个文件路径，而路由已迁到 `/member/growth` |
| `MemberPlans.vue` | 会员套餐：按等级分组的套餐卡 + 等级阶梯（`MemberLevelLadder`，8 档）+ 结算与退款说明（文案由服务端 `getPlans` 下发，缺字段整块不渲染）。`is_current` **只标记不禁用按钮** —— 同级续费必须能继续买，理由写在文件头 |
| `Points.vue` | 积分中心：**四个页签** —— 「概览」（余额 / 折抵金额 / 积分倍率与「会员加成生效中」/ 即将过期提醒）、「流水」（原 `PointsHistory` 的类型筛选 + 分页整体并进来，只有一页时不渲染分页控件）、**「商城」（1.5.0 M3：券与实物，库存只认服务端，不可兑时先给理由再禁用按钮）**、**「任务」（1.5.0 M5：进度条 + 四态按钮，签到任务显示「自动发放」）**。页头说明「签到、消费与任务都能获得积分，100 积分可抵 ¥1」。页签值写进 `?tab=`（`normalizeTab()` 认不出回 `overview`），直接落在商城/任务的分享链接也能取到数据。列表每条**横向排版**（图标 · 名称 · 说明 · 积分/库存 一行，右侧按钮一行，两处都可换行），`≤575` 退回上下两行 —— 纵向排版会把每条记录拉到三行高，条数一多就翻不到底。**行上同时挂了全局 `.ui-card`（它是 `flex-direction: column`），所以每条列表都必须显式写 `flex-direction: row`**，`test/pointsPage.test.js` 直接读源码钉住这一点 |
| `UserCheckin.vue` | 每日签到（**挂在个人中心下**，`/user/checkin`）：连续天数、签到日历与补签（剩余补签次数来自接口的 `replenish_left`）、奖励规则。签到与会员**结构解绑、倍率保留**：服务端 `sstc.checkin` 仍按 `get_member_snapshot` 的 `points_multiplier` 放大积分（成长值固定 +5），所以文案是「会员等级倍率对签到积分同样生效」，不能写成消费专属。**1.6.0 M8 起可补签**：本月已经过去、且没签到的日子渲染成按钮（虚线描边 + 手型光标），点击即补（`POST /pointsApi/replenishCheckin`）；不可补签的日子同样给出理由（今天直接签到 / 已签到 / 次数用完 / 积分不足），判定与文案都在 `utils/checkinDisplay.js`，**服务端仍是最终裁决**。补签成功后必须**重拉日历** —— 服务端会重算整条连续段（含补签日之后已签到的天），只改本地那一个格子会让 `streak` 与服务端分叉 |
| `Coupons.vue` | 我的优惠券：三态页签（**角标来自服务端的 `counts`，前端不自己数**）+ 券列表，带门槛与有效期提醒 |
| `Invite.vue` | 邀请中心（`/invite`，**1.6.0 M8 新增**）：邀请码与邀请链接（都可一键复制，走共享的 `utils/clipboard.js`）、三态计数（已注册 / 已完成首单 / 已失效）、奖励口径（好友完成首单后双方各得多少）、进度条（满 N 人额外奖励，**每账号只发一次**）、邀请榜、邀请记录（分页）。四条纪律写在文件头：码与链接一律用服务端返回值、奖励数字不自己算、`invitee_label` 已在库内脱敏、**发奖时机是「首单」而不是「注册」**（所以 `registered` 状态显示「待完成首单」） |
| `Mail.vue` | 消息中心：三个页签（通知 / 通知偏好 / 邮件记录）+ 顶栏下拉入口的未读角标。通知页每条可单条或全部标为已读，**未读圆点只看服务端的 `is_read`**；偏好页六个开关直接对应 `notification_preferences` 的六列，改动只提交差异项（`master` 总开关的后果写在界面上，不藏在注释里）；邮件记录页是自查用的投递台账（状态、重试次数、时间），**不含正文**。游客能看到的是登录引导而不是空列表 |
| `Support.vue` | 客服中心：两个页签（提交反馈 / 我的会话），**游客与注册用户共用同一个页面**。提交成功后第一件事是把**回执号**摆到最显眼处（游客丢了登录态就只剩邮件里的回执号），因此有复制、深链 `/support?thread=FB…`、「再提一条」三个出口；「我的会话」内部再分列表与详情（状态、分类、联系邮箱、消息记录 + 追问）；会话对外**只有回执号**，404 一律说「没找到」而不区分「不存在」与「不是你的」（防枚举）。长度上限 `maxlength`、邮箱预填与「必填」提示都按身份分叉，频次上限（24 小时 5 次）写在表单下方。两处文本域（详细描述、追问）都用 `.support-textarea`：**高度固定 144px、圆角固定为卡片档** —— `--radius-input` 是给单行输入框用的令牌（液态玻璃主题下是 9999px 全胶囊），文本域一长高，四角就变成夸张的尖胶囊，高度越大越明显 |
| `Favorites.vue` | 胶囊页签（商品 / 工具）+ 卡片网格，被删除的收藏保留一行并给出清理入口 |
| `Orders.vue` | 状态页签 + 订单卡片列表（缩略图、金额、取消/完成/详情）+ 分页 |
| `OrderDetail.vue` | 订单号标题带 + 明细面板（**有优惠时展示金额明细**：商品原价 / 会员价优惠 / 优惠券抵扣 / 积分抵扣（N 积分）/ 实付，复用结算页的 `settlementRows()`；没有优惠时只留一行「订单金额」）+ 联系备注 + 状态时间线 + 动作行 |
| `Legal.vue` | 左目录吸顶 + 右正文；三份文档共用一个组件，由 `meta.legalKey` 选内容 |
| `AppleId.vue` | 工具页壳（`ToolPageShell` + 侧栏「使用说明 / 注意事项」）+ `AppleIdSection`（数据源汇总、加载/错误/空态、重试），顶部两颗 `u-tag` 报线路账号数 |
| `2FA.vue` | 纯前端 TOTP 生成器：Base32 解码 → WebCrypto HMAC-SHA1 → 动态截断，30 秒倒计时并自动复制。页头与结果区已并入工具页壳（空态 / 加载 / 成功 / 失败四态由 `ToolResultPane` 渲染），**TOTP 逻辑与密钥处理未动** |
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

### 工具页骨架：五个页面与占位功能说明

数据库 `tools` 表里每一条工具的 `tool_path` 都必须有一个能打开的页面 ——
以前只有 3 个，`/image/compressor`（图片压缩）与 `/dev/json-formatter`（JSON 格式化）
在「工具分享」点「打开工具」会新开一个 404。现在五个路径全部落地，
并统一走 `ToolPageShell` + `ToolResultPane` 的骨架：**页头 → 输入区 → 操作区 → 结果区（空/加载/成功/失败四态）→ 辅助信息（侧栏说明）**。

| 工具（`tool_path`） | 路由 / 页面 | 状态 | 占位到什么程度 |
| --- | --- | --- | --- |
| 视频下载工具 `/video/downloader` | `pages/VideoTool.vue` | 骨架 | 解析服务未接入。链接校验、清晰度/输出格式、「解析链接」的加载与成功流转都可走通，但结果是**参数回显**；侧栏「功能开发中」+ 页头「需卡密激活」如实标注 |
| 图片压缩工具 `/image/compressor` | `pages/ImageCompressor.vue` | 骨架 | 选图/拖放、类型与 5MB 校验、档位与输出格式都是真的；**压缩是系数估算**，预览用本地 object URL，下载按钮禁用 |
| JSON 格式化工具 `/dev/json-formatter` | `pages/JsonFormatter.vue` | **真实可用** | 唯一的完整实现：`JSON.parse` + `JSON.stringify`，缩进/单行、报错定位、字符数与行数、一键复制 |
| 2FA 密钥验证 `/other/2fa` | `pages/2FA.vue` | **真实可用** | TOTP 逻辑本来就是真的（`utils/totp.js` 对齐 RFC 6238），本期只换页头与结果区外观 |
| 共享 Apple ID `/other/appleId` | `pages/AppleId.vue` | **真实可用** | 数据来自 `toolApi/getAppleIds`，本期只换页头与侧栏 |

新工具页的接入方式：在 `src/constants/content.js` 的 `TOOL_PAGES` 里加一条（键就是数据库里的 `tool_path`），
写一个用 `ToolPageShell` 包住的页面组件，在 `src/router/index.js` 里加一条懒加载路由即可 ——
`vercel.json` 是 SPA 的 catch-all rewrite，**不需要改部署配置**。

### 搜索：关键词只在组件内，结果走 `/search`

| 动作 | 发生什么 |
| --- | --- |
| 打字 | 只更新 `Navbar.vue` 内的一个局部 `ref`，**不影响任何列表** |
| 回车 | 跳到 `/search?q=<关键词>`，那里**同时**查商品与工具 |

**关键词刻意不进 store。** 它一度双向绑定到 `shopStore.searchKeyword`，
而首页/热卖榜的商品栅格会按那个字段持续过滤 —— 于是
「搜索之后点首页，下面的商品列表还是搜索后的结果」（用户报的 bug）。
根因不是「忘了清空」，而是把**瞬态的输入框内容放进了全局状态**：
只要它还在 store 里，任何读它的列表就会一直受它影响。

现在 `shop.js` 里那个字段、写入它的 action、以及按它过滤的 `filteredProducts`
getter **一并删除**（`HotProductsSection` 改读 `shopInfo`，`Hot.vue` 的计数同理），
这样也不存在「重新接回 store」的机会。同类守卫见
`test/searchAndHotTools.test.js` 的「搜索关键词不得进 store」。

**为什么搜索要有独立页面**：工具的数据在另一个接口、另一个 store 里，
**客户端过滤拿不到**，需要一个把两边结果放在一起的地方。
两个接口**都已支持 `keyword`**（商品搜 `main_title`、工具搜 `tool_name`），
因此结果页是服务端搜索，不需要新增后端接口，也不必把两份全量数据拉到前端。

> ⚠ `/toolApi/getTools` 是 **JWT 保护**的（实测无 token 返回 401）。
> 访客由 `App.vue` 的 init 自动创建，所以正常访问一定有身份；
> 只有「刚退出登录 / 退出游客」例外。**任何调用工具接口的地方都必须先判断身份** ——
> 否则用户看到的是「工具加载失败：token已失效或已过期」，像是页面坏了。
> `Tool.vue`、`SearchResults.vue`、`HotToolsSection.vue` 三处都做了这个判断。

### 组件类名不得跨组件复用 scoped 样式

`.section-inner`（区块内容容器：限宽 + 居中 + 两侧内边距）原先只在
`CategoriesSection` 与 `HotProductsSection` 的 `<style scoped>` 里各写一份。
**scoped 样式只作用于本组件** —— 新的 `HotToolsSection` 复用这个类名时拿到的是
**零样式**：不限宽、不居中、没有内边距，整块内容横向铺满视口，与上方区块对不齐。
这就是用户报的「热门工具排版 bug」。

现已收进 `global.css` 第 13 节（组件的 scoped 副本已删除；
移动端 `@media` 覆写仍留在各组件内，那是本项目的约定）。

> 这个坑的特征是「**看起来有定义**」（grep 类名能搜到）却不生效，且不报错 ——
> 只能靠真机看。同一个坑在 `VideoTool.vue` 上又踩了一次（借用了 `Tool.vue` 的
> `.workspace-*`），现已改用全局的 `.page-shell-*`。
> `test/componentClasses.test.js` 机械地把这一类挡在提交前：
> 模板里用到的类名若**只存在于别的组件**的 scoped 样式里，即判失败
> （「谁都没定义」的纯语义类名不算错，本项目有不少）。
>
> 同一个文件里还有两条更严的守卫（2026-10-12 补）：
> ① 设计系统前缀 `u-` / `ui-` 的类名**必须**在共享样式或本组件样式里有定义
> —— 这个前缀只可能来自设计系统，写出一个不存在的名字几乎一定是拼错；
> ② `STATUS_VARIANT` 映射出的每个 `u-tag--*` 变体必须有 CSS 定义。
> 两条都来自真实缺陷：`.u-card` 与 `.u-btn` 曾在 5 个会员 / 积分页面里
> **从未有过定义**（卡片与按钮整套外观静默失效，页面看着“就是对不齐”），
> `.u-tag--muted` 在标签族里也不存在（「已禁用」状态退化成中性标签）。
> 详见 `docs/changes/2026-10-12-会员积分页面卡片按钮类名修复.md`。

### 热门工具

`HotToolsSection` 与 `HotProductsSection` **并列**而不是合并：取数来源、排序字段、
卡片组件都不同（商品按销量/浏览量，工具按 `collection_count`，卡片是 `ToolCard`）。
硬塞进一个组件只会得到一堆 `isTool` 分支。

- 排序用后端已有的 `sort_by=collection_count`，**不在前端重排**
- **取不到工具就整块不渲染**：它是补充推荐，缺了不该留个空壳区块
- 取数失败**静默**（不弹 toast）：首页不该为一块补充内容弹错误；收藏失败才提示（那是用户主动操作）
- 榜单变体也**保留自己的区块头** —— 榜单页的页头（「热卖榜 / 按销量与浏览量排序的精选商品」+「N 件在榜」）讲的只是商品，第二个栅格没有标题的话用户会以为那还是商品
- 榜单变体**不加「上榜名次」角标**（商品榜有，工具榜没有）。两个原因：
  工具卡媒体区的左上角已被「新」标记占用（今天没有 `is_new` 的工具所以看不出来，
  一旦有就会重叠），右上角是收藏按钮（还带一个向外凸出的计数徽标）；
  而商品榜的名次在右上角，工具放到左上角就和商品榜**镜像**了，同一页两处位置不一致。
  何况名次对工具本就冗余：列表已按收藏数降序、每张卡自己也显示着收藏数。
  将来若确实要名次，正确做法是像 `ProductCard` 那样给 `ToolCard` 加 `rank` prop，
  由卡片内部挑一个不冲突的位置渲染

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

### `member.js` — `useMemberStore`

| 成员 | 说明 |
| --- | --- |
| `overview` | `/memberApi/getOverview` 的整份响应（等级、有效期、成长值、**8 项权益解锁态与逐档数值**、待办） |
| `plans` / `levels` | 套餐列表与等级阶梯表（8 档）。两者同一次 `getPlans` 响应下发；`MemberPlans.vue`、`MemberBenefits.vue` 的 8×8 矩阵与成长值页的 `MemberLevelLadder` 都取 `levels`，**新六列（券包 / 抵扣上限 / 免卡密额度 / 生日 / 客服档 / 身份档）也在里面** |
| `paymentNotice` / `refundNotice` | **服务端下发的文案**，前端不自己编（支付通道未接入的如实说明） |
| `growth` / `growthSummary` / `growthRules` / `growthPage` / `growthTotal` / `growthTotalPages` / `loadingGrowth` | 成长值页（`/member/growth`）的全部状态，来源是 `getGrowthHistory` 一条响应（`list` / `summary` / `rules` / `thresholds` + 分页元数据） |
| `isMember` / `level` / `levelName` / `points` / `benefits` / `todos` | 派生 getter |
| `growthTotalValue` / `growthHasPrev` / `growthHasNext` | 成长值派生 getter（分页控件与「还能翻页吗」的判断） |
| `hasLevels` | `Array.isArray(levels) && levels.length > 0`。**`levels` 的初值是 `null` 而不是 `[]`**，页面里写 `memberStore.levels.length` 会在首屏抛 `TypeError` 并打断 `onMounted` 的后续请求 —— lint / build / SSR 渲染都看不见（SSR 不跑 `onMounted`），所以统一走这个 getter，由 `test/stores.member.test.js` 钉住 |
| `hasExpiringTodo` | 是否存在「会员即将到期」待办（按 `type` 在 `todos` 里找） |
| `benefitsPage` / `loadingBenefits` | **权益公开页（§4.4 `getBenefits`）的整份数据**：`{benefits, levels, faq}`。文案与服务端下发的 `level_names` 都来自这里；取不到时页面逐字段回落到前端常量（同一份说明书，不该因为一次网络抖动变成空白页） |
| `hasBenefitsPage` / `matrixLevels` | 「有没有服务端说明书」与「矩阵用哪份档位表」—— `matrixLevels` **优先 `benefitsPage.levels`，空则退回 `plans` 的 `levels`**，两者都没有给 `[]` |
| `fetchOverview({silent})` / `fetchPlans({silent})` / `fetchGrowthHistory({page, silent})` / `fetchBenefits({silent})` / `reset()` | `silent` 用于「已有数据时静默刷新」，失败不弹错、不清空；`reset()` 也清成长值（`App.vue` 登出时统一调），**但保留 `benefitsPage`** —— 权益公开说明书与登录身份无关 |

两条纪律写在文件头：**不做本地乐观更新**（会员状态只能由服务端确认），
以及「**不适用以键不存在表达**」—— 非会员的响应里没有 `points` / `coupons` /
`days_left`，判断必须用 `!== undefined`，写 `=== 0` 会把「不适用」当成「零」。
401 不算错误（未登录时 `error` 置空、数据置 `null`）。

### `points.js` — `usePointsStore`

| 成员 | 说明 |
| --- | --- |
| `account` / `calendar` | 积分账户与签到日历（两个独立接口，各自有加载态） |
| `history` / `page` / `limit` / `total` / `totalPages` / `historyType` | 明细列表与筛选分页 |
| `summary` | 明细的「累计获得 / 累计消耗」 |
| `points` / `pointsValue` / `multiplier` / `isMember` / `expireSoon` | 派生 getter（`pointsValue` 是折抵金额，不是积分） |
| `todayChecked` / `streak` | 签到派生状态，`streak` 供「连续签到 N 天」 |
| `hasPrev` / `hasNext` | 分页按钮可用性（只有一页时不渲染控件） |
| `mallItems` / `mallLoaded` / `loadingMall` / `redeemingId` | **积分商城清单（1.5.0 M3）**：`stock` 只认服务端（`null` = 不限量、`0` = 已兑完），端上不做本地扣减 |
| `hasMallItems` / `fetchMall({silent})` / `redeemItem(itemId)` | 商城派生与动作；`redeemItem` 成功后**用服务端返回的 `data.item` 覆盖那一行**（券是共享库存，本地 `-1` 会说谎），失败把错误抛给页面弹提示 |
| `applyBalance(source)` | **共用**：把响应里的 `points` / `points_value` 写回账户快照（签到与兑换都走它，避免两处各写一遍） |
| `fetchAccount` / `fetchHistory({page})` / `setHistoryType` / `fetchCalendar({month})` / `doCheckin` / `reset` | 动作 |

**改筛选要把页码拉回第 1 页**（`setHistoryType` 已处理）：否则在第 3 页换类型
会落到一个不存在的页码上。

### `checkout.js` — `useCheckoutStore`

购物车结算面板（`Cart.vue`）的「券 + 积分」状态。**券与积分都不在端上算钱**：
服务端的 `sstc.preview_order_amount()` 同时服务 `POST /couponApi/previewUse` 与
`POST /orderApi/createOrder`，所以试算多少、下单就扣多少。

| 成员 | 说明 |
| --- | --- |
| `coupons` / `loadingCoupons` / `couponError` | `/couponApi/getAvailable` 的可用券列表（含 `selectable` 与不可用 `reason`） |
| `couponCode` / `usePoints` | 用户当前的选择（**只是意图**，金额由服务端决定） |
| `quote` / `quoting` / `quoteError` / `couponNotice` | 试算结果与状态；`couponNotice` 是「已取消使用该券：…」这类需要解释的提示 |
| `hasQuote` / `hasCoupons` / `selectableCoupons` / `effectivePoints` / `warnings` | 派生 getter。**`effectivePoints` 是 `quote.points_used ?? usePoints`，提交时必须用它**（服务端会把积分下调到上限） |
| `fetchCoupons({amount, productIds})` / `setCoupon(code)` / `setPoints(n)` / `refreshQuote({items})` / `reset()` | 动作 |

两条纪律：**商品为空不发试算请求**（注定 400）；**券被服务端拒绝时自动清空选择**并留一句说明
（`COUPON_NOT_AVAILABLE` / `COUPON_THRESHOLD`），否则用户会一直撞同一个 409。

### `task.js` — `useTaskStore`

任务中心（`/points?tab=tasks`，1.5.0 M5 的两条端点）。

| 成员 | 说明 |
| --- | --- |
| `tasks` / `claimablePoints` / `loaded` / `loading` / `claimingId` / `error` | 清单与加载态。进度由服务端现算，端上不缓存、不自增 |
| `hasTasks` / `claimableCount` | 派生 getter；可领合计**只用服务端的 `claimable_points`**，不在端上求和 |
| `fetchTasks({silent})` / `claimTask(taskId)` / `reset()` | 动作。`claimTask` 成功后**重新拉一次清单**（进度、可领数、按钮四态都要跟着变），失败不吞、抛给页面提示 |

### `invite.js` — `useInviteStore`

邀请中心（`/invite`，1.6.0 M8 的两条 P2 端点）。

| 成员 | 说明 |
| --- | --- |
| `summary` / `loadingSummary` | `GET /inviteApi/getSummary`：邀请码、链接、三态计数、奖励口径、进度、榜单 |
| `records` / `page` / `limit` / `total` / `totalPages` / `loadingRecords` | `GET /inviteApi/getRecords`：分页记录（`invitee_label` 服务端已脱敏） |
| `hasSummary` / `inviteCode` / `inviteLink` / `counts` / `reward` / `progress` / `ranking` / `progressPercent` / `hasRecords` / `hasPrev` / `hasNext` | 派生 getter |
| `fetchSummary({silent})` / `fetchRecords({page})` / `reset()` | 动作 |

三条纪律：**邀请码与链接一律用服务端返回值**（码由 `uuid` 现算、链接由服务端按基址拼，
前端补域名一定会与邮件里的链接分叉）；**奖励数字不自己算**（500 / 200 / 满 3 人 +500 定义在库内常量函数里）；
**发奖时机是「好友完成首单」而不是注册**，所以 `registered` 状态显示「待完成首单」。

### `hero.js` — `useHeroStore`

首页人格位（`HeroSection.vue` 的「会员速览」，1.6.0 M8 的 `GET /heroApi/getHeroPersona`）。

| 成员 | 说明 |
| --- | --- |
| `persona` / `loaded` / `loading` / `error` | 人格位数据；**游客与非会员拿到的是 `{}`** |
| `benefits` / `hasBenefits` / `memberLevelName` / `hasCheckinHint` | 派生 getter；`hasBenefits` 直接看 `persona.benefits` 是否存在 |
| `fetchPersona({silent})` / `reset()` | 动作；失败**保留**上一次速览（一次网络抖动不该把面板清空） |

响应里 `coupons` / `coupon_expiring` / `checkin_available` 是「有才下发」，消费端必须用
`'key' in benefits` / `!== undefined` 判断，**不能写 `|| 0`** —— 那样会把「没有这个能力」显示成「0 张券」。

### `coupon.js` — `useCouponStore`

| 成员 | 说明 |
| --- | --- |
| `list` / `status` / `page` / `limit` / `total` / `totalPages` | 券列表与三态页签 |
| `counts` | 服务端给的角标（`available` / `used` / `expired` / `expiring_soon`）—— **前端不自己数** |
| `availableCount` / `hasAny` / `hasExpiring` / `expiringCount` / `hasNext` | 派生 getter |
| `fetchMine({page})` / `setStatus(status)` / `doClaim(templateId)` / `reset` | 动作 |

角标来自服务端而不是本地 `filter`：列表是分页的，本地数出来的只会是当前页的数量。

### `mail.js` — `useMailStore`

| 成员 | 说明 |
| --- | --- |
| `list` / `page` / `limit` / `total` / `totalPages` / `loadingMessages` / `messagesError` | 通知列表（分页） |
| `unreadCount` / `marking` | 未读数（顶栏角标的唯一来源）与「标为已读」的进行中标志 |
| `preferences` / `hasEmail` / `emailMasked` / `loadingPreferences` / `savingPreferences` | 通知偏好与邮箱状态（`emailMasked` 是服务端脱敏后的值） |
| `log` / `logStats` / `logPage` / `logTotalPages` / `loadingLog` | 邮件投递台账（只读） |
| `hasUnread` / `unreadLabel` / `hasMessages` / `hasPrev` / `hasNext` / `hasLogPrev` / `hasLogNext` / `emailEnabled` | 派生 getter |
| `fetchUnreadCount({silent})` / `fetchMessages({page})` / `markRead(ids)` / `fetchPreferences()` / `savePreferences(patch)` / `fetchMailLog({page})` / `reset` | 动作 |

三条约定值得记住：

1. **角标失败不吵人**：`fetchUnreadCount` 默认 `silent: true` —— 角标是装饰性信息，
   拉失败时保留旧数字、不写错误横幅（只有显式 `silent: false` 才把错误写进 `state`）。
2. **标已读后就地改本地那一行**，不重新拉整页列表（否则会把用户正在看的位置顶掉）；
   `updated === 0` 时不动列表，`marking` 无论成败都必须复位，否则按钮永久禁用。
3. **换号/登出必须 `reset()`**（`App.vue` 里 `watch(userId)` 负责）：不清就会把上一个账号的
   角标与通知留给下一个人。

文案与枚举都在 `src/constants/mail.js`：三个页签、通知级别 → `.u-tag--*` 变体、
通知类型 → 中文分组名（先查精确表再按前缀兜底）、六个开关的中文名与说明、邮件状态中文名。
**中文名归前端**：后端 `notification_preferences` 只有六个布尔列与列注释，
前端再抄一份或后端再存一份都会变成两份事实。
`test/mailConstants.test.js` 直接读服务端的迁移 SQL（`docs/migrations/*.sql` 的 CHECK 约束与列清单）
做交叉校验 —— 哪一边先漂移都会在测试里红掉。

### `support.js` — `useSupportStore`

| 成员 | 说明 |
| --- | --- |
| `threads` / `threadsPage` / `threadsLimit` / `threadsTotal` / `threadsTotalPages` / `threadsUnread` / `loadingThreads` / `threadsError` | 我的会话（分页）与总未读（页签角标的唯一来源） |
| `currentNo` / `current` / `messages` / `loadingThread` / `threadError` | 当前打开的会话详情（`current` 含 `contact_email`，`messages` 是全文） |
| `creating` / `created` / `createError` | 提交反馈：进行中标志、成功后的 `{thread_no, message_id, status}`、错误文案 |
| `replying` / `replyError` / `replySent` | 追问的三态（`replySent` 只表示「刚发出去」，刷新后由详情本身说明状态） |
| `hasThreads` / `threadsHasPrev` / `threadsHasNext` / `hasThreadsUnread` / `threadsUnreadLabel` / `hasCreated` / `createdThreadNo` / `hasCurrent` / `hasMessages` / `currentStatus` / `currentEmail` | 派生 getter |
| `createThread(payload)` / `fetchThreads({page})` / `fetchThread(threadNo)` / `reply(body)` / `closeThread()` / `clearCreated()` / `reset` | 动作 |

四条约定值得记住：

1. **`createThread` 成功即返回回执号**，并把 `created` 与 `currentNo` 一起置上；
   失败时**连旧回执号一起清掉** —— 留着旧号会让人以为这次也提交成功了。
2. **追问成功后重新拉一次详情**，不在本地插一条：服务端会同时改状态（用户发言推回
   `open`）与 `message_count`，本地拼一行必然对不上。
3. **404 一律是「没找到这条会话」**：服务端对「不存在」与「不是你的」回同一个码
   （刻意的防枚举），前端不要试图区分。
4. **换号 / 登出必须 `reset()`**（`App.vue` 里 `watch(userId)` 负责）：游客换成另一个
   游客时，上一个人的回执号与会话列表留在页面上等于越权。

文案与枚举都在 `src/constants/support.js`：两个页签、六个分类、四个状态 → `.u-tag--*` 变体、
作者与来源的中文名、四个长度上限。`test/supportConstants.test.js` 逐项对着服务端的
`docs/migrations/*.sql` CHECK 约束与 `src/utils/notification.js` 的常量断言（分类、状态、
作者、来源、上限、邮箱正则），**中文名只在前端存在一份**。

## 6. 组件清单

### 布局与通用

| 组件 | 说明 |
| --- | --- |
| `Navbar.vue` | 固定顶栏：品牌、`NAV_MENU` 导航、**收成图标的搜索**（点击展开并聚焦；**展开前后放大镜位置不变**：浮层右缘固定、向左生长，放大镜是浮层最后一个子元素。收起态与展开态**共用同一套令牌、只有宽度变**，否则点击时盒子会在四套主题里明显长大变方。**收起态隐藏 UA 的搜索清除按钮**（`::-webkit-search-cancel-button`）：收起后输入框只剩图标那样宽，这个 ✕ 会画在放大镜上（搜索后回车、鼠标仍停在框内时最明显）；横向留白统一由 `.u-search` 的内边距承担，输入框自身左右 padding 为 0，收起时它的盒子才是真正的 0）、`ThemeSwitcher`、**会员入口**（`crown` 图标 + `/member`，`v-if="userStore.userId"` —— 与购物车同一条「有身份就显示」，游客也算：未开通的人也要找得到会员中心。等级徽标 `navbar-member-badge` 与购物车件数共用一套微型角标样式，`memberStore.levelName` 为空（未开通）时整块不渲染；等级只由 `aria-label` 读出来，徽标是装饰）、登录/注册按钮或用户头像下拉（「账号资产」组含 个人中心 / 我的订单 / 我的收藏 / 卡密管理 / 每日签到，「会员权益」组含 会员套餐 / 积分中心 / **成长值** / 我的优惠券，末尾是退出登录。**会员中心与消息中心刻意不放进下拉** —— 顶栏皇冠与信封已经是它们，同一个目标两个入口会让人怀疑哪个是真的。面板 `role="menu"`、条目 `role="menuitem"`、触发器 `aria-haspopup`/`aria-controls`/`aria-expanded`，`↓` 展开落焦首项、`↑/↓` 循环、`Esc` 关闭并还焦；`max-height: var(--dropdown-max-height)` + `overflow-y: auto` 解决短视口看不到底；展开动画 180ms）、**消息入口**（信封图标 + `/mail`，`v-if="userStore.isLoggedIn"` —— 未读数是登录才有的概念，游客不显示。角标与会员等级徽标共用一套微型角标样式，未读为 0 时不渲染数字块；未读只由 `aria-label` 读出来，角标是装饰。点开下拉时顺带静默刷新一次未读数。**游客看不到这个信封**：游客的站内通知永远是空的（服务端 `enqueue_notification` 对非注册用户直接返回 false），给一个点进去什么都没有的入口不如不给 —— 游客的诉求（问客服）走 `/support`，入口在页脚与帮助弹窗里）、移动端汉堡 + 抽屉。**不自己拉会员概览**：由 `App.vue` 在身份就绪后统一取（登录 / 换号 / 首屏各一次），顶栏只消费 `memberStore`。毛玻璃写在 `.navbar::before` 上 —— 写在 `.navbar` 上会让 `backdrop-filter` 成为 fixed 后代的包含块，弹窗会被"钉"进导航栏 |
| `SearchBar.vue` | 受控搜索栏（`v-model` + `@submit`），并通过 `defineExpose` 暴露 `focus()` / `blur()` —— 顶栏点搜索图标要能把光标直接送进来。本身不碰 store，过滤规则属于数据层（`shopStore.filteredProducts`） |
| `ThemeSwitcher.vue` | 导航栏右侧的图标按钮 + 样式切换弹窗：五套风格整体切换，或按字号/密度/圆角/强调色/字体族/背景图逐项微调。新增可调项只需在 `theme/presets.js` 的 `CUSTOM_FIELDS` 加一条 |
| `Footer.vue` | 页脚：品牌、简介、社交链接、支付方式、版权与法务链接，文案取自 `constants/content.js` 的 `FOOTER` / `SITE`。底部链接的第一项是**客服中心 `/support`** —— 顶栏信封只给注册用户，游客要有一个不带身份门槛的入口 |
| `LoginModal.vue` | 登录/注册弹窗。登录支持用户名/邮箱/手机号自动判别 `login_type`；注册成功后自动切回登录页签。「忘记密码」与新窗口「微信/QQ 登录」都指向 `HelpModal`（如实说明第三方登录尚未接入）。模态约定见下 |
| `HelpModal.vue` | 通用「说明 + 联系方式」弹窗：标题、引导段、编号步骤、可点的 `tel:`/`mailto:` 联系方式，以及**「去提交反馈」→ `/support`**（`feedback` 属性默认 `true`，弹窗里既然写了「请联系客服」，就得给一个真能到达的地方；`/support` 不需要登录，所以这个按钮对游客同样有效）。联系方式取自 `constants/CONTACT`，与页脚、关于我们共用一份 |
| `SectionHeader.vue` | **区块头**（icon + title + description）。样式定义在 `global.css` 的 `.section-header` 系列，供各 Section 组件复用 |
| ~~`PageHeader.vue`~~ | **已删除**（第三轮）。除主页外的页面不再套同一个页头，各自设计开场 —— 见 §9.9 |

### 区块

| 组件 | 说明 |
| --- | --- |
| `HeroSection.vue` | 首屏 hero：eyebrow / 标题 / 副标题 / 双 CTA / 特性行 + 一个表面面板。**没有**随机星点、浮动 emoji 与光斑 —— 规范排除装饰性渐变与夸张动画 |
| `CategoriesSection.vue` | 商品分类网格，分类卡是真实 `<button>`；**底纹用 `--accent` + 16% 透明度**（跟随主题），分类图标经 `emojiToIconName` 转成线性 `AppIcon` |
| `HotProductsSection.vue` | 热门商品网格，数据源 `shopStore.filteredProducts`（含搜索过滤），含加载 / 错误 / 空三种状态 |
| `AppleIdSection.vue` | 汇总两个数据源的 Apple ID；加载与错误状态取自 `toolStore.appleIdsLoading` / `appleIdsError` |
| `KamiSection.vue` | 卡密管理主体。`a-table` 卡密列表（状态筛选、刷新、分页、卡号脱敏）与激活表单；游客态显示登录提示 |

### 卡片

所有卡片共用 `global.css` 里的 `.ui-card` 外壳（背景 / 圆角 / 阴影 / hover 位移），
以及 `.ui-card-media`（媒体区固定比例 + 图片裁切 + hover 放大）。
卡片组件本身只保留各自特有的内部布局。

### 会员

| 组件 | 说明 |
| --- | --- |
| `MemberLevelLadder.vue` | **等级阶梯表**（8 档：等级 / 成长值门槛 / 消费折扣 / 积分倍率），`/member/plans` 与成长值页共用一张表。数据是服务端 `getMemberPlans` 的 `levels[]`，**门槛与倍率原样展示**（前端不抄第二份数字），折扣只经 `constants/member.js` 的 `discountLabel` 翻译。`currentLevel` 标的是**生效等级**（付费档与成长值档取高者），只标记不参与计算；`levels` 为空时整块不渲染。`showRewards=false` 时藏掉折扣与倍率两列（成长值页只有门槛数据，留着会渲染成一片空白） |

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
| `ToolPageShell.vue` | **工具页公共壳**：页头（`eyebrow` / `AppIcon` + 标题 / 简介）+ 返回工具页按钮 + 主区（默认插槽）+ 侧栏（`#aside` 插槽，无插槽时整页单列）+ 可选的「需卡密激活」标注。五个工具页共用，新增工具页只需给它标题与图标 |
| `ToolResultPane.vue` | **工具页结果区四态**：`empty`（`.u-empty` + 可填 `#empty-actions`）/ `loading`（`role="status"` + `aria-busy`）/ `success`（`#actions` 放主操作）/ `error`（`role="alert"` + `#error` 重试）。状态名与文案由调用页给，组件不认业务 |
| `AppleIdCard.vue` | Apple ID 账号卡：账号、密码（可显隐、可复制）、状态、地区、更新时间 |

### 卡密与 Apple ID

| 组件 | 说明 |
| --- | --- |
| `KamiSection.vue` | 卡密管理主体。两个 tab：`a-table` 卡密列表（状态筛选、刷新、分页、卡号脱敏与复制）和激活表单（**工具可选**：工具卡先选工具，积分卡只填卡号；成功后补一句「已发放 N 积分 / N 成长值」） |
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

**请求拦截器**：
1. 若调用方已显式设置 `Authorization`，**原样放行**（刷新请求就靠这个带上 refresh token）
2. **主动刷新**：本地解 access token 的 `exp`，剩余不足 **30 秒**就先刷新再发请求
3. 注入 `Authorization: Bearer <token>`（每次从 localStorage 读最新值 —— 不能在 `axios.create` 时求值，那样拿到的永远是模块加载时的 `null`）

**响应拦截器**（成功分支）

1. 读取响应头 `access-token` / `refresh-token` 并写入本地存储（后端头名为 `Access-Token` / `Refresh-Token`，axios 会小写化）；拿到新凭据时**清掉刷新失败记录**
2. 若响应体 `code === 401` 且不是刷新请求本身，则调用 `refreshToken()`，成功后用新 token 重放原请求；刷新失败则清理凭据并触发 `setAuthExpiredHandler`
3. 最后返回 `res.data`（**所有调用方拿到的是服务端 JSON 报文，不是 axios response**）

**响应拦截器**（失败分支）：把服务端 `message`/`status`/`code` 透传出去（不再压成固定字符串），超时会有专门提示。

#### 长短 token 与无感刷新

| 项 | 值 | 位置 |
| --- | --- | --- |
| access token（短） | 180 秒 | server `src/config/keyOptions.js` |
| refresh token（长） | 7 天（**滑动**：每次刷新重签，活跃用户不掉线） | 同上 |
| 提前刷新量 | 30 秒 | `request.js` 的 `REFRESH_SKEW_MS` |
| 刷新失败冷却 | 5 秒 | `request.js` 的 `REFRESH_FAIL_COOLDOWN_MS` |

**为什么要主动刷新。** 原先只在收到 401 时才刷新，于是每次过期都要白跑一趟：

```
请求 → 401 → 刷新 → 重放        3 个请求，第一个纯浪费，且这个请求的延迟翻倍
```

现在提前在本地判断（读 JWT 的 `exp`，**不发请求**）就能省掉那一趟：

```
刷新 → 请求                    2 个请求，没有一个白跑
```

两处刻意的设计：

- **懒判断而不是定时器**：只有真要发请求时才检查，后台标签页因此不产生任何刷新流量（不需要 `visibilitychange` 逻辑）
- **失败不阻断本次请求**：仍照常发出去，由 401 兜底路径接手。主动刷新只是「优化」，不该成为新的失败点

**401 兜底路径完整保留。** 主动刷新覆盖不到两种情况：客户端时钟偏差、服务端提前失效
（例如密钥轮换）。那时本地以为「还没过期」，只能靠 401 恢复 —— 这条路径没动，
`test/request.test.js` 的 14 条用例全部照常通过。

`decodeTokenPayload` **不验签**：token 是我们自己签的，前端也没有密钥，验签本来该由服务端做。
读 `exp` 只是为了「别带着一个必然过期的 token 出门」，读错了最坏结果是一次多余的刷新请求；
服务端仍会照常拒绝被篡改的 token，**安全边界没有下移**。解码失败一律返回 `null` 而不抛错 ——
它会被每个请求调用一次，抛错等于整站不可用。

### `src/api/ask/`

| 模块 | 导出 | 对应后端 |
| --- | --- | --- |
| `user.js` | `visitorLogin`、`login`、`register` | `POST /user/visitorLogin`、`/user/login`、`/user/register` |
| `userApi.js` | `getUserInfo`、`updateProfile(patch)`、`uploadAvatar({image})` | `GET /userApi/getUserInfo`、`PUT /userApi/profile`、`POST /userApi/avatar` |
| `shop.js` | `getCategories(params)`、`getProducts(params)`、`getProduct(id)` | `/class/getCategories`、`/shop/getProducts`、`/shop/getProduct/:id` |
| `toolApi.js` | `getTools`、`getToolClasses`、`getTool`、`getAppleIds` | `/toolApi/*` |
| `kami.js` | `getUserCards(user_id, params)`、**`getMyEntitlements()`**、`activateCard(data)`（`tool_id` 可选）、`verifyCard(data)`、`verifyCards(data)` | `/kamiApi/*` |
| `cart.js` | `getCart`、`addItem`、`updateItem`、`removeItem`、`clearCart` | `/cartApi/*` |
| `order.js` | `createOrder`、`getOrders`、`getOrder(orderNo)`、`cancelOrder`、`completeOrder` | `/orderApi/*`；`createOrder` 的 payload 自 1.5.0 M2 起可带 `coupon_code` / `use_points`（**只表达意图**，抵扣金额由库内 `sstc.preview_order_amount()` 现算） |
| `favorite.js` | `getFavorites({target_type})`、`addFavorite`、`removeFavorite` | `/favoriteApi/*` |
| `member.js` | `getOverview`、`getPlans`、`getGrowthHistory`、**`getBenefits`** | `/memberApi/getOverview`、`/memberApi/getPlans`（**游客可读**）、`/memberApi/getGrowthHistory`（成长值明细 + 汇总 + 来源规则）、`/memberApi/getBenefits`（权益公开页：文案 + 档位矩阵 + FAQ，**无令牌仍 401**，游客身份可读） |
| `points.js` | `getAccount`、`getHistory(params)`、`checkin`、`getCheckinCalendar(params)`、**`getMallItems`**、**`redeem(itemId)`**、**`replenishCheckin(date)`** | `/pointsApi/*`；商城的 `stock` 只认服务端（`null` = 不限量、`0` = 已兑完），兑换失败码 `ITEM_NOT_FOUND` / `MEMBER_ONLY` / `OUT_OF_STOCK` / `POINTS_NOT_ENOUGH`（后者带 `details.shortage`）；补签**必须传日期**，与签到相反，失败码 `CHECKIN_DATE_INVALID` / `ALREADY_CHECKED` / `REPLENISH_LIMIT` / `POINTS_NOT_ENOUGH` |
| `coupon.js` | `getMine(params)`、`claim(template_id)`、**`getAvailable({amount, productIds})`**、**`previewUse(payload)`** | `/couponApi/*`；后两条是 1.5.0 M1 的结算端点，与 `createOrder` **同一个库内函数**，所以「试算多少、下单就扣多少」 |
| `task.js` | `getTasks()`、`claim(taskId)` | `/taskApi/*`（2 个端点，1.5.0 M5）；进度由服务端现算，领奖成功后要重拉清单 |
| `invite.js` | **`getSummary()`**、**`getRecords(params)`** | `/inviteApi/*`（2 个端点，1.6.0 P2）；码由服务端从 `uuid` 现算、`invitee_label` 服务端已脱敏、链接由服务端按站点基址拼（未配基址时是相对路径 `/?invite=CODE`） |
| `hero.js` | **`getHeroPersona()`** | `/heroApi/getHeroPersona`（1.6.0 P2）；**游客与非会员拿到 `{}`**（`benefits` 整块缺席），`coupons` / `coupon_expiring` / `checkin_available` 都是「有才下发」 |
| `mail.js` | `getMessages(params)`、`getUnreadCount()`、`markRead(ids)`、`getPreferences()`、`updatePreferences(patch)`、`getMailLog(params)` | `/mailApi/*`（6 个端点，见 `server/docs/API.md` §4.23） |
| `support.js` | `createThread(payload)`、`getThreads(params)`、`getThread(threadNo)`、`reply(threadNo, body)` | `/supportApi/*`（4 个端点，**游客可用**，见 §4.24）；会话对外只有回执号 `FB…`，401 是「没带 token」，404 一律 `THREAD_NOT_FOUND` |

> **2026-10-16（1.5.0 M7）**：1.5.0 的四批端点（M1 结算试算、M3 商城、M4 补签、M5 任务、
> M6 权益公开页）在服务端全部落地后，前端这层也补齐了 —— 上面加粗的六条就是这轮接的。
> 之前的注释写着「`getBenefits` 与 `task` 故意先不写，否则只会得到一批永远 404 的函数」，
> 那是对**契约先于实现**阶段的正确做法，现在服务端已经实现，这段历史注释随之作废。
>
> **2026-10-16（1.6.0 M8）**：最后三条 P2（`inviteApi` ×2、`heroApi` ×1）在服务端落地后，
> 前端也接完了 —— **API.md 里写下的 68 个端点现在全部有调用方**，不再有「有契约为没人调」的接口。

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
| ~~`useEmoji`~~ | **已删除** | 原先提供 emoji → `linear-gradient(...)`（约 200 条映射），是「多色底纹由 emoji 决定」的旧方案。图标统一为线性单色后无人引用，连同它的两个测试文件一并删除 |
| `useSimpleTimeFormatter` | `toDate` / `formatISOTime` / `parseISOTime` / `getFriendlyTime` 等 | 基于 dayjs + `utc`/`timezone` 插件的时间格式化，默认时区 `Asia/Shanghai` |
| `useToast` | `notify.success/warning/error/info` | 提示框门面，供组件内外统一调用（路由守卫与 store action 也用它） |
| `useKamiDisplay` | `getStatusText` / `getStatusVariantClass` / `STATUS_VARIANT` / `formatCardDate` / `resolveToolName` / `toToolOptions` / `STATUS_FILTER_OPTIONS` / `KAMI_TABLE_COLUMNS` | 卡密展示层**纯函数**。状态文案与样式变体用 `lookupOr` 查表以避开原型链；`getStatusVariantClass` 产出 `u-tag--*` 类名（`disabled` 与未知状态走 `u-tag--muted`）；工具 id 兼容数字与字符串 |
| `useKamiActivation` | `activateCode` / `selectedToolId` / `activationResult` / `activating` / `activate()` / `resetForm()` / `clearResult()` | 卡密激活流程的状态与提交逻辑，依赖注入 `activateCard` / `getUserId` / `onActivated`。**不校验工具**：是否要工具由服务端按卡类型判断，没选工具时 payload 里**不带 `tool_id` 键**（不适用就不下发） |

> `useKamiActivation` 有一条与其他 hook 不同的约定：**激活成功后若列表刷新失败，
> 仍报告成功**（文案附「请手动刷新」）。因为卡密在服务端已经生效，
> 报失败会诱导用户重复激活。

## 9. 样式体系

全站支持**五套可切换的设计风格**，且每套风格从「风格语言」（颜色/字体/阴影/动效）
到「组件尺寸」（输入框高度、按钮圆角、卡片宽度、模态框宽度……）都完全由设计令牌驱动。
令牌清单与用法见 [`src/assets/README.md`](src/assets/README.md)。

### 9.0 图标：一律用 `AppIcon` 的线性单色图标

**界面里不得再用 emoji 当图标。** 这不是审美偏好，是两条硬约束：

1. **emoji 的颜色不受 CSS 控制** —— 它由字体渲染成彩色位图，`color` 对它无效，
   于是「悬停变色」「五套主题的强调色」在这些位置**全部失效**；
2. 字形随平台/字体变化，同一个页面在不同系统上观感不一致。

因此所有图标走 [`AppIcon.vue`](src/components/AppIcon.vue) + [`utils/iconSet.js`](src/utils/iconSet.js)：

| 项 | 约定 |
| --- | --- |
| 颜色 | **只来自 `currentColor`**，组件里不写任何颜色 → 天然跟随主题令牌 |
| 尺寸 | `1em`，跟着所在位置的 font-size（也就跟着主题的字号缩放）走走，不必逐个指定像素 |
| 描边 | 24 网格上 2.5，`stroke-linecap/linejoin` 都是 round（线条偏粗且圆滑） |
| 实心 | `filled` prop（填充色仍是 currentColor）—— 用于「收藏/未收藏」这类二元状态 |
| 无障碍 | 默认 `aria-hidden`；图标按钮把 `aria-label` 给 `<button>` |

**数据库里的 emoji 是「数据」，不改造数据。** `sstc.tools.icon` 与
`product_categories.icon_url` 存的就是 emoji（运营录入习惯），渲染端用
`emojiToIconName()` 映射成图标名；**映射不到时原样显示那个 emoji** ——
运营随时可能录一个表里没有的（🚀），不能因为不认识就渲染成空白。

> `emojiToIconName` 内部走 `utils/safeLookup.js` 的 `lookup`，**不能写成
> `EMOJI_TO_ICON[key]`**：键来自外部数据，而普通对象会沿原型链查找，
> `'toString'` 会取到 `Object.prototype.toString` 那个函数（本项目已踩过这个坑）。

两个守卫测试把这件事钉住（`test/noEmojiIcons.test.js`）：

- 剥掉注释后全仓扫描，任何 `.vue`/`.js` 里出现 emoji 即失败（`©` 与映射表本身除外）；
- **映射表必须覆盖数据库里实际存在的 emoji**（当前是 `🎬 💻 📝 🖼️` 与 `💬`）——
  这条是照真实数据定的，漏一个那张卡片就会渲染回彩色 emoji。

> 历史：分类卡的底纹原先由 emoji 算出一个多色渐变（`hooks/useEmoji`），
> 那是「颜色由 emoji 决定」的旧方案。图标统一后该模块无人引用，已连同它的
> 两个测试文件删除；底纹改为 `--accent` + 低透明度（跟随主题）。

### 9.1 五套风格

| id | 名称 | 底色 | 强调色 | 风格语言 |
| --- | --- | --- | --- | --- |
| `tech-minimal`（默认） | Tech Minimal 暗色科技极简 | `#0a0a0a` | `#3b82f6` | 无阴影、1px 边框分层；标题 Inter；价格 JetBrains Mono（小数小一号）；入场 translateY 12px，60ms 递增 |
| `liquid-glass` | Liquid Glass Commerce 液态玻璃·电商 | 紫粉渐变网格 | `#6366f1` | 半透明面板 + `blur(16px) saturate(180%)`（悬停与聚焦提到 24px）；入场 scale 0.96 带弹性；背景网格 20s 流动 |
| `bento-editorial` | Bento Editorial 便当盒编辑风 | `#f7f7f5` | `#d62872` | 边框驱动而非阴影驱动；大卡片标题 Playfair Display；价格 Oxygen 且无小数 |
| `neo-brutalism` | Neo-Brutalism Accent 新粗野主义·点缀 | `#ffffff` | `#ff6b35` | 2px 纯黑描边 + 零模糊硬阴影；主按钮 `6px 6px 0 #000`、悬停 `translate(3px,3px)`、`0.1s linear`；卡片硬投影 `4px→8px`；标题压缩大写 |
| `technical-monochrome` | Technical Monochrome 技术单色·等宽 | `#0d0d0d` | `#22c55e` | 等宽字体贯穿所有层级；4-6px 小圆角；价格 `$` 前缀 + `#141414` 底色、无小数；悬停只换边框色（卡片描边转绿） |
| `bento-editorial` 补充 | — | — | — | 大标题的中文走 `Songti SC / Noto Serif SC / SimSun` 衬线回落（Playfair 无 CJK 字形），所以它的 `h1` 比其余四套窄约 28px —— 属「允许改字体」的范畴，不影响整页高 |

> **尺寸不参与风格区分。** 上表只描述颜色 / 字体 / 圆角 / 阴影 / 动效这些不改变盒子几何的差异；
> 组件的高宽与间距五套完全相同，见 9.2。
>
> 一处已知偏差：`technical-monochrome` 声明「等宽贯穿所有层级」，但等宽只对**拉丁与数字**
> 成立 —— JetBrains Mono 不含 CJK 字形，中文回落到 `PingFang SC / Microsoft YaHei`
> 这类**比例**字体。要真正等宽需引入固定宽度的中文字面（NSimSun / Sarasa Mono SC 等），
> 那会改动全部中文的度量与换行，收益不明而风险明确，故**有意保留现状**。

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
**逐断点真机实测**（headless Chrome，iframe 逐套重载 `/home`，同一份数据；数字是整页高 px）：

| 视口宽 | tech | glass | bento | neo | mono | 极差 |
| --- | --- | --- | --- | --- | --- | --- |
| 1440 | 4877 | 4877 | 4877 | 4886 | 4877 | 9px |
| 1199 | 4467 | 4467 | 4467 | 4476 | 4467 | 9px |
| 991 | 4075 | 4075 | 4075 | 4087 | 4075 | 12px |
| 767 | 5954 | 5954 | 5954 | 5978 | 5954 | 24px |
| 575 | 5727 | 5727 | 5727 | 5753 | 5727 | 26px |
| 390 | 5727 | 5727 | 5727 | 5753 | 5745 | 26px |

组件尺寸在六断点 × 五主题下全部一致：导航 64px、≤767 档 54px，
输入框 / 搜索框 / 图标按钮 38×38（仅 neo 因 2px 描边为 36×36）。
残留的 9–26px 只来自两个允许的来源：**字体族不同导致的文本换行差异**，
以及 **neo 的 2px 描边**（它比其余四套粗 1px，是风格签名）。

> ⚠️ **主题差异只能走令牌，不得在组件里按 `data-theme` 分叉。**
> 曾经有一条 `:root[data-theme='bento-editorial'] .products-cell--featured
> { grid-column: span 2 }`（理由是「只有 bento 定义了大卡片 400px」，
> 而那个 400px 已随尺寸统一并入 280px）—— 令牌层再干净，一条这样的规则就能绕过去：
> 1199px 与 991px 下 bento 的九个商品从 3 行变 4 行，整页高多出 **475px**。
> 现在由 `test/themeContract.test.js` 的「组件样式不得按主题分叉」扫全部
> `.vue` / `.css` 拦住（剥注释后匹配 `[data-theme=`）。

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
| 事务页外壳 | `.page-shell` / `.page-shell--narrow`（窄页族九个阅读型页面：会员中心、会员权益详解、成长值、每日签到、会员套餐、积分中心、我的优惠券、消息中心、客服中心） / `.page-shell-head(--row)` / `.page-shell-eyebrow/title/title-link/desc` |
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

**窄页族另有一条宽度契约**（2026-10-12 统一，2026-10-13 加入消息中心，2026-10-14 加入客服中心，
2026-10-15 随会员体系重构换血：`Checkin` / `PointsHistory` 退出，`MemberBenefits` / `MemberGrowth` / `UserCheckin` 加入）：
会员中心 / 会员权益详解 / 成长值 / 每日签到 / 会员套餐 / 积分中心 / 我的优惠券 / 消息中心 / **客服中心**这些
阅读型页面用 `.page-shell--narrow`，
宽度只认 `--container-page-narrow`（`clamp(960px, 72vw, 1180px)`，随视口收敛）。
页面自己**不得**再声明 `max-width`，否则同族页面在宽屏上会各走各的比例 ——
`test/componentClasses.test.js` 的「窄页族宽度契约」用例把关。
`--container-narrow`（1000px）保持固定值不动：它是 Hero / KamiSection /
NotFound 里几处 `calc(var(--container-narrow) * N)` 派生宽度的基准，也是
About / Footer / Kami / Tool 这几个页面的固定页宽，改成流体值会让它们一起漂移。
（2FA 页原先也用它压窄，改造为工具页骨架后已改为整宽 + 页壳，不再依赖这个令牌。）
个人中心（`/user/profile`）**有意不进这一族**，它是双栏面板版式。

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

### 9.12 组件套件（第五批：会员与邮件域，前缀 `.u-mm-`）

会员与邮件是**业务复合件**，既不是 `.u-*` 原子层（按钮/输入/标签），也不是 `global.css` 的
`.ui-*` 通用复合层（卡片/抽屉），因此单独成第五个分片 `src/assets/styles/ui-kit-member.css`
（24 节、208 个选择器块、全部由既有原子拼装，不定义任何新令牌）：

| 段 | 覆盖 |
| --- | --- |
| §1–§4 共享层 | 区块壳 `u-mm-section`、**四态容器 `u-mm-state`**（未登录/骨架/错误/空态）、元信息行 `u-mm-meta`、分页壳 `u-mm-pager` |
| §5–§19 会员域 | 等级徽章、身份卡、资产摘要卡、成长进度、权益格、等级阶梯、权益矩阵、套餐卡、优惠券卡、签到格、积分余额、流水行、任务条目、商城条目、待办条 |
| §20–§24 邮件域 | 通知条目、偏好开关行、联系邮箱、台账统计卡、台账行 |
| §25 布局 | `u-mm-hub` / `u-mm-detail` / `u-mm-split` 三个页面骨架 |

三条纪律（与其余分片一致，`test/designTokens.test.js` 与 `test/componentClasses.test.js` 守着）：

1. **只定义 `.u-mm-*` 类** —— grep 复核过，文件里除三条 `@media` 外没有任何裸元素/全局选择器，
   所以「引入但页面还没用」时**零视觉影响**（这正是本次能安全先落分片、再逐页迁移的前提）。
2. **只用令牌**，不写字面颜色/尺寸；**几何值五主题完全一致**（不定义令牌即天然满足）。
3. **断点只用 1199 / 991 / 767 / 575 字面量，且每个断点在本文件里只出现一次**。

它解决的三个已存在的事实问题（写在文件头）：**四态被六个页面各抄一遍**（`*_state` 类名六套）、
**权益矩阵的列定义有两份**（`MemberBenefits.vue` 与 `MemberGrowth.vue` 各写一份 `MATRIX_COLUMNS`）、
**邮件偏好键二次硬编码**（`constants/mail.js` 的 `PREFERENCE_KEYS` 与 `Mail.vue` 的 `draft` 各写一遍）。

> 现状（2026-10-16）：分片已纳入构建与共享样式守卫，迁移按页面逐个走（先共享层的四态/区块壳，
> 再域件），每页独立提交。**已完成**：七页的四态收敛到 §2（`Member` / `MemberPlans` /
> `MemberGrowth` / `Coupons` / `Points` / `UserCheckin` / `Invite`）；**矩阵列定义已收敛**到
> `constants/member.js` 的 `MEMBER_MATRIX_COLUMNS` + `memberMatrixColumns()`（两页只覆盖各自标题）；
> **邮件偏好键已收敛**到 `constants/mail.js` 的 `PREFERENCE_KEYS`（`Mail.vue` 的草稿由它生成）。
> 文件头列的三个既有问题至此都已消除，**只剩域件（§5–§25）的逐页迁移**。
>
> 域件迁移进度：**已迁移** `/coupons`（§13 券卡 + §4 分页壳）、`/user/checkin`（§14 签到格）、
> `/points`（§15 余额 + §16 流水 + §17 任务 + §18 商城条目 + §4 分页壳）、`/mail`（§20 通知条目 + §21 偏好行 +
> §22 邮箱卡 + §23 统计卡 + §24 台账 + §4 分页壳）、`/member`（§6 身份卡 + §7 资产摘要 + §8 成长进度 +
> §9 权益格 + §19 待办条 + §23 统计卡）、`/member/plans`（§12 套餐卡 + §23 统计卡，等级阶梯随
> `MemberLevelLadder` 走 §1 + §10）、
> `/member/growth`（§1 + §8 + §10 等级阶梯 + §11 权益矩阵 + §16 明细行 + §4 分页壳）、
> `/member/benefits`（§11 权益矩阵 + §26 的「一档一卡」移动端降级 + §2 空态；八项权益的富卡片
> 是「说明书」式内容，与 §9 概览格的内容模型不同，按变更记录显式留边界）；
> **待迁移** 页面级骨架 §25（§5 等级徽章只在页面内联使用，未单独建模条目）。

### 9.13 组件套件（第六批：工具页骨架，前缀 `.tool-`）

五个工具页要长得一样，因此把它们共用的骨架单独成第六个分片
`src/assets/styles/ui-kit-tool.css`（7 节，全部由既有原子拼装，**不定义任何新令牌**，
因此 `test/kitAllowlist.js` 保持为空）：

| 段 | 覆盖 |
| --- | --- |
| §1 布局 | `tool-layout`（主区 + 侧栏两列）、`tool-layout--single`、`tool-main`、返回按钮、页头里的标题图标与「需卡密」标注 |
| §2 面板 | `tool-panel`（与 `.ui-card` 合写）、面板标题 |
| §3 输入区 | `tool-form`、`tool-actions`、`tool-textarea`、拖放区 `tool-file-drop(--active)`、文件名 |
| §4 结果区 | `tool-result`、加载块、成功体、操作行、错误块（`--danger`）、结果元信息行 |
| §5 输出 | `tool-preview`（等宽、可滚动、保留换行）、媒体预览 |
| §6 侧栏 | `tool-aside`、`tool-aside-card`、标题、列表、注意事项、跳转链接 |
| §7 响应式 | ≤991 折单列；≤767 面板内边距 × `--mobile-padding-scale`、操作按钮竖排撑满 |

三条纪律与其余分片一致：**只定义 `.tool-*` 类**（不含裸元素选择器，未使用时零视觉影响）、
**只用令牌**、**断点只用 991 / 767**。`test/componentClasses.test.js` 的 `SHARED_STYLES`
已登记本分片 —— 否则「模板里用了 `.tool-*` 但共享样式没定义」会被判为失败。

### 9.14 硬编码与断点纪律

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

`vite.config.js` 为每个后端前缀逐条配置了开发代理：`/user/login`、`/user/register`、
`/user/visitorLogin`、`/user/refreshToken`、`/userApi`、`/shop`、`/class`、`/toolApi`、`/kamiApi`、
`/cartApi`、`/orderApi`、`/favoriteApi`、`/memberApi`、`/pointsApi`、`/couponApi`、`/taskApi`、`/inviteApi`、
`/heroApi`、`/mailApi`、`/supportApi`、`/uploads`、`/userBackend`、`/health`，
默认指向 `http://localhost:8080`（可用 `VITE_API_TARGET` 覆盖）。
由于 `/user` 下既有后端接口也有前端路由（`/user/kami`、`/user/orders` 是页面），代理只列了四个具体接口
而非 `/user` 前缀 —— **新增后端接口时若路径不在上述之内，需要同步在这里加代理规则**，
否则该接口在 dev 下会 404（打到 dev server 自己，不会转发给后端，而且返回的是 index.html，
前端拿到一段 HTML 去解析，报的却是「网络错误」，排查方向会被带偏）。

> **这条规矩有机器守卫了**：`test/devProxy.test.js` 把「`src/api/ask/*.js` 的每条调用路径」
> 与「`vite.config.js` 的 proxy 键」做静态比对（整条路径命中，或它的第一段命中），
> 跑 `npm test` 就会拦下漏配。`npm run verify:dev` 在此基础上再**真实请求**三个交易前缀、
> `/mailApi`、`/supportApi` 与 `/uploads`，确认返回的是 JSON 而不是 index.html。
> 本项目踩过两次同一个坑（v1.1.0 的 member/points/coupon，v1.3.0 的 mail/support），
> 第二次是被 `verify:dev` 抓住的 —— 但它要起服务，所以同一套判定规则也进了默认门禁。
> **1.5.0 M7 新增 `/taskApi`**：proxy 表里补了这一键，`devProxy.test.js`
> 与 `verify:dev` 都因此是绿的（`/taskApi` 已在 `src/api/ask/task.js` 里被调用）。
> **1.6.0 M8 又新增 `/inviteApi` 与 `/heroApi`**：同样先补 proxy 再写调用方。

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
npm test             # 单元测试（node:test，共 974 个用例）
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

`vue/no-undef-components` 也已关闭：它按「模板标签是否在组件内注册」判断，而本项目
大量使用原生标签与 `u-*` 组件类，开启后误报多于收益。
（移除 `unplugin-vue-components` 之前，这条规则是因为 `a-*` 自动导入而关闭的。）

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
├── noEmojiIcons.test.js                # 界面不得再用 emoji 当图标（剥注释后全仓扫描）+ 映射表覆盖数据库实际取值
├── useToken.test.js                  # token 双存储读写与响应头提取
├── appIcon.test.js                    # 线性图标体系：颜色只来自 currentColor、模板引用的名字都存在
├── navbarSearch.test.js              # 顶栏搜索：点击展开（悬停不展开）、**展开前后放大镜位置不变**、焦点只在本块内移动时不收起、**收起态隐藏原生清除按钮且不留横向内边距**
├── navbarMember.test.js              # 顶栏会员入口：有身份即显示（游客也算）、等级徽标只对会员渲染并读进 aria-label、入口本体不是 button 套 router-link
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
├── growthPage.test.js                # 成长值页：汇总/进度/来源规则/明细/空态/错误态/分页，满级时进度块整块不渲染
├── mailConstants.test.js              # 消息中心文案/枚举 ⇄ 服务端迁移 SQL 交叉校验（通知级别、偏好六列、邮件状态、总开关）
├── stores.mail.test.js                # 消息 store：角标静默失败、标已读的连点保护与本地同步、偏好只提交差异、台账与 reset
├── mailPage.test.js                   # 消息中心页（SSR）：三页签、未读圆点与按钮、空/骨架/错误态、分页、无 Vue 警告
├── navbarMail.test.js                 # 两个入口的身份边界：注册用户才见顶栏信封与未读角标；页脚与帮助弹窗的 /support 对游客开放；下拉里不再重复消息中心
├── navbarUserMenu.test.js             # 头像下拉：不与顶栏重复（无会员中心/消息中心）、分组与排序、图标位一致且图标名已登记、↑↓/Home/End/Esc 与还焦、可滚动与 180ms 动画、767 断点 44px 触控
├── supportConstants.test.js           # 客服中心文案/枚举 ⇄ 服务端迁移 SQL 与 constants 交叉校验（分类、状态、作者、来源、四个上限、邮箱正则）
├── stores.support.test.js             # 客服 store：开单记回执号与连点保护、会话列表与详情、404 文案、追问后重拉详情、reset
├── supportPage.test.js                # 客服中心页（SSR + 源码断言）：游客/注册的邮箱提示分叉、表单上限、回执卡取代表单、无 Vue 警告
├── renderIdentity.test.js            # 顶栏的身份呈现：游客显示头像与标记、退出后显示登录按钮
├── stores.member.test.js             # 会员 store：levels 初值 null 与 hasLevels 判据、benefits 未解锁项无 value 键、fetchPlans 六列原样保留、失败回退
├── memberBenefitValue.test.js        # 权益数值翻译：rate/multiplier/money/percent/quota/tier 六种 type 与「0 与不限」的区别、未知类型不产出 undefined
├── profilePage.test.js               # 个人中心布局：摘要/签到两张卡都要有下外边距、签到卡必须横向（.ui-card 是纵向）、两栏面板窄屏回落
├── pointsPage.test.js                # 积分中心流水列表：每条横向排版且可换行、左右两端对齐、极窄屏退回两行、**列表行（挂了 .ui-card）必须显式 flex-direction: row**
├── stores.points.test.js             # 积分 store 的商城部分：fetchMall 落库/失败保留旧清单、兑换用服务端返回的 item 覆盖（不做本地 -1）、失败抛出且不留 redeemingId、applyBalance、reset
├── stores.task.test.js               # 任务 store：清单落库与可领数、失败保留旧清单、领奖后重拉（断言 POST 再 GET 的顺序）、失败抛出、reset
├── taskDisplay.test.js               # 任务/商城展示纯函数：周期文案、进度百分比（target 为 0 不炸）、按钮四态（**回归：未完成不能显示成「自动发放」**）、库存与不可兑理由
├── checkoutUtils.test.js             # 结算口径纯函数：积分校验（空/小数/非 100 倍/超上限收口）、上限取金额与余额的较小者、明细行筛选与「实付」文案、券选项文案
├── stores.checkout.test.js           # 结算 store：券与试算一起发、不用券时不发字段、空购物车不发请求、被下调时提交用 points_used、券被拒自动清选择、商品错误不迁怒于券、reset
├── stores.invite.test.js             # 邀请 store：概况落库与 URL、失败保留已显示的邀请码、记录脱敏字段与分页、失败清空、reset
├── stores.hero.test.js               # 首页人格位 store：游客的 {} 不记错、会员缺键不补 0、checkin_available 只认 true、失败保留旧速览、401 不记错、reset
├── checkinReplenish.test.js          # 补签展示纯函数：可补签判定与五种理由的优先级、格子标题、失败码文案（含 shortage）、规则文案
├── api-contract.test.js              # 前后端接口契约（跨仓库静态校验）
└── devProxy.test.js                  # dev 代理覆盖：每条 API 调用路径都能被 vite proxy 接住（静态，不需起服务）
```

共 974 个用例。

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

要让 `node:test` 直接跑 `src/` 里的源码，需要补掉两处 Vite 专有特性：

| 特性 | 方案 |
| --- | --- |
| `@/` 别名、省略扩展名的导入（`./ask/user`、`@/hooks/useToken`） | `test/loaders/alias.mjs` 用 `module.registerHooks` 注册同步 resolve 钩子 |
| `import.meta.env` | `test/setup.js` 的 load 钩子注入最小实现（源码无需为可测试而改写） |

> **关于曾经存在的 ant-design-vue 测试替身**：最初是给 `document` 打桩，然后一路补
> `getElementsByTagName` → `createElementNS` → `createComment` → `getComputedStyle`……
> 每补一个就冒出下一个。那是**用桩去追一个 UI 库**，而不是测试被测逻辑。
> 改为在解析层替换成替身后，`setup.js` 的浏览器桩缩到极小。
> **2026-10-12 移除 ant-design-vue 之后，替身与那层桩都不再需要** ——
> 现在渲染类测试走 `@vue/server-renderer`（见 `test/renderComponents.test.js`），
> 不需要 jsdom。若将来确需真实 DOM，应引入 jsdom，而不是继续往桩里加 API。

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

`growthPage.test.js` 用同一套办法测成长值页，其中两个用例专门守「不适用」的口径：
满级时服务端**不下发** `next_level` 三键，进度块必须整块不渲染、且页面里不出现
`undefined`；未登录时登录引导之外的汇总与明细区**都不渲染**（判据用章节 `id`
与 `role="progressbar"`，不要用会出现在文案里的词 —— 第一版就是这么挂的）。

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
