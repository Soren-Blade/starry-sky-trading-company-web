import { createRouter, createWebHistory } from 'vue-router'
import { markRouteLoaded, markRouteLoading } from '@/hooks/useRouteLoading'

const routes = [
  {
    path: '/home',
    name: 'Home',
    component: () => import('@/pages/Home.vue'),
    meta: { title: '首页 - 星辰商行' }
  },
  {
    path: '/categories',
    name: 'Categories',
    component: () => import('@/pages/Categories.vue'),
    meta: { title: '商品分类 - 星辰商行' }
  },
  {
    path: '/hot',
    name: 'Hot',
    component: () => import('@/pages/Hot.vue'),
    meta: { title: '热门推荐 - 星辰商行' }
  },
  {
    path: '/tool',
    name: 'Tool',
    component: () => import('@/pages/Tool.vue'),
    meta: { title: '工具分类 - 星辰商行' },
  },
  {
    // 搜索结果页：关键词放 query，因此结果可以直接分享/收藏链接。
    // 不用 /search/:q —— 路径段里的中文与特殊字符会带来额外的编码问题，
    // 而 query 由 vue-router 负责编解码。
    path: '/search',
    name: 'SearchResults',
    component: () => import('@/pages/SearchResults.vue'),
    meta: { title: '搜索 - 星辰商行' },
  },
  {
    path: '/about',
    name: 'About',
    component: () => import('@/pages/About.vue'),
    meta: { title: '关于我们 - 星辰商行' }
  },
  // ── 商品线 ────────────────────────────────────────────────────
  {
    path: '/product/:id',
    name: 'ProductDetail',
    component: () => import('@/pages/ProductDetail.vue'),
    meta: { title: '商品详情 - 星辰商行' }
  },
  {
    path: '/category/:id',
    name: 'CategoryDetail',
    component: () => import('@/pages/CategoryDetail.vue'),
    meta: { title: '分类商品 - 星辰商行' }
  },
  {
    path: '/cart',
    name: 'Cart',
    component: () => import('@/pages/Cart.vue'),
    meta: { title: '购物车 - 星辰商行' }
  },
  // ── 账户线 ────────────────────────────────────────────────────
  {
    path: '/user/kami',
    name: 'kami',
    component: () => import('@/pages/Kami.vue'),
    meta: { title: '卡密管理 - 星辰商行', requiresAuth: true }
  },
  {
    path: '/user/profile',
    name: 'Profile',
    component: () => import('@/pages/Profile.vue'),
    meta: { title: '个人中心 - 星辰商行', requiresAuth: true }
  },
  {
    // 我的资产（2.3.0）：数字商品 + 卡密 + 已激活工具收在一处，
    // 卡密管理页只留「激活」入口，不再重复列授权
    path: '/user/assets',
    name: 'Assets',
    component: () => import('@/pages/Assets.vue'),
    meta: { title: '我的资产 - 星辰商行', requiresAuth: true }
  },
  {
    path: '/user/favorites',
    name: 'Favorites',
    component: () => import('@/pages/Favorites.vue'),
    meta: { title: '我的收藏 - 星辰商行', requiresAuth: true }
  },
  {
    path: '/user/orders',
    name: 'Orders',
    component: () => import('@/pages/Orders.vue'),
    meta: { title: '订单管理 - 星辰商行', requiresAuth: true }
  },
  {
    path: '/user/orders/:orderNo',
    name: 'OrderDetail',
    component: () => import('@/pages/OrderDetail.vue'),
    meta: { title: '订单详情 - 星辰商行', requiresAuth: true }
  },
  // ── 会员 / 积分 / 权益线（阶段 P0，2026-10-12）─────────────────
  // 全部 requiresAuth：非会员也要能看到「权益全锁 + 开通引导」，
  // 但**要先登录**才谈得上「你是谁」—— 守卫会打开登录弹窗并回跳。
  //
  // 路由随页面逐个落地：一次性把 13 条都加上会让构建引用到不存在的组件
  // （Vite 在构建期解析动态 import，缺文件直接构建失败）。
  {
    path: '/member',
    name: 'Member',
    component: () => import('@/pages/Member.vue'),
    meta: { title: '会员中心 - 星辰商行', requiresAuth: true }
  },
  {
    path: '/member/plans',
    name: 'MemberPlans',
    component: () => import('@/pages/MemberPlans.vue'),
    meta: { title: '开通会员 - 星辰商行', requiresAuth: true }
  },
  {
    // 权益详解：8 项权益的逐档数值矩阵 + 规则 FAQ。
    // 刻意**不要求登录**——权益规则是公开信息，游客也该能先看清再决定是否开会员。
    path: '/member/benefits',
    name: 'MemberBenefits',
    component: () => import('@/pages/MemberBenefits.vue'),
    meta: { title: '会员权益详解 - 星辰商行' }
  },
  {
    // 成长值页是会员中心的详情子页：它回答「怎么升档、升上去多拿什么」
    path: '/member/growth',
    name: 'MemberGrowth',
    component: () => import('@/pages/MemberGrowth.vue'),
    meta: { title: '成长值 - 星辰商行', requiresAuth: true }
  },
  {
    // 旧地址一律留重定向：外链、收藏、历史通知里的链接都不该 404
    path: '/growth',
    redirect: '/member/growth'
  },
  {
    path: '/points',
    name: 'Points',
    component: () => import('@/pages/Points.vue'),
    meta: { title: '积分中心 - 星辰商行', requiresAuth: true }
  },
  {
    // 积分明细已并入积分中心（`/points?tab=history`），旧地址重定向过去
    path: '/points/history',
    redirect: '/points'
  },
  {
    // 签到是个人中心功能：非会员同样每天签到赚积分，因此挂在 /user 下
    path: '/user/checkin',
    name: 'UserCheckin',
    component: () => import('@/pages/UserCheckin.vue'),
    meta: { title: '签到日历 - 星辰商行', requiresAuth: true }
  },
  {
    path: '/checkin',
    redirect: '/user/checkin'
  },
  {
    path: '/coupons',
    name: 'Coupons',
    component: () => import('@/pages/Coupons.vue'),
    meta: { title: '我的优惠券 - 星辰商行', requiresAuth: true }
  },
  {
    // 邀请中心（1.6.0）：邀请码 / 链接 / 进度 / 记录。
    // requiresAuth：邀请关系挂在账号上，游客没有可邀请的「自己」。
    path: '/invite',
    name: 'Invite',
    component: () => import('@/pages/Invite.vue'),
    meta: { title: '邀请中心 - 星辰商行', requiresAuth: true }
  },
  {
    // 消息中心：站内通知 + 通知偏好 + 邮件台账。
    //
    // requiresAuth（而不是像 /support 那样对游客开放）是刻意区分的：
    // 后端 `enqueue_notification` 对非注册用户直接返回 false，游客**不存在**
    // 任何站内通知，放进来只会看到一个永远空着的页面。游客的诉求是「问客服」，
    // 那条通道在 /support，不在这里。
    path: '/mail',
    name: 'Mail',
    component: () => import('@/pages/Mail.vue'),
    meta: { title: '消息中心 - 星辰商行', requiresAuth: true }
  },
  {
    // 客服中心：提交反馈 + 我的会话（列表 / 详情 / 追问）。
    //
    // **不加 requiresAuth**：游客的登录态同样带 access token 与 users.id，
    // 服务端 `/supportApi` 也没挂 `requireRegisteredAccount`（见 src/index.js:254），
    // 因此归属判断对两种身份是同一份代码。游客的诉求（有问题找不到人问）
    // 恰恰是本站最需要兜住的那一类，拦在登录弹窗后面等于没做。
    // 入口有两处：页脚（FOOTER.bottomLinks）与登录/帮助弹窗（HelpModal）。
    path: '/support',
    name: 'Support',
    component: () => import('@/pages/Support.vue'),
    meta: { title: '客服中心 - 星辰商行' }
  },
  // ── 工具页 ────────────────────────────────────────────────────
  {
    path: '/other/2fa',
    name: '2fa',
    component: () => import('@/pages/2FA.vue'),
    meta: { title: '2FA - 星辰商行' }
  },
  {
    path: '/other/appleId',
    name: 'appleId',
    component: () => import('@/pages/AppleId.vue'),
    meta: { title: 'appleId - 星辰商行' }
  },
  {
    // 视频下载工具：解析服务尚未接入，页面给出完整骨架并如实标注。
    // 数据库里 tool_path 已经是 /video/downloader，接通服务后只换这里的组件。
    // 不加 requiresAuth：守卫在服务端（没有授权就用不了工具本身），
    // 但页面本身是入口与说明，拦一道反而让用户不知道门票在哪买。
    path: '/video/downloader',
    name: 'videoDownloader',
    component: () => import('@/pages/VideoTool.vue'),
    meta: { title: '视频下载工具 - 星辰商行' }
  },
  {
    // 图片压缩工具：数据库里 tool_path = /image/compressor
    // （此前没有路由，工具页点「打开工具」会开出一个 404）。
    path: '/image/compressor',
    name: 'imageCompressor',
    component: () => import('@/pages/ImageCompressor.vue'),
    meta: { title: '图片压缩工具 - 星辰商行' }
  },
  {
    // JSON 格式化工具：数据库里 tool_path = /dev/json-formatter
    // （同样是此前缺失的路由）。
    path: '/dev/json-formatter',
    name: 'jsonFormatter',
    component: () => import('@/pages/JsonFormatter.vue'),
    meta: { title: 'JSON 格式化工具 - 星辰商行' }
  },
  // ── 28个扩展工具页（2026-10-18）──────────────────────────────
  // text 文本工具
  { path: '/text/kit', name: 'TextKit', component: () => import('@/pages/tools/TextKit.vue'), meta: { title: '文本工具箱 - 星辰商行' } },
  { path: '/text/encoding-kit', name: 'EncodingKit', component: () => import('@/pages/tools/EncodingKit.vue'), meta: { title: '字符编码工具箱 - 星辰商行' } },
  { path: '/text/number-base', name: 'NumberBase', component: () => import('@/pages/tools/NumberBase.vue'), meta: { title: '进制与数字转换 - 星辰商行' } },
  { path: '/text/regex-kit', name: 'RegexKit', component: () => import('@/pages/tools/RegexKit.vue'), meta: { title: '正则表达式工具箱 - 星辰商行' } },
  // code 代码工具
  { path: '/code/kit', name: 'CodeKit', component: () => import('@/pages/tools/CodeKit.vue'), meta: { title: '代码工具箱 - 星辰商行' } },
  { path: '/code/highlight', name: 'Highlight', component: () => import('@/pages/tools/Highlight.vue'), meta: { title: '语法高亮工具 - 星辰商行' } },
  // media 媒体处理
  { path: '/media/image', name: 'ImageKit', component: () => import('@/pages/tools/ImageKit.vue'), meta: { title: '图片工具箱 - 星辰商行' } },
  { path: '/media/av', name: 'MediaAV', component: () => import('@/pages/tools/MediaAV.vue'), meta: { title: '音视频工具箱 - 星辰商行' } },
  { path: '/media/pdf', name: 'PdfKit', component: () => import('@/pages/tools/PdfKit.vue'), meta: { title: 'PDF 工具箱 - 星辰商行' } },
  // office 办公文档
  { path: '/office/convert', name: 'OfficeConvert', component: () => import('@/pages/tools/OfficeConvert.vue'), meta: { title: '文档转换工具 - 星辰商行' } },
  { path: '/office/sheet', name: 'SheetKit', component: () => import('@/pages/tools/SheetKit.vue'), meta: { title: '电子表格工具箱 - 星辰商行' } },
  { path: '/office/slides', name: 'SlidesKit', component: () => import('@/pages/tools/SlidesKit.vue'), meta: { title: '演示文稿工具 - 星辰商行' } },
  // design 设计工具
  { path: '/design/color', name: 'ColorKit', component: () => import('@/pages/tools/ColorKit.vue'), meta: { title: '颜色工具箱 - 星辰商行' } },
  { path: '/design/shape', name: 'ShapeKit', component: () => import('@/pages/tools/ShapeKit.vue'), meta: { title: '阴影与圆角生成器 - 星辰商行' } },
  { path: '/design/layout', name: 'LayoutKit', component: () => import('@/pages/tools/LayoutKit.vue'), meta: { title: '布局沙盒 - 星辰商行' } },
  // convert 转换工具
  { path: '/convert/unit', name: 'UnitConvert', component: () => import('@/pages/tools/UnitConvert.vue'), meta: { title: '单位换算工具 - 星辰商行' } },
  { path: '/convert/time', name: 'TimeKit', component: () => import('@/pages/tools/TimeKit.vue'), meta: { title: '时间日期工具箱 - 星辰商行' } },
  { path: '/convert/calc', name: 'CalcKit', component: () => import('@/pages/tools/CalcKit.vue'), meta: { title: '计算工具箱 - 星辰商行' } },
  // dev 开发工具
  { path: '/dev/crypto', name: 'CryptoKit', component: () => import('@/pages/tools/CryptoKit.vue'), meta: { title: '加解密工具箱 - 星辰商行' } },
  { path: '/dev/hash', name: 'HashKit', component: () => import('@/pages/tools/HashKit.vue'), meta: { title: '哈希校验工具 - 星辰商行' } },
  { path: '/dev/jwt', name: 'JwtKit', component: () => import('@/pages/tools/JwtKit.vue'), meta: { title: 'JWT 解析工具 - 星辰商行' } },
  { path: '/dev/cron', name: 'CronKit', component: () => import('@/pages/tools/CronKit.vue'), meta: { title: 'Cron 表达式工具 - 星辰商行' } },
  // data 数据工具
  { path: '/data/format', name: 'DataFormat', component: () => import('@/pages/tools/DataFormat.vue'), meta: { title: '数据格式互转 - 星辰商行' } },
  { path: '/data/sql', name: 'SqlKit', component: () => import('@/pages/tools/SqlKit.vue'), meta: { title: 'SQL 工具箱 - 星辰商行' } },
  { path: '/data/mock', name: 'MockKit', component: () => import('@/pages/tools/MockKit.vue'), meta: { title: '假数据生成器 - 星辰商行' } },
  // utility 实用工具
  { path: '/utility/generate', name: 'GenerateKit', component: () => import('@/pages/tools/GenerateKit.vue'), meta: { title: '生成器工具箱 - 星辰商行' } },
  // net 网络工具
  { path: '/net/kit', name: 'NetKit', component: () => import('@/pages/tools/NetKit.vue'), meta: { title: '网络工具箱 - 星辰商行' } },
  { path: '/net/qrcode', name: 'QrcodeKit', component: () => import('@/pages/tools/QrcodeKit.vue'), meta: { title: '二维码工具箱 - 星辰商行' } },
  { path: '/net/share', name: 'ShareKit', component: () => import('@/pages/tools/ShareKit.vue'), meta: { title: '短链与分享工具 - 星辰商行' } },
  // life 生活工具
  { path: '/life/daily', name: 'DailyKit', component: () => import('@/pages/tools/DailyKit.vue'), meta: { title: '日常生活工具箱 - 星辰商行' } },
  // fun 趣味工具
  { path: '/fun/box', name: 'FunBox', component: () => import('@/pages/tools/FunBox.vue'), meta: { title: '趣味工具箱 - 星辰商行' } },
  // ── 法务页（三页共用一个组件，由 meta.legalKey 选内容）───────
  {
    path: '/terms',
    name: 'Terms',
    component: () => import('@/pages/Legal.vue'),
    meta: { title: '用户协议 - 星辰商行', legalKey: 'terms' }
  },
  {
    path: '/privacy',
    name: 'Privacy',
    component: () => import('@/pages/Legal.vue'),
    meta: { title: '隐私政策 - 星辰商行', legalKey: 'privacy' }
  },
  {
    path: '/rules',
    name: 'Rules',
    component: () => import('@/pages/Legal.vue'),
    meta: { title: '平台规则 - 星辰商行', legalKey: 'rules' }
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'NotFound',
    component: () => import('@/pages/NotFound.vue'),
    meta: { title: '页面未找到 - 星辰商行' }
  },
  // 重定向 在项目跑起来的时候 访问“/”的时候 定位在主页
  {
    path: '/',
    redirect: '/home'
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior(to, from, savedPosition) {
    if (savedPosition) {
      return savedPosition
    } else if (to.hash) {
      // 锚点跳转（如页脚的「联系我们」→ /about#about-contact）。
      // 不处理 hash 的话会永远滚到顶部，锚点等于失效。
      return { el: to.hash, behavior: 'smooth', top: 80 }
    } else {
      return { top: 0 }
    }
  }
})

