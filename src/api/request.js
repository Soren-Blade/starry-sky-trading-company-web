// 引入axios
import axios from 'axios'
const baseURL = import.meta.env.VITE_API_BASE_URL;

import { setAccessToken, setRefreshToken, getAccessToken } from '@/hooks/useToken'

// 刷新token
import { refreshToken, isRefreshToken } from '@/hooks/useRefreshToken'

// console.log(baseURL)

let requests = axios.create({
    baseURL,
    timeout:5000,
    // 设置请求头
    headers:{
        // 'Content-Type':'application/x-www-form-urlencoded',
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With",
        'Authorization': `Bearer ${getAccessToken()}`
    }
})

// 请求拦截器：在发请求之前处理一些失去
requests.interceptors.request.use((config) =>{
    // config：配置对象 对象里面有一个很重要的配置 header
    return config
})

// 响应拦截器
requests.interceptors.response.use(async (res) => {
    const { accesstoken, refreshtoken } = res.headers
    // 判断是否携带accesstoken
    if (accesstoken) {
        // 存token
        setAccessToken(accesstoken)
        // 设置token
        requests.defaults.headers.Authorization = `Bearer ${accesstoken}`
    }
    // 判断是否携带refreshtoken
    if (refreshtoken) {
        // 存token
        setRefreshToken(refreshtoken)
    }
    // 如果协议接口没有权限 并且不是刷新token的请求 则执行刷新token
    if (res.data.code == 401 && !isRefreshToken(res.config)) {
        // 刷新token
        const refreshTokenCode = await refreshToken()
        // 刷新成功
        if (refreshTokenCode.success == true) {
            // 设置新的token
            res.config.headers.Authorization = `Bearer ${getAccessToken()}`
            // 重新请求
            const resp = await requests.request(res.config)
            // 返回结果
            return resp
        } else { // 刷新失败 跳转登录页
            console.log(refreshTokenCode)
            console.log(`request.js：注意，这里应该跳转登录页面`)
        }
    }
    // 响应成功的回调 服务器在返回相应数据的同时可以处理一些事情
    return res.data
}, (error) => {
    // 响应失败的回调
    // 打印请求失败的值
    console.log(error.message)
    return Promise.reject(new Error('faile'))
})

// 向外暴露
export default requests