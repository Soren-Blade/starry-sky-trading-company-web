import request from '@/api/request'
import { getRefreshToken } from '@/hooks/useToken'
let promise
// 刷新token
export function refreshToken() {
  // 如果是promis直接返回
  if (promise) return promise
  promise = new Promise(async (resolve) => {
    // 携带长token去刷新短token
    const result = await request({
      method: 'post',
      url: `user/refreshToken`,
      headers: {
        Authorization: `${getRefreshToken()}`
      },
      __isRefreshToken: true // 代表刷新token
    })
    resolve(result)
  })
  // 执行结束设置为null
  promise.finally(() => {
    promise = null
  })
  // 返回promise
  return promise
}

// 判断是否刷新token
export function isRefreshToken(config) {
  return !!config.__isRefreshToken
}
