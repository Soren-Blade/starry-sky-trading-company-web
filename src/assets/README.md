# assets 目录说明

> 本文档此前与代码严重脱节（描述过 `images/`、`fonts/` 目录、`.container` 类、
> 10 个关键帧等）。现已按当前代码重写。
> **设计令牌与组件模式的单一来源是 `.dsh/skills/project-ui-system/SKILL.md`**，
> 本文只说明 `src/assets/` 这个目录本身。

## 目录构成

```
src/assets/
└── styles/
    ├── variables.css   # 设计令牌（:root）
    └── global.css      # 重置、共享结构类、动画库
```

**不存在** `images/`、`fonts/` 目录，也没有任何 `@font-face` 声明。

- 图片资源统一使用外链 URL（如 `product.main_image_url`），不放在本目录
- 字体走系统字体栈，`global.css` 的 `body` 规则里显式声明了中文字体
  （`PingFang SC` / `Hiragino Sans GB` / `Microsoft YaHei` / `Noto Sans SC`）

## 引入方式

`main.js` 依次引入三份样式：

```js
import './assets/styles/variables.css'   // 设计令牌
import './assets/styles/global.css'      // 全局样式
import 'ant-design-vue/dist/reset.css'   // antd 重置
```

**不要**在 `global.css` 里再 `@import './variables.css'` —— 那会让 `:root` 被输出两次。

组件样式一律写在各自的 `<style scoped>` 中，并用 `var(--token)` 引用令牌，
不要重复引入全局样式。

## variables.css

`:root` 下集中定义设计令牌，分类如下（完整清单见文件本身）：

| 类别 | 示例 |
| --- | --- |
| 品牌色 | `--color-primary`、`--color-primary-dark`、`--color-secondary`、`--color-accent`、`--color-light`、`--color-dark` |
| 语义色 | `--color-muted`、`--color-text-secondary`、`--color-border`、`--color-divider`、`--color-success` / `--color-warning` / `--color-danger`（含 `*-bg`） |
| 表面与背景 | `--color-surface`、`--color-page-bg` |
| 渐变 | `--gradient-primary`、`--gradient-light`、`--gradient-warm`、`--gradient-hot`、`--gradient-about`、`--gradient-apple` |
| 阴影 | `--shadow-sm/md/lg/xl`、`--shadow-card`、`--shadow-card-hover`、`--shadow-primary`、`--shadow-glass` |
| 毛玻璃 | `--glass-effect`、`--glass-backdrop` |
| 圆角 | `--radius-sm/md/lg/xl`、`--radius-pill` |
| 过渡 | `--transition-fast/base/slow` |
| 布局 | `--container-max`、`--container-content`、`--container-narrow`、`--container-padding`、`--navbar-height` |

文件末尾还有 `@media (prefers-reduced-motion: reduce)` 的全局降级规则。

**断点没有令牌**：CSS 自定义属性无法用于 `@media`，实际断点必须写字面量，
统一使用 `1199px` / `991px` / `767px` / `575px`。

## global.css

1. **基础重置**：盒模型、`html/body` 尺寸、字体栈、页面背景色
2. **滚动条样式**：WebKit 定制（Firefox 走默认）
3. **元素重置**：按钮、链接、输入框、列表、图片
4. **动画库**（4 个关键帧，均有实际引用）：`fadeInUp`、`fadeInScale`、`float`、`floatRandom`
5. **共享结构类**（跨组件复用；新增前请先确认确有多处使用）：
   - `.section-header` / `.section-title` / `.title-icon` / `.section-description` — 区块头，配 `SectionHeader.vue`
   - `.page-header` — 页面头，配 `PageHeader.vue`；渐变经 `--page-header-gradient` 覆写
   - `.ui-card` / `.ui-card-media` / `.ui-card-interactive` — 卡片外壳
   - `.visually-hidden` — 仅屏幕阅读器可见
   - `.hide-mobile` / `.show-mobile` — 响应式显示切换
6. **焦点管理**：`:focus-visible` 统一样式

## 已删除的类与关键帧（不要再引用）

| 名称 | 原因 |
| --- | --- |
| `.container` | 无人使用；各页面/组件用自己的 `xxx-container`（`.section-container`、`.page-container` 等） |
| `.text-gradient` | 无人使用；`Navbar.vue` 有自己的 scoped 实现 |
| `.glass-effect`、`.glass-dark` | 无人使用（`--glass-effect` 变量仍保留） |
| `.shadow-lg`、`.shadow-xl` | 无人使用（同名变量仍保留） |
| `.rounded-card`、`.text-truncate`、`.text-truncate-2`、`.user-select-none` | 无人使用 |
| `@keyframes fadeInDown`、`glow`、`slideIn`、`slideInRight`、`shimmer` | 无人引用 |
| `@keyframes pulse` | 组件各自的 scoped `pulse`（`AppleIdSection.vue`、`ToolCard.vue`）与全局无关 |

`global.css` 因此从 430 行减到约 336 行。

## 改动约定

1. **先用令牌，再写值**。需要新令牌就去 `variables.css` 加，不要在组件里写死色值。
2. **组件样式放 `<style scoped>`**；确需跨组件复用的结构才提到 `global.css`。
3. **不要把整块 `<style>` 复制粘贴**（`Navbar.vue` 曾重复一整份，已删除）。
4. **scoped 样式不要跨组件选子组件的内部类名**（因 scoped 隔离永远匹配不到）。
5. 改完记得同步本文档与 `starry-sky-trading-company-web/README.md` 的样式体系章节。
