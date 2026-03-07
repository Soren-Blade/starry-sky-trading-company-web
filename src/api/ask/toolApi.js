import request from '../request'
const baseURL = '/toolApi'

// 获取工具列表
function getTools(data) {
    return request.get(`${baseURL}/getTools`,data)
}

// 获取苹果ID列表
function getAppleIds() {
    return request.get(`${baseURL}/getAppleIds`)
}

export default {
    getTools,
    getAppleIds
}