// 路由守卫 - 更新页面标题，并收起「导航中」进度条
router.afterEach((to) => {
  document.title = to.meta.title || '星辰商行'
  markRouteLoaded()
})

// 导航出错（分包下载失败、守卫抛错）也要收起进度条，否则它会一直挂在那里
router.onError(() => {
  markRouteLoaded()
})

// 路由守卫 - 任何页面都先确保身份就绪，再判断是否需要账号登录。
//
// 身份必须**先于路由组件挂载**完成：商品/工具/卡密等接口都要鉴权，而组件在
// onMounted 里立刻发请求。若此时还没有游客 token，请求会 401 → 刷新失败 →
// 触发「登录态失效」回调 → 被 `router.replace({ name: 'Home' })` 带回首页，
// 表现就是深链访问任何页面都静默变成首页（实测冷启动访问 /tool 会渲染成首页）。
//
// 初始化本身是幂等的（user.js 的 init() 用共享 Promise 合并并发调用），
// 而 App.vue 在 onMounted 里已经先发起了一次，所以这里通常只是等那个 Promise。
// 这里懒加载 store，避免 router 与 store 的循环依赖。
router.beforeEach(async (to) => {
  // 放在最前面：分包下载与守卫耗时都算「导航中」，
  // 用户点的这一下从此刻起就有反馈
  markRouteLoading()

  const { useUserStore } = await import('@/stores/user')
  const userStore = useUserStore()

  if (!userStore.initialized) {
    await userStore.init()
  }

  if (!to.meta.requiresAuth) return true

  if (userStore.isLoggedIn) return true

  // 不只弹提示：直接**把登录弹窗打开**，并把原目标记在 query 里。
  // 只提示不打开弹窗的话，用户还得自己找到右上角的登录入口。
  userStore.openLoginModal('请先登录账号后再访问该页面')

  // 重定向会再触发一次 beforeEach，那次同样会 markRouteLoading ——
  // 因此这里用的是开关而不是计数器，不会只增不减地漂移
  return { name: 'Home', query: { redirect: to.fullPath } }
})

export default router
