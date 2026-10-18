/**
 * 常量与站点文案
 *
 * 两个原则：
 *   1. **不在这里写死任何设计数值** —— 颜色、字号、圆角全部来自设计令牌
 *      （`assets/styles/variables.css` + `theme/presets.js`）。
 *      历史上这里有一份 `COLORS` / `TAG_COLORS` 硬编码色表，既无人使用，
 *      又与令牌形成两份事实来源，已删除。
 *   2. **全站文案集中在此** —— 改文案只碰这一个文件，不用在组件里四处搜。
 *      若文案变动牵动了数据结构（例如价格要带货币前缀），必须同时改数据层：
 *      价格格式化见 `utils/index.js` 的 `formatUtils.formatPrice`，
 *      货币来源见 `theme/presets.js` 每套主题的 `price` 字段。
 */

/** 品牌信息 */
export const SITE = {
  name: '星辰商行',
  nameEn: 'Starry Sky Trading Co.',
  /** AppIcon 的图标名（此前是 emoji ⭐，颜色不随主题变化） */
  logo: 'star',
  tagline: '精选商品 · 品质生活',
}

/** 导航菜单 */
export const NAV_MENU = [
  { id: 1, label: '首页', path: '/home' },
  { id: 2, label: '商品分类', path: '/categories' },
  { id: 3, label: '热门推荐', path: '/hot' },
  { id: 4, label: '工具分享', path: '/tool' },
  { id: 5, label: '关于我们', path: '/about' },
]

/**
 * 联系方式（单一来源）
 *
 * 抽出来的原因：这些值此前只写在 `About.vue` 的模板里，
 * 而现在「忘记密码」「下单说明」「页脚」都要展示同一份联系方式 ——
 * 抄四遍就会出现四个不一致的客服邮箱。
 */
export const CONTACT = {
  address: '中国 北京市 朝阳区',
  phone: '400-800-8888',
  email: 'service@starrysky.com',
  hours: '9:00 - 22:00',
  /** tel: / mailto: 链接要去掉展示用的连字符与空格 */
  telHref: 'tel:4008008888',
  mailtoHref: 'mailto:service@starrysky.com',
}

/** 首页首屏 */
export const HERO = {
  eyebrow: '2026 精选商城',
  title: '探索星辰之美',
  subtitle: '在星辰商行，发现生活的美好时刻。每一件商品都承载着独特的故事与品质。',
  primaryCta: '立即购物',
  secondaryCta: '了解更多',
  features: [
    { icon: 'gift', text: '品质保证' },
    { icon: 'zap', text: '快速配送' },
    { icon: 'credit-card', text: '安全支付' },
  ],
}

/**
 * 区块头文案（供 SectionHeader 使用）
 *
 * 这里的 `icon` 是 **AppIcon 的图标名**，不是 emoji ——
 * emoji 不受 CSS `color` 影响，因此没法跟随主题变色，与
 * 「线性单色图标 + 颜色随主题」的目标冲突。
 */
export const SECTIONS = {
  categories: {
    icon: 'shopping-bag',
    title: '商品分类',
    description: '探索丰富多彩的商品世界，发现适合你的完美选择',
  },
  hot: {
    icon: 'flame',
    title: '热门商品',
    description: '精选热销商品，享受优质生活',
  },
  hotTools: {
    icon: 'wrench',
    title: '热门工具',
    description: '按收藏数排行的实用工具',
  },
  tools: {
    icon: 'wrench',
    title: '工具分享',
    description: '按分类浏览实用工具，收藏常用的那几个',
  },
  kami: {
    icon: 'ticket',
    title: '卡密管理',
    description: '查看并激活你的卡密',
  },
}

/**
 * 各页面的开场文案
 *
 * 主页以外的页面**不再使用统一的页头组件**（`PageHeader` 已删除）——
 * 每个页面按自己的信息结构设计开场：索引页用「编号 + 大字标题 + 计数」，
 * 榜单页用「横向标题带」，工作台用「左侧竖排标题」，编辑页用「首行眉标」。
 * 这里只提供文案，版式由各页面自己的 scoped 样式决定。
 *
 * 字段约定：
 *   eyebrow     眉标（短、大写友好，等宽字体呈现）
 *   title       标题
 *   description 一句说明
 *   meta        右侧/次要的计数或提示（可选）
 */
