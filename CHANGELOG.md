# 变更记录 · 前端（starry-sky-trading-company-web）

本文件按版本倒序记录**对外可见**的变更：页面、路由、store、接口依赖、样式体系。
格式参考 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/)，版本号遵循 [语义化版本](https://semver.org/lang/zh-CN/)。

**版本号规则**：两个仓库共用同一个产品版本号（它们一起部署，前端直接依赖后端契约）。
`1.x.0` 为阶段性功能扩展，`1.x.y` 为缺陷修复，`2.0.0` 为破坏性变更。
阶段内的开发中间态用 `-rc.N` 后缀标记。

---

## [1.1.0-rc.1] — 2026-10-12 · 阶段 P0（开发中）

会员 / 积分 / 权益优惠券 / 成长 —— **前端部分尚未开始**。

### 变更

- `package.json` 版本号 `1.0.0` → `1.1.0-rc.1`，与后端保持一致
- 新增本文件

### 本阶段计划交付（尚未实现）

| 类别 | 内容 |
| --- | --- |
| 新增页面 | `/member` `/member/plans` `/points` `/points/history` `/checkin` `/coupons`（P0 六个） |
| 改造既有文件 | `Navbar`（下拉分组 + 消息铃铛 + 等级徽章）、`Profile`（权益摘要条）、`Legal`（会员与积分章节）、`router/index.js`（13 条新路由） |
| 新增 store | `member` / `points` / `coupon` / `task` / `invite` / `notify` |
| 新增 api 模块 | `api/ask/member.js` `points.js` `coupon.js` `task.js` `invite.js` `notify.js` `hero.js` |

### 依赖

前端依赖的契约版本为 **v1.1**（见后端 `docs/API.md`）。
本阶段**未新增任何 npm 依赖**；并于 2026-10-12 **移除两个依赖**：

- `ant-design-vue`（`^4.2.6`）—— 界面全部改用项目自有的 `u-*` 组件类
  （`KamiSection.vue` 的 `<a-table>` → 原生 `table.u-table`，`useKamiDisplay` 的状态色
  从 antd Tag 颜色名改为 `u-tag--*` 变体类名）
- `unplugin-vue-components`（`^28.0.0`）—— `AntDesignVueResolver` 自动引入一并删除；
  现在所有组件都必须显式 `import`

判据与回滚方式见工作区根 `docs/changes/2026-10-12-移除-ant-design-vue.md`。

---

## [1.0.0] — 既有基线

- 22 条路由、5 套可切换主题、711 个测试用例
- 目录 / 交易 / 卡密三条主线的完整闭环
- 线性单色图标体系（`AppIcon` + `utils/iconSet.js`，界面无 emoji）
- 设计令牌体系（`variables.css` + `theme/presets.js`）与 `ui-showcase/` 的 R1–R21 门禁
- 历史变更见工作区根 `docs/changes/`
