/**
 * 中文词条
 *
 * 站点正文的中文原文仍在 `constants/content.js`（常量代理查不到词条时回退原文），
 * 这里只放**组件里新增**的 UI 文案：语言切换、底部导航、通用控件。
 * 这样改中文文案仍然只有一个出处。
 */
export default {
  language: {
    label: '语言',
    switchTo: '切换到{language}',
    current: '当前语言：{language}',
    zh: '简体中文',
    en: 'English',
  },
  navbar: {
    accountMenu: '账号菜单',
    avatarFallback: '用户头像',
    nicknameUnset: '未设置昵称',
    signedIn: '已登录',
    assetsGroup: '账号资产',
    profile: '个人中心',
    orders: '我的订单',
    favorites: '我的收藏',
    assets: '我的资产',
    kami: '卡密管理',
    checkin: '签到日历',
    toggleMenu: '切换导航菜单',
    identityLabel: '打开用户菜单（{name}，{role}）',
    cartCount: '购物车，{count} 件商品',
    cartEmpty: '购物车',
    member: '会员中心',
    memberLevel: '会员中心，当前等级 {level}',
    mail: '消息中心',
    mailUnread: '消息中心，{count} 条未读',
  },
  bottomNav: {
    label: '底部导航',
    home: '首页',
    categories: '分类',
    tools: '工具',
    cart: '购物车',
    me: '我的',
  },
  common: {
    close: '关闭',
    loading: '加载中',
    retry: '重试',
    back: '返回',
    viewAll: '查看全部',
  },
  a11y: {
    skipToContent: '跳到主要内容',
    mainNavigation: '主导航',
    footerNavigation: '页脚导航',
    languageMenu: '语言选择',
    openMenu: '打开菜单',
    closeMenu: '关闭菜单',
    cartCount: '购物车，{count} 件商品',
    cartCountEmpty: '购物车，空',
    newBadge: '有新内容',
    backToTop: '回到顶部',
    systemMessages: '系统提示',
  },
  themeSwitch: {
    label: '明暗模式',
    light: '浅色',
    dark: '深色',
    auto: '跟随系统',
  },
}
