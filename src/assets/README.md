# assets 目录说明

> 设计令牌的单一来源在 `styles/variables.css` 与 `src/theme/presets.js` 两个文件，
> 本文说明它们的分工与用法。
> **组件模式与改动纪律的单一来源是 `.dsh/skills/project-ui-system/SKILL.md`**，
> 本文只说明 `src/assets/` 这个目录本身。

## 目录构成

```
src/assets/
├── styles/
│   ├── variables.css   # 令牌名册（204 个）+ 默认主题（tech-minimal）兜底值
│   └── global.css      # 重置、**组件层共享类**、共享动效、移动端缩放
└── README.md
```

**不存在** `images/`、`fonts/` 目录，也没有任何 `@font-face` 声明。

- 图片资源统一使用外链 URL（如 `product.main_image_url`），不放在本目录
- 字体由 `index.html` 一次性引入 Google Fonts（Inter / JetBrains Mono /
  Instrument Sans / Playfair Display / Oxygen），字体栈本身写在令牌里并带完整 CJK 兜底

## 引入方式

`main.js` 依次引入三份样式：

```js
import './assets/styles/variables.css'   // 令牌名册（默认主题兜底）
import './assets/styles/global.css'      // 全局样式 + 组件层共享类
import 'ant-design-vue/dist/reset.css'   // antd 重置
```

**不要**在 `global.css` 里再 `@import './variables.css'` —— 那会让 `:root` 被输出两次。

## 令牌的三层结构

| 层 | 文件 | 职责 |
| --- | --- | --- |
| 名册与兜底 | `src/assets/styles/variables.css` | 令牌**名** + 默认主题的值；JS 执行前的首屏兜底 |
| 取值 | `src/theme/presets.js` | 五套设计风格的完整取值（唯一数值来源） |
| 合成与应用 | `src/theme/compose.js` + `src/stores/theme.js` | 叠加「单项自定义」并把结果写到 `:root` |

三者的令牌集合必须完全一致，`test/themeContract.test.js` 会强制校验。
**新增令牌必须同时改 `variables.css` 与 `presets.js` 五套取值**，漏一处即失败。

`presets.js` 分两块，**分工是硬性的**（2026-10-04「主题尺寸统一」起）：

- `SHARED` —— 五套同值。**所有会改变盒子几何的令牌都在这里**（高 / 宽 / 内边距 /
  间距 / 字号 / 行高 / 密度基准 / 控件与轨道尺寸），加上本来就五套通用的语义色、
  提示框位置、移动端缩放系数等。几何类的取值统一以默认主题 `tech-minimal` 为基准。
- `MATRIX` —— 一行一个令牌、五列五套取值，列顺序由 `THEME_ORDER` 固定。
  **只剩不改变盒子几何的风格量**：颜色、字体族、字重/字距/大小写、圆角、阴影、
  滤镜、过渡与入场动效，以及描边粗细（1–2px）。

这样切换主题时布局不会跳动，用户不会觉得「窗口变大或变小」。
**新登记尺寸类令牌时要放进 `SHARED` 而不是 `MATRIX`** —— 放错的后果是静默的，
`test/themeContract.test.js` 的「全部几何令牌在五套主题下一致」会拦住它
（判据里 `--fs-` 与 `--leading-` 不可省，它们不含 height/width/size 任何词根）。

## 令牌的两层

### A. 基础层 —— 风格语言