export const PAGES = {
  categories: {
    eyebrow: 'INDEX',
    title: '商品分类',
    description: '浏览所有分类，找到你需要的那一类',
  },
  hot: {
    eyebrow: 'RANKING',
    title: '热卖榜',
    description: '按销量与浏览量排序的精选商品',
  },
  tools: {
    eyebrow: 'WORKSPACE',
    title: '工具工作台',
    description: '按分类筛选、搜索并收藏常用工具',
  },
  appleId: {
    eyebrow: 'DIRECTORY',
    title: '共享苹果 ID',
    description: '按线路整理的账号目录，复制即可使用',
  },
  about: {
    eyebrow: 'ABOUT',
    title: '关于我们',
    description: '星辰商行的由来、做事方式与联系方式',
  },
  kami: {
    eyebrow: 'CONSOLE',
    title: '卡密控制台',
    description: '激活新卡密或查看已有卡密',
  },
  notFound: {
    eyebrow: 'ERROR',
    title: '页面未找到',
    description: '抱歉，您访问的页面不存在或已被删除',
    backHome: '返回首页',
    suggestionsTitle: '您可能想查看',
  },
  product: {
    eyebrow: 'PRODUCT',
    title: '商品详情',
    description: '查看商品信息并下单',
  },
  category: {
    eyebrow: 'CATEGORY',
    title: '分类商品',
    description: '该分类下的全部商品',
  },
  cart: {
    eyebrow: 'CART',
    title: '购物车',
    description: '确认数量与金额后提交订单',
  },
  profile: {
    eyebrow: 'ACCOUNT',
    title: '个人中心',
    description: '查看账号信息并修改个人资料',
  },
  favorites: {
    eyebrow: 'SAVED',
    title: '我的收藏',
    description: '收藏的商品与工具',
  },
  orders: {
    eyebrow: 'ORDERS',
    title: '订单管理',
    description: '查看订单状态、取消或确认完成',
  },
  orderDetail: {
    eyebrow: 'ORDER',
    title: '订单详情',
    description: '订单商品明细与状态',
  },
}

/** 商品网格 */
export const PRODUCT_GRID = {
  loading: '正在加载商品…',
  empty: '暂无商品可展示',
  errorPrefix: '商品加载失败：',
  /** 搜索图标按钮的无障碍名（图标型按钮必须有 aria-label） */
  searchLabel: '搜索',
  searchPlaceholder: '搜索商品或工具',
  // 曾有一条 searchEmpty（「没有找到与『x』相关的商品」）：那时首页栅格会按
  // 导航栏的关键词做客户端过滤。搜索改为 `/search` 页的服务端查询后，
  // 首页不再有「按关键词过滤」这种状态，该文案没有使用者，已删除。
  // 搜索无结果的文案在 SEARCH_PAGE.productEmpty / toolEmpty。
  soldOut: '缺货',
  viewsLabel: '浏览',
  salesLabel: '销量',
  stockLabel: '库存',
  defaultSeller: '星辰商行',
  addToCart: '加入购物车',
  buyNow: '立即购买',
  addedToCart: '已加入购物车',
  addedToFavorites: '已收藏',
  removedFromFavorites: '已取消收藏',
  favoriteNeedLogin: '登录后即可收藏商品',
  cartNeedLogin: '请先登录账号后再加入购物车',
  orderNeedLogin: '请先登录账号后再下单',
  detailBack: '返回上一页',
  detailMissing: '商品不存在或已下架',
  detailLoading: '正在加载商品详情…',
  /** 本平台没有接入支付通道，下单页与订单页统一展示这句 */
  paymentNotice:
    '本平台支付通道尚未接入，下单后请联系客服完成结算；确认收到商品后可标记订单完成。',
}

/**
 * 交易页文案（购物车 / 订单 / 下单）
 *
 * 与 PRODUCT_GRID 分开：那里是商品卡片的文案，这里是交易流程的文案，
 * 混在一起会让「改下单提示」时在一堆商品文案里找。
 */
export const TRADE = {
  cartEmpty: '购物车是空的',
  cartEmptyHint: '去商品分类看看，把想要的加进来',
  cartUnavailable: '不可下单',
  cartRemove: '移除',
  cartClear: '清空购物车',
  cartClearConfirm: '确定清空购物车？',
  cartTotal: '合计',
  cartSelected: '已选',
  cartCheckout: '提交订单',
  cartLoginFirst: '请先登录账号后再使用购物车',
  cartUnavailableNote: '标为「不可下单」的商品不会计入金额，也不会被提交',
  checkoutRemark: '订单备注',
  checkoutRemarkPlaceholder: '选填，例如希望的发货时间',
  checkoutContact: '联系方式',
  checkoutContactPlaceholder: '选填，手机号或微信号，便于客服联系你',
  checkoutSuccess: '下单成功',
  checkoutViewOrder: '查看订单',
  ordersEmpty: '还没有订单',
  ordersEmptyHint: '下单后可以在这里查看状态',
  orderCancel: '取消订单',
  orderCancelConfirm: '取消后库存会退回，确定取消这笔订单吗？',
  orderComplete: '确认完成',
  orderCompleteConfirm: '确认已收到商品？完成后订单不可取消。',
  orderDetail: '订单详情',
  orderBackToList: '返回订单列表',
  orderItems: '商品明细',
  orderAmount: '订单金额',
  orderCreatedAt: '下单时间',
  orderNo: '订单号',
  orderCopyNo: '复制订单号',
  orderCopied: '订单号已复制',
  orderFilterAll: '全部',
  orderNotFound: '订单不存在或无权查看',
  ordersLoginFirst: '请先登录账号后再查看订单',
  favoritesEmpty: '还没有收藏',
  favoritesEmptyHint: '在商品详情页或工具页点收藏，就会出现在这里',
  favoritesProductTab: '收藏的商品',
  favoritesToolTab: '收藏的工具',
  favoritesRemoved: '已取消收藏',
  favoritesMissing: '该内容已被删除',
  favoritesLoginFirst: '请先登录账号后再查看收藏',
  profileSaved: '资料已保存',
  profileBasic: '账号信息',
  profileEdit: '修改资料',
  profileNickname: '昵称',
  profileNicknamePlaceholder: '1 - 32 个字符',
  profileAvatar: '头像',
  /**
   * 上传按钮的可访问名 / 悬停提示。
   *
   * 按钮已收成纯图标（见 Profile.vue），可见文字没有了 —— 因此这个名字是
   * 读屏用户与鼠标用户唯一能知道它做什么的地方。用「上传头像」而不是
   * 「选择图片」：点击后确实先弹文件选择器，但用户预期的动作是「上传」，
   * 而且选完即自动上传、不需要再点第二次。
   */
  profileAvatarUpload: '上传头像',
  profileAvatarUploading: '正在上传头像…',
  profileAvatarProcessing: '正在处理图片…',
  profileAvatarHint: '支持 JPG / PNG / WebP，最大 5 MB。会先在本地压缩到 256px 再上传。',
  profileAvatarUploaded: '头像已更新',
  profileAvatarUrl: '使用外部图片地址（可选）',
  profileAvatarUrlHint: '也可以直接填一个 https:// 开头的图片链接；留空则使用默认头像。',
  profileAvatarPlaceholder: 'https:// 开头的图片链接',
  profileGender: '性别',
  profileGenderUnset: '未设置',
  profileGenderMale: '男',
  profileGenderFemale: '女',
  profileGenderUnknown: '保密',
  profileBirthday: '生日',
  profileSave: '保存修改',
  profileReset: '重置',
  profileReadonlyNote: '用户名、邮箱、手机号是登录凭据，修改需要重新验证身份，暂不支持自助修改。',
  profileGuestNote: '当前是游客身份，登录后即可保存个人资料。',
  /** 各字段的展示标签（账号信息只读区用） */
  profileFields: {
    uuid: '用户标识',
    username: '用户名',
    email: '邮箱',
    phone: '手机号',
    userType: '账号类型',
    status: '账号状态',
    createdAt: '注册时间',
    lastLoginAt: '最后登录',
  },
}

