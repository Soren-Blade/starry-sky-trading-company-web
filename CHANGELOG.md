# 变更记录 · 前端（starry-sky-trading-company-web）

本文件按版本倒序记录**对外可见**的变更：页面、路由、store、接口依赖、样式体系。
格式参考 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/)，版本号遵循 [语义化版本](https://semver.org/lang/zh-CN/)。

**版本号规则**：两个仓库共用同一个产品版本号（它们一起部署，前端直接依赖后端契约）。
`1.x.0` 为阶段性功能扩展，`1.x.y` 为缺陷修复，`2.0.0` 为破坏性变更。
阶段内的开发中间态用 `-rc.N` 后缀标记。

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
