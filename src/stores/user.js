import { defineStore } from 'pinia';
import { reactive } from 'vue'
import { message } from 'ant-design-vue'
import { setAccessToken, setRefreshToken, getAccessToken, getRefreshToken } from '@/hooks/useToken'
import api from '@/api/index'

export const useUserStore = defineStore('user', {
  state: () => ({
    isLoggedIn: false,
    userInfo: reactive({})
  }),
  actions: {
    // 游客登录
    async visitorLogin() {
      try {
        // 本地有没有accessToken和refreshToken
        const accessToken = getAccessToken()
        const refreshToken = getRefreshToken()
        // 如果有tokne 直接获取用户信息
        if (accessToken && refreshToken) return await this.getUserInfo()
        // 没有则游客登陆
        const result = await api.visitorLogin()
        // 登录成功
        if (result.success) return await this.getUserInfo()


      } catch (error) {
        // 登录失败 报错
        message.warning(error)
      }

    },
    // 获取用户信息
    async getUserInfo() {
      try {
        const result = await api.getUserInfo()
        if (result.success) {
          Object.assign(this.userInfo, result.data)
          message.success(result.message)
          this.isLoggedIn = true
          return
        }
      } catch (error) {
        message.warning(error)
      }
    },
    logout() {
      this.isLoggedIn = false
      this.userInfo = {}
      setAccessToken('')
      setRefreshToken('')
      message.success('退出登录成功')
    },
    // 初始化
    inint() {

    }
  }
});