/** 商品分类页 / 分类详情页 */
export const CATEGORY_PAGE = {
  notFound: '分类不存在或已停用',
  empty: '该分类下暂无商品',
  /**
   * 本分类为空、展示的是子分类商品时的说明。
   * 必须说清商品来自子分类，否则用户会以为商品挂错了分类。
   */
  emptyFallback: '该分类下暂无直接上架的商品，以下为它各个子分类的商品。',
  subCategories: '子分类',
  backToIndex: '返回分类索引',
  countLabel: (n) => `${n} 件商品`,
}

/**
 * 首屏启动遮罩与路由进度
 *
 * 遮罩只覆盖「身份 + 首次路由就位」这段真正渲染不出来的时间。
 * 商品 / 工具这些**有骨架屏**的数据不算在内 —— 让遮罩等它们
 * 会把「边看边加载」变成「更久的白屏」，那是退步。
 */
export const BOOT = {
  /** 遮罩上的说明文字 */
  text: '正在准备你的工作台…',
  /** 顶部路由进度条的无障碍名 */
  routeLoading: '页面加载中',
  /** 顶栏身份占位骨架的无障碍名（身份解析期间） */
  identityPending: '正在确认登录状态',
}

/**
 * 登录弹窗与身份文案
 *
 * `guest*` 一组是**游客态**的文案。游客是这个应用的默认身份（后端按 IP 自动建档，
 * 好让需要鉴权的只读接口能跑），因此顶栏必须如实地把「你是谁」告诉用户，
 * 而不是把他当成未登录 —— 否则用户既看不到自己的头像，也找不到退出的入口。
 */
export const AUTH = {
  rememberMe: '记住我',
  rememberHint: '勾选后关掉浏览器再打开仍是登录态，有效期 7 天；不勾选则只在本次浏览器会话内有效。',
  forgotPassword: '忘记密码',
  forgotTitle: '找回密码',
  forgotIntro:
    '当前版本尚未接入邮件与短信服务，无法自助重置密码。请通过下面的方式联系客服，核验账号后由人工重置。',
  forgotSteps: [
    '用注册时填写的邮箱或手机号联系客服，说明需要重置密码',
    '提供账号标识（用户名或手机号）以便客服定位账号',
    '客服核验通过后会发放临时密码，登录后请尽快自行修改',
  ],
  contactTitle: '联系客服',
  contactIntro: '以下方式都可以找到我们：',
  agreePrefix: '我同意',
  and: '和',

  loginCta: '登录 / 注册',
  guestBadge: '游客',
  /** 游客身份的说明。必须与真实能力一致：游客只能浏览公开内容 */
  guestNote: '当前是游客身份，仅能浏览公开内容。登录 / 注册后可下单、管理卡密与收藏。',
  guestSince: '游客身份创建于',
  registeredSince: '注册于',
  guestLogout: '退出游客身份',
  logout: '退出登录',
  /** 退出后落回无身份状态时的提示 */
  loggedOutGuest: '已退出游客身份',
  loggedOut: '已退出登录',
  /** 需要身份才能看的页面（工具 / 共享 Apple ID）在无身份时的引导 */
  needIdentityTitle: '登录后即可查看',
  needIdentityHint: '这部分内容需要身份才能读取。可以直接登录 / 注册，或刷新页面获取一个游客身份。',
}

