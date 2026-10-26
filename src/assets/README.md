# assets 目录说明

> 视觉的唯一来源是 **EC Design System**：原样拷贝在 `assets/ec/`，
> 本站只维护一张「旧令牌名 → EC 语义令牌」的对照表（`styles/variables.css`）
> 与项目组件层（`styles/global.css`、`styles/ui-kit-*.css`）。
> **组件模式与改动纪律的单一来源是 `.dsh/skills/project-ui-system/SKILL.md`**，
> 本文只说明 `src/assets/` 这个目录本身。

## 目录构成

```
src/assets/
├── ec/                 # EC 设计系统（原样拷贝，勿手改，同步时整体替换）
│   ├── tokens/         #   四层令牌 + 暗色覆写
│   ├── ec.css          #   组件库：基线 + 原子 + 组合
│   └── ec-business.css #   业务组件（价格 / 商品 / 卡密 / 会员）
├── styles/
│   ├── variables.css   # 旧令牌名 → EC 语义令牌的对照表（不持有任何色值）
│   ├── global.css      # 重置、组件层共享类、共享动效、移动端缩放
│   ├── ui-kit-form.css # 组件套件：下拉 / 复选 / 开关
│   ├── ui-kit-nav.css  # 组件套件：选项卡 / 明暗切换
│   ├── ui-kit-data.css # 组件套件：表格 / 日期选择
│   ├── ui-kit-feedback.css # 组件套件：骨架 / 空态 / 徽标 / 滚动条 / 通用状态
│   │                  （第三批规范原有 19 族，9 族 0 引用已于 2026-10-25 删除）
│   ├── ui-kit-member.css   # 业务复合件：会员域 + 邮件域（`.u-mm-`）
│   └── ui-kit-tool.css     # 工具页骨架（`.tool-`）
└── README.md
```

**不存在** `images/`、`fonts/` 目录，也没有任何 `@font-face` 声明。

- 图片资源统一使用外链 URL（如 `product.main_image_url`），不放在本目录
- 字体走 EC 的字体栈（`--ec-font-sans` = HarmonyOS Sans SC / PingFang SC /
  微软雅黑 / system-ui），只额外从 Google Fonts 引一个 **JetBrains Mono**
  （卡密、代码块、数字表格靠它对齐）

## 引入方式

`main.js` 按下面的顺序引入，**顺序不可调换**：

```js
import './assets/ec/ec.css'                 // ① 令牌四层 + EC 组件库 + 基线重置
import './assets/styles/variables.css'      // ② 旧名 → EC 语义令牌的对照表
import './assets/styles/global.css'         // ③ 项目组件层（.u-* / .ui-* / .page-*）
import './assets/styles/ui-kit-form.css'    // ④ 分片组件套件（必须在 ③ 之后）
import './assets/styles/ui-kit-nav.css'
import './assets/styles/ui-kit-data.css'
import './assets/styles/ui-kit-feedback.css'
import './assets/styles/ui-kit-member.css'
import './assets/styles/ui-kit-tool.css'
```

为什么是这个顺序：

- ① 必须先到，否则 ② 里的 `var(--ec-*)` 没有可解析的值（CSS 变量在计算值阶段解析，
  未定义时整条声明被丢弃 —— 表现为「样式全没了」，且不报任何错）；
- ③ 在 ① 之后，才能覆盖 EC 的基线重置（例如 EC 的 `svg { display: block }`
  会让行内图标错位，`AppIcon` 用 `display: inline-block` 顶回来）；
- ④ 在 ③ 之后，骨架屏动画名与滚动条的令牌化版本都在分片里覆盖基础层。

**不要**在 `global.css` 里再 `@import './variables.css'` —— 那会让 `:root` 被输出两次。

## EC 令牌四层

| 层 | 文件 | 职责 | 谁能引用 |
| --- | --- | --- | --- |
| Primitive | `ec/tokens/primitive.css` | 只描述「是什么颜色」 | 仅 Semantic |
| Semantic | `ec/tokens/semantic.css` | 赋予角色（背景/文字/描边/行动/功能/渐变） | 唯一可被广泛引用 |
| Component | `ec/tokens/component.css` | 组件旋钮（按钮/输入/卡片/表格/弹层…） | 组件库与业务样式 |
| Business | `ec/tokens/business.css` | 业务语义（价格/卡密/会员/状态点） | 仅业务组件 |

