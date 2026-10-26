# 变更记录 · 前端（starry-sky-trading-company-web）

本文件按版本倒序记录**对外可见**的变更：页面、路由、store、接口依赖、样式体系。
格式参考 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/)，版本号遵循 [语义化版本](https://semver.org/lang/zh-CN/)。

**版本号规则**：两个仓库共用同一个产品版本号（它们一起部署，前端直接依赖后端契约）。
`1.x.0` 为阶段性功能扩展，`1.x.y` 为缺陷修复，`2.0.0` 为破坏性变更。
阶段内的开发中间态用 `-rc.N` 后缀标记。

---

## [2.0.0] — 2026-10-25 · 视觉体系整体换成 EC Design System（破坏性）

全站样式不再自建。视觉语言、组件、令牌、明暗主题全部改为 `ec-design-system`
（面向数字商品电商的业务级设计系统），原样拷贝在 `src/assets/ec/`。

**破坏性**在于：五套可切换风格 + 单项微调被**删除**，主题只剩一维（明 / 暗 / 跟随系统）；
用户既有的 `SSTC_THEME_PREF` 偏好不再生效（初始化时会被清理）。
这不是能力倒退 —— 旧实现把几百个令牌逐条写进 `<html>` 的行内样式，
而行内样式会盖掉 EC 的暗色覆写，两套机制无法共存。

### 变更

| 类别 | 内容 |
| --- | --- |
| 令牌层 | `variables.css` 从「名册 + 取值」改写为**对照表**：200 余个旧令牌名全部指向 `--ec-*` 语义令牌，不持有任何色值。90 个页面与 6 个组件分片因此**零改动**完成换肤 |
| 设计系统 | 新增 `src/assets/ec/`（tokens 四层 + `ec.css` + `ec-business.css`），`main.js` 按「EC → 对照表 → 项目组件层 → 分片」顺序引入 |
| 组件层 | `global.css` 重写为 EC 组件的实现：主按钮改 **`--ec-grad-action` 承字面**（白字最低 5.53:1，旧版把品牌渐变当按钮底，cyan 端只有 1.81:1）、卡片改 12px 圆角 + 1px 描边 + `shadow-xs`、输入框 36px + 3px 焦点环、Toast 改顶部居中、模态框/下拉/标签/分页/进度全部对齐 EC |
| 主题 | 删除 `src/theme/`（presets / compose / color，1732 行）与 `ThemeSwitcher.vue`；`stores/theme.js` 改为只写 `data-theme` + `data-theme-mode` 并持久化到 `ec-theme`；新增 `ThemeSwitch.vue`（EC 的 `.theme-switch` 三档分段控件） |
| 导航栏 | 主题入口换成 `<ThemeSwitch />`；≤767px 顶栏隐藏、搬进移动端抽屉底部（390px 顶栏放不下 80px 的三档控件） |
| 首屏 | `index.html` 新增同步脚本：在 JS 包下载前读同一个键、写同样两个属性，避免「先浅色再闪深色」 |
| 字体 | 正文字体改用 EC 的系统字体栈，Google Fonts 只保留 JetBrains Mono（卡密/代码/数字对齐），少发 3 个字族请求 |
| 图标 | `AppIcon` 显式 `display: inline-block`（EC 基线里的 `svg { display: block }` 会让行内图标错位）；`iconSet` 新增 `sun` / `moon` |
| 色值纪律 | 除 `assets/ec/tokens/` 与工具页的取色器外，任何样式出现 `#hex` / `rgba()` 即失败；`variables.css` 不得覆写 `--ec-*` |
| 测试 | `themeContract.test.js` 整体重写（状态机 / 控件契约 / 令牌唯一来源 / 暗色覆写完整 / **可复算的对比度**）；`designTokens.test.js` 与 `componentClasses.test.js` 把 EC 令牌层与组件库纳入定义源与共享样式清单 |
| 冗余清理 | 删除 2 个 0 消费者的 hook（`useImageLoader` / `useRefreshToken`）、7 个恒为 none/0 的 vestigial 令牌及其声明、4 个 0 消费者的 global 类；**组件套件删掉 9 个整族**（第三批规范的单选/滑块/步骤条/手风琴/面包屑/文件上传/评分/气泡提示/抽屉）+ 表格排序与选择列两个部件 + 若干死修饰类，共 276 条规则、103 个令牌。判据是全站 0 引用（含模板字面量与动态拼接）

### 业务组件落地（EC 组件在本站的接线）

换肤完成后，把 EC 的业务组件真正接到页面上。**组件一律复制 EC 的标记与语义**，
不自建同形异名的类；需要补业务态时只在组件内部追加 `.is-*` 或 `.ec-status--*`。

| 位置 | 组件 | 说明 |
| --- | --- | --- |
| 商品卡 | `.ec-product`（ProductCard） | 封面 → 角标 → 标题 → `.ec-price--md` 三段式 → 元信息 → CTA 行；售罄 `.is-soldout` + CTA 降级为 outline「到货提醒」并禁用加购。**收藏键从封面右上角移到 CTA 行首**，与「加入购物车」图标、主按钮同一行；`add-to-cart` 在商品分类 / 收藏夹 / 搜索结果 / 商品详情四处接线 |
| 工具行 | `.ec-tool`（ToolRow） | 由卡片改为行：图标 40×40 → 名称+描述 → 平台标签 → `.ec-status-*` → 操作。四种 `access_policy` × 会员/非会员共 8 种组合；`member_free` 非会员显示金色「会员免费」标签 + 「获取」跳卡密页，`member_only` 非会员只留「会员专属」标签、不渲染任何按钮 |
| 会员卡 | `.ec-vip`（VipCard） | 新增 `VipCard.vue`：身份 → 权益网格 → 方案选择三层；v1–v3 silver、v4–v6 gold、v7–v8 black；未拥有权益 `opacity:.4` + 灰图标（不出现危险色）；卡上按钮 `slice(0, 3)` 硬上限 |
| 卡密框 | `.ec-code`（CardCodeBox） | 个人中心的用户标识改为**默认脱敏**（四位分组，末段恒掩码），眼睛按钮切换明文、`aria-pressed` 同步，**30s 自动回掩码**（重复点击重置计时），复制的是明文、反馈 1.5s |
| 兑换结果 | `.ec-redeem-result`（RedeemResult） | 卡密激活结果从「单行提示」改为四模板 success / used / expired / notFound；无法归类时退回原内联提示，**不再统一显示「失败」** |
| 交易结果 | `.ec-redeem-result`（复用） | 订单详情页补上「购买商品」一侧：下单成功跳转带 `?created=1`，落地后用 success 模板给一次回执（订单号 + 回订单列表），**只消费一次**（挂载后立刻把参数从地址栏抹掉，刷新不重复弹）；订单不存在改用 notFound 模板（图标灰、不用危险色），并补一个「看看热门商品」出口，原来的 `page-empty` + `u-btn-primary` 写法已删除 |
| 面包屑 | `.ec-breadcrumb` | 新增 `PageBreadcrumb.vue`，接入商品详情 / 商品分类 / 我的订单 / 订单详情 / 会员套餐 / 会员权益 / 成长值**共 7 处**；商品详情页原有自建 `.product-crumb` 一并删除（scoped 特异性会盖掉 EC 配色），成长值页头里的「会员中心」回链也由面包屑取代 |
| 页签 | `.ec-tabs` | 消息中心 / 积分中心 / 支持中心的分区页签改用 `.ec-tabs` + `.ec-tabs__item`：选中态只留 `aria-selected` 一条来源，删掉 `u-tab--active` 类名分支与页面里多余的下划线。个人中心的导出时间范围是胶囊分段选择器（EC 无该变体），继续留在自研套件 |
| 弹窗 | `.ec-overlay` + `.ec-dialog` / `.ec-drawer` | 登录弹窗改 Dialog、帮助弹窗改 Drawer；`global.css` 不再保留 `.u-modal*` 别名（同名单类选择器并存时后注入者胜，会出现「改了没效果」）；关闭键改用图标集的 `x` |
| 提示条 | `.ec-alert` | 新增 `AppAlert.vue`；订单页的支付提示从 `<p class="page-note">` 改为 info 提示条 |
| Toast | `.ec-toast` | 结构性替换：成功 2s / 错误 3s、最多 3 条、**去掉关闭按钮**（EC：Toast 无操作按钮）、移动端贴底铺满 |

配套删除的死令牌：`--z-modal`、`--z-toast`、`--modal-close-size`、`--modal-title-gap`。

### 已知取舍

- `.u-*` / `.ui-*` / `.page-*` 类名保留，作为 EC 组件的**别名**（视觉与 `.ec-*` 同源）。
  全量改名是纯机械动作、零视觉收益，却把回归面从一处放大到九十处；新代码直接用 `ec-*`。
- `.u-btn-secondary` 的字色取 `--ec-action-primary-hover` 而不是 EC 的
  `--ec-button-secondary-fg`：后者在暗色下是 blue-300 压在 `#1E2340` 上实测 3.98:1，
  14px 正文不达 AA。这是对设计系统的一处**有意偏离**，已在 `global.css` 就地注明。
- 首屏默认改为**浅色**（EC 的默认）。旧站是暗色单一风格，习惯暗色的用户需在顶栏切一次。
- 页头字号随 EC 字阶收敛（`--fs-display` 72→32、`--fs-h1` 48→24），Hero 的视觉重量比旧版轻。
- 组件套件从 19 族减到 10 族。删掉的 9 族不是「暂时没人用」，而是**全站 0 引用**；
  需要时按 `variables.css` C 段保留的规范节号（跳号即已删）从设计系统补回，
  并先写页面再落样式 —— 不要再往 `test/kitAllowlist.js` 加豁免。
- **商品卡的收藏键不在封面右上角**：EC 的 `.ec-product__fav` 定义在封面内，本站按需求
  移到 CTA 行首，与加购图标、主按钮同一行。模板与样式里都写了「不要改回去」的注释。
- 会员权益页（`MemberBenefits`）与等级阶梯（`MemberLevelLadder`）**没有**换成 VipCard：
  前者是公共权益清单、没有个人卡槽位（换掉会破坏页内锚点），后者是语义化表格
  （换掉会丢列语义）。VipCard 只用在会员中心身份区与会员方案页的当前等级。
- 工具页**只在 UI 层**按 `access_policy` 分支：36 个工具页仍传 `requires-card`，
  服务端 `tools.tool_slug` 与前端路由名/路径没有映射表，集中解析会靠猜，因此
  页壳的 `accessPolicy` / `hasEntitlement` 目前是可选 props，最终鉴权仍以服务端为准。
- 服务端暂无「维护中 / 已下架」字段，工具行按 `is_maintain` / `is_offline` / `status` 容错探测。
- `.ec-code` 未加 `data-code` 属性（会把明文写进 DOM，与「默认脱敏」的初衷冲突）；
  短于 12 位的标识原样显示（与既有断言兼容）。

---

## [1.7.0] — 2026-10-16 · 顶栏账号下拉重排 + 工具页骨架（开发中）

本阶段不加新端点，改的是前端自身的可用性债：顶栏账号下拉里塞了两个
**与顶栏图标重复**的入口（会员中心 = 皇冠、消息中心 = 信封），
且没有 `role` / 键盘导航，短视口下也滚不到「退出登录」；
同时数据库 `tools` 表里有两条工具的 `tool_path` **没有对应页面**（点「打开工具」必然 404）。

### 变更

| 类别 | 内容 |
| --- | --- |
| 顶栏下拉 | **去掉两个重复入口**（会员中心、消息中心）；组内按使用频率重排为「个人中心 → 我的订单 → 我的收藏 → 卡密管理 → 每日签到」；第一组补上「账号资产」小组标题；每个条目加 `aria-hidden` 的装饰图标（条目的无障碍名仍由文本承担） |
| 交互 | 触发器 `aria-haspopup="menu"` / `aria-controls` / `aria-expanded`，面板 `role="menu"` + 条目 `role="menuitem"`；`↓` 展开并把焦点落到首项、面板内 `↑/↓` 循环、`Home/End` 到首尾、`Esc` 关闭并**把焦点还给触发器** |
| 视觉 | 面板 `max-height: var(--dropdown-max-height)` + `overflow-y: auto`（此前是 `overflow: hidden`，短视口下底部条目永远看不到，也顺带消费了这个一直没人用的令牌）；宽度下限 224px（200px 放不下带图标的长条目）；展开动画 180ms（全局 `--enter-duration` 是**页面进入**的节奏）；767 断点下限制在视口内并把条目放宽到 44px 触控高度 |
| 图标 | `iconSet.js` 新增 `log-in` / `log-out` |
| 工具页公共层 | 新增 `ToolPageShell.vue`（页头 + 返回 + 主区/侧栏 + 「需卡密」标注）与 `ToolResultPane.vue`（**空 / 加载 / 成功 / 失败**四态），以及 `useToolJob` 组合式函数与第六个样式分片 `assets/styles/ui-kit-tool.css` |
| 工具页 | 新增 `/image/compressor`（图片压缩，骨架）与 `/dev/json-formatter`（JSON 格式化，**本期唯一真实实现**）两条路由，**消除两条点开即 404 的死链**；`/video/downloader` 由「开发中说明卡」升级为完整骨架页（解析仍为占位回显）；`/other/2fa` 与 `/other/appleId` 换用统一页壳（**TOTP 逻辑与密钥处理未动**） |
| 文案常量 | `constants/content.js` 新增 `TOOL_PAGES`（键 = 数据库 `tool_path`）与 `TOOL_RESULT`，五个工具页的标题/简介/空态/示例全部集中在此 |
| 测试 | 新增 `test/navbarUserMenu.test.js`（11 例）与 `test/toolPages.test.js`（15 例）；`test/navbarMail.test.js` 里「下拉也有消息中心」改为「下拉**不得**重复消息中心」；`componentClasses.test.js` 的共享样式清单登记新分片 |

### 已知取舍

- 面板沿用全局 `.u-dropdown` 的毛玻璃与条目配色，只在 `Navbar.vue` 内做局部覆盖
  —— 改共享令牌会连带改掉所有页面的进入动画与下拉视觉。
- `Tab` **不拦截**：先把面板卸载掉再让浏览器找下一个可聚焦元素，焦点会落到 `body` 上，
  因此 `Tab` 走浏览器默认顺序，面板由点击外部或 `Esc` 收起。这是有意为之，不是遗漏。
- 头像加载失败仍走 `SmartImage` 的 `fallback-icon="user"` 占位（本轮未改），
  长昵称的省略号来自既有的 `.user-name-text`（`min-width: 0` + ellipsis），改为断言守住。
- **工具页是骨架，不是工具**：图片压缩按档位系数**估算**体积、下载按钮保持禁用；
  视频解析只回显参数；两页都在侧栏如实写明。唯一真实可用的是 JSON 格式化。
- 数据库里 `2FA密钥验证` 这条的 `description` 仍是「在线Markdown编辑器，实时预览」，
  与工具名不符（页面文案取自 `TOOL_PAGES`，不受影响），**建议改库**。

---

## [1.6.0] — 2026-10-16 · 三条 P2 端点接线（前端侧 M8，开发中）

服务端 `1.6.0` 补齐了最后三条 P2 端点（`inviteApi/getSummary`、`inviteApi/getRecords`、
`heroApi/getHeroPersona`），**契约 68 / 已实现 68**。前端这一轮（计划里的 **M8**）把它们接上，
并把 `1.5.0` 只落了服务端的**补签**接出入口。

### 新增

| 类别 | 内容 |
| --- | --- |
| 接口 | `src/api/ask/invite.js`（`getSummary` / `getRecords`）、`src/api/ask/hero.js`（`getHeroPersona`）、`points.js` 增 `replenishCheckin(date)` |
| store | `stores/invite.js`（`useInviteStore`）、`stores/hero.js`（`useHeroStore`） |
| 纯函数 | `utils/checkinDisplay.js`（可补签判定、单元格 title、失败码文案、规则文案） |
| 页面 | 新增 `/invite` 邀请中心（邀请码 / 链接 / 三态计数 / 奖励口径 / 进度 / 榜单 / 记录分页） |
| 入口 | 个人中心新增「邀请有礼」卡；积分中心快捷入口新增「邀请有礼」；顶栏账号菜单的签到入口不变 |
| 测试 | `checkinReplenish` / `stores.invite` / `stores.hero` 三份新测试 + `stores.points` 增补 2 例（共 23 例新增） |

### 变更

- **补签入口**（`/user/checkin`）：日历里「本月的、已过去的、未签到的」日子渲染成按钮（虚线描边 + 手型光标），
  点击即补签；不可补签的日子仍要给出理由（今天直接签到 / 还没到 / 已签到 / 次数用完 / 积分不足），
  理由由 `canReplenishDay()` 统一给出，服务端仍是最终裁决。
  补签成功后**重新拉一次日历** —— 服务端会重算整条连续段，本地改一个格子会与真实 `streak` 分叉。
- **注册支持邀请码**：登录/注册弹窗的注册表单新增「邀请码（选填）」，从邀请链接
  （`/?invite=CODE`）进入时自动预填并统一大写；邀请码**不合法不会让注册失败**（服务端只不建立关系），
  因此前端不做格式校验，只做去空格与大写归一。
- **首页人格位**（`HeroSection.vue`）：视觉面板在服务端下发 `benefits` 时多出一块「会员速览」
  （等级 + 剩余天数 / 积分与折算 / 可用券与即将过期 / 今天签到可得 N 积分）。
  游客与非会员拿到的是 `{}`（L2：**整块缺席代表「没有这个能力」**），因此不渲染速览而不是渲染一堆 0；
  面板里的 `coupons` / `coupon_expiring` / `checkin_available` 同样「有才下发」。
  面板因此去掉了 `aria-hidden="true"` —— 里面现在有可交互的签到链接，整块对读屏隐藏会让用户点不到。
  面板的固定宽高比（4/3）改成 `min-height`，否则速览行数一多会被挤出去。
- `vite.config.js` 的 proxy 表补 `/inviteApi` 与 `/heroApi`（新前缀漏配的后果是 dev 下 404 且返回 index.html）。
- `App.vue` 的账号切换 watch 补 `inviteStore.reset()` 与 `heroStore.reset()`
  （不清会把 A 的邀请码与会员等级显示给 B）。
- `constants/member.js`：积分流水筛选补 `earn_card` / `earn_invite` / `spend_replenish` 三类
  （服务端白名单里早有这三个值，前端筛选少三个选项），并新增 `REPLENISH_COST` / `REPLENISH_MONTHLY_LIMIT`
  两个与服务端常量函数同源的数值。
- `package.json` 版本号仍为 `1.4.0`（`1.5.0` / `1.6.0` 未发布，发布时与后端一起改）。

### 门禁

`npm run lint` 0、`npm test` 974/974、`npm run build` 通过、`npm run verify:dev` 17/17。

---

## [1.5.0] — 2026-10-16 · 契约端点补齐（前端侧 M7，开发中）

服务端 `1.5.0` 把 API.md 里只剩契约的端点全部落地（结算试算、积分商城、补签、任务中心、权益公开页）。
前端这一轮（计划里的 **M7**）把它们接到界面上：**不再有「有接口没人调」的状态**，
三条 P2（`inviteApi` ×2、`heroApi` ×1）顺延 `1.6.0`。

### 新增

| 类别 | 内容 |
| --- | --- |
| 接口 | `src/api/ask/task.js`（`getTasks` / `claim`）、`member.getBenefits()`、`points.getMallItems()` / `points.redeem(itemId)`、`coupon.getAvailable({amount, productIds})` / `coupon.previewUse(payload)` |
| store | `stores/task.js`（`useTaskStore`）、`stores/checkout.js`（`useCheckoutStore`） |
| 纯函数 | `utils/checkout.js`（积分校验、上限换算、明细行、券选项文案）、`utils/taskDisplay.js`（周期文案、进度百分比、按钮四态、库存与不可兑理由） |
| 页面 | `/points` 新增「商城」「任务」两个页签（共四个，值写进 `?tab=`）；购物车结算面板新增选券与积分抵扣区；订单详情新增金额明细 |
| 测试 | `checkoutUtils` / `stores.checkout` / `stores.points` / `stores.task` / `taskDisplay` 五份新测试（共 22 例新增），`pointsPage.test.js` 增补列表行方向断言 |

### 变更

- **权益详解页改读服务端**（`/member/benefits`）：文案、`level_names`、FAQ 优先用 `getBenefits` 的响应，
  **逐字段回落**到内置常量（同一份说明书，不该因为一次网络抖动变成空白页）；
  8×8 矩阵改用 `memberStore.matrixLevels`（服务端 `benefitsPage.levels` → `plans.levels` → `[]`）。
- **结算面不自己算钱**：选中项变化（250ms 防抖）调 `previewUse`，六个数原样展示；
  提交时发的是**试算后的 `points_used`** 而不是输入框里的数字（服务端会把积分下调到上限），
  只带 `coupon_code` / `use_points` 两个「意图」字段；券被服务端拒绝（`COUPON_NOT_AVAILABLE` /
  `COUPON_THRESHOLD`）时**自动取消选择**并说明原因。
- **列表行必须显式横向**：`/points` 的商城、任务、流水三种列表行都同时挂了全局 `.ui-card`
  （它是 `flex-direction: column`），只写 `display: flex` 会被覆盖成「图标在上、按钮在下」的竖排。
  三处都补 `flex-direction: row`，并由 `test/pointsPage.test.js` 读源码钉住。
- `+ .ui-card` 类列表的既有先例（个人中心的签到卡）同理，本次一并核对。
- `vite.config.js` 的 proxy 表补 `/taskApi`（新前缀漏配的后果是 dev 下 404 且返回 index.html）。
- `App.vue` 的账号切换 watch 补 `taskStore.reset()` 与 `checkoutStore.reset()`（不清会把上一个账号的
  任务进度、可用券与额度留给下一个人）。
- 任务按钮文案修正：`claimable` 的口径是「**现在就能领**」，未完成的任务它是 `false` ——
  原来的判据会把它显示成「自动发放」，等于告诉用户未完成的任务不需要操作。
  现在统一走 `utils/taskDisplay.js` 的 `taskButtonLabel()`：已领取 / 自动发放（`reward_points = 0`）/ 未完成 / 领取。
- `package.json` 版本号仍为 `1.4.0`（`1.5.0` 未发布，发布时与后端一起改）。

### 门禁

`npm run lint` 0、`npm test` 951/951、`npm run build` 通过、`npm run verify:dev` 17/17。

---

## [1.4.0] — 2026-10-15 · 会员中心重构与签到独立（已发布）

会员中心从「一个页面塞下所有东西」重构为 **1 个枢纽 + 3 个子页**，权益由 6 项扩为 **8 项**，
并且**逐档数值第一次真正显示出来**（券包金额、积分抵扣上限、免卡密额度、生日礼遇、客服档、身份档）。
签到按用户要求**独立到个人中心**（`/user/checkin`），与会员**结构解绑但保留倍率加成**。

### 新增

| 类别 | 内容 |
| --- | --- |
| 页面 | `/member/benefits`（权益详解：八项规则 + **8×8 数值矩阵** + FAQ，**不要求登录**）、`/member/growth`（成长值，自 `/growth` 迁入并补八档对照表）、`/user/checkin`（每日签到，自 `/checkin` 迁入个人中心） |
| 路由 | 上述三条；`/growth` → `/member/growth`、`/points/history` → `/points`、`/checkin` → `/user/checkin` 三条**旧路由重定向**（删除 `Growth` / `Checkin` / `PointsHistory` 三个路由名） |
| 常量 | `SUPPORT_TIER_LABELS`（标准 / 优先 / 专属客服经理）、`IDENTITY_TIER_LABELS`（会员徽章 / 专属称号 / 限定标识）；`MEMBER_BENEFITS` 扩为 8 项并带 `valueType` |
| 函数 | `formatBenefitValue(value, labels)` / `formatBenefitNext(value, labels)` —— **权益数值的唯一翻译入口**（rate / multiplier / money / percent / quota / tier 六种 type），未知类型返回空串、绝不产出 `undefined` |
| store | `memberStore.hasLevels` getter |
| 测试 | `memberBenefitValue.test.js`（11 例）、`stores.member.test.js`（8 例） |

### 变更

- **权益数值只从服务端来**：`getOverview.benefits[].value = { type, current, next, next_level }`，
  已解锁项才带 `value`（未解锁时**整个键不存在**，不是给 0）；满级项不带 `next` / `next_level`。
  前端 `constants/member.js` 只放规则文案与翻译表，**`detail` 里不写任何折扣 / 倍率 / 金额 / 档位数字** ——
  写死会与 `member_levels` 漂移且两边都不报错
- **8×8 矩阵**取 `getPlans.levels[]` 的六个新列（`coupon_pack_value` / `points_deduct_cap` /
  `free_tool_quota` / `birthday_value` / `support_tier` / `identity_tier`），窄屏降级为「每档一张卡」，
  当前档高亮；矩阵数据是**公开**的，所以这个页面不加 `requiresAuth`
- **签到与会员结构解绑、倍率保留**：`/user/checkin` 只调 `/pointsApi/checkin`（服务端未改），
  但文案与页面归属改为个人中心；服务端 `sstc.checkin` 仍按 `get_member_snapshot` 的
  `points_multiplier` 放大积分（成长值固定 +5），页面因此写「会员等级倍率对签到积分同样生效」
- **积分明细并入积分中心**：`/points` 两个页签（概览 / 流水），`PointsHistory.vue` 删除，
  `/points/history` 重定向过来（旧链接与收藏不失效）
- **窄页族换血**：`Checkin` / `PointsHistory` 退出，`MemberBenefits` / `MemberGrowth` / `UserCheckin`
  加入，仍受 `test/componentClasses.test.js` 的 `NARROW_PAGE_FAMILY` 守卫
- `package.json` 版本号 `1.3.0` → `1.4.0`，与后端保持一致

### 修复

- **首屏空指针**：`Member.vue` 与 `MemberBenefits.vue` 曾写 `if (!memberStore.levels.length)`，
  而 `levels` 的初值是 `null`（不是 `[]`）—— 全新会话首屏必抛 `TypeError` 并打断 `onMounted` 的后续请求。
  lint / build / SSR 渲染**都看不见**（SSR 不跑 `onMounted`）。改为 `memberStore.hasLevels`，
  并由 `stores.member.test.js` 钉住「初值 null、脏值也不抛」
- **权益详解的详情文字被按字符渲染**：`detail` 是**一段字符串**，模板却用 `v-for` 逐项渲染，
  于是「折扣与优惠券」被渲染成「折 / 扣 / 与 / 优 / 惠 / 券」一列竖排。改为 `<p>{{ item.detail }}</p>`，
  并在 `memberConstants.test.js` 里断言 `detail` 必须是字符串（防回归）
- **成长值页对非会员说错话**：非会员曾看到「已是最高等级」，现在按成长值门槛说「按成长值门槛定档、到账即时生效」
- `constants/member.js` 的 `quota` 翻译会因 `Number(null) === 0` 把「未下发」渲染成「0 个」，
  现在先挡 `null` / `undefined` / 空串

### 验收

- `npm run lint` 0 问题；`npm test` **888 例**全部通过（869 → 888，本轮 +19）；`npm run build` 成功
- **真浏览器走查**（桌面 1440 + 移动 390）：游客与 V5 会员两种身份下的 `/member`、`/member/benefits`、
  `/member/growth`、`/points`（两个页签）、`/user/checkin`，以及三条旧路由重定向；
  签到实测 **+35 积分 = 基础 10 × V5 倍率 3.5**、成长值 +5，矩阵与权益卡数值与库内 `member_levels` 逐格一致

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