/** 工具页 */
export const TOOL_PAGE = {
  searchPlaceholder: '搜索工具…',
  loading: '正在加载工具…',
  errorPrefix: '工具加载失败：',
  empty: '该分类下暂无工具',
  favorites: '已收藏',
  openTool: '打开工具',
  addedFavorite: '已收藏',
  removedFavorite: '已取消收藏',
  missingPath: '该工具暂未配置跳转地址',
  invalidPath: '工具地址无效',
  popupBlocked: '浏览器拦截了新窗口，请允许本站弹出窗口',
  // ── 使用方式两个分类（与「分类」是两根轴：这里说的是要不要卡密）──
  accessCard: '卡密激活',
  accessFree: '免费工具',
  // 卡片上的标注与按钮
  needCardTag: '需卡密激活',
  activatedTag: '已激活',
  needCardHint: '此工具需激活卡密后才能使用',
  activatedHint: '可直接使用',
  activateNow: '立即激活',
  // ── 工具页骨架的辅助信息标题（五个工具页共用同一对标题）──
  usageTitle: '使用说明',
  noticeTitle: '注意事项',
}

/**
 * 视频下载工具的占位页文案
 *
 * 解析服务暂停中（候选服务是会员制接口，且文档给的地址实测 404）。
 * 工具条目已经存在、也已标为「需要卡密激活」，因此**已激活的用户会点进来** ——
 * 文案要如实说明「开发中」，并给出可走的下一步（回工具页 / 看我的卡密），
 * 而不是把用户丢在一个没有出路的说明页上。
 */
export const VIDEO_TOOL = {
  title: '视频下载工具',
  description: '粘贴短视频分享链接即可解析下载。',
  status: '功能开发中',
  body:
    '这个工具还在开发中，目前尚未开放使用。我们正在接入视频解析服务，' +
    '完成后会在这里直接开放，不需要重新操作。如果你已经激活过本工具的卡密，' +
    '授权时长会照常计算，服务上线后即可使用。',
  backToTools: '返回工具页',
  myCards: '查看我的卡密',
}

/**
 * 工具页骨架的共享文案
 *
 * 五个工具页的结果区都由 `ToolResultPane` 渲染，四个状态（空/加载/成功/失败）
 * 的兜底文案放在这里 —— 页面只覆盖需要改的那一条，不必各写一份。
 */
export const TOOL_RESULT = {
  loading: '正在处理…',
  emptyTitle: '还没有结果',
  emptyDesc: '在上面填好内容后开始。',
  errorTitle: '处理失败',
  retry: '重试',
  copy: '复制结果',
  copied: '已复制',
  copyFailed: '复制失败，请手动选择文本',
  // 结果区的「指标名」在几个工具页之间是同一套（链接 / 清晰度 / 体积…），
  // 放在这里是为了让「原始体积」这四个字在图片页与视频页不会写成两种说法。
  meta: {
    link: '链接',
    quality: '清晰度',
    format: '输出格式',
    originalSize: '原始体积',
    outputSize: '输出体积',
    saved: '预计减少',
    chars: '字符数',
    lines: '行数',
  },
}

/**
 * 工具页清单（键 = 数据库 `tools.tool_path`）
 *
 * 工具页的标准结构是「页头 → 输入区 → 操作区 → 结果区四态 → 辅助信息」，
 * 这一份常量提供页头与骨架阶段的文案，页面自己只负责接线。
 *
 * **占位说明**：除 `/dev/json-formatter`（`JSON.parse` + `JSON.stringify` 真实可用）外，
 * 其余四个工具的业务逻辑尚未接入 —— 页面上的按钮会走完整的加载/成功/失败流转，
 * 但结果是占位数据。真实服务接通后只需替换页面里的 `run()` 实现，
 * **数据库里的 `tool_path` 不需要改**。
 */