| 类别 | 令牌 |
| --- | --- |
| 页面与表面 | `--bg-page` `--bg-mesh` `--mesh-animation` `--bg-media` `--bg-media-opacity` `--bg-surface` `--bg-surface-2` `--bg-nav` `--bg-elevated` `--bg-footer` `--bg-soft` `--scrim` `--scrim-backdrop` |
| 文字 | `--text-primary` `--text-secondary` `--text-muted` `--text-on-accent` `--text-footer` `--text-footer-muted` `--placeholder` |
| 强调与语义 | `--accent` `--accent-strong` `--accent-soft` `--success(-bg)` `--warning(-bg)` `--danger(-bg)` `--info(-bg)` |
| 描边与禁用 | `--border` `--stroke-width` `--stroke-color` `--card-hover-border` `--divider` `--disabled-bg` `--disabled-text` |
| 字体 | `--font-display` `--font-body` `--font-mono` `--font-price` |
| 字号/字重 | `--fs-display/h1/h2/h3/body/sm/label/price/price-decimals/price-original`、`--fw-display/heading/body/label/price` |
| 排版细节 | `--tracking-display` `--tracking-label` `--leading-body` `--leading-title` `--heading-transform` `--label-transform` |
| 圆角 | `--radius-card` `--radius-card-lg` `--radius-panel` `--radius-input` `--radius-media` `--radius-pill` `--btn-radius` |
| 间距与布局 | `--space-unit` `--grid-gap` `--section-gap` `--container-max/content/narrow/padding` |
| 导航 | `--navbar-height` `--nav-padding-x` `--nav-border-color` `--nav-logo-height` `--nav-menu-gap` `--nav-link-size` `--nav-backdrop` `--nav-scrolled-backdrop` `--nav-scrolled-shadow` |
| 阴影与毛玻璃 | `--shadow-card(-hover)` `--shadow-float` `--modal-shadow` `--effect-backdrop(-hover)` |
| 按钮行为 | `--btn-height/padding-y/padding-x/font-size/font-weight/border-width/border-color/shadow` `--btn-hover-bg/transform/shadow/border` `--btn-active-transform/shadow` `--btn-secondary-bg` |
| 卡片行为 | `--card-hover-transform` `--media-hover-scale` |
| 过渡 | `--transition-interactive` `--transition-surface` `--transition-btn` `--transition-progress` |
| 动效 | `--enter-shift/scale/duration/ease` `--stagger-step` `--decor-animation` |

### B. 组件层 —— 组件令牌

**尺寸五套相同，只有圆角与状态样式逐主题。** 下表按组件列出令牌，标 ⬛ 的是
「几何类」（在 `SHARED`，五套同值），标 🎨 的是「风格类」（在 `MATRIX`，逐主题）。

| 组件 | 令牌 |
| --- | --- |
| 输入框/搜索框 | `--input-height` `--input-padding-y/x` `--input-font-size` `--input-icon-size` `--input-icon-gap` `--input-focus-border/shadow/backdrop/outline/outline-offset` |
| 图标按钮 | `--icon-btn-size` `--icon-btn-radius` `--icon-btn-icon-size` |
| 卡片 | `--card-width(-lg)` `--card-padding(-lg)` `--card-image-height(-lg)` `--card-title-size` `--card-sub-size` |
| 价格 | `--price-color` `--price-bg` `--micro-badge-padding` `--micro-badge-radius` |
| 提示框 | `--toast-width` `--toast-padding-y/x` `--toast-radius` `--toast-icon-size` `--toast-font-size` `--toast-offset` `--toast-gap` |
| 模态框 | `--modal-width` `--modal-padding` `--modal-close-size` `--modal-title-size` `--modal-title-gap` `--modal-body-size` `--modal-body-gap` `--modal-footer-gap` |
| 下拉 | `--dropdown-width` `--dropdown-padding-y` `--dropdown-radius` `--dropdown-item-height` `--dropdown-item-padding-x` `--dropdown-active-bar` |
| 标签 | `--tag-height` `--tag-padding-y/x` `--tag-radius` `--tag-font-size` `--tag-font-weight` |
| 分页 | `--pager-size` `--pager-radius` `--pager-gap` `--pager-font-size` `--pager-active-bg/color/border/shadow` |
| 进度与加载 | `--progress-height` `--progress-radius` `--progress-track` `--spinner-size-sm/md/lg` `--spinner-border(-lg)` `--spinner-duration` `--skeleton-duration` |
| 头像 | `--avatar-size` `--avatar-radius` `--avatar-border-width/color` |
| 复选框 | `--checkbox-size` `--checkbox-radius` `--checkbox-icon-size` |
| 移动端缩放 | `--mobile-nav/control/padding/section/title/body-scale` |

**为什么要分两层**：基础层是「风格语言」（同一套骨架下的深浅、明暗、字体与动效差异），
组件层是「组件令牌」。**注意组件层不再等于「每个主题一套尺寸」** ——
尺寸类（高度、内边距、宽度）五套完全一致，只有圆角与状态样式逐主题。
分层仍然有用：「我想改按钮高度」这类需求去组件层找 `--btn-height`，
而不必在上百个令牌里翻找。

