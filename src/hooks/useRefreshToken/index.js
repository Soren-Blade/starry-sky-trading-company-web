// token 刷新与 401 重试
//
// 这里保留一个薄封装层，把「单飞状态」与 request 实例放在一起。
// 相关实现位于 src/api/request.js 的 refreshToken / isRefreshToken。
//
// 历史上这两个函数曾在独立模块里 import request 实例，形成
// 「request → useRefreshToken → request」的循环依赖；因此改为内联实现。
// 本文件保留再导出，避免调用方路径变动。
export { refreshToken, isRefreshToken } from '@/api/request'