export const TOOL_PAGES = {
  '/video/downloader': {
    eyebrow: '视频工具',
    title: VIDEO_TOOL.title,
    description: VIDEO_TOOL.description,
    icon: 'video',
    // 该工具在数据库里 requires_card = true
    requiresCard: true,
    inputTitle: '粘贴分享链接',
    resultTitle: '解析结果',
    linkLabel: '视频分享链接',
    linkPlaceholder: '粘贴抖音 / 快手 / B站 的分享链接…',
    linkHint: '需要是以 http:// 或 https:// 开头的完整链接。',
    qualityLabel: '清晰度',
    qualityOptions: [
      { label: '1080P', value: '1080p' },
      { label: '720P', value: '720p' },
      { label: '480P', value: '480p' },
    ],
    formatLabel: '输出格式',
    formatOptions: [
      { label: 'MP4 视频', value: 'mp4' },
      { label: 'MP3 音频', value: 'mp3' },
    ],
    submit: '解析链接',
    reset: '清空',
    download: '下载视频',
    sample: '填入示例',
    sampleLink: 'https://www.example.com/video/123456',
    emptyTitle: '粘贴链接后开始解析',
    emptyDesc: '把视频分享链接填在上面，选好清晰度与格式即可。',
    invalidLink: '请填入以 http:// 或 https:// 开头的完整链接。',
    resultNote: '骨架阶段的结果为占位数据，解析服务接通后会替换为真实解析结果。',
    asideNotice: VIDEO_TOOL.body,
    asideItems: [
      '链接必须是可以直接打开的分享链接，短链也可以。',
      '解析完成后会出现下载入口；本工具需要卡密激活。',
      '如果已有卡密但还没激活，先在「卡密管理」里绑定账号。',
    ],
  },
  '/image/compressor': {
    eyebrow: '图片处理',
    title: '图片压缩工具',
    description: '在浏览器本地压缩图片，减小体积后再下载。',
    icon: 'image',
    requiresCard: false,
    inputTitle: '选择图片',
    resultTitle: '压缩结果',
    needFile: '请先选择要压缩的图片。',
    dropTitle: '点击选择图片，或把图片拖到这里',
    dropHint: '支持 JPG / PNG / WebP，单张不超过 5MB。',
    qualityLabel: '压缩档位',
    qualityOptions: [
      { label: '高质量（约 80%）', value: 'high' },
      { label: '均衡（约 60%）', value: 'medium' },
      { label: '高压缩（约 40%）', value: 'low' },
    ],
    formatLabel: '输出格式',
    formatOptions: [
      { label: '保持原格式', value: 'keep' },
      { label: 'JPG', value: 'jpeg' },
      { label: 'PNG', value: 'png' },
    ],
    submit: '开始压缩',
    reset: '移除图片',
    download: '下载压缩结果',
    sample: '换一张',
    emptyTitle: '选择一张图片开始',
    emptyDesc: '图片只在你的浏览器里处理，不会上传到服务器。',
    invalidType: '只支持 JPG / PNG / WebP 格式的图片。',
    invalidSize: '图片不能超过 5MB，请先裁剪或换一张。',
    resultNote: '压缩体积按档位系数估算；真实编码接入后替换为实际字节数。',
    asideNotice: '本页面不会上传图片：读取、压缩预览都在浏览器本地完成。',
    asideItems: [
      '压缩档位越高，体积下降越少、画质损失越小。',
      '转成 PNG 会重新编码，体积可能不降反升。',
      '当前为骨架阶段：压缩结果按档位系数估算，下载按钮尚未开放。',
    ],
  },
  '/dev/json-formatter': {
    eyebrow: '开发工具',
    title: 'JSON 格式化工具',
    description: '在线格式化与校验 JSON 数据，全部在浏览器本地完成。',
    icon: 'monitor',
    requiresCard: false,
    inputTitle: '粘贴 JSON',
    resultTitle: '格式化结果',
    sourceLabel: 'JSON 内容',
    sourcePlaceholder: '在这里粘贴 JSON…',
    sourceHint: '支持对象与数组；解析失败会给出具体报错位置。',
    indentLabel: '缩进',
    indentOptions: [
      { label: '2 空格', value: '2' },
      { label: '4 空格', value: '4' },
      { label: 'Tab', value: 'tab' },
    ],
    minifyLabel: '压缩为单行',
    minifyHint: '开启后忽略缩进设置，输出去掉所有换行。',
    submit: '格式化',
    reset: '清空',
    sample: '填入示例',
    sampleJson: '{"name":"星辰商行","tools":[{"id":1,"name":"JSON 格式化"}],"active":true}',
    emptyTitle: '粘贴 JSON 后格式化',
    emptyDesc: '格式化与校验都在本地执行，内容不会上传。',
    invalidEmpty: '请先填入要格式化的 JSON 内容。',
    resultNote: '格式化在浏览器本地完成：JSON.parse + JSON.stringify，不上传内容。',
    asideNotice: '本页是本期唯一真实可用的工具，其余工具页为骨架。',
    asideItems: [
      '解析失败时会给出 SyntaxError 的原始描述，便于定位。',
      '勾选「压缩为单行」会去掉所有缩进与换行。',
      '格式化结果可以一键复制。',
    ],
  },
  '/other/2fa': {
    eyebrow: '其他工具',
    title: '2FA 密钥验证',
    description: '校验 TOTP 动态口令，或按密钥生成当前验证码。',
    icon: 'shield-alert',
    requiresCard: false,
    submit: '开始验证',
    reset: '重新开始',
    emptyTitle: '填入密钥或验证码',
    emptyDesc: '可以校验一个 6 位动态口令，也可以按密钥算出当前口令。',
    resultNote: '动态口令按 30 秒一个窗口滚动，剩余时间在结果区显示。',
    asideNotice: '验证过程在浏览器本地完成，密钥不会上传。',
    asideItems: [
      '需要 WebCrypto 支持（https 或 localhost）。',
      '口令每 30 秒更新一次，注意剩余时间。',
      '本页沿用既有 TOTP 实现，只统一了页头与结果区版式。',
    ],
  },
  '/other/appleId': {
    eyebrow: '其他工具',
    title: '共享 Apple ID',
    description: '领取共享 Apple ID 账号，登录 App Store 使用。',
    icon: 'users',
    requiresCard: false,
    submit: '刷新列表',
    reset: '清空筛选',
    emptyTitle: '暂时没有可领取的账号',
    emptyDesc: '账号会不定时补充，稍后再来看看。',
    resultNote: '账号由服务端下发，使用后请及时退出登录。',
    asideNotice: '共享账号仅用于下载已购应用，请勿修改密码或绑定支付方式。',
    asideItems: [
      '列表按来源分组，可切换来源查看。',
      '账号状态可能随时变化，以列表上的标注为准。',
      '登录 App Store 时如遇双重验证，请换一个账号。',
    ],
  },
}

