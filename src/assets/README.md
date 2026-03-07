# Assets 目录结构说明

## 文件组织

```
src/assets/
├── styles/                 # 样式文件 (CSS)
│   ├── variables.css      # CSS变量定义 (色彩、阴影、动画等)
│   └── global.css         # 全局样式 (重置、工具类、动画库)
├── images/                # 图片资源
│   ├── logos/            # Logo和品牌图
│   ├── icons/            # 图标
│   └── backgrounds/      # 背景图
├── fonts/                 # 字体文件
│   └── (待扩展)          # TTF、WOFF、WOFF2等字体格式
└── (其他静态资源)
```

## 导入方式

### 全局样式导入 (main.js)
```javascript
import './assets/styles/global.css'
```

### 组件内样式 (Vue Single File Component)
```vue
<style scoped>
  /* 使用CSS变量 */
  color: var(--color-primary);
  background: var(--gradient-primary);
</style>
```

### 图片引入方式

#### 方式1: 直接路径
```vue
<img src="@/assets/images/logo.png" alt="Logo" />
```

#### 方式2: 导入后引用
```vue
<script setup>
import logoImg from '@/assets/images/logo.png'
</script>

<template>
  <img :src="logoImg" alt="Logo" />
</template>
```

## CSS变量说明

### 颜色变量
- `--color-primary`: 主色调 (#8A6DFF)
- `--color-primary-dark`: 深主色 (#6C5CE7)
- `--color-secondary`: 辅助色 (#FD79A8)
- `--color-accent`: 强调色 (#FFEAA7)
- `--color-light`: 浅色 (#F8F9FA)
- `--color-dark`: 深色 (#2D3436)

### 渐变变量
- `--gradient-primary`: 主渐变
- `--gradient-light`: 浅色渐变
- `--gradient-warm`: 温暖渐变

### 阴影变量
- `--shadow-sm`: 细微阴影
- `--shadow-md`: 中等阴影
- `--shadow-lg`: 较强阴影
- `--shadow-xl`: 强烈阴影
- `--shadow-glass`: 玻璃拟态阴影

### 圆角变量
- `--radius-sm`: 8px
- `--radius-md`: 12px
- `--radius-lg`: 16px
- `--radius-xl`: 24px

### 过渡时间变量
- `--transition-fast`: 0.2s
- `--transition-base`: 0.3s
- `--transition-slow`: 0.4s

## 全局样式包含内容

### global.css 导入
- `variables.css` - CSS变量定义

### global.css 定义
1. **基础重置**
   - 元素默认样式重置
   - HTML/Body基础设置
   - 字体配置

2. **全局滚动条样式**
   - 自定义WebKit滚动条

3. **元素重置**
   - 按钮重置
   - 链接重置
   - 输入框重置
   - 列表重置
   - 图片优化

4. **响应式容器**
   - 不同屏幕尺寸的.container类

5. **动画库** (9种关键帧)
   - fadeInUp
   - fadeInDown
   - fadeInScale
   - float
   - floatRandom
   - glow
   - slideIn
   - slideInRight
   - shimmer
   - pulse

6. **工具类**
   - .text-gradient - 文本渐变
   - .glass-effect - 毛玻璃效果
   - .glass-dark - 深色玻璃
   - .shadow-lg/.shadow-xl - 阴影
   - .rounded-card - 圆角卡片
   - .text-truncate - 文本截断
   - .text-truncate-2 - 2行截断
   - .user-select-none - 禁用选择
   - .hide-mobile/.show-mobile - 响应式隐藏

7. **焦点管理**
   - :focus-visible 样式

## 文件导入检查清单

### ✅ 已检查的文件

#### main.js
- ✅ 导入全局样式: `import './assets/styles/global.css'`
- ✅ 导入Ant Design重置: `import 'ant-design-vue/dist/reset.css'`
- ✅ 导入Pinia: `createPinia()`
- ✅ 导入Router: `createRouter()` from `./router/index.js`
- ✅ 导入App组件: `App from './App.vue'`

#### App.vue
- ✅ 无CSS导入 (全局样式通过main.js注入)
- ✅ 导入utility: `throttle from '@/utils/index.js'`
- ✅ 导入components: `Navbar`, `Footer`
- ✅ 导入router: `router-view`

#### 其他所有Vue组件
- ✅ 样式定义在 `<style scoped>` 中
- ✅ 使用CSS变量
- ✅ 不重复导入全局样式

## 最佳实践

1. **不在组件中重复导入全局样式**
   - 全局样式已在main.js中导入

2. **使用CSS变量而不是硬编码颜色**
   ```css
   /* ❌ 不推荐 */
   color: #8A6DFF;
   
   /* ✅ 推荐 */
   color: var(--color-primary);
   ```

3. **图片资源放在assets/images中**
   - 便于管理和版本控制
   - 使用@别名引入

4. **字体文件放在assets/fonts中**
   - 如需要@font-face声明，在variables.css或专门的fonts.css中定义

5. **始终使用相对路径或@别名**
   ```javascript
   // ✅ 推荐
   import '@/assets/styles/global.css'
   
   // ❌ 避免
   import '../../../assets/styles/global.css'
   ```

---

**最后更新**: 2024年11月29日
**维护者**: 星辰商行技术团队
