# assets 目录说明

> 设计令牌的单一来源有两个文件，本文说明它们的分工与用法。
> **组件模式与改动纪律的单一来源是 `.dsh/skills/project-ui-system/SKILL.md`**，
> 本文只说明 `src/assets/` 这个目录本身。

## 目录构成

```
src/assets/
├── styles/
│   ├── variables.css   # 令牌名册 + 默认主题（tech-minimal）兜底值
│   └── global.css      # 重置、共享结构类、共享动效
└── README.md
```

**不存在** `images/`、`fonts/` 目录，也没有任何 `@font-face` 声明。

- 图片资源统一使用外链 URL（如 `product.main_image_url`），不放在本目录
- 字体由 `index.html` 一次性引入 Google Fonts（Inter / JetBrains Mono /
  Instrument Sans / Playfair Display），字体栈本身写在令牌里并带完整 CJK 兜底

## 引入方式

`main.js` 依次引入三份样式：

```js
import './assets/styles/variables.css'   // 令牌名册（默认主题兜底）
import './assets/styles/global.css'      // 全局样式
import 'ant-design-vue/dist/reset.css'   // antd 重置
```

**不要**在 `global.css` 里再 `@import './variables.css'` —— 那会让 `:root` 被输出两次。

组件样式一律写在各自的 `<style scoped>` 中，并用 `var(--token)` 引用令牌。
五套风格的**运行时取值**由 `src/stores/theme.js` 写到 `<html>` 的行内样式上，
优先级高于 `variables.css` 的 `:root`。

## 令牌的三层结构

| 层 | 文件 | 职责 |
| --- | --- | --- |
| 名册与兜底 | `src/assets/styles/variables.css` | 令牌**名** + 默认主题的值；JS 执行前的首屏兜底 |
| 取值 | `src/theme/presets.js` | 五套设计风格的完整取值（唯一数值来源） |
| 合成与应用 | `src/theme/compose.js` + `src/stores/theme.js` | 叠加「单项自定义」并把结果写到 `:root` |

三者的令牌集合必须完全一致，`test/themeContract.test.js` 会强制校验：
**新增令牌必须同时改 `variables.css` 与 `presets.js` 五套取值**，漏一处即失败。

### 令牌分组（完整清单见 `variables.css`）

| 类别 | 令牌 |
| --- | --- |
| 页面与表面 | `--bg-page` `--bg-mesh` `--mesh-animation` `--bg-media` `--bg-media-opacity` `--bg-surface` `--bg-surface-2` `--bg-nav` `--bg-elevated` `--bg-footer` `--bg-soft` `--scrim` |
| 文字 | `--text-primary` `--text-secondary` `--text-muted` `--text-on-accent` `--text-footer` `--text-footer-muted` |
| 强调与语义 | `--accent` `--accent-strong` `--accent-soft` `--border` `--border-strong` `--divider` `--disabled-bg` `--disabled-text` `--danger(-bg)` `--success(-bg)` `--price-color` `--price-bg` |
| 字体与排版 | `--font-display` `--font-body` `--font-mono` `--font-price`；`--fs-*`（display/h1/h2/h3/body/sm/label/price）、`--fw-*`、`--tracking-*`、`--leading-body`、`--heading-transform`、`--label-transform` |
| 圆角 | `--radius-card` `--radius-panel` `--radius-btn` `--radius-cta` `--radius-input` `--radius-media` `--radius-chip` `--radius-pill` |
| 间距 | `--space-unit` `--card-padding` `--card-gap` `--grid-gap` `--section-gap` `--panel-padding` |
| 布局 | `--container-max` `--container-content` `--container-narrow` `--container-padding` `--navbar-height` |
| 阴影与悬停 | `--shadow-card(-hover)` `--shadow-elevated` `--shadow-cta(-hover/-active)` `--card-hover-transform` `--card-hover-border` `--media-hover-scale` `--cta-hover-transform` `--cta-active-transform` `--cta-border-width` `--cta-border-color` |
| 玻璃与过渡 | `--effect-backdrop(-hover)` `--nav-backdrop` `--transition-interactive` `--transition-surface` `--transition-cta` |
| 动效 | `--enter-shift` `--enter-scale` `--enter-duration` `--enter-ease` `--stagger-step` `--decor-animation` |