// 合并扩展工具页常量
import { TOOL_PAGES_EXTRA } from './tool-pages.js'
Object.assign(TOOL_PAGES, TOOL_PAGES_EXTRA)

/**
 * 搜索结果页
 *
 * 一个关键词**同时**搜商品与工具，两个分区各有自己的加载/错误/空态。
 * `limit` 放在这里而不是页面里，是为了让「每类最多几条」只有一个出处。
 */
export const SEARCH_PAGE = {
  eyebrow: 'SEARCH',
  title: '搜索',
  titleWith: (keyword) => `「${keyword}」的搜索结果`,
  description: '同时搜索商品与工具。',
  productSection: '商品',
  toolSection: '工具',
  countLabel: (n) => `${n} 条`,
  limit: 12,
  // 空关键词不请求，直接引导
  emptyKeywordTitle: '想找什么？',
  emptyKeywordHint: '在上方搜索框输入关键词，商品和工具会一起搜。',
  goHot: '看热门推荐',
  goTools: '逛工具页',
  // 两个分区各自的三态文案
  productErrorPrefix: '商品加载失败：',
  toolErrorPrefix: '工具加载失败：',
  productEmpty: (keyword) => `没有找到与「${keyword}」相关的商品`,
  toolEmpty: (keyword) => `没有找到与「${keyword}」相关的工具`,
  toolNeedIdentity: '登录后即可搜索工具。',
  toolLoading: '正在加载工具…',
}

/**
 * 客服中心（`/support`）
 *
 * 页面文案集中在这里，理由与其它页面相同：改一句提示不必碰组件。
 * 三条口径（与 `constants/support.js` 顶部注释一致，写文案时不要越界）：
 *
 * 1. **不承诺时效**：后台没有 SLA，也没有「工单」概念，只说「会尽快回复」；
 * 2. **不承诺邮件**：注册用户的邮件取决于通知偏好，游客只有反馈回执 ——
 *    说「我们会邮件通知你」在偏好关掉时就是假话；
 * 3. **客服入口不是密码找回通道**：平台没有邮件/短信服务，重置密码仍需人工核验。
 */
export const SUPPORT = {
  eyebrow: '支持',
  title: '客服中心',
  desc: '提交问题、查看客服回复。游客也可以提问 —— 填一个能收到信的邮箱就行。',
  guestNote:
    '你当前是游客身份：没有账号邮箱，回执与客服回复只会发到你填写的那一个邮箱，请务必记下回执号。',

  categoryLabel: '问题分类',
  subjectLabel: '问题标题',
  subjectPlaceholder: '一句话说明问题，例如「订单 2026… 一直没收到」',
  bodyLabel: '详细描述',
  bodyPlaceholder: '把订单号、卡密、时间点和已经试过的操作写清楚，能省一轮往返',
  emailLabel: '联系邮箱',
  emailPlaceholder: 'name@example.com',
  emailHintRegistered: '已按账号邮箱预填，可以改成别的',
  emailHintMissing: '账号还没有填邮箱，请手动填一个',
  emailHintGuest: '必填 —— 这是游客唯一的收信地址',
  submit: '提交反馈',
  submitting: '正在提交…',
  formNote:
    '同一身份 24 小时内最多提交 5 次。提交后可以继续在会话里追问，不必重复开新会话。',

  receiptTitle: '已受理，请记下回执号',
  receiptHint: '凭回执号可以在客服中心找回这条会话；登录态丢失时也只能靠它人工查询。',
  receiptMailHint: '回执已经发往你填写的邮箱；注册用户还会在消息中心收到一条通知。',
  copyReceipt: '复制回执号',
  copiedReceipt: '已复制',
  viewThread: '查看这条会话',
  submitAnother: '再提一条',
  copyFailed: '复制失败，请手动选中回执号',

  listTitle: '我的会话',
  refresh: '刷新',
  listEmptyTitle: '还没有提交过反馈',
  listEmptyDesc: '在「提交反馈」里填一条，客服回复会出现在这里。',
  listCount: (total) => `共 ${total} 条会话`,
  messageCount: (count) => `${count} 条消息`,
  backToList: '返回会话列表',
  detailTitle: '消息记录',
  noMessages: '这条会话里还没有消息',
  factsReceiptNo: '回执号',
  factsCategory: '分类',
  factsEmail: '联系邮箱',
  factsCreatedAt: '提交于',
  factsLastMessage: '最后消息',

  replyLabel: '继续追问',
  replyPlaceholder: '补充信息或追问；发送后状态会回到「待客服回复」',
  reply: '发送',
  replying: '正在发送…',
  replySent: '已发送',
  replyNote: '追问不会重复发一封回执，但运营侧的会话列表会把它标成待回复。',
  replyEmpty: '请先写点内容再发送',

  threadNotFoundHint: '回执号抄错一位就会找不到，请对照邮件或截图再试一次。',
}

