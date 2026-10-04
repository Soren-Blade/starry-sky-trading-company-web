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
  logo: '⭐',
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
    { icon: '🎁', text: '品质保证' },
    { icon: '⚡', text: '快速配送' },
    { icon: '💳', text: '安全支付' },
  ],
}

/** 区块头文案（供 SectionHeader 使用） */
export const SECTIONS = {
  categories: {
    icon: '🛍️',
    title: '商品分类',
    description: '探索丰富多彩的商品世界，发现适合你的完美选择',
  },
  hot: {
    icon: '🔥',
    title: '热门商品',
    description: '精选热销商品，享受优质生活',
  },
  tools: {
    icon: '🧰',
    title: '工具分享',
    description: '按分类浏览实用工具，收藏常用的那几个',
  },
  kami: {
    icon: '🎴',
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
  searchPlaceholder: '搜索商品或分类',
  searchEmpty: (keyword) => `没有找到与「${keyword}」相关的商品`,
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
}

/** 页脚 */
export const FOOTER = {
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
    { key: 'phone', label: '客服电话', icon: '📞', href: CONTACT.telHref },
    { key: 'email', label: '客服邮箱', icon: '✉️', href: CONTACT.mailtoHref },
  ],
  hoursLabel: '服务时间',
  paymentLabel: '结算方式',
  paymentIcons: ['💳', '🏦', '📱'],
  copyright: '© 2024 星辰商行. All rights reserved.',
  /** 法务链接指向真实页面（Legal.vue），不再是 `#` */
  legalLinks: [
    { label: '用户协议', to: '/terms' },
    { label: '隐私政策', to: '/privacy' },
  ],
  bottomLinks: [
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
    updatedAt: '2026-10-05',
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
        heading: '五、免责',
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
    updatedAt: '2026-10-05',
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