外加 `type.css`（7 级字阶 + 字体族）与 `theme-dark.css`（暗色覆写，只改 token）。

**硬规则**

1. 业务代码与组件代码禁止引用 Primitive；
2. 色值只允许出现在 `ec/tokens/` 里；
3. Business Token 只给业务组件用；
4. 新增令牌必须声明替代关系与迁移路径（见 EC 的 `DESIGN.md §17`）。

## variables.css：一张对照表

它**不持有任何取值**，只把旧名指到 EC 语义令牌：

```css
--bg-page:      var(--ec-bg-base);
--text-primary: var(--ec-text-primary);
--text-muted:   var(--ec-text-tertiary);   /* neutral-450，5.47:1；旧值只有 2.53 */
--accent:       var(--ec-action-primary);
--fs-h1:        var(--ec-h1-size);
--radius-card:  var(--ec-radius-lg);
--btn-height:   var(--ec-control-h-md);
```

为什么保留旧名而不是全量改名：这些名字被 90 个页面与 6 个组件分片引用了 400 余处，
逐个改名是纯机械动作、零视觉收益，却把回归面从「一处」放大到「九十处」。
桥接层让**取值只有一个来源**（EC），改动面收敛到一个文件。

铁律（`test/themeContract.test.js` 强制）：

- 只允许 `var(--ec-*)` 与结构性常量（1px、比例、`--mobile-*-scale`），**不得出现色值**；
- **不得覆写 `--ec-*`** —— 覆写会盖掉 `theme-dark.css`，暗色就废了；
- 引用的每个 `--ec-*` 都必须在令牌层里存在。

**这里不应存在无人使用的令牌。** 定义了却没人用会稀释「可用令牌」的信号，
结果是作者继续写新的硬编码值 —— `test/designTokens.test.js` 会把「死令牌」
和「引用了未定义令牌」都判为失败。判定「无人使用」时**会排除 `variables.css`
与 `ec/tokens/`**：那是写出令牌名的地方，不是消费令牌的地方。

**只有一类局部变量不在这里声明**（由检查器放行）：
`--i`，由 `:style="{ '--i': index }"` 注入，供 `.u-enter` 计算错峰入场延迟。

**断点没有令牌**：CSS 自定义属性无法用于 `@media`，实际断点必须写字面量，
统一使用 `1199px` / `991px` / `767px` / `575px`（`min-width` 互补写法用 `768px`）；
同一文件内不得重复声明相同的媒体查询。EC 的 `ec.css` 自带 640 / 768 / 900 断点，
那是设计系统的，检查器把它整体排除（`assets/ec/` 是原样拷贝，不参与本地纪律）。

## 明暗主题

- 只认 `<html data-theme="light|dark" data-theme-mode="light|dark|auto">`；
- `stores/theme.js` 只写属性、记偏好（`localStorage` 的 `ec-theme`），**不合成取值**；
- 暗色由 `ec/tokens/theme-dark.css` 在 `:root[data-theme="dark"]` 下覆写同一批令牌，
  组件层零改动；
- 首屏由 `index.html` 里的一段同步脚本兜底（同一存储键、同一判定），避免闪一下。

**暗色层级铁律**：靠**表面提亮 + 1px 描边**，不靠阴影 —— 阴影只做「沉下去」。
**暗色文字铁律**：所有实色面（primary / danger / success / badge）在暗色下都被提亮，
压在上面的文字必须反相为深字（`--ec-text-on-action` 在暗色下取 ink-900）。

## 图标：AppIcon + iconSet

界面图标一律走 `components/AppIcon.vue` + `utils/iconSet.js`，**不用 emoji**。

- **颜色只来自 `currentColor`**：AppIcon 里不写任何颜色，因此图标跟随所在位置的
  文字色，也就跟随明暗令牌。emoji 由字体渲染成彩色位图，CSS `color` 对它无效。