/** 页脚 */export const FOOTER = {
  about:
    '星辰商行致力于为用户带来精选商品和优质服务。每一件商品都经过严格筛选，确保品质与美学的完美结合。',
  /**
   * 联系方式行
   *
   * 这里原本是四个社交图标（微信/QQ/微博/抖音），但每个都指向 `href="#"` ——
   * 点了什么都不发生。平台并没有这些官方账号，编四个假链接比留死链更糟，
   * 因此换成**真实可用**的电话与邮箱入口（`tel:` / `mailto:` 在手机上可直接唤起）。
   * 联系方式的取值来自 CONTACT，与「忘记密码」弹窗共用一份。
   */
  contacts: [
    { key: 'phone', label: '客服电话', icon: 'phone', href: CONTACT.telHref },
    { key: 'email', label: '客服邮箱', icon: 'mail', href: CONTACT.mailtoHref },
  ],
  hoursLabel: '服务时间',
  paymentLabel: '结算方式',
  /** AppIcon 的图标名（此前是 emoji，颜色不随主题变化） */
  paymentIcons: ['credit-card', 'landmark', 'smartphone'],
  copyright: '© 2024 星辰商行. All rights reserved.',
  /** 法务链接指向真实页面（Legal.vue），不再是 `#` */
  legalLinks: [
    { label: '用户协议', to: '/terms' },
    { label: '隐私政策', to: '/privacy' },
  ],
  bottomLinks: [
    { label: '客服中心', to: '/support' },
    { label: '平台规则', to: '/rules' },
    { label: '关于我们', to: '/about' },
    { label: '联系我们', to: '/about#about-contact' },
  ],
}

/**
 * 法务页面
 *
 * 三页共用一个 `Legal.vue`，由路由的 `meta.legalKey` 选出对应条目。
 * 内容刻意对齐**代码实际做的事**（写了哪些字段、用了哪些 localStorage key、
 * 有没有支付通道），而不是抄一份模板条款 —— 与实现对不上的隐私政策比没有更糟。
 */