**为什么圆角要分这么多档**：规范给的是「卡片 20px / 面板 24px / 按钮 14px /
搜索栏全胶囊 / 图片 16px」这类**语义化**取值，通用的 4 级刻度（sm/md/lg/xl）
表达不了 14px 与 9999px 同时存在的情况。圆角也正是「尺寸统一」后各套风格
最直观的身份差异（neo 全直角、glass 胶囊），所以它留在逐主题矩阵里。

**颜色分层不可互换**：卡片/弹窗底色用 `--bg-surface` / `--bg-elevated`；
位于强调色**之上**的文字用 `--text-on-accent`（它在 neo-brutalism 下是黑色）。
输入框/次按钮/提示框/下拉/标签共用同一组描边令牌（`--stroke-width` + `--stroke-color`）——
规范里这五处的描边取值完全一致（只有 neo-brutalism 是 2px 纯黑），
拆成五组只会得到五个永远同值的令牌。

**这里不应存在无人使用的令牌。** 定义了却没人用会稀释「可用令牌」的信号，
结果是作者继续写新的硬编码值 —— `test/designTokens.test.js` 会把「死令牌」
和「引用了未定义令牌」都判为失败。
判定「无人使用」时**会排除 `variables.css` 与整个 `src/theme/`**：
那是写出令牌名的地方，不是消费令牌的地方，计入会让检查假通过。

**规范里有、但产品里没有对应组件的档位不入册。** 例如头像规范给了 20/28/36/44 四档，
但产品里只有导航栏一处头像，因此只登记了实际使用的那一档；
单选框（Radio）目前没有任何使用场景，整套令牌与样式都没有登记 ——
登记了就会触发死令牌检查。需要时按规范表补一行即可。

**只有一类局部变量不在这里声明**（由检查器放行）：
`--i`，由 `:style="{ '--i': index }"` 注入，供 `.u-enter` 计算错峰入场延迟。

文件末尾还有 `@media (prefers-reduced-motion: reduce)` 的全局降级规则。

**断点没有令牌**：CSS 自定义属性无法用于 `@media`，实际断点必须写字面量，
统一使用 `1199px` / `991px` / `767px` / `575px`（`min-width` 互补写法用 `768px`）；
同一文件内不得重复声明相同的媒体查询。

## global.css

1. **基础重置**：盒模型、`html/body` 尺寸、字体与行高、页面底色、背景网格/自定义背景图两层
2. **滚动条样式**：WebKit 定制（Firefox 走默认）
3. **元素重置**：按钮、链接、输入框、列表、标题默认排版、图片
4. **共享动效**：`enterUp`（起点由 `--enter-shift`/`--enter-scale` 决定，因此一套关键帧
   能表达五套规范里不同的入场方式）、`float`、`meshFlow`、`shimmer`、`spin`；
   `.u-enter`（配 `--i` 错峰）、`.scroll-reveal`（scroll-driven，包在 `@supports` 内）
