# 变更记录 · 前端（starry-sky-trading-company-web）

本文件按版本倒序记录**对外可见**的变更：页面、路由、store、接口依赖、样式体系。
格式参考 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/)，版本号遵循 [语义化版本](https://semver.org/lang/zh-CN/)。

**版本号规则**：两个仓库共用同一个产品版本号（它们一起部署，前端直接依赖后端契约）。
`1.x.0` 为阶段性功能扩展，`1.x.y` 为缺陷修复，`2.0.0` 为破坏性变更。
阶段内的开发中间态用 `-rc.N` 后缀标记。

---

## [3.2.0] — 2026-10-29 · 签到日历：骨架屏、翻月节流、数据加载提速

- **首屏骨架屏**（`UserCheckin.vue`）：日历接口回来之前，hero / 月历 / 右栏三处都渲染骨架块（`.checkin-skeleton-*`，复用 `.u-skeleton` 的闪烁动画）。此前首屏会先闪一下「0 天连续签到 / 今天还没签到 / 已签 0 天」，数字跳成真实值时才变 —— 既跳版又像「你没签到」。
- **翻月节流**：新增 `MONTH_NAV_THROTTLE = 260` 与同步闸门 `monthNavAllowed()`，`goMonth` / `goToday` 在改状态前过闸门。翻月是「一次点击一次请求」，响应要 0.2–0.9 s，连点五下会把五次往返全打出去且互相覆盖。按钮同时按 `calendarLoading` 禁用。
- **前端缓存 + 预取**（`stores/points.js`）：`fetchCalendar` 按月缓存 15 s（`CALENDAR_CACHE_TTL`），命中不发请求；新增 `prefetchCalendar(month)`（只写缓存、不动当前画面）与 `invalidateCalendarCache()`。首屏 `onMounted` 拿到当月后静默预取相邻两月，翻月直接命中。
- **半截响应不再当成加载成功**：`data.days` 不是数组时不写 `calendar`、不写缓存，骨架屏继续留着 —— 否则页面会把 `{}` 当「已加载」，四栏全渲染成 0 与空网格，比一直转圈更像坏了。
- **补签后由页面刷新**：`doReplenish` 只清缓存不再自己 `fetchCalendar`（页面知道用户翻到了哪个月），消除了原先 store 与页面各拉一次的重复请求。
- **三列数字居中**（`align-items: center` + `text-align: center`）：三个数字宽度不同（0 / 12 / 3），靠左会让视觉重心偏左。
- **服务端配套**（同版本）：`getCheckinCalendar` 加 10 秒 TTL 缓存并在响应头打 `X-Cache: HIT|MISS`。实测同一月份「冷 1113 ms → 热 37 ms」。
- 未改：窄屏（≤767px）单列、副数据行隐藏、日历格子与字段口径全部不变。

## [3.1.0] — 2026-10-29 · 签到日历：两栏吃满整行、放开「下个月」提前看未来

- **版式改回 `space-between`，但不再留空洞**：`.checkin-cal-body` 的列从「`auto` + 固定 320px + 整体居中」改成 `minmax(0, 1.45fr) minmax(35u, 1fr)` —— `space-between` 只保留对齐语义，剩余空间由两栏按比例分掉，中间只剩一个 24px 栅格间距。3.0.1 的居中把空白留在了中间，宽屏下更明显。
- **格子跟着列宽流体**：`.checkin-grid` / `.checkin-weekdays` 的轨道从「每格定宽 64px」改成 `repeat(7, minmax(0, 1fr))`。否则列变宽后多出来的宽度会留在日历列内部，看起来像第二个洞（1440 宽下约 71px/格，1900 宽下约 84px）。
- **「下一个月」放开**：不再按当前月禁用，可以往后翻到任意未来月份（`getCheckinCalendar` 本来就按月取整月）。未来月份在副标题加「· 未来月份，仅预览」，格子走 `is-future` 灰显，右栏只显示「还没到这一天」、不给任何按钮。
- **修「是不是本月」的判断**：原来拿 `calendar.month` 比，而服务端会把请求的月份原样回传 —— 翻到 11 月后比出来永远是「本月」。改用 `calendar.today` 截出真·当月（`todayMonthKey`），「回到今天」的禁用态与「未来月份」标记才准确。
- **`points` store 加 `calendarLoading`**：放开后可能连点翻月，用标记把两个翻月按钮锁住，避免后到的响应覆盖先到的。
- 窄屏（≤767px）仍是单列：`grid-template-columns: minmax(0, 1fr)`，格宽随容器走。

---

## [3.0.1] — 2026-10-29 · 签到日历：节日只标正日子、右栏与月历等高居中

- **节日只在「正日子」写名字**（这条替代 3.0.0 的已知取舍）：服务端 `calendarAux.js` 不再把政策日名整段摊到假期每一天 —— 国庆 10-01 写「国庆节」，10-02~10-07 回落节气/农历；春节、清明、端午、中秋由 `festival`（库按农历/节气精确到某一天）承担。
- **修「10 月 10 日也写国庆节」**：10-10 是调休上班日，现在只标「班」角标，不再带节日名。
- **选中某天同时显示节日与节气**：右栏副标题改为「节日/节气在前、农历垫后」，例如「国庆节 · 农历 八月廿一」「寒露 · 农历 八月廿八」。
- **删掉侧栏的规则入口**（`.checkin-side-rule-link` 与其 `openRules()`）：下方 `ui-card checkin-rules` 本身就是入口，两处重复。
- **版式修正**：`.checkin-cal-body` 由 `auto + space-between` 改为 `auto + 320px + justify-content: center + 24px gap` —— 宽屏下日历与侧栏不再被推到两端、中间空一大段；侧栏 `justify-content: space-between` 撑满行高，月历 `align-self: center` 垂直居中，两栏等高。
- 窄屏（≤767px）仍是单列，行为不变。

---

## [3.0.0] — 2026-10-29 · 签到页重构为「签到日历」（农历 / 节气 / 节日 / 休班角标 + 月切换 + 日详情）

- **页面语义变了**：`/user/checkin` 不再只是「本月打勾表」，而是一张真正的月历 —— 每格第二行显示副数据（优先级：法定节假日名 → 传统节日 → 节气 → 农历日），左上角加「休 / 班」角标（法定假日与调休上班）。顶栏下拉入口同步改名「**签到日历**」并换成日历图标（`AppIcon name="calendar"`）。
- **副数据由服务端下发**：新增 `starry-sky-trading-company-server/src/utils/calendarAux.js`（依赖 `chinese-days@1.5.9`），`getCheckinCalendar` 返回的每个 `day` 追加 `lunar / lunarMonth / lunarDay / leap / dayType('holiday'|'workday'|null) / holidayName / festival / solarTerm`。**优先级不下沉到服务端**，只给原始字段，由前端 `resolveDaySubLabel()` 决定显示哪一条，便于各自单测。
- **节日走白名单**：`chinese-days` 的 `getLunarFestivals` 会给出「孔子诞辰」「观音菩萨出家」这类日子，直接显示会让日历变成黄历；`MAJOR_FESTIVALS` 只保留 16 个大众节日（春节/除夕/元宵/清明/端午/七夕/中元/中秋/重阳/腊八/小年…）。
- **新增月切换与「回到今天」**：`‹ / 回到今天 / ›` 三个 36px 按钮，`canGoNext` 在当前月禁用（不看未来）；翻到别的月份时标题与统计都取该月真实数据 —— 服务端 `get_checkin_calendar(p_month)` 本来就按月取整月，不用改。
- **补签从「点格子立即写库」改为「选中 + 右栏确认」**：点格子只 `selectDay()`，写操作统一在右栏详情的主按钮里（`.checkin-side-detail`）。原因：加了副数据后一格里有两个可点语义（看日子 / 补签），直接写库容易误触。
- **右栏从三段变四段**：选中日详情（日期 + 周几 + 农历/节气/节日 + 状态文案 + 动作按钮）→ 每日积分档位 + 进度条 → 连签里程碑 → 本月账本。
- **漏签但补不了时不给按钮**：右栏文案「漏签，但补签次数或积分不足」（`resolveDayStatus()` 的 `canReplenish` 口径与格子虚线一致），避免「格子是实线、右栏却让你补签」的自相矛盾。
- 窄屏（≤767px）隐藏第二行副数据、格高由 72px 降到 52px，只留日期与休/班角标。

### 已知取舍

- 格子里只显示**一条**副数据（用户已确认可接受）。国庆这类连休 7 天在 3.0.0 里会连续 7 格都写「国庆节」，挤掉那几天的农历与节气（**3.0.1 已修**：只有正日子写节日名）。
- `chinese-days` 只覆盖到 2026 年附近的数据；超出范围时副数据自动降级（服务端 `safe()` 兜住，不 500），表现为只有农历、没有休班角标。
- 「待办 / 纪念日」不在本次范围（用户明确取消）。

---

## [2.6.3] — 2026-10-28 · 签到页右栏补齐三段（今日档位进度 / 连签里程碑 / 本月账本）

- **右栏从「一块」变成「三段」**：`.checkin-cal-side` 现在是连续侧栏（同一容器内三个 `.checkin-side-block`，分隔线全宽、段内不缩进）。上一版合并后右栏只有档位一块、约 225px，却占着约 480px 的内容区高度，上下各空约 128px —— 留白没有形状，看起来像内容没加载完。
- **不选「加高卡片」**：卡片高度由 7 × 64px 的日历格决定，单独加高只会让留白更大。填充用的是**本来就有的数据**：① 当前档位 + 到下一档的进度条；② 连签里程碑（三档阶梯，已达成/当前用边框与底色区分，不填实色）；③ 本月账本（已签天数 / 最长连签 / 剩余补签）+ 规则入口。
- **进度条的基准点是「已达成档位的最大天数」**，不是「当前档」：`streak = 0` 时 `currentTier` 已落到第 1 档（days = 1），与 `nextTier` 重合会把进度算成满条（实测踩到，已由 `checkinTierProgress()` + 单测钉死）。
- **规则入口可点**：右栏底部「签到规则与补签说明」是整行按钮（≥44px 触控目标），点击展开下方 `<details>` 并 `scrollIntoView`，省掉「自己找折叠区」。
- 右栏宽度由 `1fr` 改为固定 `calc(var(--space-unit) * 40)`（320px）+ `space-between`：跟着 1fr 拉伸时，超宽屏下三段数字会被摊得很散；窄屏（≤767px）仍转单列。

---

## [2.6.2] — 2026-10-28 · 签到页档位并入月历卡（日期靠左、档位右侧垂直居中）+ 日期筛选

- **版面合并**：删掉独立的 `ui-card checkin-tiers`，把「每日积分档位」并进 `ui-card checkin-calendar`。原因是月历格固定 7 × 64px 宽、居中后左右各留一大块空白；现在日期块靠左，档位栏作为 `.checkin-cal-side` 在右侧**垂直居中**（`.checkin-cal-body` 两列网格 + `align-items: center`），档位由横排三块改为竖排三行（右列只有约 300px，横排每块只剩 60px）。
- **日期筛选（1.1）**：卡片头部右上新增 `SelectField`「全部日期 / 只看已签到 / 只看待签到 / 只看可补签」。**只筛显示、不改统计**——`本月已签 N 天`、`剩余补签 N 次` 始终是整月真值，筛选后副标题追加「筛选命中 N 天」；被筛掉的格子只留小圆点占位，保住网格对齐（`.checkin-grid .checkin-cell.is-filtered-out` 用 0,3,0 特异性压过 `.is-checked/.is-today/.is-future` 的状态底色）。
- 窄屏（≤767px）两列变单列：日历在上、档位在下，筛选器通栏。

---

## [2.6.1] — 2026-10-28 · 按钮 hover 回退、免卡密权益按等级显示、签到按钮翻面与签到页重排

- **主按钮 hover 回退**：2.6.0 把悬停改成「换一对反相底/字」是改错了方向（用户要的是文字与背景别糊在一起，不是换个底色），现回退为「底色恒为 `--ec-button-primary-bg` + `brightness(1.06)` + 更深的投影」，对比度改由字色 `--ec-text-on-action` 兜底；`.ec-btn--primary` 与 `.u-btn-primary` 同一套规则。
- **「会员免卡密」按本等级额度显示**：附注由固定话术改为「可解锁 已用/上限 个卡密工具（还可激活 N 个）」，v7/v8 显示「不限次数，已激活 N 个」，非会员显示引导语；数据来自 `GET /kamiApi/memberQuota`。
- **个人中心签到按钮翻面**：`memberStore.fetchOverview` 新增 `force`（先失效 8 秒短缓存再请求），`Profile` 签到成功后用 `force: true` 重取 —— 修掉「签完按钮还写着立即签到」。
- **`/user/checkin` 页面重排**：今天状态与主按钮独占一栏 → 三档积分阶梯（含「再连签 N 天升到 X 分/天」）→ 本月日历（补星期表头、前导占位、图例，可补签格虚线 + 「补」角标）→ 规则收进折叠面板。

### 已知取舍

- 免卡密附注只在「会员中心」这一处按实时额度渲染；卡密控制台里那套额度文案未改（入口不同、口径相同）。
- 签到页的档位数值（10/15/20）、补签成本（20 积分/次、每月 3 次）仍在页面上写死，与 `sstc.checkin_base_points` / `replenish_cost()` / `replenish_monthly_limit()` 手工对齐 —— 与 2.6.0 之前一致，本轮未新增接口。


## [2.6.0] — 2026-10-28 · 表格对齐、券下拉过滤、永久会员文案与按钮 hover 反相（hover 部分已被 2.6.1 回退）

六项体验修复 + 一个跨端缺陷（买商品不发成长值）。无新路由，按 `2.6.0` 发。

| 位置 | 变更 |
| --- | --- |
| `src/components/MemberLevelLadder.vue` | 三个数值列表头加 `u-mm-ladder-num`：表头「成长值门槛 / 消费折扣 / 积分倍率」由左对齐改为右对齐，与表体数字同向 |
| `src/pages/MemberBenefits.vue` | 等级权益对照表同样处理（`成长值门槛` 表头加 `u-mm-ladder-num`），矩阵列头加 `u-mm-matrix-cell` 居中，与表体一致 |
| `src/assets/styles/ui-kit-member.css` | 新增 `.u-mm-ladder th.u-mm-ladder-num`（右）与 `.u-mm-matrix-table th.u-mm-matrix-cell`（居中）两条选择器 —— 两张表此前**只有 td 有对齐规则、th 全吃 `.u-table th` 的左对齐**。`.u-mm-benefit-next` 的 `margin-top: auto` 改为 `0`：单行附注不再被推到底部拉开与标题的距离 |
| `src/pages/Cart.vue` | 结算卡片的优惠券下拉改由 `checkoutStore.selectableCoupons` 生成（**只列本次可用的券**），并在「选中券已不可用」时自动回退到「不使用优惠券」 |
| `src/pages/Member.vue` | 会员到期日先判 `overview.is_permanent`：永久会员显示「永久会员」+「一次开通，长期有效」（此前因为 `expires_at` 为 `null` 显示「—」）。「会员免卡密」卡的附注改走 `benefitFootText()`，固定为「根据会员等级解锁固定数量的卡密工具」 |
| `src/constants/member.js` | `free_tool` 的 `desc`/`detail` 重写，与卡面附注口径一致 |
| `src/assets/styles/global.css` | `.u-btn-primary:hover` 与 `.ec-btn--primary:hover` 合并为一条**反相**规则：`background: var(--ec-bg-inverse)` + `color: var(--ec-text-inverse)`，`filter: none` 并关掉渐变内高光。原来只靠 `filter: brightness(1.06)`，深色主题下浅紫渐变被提亮后与近白文字撞色 |

**修复**

- **买商品不加成长值**（跨端）：`sstc.complete_order` 在 `2026-10-16-add-invite-and-hero.sql` 整函数重写时丢了 `order_growth_reward` + `append_growth_ledger` 两步，导致完成订单只改状态不发成长值；已由服务端迁移重建（见后端 CHANGELOG）。兑换卡密走 `use_card`，一直正常。
- 深色主题 `.u-btn-primary` hover 时文字与背景几乎同色（见上表 `global.css` 行）。

**取舍**

- 优惠券过滤放在前端、不改库函数 `get_available_coupons()`：券包页与试算仍需要看到已用/过期券及不可用原因，过滤只发生在「结算时选择」这一处。
- hover 用反相令牌对（`--ec-bg-inverse` / `--ec-text-inverse`）而不是新增 hover 专用色：这一对在明暗两套主题里本身就是互补色，实测浅色 15.4:1、深色 15.9:1，省掉两个新令牌和一条主题分叉。
- 历史 7 笔已完成订单的成长值**不补发**（用户确认只修「以后」），避免一次性改动用户成长值与等级。

## [2.5.0] — 2026-10-28 · 会员改为「10 元开卡资格」+ 工具目录全量加载

会员模型重构（**行为变更**：等级不再可购买）+ 工具页能看全 37 个工具；按 `2.5.0` 发。

| 位置 | 变更 |
| --- | --- |
| `src/pages/MemberPlans.vue` | 整页改为「开通会员」：顶部身份卡 + 一张**会员开卡资格**卡（¥10、一次开通永久有效、`已开通` 静态态）+ 「成长值怎么涨」（购买商品 / 兑换卡密两条真实入口）。等级不再出现在套餐卡里，删除按等级分组的 `groups` 与 `DURATION_LABELS` |
| `src/pages/Member.vue` | 文案与入口对齐新模型：`续费会员` → `会员卡`（已开通）／`开通会员`；`去续费` → `查看会员卡`；`会员套餐` → `开通会员`；到期待办的动作文案改「开通永久会员」（2.5.0 起没有续费概念） |
| `src/pages/Tool.vue` | 搜索条件补 `toolTagsOf(tool)`（派生标签）与 `tool_slug`：以前搜「解析」「加密」这类描述词搜不到对应工具 |
| `src/stores/tool.js` | `fetchTools()` 改为**分页聚合**：首页 `limit: 100`，按 `pagination.has_next` 续拉（`TOOL_FETCH_MAX_PAGES = 10`、`TOOL_FETCH_MAX_TOOLS = 1000` 硬上限）；显式传 `page/limit` 时保持原样不聚合。此前只拿服务端默认第一页 20 条，导致左轨分类计数偏小、「分类下没有其他工具」、搜索找不到第 21 个之后的工具 |

**与后端契约的对应**：`/memberApi/getOverview` 新增 `is_permanent`；`/memberApi/getPlans` 由 6 档变 1 条（`kind: 'activation'`、`duration_days: 0`、`price_per_day: null`）。

**取舍**

- 等级不售卖后，`plans[].is_current` 只剩「这一档能不能买」的含义，身份卡等级改从 `overview.level` 取（否则 v3 会员会被显示成 V1）。
- 开卡资格卡用页面级网格 `grid-template-columns: minmax(0, 480px)` 限宽，不用 `max-width` —— 页族宽度契约（`test/componentClasses.test.js`）禁止页面自设 `max-width`。
- 37 个工具一次性拉回（约 20 KB）可接受；目录继续膨胀时应改成服务端搜索，前端聚合有 10 页上限兜底。

## [2.4.0] — 2026-10-28 · 请求合并与短缓存（性能）

只改性能与共享 Apple ID 页布局，无新页面、无破坏性变更；按 `2.4.0` 发。

| 位置 | 变更 |
| --- | --- |
| `src/utils/shortCache.js` | **新增**。8 秒 TTL + 同 key 单飞（并发只发一次），失败不写缓存；供 store / api 层复用 |
| `src/stores/member.js` | `fetchOverview()` 走 `shortCache('member:overview')` |
| `src/stores/favorite.js` | 收藏走 `shortCache('favorite:product|tool:<scope>')`，**key 带账号作用域**；`load(true)` 强制穿透缓存；`toggle()` 成功按类型失效 |
| `src/stores/mail.js` | 未读数走 `shortCache('mail:unread')`，`markRead` 成功后失效 |
| `src/stores/cart.js` | 购物车走 `shortCache('cart:list')`，增删改清空后失效（**不在 `applyPayload` 里失效**，否则读路径自己废掉缓存） |
| `src/stores/user.js` | 登录成功、退出登录各清一次 `shortCache`（换人不能看到上一个人的会员/收藏/购物车/未读） |
| `src/api/ask/shop.js` | 分类与商品列表走 `shortCache`，**key 按键名排序 + 原语归一**（不同调用方传参顺序不同、`true` 与 `'true'` 混用，否则算出两个 key，缓存白做） |
| `src/components/AppleIdSection.vue` | `.ids-grid` 改 `repeat(auto-fit, minmax(min(100%, var(--card-width)), 1fr))` + `justify-content: space-between`：卡片宽度自适应、剩余空间均摊（原固定列宽 + `start` 会在右侧留白） |

**修复**

- 收藏缓存的 key 原先不带账号：同一浏览器切换账号后会读到上一个账号的收藏，`load(true)` 也会被 8 秒缓存挡住。现在 key 带 `user:<id>`/`guest` 作用域、强制刷新穿透缓存。

**取舍**

- 短缓存 TTL 8 秒：写操作一律主动失效，所以正常操作看不到陈旧数据；只有「别人改了、我这边没操作」才会最多延迟 8 秒。
- `shop.js` 的缓存挂在 api 层而不是组件里：首页/分类页/导航会同时挂载并各请求一次，只有共享一层才能真正合并。
- 缓存实例是模块级单例（不是 Pinia state）：store 之间要共享同一份，放进 state 反而会因为是不同实例而各存一份。

---

## [2.3.0] — 2026-10-27 · 我的资产、签到位与页面细节收口

六项体验升级。新增一个受保护路由 `/user/assets`（我的资产），因此按 `2.3.0` 发；
另修掉一个跨端缺陷：**个人中心的 `checkin_available` 一直恒为 false**，导致「立即签到」按钮从未出现过。

### 变更

| 类别 | 内容 |
| --- | --- |
| 主题切换（继续） | 上一版把 VT 时长设成 180ms，观感仍是「闪一下」。子代理用冻结帧取证：把 `::view-transition-old/new(root)` 暂停在 50% 时，暗→亮是**整页一片中灰、正文读不出** —— 交叉淡出的中段必然混色，单纯拉长时长只会让灰更久。因此改为 **320ms + `var(--ec-ease-out)`**（该曲线约 30%≈96ms 已完成过半混合，余下时间收敛到新主题），并给 UA 默认 250ms 的 `::view-transition-group(root)` 显式同拍；`html:active-view-transition body, body *, *::before, *::after { transition: none !important }` 把 descend 上的常驻颜色过渡全部静音（否则新帧被拍成半旧色）；连点改用 `activeViewTransition.skipTransition()` 中止上一次，不再叠加 |
| 我的资产（新增） | 新增 `/user/assets` 页面：①数字商品（订单项里 `goods_type ∈ digital/account/service` 的拍平列表，含形态标签、数量、金额、下单时间、订单号回链）②我的卡密 ③已激活工具（工具名 / 来源 / 有效期 / 状态）。三块独立 loading / error / 刷新。服务端 `listOrderItems` 补 `LEFT JOIN products` 取 `goods_type`（商品已删除时为 null，前端按「形态未知」不下判） |
| 卡密页减法 | 卡密控制台**删掉「已激活工具」整张表**（含 `loadEntitlements`、`getEntitlementToolName`、`getEntitlementSource`），改为一条指路链接「已激活的工具在「我的资产」查看」；成功模板的次级动作从「查看已激活工具」改为「查看我的资产」 |
| 订单页分工 | 订单页顶部加一句「数字商品与卡密已汇总到 我的资产，实物商品的物流信息仍在本页订单里」。**没有**把数字商品从订单列表剔除——订单详情仍需完整订单 |
| 用户菜单 | 用户下拉在「我的收藏」之后新增「我的资产」（`credit-card` 图标），顺序：个人中心 → 我的订单 → 我的收藏 → 我的资产 → 卡密管理 → 每日签到 → 退出 |
| 每日签到 | 个人中心签到卡最右按钮按状态切换：今天没签到 → 主色「立即签到」（就地签到，`pointsStore.doCheckin()` + 刷新会员总览，1000ms 闸门防连点，成功 Toast 带「获得 X 积分（连签 N 天）」）；已签到 → 次级「查看签到日历」跳日历页 |
| 邀请中心 | `.invite-code-card` 改两栏 grid（`minmax(0,.85fr) minmax(0,1.15fr)`、栏距 40px、内距 32px），邀请码与邀请链接各带一个复制按钮，说明行横跨两栏。根因是 `.ui-card` 自带 `flex-direction: column`，旧代码只覆盖了 `display: flex`，于是链接块的 `flex: 1 1 30×space-unit` 被当成**高度**基准 → 1440 下卡片 435px、按钮下方约 150px 死白；改后 198px |
| 共享 Apple ID | 删掉右侧两段 `ui-card tool-aside-card`（使用说明 / 注意事项），页面落单列；`risk-warning` 上移到左轨顶部并压短文案；文案去重为「使用教程 4 条 + 注意事项 5 条」（删「下载软件 / 安装说明 / 重要警告」三条与教程重复的，独有信息折进「账号用途」「双重验证」）；`.ids-grid` 由 `minmax(var(--card-width), 1fr)`（会把卡片拉宽）改为固定 `var(--card-width)` + `justify-content: start`，1440/1199/768 每排 2 张、390 一张；左轨改单滚动容器，锚点跳转仍落在顶栏下方 |
| 结果类图标 | 结果反馈里的 `app-icon` 偏大偏粗，统一按 EC 的 `.ic` 口径收口：`.ec-redeem-result__icon` 24px、`.ec-result__icon` 26px、空态 `.u-empty-icon` 32px（`--empty-icon-size` 64→40、图标取其 0.8）、会员四态图标 32px，**描边统一 1.5**（覆盖 scoped 的 `width: 1em` 与组件默认 `stroke-width: 2.5`）。页头 / 按钮 / 导航的小图标不动——那里的 2.5 是为 16–20px 视觉重量做的补偿 |

### 修复

- **`checkin_available` 恒为 false（跨端）**：`buildMemberOverview` 从 `sstc.get_points_account()` 的返回里读 `checkin_available`，而这个库函数**从来没下发过该键**（`docs/API.md` 一直在按「有」写）。新增迁移 `2026-10-27-checkin-available-fix.sql` 提供 `sstc.has_checked_in_today(user_id)`，`/memberApi/getOverview` 把它作为 `buildMemberOverview` 的第 5 个参数传入；不传时仍退回旧字段，历史调用方行为不变。修好后新账号才第一次看到「立即签到」。

### 已知取舍

- **主题过渡时长仍是字面量**（VT 320ms、回落 240ms）。令牌层没有「主题过渡」这一档，加令牌意味着为一个只有两处使用的时间值扩公共契约，判断为不值得。
- **`goods_type` 目前只驱动「数字商品」这块**：库里 9 个商品的 `goods_type` 全是 `digital`（迁移的默认值），所以牛仔裤、T 恤这类实物也会出现在「数字商品」里。**需要运营在管理后台把实物商品改成 `physical`**，前端不做名称猜测。
- **`.u-mm-state-icon` 的 32px 没有真实页面可验**：会员各页都有数据，四态图标不显示；靠 CSS 断言与构建产物守护。
- **共享 Apple ID 的左侧 rail 在 992–1099px 只容得下一张卡**：右区减去 rail 后宽度不足两张 280px 卡 + 栅距，属几何必然，不是回归。
- **邀请链接文案仍由后端拼**（`/?invite=XXXX`），本轮只改布局没动生成逻辑。

---

## [2.2.0] — 2026-10-27 · 主题过渡、工具访问鉴权与卡密控制台合并

八项体验与正确性升级。**主题切换的实现方式变了**（改用 View Transitions API，旧浏览器回落旧方案），
另外服务端新增 `POST /toolApi/openTool` 作为工具访问的唯一判定点，因此按 `2.2.0` 发。

### 变更

| 类别 | 内容 |
| --- | --- |
| 主题切换 | 换肤主路径改为 `document.startViewTransition(() => apply())`：整页一次性交叉淡出，**渐变（`background-image`）、阴影、描边、图片一起过渡**——旧方案只插值 `background/border/color/fill/stroke`，渐变与阴影是跳变的，这正是「一半渐变、一半跳变」的生硬来源。`::view-transition-old/new(root)` 用 180ms `--ec-ease-out`、`mix-blend-mode: normal`；`html:active-view-transition body { transition: none }` 避免双份动画。不支持 VT 时回落原 `is-theme-switching` 方案并把过渡属性补到 7 项、时长 200ms→240ms；`prefers-reduced-motion` 两条路径都直切。对外 API 与 `ec-theme` 存储键未变 |
| 用户 UID | 个人中心该行的 `.ec-code` **去掉设计系统自带的阴影**（本地 `box-shadow: none`，靠 scoped 特异性覆盖，不用 `!important`）；文案「用户标识」统一改「用户 UID」（`TRADE.profileFields.uuid` 是唯一来源，`aria-label` 同步）；掩码/明文、30s 回掩码、复制逻辑未动 |
| 在线状态 | 删掉头像右下角的游客徽标「游」（身份改由下拉菜单表达）；呼吸灯 9px→**6px**、描边 2px→**1.5px**、扩散终值 6px→**4px**，仍然只动 box-shadow 与 opacity、reduced-motion 下静止 |
| 卡密控制台 | 「激活新卡密」与「会员免卡密激活」**合并成一套表单**：工具下拉 + 一个输入框（占位「粘贴卡密 / 用户 UID」）+ 主按钮。输入 400ms 防抖后按**结构**识别：标准 UUID（5 段）→ 会员通道、`XXXX-XXXX-XXXX`（3 段十六进制）或 12 位紧凑写法 → 卡密通道（自动选中该卡密绑定的工具）；五段形状但 UUID 不合法 → 不认（避免打错一位被兜底成卡密后静默 404）；认不出就不发请求、按钮置灰。提交前再同步判一次，防止防抖窗口内点按钮走错通道。`.console-side` 左下新增**说明框**（四条「怎么用」，把原 `panel-sub` 与会员身份/有效期文案并进去） |
| 防连点 | 新增 `src/utils/rateLimit.js`（`debounce` / `throttle` leading+trailing / `createClickGuard` / `guardAsync`）。接入：加购（600ms 冷却）、下单（1500ms）、收藏开关（只挡「上一次没结束」，冷却 0，避免吞掉取消后立刻再收藏）、打卡补签（800ms）、退出登录（1000ms）、两条卡密激活路径。其中加购/下单/收藏原先**没有**忙碌标记，连点会真的发出两次写请求 |
| 工具标签与形态 | 商品卡在标题前加形态角标（虚拟商品 / 实物 / 服务 / 账号，无值不渲染、不猜成 digital）；商品详情按形态给交付说明，实物商品在有 `weight_kg` / `dimensions` 时带出「约 X kg」「长 × 宽 × 高 cm」 |
| Toast 着色 | 提示条图标按类型着色。根因：EC 的图标约定是 `class="ic"`，而 `AppIcon` 渲染的是 `app-icon`，所以 `.ec-toast--success .ic` 这类规则**从未命中**，成功/失败图标一直是默认灰。改为在 `ToastHost` 里按四型给 `.toast-icon` 上 `--ec-success` / `--ec-danger` / `--ec-warning` / `--ec-info`（不给 `AppIcon` 全局加 `ic`，那会把全站描边 2px→1.5px 一起改掉） |
| 已激活工具 | 卡密控制台右栏新增「已激活工具」表（工具名 / 来源 / 有效期 / 状态），数据来自 `/kamiApi/myEntitlements`——服务端每条授权补了 `tool_name` / `tool_slug`（LEFT JOIN `tools`）。此前用会员额度激活后，`/kamiApi/getUserCards` 只返回卡，列表上完全看不到刚激活的工具 |
| 工具访问鉴权 | 服务端新增 `POST /toolApi/openTool`：按 `access_policy` 四档 + 维护中/已下架判定放行，**只有放行才返回 `url`**，拒绝分支不带 `tool_path` / `tool_slug`（否则「被拒」只是换个姿势读地址）。`/getTools`、`/getTool/:idOrSlug` 对无权限的工具同样脱敏并给 `locked` / `gate`。前端 `useOpenTool` 改为先同步开占位窗口再请求，失败关窗并按错误码提示 |

### 已知取舍

- **View Transitions 只在支持它的浏览器生效**（本机 Chrome 155 实测）。不支持的浏览器走回落路径：颜色与阴影会过渡，但渐变仍是淡入淡出后的跳变，这是能力差距不是缺陷。
- **主题过渡时长用的是字面量**（VT 180ms、回落 240ms）：令牌层只有 `--ec-dur-fast=150` / `--ec-dur-base=250`，180ms 与 `ThemeSwitch` 滑块同拍，240ms 与回落方案的观感对齐。
- **合并后的卡密输入框不再按身份禁用会员通道**：同一个输入框还要服务卡密，无法预判；非会员提交后由服务端 403 `NOT_MEMBER` 接住，错误区给「升级会员」出口。说明框里「UID 可留空」这条在界面上不可达（空输入时按钮已置灰），代码路径保留。
- **`goods_type` 只在详情链路补了 `weight_kg` / `dimensions`**：列表接口 `/getProducts` 的字段集合本就与详情不同（连 `category_id` 都不返回），卡片也不展示重量体积，因此没在列表里复制一份归一化逻辑。
- **形态筛选未加**：分类页本来没有任何排序/筛选控件，加它要新造一套控件与样式，超出本轮范围。
- **`/userBackend` 订单管理确认不再补**：运营查询已在管理后台，见根 README。

---

## [2.1.0] — 2026-10-26 · 全量操作日志、会员免卡密额度与交互细节

八项体验升级。没有删改既有路由，但**导出的日志文件列全变了**（属对外可见的可感知变更），
因此按 `2.1.0` 而不是补丁号发。

### 变更

| 类别 | 内容 |
| --- | --- |
| 操作日志 | `userLogsApi` 从「工具使用记录」升级为**本人全部重要操作**：`user_events`（登录 / 访客登录 / 注册）+ 10 个业务主表 `UNION ALL`（工具使用、下单、卡密兑换、收藏、加购、签到、积分变动、成长值变动、优惠券、会员开通）。CSV 列改为 `时间, 类别, 动作, 对象类型, 对象标识, 说明, 结果`，文件名 `user-activity-<range>-<YYYY-MM-DD>.csv`；卡号在服务端 SQL 里就脱敏，CSV 注入防护与三档时间窗不变 |
| 用户标识 | 个人中心的用户标识把 `<dd class="u-field-value">` **直接换成** `.ec-code`（不是在新结构里再嵌一层），`__label` / `__value` / `__act` 是 `<dd>` 的直接子元素；`.profile-field-value` 成为该列唯一行高与内边距来源，兄弟行仍然统一；眼睛按钮 30s 回掩码、复制明文、`aria-pressed` 全部保留 |
| 在线状态 | 导航栏头像右下角加 9px 呼吸灯：`--ec-success` 圆点 + 2px 表面色描边，`::after` 阴影 2px→6px、2s 循环、**不用 transform**（避免与头像的 hover 位移打架），`prefers-reduced-motion` 下静止。判定用 `hasIdentity`（游客也算在线），不用 `isLoggedIn`（它等于 `user_type === 'registered'`） |
| 用户菜单 | 删除「账号资产」分组标题的可见文字，改为视觉隐藏（`:99-121` 的无障碍断言仍成立），首项补 16px 上间距补回落差 |
| 卡密控制台 | 修 `.panel` 的 `overflow: hidden` 裁掉绝对定位下拉面板（20 个工具全部可见，覆盖到下方会员卡之上）；粘贴卡密后 400ms 防抖请求 `lookupCard`，命中则**自动选中对应工具**并 Toast 提示，过期/已用/无绑定静默；会员免卡密激活卡片常驻，非会员显示开通引导，额度用尽给「升级会员 / 购买卡密」双出口 |
| 主题切换 | 切换瞬间给 `<html>` 挂 `is-theme-switching` 260ms，只过渡 `background-color / border-color / color / fill / stroke` 200ms `--ec-ease-out`；连点先 `clearTimeout` 复位。`ThemeSwitch` 滑块改容器 `::before` + `transform` 180ms，位置读 `<html data-theme-mode>` |
| 工具标签 | 修 `.ec-tool__tags` 的 `align-items: stretch`（标签高 20px 被拉到 28px 按钮上沿，中心差 4px）→ `center`；新增 `src/constants/toolTags.js`，按「工具名 + 描述」关键词派生 2–4 汉字标签、最多 3 个、跳过与平台标签重复者 |
| 会员免卡密额度 | 服务端新增 `get_member_tool_quota()` / `grant_member_tool_entitlement()` 两个库函数与三个端点（`lookupCard` / `memberQuota` / `activateByMember`）；`tool_entitlements.grant_source` 区分卡密与会员来源；额度取 `member_levels.free_tool_quota`（v1–v8 = 1/1/2/3/5/8/不限/不限），会员权益有效期跟随会员到期时间自动收回；发放走 `SELECT … FOR UPDATE` 串行化，避免并发超发 |

### 已知取舍

- **日志用 UNION 而不是双写**：业务动作只在各自主表留有事实，导出时拼起来。好处是历史数据自动覆盖、不会出现两份真值；代价是业务表里的记录被物理删除后，日志里也看不到了。
- **会员额度只在卡密控制台生效**：`/user/kami` 提供「免卡密激活」，工具页仍按 `access_policy` 判断，两者不互相消费。工具页自动识别会员额度需要服务端在 `getTools` 里合并权益视图，本轮未做（已在 server `docs/API.md` §4.35 标注）。
- **游客没有账号历史**：日志按 `user_id` 聚合，游客身份在转注册前产生的操作不会挂到新账号上。
- **`JWT_SECRET` 不随仓库分发**：本地 `.env` 里填的是开发值（原先留空会导致每次重启生成临时密钥、所有会话失效）。部署时必须换成真实密钥。

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
