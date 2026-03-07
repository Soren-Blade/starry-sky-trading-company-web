/**
 * 组件导入测试文件
 * 用于验证所有组件能否正确导入
 */

// Components
import Navbar from '@/components/Navbar.vue'
import HeroSection from '@/components/HeroSection.vue'
import CategoriesSection from '@/components/CategoriesSection.vue'
import HotProductsSection from '@/components/HotProductsSection.vue'
import LoginModal from '@/components/LoginModal.vue'
import Footer from '@/components/Footer.vue'

// Pages
import Home from '@/pages/Home.vue'
import Categories from '@/pages/Categories.vue'
import Hot from '@/pages/Hot.vue'
import New from '@/pages/New.vue'
import About from '@/pages/About.vue'
import NotFound from '@/pages/NotFound.vue'

// Stores
import { useUserStore } from '@/stores/user'

// Utils
import {
  animationUtils,
  styleUtils,
  responsiveUtils,
  domUtils,
  formatUtils,
  debounce,
  throttle,
} from '@/utils/index.js'

// Constants
import {
  COLORS,
  CATEGORIES,
  HOT_PRODUCTS,
  NAV_MENU,
  BREAKPOINTS,
  ANIMATION_DURATIONS,
  TAG_COLORS,
  TAG_BG_COLORS,
} from '@/constants/index.js'

// Router
import router from '@/router/index.js'

console.log('✅ 所有组件导入成功')
console.log('✅ 所有页面导入成功')
console.log('✅ Pinia Store导入成功')
console.log('✅ 工具函数导入成功')
console.log('✅ 常量导入成功')
console.log('✅ 路由配置导入成功')

console.log('\n📊 项目统计:')
console.log(`- 导航菜单项: ${NAV_MENU.length}个`)
console.log(`- 商品分类: ${CATEGORIES.length}个`)
console.log(`- 热门商品: ${HOT_PRODUCTS.length}个`)
console.log(`- 颜色方案: ${Object.keys(COLORS).length}个`)
console.log(`- 响应式断点: ${Object.keys(BREAKPOINTS).length}个`)

export {
  // Components
  Navbar,
  HeroSection,
  CategoriesSection,
  HotProductsSection,
  LoginModal,
  Footer,
  // Pages
  Home,
  Categories,
  Hot,
  New,
  About,
  NotFound,
  // Utils
  animationUtils,
  styleUtils,
  responsiveUtils,
  domUtils,
  formatUtils,
  debounce,
  throttle,
  // Constants
  COLORS,
  CATEGORIES,
  HOT_PRODUCTS,
  NAV_MENU,
  BREAKPOINTS,
  ANIMATION_DURATIONS,
  TAG_COLORS,
  TAG_BG_COLORS,
  // Router
  router,
  // Store
  useUserStore,
}