5. **组件层共享类**（组件规范表的落地点）：

   | 组件 | 类 |
   | --- | --- |
   | 按钮 | `.u-btn-primary` / `.u-btn-secondary` / `.u-icon-btn` |
   | 输入框 | `.u-input` / `.u-search` / `.u-search-icon` |
   | 字段（表单） | `.u-field` / `.u-field-label` / `.u-field-hint` / `.u-field-error` / `.u-field-value` |
   | 卡片 | `.ui-card` / `.ui-card--lg` / `.ui-card-media` / `.ui-card-body` / `.ui-card-title` / `.ui-card-sub` / `.ui-card-interactive` |
   | 价格 | `.u-price` / `.u-price-decimals` / `.u-price-original` / `.u-discount` |
   | 标签 | `.u-tag` + `--accent/--success/--warning/--danger/--info` |
   | 提示框 | `.u-toast-host` / `.u-toast` / `.u-toast--{success,warning,error,info}` / `.u-toast-icon` / `.u-toast-text` / `.u-toast-close` |
   | 模态框 | `.u-modal-overlay` / `.u-modal` / `.u-modal-title` / `.u-modal-body` / `.u-modal-foot` / `.u-modal-close` |
   | 下拉 | `.u-dropdown` / `.u-dropdown-item` / `.u-dropdown-item--active` / `.u-dropdown-divider` |
   | 进度与加载 | `.u-progress` / `.u-progress-bar` / `.u-spinner`(+-sm/-lg) / `.u-loading-block` / `.u-skeleton` |
   | 头像与复选框 | `.u-avatar` / `.u-checkbox` / `.u-checkbox-box` |
   | 事务页外壳 | `.page-shell` / `.page-shell-head`(+-row) / `.page-shell-eyebrow` / `.page-shell-title`(+-link) / `.page-shell-desc` |
   | 事务页面板 | `.page-panel` / `.page-panel-head` / `.page-note`(+-warning/-error) / `.page-empty`(+-title/-hint) / `.page-actions` |
   | 区块容器 | `.section-inner`（限宽 + 居中 + 两侧内边距）/ `.section-header` 系列 |

   **`.section-inner` 为什么必须放在共享层**：它是「区块内容容器」
   （`max-width: var(--container-max)` + `margin: 0 auto` + `padding: 0 var(--container-padding)`），
   原本在 `CategoriesSection` 与 `HotProductsSection` 的 `<style scoped>` 里各写了一份、
   逐字相同。而 **scoped 样式只作用于本组件** —— 新写的 `HotToolsSection`
   复用这个类名时拿到的是**零样式**：不限宽、不居中、没有内边距，
   整块内容横向铺满视口，与上方区块对不齐（用户报的「热门工具排版 bug」）。
   现已收进 `global.css` 的第 13 节，组件的 scoped 副本已删除；
   `test/searchAndHotTools.test.js` 守住「共享层有定义、组件不得重复定义」。

   **事务页外壳为什么可以共享，而 `.page-header` 当年必须删掉**：
   `.page-header` 被删是因为**营销页**（分类索引 / 榜单 / 工作台 / 目录 / 编辑式双栏）
   各有自己的开场节奏，套同一个居中页头等于「一个模板换文案」。
   而购物车、订单、收藏、个人中心、法务与两个详情页属于**另一族**：
   信息密集型事务页 —— 窄标题带 + 单列内容 + 明确的动作区，版式本就应当一致。
   把这族的外壳收成一套共享类，好过在 8 个页面里各抄一遍（约 320 行相同 CSS）。

6. **共享结构类**：`.section-inner`、`.section-header` 系列、`.visually-hidden`、
   `.hide-mobile` / `.show-mobile`7. **焦点管理**：`:focus-visible` 统一样式
8. **移动端缩放**：文件末尾三个媒体查询里统一处理
   控件高度 ×0.9、内边距 ×0.8、区块间距 ×0.6、标题 ×0.7、正文 ×0.95、圆角不变

## 已删除的类与关键帧（不要再引用）

| 名称 | 原因 |
| --- | --- |
| `.u-cta` / `.u-cta--lg` | 改名为 `.u-btn-primary`；规范也没有「大按钮」档 |
| `.u-btn` | 改名为 `.u-btn-secondary` |
| `.u-chip` / `.u-chip--active` | 改名为 `.u-tag` / `.u-tag--accent` |
| `.container` / `.text-gradient` / `.glass-effect` / `.glass-dark` | 无人使用，且规范禁止装饰性渐变 |
| `.shadow-lg` / `.shadow-xl` / `.rounded-card` / `.text-truncate*` / `.user-select-none` | 无人使用 |
| `@keyframes fadeInUp` / `fadeInScale` / `floatRandom` | 已由 `enterUp` + 令牌参数统一表达 |
| `@keyframes fadeInDown` / `glow` / `slideIn` / `slideInRight` / `pulse` | 无人引用 |

## 硬编码色值

原实现里散布着约 79 处硬编码色值。两轮重构已把它们收敛进令牌，
`test/designTokens.test.js` 与 `test/themeContract.test.js` 会挡住回流：

- 组件样式里出现 `#` 开头的色值、或写死的字号/尺寸/圆角/阴影 → 视为缺陷；
- 需要新色值时，先在 `variables.css` 登记语义化令牌，再补 `presets.js` 五套取值。

## 改动约定

1. **先用令牌，再写值**。需要新令牌就去 `variables.css` 登记 + `presets.js` 五套都补。
2. **组件样式放 `<style scoped>`**；确需跨组件复用的结构才提到 `global.css`，
   并同步登记到本文档。
3. **不要把整块 `<style>` 复制粘贴**（`Navbar.vue` 曾重复一整份，已删除）。
4. **scoped 样式不要跨组件选子组件的内部类名**（因 scoped 隔离永远匹配不到）。
5. 改完记得同步本文档与 `starry-sky-trading-company-web/README.md` 的样式体系章节。
