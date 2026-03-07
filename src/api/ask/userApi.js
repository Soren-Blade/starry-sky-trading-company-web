import request from '../request'
const baseURL = '/userApi'

// 获取用户信息
function getUserInfo() {
    return request.get(`${baseURL}/getUserInfo`)
}

export default {
    getUserInfo
}