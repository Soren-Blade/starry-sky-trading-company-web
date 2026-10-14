# 变更记录 · 前端（starry-sky-trading-company-web）

本文件按版本倒序记录**对外可见**的变更：页面、路由、store、接口依赖、样式体系。
格式参考 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/)，版本号遵循 [语义化版本](https://semver.org/lang/zh-CN/)。

**版本号规则**：两个仓库共用同一个产品版本号（它们一起部署，前端直接依赖后端契约）。
`1.x.0` 为阶段性功能扩展，`1.x.y` 为缺陷修复，`2.0.0` 为破坏性变更。
阶段内的开发中间态用 `-rc.N` 后缀标记。

---

## [1.3.0] — 2026-10-14 · 消息中心与客服中心（已发布）

站内消息中心 `/mail`、游客可用的客服中心 `/support`，以及顶栏未读角标、页脚与帮助弹窗入口 —— 对应后端新增的 `/mailApi`（6 个端点）与 `/supportApi`（4 个端点）。

### 新增

| 类别 | 内容 |
| --- | --- |
| 页面 | `/mail`（消息中心）：通知 / 通知偏好 / 邮件记录三页签，懒加载后两者；`/support`（客服中心）：提交反馈 + 我的会话（列表 / 详情 / 追问），**游客可用**，支持 `?thread=FB…` 深链 |
| api 模块 | `api/ask/mail.js`（`getMessages` / `getUnreadCount` / `markRead` / `getPreferences` / `updatePreferences` / `getMailLog`）、`api/ask/support.js`（`createThread` / `getThreads` / `getThread` / `reply`） |
| store | `stores/mail.js`、`stores/support.js` |
| 常量 | `constants/mail.js`（通知类型与级别、台账状态、六个偏好开关与兜底函数）、`constants/support.js`（分类 / 状态 / 作者 / 来源 / 长度上限与兜底函数） |
| 入口 | 顶栏信封图标 + 未读数徽标（仅注册用户）、头像下拉「消息中心」、页脚「客服中心」、帮助弹窗「去提交反馈」 |

### 变更

- **游客边界**：`/mail` 与整个 `/mailApi` 只对注册用户开放（站内通知的唯一生产者 `enqueue_notification` 对非注册直接返回 false，游客的站内信箱恒空）；`/support` 与 `/supportApi` **刻意不挂 `requireRegisteredAccount`**，游客能提交反馈并看到自己的会话，唯一的收信地址是提交时填写的邮箱
- **客服开单频次上限**：同一身份 24 小时最多 5 次，超限时页面原样展示服务端的 429 文案；游客必填联系邮箱（并提示「这是游客唯一的收信地址」），注册用户按账号邮箱预填、可改
- **未读角标的数字只来自服务端**：`markRead` 后按服务端回传的 `unread` 覆盖本地；标已读就地改本地 `is_read`、失败不谎报；角标刷新失败静默且**不清零**已有数字
- **偏好只提交差异项**：六个开关（总开关 `email_enabled` + 订单 / 会员 / 积分 / 优惠券 / 客服）保存时只发与本地已知状态不同的键；页面说明写明「站内通知不受偏好影响，偏好只管邮件」
- **换号/登出必须 reset**：`App.vue` 在 `watch(() => userStore.userId)` 里同时重置 cart / favorite / member / mail / support 五个 store，避免上一个账号的未读数与会话闪给下一个人
- **中文文案与枚举归前端**：`test/mailConstants.test.js` 与 `test/supportConstants.test.js` 直接读服务端的迁移 SQL 与 `src/utils/notification.js` 做交叉校验（分类 / 状态 / 作者 / 来源 / 长度上限都有唯一事实源），不在前端抄第二份
- **窄页族扩到八个页面**：`/mail` 与 `/support` 一并进 `page-shell--narrow` 族，受 `test/componentClasses.test.js` 的 `NARROW_PAGE_FAMILY` 守卫（必须有窄壳、基础样式不得自设 `max-width`）
- `package.json` 版本号 `1.2.0` → `1.3.0`，与后端保持一致

### 验收

- `npm run lint` 0 问题；`npm test` **862 例**全部通过（739 → 862，本轮共 +123：消息中心 13 + 28 + 14、客服中心 16 + 24 + 16 + 12）
- `npm run build` 成功；`npm run verify:dev` 的代理断言包含 `/mailApi` 与 `/supportApi`
- 真实浏览器核验：桌面 1440 与移动 390 下 `/mail`（登录态三页签、标已读、未读角标）与 `/support`（游客提交反馈 → 拿到回执号 → 看到自己的会话；登录态列表与详情），游客态看不到信封入口

---

## [1.2.0] — 2026-10-12 · 阶段 P1（已发布）

八档会员等级、卡密按面值兑奖、顶栏会员入口与**成长值展示页** —— 对应后端的 P1 端点 `GET /memberApi/getGrowthHistory`。

### 新增

| 类别 | 内容 |
| --- | --- |
| 页面 | `/growth`（成长值）：汇总三数 + 升级进度条 + 来源说明 + 等级门槛表 + 明细分页 |
| 组件 | `components/MemberLevelLadder.vue` —— 等级阶梯表，套餐页与成长值页**共用一张**（门槛/折扣/倍率只用服务端数字） |
| store | `stores/member.js` 新增成长值切片（`growth` / `growthSummary` / `growthRules` / 分页元数据）+ `fetchGrowthHistory()` |
| api 模块 | `api/ask/member.js` 新增 `getGrowthHistory(params)` |
| 图标 | `utils/iconSet.js` 新增 `crown`（顶栏会员入口；成长值快捷入口复用既有的 `flame`） |

### 变更

- **会员等级 v1–v8**：`constants/member.js` 的 `MEMBER_LEVELS` 改为 `none` + `v1`–`v8`（只登记 id 与展示名，门槛 / 折扣 / 倍率一律用服务端下发的数字，防前端抄第二份）；`MEMBER_BENEFITS` 的 `requiredLevel` 由 `star`×4 / `galaxy`×2 改为 `v1`×4 / `v4`×2
- **折扣文案下沉**：`discountLabel(rate)` 从 `MemberPlans.vue` 提到 `constants/member.js` 并加测试（`0.95`→`95 折`、`0.9`→`9 折`；`<=0` 或 `>=1` 一律 `无折扣`，不渲染成「0 折」）
- **卡密激活支持积分卡**：`useKamiActivation` 不再把「选工具」当前置校验，没选工具时 payload **不带 `tool_id` 键**；`KamiSection.vue` 的按钮只要求卡号，成功后补一句「已发放 N 积分 / N 成长值」（键不存在就不显示）
- **顶栏会员入口**：`crown` 图标 + `/member`，与购物车同一条「有身份就显示」规则（游客也算）；等级徽标 `navbar-member-badge` 只对已开通用户渲染，等级只由 `aria-label` 读出
- **窄页族宽度契约**：新增令牌 `--container-page-narrow: clamp(960px, 72vw, 1180px)`，六个阅读型页面由 `.page-shell--narrow` 统一消费（此前该修饰类只有类名、没有 CSS，六个页面实际按 1320 全宽渲染）；`--container-narrow` 保持定值（它同时是 6 处 `calc()` 的固定基准）
- **成长值口径落定**：开会员赠值、订单按实付 1:1、签到 +5、卡密按面值 ×10；只升不降、不过期，会员倍率不参与
- `package.json` 版本号 `1.1.0` → `1.2.0`，与后端保持一致

### 验收

- `npm run lint` / `npm test`（739 例）/ `npm run build` 全绿；`npm run verify:dev` 的 17 项代理断言包含 `/memberApi`（成长值页依赖它）
- 真实浏览器：桌面 1440 与移动 390 下顶栏入口 40×40 / 36×36 不溢出；成长值页与六个窄页在 1920 / 1440 / 1280 三档宽度实测

---

## [1.1.0] — 2026-10-12 · 阶段 P0（已发布）

会员 / 积分 / 权益优惠券 / 成长 —— **前端的 P0 部分已交付**，
与后端的 8 个 P0 端点（见 `server/docs/API.md` §2.1）一一对应。

### 新增

| 类别 | 内容 |
| --- | --- |
| 页面 | `/member`（会员中心）、`/member/plans`（会员套餐）、`/points`（积分中心）、`/points/history`（积分明细）、`/checkin`（每日签到）、`/coupons`（我的优惠券） |
| store | `stores/member.js`、`stores/points.js`、`stores/coupon.js` |
| api 模块 | `api/ask/member.js`、`points.js`、`coupon.js` |

原计划本阶段落地 13 条路由，实际落地 **6 条**：其余 7 条属于任务 / 邀请 / 消息 /
首页个性化，等对应端点实现后再加（见下「未交付」）。

### 变更

- `Navbar`：用户下拉分两组（账号资产 / 会员权益），昵称右侧徽标显示当前会员等级；
  展开下拉时静默刷新一次会员概览（等级可能因客服确认结算而在会话中途变化）
- `Profile`：页头下方新增会员权益摘要条（等级 / 到期天数 / 成长值 / 积分及其折抵金额 /
  优惠券 / 积分过期提醒）
- `App.vue`：会员概览的拉取时机与 `cart` / `favorite` 一致，统一在这里收口 ——
  `Profile` 与 `Navbar` 两处消费，只能有一个拉取者
- `Legal`：用户协议新增「五、会员与积分」（原「五、免责」顺延为「六」），
  平台规则新增「五、会员与积分规则」；同时修掉行内 `**强调**` / `` `代码` ``
  标记被当作字面量显示的问题（改为分段渲染，**没有用 `v-html`**）
- `api/ask/order.js` 的 `createOrder` 支持 `order_type: 'membership'` + `ref_plan_id`
- `package.json` 版本号 `1.0.0` → `1.1.0-rc.1` → `1.1.0`，与后端保持一致

### 修复

- **`u-card` / `u-btn` 在会员 / 积分 5 个页面里从未有过 CSS 定义**
  （项目真正的卡片外壳是 `global.css` 的 `.ui-card`）：卡片没有背景、描边、圆角、
  阴影与内边距，按钮退化回浏览器默认样式。共 47 处纯类名替换，
  **未新增 CSS、未给 `.ui-card` 起别名**（避免出现第二份卡片外壳定义）
- `.u-tag--muted` 同样缺失（卡密「已禁用」状态静默退化成中性标签），已补进标签族
- `KamiSection` 的分页不再提供 antd 的 `showQuickJumper`（输入页码跳转），
  只能逐页点击 —— 自建表格时的有意简化
- **`vite.config.js` 的 dev 代理漏配 `/memberApi` / `/pointsApi` / `/couponApi`**：
  本地开发下这三个 API 前缀的请求会打到 dev server 自己（拿到 `index.html`，
  前端报成网络错误）。已补三条代理，并跑通 `npm run verify:dev` 的 17 项断言
  （含「vite.config.js 的代理能覆盖全部前端 API 调用路径」这条守卫）——
  判据与回滚见工作区根 `docs/changes/2026-10-12-修复dev代理漏配会员积分券前缀.md`
- **`page-shell--narrow` 从未生效**：会员/积分族七个页面（会员中心、会员套餐、
  积分中心、积分明细、每日签到、我的优惠券、个人中心）从写下第一天就带着这个修饰类，
  但全仓 CSS 里没有它的规则（`--container-narrow: 1000px` 只被 `.page-shell-desc`
  用于限制正文行宽），于是它们一直按 `--container-max: 1320px` 渲染。已补规则，
  这七个阅读型页面收窄到 1000px
- **移动端触控热区达不到 44px，其中用户菜单只有 29×55**（视觉 32×32，比视觉宽度还窄）：
  根因是导航栏右侧图标间距只有 8px，全局 `-12px` 的伪元素环在这里互相重叠、
  命中判定「后绘制者胜」。导航栏内改用单独一套 `-6px` 环并抬高用户菜单的叠放层级，
  实测 29×55 → 45×45（主题 44×47，购物车/汉堡 43×47）。另把 `.user-avatar-btn`
  与 `.history-filter-btn` 补进 44px 名单
- 个人中心权益摘要条的折抵金额显示 `≈ ¥0.1`，与积分中心页的 `¥0.10` 不一致，
  现统一走 `constants/member.js` 的 `formatPointsValue()`

> 最后四条来自 v1.1.0 发布后的**真实浏览器核验轮**（Chrome CDP，桌面 1440×1100 与
> 移动 390×844、12 个页面各一轮，0 控制台错误 / 0 个 4xx/5xx）。因为本版尚未 push，
> 修复直接记在 `[1.1.0]` 段内。判据与回滚见工作区根
> `docs/changes/2026-10-12-移动端触控热区与折抵金额精度.md` 与
> `docs/changes/2026-10-12-v1.1.0发布.md` 的「补记」

### 依赖

前端依赖的契约版本为 **v1.1**（见后端 `docs/API.md`）。
本阶段**未新增任何 npm 依赖**；并于 2026-10-12 **移除两个依赖**：

- `ant-design-vue`（`^4.2.6`）—— 界面全部改用项目自有的 `u-*` 组件类
  （`KamiSection.vue` 的 `<a-table>` → 原生 `table.u-table`，`useKamiDisplay` 的状态色
  从 antd Tag 颜色名改为 `u-tag--*` 变体类名）
- `unplugin-vue-components`（`^28.0.0`）—— `AntDesignVueResolver` 自动引入一并删除；
  现在所有组件都必须显式 `import`

判据与回滚方式见工作区根 `docs/changes/2026-10-12-移除-ant-design-vue.md`。

### 未交付（契约已冻结，实现排在后续版本）

| 类别 | 内容 | 计划版本 |
| --- | --- | --- |
| 页面 / 路由 | 任务中心、邀请、消息中心、首页个性化（`heroApi`） | 1.2.0 / 1.3.0 |
| store | `task` / `invite` / `notify` | 同上 |
| api 模块 | `api/ask/task.js` `invite.js` `notify.js` `hero.js` | 同上 |
| Navbar | 消息铃铛（依赖 `notifyApi`） | 1.3.0 |

服务端这 14 个端点也只有契约（`server/docs/API.md` §4.3 / §4.4 / §4.8 / §4.10 /
§4.11 / §4.13 / §4.15 与 §4.16–§4.22），因此不是前端单方面欠账。

### 测试

718 → **720** 个用例（`node --test`）。新增的两条在 `test/componentClasses.test.js`：
设计系统前缀 `u-` / `ui-` 的类名必须有定义、`STATUS_VARIANT` 映射出的每个
`u-tag--*` 变体必须有 CSS 定义 —— 即上面两条修复的回归守卫。

---

## [1.0.0] — 既有基线

- 22 条路由、5 套可切换主题、711 个测试用例
- 目录 / 交易 / 卡密三条主线的完整闭环
- 线性单色图标体系（`AppIcon` + `utils/iconSet.js`，界面无 emoji）
- 设计令牌体系（`variables.css` + `theme/presets.js`）与 `ui-showcase/` 的 R1–R21 门禁
- 历史变更见工作区根 `docs/changes/`