**颜色分层不可互换**：卡片/弹窗底色用 `--bg-surface` / `--bg-elevated`；
位于强调色**之上**的文字用 `--text-on-accent`（它在浅色主题下不是白色）。

**为什么圆角要分这么多档**：规范给的是「卡片 20px / 面板 24px / 按钮 14px /
搜索栏全胶囊 / 图片 16px」这类**语义化**取值，通用的 4 级刻度（sm/md/lg/xl）
表达不了 14px 与 9999px 同时存在的情况。

**这里不应存在无人使用的令牌。** 定义了却没人用会稀释「可用令牌」的信号，
结果是作者继续写新的硬编码值 —— `test/designTokens.test.js` 会把「死令牌」
和「引用了未定义令牌」都判为失败。
判定「无人使用」时**会排除 `variables.css` 与整个 `src/theme/`**：
那是写出令牌名的地方，不是消费令牌的地方，计入会让检查假通过。

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
4. **共享动效**：
   - `enterUp` —— 入场关键帧，起点由 `--enter-shift` / `--enter-scale` 决定，
     因此同一套关键帧能表达五套规范里不同的入场方式（位移渐显 / 缩放弹性 / 纯淡入）
   - `float` —— 装饰性浮动，由 `--decor-animation` 引用（不需要动效的主题该令牌为 `none`）
   - `meshFlow` —— 背景渐变网格缓慢流动（20s 循环），由 `--mesh-animation` 引用
   - `.u-enter` —— 入场工具类，配合 `--i` 做 60ms 递增错峰
   - `.scroll-reveal` —— scroll-driven animation 渐显，包在
     `@supports (animation-timeline: view())` 内，不支持的浏览器保持内容可见
5. **共享结构类**（跨组件复用；新增前请先确认确有多处使用）：
   - `.section-header` / `.section-title` / `.title-icon` / `.section-description` — 区块头，配 `SectionHeader.vue`
   - `.page-header` — 页面头，配 `PageHeader.vue`
   - `.ui-card` / `.ui-card-media` / `.ui-card-body` / `.ui-card-interactive` — 卡片外壳
   - `.u-cta`（主转化按钮，`--lg` 为大号）/ `.u-btn`（次按钮）/ `.u-chip`（胶囊标签）/ `.u-input`（输入框）
   - `.visually-hidden` — 仅屏幕阅读器可见
   - `.hide-mobile` / `.show-mobile` — 响应式显示切换
6. **焦点管理**：`:focus-visible` 统一样式

## 已删除的类与关键帧（不要再引用）

| 名称 | 原因 |
| --- | --- |
| `.container` | 无人使用；各页面用自己的 `xxx-container` |
| `.text-gradient` | 无人使用，且规范禁止装饰性渐变 |
| `.glass-effect`、`.glass-dark` | 无人使用 |
| `.shadow-lg`、`.shadow-xl` | 无人使用 |
| `.rounded-card`、`.text-truncate*`、`.user-select-none` | 无人使用 |
| `@keyframes fadeInUp` / `fadeInScale` / `floatRandom` | 已由 `enterUp` + 令牌参数统一表达 |
| `@keyframes fadeInDown` / `glow` / `slideIn` / `slideInRight` / `shimmer` / `pulse` | 无人引用 |

## 硬编码色值

原实现里散布着约 79 处硬编码色值。本轮重构已把它们收敛进令牌，
`test/designTokens.test.js` 与 `test/themeContract.test.js` 会挡住回流：

- 组件样式里出现 `#` 开头的色值、或写死的字号/圆角/阴影 → 视为缺陷；
- 需要新色值时，先在 `variables.css` 登记语义化令牌，再补 `presets.js` 五套取值。

## 改动约定

1. **先用令牌，再写值**。需要新令牌就去 `variables.css` 登记 + `presets.js` 五套都补。
2. **组件样式放 `<style scoped>`**；确需跨组件复用的结构才提到 `global.css`，
   并同步登记到本文档。
3. **不要把整块 `<style>` 复制粘贴**（`Navbar.vue` 曾重复一整份，已删除）。
4. **scoped 样式不要跨组件选子组件的内部类名**（因 scoped 隔离永远匹配不到）。
5. 改完记得同步本文档与 `starry-sky-trading-company-web/README.md` 的样式体系章节。