- **尺寸 `1em`**：跟着 font-size 走，因而自动跟随字阶与移动端缩放系数。
- **线宽 `ICON_STROKE_WIDTH`（24 网格上 2.5）**：缩到 16–20px 的图标格后约 1.7–2px，
  与 1px 的描边体系同量级；圆滑由 `stroke-linecap/linejoin: round` 保证。
- **`display: inline-block`**：EC 基线里有 `svg { display: block }`（那是给内容图片的），
  图标是行内文字的一部分，必须显式顶回来，否则 `vertical-align` 失效、图标与文字错位。
- **`filled` prop**：实心填充（填充色仍是 currentColor），用于「收藏/未收藏」这类二元状态。
- 需要与文字并排时靠 `vertical-align: -0.125em` 对齐，不要再包一层 span 调教。

数据的 emoji（`sstc.tools.icon`、`product_categories.icon_url`）用
`emojiToIconName()` 映射；**映射不到时调用方原样显示那个 emoji**（运营随时会录新的）。
`emojiToIconName` 内部必须走 `utils/safeLookup.js` 的 `lookup` —— 键来自外部数据，
`obj[key]` 会沿原型链取到 `toString` 这类函数。

守卫：`test/noEmojiIcons.test.js`（界面不得出现 emoji + 映射表覆盖数据库实际取值）。

## global.css

1. **基础重置**：盒模型、`html/body` 尺寸、字体与行高、页面底色
2. **元素重置**：按钮、链接、输入框、列表、标题默认排版、图片、焦点环
3. **共享动效**：`enterUp`（起点由 `--enter-shift`/`--enter-scale` 决定）、`float`、`spin`；
   `.u-enter`（配 `--i` 错峰）、`.scroll-reveal`（scroll-driven，包在 `@supports` 内）
4. **组件层共享类**（逐条对齐 `assets/ec/ec.css` 的 EC 组件）：

   | 组件 | 类 | 对应的 EC 组件 |
   | --- | --- | --- |
   | 按钮 | `.u-btn-primary` / `.u-btn-secondary` / `.u-icon-btn` | Button / IconButton |
   | 输入框 | `.u-input` / `.u-search` / `.u-search-icon` | Input |
   | 字段（表单） | `.u-field` / `.u-field-label` / `.u-field-hint` / `.u-field-value` | Form Field |
   | 卡片 | `.ui-card` / `.ui-card--lg` / `.ui-card-media` / `.ui-card-body` / `.ui-card-title` / `.ui-card-sub` | Card / ProductCard |
   | 价格 | `.u-price` / `.u-price-decimals` / `.u-price-original` / `.u-discount` | PriceText |
   | 标签 | `.u-tag` + `--accent/--success/--warning/--danger/--info/--muted` | Tag |
   | 提示框 | `.u-toast-host` / `.u-toast` / `.u-toast--*` / `.u-toast-icon` / `.u-toast-text` / `.u-toast-close` | Toast |
   | 模态框 | `.u-modal-overlay` / `.u-modal` / `.u-modal-title` / `.u-modal-body` / `.u-modal-foot` / `.u-modal-close` | Dialog |
   | 下拉 | `.u-dropdown` / `.u-dropdown-item` / `.u-dropdown-item--active` / `.u-dropdown-divider` | Select 菜单 |
   | 进度与加载 | `.u-progress` / `.u-progress-bar` / `.u-spinner`(+-sm/-lg) / `.u-loading-block` | Progress / Spinner |
   | 头像 | `.u-avatar` | Avatar |
   | 事务页外壳 | `.page-shell` / `.page-shell-head`(+-row) / `.page-shell-eyebrow` / `.page-shell-title`(+-link) / `.page-shell-desc` | PageShell |
   | 事务页面板 | `.page-panel` / `.page-panel-head` / `.page-note`(+-warning/-error) / `.page-empty`(+-title/-hint) / `.page-actions` | Card |
   | 区块容器 | `.section-inner` / `.section-header` 系列 | — |

   **为什么叫 `.u-*` 而不直接改成 `.ec-*`**：这 20 余个类被 90 个页面引用。
   它们是**EC 组件的别名** —— 取值与视觉来自 EC，类名保持项目习惯。
   **新写的组件请直接用 `ec-*`**（`assets/ec/ec.css` 已全局可用）。

   **`.section-inner` 为什么必须放在共享层**：它是「区块内容容器」，原本在两个组件的
   `<style scoped>` 里各写了一份、逐字相同。而 **scoped 样式只作用于本组件** ——
   新写的 `HotToolsSection` 复用这个类名时拿到的是**零样式**：不限宽、不居中、
   没有内边距，整块内容横向铺满视口（用户报的「热门工具排版 bug」）。
   `test/componentClasses.test.js` 守住「模板里用到的类必须在共享层或本组件里有定义」。

