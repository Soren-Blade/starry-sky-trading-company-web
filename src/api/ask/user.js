import request from '../request'
const baseURL = '/user'
// 游客登陆
function visitorLogin() {
    return request.post(`${baseURL}/visitorLogin`)
}

export default {
    visitorLogin
}