export const LEGAL = {
  terms: {
    title: '用户协议',
    updatedAt: '2026-10-12',
    sections: [
      {
        heading: '一、服务内容',
        paragraphs: [
          '星辰商行提供数字商品与工具导航服务：前者包含商品浏览、购物车、下单与订单管理；后者包含工具目录、2FA 验证码生成与共享 Apple ID 列表。',
          '平台**尚未接入支付通道**。下单会产生一笔「待处理」订单，买卖双方线下结算后由买家在订单页确认完成。',
        ],
      },
      {
        heading: '二、账号',
        paragraphs: [
          '首次访问会自动创建一个游客身份（不要求你提供任何信息）。游客可以浏览商品与工具、生成 2FA 验证码。',
          '购物车、下单、订单管理与商品收藏需要注册账号。注册需要用户名、邮箱与密码；密码经 bcrypt 哈希后存储，平台不保存明文。',
        ],
      },
      {
        heading: '三、订单与取消',
        paragraphs: [
          '提交订单时，服务端按商品的当前价格重新计算金额，客户端提交的金额不会被采用。',
          '「待处理」的订单可以取消，取消后占用的库存会退回。已确认完成的订单不能取消。',
        ],
      },
      {
        heading: '四、禁止行为',
        paragraphs: [
          '不得利用本服务从事任何违反所在地法律法规的活动，包括但不限于批量注册、恶意刷量、尝试越权访问他人数据。',
          '共享 Apple ID 类内容来自第三方数据源，仅供学习与测试使用，请勿用于商业用途。',
        ],
      },
      {
        heading: '五、会员与积分',
        paragraphs: [
          '会员是**有效期内的增值服务**：按等级提供消费折扣、积分倍率与相应权益，具体以「会员中心」展示的当前等级为准。等级由累计成长值决定，成长值达到门槛即升级。',
          '平台尚未接入支付通道，开通会员与购买商品走同一条流程：提交「会员开通单」后联系客服线下结算，客服确认后会员生效。**会员开通后不支持自助退款**，如需退款请联系客服。',
          '再次购买同档或更高档位的套餐时，时长**叠加**到原到期时间上，不覆盖剩余天数。',
          '积分与优惠券是平台内的虚拟权益，**不可提现、不可转让**。100 积分可折抵 ¥1；积分与优惠券都有有效期，过期即失效，请留意「会员中心」的到期提醒。',
        ],
      },
      {
        heading: '六、免责',
        paragraphs: [
          '第三方数据源（Apple ID 列表）由外部提供，平台不保证其可用性与时效性。',
          '因不可抗力、上游服务故障或你的设备/网络问题造成的损失，平台不承担责任。',
        ],
      },
    ],
  },

  privacy: {
    title: '隐私政策',
    updatedAt: '2026-10-05',
    sections: [
      {
        heading: '一、我们收集什么',
        paragraphs: [
          '**账号信息**：注册时填写的用户名、邮箱，以及系统随机生成的昵称、头像、性别与生日。密码只以 bcrypt 哈希形式保存。',
          '**身份标识**：每位用户（含游客）都有一个随机 UUID，服务端用它识别请求方；登录令牌里只带这个 UUID，不带邮箱或手机号。',
          '**网络信息**：请求 IP 与 User-Agent。游客身份按 IP 复用（同一出口会共用同一个游客账号），登录时会更新最后登录时间。',
          '**你主动提供的内容**：修改个人资料时填写的昵称、头像链接、性别、生日；下单时可选填写的联系方式与备注。',
          '**行为数据**：登录失败次数与来源（用于防暴力破解，15 分钟后过期），商品浏览量、销量与库存。',
        ],
      },
      {
        heading: '二、存在你设备上的数据',
        paragraphs: [
          '平台不使用第三方追踪脚本或广告 Cookie。以下几项数据保存在浏览器的本地存储（localStorage / sessionStorage）中，清除浏览器数据即会消失：',
        ],
        list: [
          '`ACCESS_TOKEN`：访问令牌（有效期 3 分钟）',
          '`REFRESH_TOKEN`：刷新令牌（7 天）。**默认只存在 sessionStorage**，关掉浏览器即失效；登录时勾选「记住我」才会同时写入 localStorage，使登录态跨浏览器重启保留',
          '`SSTC_REMEMBER_ME`：上次是否勾选了「记住我」（只影响复选框默认值）',
          '`SSTC_LAST_IDENTIFIER`：上次成功登录用的账号（用户名 / 邮箱 / 手机号）与密码**无关**，仅在勾选「记住我」时保存，用于下次打开登录框时带出账号',
          '`SSTC_THEME_PREF`：你选择的界面风格与单项微调',
          '`SSTC_TOOL_FAVORITES`：**游客**身份下的工具收藏（登录后收藏会上传到服务端）',
        ],
      },
      {
        heading: '三、我们如何使用',
        paragraphs: [
          '数据仅用于提供上述服务本身：识别你的身份、显示你的购物车与订单、防止账号被盗用、排查故障。',
          '我们不向第三方出售或共享你的个人信息。第三方 Apple ID 数据源是**读取**方向的数据（平台去拉取列表），不涉及把你的数据发出去。',
        ],
      },
      {
        heading: '四、日志',
        paragraphs: [
          '服务端日志经过脱敏：字段名命中禁止清单（密码、令牌、卡密号、邮箱、手机号等）的值不会写入日志，未声明的字段只记录摘要。',
        ],
      },
      {
        heading: '五、你的权利',
        paragraphs: [
          '你可以在「个人中心」查看并修改昵称、头像、性别与生日。',
          '如需删除账号或导出数据，请通过页脚的联系方式与我们联系。',
        ],
      },
    ],
  },

  rules: {
    title: '平台规则',
    updatedAt: '2026-10-12',
    sections: [
      {
        heading: '一、交易规则',
        paragraphs: [
          '商品价格、库存与上下架状态以服务端数据为准。下单时若库存不足或商品已下架，订单会被拒绝并说明原因。',
          '购物车中的商品若在结算前下架或库存不足，会在购物车中被标记为「不可下单」，且不计入合计金额。',
        ],
      },
      {
        heading: '二、卡密规则',
        paragraphs: [
          '卡密一经激活即与本账号绑定，不可转移。请在激活前确认卡密对应的工具。',
          '卡密有有效期，过期后无法激活。若卡密显示已被使用但你并未使用过，请联系客服核查使用记录。',
        ],
      },
      {
        heading: '三、工具与共享账号',
        paragraphs: [
          '工具目录中的外部链接指向第三方站点，其内容与可用性由第三方负责。',
          '共享 Apple ID 请勿修改密码或绑定自己的手机号 —— 那会让其他人无法使用。',
        ],
      },
      {
        heading: '四、诚信与违规处理',
        paragraphs: [
          '平台对批量注册、恶意刷量、尝试越权访问他人数据等行为保留封禁账号的权利。账号状态被置为禁用后，已签发的令牌会立即失效。',
          '若你认为处理有误，可通过页脚联系方式申诉。',
        ],
      },
      {
        heading: '五、会员与积分规则',
        paragraphs: [
          '会员折扣与积分倍率按你**下单当时**的等级计算，金额与积分一律由服务端按当前价重算，客户端提交的金额不会被采用。',
          '**积分**：下单、每日签到、任务奖励与开通会员赠送都会产生积分流水；100 积分折抵 ¥1。正数积分带有效期，过期按**先后顺序**核销（先得到的先用完），过期部分不再可用。',
          '**优惠券**：来自会员券包、领券中心、积分兑换或人工发放；有使用门槛与有效期，过期作废，一笔订单只能使用一张。',
          '积分与优惠券不可提现、不可转让。通过刷单、批量注册、恶意刷量等方式获取的积分与优惠券，平台有权扣回并视情节处理账号。',
        ],
      },
    ],
  },
}

/** 样式主题弹窗 */
export const THEME_PANEL = {
  trigger: '样式主题',
  title: '样式主题',
  subtitle: '五套设计风格统一切换，也可以只微调个别样式。选择会保存在本机。',
  presetTab: '整体风格',
  customTab: '单项修改',
  currentBadge: '使用中',
  customizedBadge: '已微调',
  resetField: '还原此项',
  resetCustom: '还原全部微调',
  resetAll: '恢复默认',
  customizedNote: (count) => `已微调 ${count} 项`,
  previewHint: '色板预览',
  close: '关闭',
}