5. **焦点管理**：`:focus-visible` 统一取 EC 的焦点环（2px `--ec-border-focus` + 2px offset）
6. **移动端缩放**：文件末尾三个媒体查询里统一处理
   控件高度 ×0.9、内边距 ×0.8、区块间距 ×0.6、标题 ×0.7、正文 ×0.95、圆角不变，
   并用不可见的 `::after` 把命中区补到 44×44（EC 无障碍基线）

## 已删除的类与关键帧（不要再引用）

| 名称 | 原因 |
| --- | --- |
| `.u-cta` / `.u-cta--lg` | 改名为 `.u-btn-primary`；规范也没有「大按钮」档 |
| `.u-btn` | 改名为 `.u-btn-secondary` |
| `.u-chip` / `.u-chip--active` | 改名为 `.u-tag` / `.u-tag--accent` |
| `.container` / `.text-gradient` / `.glass-effect` / `.glass-dark` | 无人使用，且规范禁止装饰性渐变 |
| `.shadow-lg` / `.shadow-xl` / `.rounded-card` / `.text-truncate*` / `.user-select-none` | 无人使用 |
| `.theme-switcher` / `.theme-card` / `.theme-range` | 五套主题弹窗已删除，换成 EC 的 `.theme-switch` |
| `@keyframes fadeInUp` / `fadeInScale` / `floatRandom` | 已由 `enterUp` + 令牌参数统一表达 |
| `@keyframes fadeInDown` / `glow` / `slideIn` / `slideInRight` / `pulse` | 无人引用 |
| `@keyframes meshFlow` | EC 不使用渐变网格背景 |

## 硬编码色值

`test/themeContract.test.js` 会挡住回流：

- 除 `assets/ec/tokens/` 与工具页的取色器（那是**用户数据**，必须能取任意色值）外，
  任何样式出现 `#hex` / `rgba()` → 失败；
- 需要新色值时，先在 EC 的 Semantic 层找到角色；找不到就补一个语义角色
  （并附对比度验算），**不要**在页面里写第二套色值。

## 对比度基线（实测，可复算）

| 前景 | 背景 | 比值 |
| --- | --- | --- |
| `--ec-text-primary` | `--ec-bg-base` | 15.12 |
| `--ec-text-secondary` | `--ec-bg-base` | 4.71 |
| `--ec-text-tertiary` | `--ec-bg-base` | 5.47 |
| `--ec-price-current` | `--ec-bg-surface` | 4.83 |
| 白字 | `--ec-grad-action` 最亮点 | 5.53 |
| 白字 | `--ec-grad-brand` cyan 端 | **1.81（不可承字）** |

最后一行是这套系统最重要的结构约束：**渐变必须分「装饰面」与「承字面」**。
按钮底一律用 `--ec-grad-action`，`--ec-grad-brand` 只用于封面占位、Hero、头像底。

## 改动约定

1. **先用令牌，再写值**。需要新色值先去 EC 的 Semantic 层找角色，找不到就补语义角色。
2. **`assets/ec/` 不要手改**。要改就去改设计系统，再整体同步过来
   （唯一例外：`ec.css` 顶部的 `@import` 路径）。
3. **组件样式放 `<style scoped>`**；确需跨组件复用的结构才提到 `global.css`，
   并同步登记到本文档。
4. **不要把整块 `<style>` 复制粘贴**（`Navbar.vue` 曾重复一整份，已删除）。
5. **scoped 样式不要跨组件选子组件的内部类名**（因 scoped 隔离永远匹配不到）；
   需要时用 `:deep()`，并说明为什么必须穿透。
6. 改完记得同步本文档与 `starry-sky-trading-company-web/README.md` 的样式体系章节。
